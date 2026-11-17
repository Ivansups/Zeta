"""Typed payloads exchanged with the Zeta backend API."""

from datetime import datetime

from pydantic import BaseModel, Field


class BotUser(BaseModel):
    """Telegram user profile resolved by the backend for bot requests."""

    telegram_id: int
    role: str
    group_id: str | None = None
    subgroup: int | None = None


class HomeworkDraft(BaseModel):
    """Structured homework draft parsed from free-form text."""

    draft_id: str
    subject: str
    description: str
    deadline: datetime | None = None
    pair_number: int | None = None
    subgroup: int | None = None


class ConfirmedHomework(BaseModel):
    """Homework persisted after the user confirmed the draft."""

    id: str
    subject: str
    description: str = ""
    deadline: datetime | None = None
    pair_number: int | None = None
    subgroup: int | None = None


class HomeworkItem(BaseModel):
    """Single homework entry returned by the question-answering endpoint."""

    subject: str
    description: str
    deadline: datetime | None = None
    subgroup: int | None = None


class AskResponse(BaseModel):
    """Answer to a student question with optional structured homework items."""

    answer: str
    items: list[HomeworkItem] = Field(default_factory=list)
