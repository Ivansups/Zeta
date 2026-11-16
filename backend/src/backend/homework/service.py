"""Service for homework CRUD operations with role-based access control."""

import uuid
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.auth.models import RoleEnum, User
from backend.homework.models import Homework
from backend.homework.schemas import HomeworkCreate, HomeworkUpdate
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
