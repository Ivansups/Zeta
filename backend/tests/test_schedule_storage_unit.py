"""Unit tests for ScheduleStorageService with mocked database session."""

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from backend.auth.models import Group
from backend.schedule.db_models import SchedulePair
from backend.schedule.models import LessonType, ParsedLesson, WeekParity
from backend.schedule.service import ScheduleStorageService


def _sample_lesson(group: str = "БПИ-211") -> ParsedLesson:
    return ParsedLesson(
        course=2,
        direction="09.03.01",
        program="Программная инженерия",
        group=group,
        subgroup=1,
        day_of_week="Понедельник",
        pair_number=1,
        start_time="09:00",
        end_time="10:30",
        week_parity=WeekParity.NUMERATOR,
        subject="Математический анализ",
        subject_id="math-101",
        teacher="Иванов И.И.",
        teacher_title="проф.",
        room="101",
        is_online=False,
        lesson_type=LessonType.LECTURE,
        notes=["ДО"],
    )


@pytest.mark.asyncio
async def test_storage_service_get_or_create_existing_group() -> None:
    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    existing_group = Group(id=uuid.uuid4(), name="БПИ-211")
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = existing_group
    mock_session.execute.return_value = mock_result

    service = ScheduleStorageService(session=mock_session)
    group = await service.get_or_create_group("БПИ-211")

    assert group == existing_group
    mock_session.add.assert_not_called()


@pytest.mark.asyncio
async def test_storage_service_get_or_create_new_group() -> None:
    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_result

    service = ScheduleStorageService(session=mock_session)
    group = await service.get_or_create_group("Новая Группа")

    assert group.name == "Новая Группа"
    mock_session.add.assert_called_once()
    mock_session.flush.assert_awaited_once()


@pytest.mark.asyncio
async def test_storage_service_save_parsed_schedule_idempotent() -> None:
    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    test_group = Group(id=uuid.uuid4(), name="БПИ-211")
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = test_group
    mock_session.execute.return_value = mock_result

    service = ScheduleStorageService(session=mock_session)
    lesson = _sample_lesson("БПИ-211")
    # Duplicate same slot
    stats = await service.save_parsed_schedule([lesson, lesson])

    assert stats["groups_processed"] == 1
    assert stats["pairs_saved"] == 1  # Deduplicated slot
    mock_session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_storage_service_get_day_schedule_filters() -> None:
    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    mock_pair = SchedulePair(
        id=uuid.uuid4(),
        group_id=uuid.uuid4(),
        subgroup=1,
        day_of_week="Понедельник",
        pair_number=1,
        start_time="09:00",
        end_time="10:30",
        week_parity="numerator",
        subject="Математический анализ",
    )
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [mock_pair]
    mock_session.execute.return_value = mock_result

    service = ScheduleStorageService(session=mock_session)
    pairs = await service.get_day_schedule(
        group_name="БПИ-211",
        day_of_week="Понедельник",
        subgroup=1,
    )

    assert len(pairs) == 1
    assert pairs[0].subject == "Математический анализ"
