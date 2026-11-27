"""SQLAlchemy ORM model for homework assignments and drafts."""

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

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

if TYPE_CHECKING:
    from backend.auth.models import Group, User
    from backend.schedule.db_models import SchedulePair


def utc_now() -> datetime:
    return datetime.now(UTC)


class Homework(Base):
    """Homework task associated with a group, optional schedule pair and deadline."""

    __tablename__ = "homeworks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    group_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("groups.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )
    schedule_pair_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("schedule_pairs.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    subgroup: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    subject: Mapped[str | None] = mapped_column(String(256), nullable=True)
    deadline: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), index=True, nullable=True
    )
    is_personal: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(
        String(32), default="approved", nullable=False, index=True
    )
    target_type: Mapped[str] = mapped_column(String(32), default="all", nullable=False)
    moderation_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    approved_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    edited_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    submitted_to_group_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    group: Mapped["Group | None"] = relationship("Group", backref="homeworks")
    schedule_pair: Mapped["SchedulePair | None"] = relationship(
        "SchedulePair", backref="homeworks"
    )
    created_by: Mapped["User | None"] = relationship(
        "User", foreign_keys=[created_by_id]
    )
    approved_by: Mapped["User | None"] = relationship(
        "User", foreign_keys=[approved_by_id]
    )
    edited_by: Mapped["User | None"] = relationship("User", foreign_keys=[edited_by_id])
    participants: Mapped[list["HomeworkParticipant"]] = relationship(
        "HomeworkParticipant", back_populates="homework", cascade="all, delete-orphan"
    )
    completions: Mapped[list["HomeworkCompletion"]] = relationship(
        "HomeworkCompletion", back_populates="homework", cascade="all, delete-orphan"
    )


class HomeworkParticipant(Base):
    """Assigned participant for a homework task with submission tracking."""

    __tablename__ = "homework_participants"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    homework_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("homeworks.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    is_submitted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    submitted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    marked_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    homework: Mapped["Homework"] = relationship(
        "Homework", back_populates="participants"
    )
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    marked_by: Mapped["User | None"] = relationship("User", foreign_keys=[marked_by_id])

    __table_args__ = (
        UniqueConstraint("homework_id", "user_id", name="uq_homework_participant"),
    )


class HomeworkCompletion(Base):
    """Personal completion mark of a homework assignment by a student."""

    __tablename__ = "homework_completions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    homework_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("homeworks.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    homework: Mapped["Homework"] = relationship(
        "Homework", back_populates="completions"
    )
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])

    __table_args__ = (
        UniqueConstraint("homework_id", "user_id", name="uq_homework_user_completion"),
    )


class HomeworkDraft(Base):
    """Temporary structured homework draft parsed from bot and stored in DB."""

    __tablename__ = "homework_drafts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    group_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("groups.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    subject: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    subgroup: Mapped[int | None] = mapped_column(Integer, nullable=True)
    deadline: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True, nullable=False
    )
