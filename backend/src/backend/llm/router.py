"""FastAPI router for LLM endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth.models import User
from backend.db.session import get_session
from backend.homework.models import Homework


class AskRequest(BaseModel):
    telegram_id: int
    question: str


class HomeworkItemResponse(BaseModel):
    subject: str
    description: str
    deadline: str | None = None
    subgroup: int | None = None


class AskResponse(BaseModel):
    answer: str
    items: list[HomeworkItemResponse] = Field(default_factory=list)


router = APIRouter(prefix="/llm", tags=["llm"])


@router.post("/ask", response_model=AskResponse)
async def ask_llm(
    payload: AskRequest,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> AskResponse:
    """Answer student questions about homework and schedule."""
    stmt = select(User).where(User.telegram_id == payload.telegram_id)
    res = await session.execute(stmt)
    user = res.scalar_one_or_none()

    if user is None:
        return AskResponse(
            answer=(
                "Привет! Ты пока не привязал Telegram к учебной группе в Zeta. "
                "Открой веб-кабинет для настройки."
            ),
            items=[],
        )

    if not user.group_id:
        return AskResponse(
            answer=(
                "У тебя пока не выбрана учебная группа. Укажи её в настройках профиля."
            ),
            items=[],
        )

    hw_stmt = (
        select(Homework)
        .where(Homework.group_id == user.group_id)
        .order_by(Homework.deadline.asc())
        .limit(10)
    )
    hw_res = await session.execute(hw_stmt)
    homeworks = hw_res.scalars().all()

    items = [
        HomeworkItemResponse(
            subject=hw.subject or hw.title,
            description=hw.description,
            deadline=hw.deadline.strftime("%d.%m.%Y %H:%M") if hw.deadline else None,
            subgroup=hw.subgroup,
        )
        for hw in homeworks
    ]

    if not items:
        return AskResponse(
            answer="На ближайшие дни заданий для твоей группы не найдено! 🎉",
            items=[],
        )

    answer_text = (
        f"Найдено актуальных заданий: {len(items)}. Подробности в списке ниже:"
    )
    return AskResponse(answer=answer_text, items=items)
