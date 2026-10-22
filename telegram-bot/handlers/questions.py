"""Handlers for student questions about homework.

# banan: контракт для получения списка ДЗ не найден, сводка берётся из
# заглушки services.questions.
"""

from __future__ import annotations

import re

from aiogram import Router
from aiogram.filters import BaseFilter, StateFilter
from aiogram.types import Message
from services.questions import QuestionsService

router = Router()
questions_service = QuestionsService()

QUESTION_PATTERN = re.compile(
    r"что\s+(задали|задано)"
    r"|каки[ех]\s+(дз|домаш)"  # noqa: RUF001
    r"|какое\s+дз"
    r"|домашн\w*\s+задани",
    re.IGNORECASE,
)


class IsHomeworkQuestion(BaseFilter):
    async def __call__(self, message: Message) -> bool:
        text = message.text
        return text is not None and QUESTION_PATTERN.search(text) is not None


@router.message(StateFilter(None), IsHomeworkQuestion())
async def questions_handler(message: Message) -> None:
    summary = await questions_service.get_homework_summary()
    await message.answer(summary)
