"""Storage and retrieval service for schedule pairs."""

import uuid
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.auth.models import Group
from backend.schedule.db_models import SchedulePair
from backend.schedule.models import ParsedLesson, WeekParity


class ScheduleStorageService:
    """Handles database persistence and queries for timetable pairs."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_or_create_group(
        self,
        group_name: str,
        faculty: str | None = None,
        university: str | None = None,
    ) -> Group:
        """Find an existing group by name or create a new one."""
        cleaned_name = group_name.strip()
        stmt = select(Group).where(Group.name == cleaned_name)
        result = await self.session.execute(stmt)
        group = result.scalar_one_or_none()
        if group is None:
            group = Group(
                name=cleaned_name,
                faculty=faculty,
                university=university,
            )
            self.session.add(group)
            await self.session.flush()
        return group

    async def save_parsed_schedule(
        self, parsed_lessons: list[ParsedLesson]
    ) -> dict[str, int]:
        """Save parsed lessons into database transactionally and idempotently.

        For each group present in the parsed lessons, existing schedule pairs are
        replaced with the newly parsed pairs.
        """
        if not parsed_lessons:
            return {"groups_processed": 0, "pairs_saved": 0}

        grouped: dict[str, list[ParsedLesson]] = {}
        for lesson in parsed_lessons:
            g_name = lesson.group.strip()
            grouped.setdefault(g_name, []).append(lesson)

        total_pairs_saved = 0
        groups_processed = 0

        for group_name, lessons in grouped.items():
            first = lessons[0]
            group = await self.get_or_create_group(
                group_name=group_name,
                faculty=first.direction,
                university=first.program,
            )
            groups_processed += 1

            await self.session.execute(
                delete(SchedulePair).where(SchedulePair.group_id == group.id)
            )

            seen_slots: set[tuple[Any, ...]] = set()
            for item in lessons:
                parity_val = (
                    item.week_parity.value
                    if isinstance(item.week_parity, WeekParity)
                    else str(item.week_parity)
                )
                slot_key = (
                    group.id,
                    item.day_of_week.strip(),
                    item.pair_number,
                    parity_val,
                    item.subgroup,
                    item.subject.strip(),
                )
                if slot_key in seen_slots:
                    continue
                seen_slots.add(slot_key)

                lesson_type_val = (
                    item.lesson_type.value
                    if hasattr(item.lesson_type, "value")
                    else str(item.lesson_type)
                )
                pair = SchedulePair(
                    group_id=group.id,
                    subgroup=item.subgroup,
                    day_of_week=item.day_of_week.strip(),
                    pair_number=item.pair_number,
                    start_time=item.start_time.strip(),
                    end_time=item.end_time.strip(),
                    week_parity=parity_val,
                    subject=item.subject.strip(),
                    subject_id=item.subject_id,
                    teacher=item.teacher,
                    teacher_title=item.teacher_title,
                    room=item.room,
                    is_online=item.is_online,
                    lesson_type=lesson_type_val,
                    notes=", ".join(item.notes) if item.notes else None,
                )
                self.session.add(pair)
                total_pairs_saved += 1

        await self.session.commit()
        return {
            "groups_processed": groups_processed,
            "pairs_saved": total_pairs_saved,
        }

    async def get_day_schedule(
        self,
        group_id: uuid.UUID | None = None,
        group_name: str | None = None,
        day_of_week: str | None = None,
        subgroup: int | None = None,
        week_parity: str | None = None,
    ) -> list[SchedulePair]:
        """Fetch schedule pairs for a given day with subgroup filtering."""
        stmt = select(SchedulePair).options(selectinload(SchedulePair.group))

        if group_id:
            stmt = stmt.where(SchedulePair.group_id == group_id)
        elif group_name:
            stmt = stmt.join(Group).where(Group.name == group_name.strip())

        if day_of_week:
            stmt = stmt.where(SchedulePair.day_of_week.ilike(day_of_week.strip()))

        if subgroup is not None:
            stmt = stmt.where(
                (SchedulePair.subgroup.is_(None)) | (SchedulePair.subgroup == subgroup)
            )

        if week_parity is not None:
            stmt = stmt.where(
                (SchedulePair.week_parity == "both")
                | (SchedulePair.week_parity == week_parity.lower())
            )

        stmt = stmt.order_by(
            SchedulePair.pair_number.asc(),
            SchedulePair.subgroup.nulls_first(),
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_week_schedule(
        self,
        group_id: uuid.UUID | None = None,
        group_name: str | None = None,
        subgroup: int | None = None,
        week_parity: str | None = None,
    ) -> list[SchedulePair]:
        """Fetch all schedule pairs for a week with subgroup filtering."""
        return await self.get_day_schedule(
            group_id=group_id,
            group_name=group_name,
            day_of_week=None,
            subgroup=subgroup,
            week_parity=week_parity,
        )
