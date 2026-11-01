import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    telegram_id: int
    role: str
    group_id: uuid.UUID | None = None
    subgroup_number: int | None = None
    display_name: str | None = None
    username: str | None = None
    photo_url: str | None = None
    created_at: datetime


class GroupResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    faculty: str | None = None
    university: str | None = None
    created_at: datetime


class GroupCreateRequest(BaseModel):
    name: str = Field(
        ...,
        min_length=2,
        max_length=64,
        description="Название группы, например IU5-11B",
    )
    faculty: str | None = Field(None, max_length=128)
    university: str | None = Field(None, max_length=128)


class TelegramWidgetAuthRequest(BaseModel):
    id: int
    first_name: str | None = None
    last_name: str | None = None
    username: str | None = None
    photo_url: str | None = None
    auth_date: int
    hash: str
    invite_token: str | None = None


class TelegramWebAppAuthRequest(BaseModel):
    init_data: str
    invite_token: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"  # noqa: S105
    user: UserResponse


class ElderInviteCreateRequest(BaseModel):
    group_name: str = Field(..., min_length=2, max_length=64)


class StudentInviteCreateRequest(BaseModel):
    subgroup_number: int = Field(..., ge=1, le=2)


class RoleInviteCreateRequest(BaseModel):
    role: str = Field(..., pattern="^(helper|curator)$")


class InviteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    invite_url: str = ""
    token: str | None = None
    role: str
    group_id: uuid.UUID | None = None
    group_name: str | None = None
    subgroup_number: int | None = None
    is_single_use: bool
    is_revoked: bool
    activations_count: int
    created_at: datetime
