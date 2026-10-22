"""Homework list service for student questions.

# banan: контракт для получения списка ДЗ не найден (в backend есть только
# GET /health). Возвращается фиктивная сводка, пока контракт не согласован.
"""

from __future__ import annotations


class QuestionsService:
    async def get_homework_summary(self) -> str:
        return "На неделю задано: Матан (параграф 5), История (эссе)"  # noqa: RUF001
