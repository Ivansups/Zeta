"""Service for homework CRUD operations with role-based access control."""

import uuid
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.auth.models import RoleEnum, User
from backend.homework.models import (
    Homework,
    HomeworkCompletion,
    HomeworkDraft,
    HomeworkParticipant,
)
from backend.homework.parsers.text_parser import (
    clean_homework_description,
    extract_deadline,
    extract_subgroup,
    extract_subject,
)
from backend.homework.schemas import (
    ConfirmedHomeworkResponse,
    HomeworkCompletionResponse,
    HomeworkCreate,
    HomeworkDraftResponse,
    HomeworkModerateRequest,
    HomeworkParsePreview,
    HomeworkParticipantStatusUpdate,
    HomeworkUpdate,
)
from backend.schedule.db_models import SchedulePair


class HomeworkService:
    """Handles business logic and permission enforcement for homework."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def _is_privileged_for_group(self, user: User, group_id: uuid.UUID | None) -> bool:
        """Check if user has teacher/elder rights over the specified group."""
        if not group_id:
            return False
        if user.role == RoleEnum.ADMIN.value:
            return True
        if user.role in (RoleEnum.ELDER.value, RoleEnum.HELPER.value):
            return user.group_id == group_id
        return False

    async def create_homework(self, user: User, data: HomeworkCreate) -> Homework:
        """Create a new homework assignment (personal or group)."""
        if data.group_id is not None or not data.is_personal:
            target_group_id = data.group_id or user.group_id
            if not target_group_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Group ID is required to create homework",
                )
            if not self._is_privileged_for_group(user, target_group_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only elder, helper or admin may create homework",
                )
            is_personal = False
            status_val = "approved"
        else:
            target_group_id = None
            is_personal = True
            status_val = "approved"

        if data.schedule_pair_id and target_group_id:
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
            is_personal=is_personal,
            status=status_val,
            target_type=data.target_type or "all",
            submitted_to_group_at=None,
        )
        self.session.add(hw)
        await self.session.flush()

        if data.participant_ids:
            for uid in data.participant_ids:
                part = HomeworkParticipant(
                    homework_id=hw.id,
                    user_id=uid,
                    is_submitted=False,
                )
                self.session.add(part)

        await self.session.commit()
        await self.session.refresh(hw, attribute_names=["group", "participants"])
        return hw

    async def suggest_homework(self, user: User, homework_id: uuid.UUID) -> Homework:
        """Student proposes their personal task to their group."""
        hw = await self.get_homework_by_id(user, homework_id)
        if hw.created_by_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the author can suggest this homework to the group",
            )
        target_group = hw.group_id or user.group_id
        if not target_group:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Необходимо состоять в группе, чтобы предложить задание",
            )
        hw.group_id = target_group
        hw.status = "pending_approval"
        hw.submitted_to_group_at = datetime.now(UTC)
        await self.session.commit()
        await self.session.refresh(hw, attribute_names=["group", "participants"])
        return hw

    async def recall_homework(self, user: User, homework_id: uuid.UUID) -> Homework:
        """Author recalls their pending proposal back to personal list."""
        hw = await self.get_homework_by_id(user, homework_id)
        if hw.created_by_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the author can recall this proposal",
            )
        if hw.status != "pending_approval":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Только задания на рассмотрении могут быть отозваны",
            )
        hw.status = "recalled"
        hw.is_personal = True
        await self.session.commit()
        await self.session.refresh(hw, attribute_names=["group", "participants"])
        return hw

    async def moderate_homework(
        self, user: User, homework_id: uuid.UUID, data: HomeworkModerateRequest
    ) -> Homework:
        """Elder or helper moderates crowdsourced proposal."""
        hw = await self.get_homework_by_id(user, homework_id)
        is_priv = self._is_privileged_for_group(user, hw.group_id)
        if not is_priv:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only elder, helper or admin can moderate homework",
            )

        if data.action == "approve":
            hw.status = "approved"
            hw.is_personal = False
            hw.approved_by_id = user.id
            has_edits = False
            if data.title is not None and data.title.strip() != hw.title:
                hw.title = data.title.strip()
                has_edits = True
            if (
                data.description is not None
                and data.description.strip() != hw.description
            ):
                hw.description = data.description.strip()
                has_edits = True
            if "deadline" in data.model_fields_set and data.deadline != hw.deadline:
                hw.deadline = data.deadline
                has_edits = True
            if "subgroup" in data.model_fields_set and data.subgroup != hw.subgroup:
                hw.subgroup = data.subgroup
                has_edits = True
            if "subject" in data.model_fields_set and data.subject != hw.subject:
                hw.subject = data.subject.strip() if data.subject else None
                has_edits = True
            if data.target_type is not None and data.target_type != hw.target_type:
                hw.target_type = data.target_type
                has_edits = True

            if data.participant_ids is not None:
                from sqlalchemy import delete

                await self.session.execute(
                    delete(HomeworkParticipant).where(
                        HomeworkParticipant.homework_id == hw.id
                    )
                )
                for uid in data.participant_ids:
                    self.session.add(
                        HomeworkParticipant(homework_id=hw.id, user_id=uid)
                    )
                has_edits = True

            if has_edits:
                hw.edited_by_id = user.id

        elif data.action == "reject":
            hw.status = "rejected"
            hw.is_personal = True
            hw.moderation_comment = data.moderation_comment or "Отклонено старостой"
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Недопустимое действие модерации. Используйте approve или reject"
                ),
            )

        await self.session.commit()
        await self.session.refresh(hw, attribute_names=["group", "participants"])
        return hw

    async def update_participant_status(
        self,
        user: User,
        homework_id: uuid.UUID,
        target_user_id: uuid.UUID,
        data: HomeworkParticipantStatusUpdate,
    ) -> HomeworkParticipant:
        """Mark or unmark student submission by elder."""
        hw = await self.get_homework_by_id(user, homework_id)
        is_priv = self._is_privileged_for_group(user, hw.group_id)
        if not is_priv:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only elder, helper or admin can mark submission status",
            )

        stmt = select(HomeworkParticipant).where(
            HomeworkParticipant.homework_id == homework_id,
            HomeworkParticipant.user_id == target_user_id,
        )
        res = await self.session.execute(stmt)
        participant = res.scalar_one_or_none()

        now = datetime.now(UTC)
        if not participant:
            participant = HomeworkParticipant(
                homework_id=homework_id,
                user_id=target_user_id,
                is_submitted=data.is_submitted,
                submitted_at=now if data.is_submitted else None,
                marked_by_id=user.id if data.is_submitted else None,
            )
            self.session.add(participant)
        else:
            participant.is_submitted = data.is_submitted
            participant.submitted_at = now if data.is_submitted else None
            participant.marked_by_id = user.id if data.is_submitted else None

        await self.session.commit()
        return participant

    async def toggle_completion(
        self, user: User, homework_id: uuid.UUID
    ) -> HomeworkCompletionResponse:
        """Toggle personal completion status for student."""
        stmt = select(HomeworkCompletion).where(
            HomeworkCompletion.homework_id == homework_id,
            HomeworkCompletion.user_id == user.id,
        )
        res = await self.session.execute(stmt)
        existing = res.scalar_one_or_none()

        if existing:
            await self.session.delete(existing)
            await self.session.commit()
            return HomeworkCompletionResponse(
                homework_id=homework_id,
                is_completed=False,
                completed_at=None,
            )

        now = datetime.now(UTC)
        compl = HomeworkCompletion(
            homework_id=homework_id,
            user_id=user.id,
            completed_at=now,
        )
        self.session.add(compl)
        await self.session.commit()
        return HomeworkCompletionResponse(
            homework_id=homework_id,
            is_completed=True,
            completed_at=now,
        )

    async def get_homeworks(
        self,
        user: User,
        group_id: uuid.UUID | None = None,
        subgroup: int | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> list[Homework]:
        """Query homeworks: personal tasks + group tasks with targeting."""
        from sqlalchemy import or_

        stmt = (
            select(Homework)
            .options(
                selectinload(Homework.group),
                selectinload(Homework.participants),
                selectinload(Homework.completions),
            )
            .order_by(Homework.deadline.asc().nulls_last(), Homework.created_at.desc())
        )

        if user.role != RoleEnum.ADMIN.value and group_id and group_id != user.group_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot view homework for another group",
            )

        effective_group_id = group_id or user.group_id
        is_priv = (
            self._is_privileged_for_group(user, effective_group_id)
            if effective_group_id
            else (user.role == RoleEnum.ADMIN.value)
        )

        cond_personal = (Homework.created_by_id == user.id) & (
            Homework.is_personal == True  # noqa: E712
        )

        if effective_group_id:
            if is_priv:
                cond_group = (
                    (Homework.group_id == effective_group_id)
                    & (Homework.is_personal == False)  # noqa: E712
                    & (Homework.status.in_(["approved", "pending_approval"]))
                )
            else:
                cond_group = (
                    (Homework.group_id == effective_group_id)
                    & (Homework.is_personal == False)  # noqa: E712
                    & (Homework.status == "approved")
                )
            stmt = stmt.where(or_(cond_personal, cond_group))
        else:
            stmt = stmt.where(cond_personal)

        effective_subgroup = subgroup
        if effective_subgroup is None and user.role == RoleEnum.STUDENT.value:
            effective_subgroup = user.subgroup_number

        if effective_subgroup is not None:
            stmt = stmt.where(
                (Homework.subgroup.is_(None))
                | (Homework.subgroup == effective_subgroup)
                | (Homework.is_personal == True)  # noqa: E712
            )

        if date_from:
            stmt = stmt.where(
                (Homework.deadline >= date_from) | (Homework.deadline.is_(None))
            )
        if date_to:
            stmt = stmt.where(
                (Homework.deadline <= date_to) | (Homework.deadline.is_(None))
            )

        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_homework_by_id(self, user: User, homework_id: uuid.UUID) -> Homework:
        """Fetch single homework assignment by ID."""
        stmt = (
            select(Homework)
            .options(
                selectinload(Homework.group),
                selectinload(Homework.participants),
                selectinload(Homework.completions),
            )
            .where(Homework.id == homework_id)
        )
        res = await self.session.execute(stmt)
        hw = res.scalar_one_or_none()
        if not hw:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Homework assignment not found",
            )

        if user.role != RoleEnum.ADMIN.value:
            if hw.created_by_id == user.id:
                return hw
            if hw.group_id and user.group_id != hw.group_id:
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
        is_owner = hw.is_personal and hw.created_by_id == user.id
        is_priv = self._is_privileged_for_group(user, hw.group_id)

        if not is_owner and not is_priv:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only elder, helper or admin may update this homework",
            )

        if data.title is not None:
            hw.title = data.title.strip()
        if data.description is not None:
            hw.description = data.description.strip()
        if "deadline" in data.model_fields_set:
            hw.deadline = data.deadline
        if "subgroup" in data.model_fields_set:
            hw.subgroup = data.subgroup
        if data.subject is not None:
            hw.subject = data.subject.strip() if data.subject else None
        if data.is_personal is not None:
            hw.is_personal = data.is_personal
        if data.target_type is not None:
            hw.target_type = data.target_type

        if data.participant_ids is not None:
            from sqlalchemy import delete

            await self.session.execute(
                delete(HomeworkParticipant).where(
                    HomeworkParticipant.homework_id == hw.id
                )
            )
            for uid in data.participant_ids:
                self.session.add(HomeworkParticipant(homework_id=hw.id, user_id=uid))

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
        await self.session.refresh(hw, attribute_names=["group", "participants"])
        return hw

    async def delete_homework(self, user: User, homework_id: uuid.UUID) -> None:
        """Delete homework assignment."""
        hw = await self.get_homework_by_id(user, homework_id)
        is_owner = hw.is_personal and hw.created_by_id == user.id
        is_priv = self._is_privileged_for_group(user, hw.group_id)

        if not is_owner and not is_priv:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Only elder, helper, admin or the owner may delete this homework"
                ),
            )

        await self.session.delete(hw)
        await self.session.commit()

    async def parse_text_to_draft(
        self, text: str, user: User, ttl_seconds: int = 900
    ) -> HomeworkDraftResponse:
        """Parse homework text into structured draft persisted in Postgres."""
        group_id = self.require_manager_group(user)
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

    def require_manager_group(self, user: User) -> uuid.UUID:
        """Ensure the user may manage homework for their own group."""
        if not user.group_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User has no group assigned",
            )
        if not self._is_privileged_for_group(user, user.group_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only elder, helper or admin may create homework drafts",
            )
        return user.group_id

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

        if not self._is_privileged_for_group(user, draft.group_id):
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

        if not self._is_privileged_for_group(user, draft.group_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Only elder, helper or admin of the group "
                    "may cancel homework drafts"
                ),
            )

        await self.session.delete(draft)
        await self.session.commit()
