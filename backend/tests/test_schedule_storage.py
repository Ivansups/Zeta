"""Unit tests for ScheduleStorageService (saving, idempotency, subgroup filtering)."""

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth.models import Group
from backend.schedule.db_models import SchedulePair
from backend.schedule.models import LessonType, ParsedLesson, WeekParity
from backend.schedule.service import ScheduleStorageService


def _sample_lessons(group: str = "БПИ-211") -> list[ParsedLesson]:
    return [
        ParsedLesson(
            course=2,
            direction="09.03.01",
            program="Программная инженерия",
            group=group,
            subgroup=None,  # Lecture for both subgroups
            day_of_week="Понедельник",
            pair_number=1,
            start_time="09:00",
            end_time="10:30",
            week_parity=WeekParity.BOTH,
            subject="Математический анализ",
            subject_id="math-101",
            teacher="Иванов И.И.",
            teacher_title="проф.",
            room="101",
            is_online=False,
            lesson_type=LessonType.LECTURE,
            notes=["общая лекция"],
        ),
        ParsedLesson(
            course=2,
            direction="09.03.01",
            program="Программная инженерия",
            group=group,
            subgroup=1,  # Lab for subgroup 1 only
            day_of_week="Понедельник",
            pair_number=2,
            start_time="10:40",
            end_time="12:10",
            week_parity=WeekParity.NUMERATOR,
            subject="Программирование",
            subject_id="cs-102",
            teacher="Петров П.П.",
            teacher_title="доц.",
            room="204",
            is_online=False,
            lesson_type=LessonType.LAB,
            notes=["подгруппа 1"],
        ),
        ParsedLesson(
            course=2,
            direction="09.03.01",
            program="Программная инженерия",
            group=group,
            subgroup=2,  # Lab for subgroup 2 only
            day_of_week="Понедельник",
            pair_number=2,
            start_time="10:40",
            end_time="12:10",
            week_parity=WeekParity.DENOMINATOR,
            subject="Программирование",
            subject_id="cs-102",
            teacher="Петров П.П.",
            teacher_title="доц.",
            room="204",
            is_online=False,
            lesson_type=LessonType.LAB,
            notes=["подгруппа 2"],
        ),
        ParsedLesson(
            course=2,
            direction="09.03.01",
            program="Программная инженерия",
            group=group,
            subgroup=None,
            day_of_week="Вторник",
            pair_number=1,
            start_time="09:00",
            end_time="10:30",
            week_parity=WeekParity.BOTH,
            subject="Философия",
            subject_id="phil-201",
            teacher="Сидорова С.С.",
            teacher_title="доц.",
            room="305",
            is_online=True,
            lesson_type=LessonType.SEMINAR,
            notes=["ДО"],
        ),
    ]


@pytest.mark.asyncio
async def test_save_parsed_schedule_creates_group_and_pairs(
    db_session: AsyncSession,
) -> None:
    """Parsed lessons are saved transactionally and create the group."""
    service = ScheduleStorageService(session=db_session)
    lessons = _sample_lessons(group="БПИ-211")

    stats = await service.save_parsed_schedule(lessons)
    assert stats["groups_processed"] == 1
    assert stats["pairs_saved"] == 4

    # Verify group was created
    stmt = select(Group).where(Group.name == "БПИ-211")
    res = await db_session.execute(stmt)
    group = res.scalar_one_or_none()
    assert group is not None
    assert group.name == "БПИ-211"

    # Verify pairs in DB
    pairs_stmt = select(SchedulePair).where(SchedulePair.group_id == group.id)
    pairs_res = await db_session.execute(pairs_stmt)
    pairs = list(pairs_res.scalars().all())
    assert len(pairs) == 4


@pytest.mark.asyncio
async def test_save_parsed_schedule_is_idempotent(
    db_session: AsyncSession,
) -> None:
    """Repeated save of the same schedule does not duplicate pairs."""
    service = ScheduleStorageService(session=db_session)
    lessons = _sample_lessons(group="БПИ-211")

    # Run 1
    stats1 = await service.save_parsed_schedule(lessons)
    assert stats1["pairs_saved"] == 4

    # Run 2
    stats2 = await service.save_parsed_schedule(lessons)
    assert stats2["pairs_saved"] == 4

    # Total in DB must remain 4
    stmt = select(SchedulePair)
    res = await db_session.execute(stmt)
    pairs = list(res.scalars().all())
    assert len(pairs) == 4


@pytest.mark.asyncio
async def test_subgroup_filtering_returns_common_and_specific_pairs(
    db_session: AsyncSession,
) -> None:
    """Student of subgroup 1 sees common lecture + subgroup 1 lab."""
    service = ScheduleStorageService(session=db_session)
    lessons = _sample_lessons(group="БПИ-211")
    await service.save_parsed_schedule(lessons)

    # Subgroup 1 query for Monday
    sg1_pairs = await service.get_day_schedule(
        group_name="БПИ-211",
        day_of_week="Понедельник",
        subgroup=1,
    )
    assert len(sg1_pairs) == 2
    subjects1 = [p.subject for p in sg1_pairs]
    assert "Математический анализ" in subjects1  # common
    assert "Программирование" in subjects1  # subgroup 1

    # Subgroup 2 query for Monday
    sg2_pairs = await service.get_day_schedule(
        group_name="БПИ-211",
        day_of_week="Понедельник",
        subgroup=2,
    )
    assert len(sg2_pairs) == 2
    for p in sg2_pairs:
        if p.subject == "Программирование":
            assert p.subgroup == 2

    # All subgroups query
    all_pairs = await service.get_day_schedule(
        group_name="БПИ-211",
        day_of_week="Понедельник",
        subgroup=None,
    )
    assert len(all_pairs) == 3


@pytest.mark.asyncio
async def test_week_schedule_retrieves_all_days(
    db_session: AsyncSession,
) -> None:
    """Weekly schedule returns all days ordered by pair number."""
    service = ScheduleStorageService(session=db_session)
    lessons = _sample_lessons(group="БПИ-211")
    await service.save_parsed_schedule(lessons)

    week = await service.get_week_schedule(group_name="БПИ-211")
    assert len(week) == 4
    days = {p.day_of_week for p in week}
    assert days == {"Понедельник", "Вторник"}
