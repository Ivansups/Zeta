from unittest.mock import AsyncMock, patch

import pytest
from aiogram.types import Message
from handlers.questions import IsHomeworkQuestion, questions_handler
from services.questions import QuestionsService


@pytest.mark.parametrize(
    "text",
    [
        "что задали на неделю",
        "Что задали на завтра?",
        "какие ДЗ на завтра",
        "какое дз по матану",
        "какие домашние задания",
        "домашнее задание на неделю",
    ],
)
@pytest.mark.asyncio
async def test_filter_matches_homework_questions(text: str) -> None:
    message = AsyncMock(spec=Message)
    message.text = text

    assert await IsHomeworkQuestion()(message) is True


@pytest.mark.parametrize(
    "text",
    ["привет", "как дела", "ДЗ матан: параграф 5", None],
)
@pytest.mark.asyncio
async def test_filter_ignores_other_text(text: str | None) -> None:
    message = AsyncMock(spec=Message)
    message.text = text

    assert await IsHomeworkQuestion()(message) is False


@pytest.mark.asyncio
async def test_handler_answers_with_summary() -> None:
    summary = "На неделю задано: Матан (параграф 5), История (эссе)"  # noqa: RUF001
    message = AsyncMock(spec=Message)
    message.text = "что задали на неделю"
    message.answer = AsyncMock()

    with patch(
        "handlers.questions.questions_service.get_homework_summary",
        new=AsyncMock(return_value=summary),
    ) as summary_mock:
        await questions_handler(message)

    summary_mock.assert_awaited_once()
    message.answer.assert_awaited_once_with(summary)


@pytest.mark.asyncio
async def test_service_returns_stub_summary() -> None:
    result = await QuestionsService().get_homework_summary()

    assert "Матан" in result
    assert "История" in result
