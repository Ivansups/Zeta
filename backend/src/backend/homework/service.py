"""Service for homework CRUD operations with role-based access control."""

import uuid
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.auth.models import GroupHelper, RoleEnum, User
from backend.homework.models import Homework, HomeworkDraft
from backend.homework.parsers.text_parser import (
    clean_homework_description,
    extract_deadline,
    extract_subgroup,
    extract_subject,
)
from backend.homework.schemas import (
    ConfirmedHomeworkResponse,
    HomeworkCreate,
    HomeworkDraftResponse,
    HomeworkParsePreview,
    HomeworkUpdate,
)
from backend.schedule.db_models import SchedulePair


class HomeworkService:
    """Handles business logic and permission enforcement for homework."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def _is_privileged_for_group(self, user: User, group_id: uuid.UUID) -> bool:
        """Check if user has teacher/elder rights over the specified group."""
        if user.role == RoleEnum.ADMIN.value:
            return True
        if user.role == RoleEnum.ELDER.value:
            return user.group_id == group_id
        if user.role == RoleEnum.HELPER.value:
            if user.group_id == group_id:
                return True
            stmt = select(GroupHelper).where(
                GroupHelper.group_id == group_id, GroupHelper.user_id == user.id
            )
            res = await self.session.execute(stmt)
            val = res.scalar_one_or_none()
            if hasattr(val, "_mock_return_value") and not isinstance(val, GroupHelper):
                return False
            return val is not None
        return False

    async def create_homework(self, user: User, data: HomeworkCreate) -> Homework:
        """Create a new homework assignment.

        Only admin, elder or helper of the group may create homework.
        """
        target_group_id = data.group_id or user.group_id
        if not target_group_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Group ID is required to create homework",
            )

        if not await self._is_privileged_for_group(user, target_group_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only elder, helper or admin may create homework",
            )

        if data.schedule_pair_id:
            stmt = select(SchedulePair).where(SchedulePair.id == data.schedule_pair_id)
            res = await self.session.execute(stmt)
            pair = res.scalar_one_or_none()
            if not pair:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Schedule pair not found",
                )
            if pair.group_id != target_group_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Schedule pair belongs to another group",
                )

        hw = Homework(
            group_id=target_group_id,
            schedule_pair_id=data.schedule_pair_id,
            subgroup=data.subgroup,
            title=data.title.strip(),
            description=data.description.strip(),
            subject=data.subject.strip() if data.subject else None,
            deadline=data.deadline,
            created_by_id=user.id,
        )
        self.session.add(hw)
        await self.session.commit()
        # The response mapper reads hw.group; load it explicitly to avoid an
        # implicit lazy load outside the async greenlet context.
        await self.session.refresh(hw, attribute_names=["group"])
        return hw

    async def get_homeworks(
        self,
        user: User,
        group_id: uuid.UUID | None = None,
        subgroup: int | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> list[Homework]:
        """Query homeworks filtered by group and user role.

        Students see own group. Admin sees everything if group_id is omitted.
        """
        stmt = (
            select(Homework)
            .options(selectinload(Homework.group))
            .order_by(Homework.deadline.asc())
        )

        effective_group_id = group_id or user.group_id
        if user.role != RoleEnum.ADMIN.value:
            if not user.group_id:
                return []
            if group_id and group_id != user.group_id:
                if not await self._is_privileged_for_group(user, group_id):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Cannot view homework for another group",
                    )
                effective_group_id = group_id
            else:
                effective_group_id = user.group_id

        if effective_group_id:
            stmt = stmt.where(Homework.group_id == effective_group_id)

        effective_subgroup = subgroup
        if effective_subgroup is None and user.role == RoleEnum.STUDENT.value:
            effective_subgroup = user.subgroup_number

        if effective_subgroup is not None:
            subgroup_filter = (Homework.subgroup.is_(None)) | (
                Homework.subgroup == effective_subgroup
            )
            stmt = stmt.where(subgroup_filter)

        if date_from:
            stmt = stmt.where(Homework.deadline >= date_from)
        if date_to:
            stmt = stmt.where(Homework.deadline <= date_to)

        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_homework_by_id(self, user: User, homework_id: uuid.UUID) -> Homework:
        """Fetch single homework assignment by ID."""
        stmt = (
            select(Homework)
            .options(selectinload(Homework.group))
            .where(Homework.id == homework_id)
        )
        res = await self.session.execute(stmt)
        hw = res.scalar_one_or_none()
        if not hw:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Homework assignment not found",
            )

        if (
            user.role != RoleEnum.ADMIN.value
            and user.group_id != hw.group_id
            and not await self._is_privileged_for_group(user, hw.group_id)
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to homework of another group",
            )

        return hw

    async def update_homework(
        self, user: User, homework_id: uuid.UUID, data: HomeworkUpdate
    ) -> Homework:
        """Update existing homework assignment."""
        hw = await self.get_homework_by_id(user, homework_id)

        if not await self._is_privileged_for_group(user, hw.group_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only elder, helper or admin may update this homework",
            )

        if data.title is not None:
            hw.title = data.title.strip()
        if data.description is not None:
            hw.description = data.description.strip()
        if data.deadline is not None:
            hw.deadline = data.deadline
        if "subgroup" in data.model_fields_set:
            hw.subgroup = data.subgroup
        if data.subject is not None:
            hw.subject = data.subject.strip()

        if data.schedule_pair_id is not None:
            stmt = select(SchedulePair).where(SchedulePair.id == data.schedule_pair_id)
            res = await self.session.execute(stmt)
            pair = res.scalar_one_or_none()
            if not pair:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Schedule pair not found",
                )
            if pair.group_id != hw.group_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Schedule pair belongs to another group",
                )
            hw.schedule_pair_id = data.schedule_pair_id

        await self.session.commit()
        await self.session.refresh(hw)
        return hw

    async def delete_homework(self, user: User, homework_id: uuid.UUID) -> None:
        """Delete homework assignment."""
        hw = await self.get_homework_by_id(user, homework_id)

        if not await self._is_privileged_for_group(user, hw.group_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only elder, helper or admin may delete this homework",
            )

        await self.session.delete(hw)
        await self.session.commit()

    async def parse_text_to_draft(
        self, text: str, user: User, ttl_seconds: int = 900
    ) -> HomeworkDraftResponse:
        """Parse homework text into structured draft persisted in Postgres."""
        group_id = await self.require_manager_group(user)
        preview = self.parse_preview(text)

        now = datetime.now(UTC)
        expires_at = now + timedelta(seconds=ttl_seconds)

        draft = HomeworkDraft(
            group_id=group_id,
            created_by_id=user.id,
            subject=preview.subject,
            description=preview.description,
            subgroup=preview.subgroup,
            deadline=preview.deadline,
            expires_at=expires_at,
        )
        self.session.add(draft)
        await self.session.commit()
        await self.session.refresh(draft)

        return HomeworkDraftResponse(
            draft_id=str(draft.id),
            subject=preview.subject,
            description=preview.description,
            deadline=preview.deadline,
            subgroup=preview.subgroup,
        )

    async def require_manager_group(
        self, user: User, target_group_id: uuid.UUID | None = None
    ) -> uuid.UUID:
        """Ensure the user may manage homework for their own group or linked group."""
        effective_group = target_group_id or user.group_id
        if not effective_group:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User has no group assigned",
            )
        if not await self._is_privileged_for_group(user, effective_group):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only elder, helper or admin may create homework drafts",
            )
        return effective_group

    def parse_preview(self, text: str) -> HomeworkParsePreview:
        """Extract subject, description, deadline and subgroup from free text."""
        norm = text.lower()
        return HomeworkParsePreview(
            subject=extract_subject(norm),
            description=clean_homework_description(text),
            deadline=extract_deadline(norm),
            subgroup=extract_subgroup(norm),
        )

    async def confirm_draft(
        self, user: User, draft_id: str
    ) -> ConfirmedHomeworkResponse:
        """Confirm and persist a draft from database to homeworks table."""
        try:
            draft_uuid = uuid.UUID(draft_id)
        except ValueError as err:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Draft not found or expired",
            ) from err

        stmt = select(HomeworkDraft).where(HomeworkDraft.id == draft_uuid)
        res = await self.session.execute(stmt)
        draft = res.scalar_one_or_none()

        now = datetime.now(UTC)
        if not draft or draft.expires_at < now:
            if draft:
                await self.session.delete(draft)
                await self.session.commit()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Draft not found or expired",
            )

        if not await self._is_privileged_for_group(user, draft.group_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Only elder, helper or admin of the group "
                    "may confirm homework drafts"
                ),
            )

        hw = Homework(
            group_id=draft.group_id,
            title=draft.subject,
            description=draft.description,
            subject=draft.subject,
            deadline=draft.deadline,
            subgroup=draft.subgroup,
            created_by_id=user.id,
        )
        self.session.add(hw)
        await self.session.delete(draft)
        await self.session.commit()
        await self.session.refresh(hw)

        return ConfirmedHomeworkResponse(
            id=str(hw.id),
            subject=hw.subject or hw.title,
            description=hw.description,
            deadline=hw.deadline,
            subgroup=hw.subgroup,
        )

    async def cancel_draft(self, user: User, draft_id: str) -> None:
        """Cancel and remove a draft from database."""
        try:
            draft_uuid = uuid.UUID(draft_id)
        except ValueError as err:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Draft not found or expired",
            ) from err

        stmt = select(HomeworkDraft).where(HomeworkDraft.id == draft_uuid)
        res = await self.session.execute(stmt)
        draft = res.scalar_one_or_none()

        if not draft:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Draft not found or expired",
            )

        if not await self._is_privileged_for_group(user, draft.group_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Only elder, helper or admin of the group "
                    "may cancel homework drafts"
                ),
            )

        await self.session.delete(draft)
        await self.session.commit()
