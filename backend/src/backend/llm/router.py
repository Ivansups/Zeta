"""FastAPI router for LLM endpoints."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth.dependencies import get_settings, verify_internal_api_secret
from backend.auth.models import User
from backend.config import Settings
from backend.db.session import get_session
from backend.homework.models import Homework
from backend.llm.client import LangChainLLMClient
from backend.llm.prompts import build_student_qa_prompt

logger = logging.getLogger(__name__)


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
    settings: Annotated[Settings, Depends(get_settings)],
    _: Annotated[None, Depends(verify_internal_api_secret)],
) -> AskResponse:
    """Answer student questions about homework and schedule using LLM or structured context."""
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

    if settings.llm_api_key and settings.llm_api_key.get_secret_value().strip():
        try:
            llm_client = LangChainLLMClient.from_settings(settings)
            hw_context_lines = []
            for item in items:
                subgroup_str = (
                    f" (подгруппа {item.subgroup})" if item.subgroup else " (вся группа)"
                )
                deadline_str = f", дедлайн: {item.deadline}" if item.deadline else ""
                hw_context_lines.append(
                    f"- {item.subject}{subgroup_str}: {item.description}{deadline_str}"
                )

            hw_context = (
                "\n".join(hw_context_lines)
                if hw_context_lines
                else "Нет актуальных домашних заданий."
            )

            prompt = build_student_qa_prompt(question=payload.question, context=hw_context)
            llm_answer = await llm_client.ainvoke_text(prompt)
            return AskResponse(answer=llm_answer.strip(), items=items)
        except Exception as err:
            logger.warning("LLM generation failed, falling back to heuristic: %s", err)

    if not items:
        return AskResponse(
            answer="На ближайшие дни заданий для твоей группы не найдено! 🎉",
            items=[],
        )

    answer_text = (
        f"Найдено актуальных заданий: {len(items)}. Подробности в списке ниже:"
    )
    return AskResponse(answer=answer_text, items=items)
