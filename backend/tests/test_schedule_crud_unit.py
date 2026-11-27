"""Unit tests for schedule CRUD operations and access control permissions."""

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException, status

from backend.auth.models import User
from backend.schedule.db_models import SchedulePair
from backend.schedule.schemas import SchedulePairCreate, SchedulePairUpdate
from backend.schedule.service import ScheduleStorageService


def _user(
    role: str = "student",
    group_id: uuid.UUID | None = None,
) -> User:
    u = User(
        id=uuid.uuid4(),
        telegram_id=12345678,
        role=role,
        group_id=group_id,
        token_version=1,
    )
    return u


def _sample_pair_create(group_id: uuid.UUID | None = None) -> SchedulePairCreate:
    return SchedulePairCreate(
        group_id=group_id,
        day_of_week="Понедельник",
        pair_number=2,
        start_time="10:15",
        end_time="11:50",
        week_parity="numerator",
        subgroup=1,
        subject="Базы данных",
        teacher="Петров П.П.",
        teacher_title="доц.",
        room="302",
        is_online=False,
        lesson_type="practice",
        notes=["Важная практика"],
    )


@pytest.mark.asyncio
async def test_create_pair_in_storage() -> None:
    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    service = ScheduleStorageService(session=mock_session)

    group_id = uuid.uuid4()
    data = _sample_pair_create(group_id)

    pair = await service.create_pair(group_id=group_id, data=data)

    assert pair.group_id == group_id
    assert pair.subject == "Базы данных"
    assert pair.subgroup == 1
    assert pair.week_parity == "numerator"
    assert pair.pair_number == 2
    assert pair.start_time == "10:15"
    assert pair.end_time == "11:50"
    assert pair.teacher == "Петров П.П."
    assert pair.room == "302"
    assert pair.lesson_type == "practice"
    assert pair.notes == "Важная практика"

    mock_session.add.assert_called_once_with(pair)
    mock_session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_pair_in_storage() -> None:
    mock_session = AsyncMock()
    service = ScheduleStorageService(session=mock_session)

    pair = SchedulePair(
        id=uuid.uuid4(),
        group_id=uuid.uuid4(),
        day_of_week="Понедельник",
        pair_number=1,
        start_time="08:30",
        end_time="10:05",
        week_parity="both",
        subgroup=None,
        subject="Математика",
        lesson_type="lecture",
    )

    update_data = SchedulePairUpdate(
        subject="Высшая математика",
        subgroup=2,
        week_parity="denominator",
        room="Ауд. 404",
        lesson_type="seminar",
    )

    updated = await service.update_pair(pair=pair, data=update_data)

    assert updated.subject == "Высшая математика"
    assert updated.subgroup == 2
    assert updated.week_parity == "denominator"
    assert updated.room == "Ауд. 404"
    assert updated.lesson_type == "seminar"
    mock_session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_delete_pair_in_storage() -> None:
    mock_session = AsyncMock()
    service = ScheduleStorageService(session=mock_session)

    pair = SchedulePair(
        id=uuid.uuid4(),
        group_id=uuid.uuid4(),
        day_of_week="Вторник",
        pair_number=3,
        start_time="12:00",
        end_time="13:35",
        subject="Физика",
    )

    await service.delete_pair(pair=pair)

    mock_session.delete.assert_awaited_once_with(pair)
    mock_session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_permission_check_for_schedule_management() -> None:
    """Test permission verification for schedule editing."""
    from backend.schedule.permissions import assert_can_manage_group_schedule

    mock_session = AsyncMock()
    my_group = uuid.uuid4()
    other_group = uuid.uuid4()

    admin = _user(role="admin", group_id=None)
    elder = _user(role="elder", group_id=my_group)
    student = _user(role="student", group_id=my_group)

    # Admin can manage any group
    await assert_can_manage_group_schedule(admin, other_group, mock_session)

    # Elder can manage their own group
    await assert_can_manage_group_schedule(elder, my_group, mock_session)

    # Elder cannot manage other group
    with pytest.raises(HTTPException) as exc_info:
        await assert_can_manage_group_schedule(elder, other_group, mock_session)
    assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN

    # Student cannot manage schedule
    with pytest.raises(HTTPException) as exc_info_student:
        await assert_can_manage_group_schedule(student, my_group, mock_session)
    assert exc_info_student.value.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.asyncio
async def test_router_create_schedule_pair() -> None:
    from backend.schedule.router import create_schedule_pair

    group_id = uuid.uuid4()
    elder = _user(role="elder", group_id=group_id)
    data = _sample_pair_create(group_id=group_id)

    mock_session = AsyncMock()
    mock_session.add = MagicMock()

    # When get_pair is called on loaded_pair
    mock_result = MagicMock()
    mock_pair = SchedulePair(
        id=uuid.uuid4(),
        group_id=group_id,
        day_of_week=data.day_of_week,
        pair_number=data.pair_number,
        start_time=data.start_time,
        end_time=data.end_time,
        week_parity=data.week_parity,
        subgroup=data.subgroup,
        subject=data.subject,
        lesson_type=data.lesson_type,
        is_online=False,
    )
    mock_result.scalar_one_or_none.return_value = mock_pair
    mock_session.execute.return_value = mock_result

    res = await create_schedule_pair(
        data=data, current_user=elder, session=mock_session
    )
    assert res.subject == "Базы данных"
    assert res.group_id == group_id


@pytest.mark.asyncio
async def test_router_update_and_delete_pair_not_found() -> None:
    from backend.schedule.router import delete_schedule_pair, update_schedule_pair

    admin = _user(role="admin")
    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_result

    random_id = uuid.uuid4()
    with pytest.raises(HTTPException) as exc_update:
        await update_schedule_pair(
            pair_id=random_id,
            data=SchedulePairUpdate(subject="Test"),
            current_user=admin,
            session=mock_session,
        )
    assert exc_update.value.status_code == status.HTTP_404_NOT_FOUND

    with pytest.raises(HTTPException) as exc_delete:
        await delete_schedule_pair(
            pair_id=random_id,
            current_user=admin,
            session=mock_session,
        )
    assert exc_delete.value.status_code == status.HTTP_404_NOT_FOUND
