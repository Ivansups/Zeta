"""Pydantic schemas for schedule API responses."""

import uuid
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class SchedulePairCreate(BaseModel):
    """Payload to create a new timetable slot."""

    group_id: uuid.UUID | None = None
    day_of_week: str
    pair_number: int = Field(ge=1, le=10)
    start_time: str
    end_time: str
    week_parity: str = "both"
    subgroup: int | None = None
    subject: str
    subject_id: str | None = None
    teacher: str | None = None
    teacher_title: str | None = None
    room: str | None = None
    building: str | None = None
    is_online: bool = False
    lesson_type: str = "other"
    notes: list[str] = Field(default_factory=list)


class SchedulePairUpdate(BaseModel):
    """Payload to partially update an existing timetable slot."""

    day_of_week: str | None = None
    pair_number: int | None = Field(default=None, ge=1, le=10)
    start_time: str | None = None
    end_time: str | None = None
    week_parity: str | None = None
    subgroup: int | None = None
    subject: str | None = None
    subject_id: str | None = None
    teacher: str | None = None
    teacher_title: str | None = None
    room: str | None = None
    building: str | None = None
    is_online: bool | None = None
    lesson_type: str | None = None
    notes: list[str] | None = None


class SchedulePairRead(BaseModel):
    """Schema representing a saved schedule pair returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    group_id: uuid.UUID
    group_name: str | None = None
    subgroup: int | None = None
    day_of_week: str
    pair_number: int
    start_time: str
    end_time: str
    week_parity: str
    subject: str
    subject_id: str | None = None
    teacher: str | None = None
    teacher_title: str | None = None
    room: str | None = None
    is_online: bool = False
    lesson_type: str = "other"
    notes: list[str] = Field(default_factory=list)


class ScheduleImportResponse(BaseModel):
    """Response after parsing and importing schedule into database."""

    status: str = "ok"
    groups_processed: int
    pairs_saved: int
    parse_stats: dict[str, Any] = Field(default_factory=dict)
