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


class HomeworkParseRequest(BaseModel):
    telegram_id: int
    text: str


class HomeworkParsePreviewRequest(BaseModel):
    """Free-form text submitted from the web editor for parsing."""

    text: str = Field(..., min_length=1)


class HomeworkParsePreview(BaseModel):
    """Parsed homework fields shown to the user before saving."""

    subject: str
    description: str
    deadline: datetime | None = None
    subgroup: int | None = None


class HomeworkDraftResponse(BaseModel):
    draft_id: str
    subject: str
    description: str
    deadline: datetime | None = None
    pair_number: int | None = None
    subgroup: int | None = None


class HomeworkConfirmRequest(BaseModel):
    telegram_id: int
    draft_id: str


class ConfirmedHomeworkResponse(BaseModel):
    id: str
    subject: str
    description: str = ""
    deadline: datetime | None = None
    pair_number: int | None = None
    subgroup: int | None = None


class HomeworkCancelRequest(BaseModel):
    telegram_id: int
    draft_id: str


class CancelDraftResponse(BaseModel):
    status: str = "ok"
    draft_id: str
