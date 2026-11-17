"""Service for homework CRUD operations with role-based access control."""

import re
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any, ClassVar

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.auth.models import RoleEnum, User
from backend.homework.models import Homework
from backend.homework.schemas import (
    ConfirmedHomeworkResponse,
    HomeworkCreate,
    HomeworkDraftResponse,
    HomeworkUpdate,
)
from backend.schedule.db_models import SchedulePair


class HomeworkService:
    """Handles business logic and permission enforcement for homework."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def _is_privileged_for_group(self, user: User, group_id: uuid.UUID) -> bool:
        """Check if user has teacher/elder rights over the specified group."""
        if user.role == RoleEnum.ADMIN.value:
            return True
        if user.role in (RoleEnum.ELDER.value, RoleEnum.HELPER.value):
            return user.group_id == group_id
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

        if not self._is_privileged_for_group(user, target_group_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only elder, helper or admin may create homework for this group",
            )

        subject = data.subject
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
                    detail="Schedule pair does not belong to the selected group",
                )
            if not subject:
                subject = pair.subject

        hw = Homework(
            group_id=target_group_id,
            schedule_pair_id=data.schedule_pair_id,
            subgroup=data.subgroup,
            title=data.title.strip(),
            description=data.description.strip(),
            subject=subject,
            deadline=data.deadline,
            created_by_id=user.id,
        )
        self.session.add(hw)
        await self.session.commit()
        await self.session.refresh(hw)
        return hw

    async def get_homeworks(
        self,
        user: User,
        group_id: uuid.UUID | None = None,
        subgroup: int | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> list[Homework]:
        """Fetch list of homework assignments with access control."""
        stmt = select(Homework).options(selectinload(Homework.group))

        if user.role == RoleEnum.STUDENT.value:
            if not user.group_id:
                return []
            if group_id and group_id != user.group_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Students can only view homework for their own group",
                )
            target_group_id: uuid.UUID = user.group_id
            stmt = stmt.where(Homework.group_id == target_group_id)

            target_subgroup = subgroup if subgroup is not None else user.subgroup_number
            if target_subgroup is not None:
                stmt = stmt.where(
                    (Homework.subgroup.is_(None))
                    | (Homework.subgroup == target_subgroup)
                )
        elif user.role in (RoleEnum.ELDER.value, RoleEnum.HELPER.value):
            elder_group_id = group_id or user.group_id
            if elder_group_id and elder_group_id != user.group_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Elders and helpers can only view their own group",
                )
            if elder_group_id:
                stmt = stmt.where(Homework.group_id == elder_group_id)
            if subgroup is not None:
                stmt = stmt.where(
                    (Homework.subgroup.is_(None)) | (Homework.subgroup == subgroup)
                )
        else:
            # Admin or curator
            if group_id:
                stmt = stmt.where(Homework.group_id == group_id)
            if subgroup is not None:
                stmt = stmt.where(
                    (Homework.subgroup.is_(None)) | (Homework.subgroup == subgroup)
                )

        if date_from:
            stmt = stmt.where(Homework.deadline >= date_from)
        if date_to:
            stmt = stmt.where(Homework.deadline <= date_to)

        stmt = stmt.order_by(Homework.deadline.asc(), Homework.title.asc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_homework_by_id(self, user: User, homework_id: uuid.UUID) -> Homework:
        """Fetch single homework assignment by ID with access control."""
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
                detail="Homework not found",
            )

        if user.role != RoleEnum.ADMIN.value and user.group_id != hw.group_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: homework belongs to another group",
            )

        return hw

    async def update_homework(
        self, user: User, homework_id: uuid.UUID, data: HomeworkUpdate
    ) -> Homework:
        """Update existing homework assignment."""
        hw = await self.get_homework_by_id(user, homework_id)

        if not self._is_privileged_for_group(user, hw.group_id):
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
        if data.subgroup is not None:
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

        if not self._is_privileged_for_group(user, hw.group_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only elder, helper or admin may delete this homework",
            )

        await self.session.delete(hw)
        await self.session.commit()

    _DRAFT_CACHE: ClassVar[dict[str, dict[str, Any]]] = {}

    def parse_text_to_draft(self, text: str, user: User) -> HomeworkDraftResponse:
        """Parse unstructured homework text into structured draft."""
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

        norm = text.lower()
        subject_aliases = [
            (["матан", "математик", "матанализ"], "Математический анализ"),
            (["питон", "python", "пайтон"], "Программирование на Python"),
            (["алгоритм", "структур", "аисд"], "Алгоритмы и структуры данных"),
            (["англ", "english", "инглиш"], "Английский язык"),
            (["дискрет", "кнф", "днф"], "Дискретная математика"),
            (["истор"], "История России"),
        ]

        subject = "Домашнее задание"
        for keywords, alias in subject_aliases:
            if any(kw in norm for kw in keywords):
                subject = alias
                break

        subgroup: int | None = None
        if re.search(
            r"(\b1\s*подгрупп|подгрупп[а-я]*\s*1|перв[а-я]*\s*подгрупп)", norm
        ):
            subgroup = 1
        elif re.search(
            r"(\b2\s*подгрупп|подгрупп[а-я]*\s*2|втор[а-я]*\s*подгрупп)", norm
        ):
            subgroup = 2

        now = datetime.now(UTC)
        deadline: datetime = (now + timedelta(days=1)).replace(
            hour=23, minute=59, second=0, microsecond=0
        )

        weekday_map = {
            "понедельник": 0,
            "пн": 0,
            "вторник": 1,
            "вт": 1,
            "среда": 2,
            "среду": 2,
            "ср": 2,
            "четверг": 3,
            "четвергу": 3,
            "чт": 3,
            "пятниц": 4,
            "пятнице": 4,
            "пт": 4,
            "суббот": 5,
            "субботе": 5,
            "сб": 5,
            "воскресень": 6,
            "вс": 6,
        }

        for w_name, w_idx in weekday_map.items():
            if w_name in norm:
                diff = (w_idx - now.weekday()) % 7
                if diff == 0:
                    diff = 7
                deadline = (now + timedelta(days=diff)).replace(
                    hour=23, minute=59, second=0, microsecond=0
                )
                break

        cleaned = re.sub(r"(?i)^дз[:\s]*", "", text).strip()
        cleaned = re.sub(
            r"(?i)(?:для\s*)?(?:[12]\s*подгрупп[а-я]*|вся\s*группа|для\s*всех)",
            "",
            cleaned,
        ).strip()
        cleaned = re.sub(
            r"(?i)(?:по\s*)?(?:матану?|математике?|питону?|python|алгоритмам?|аисд|английскому?|english|дискретке?|истории?)",
            "",
            cleaned,
        ).strip()
        cleaned = re.sub(
            r"(?i)(?:к|на)\s*(?:четвергу?|пятнице?|субботе?|понедельнику?|вторнику?|среде?|завтра|сегодня)",
            "",
            cleaned,
        ).strip(" ,.:;-")

        if len(cleaned) < 3:
            cleaned = text.strip()

        draft_id = str(uuid.uuid4())
        self._DRAFT_CACHE[draft_id] = {
            "subject": subject,
            "description": cleaned,
            "deadline": deadline,
            "subgroup": subgroup,
            "group_id": user.group_id,
            "created_by_id": user.id,
        }

        return HomeworkDraftResponse(
            draft_id=draft_id,
            subject=subject,
            description=cleaned,
            deadline=deadline,
            subgroup=subgroup,
        )

    async def confirm_draft(
        self, user: User, draft_id: str
    ) -> ConfirmedHomeworkResponse:
        """Confirm and persist a draft to the database."""
        draft = self._DRAFT_CACHE.pop(draft_id, None)
        if not draft:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Draft not found or expired",
            )

        hw = Homework(
            group_id=draft["group_id"],
            title=draft["subject"],
            description=draft["description"],
            subject=draft["subject"],
            deadline=draft["deadline"],
            subgroup=draft["subgroup"],
            created_by_id=user.id,
        )
        self.session.add(hw)
        await self.session.commit()
        await self.session.refresh(hw)

        return ConfirmedHomeworkResponse(
            id=str(hw.id),
            subject=hw.subject or hw.title,
            description=hw.description,
            deadline=hw.deadline,
            subgroup=hw.subgroup,
        )
