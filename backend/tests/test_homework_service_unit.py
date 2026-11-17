"""Unit tests for HomeworkService and role-based permissions."""

import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from backend.auth.models import RoleEnum, User
from backend.homework.models import Homework
from backend.homework.schemas import HomeworkCreate, HomeworkUpdate
from backend.homework.service import HomeworkService


def _now() -> datetime:
    return datetime.now(UTC)


def _user(
    role: str,
    group_id: uuid.UUID | None = None,
    subgroup: int | None = None,
) -> User:
    return User(
        id=uuid.uuid4(),
        telegram_id=12345,
        role=role,
        group_id=group_id,
        subgroup_number=subgroup,
    )


@pytest.mark.asyncio
async def test_elder_can_create_homework_for_own_group() -> None:
    group_id = uuid.uuid4()
    elder = _user(RoleEnum.ELDER.value, group_id=group_id)

    mock_session = AsyncMock()
    mock_session.add = MagicMock()

    service = HomeworkService(session=mock_session)
    data = HomeworkCreate(
        title="Лабораторная 1",
        description="Написать тесты",
        deadline=_now() + timedelta(days=7),
        group_id=group_id,
        subgroup=1,
    )

    hw = await service.create_homework(user=elder, data=data)
    assert hw.title == "Лабораторная 1"
    assert hw.group_id == group_id
    assert hw.subgroup == 1
    mock_session.add.assert_called_once()
    mock_session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_student_cannot_create_homework() -> None:
    group_id = uuid.uuid4()
    student = _user(RoleEnum.STUDENT.value, group_id=group_id)

    mock_session = AsyncMock()
    service = HomeworkService(session=mock_session)
    data = HomeworkCreate(
        title="Самовольное ДЗ",
        description="Описание",
        deadline=_now() + timedelta(days=3),
        group_id=group_id,
    )

    with pytest.raises(HTTPException) as exc_info:
        await service.create_homework(user=student, data=data)

    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_elder_cannot_create_homework_for_other_group() -> None:
    group_a = uuid.uuid4()
    group_b = uuid.uuid4()
    elder_a = _user(RoleEnum.ELDER.value, group_id=group_a)

    mock_session = AsyncMock()
    service = HomeworkService(session=mock_session)
    data = HomeworkCreate(
        title="ДЗ для чужой группы",
        description="Описание",
        deadline=_now() + timedelta(days=3),
        group_id=group_b,
    )

    with pytest.raises(HTTPException) as exc_info:
        await service.create_homework(user=elder_a, data=data)

    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_student_cannot_view_other_group_homework() -> None:
    group_a = uuid.uuid4()
    group_b = uuid.uuid4()
    student_a = _user(RoleEnum.STUDENT.value, group_id=group_a)

    mock_session = AsyncMock()
    service = HomeworkService(session=mock_session)

    with pytest.raises(HTTPException) as exc_info:
        await service.get_homeworks(user=student_a, group_id=group_b)

    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_elder_can_update_own_group_homework() -> None:
    group_id = uuid.uuid4()
    elder = _user(RoleEnum.ELDER.value, group_id=group_id)

    hw = Homework(
        id=uuid.uuid4(),
        group_id=group_id,
        title="Старое название",
        description="Старое описание",
        deadline=_now() + timedelta(days=5),
    )

    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = hw
    mock_session.execute.return_value = mock_result

    service = HomeworkService(session=mock_session)
    updated = await service.update_homework(
        user=elder,
        homework_id=hw.id,
        data=HomeworkUpdate(title="Новое название"),
    )

    assert updated.title == "Новое название"
    mock_session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_student_cannot_update_homework() -> None:
    group_id = uuid.uuid4()
    student = _user(RoleEnum.STUDENT.value, group_id=group_id)

    hw = Homework(
        id=uuid.uuid4(),
        group_id=group_id,
        title="ДЗ",
        description="Описание",
        deadline=_now(),
    )

    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = hw
    mock_session.execute.return_value = mock_result

    service = HomeworkService(session=mock_session)

    with pytest.raises(HTTPException) as exc_info:
        await service.update_homework(
            user=student,
            homework_id=hw.id,
            data=HomeworkUpdate(title="Взлом"),
        )

    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_elder_can_delete_own_group_homework() -> None:
    group_id = uuid.uuid4()
    elder = _user(RoleEnum.ELDER.value, group_id=group_id)

    hw = Homework(
        id=uuid.uuid4(),
        group_id=group_id,
        title="ДЗ",
        description="Описание",
        deadline=_now(),
    )

    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = hw
    mock_session.execute.return_value = mock_result

    service = HomeworkService(session=mock_session)
    await service.delete_homework(user=elder, homework_id=hw.id)

    mock_session.delete.assert_awaited_once_with(hw)
    mock_session.commit.assert_awaited_once()
