import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth.models import (
    AuditLog,
    Group,
    InviteToken,
    RefreshToken,
    RoleEnum,
    User,
)
from backend.auth.security import create_access_token, generate_random_token, hash_token


class AuthService:
    def __init__(
        self,
        session: AsyncSession,
        jwt_secret_key: str,
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
        await self.session.flush()

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

        invite.activations_count += 1
        if invite.is_single_use:
            invite.is_revoked = True

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
            await self.session.flush()

            raise PermissionError(
                "Compromised token reuse detected: all sessions revoked"
            )

        now = datetime.now(UTC)
        if token_record.expires_at <= now:
            token_record.is_revoked = True
            await self.session.flush()
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
        await self.session.flush()

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
        await self.session.flush()

    async def create_group_self_service(
        self,
        creator: User,
        name: str,
        faculty: str | None = None,
        university: str | None = None,
    ) -> Group:
        """Self-service creation of a group: creator becomes elder."""
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
        await self.session.flush()
        return group

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
        await self.session.flush()
        return invite, raw_token

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
        await self.session.flush()
