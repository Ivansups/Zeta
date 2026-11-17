"""SQLAlchemy ORM models for schedule pairs."""

import enum
import uuid
from datetime import UTC, datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.db.base import Base


def utc_now() -> datetime:
    return datetime.now(UTC)


class WeekParityEnum(enum.StrEnum):
    NUMERATOR = "numerator"
    DENOMINATOR = "denominator"
    BOTH = "both"


class LessonTypeEnum(enum.StrEnum):
    LECTURE = "lecture"
    PRACTICE = "practice"
    LAB = "lab"
    SEMINAR = "seminar"
    OTHER = "other"


class SchedulePair(Base):
    """A single scheduled lesson slot assigned to a group and time."""

    __tablename__ = "schedule_pairs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    group_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("groups.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    # subgroup: 1, 2, or None (applies to whole group)
    subgroup: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    day_of_week: Mapped[str] = mapped_column(
        String(32), nullable=False, index=True
    )  # e.g. "Понедельник" or "monday"
    pair_number: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    start_time: Mapped[str] = mapped_column(String(8), nullable=False)
    end_time: Mapped[str] = mapped_column(String(8), nullable=False)
    week_parity: Mapped[str] = mapped_column(
        String(16), default=WeekParityEnum.BOTH.value, nullable=False
    )
    subject: Mapped[str] = mapped_column(String(256), nullable=False, index=True)
    subject_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    teacher: Mapped[str | None] = mapped_column(String(128), nullable=True)
    teacher_title: Mapped[str | None] = mapped_column(String(64), nullable=True)
    room: Mapped[str | None] = mapped_column(String(64), nullable=True)
    building: Mapped[str | None] = mapped_column(String(128), nullable=True)
    is_online: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    lesson_type: Mapped[str] = mapped_column(
        String(32), default=LessonTypeEnum.OTHER.value, nullable=False
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    group: Mapped["backend.auth.models.Group"] = relationship(  # type: ignore[name-defined] # noqa: F821
        "Group", backref="schedule_pairs"
    )

    __table_args__ = (
        UniqueConstraint(
            "group_id",
            "subgroup",
            "day_of_week",
            "pair_number",
            "week_parity",
            name="uq_schedule_pair_slot",
        ),
    )
