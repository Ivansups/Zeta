"""Pydantic schemas for homework assignments."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class HomeworkParticipantRead(BaseModel):
    """Information about an assigned homework participant."""

    model_config = ConfigDict(from_attributes=True)

    user_id: uuid.UUID
    display_name: str | None = None
    is_submitted: bool = False
    submitted_at: datetime | None = None


class HomeworkParticipantStatusUpdate(BaseModel):
    """Payload for elder to mark participant submission status."""

    is_submitted: bool


class HomeworkCompletionResponse(BaseModel):
    """Personal completion toggle outcome."""

    homework_id: uuid.UUID
    is_completed: bool
    completed_at: datetime | None = None


class HomeworkModerateRequest(BaseModel):
    """Payload to approve or reject a crowdsourced homework proposal."""

    action: str  # "approve" | "reject"
    moderation_comment: str | None = None
    title: str | None = Field(default=None, min_length=1, max_length=256)
    description: str | None = Field(default=None, min_length=1)
    deadline: datetime | None = None
    subject: str | None = Field(default=None, max_length=256)
    subgroup: int | None = Field(default=None, ge=1, le=2)
    target_type: str | None = None
    participant_ids: list[uuid.UUID] | None = None


class HomeworkCreate(BaseModel):
    """Payload to create a new homework assignment."""

    title: str = Field(..., min_length=1, max_length=256)
    description: str = Field(..., min_length=1)
    deadline: datetime | None = None
    group_id: uuid.UUID | None = None
    schedule_pair_id: uuid.UUID | None = None
    subgroup: int | None = Field(default=None, ge=1, le=2)
    subject: str | None = Field(default=None, max_length=256)
    is_personal: bool = True
    target_type: str = "all"
    participant_ids: list[uuid.UUID] = Field(default_factory=list)


class HomeworkUpdate(BaseModel):
    """Payload to update an existing homework assignment."""

    title: str | None = Field(default=None, min_length=1, max_length=256)
    description: str | None = Field(default=None, min_length=1)
    deadline: datetime | None = None
    schedule_pair_id: uuid.UUID | None = None
    subgroup: int | None = Field(default=None, ge=1, le=2)
    subject: str | None = Field(default=None, max_length=256)
    is_personal: bool | None = None
    target_type: str | None = None
    participant_ids: list[uuid.UUID] | None = None


class HomeworkRead(BaseModel):
    """Schema representing a homework assignment returned to clients."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    group_id: uuid.UUID | None = None
    group_name: str | None = None
    schedule_pair_id: uuid.UUID | None = None
    subgroup: int | None = None
    title: str
    description: str
    subject: str | None = None
    deadline: datetime | None = None
    is_personal: bool = False
    status: str = "approved"
    target_type: str = "all"
    moderation_comment: str | None = None
    approved_by_id: uuid.UUID | None = None
    edited_by_id: uuid.UUID | None = None
    submitted_to_group_at: datetime | None = None
    is_completed: bool = False
    participants: list[HomeworkParticipantRead] = Field(default_factory=list)
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
