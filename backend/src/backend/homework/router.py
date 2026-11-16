"""FastAPI router for homework endpoints."""

import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth.dependencies import get_current_user
from backend.auth.models import User
from backend.db.session import get_session
from backend.homework.models import Homework
from backend.homework.schemas import HomeworkCreate, HomeworkRead, HomeworkUpdate
from backend.homework.service import HomeworkService

router = APIRouter(prefix="/homework", tags=["homework"])


def _map_homework_to_read(hw: Homework) -> HomeworkRead:
    group_name = hw.group.name if hw.group else None
    return HomeworkRead(
        id=hw.id,
        group_id=hw.group_id,
        group_name=group_name,
        schedule_pair_id=hw.schedule_pair_id,
        subgroup=hw.subgroup,
        title=hw.title,
        description=hw.description,
        subject=hw.subject,
        deadline=hw.deadline,
        created_by_id=hw.created_by_id,
        created_at=hw.created_at,
        updated_at=hw.updated_at,
    )


@router.post("", response_model=HomeworkRead, status_code=status.HTTP_201_CREATED)
async def create_homework(
    data: HomeworkCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> HomeworkRead:
    """Create a new homework task for the user's group."""
    service = HomeworkService(session=session)
    hw = await service.create_homework(user=current_user, data=data)
    return _map_homework_to_read(hw)


@router.get("", response_model=list[HomeworkRead])
async def list_homeworks(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    group_id: Annotated[uuid.UUID | None, Query(description="Group ID filter")] = None,
    subgroup: Annotated[int | None, Query(description="Subgroup filter")] = None,
    date_from: Annotated[datetime | None, Query(description="Deadline from")] = None,
    date_to: Annotated[datetime | None, Query(description="Deadline to")] = None,
) -> list[HomeworkRead]:
    """Retrieve homework tasks with role-based group and subgroup filtering."""
    service = HomeworkService(session=session)
    items = await service.get_homeworks(
        user=current_user,
        group_id=group_id,
        subgroup=subgroup,
        date_from=date_from,
        date_to=date_to,
    )
    return [_map_homework_to_read(hw) for hw in items]


@router.get("/{homework_id}", response_model=HomeworkRead)
async def get_homework(
    homework_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> HomeworkRead:
    """Retrieve details of a single homework assignment."""
    service = HomeworkService(session=session)
    hw = await service.get_homework_by_id(user=current_user, homework_id=homework_id)
    return _map_homework_to_read(hw)


@router.patch("/{homework_id}", response_model=HomeworkRead)
async def update_homework(
    homework_id: uuid.UUID,
    data: HomeworkUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> HomeworkRead:
    """Update an existing homework assignment (elder, helper or admin)."""
    service = HomeworkService(session=session)
    hw = await service.update_homework(
        user=current_user, homework_id=homework_id, data=data
    )
    return _map_homework_to_read(hw)


@router.delete("/{homework_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_homework(
    homework_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> None:
    """Delete a homework assignment (elder, helper or admin)."""
    service = HomeworkService(session=session)
    await service.delete_homework(user=current_user, homework_id=homework_id)
