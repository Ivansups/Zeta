import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth.models import (
    AuditLog,
    Group,
    GroupHelper,
    InviteToken,
    RefreshToken,
    RoleEnum,
    User,
)
from backend.auth.schemas import GroupAdminSummaryResponse, UserResponse
from backend.auth.security import create_access_token, generate_random_token, hash_token


class AuthService:
    def __init__(
        self,
        session: AsyncSession,
        jwt_secret_key: str = "",
        jwt_algorithm: str = "HS256",
        access_token_expire_minutes: int = 15,
        refresh_token_expire_days: int = 30,
    ) -> None:
        self.session = session
        self.jwt_secret_key = jwt_secret_key
        self.jwt_algorithm = jwt_algorithm
        self.access_token_expire_minutes = access_token_expire_minutes
        self.refresh_token_expire_days = refresh_token_expire_days

    async def get_or_create_user(
        self,
        telegram_id: int,
        display_name: str | None = None,
        username: str | None = None,
        photo_url: str | None = None,
        invite_token: str | None = None,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> tuple[User, str, str]:
        """Authenticate or register a user by telegram_id with optional invite."""
        stmt = select(User).where(User.telegram_id == telegram_id)
        result = await self.session.execute(stmt)
        user = result.scalar_one_or_none()

        if user is None:
            user = User(
                telegram_id=telegram_id,
                role=RoleEnum.STUDENT.value,
                display_name=display_name,
                username=username,
                photo_url=photo_url,
                token_version=1,
            )
            self.session.add(user)
            await self.session.flush()
        else:
            if display_name:
                user.display_name = display_name
            if username:
                user.username = username
            if photo_url:
                user.photo_url = photo_url

        # Apply invite token if provided
        if invite_token:
            await self._apply_invite(user, invite_token)

        # Issue refresh token
        raw_refresh_token = generate_random_token(32)
        family_id = uuid.uuid4()
        now = datetime.now(UTC)
        expires_at = now + timedelta(days=self.refresh_token_expire_days)

        refresh_record = RefreshToken(
            user_id=user.id,
            token_hash=hash_token(raw_refresh_token),
            family_id=family_id,
            is_revoked=False,
            expires_at=expires_at,
            user_agent=user_agent,
            ip_address=ip_address,
        )
        self.session.add(refresh_record)

        audit = AuditLog(
            user_id=user.id,
            event="LOGIN",
            details=f"Login via Telegram (telegram_id={telegram_id})",
            ip_address=ip_address,
        )
        self.session.add(audit)
        await self.session.commit()

        access_token = create_access_token(
            subject=str(user.id),
            role=user.role,
            token_version=user.token_version,
            secret_key=self.jwt_secret_key,
            expires_minutes=self.access_token_expire_minutes,
            algorithm=self.jwt_algorithm,
        )

        return user, access_token, raw_refresh_token

    async def _apply_invite(self, user: User, raw_invite_token: str) -> None:
        """Validate and apply an invite token to a user."""
        token_hash = hash_token(raw_invite_token)
        stmt = (
            select(InviteToken)
            .where(InviteToken.token_hash == token_hash)
            .with_for_update()
        )
        result = await self.session.execute(stmt)
        invite = result.scalar_one_or_none()

        if not invite:
            # Fallback to check by UUID id for existing active invites
            try:
                invite_uuid = uuid.UUID(raw_invite_token)
                stmt_uuid = (
                    select(InviteToken)
                    .where(InviteToken.id == invite_uuid)
                    .with_for_update()
                )
                res_uuid = await self.session.execute(stmt_uuid)
                invite = res_uuid.scalar_one_or_none()
            except ValueError:
                pass

        if not invite or invite.is_revoked:
            raise ValueError("Invite link is invalid or has been revoked")

        target_group_id = invite.group_id
        if target_group_id is None and invite.group_name:
            group_stmt = select(Group).where(Group.name == invite.group_name)
            group_res = await self.session.execute(group_stmt)
            group = group_res.scalar_one_or_none()
            if not group:
                group = Group(name=invite.group_name)
                self.session.add(group)
                await self.session.flush()
            target_group_id = group.id

        user.group_id = target_group_id
        user.role = invite.role
        if invite.subgroup_number is not None:
            user.subgroup_number = invite.subgroup_number

        # Invalidate any existing JWT sessions if user's role changed
        user.token_version += 1

        invite.activations_count += 1
        if invite.is_single_use:
            invite.is_revoked = True

    async def apply_invite_to_user(self, user: User, raw_invite_token: str) -> User:
        """Apply an invite to an already authenticated user and commit."""
        await self._apply_invite(user, raw_invite_token)
        audit = AuditLog(
            user_id=user.id,
            event="INVITE_APPLIED",
            details=(
                f"Invite applied to user (group_id={user.group_id}, role={user.role})"
            ),
        )
        self.session.add(audit)
        await self.session.commit()
        return user

    async def rotate_refresh_token(
        self,
        raw_refresh_token: str,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> tuple[User, str, str]:
        """Perform Refresh Token Rotation (RTR) with Reuse Detection."""
        token_hash = hash_token(raw_refresh_token)
        stmt = (
            select(RefreshToken)
            .where(RefreshToken.token_hash == token_hash)
            .with_for_update()
        )
        result = await self.session.execute(stmt)
        token_record = result.scalar_one_or_none()

        if token_record is None:
            raise PermissionError("Refresh token not found")

        # REUSE DETECTION: already revoked token presented
        if token_record.is_revoked:
            family_id = token_record.family_id
            user_id = token_record.user_id

            family_stmt = select(RefreshToken).where(
                RefreshToken.family_id == family_id
            )
            family_res = await self.session.execute(family_stmt)
            for rec in family_res.scalars().all():
                rec.is_revoked = True

            user_stmt = select(User).where(User.id == user_id).with_for_update()
            user_res = await self.session.execute(user_stmt)
            user = user_res.scalar_one()
            user.token_version += 1

            audit = AuditLog(
                user_id=user.id,
                event="SECURITY_ALERT_REFRESH_REUSE",
                details=(
                    f"Compromised family {family_id} revoked due to reuse detection"
                ),
                ip_address=ip_address,
            )
            self.session.add(audit)
            # Guarantee revocation and security alert persist in DB even on error
            await self.session.commit()

            raise PermissionError(
                "Compromised token reuse detected: all sessions revoked"
            )

        now = datetime.now(UTC)
        if token_record.expires_at <= now:
            token_record.is_revoked = True
            await self.session.commit()
            raise PermissionError("Refresh token expired")

        token_record.is_revoked = True

        user_stmt = select(User).where(User.id == token_record.user_id)
        user_res = await self.session.execute(user_stmt)
        user = user_res.scalar_one()

        new_raw_refresh = generate_random_token(32)
        new_expires_at = now + timedelta(days=self.refresh_token_expire_days)

        new_record = RefreshToken(
            user_id=user.id,
            token_hash=hash_token(new_raw_refresh),
            family_id=token_record.family_id,
            is_revoked=False,
            expires_at=new_expires_at,
            user_agent=user_agent,
            ip_address=ip_address,
        )
        self.session.add(new_record)

        audit = AuditLog(
            user_id=user.id,
            event="REFRESH",
            details="Token rotated successfully",
            ip_address=ip_address,
        )
        self.session.add(audit)
        await self.session.commit()

        new_access_token = create_access_token(
            subject=str(user.id),
            role=user.role,
            token_version=user.token_version,
            secret_key=self.jwt_secret_key,
            expires_minutes=self.access_token_expire_minutes,
            algorithm=self.jwt_algorithm,
        )

        return user, new_access_token, new_raw_refresh

    async def logout_user(
        self,
        user: User,
        raw_refresh_token: str | None = None,
        ip_address: str | None = None,
    ) -> None:
        """Logout user: increment token_version and revoke refresh token family."""
        user.token_version += 1

        if raw_refresh_token:
            token_hash = hash_token(raw_refresh_token)
            stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
            result = await self.session.execute(stmt)
            token_record = result.scalar_one_or_none()
            if token_record:
                family_stmt = select(RefreshToken).where(
                    RefreshToken.family_id == token_record.family_id
                )
                family_res = await self.session.execute(family_stmt)
                for rec in family_res.scalars().all():
                    rec.is_revoked = True

        audit = AuditLog(
            user_id=user.id,
            event="LOGOUT",
            details="User logged out and token_version incremented",
            ip_address=ip_address,
        )
        self.session.add(audit)
        await self.session.commit()

    async def create_group_self_service(
        self,
        creator: User,
        name: str,
        faculty: str | None = None,
        university: str | None = None,
    ) -> Group:
        """Self-service creation of a group: creator becomes elder."""
        if creator.group_id is not None and creator.role != RoleEnum.ADMIN.value:
            raise ValueError(
                "Пользователь уже состоит в группе. Сначала покиньте текущую группу."
            )

        stmt = select(Group).where(Group.name == name)
        existing = (await self.session.execute(stmt)).scalar_one_or_none()
        if existing:
            raise ValueError(f"Group '{name}' already exists")

        group = Group(name=name, faculty=faculty, university=university)
        self.session.add(group)
        await self.session.flush()

        creator.group_id = group.id
        creator.role = RoleEnum.ELDER.value
        creator.token_version += 1

        audit = AuditLog(
            user_id=creator.id,
            event="GROUP_CREATE",
            details=f"Self-service group created: '{name}'",
        )
        self.session.add(audit)
        await self.session.commit()
        return group

    async def leave_group(self, user: User) -> User:
        """Leave current group.

        If elder, requires transferring role first or being sole member.
        """
        if user.group_id is None:
            raise ValueError("Вы не состоите ни в одной группе.")

        if user.role == RoleEnum.ELDER.value:
            count_stmt = select(func.count(User.id)).where(
                User.group_id == user.group_id, User.id != user.id
            )
            count_res = await self.session.execute(count_stmt)
            other_count = count_res.scalar_one()
            if other_count > 0:
                raise ValueError(
                    "Вы староста группы. Перед выходом передайте права "
                    "старосты другому студенту."
                )

        old_group_id = user.group_id
        user.group_id = None
        user.subgroup_number = None
        user.role = RoleEnum.STUDENT.value
        user.token_version += 1

        audit = AuditLog(
            user_id=user.id,
            event="GROUP_LEAVE",
            details=f"User left group {old_group_id}",
        )
        self.session.add(audit)
        await self.session.commit()
        return user

    async def create_invite(
        self,
        creator: User,
        role: str,
        group_id: uuid.UUID | None = None,
        group_name: str | None = None,
        subgroup_number: int | None = None,
        is_single_use: bool = False,
    ) -> tuple[InviteToken, str]:
        """Create an invite token."""
        raw_token = generate_random_token(32)
        invite = InviteToken(
            token_hash=hash_token(raw_token),
            group_id=group_id,
            group_name=group_name,
            role=role,
            subgroup_number=subgroup_number,
            is_single_use=is_single_use,
            is_revoked=False,
            created_by_user_id=creator.id,
        )
        self.session.add(invite)

        audit = AuditLog(
            user_id=creator.id,
            event="INVITE_CREATE",
            details=(
                f"Created invite: role={role}, subgroup={subgroup_number}, "
                f"single_use={is_single_use}"
            ),
        )
        self.session.add(audit)
        await self.session.commit()
        return invite, raw_token

    async def list_group_users(self, actor: User) -> list[User]:
        """List users visible to an elder (own group) or an admin (everyone)."""
        stmt = select(User).order_by(User.created_at, User.telegram_id)
        if actor.role != RoleEnum.ADMIN.value:
            if actor.group_id is None:
                return []
            stmt = stmt.where(User.group_id == actor.group_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def set_user_role(self, actor: User, target_id: uuid.UUID, role: str) -> User:
        """Change a group member role; a new elder replaces the previous one."""
        if role not in (
            RoleEnum.ELDER.value,
            RoleEnum.STUDENT.value,
            RoleEnum.HELPER.value,
        ):
            msg = "Only elder, helper and student roles can be assigned"
            raise ValueError(msg)

        stmt = select(User).where(User.id == target_id).with_for_update()
        target = (await self.session.execute(stmt)).scalar_one_or_none()
        if target is None:
            raise LookupError("User not found")

        if actor.role != RoleEnum.ADMIN.value and (
            actor.group_id is None or target.group_id != actor.group_id
        ):
            raise PermissionError("Cannot change role of another group member")

        if role == RoleEnum.ELDER.value and target.group_id is not None:
            elders = await self.session.execute(
                select(User).where(
                    User.group_id == target.group_id,
                    User.role == RoleEnum.ELDER.value,
                )
            )
            for other in elders.scalars():
                if other.id != target.id:
                    other.role = RoleEnum.STUDENT.value

        target.role = role
        target.token_version += 1
        self.session.add(
            AuditLog(
                user_id=actor.id,
                event="ROLE_CHANGE",
                details=f"Set role={role} for user {target_id}",
            )
        )
        await self.session.commit()
        return target

    async def revoke_invite(self, user: User, invite_id: uuid.UUID) -> None:
        """Revoke an invite link."""
        stmt = select(InviteToken).where(InviteToken.id == invite_id).with_for_update()
        invite = (await self.session.execute(stmt)).scalar_one_or_none()
        if not invite:
            raise ValueError("Invite not found")

        if user.role != RoleEnum.ADMIN.value and invite.group_id != user.group_id:
            raise PermissionError("Cannot revoke invite of another group")

        invite.is_revoked = True
        audit = AuditLog(
            user_id=user.id,
            event="INVITE_REVOKE",
            details=f"Revoked invite id={invite_id}",
        )
        self.session.add(audit)
        await self.session.commit()

    async def list_all_groups_summary(
        self, actor: User
    ) -> list[GroupAdminSummaryResponse]:
        """List all groups with summary for superadmin."""
        if actor.role != RoleEnum.ADMIN.value:
            raise PermissionError("Admin role required")

        groups_res = await self.session.execute(
            select(Group).order_by(Group.name.asc())
        )
        groups = list(groups_res.scalars().all())

        users_res = await self.session.execute(select(User))
        all_users = list(users_res.scalars().all())

        helpers_res = await self.session.execute(select(GroupHelper))
        all_helpers = list(helpers_res.scalars().all())

        user_by_id = {u.id: u for u in all_users}

        summaries: list[GroupAdminSummaryResponse] = []
        for grp in groups:
            members = [u for u in all_users if u.group_id == grp.id]
            elder = next((u for u in members if u.role == RoleEnum.ELDER.value), None)

            helper_users_dict: dict[uuid.UUID, User] = {
                u.id: u for u in members if u.role == RoleEnum.HELPER.value
            }
            for gh in all_helpers:
                if gh.group_id == grp.id and gh.user_id in user_by_id:
                    helper_users_dict[gh.user_id] = user_by_id[gh.user_id]

            summaries.append(
                GroupAdminSummaryResponse(
                    id=grp.id,
                    name=grp.name,
                    faculty=grp.faculty,
                    university=grp.university,
                    created_at=grp.created_at,
                    elder=UserResponse.model_validate(elder) if elder else None,
                    helpers=[
                        UserResponse.model_validate(h)
                        for h in helper_users_dict.values()
                    ],
                    students_count=len(members),
                )
            )
        return summaries

    async def set_group_elder(
        self, actor: User, group_id: uuid.UUID, user_id: uuid.UUID
    ) -> User:
        """Assign or replace the elder of a group directly (admin action)."""
        if actor.role != RoleEnum.ADMIN.value:
            raise PermissionError("Admin role required")

        user_stmt = select(User).where(User.id == user_id).with_for_update()
        target = (await self.session.execute(user_stmt)).scalar_one_or_none()
        if not target:
            raise LookupError("User not found")

        old_elders_stmt = select(User).where(
            User.group_id == group_id, User.role == RoleEnum.ELDER.value
        )
        old_elders_res = (await self.session.execute(old_elders_stmt)).scalars()
        old_elders = (
            list(old_elders_res.all())
            if hasattr(old_elders_res, "all")
            else list(old_elders_res)
        )
        for old in old_elders:
            if old.id != target.id:
                old.role = RoleEnum.STUDENT.value

        target.role = RoleEnum.ELDER.value
        target.group_id = group_id
        target.token_version = (target.token_version or 0) + 1

        self.session.add(
            AuditLog(
                user_id=actor.id,
                event="ADMIN_SET_ELDER",
                details=f"Assigned user {user_id} as elder of group {group_id}",
            )
        )
        await self.session.commit()
        return target

    async def add_group_helper(
        self, actor: User, group_id: uuid.UUID, user_id: uuid.UUID
    ) -> GroupHelper:
        """Assign a student to be a helper for a specific group."""
        if actor.role != RoleEnum.ADMIN.value and (
            actor.role != RoleEnum.ELDER.value or actor.group_id != group_id
        ):
            raise PermissionError("Only group elder or admin may add helpers")

        user_stmt = select(User).where(User.id == user_id)
        user = (await self.session.execute(user_stmt)).scalar_one_or_none()
        if not user:
            raise LookupError("User not found")

        existing_stmt = select(GroupHelper).where(
            GroupHelper.group_id == group_id, GroupHelper.user_id == user_id
        )
        existing = (await self.session.execute(existing_stmt)).scalar_one_or_none()
        if existing:
            return existing

        helper_link = GroupHelper(group_id=group_id, user_id=user_id)
        self.session.add(helper_link)
        self.session.add(
            AuditLog(
                user_id=actor.id,
                event="HELPER_ADD",
                details=f"Added user {user_id} as helper to group {group_id}",
            )
        )
        await self.session.commit()
        return helper_link

    async def remove_group_helper(
        self, actor: User, group_id: uuid.UUID, user_id: uuid.UUID
    ) -> None:
        """Remove a helper from a group."""
        if actor.role != RoleEnum.ADMIN.value and (
            actor.role != RoleEnum.ELDER.value or actor.group_id != group_id
        ):
            raise PermissionError("Only group elder or admin may remove helpers")

        stmt = select(GroupHelper).where(
            GroupHelper.group_id == group_id, GroupHelper.user_id == user_id
        )
        helper_link = (await self.session.execute(stmt)).scalar_one_or_none()
        if helper_link:
            await self.session.delete(helper_link)
            self.session.add(
                AuditLog(
                    user_id=actor.id,
                    event="HELPER_REMOVE",
                    details=f"Removed user {user_id} from group {group_id} helpers",
                )
            )
            await self.session.commit()

    async def list_group_helpers(self, group_id: uuid.UUID) -> list[User]:
        """List all helpers for a group (native + cross-group helpers)."""
        members_stmt = select(User).where(
            User.group_id == group_id, User.role == RoleEnum.HELPER.value
        )
        members = list((await self.session.execute(members_stmt)).scalars().all())

        links_stmt = select(GroupHelper).where(GroupHelper.group_id == group_id)
        links = list((await self.session.execute(links_stmt)).scalars().all())
        link_user_ids = [
            lnk.user_id for lnk in links if lnk.user_id not in {m.id for m in members}
        ]

        if link_user_ids:
            extra_users_stmt = select(User).where(User.id.in_(link_user_ids))
            extra_users = list(
                (await self.session.execute(extra_users_stmt)).scalars().all()
            )
            members.extend(extra_users)

        return members

    async def list_user_helper_groups(self, user: User) -> list[Group]:
        """List groups where user is linked as a helper."""
        stmt = (
            select(Group)
            .join(GroupHelper, GroupHelper.group_id == Group.id)
            .where(GroupHelper.user_id == user.id)
            .order_by(Group.name.asc())
        )
        res = await self.session.execute(stmt)
        return list(res.scalars().all())
