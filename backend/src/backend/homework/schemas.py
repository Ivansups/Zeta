"""Pydantic schemas for homework assignments."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class HomeworkCreate(BaseModel):
    """Payload to create a new homework assignment."""

    title: str = Field(..., min_length=1, max_length=256)
    description: str = Field(..., min_length=1)
    deadline: datetime
    group_id: uuid.UUID | None = None
    schedule_pair_id: uuid.UUID | None = None
    subgroup: int | None = Field(default=None, ge=1, le=2)
    subject: str | None = Field(default=None, max_length=256)


class HomeworkUpdate(BaseModel):
    """Payload to update an existing homework assignment."""

    title: str | None = Field(default=None, min_length=1, max_length=256)
    description: str | None = Field(default=None, min_length=1)
    deadline: datetime | None = None
    schedule_pair_id: uuid.UUID | None = None
    subgroup: int | None = Field(default=None, ge=1, le=2)
    subject: str | None = Field(default=None, max_length=256)


class HomeworkRead(BaseModel):
    """Schema representing a homework assignment returned to clients."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    group_id: uuid.UUID
    group_name: str | None = None
    schedule_pair_id: uuid.UUID | None = None
    subgroup: int | None = None
    title: str
    description: str
    subject: str | None = None
    deadline: datetime
    created_by_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime
