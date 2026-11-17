"""Pydantic schemas for schedule API responses."""

import uuid
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


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
