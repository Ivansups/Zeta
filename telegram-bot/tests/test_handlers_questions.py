from datetime import UTC, datetime
from typing import cast
from unittest.mock import AsyncMock, MagicMock

import pytest
from aiogram.enums import ChatAction
from aiogram.types import Message, User
from pydantic import SecretStr

from telegram_bot.api_models import AskResponse, HomeworkItem
from telegram_bot.client import BackendAPIError, BackendClient, BackendClientError
from telegram_bot.config import Settings
from telegram_bot.handlers.questions import looks_like_question, question_handler
from telegram_bot.throttle import QuestionThrottle


class FakeClock:
    def __init__(self) -> None:
        self.now = 100.0

    def __call__(self) -> float:
        return self.now


@pytest.fixture
def message() -> MagicMock:
    msg = MagicMock(spec=Message)
    user = MagicMock(spec=User)
    user.id = 42
    user.full_name = "Студент"
    msg.from_user = user
    msg.text = "что задали по физике?"
    msg.chat = MagicMock()
    msg.chat.id = 99
    msg.answer = AsyncMock()
    return msg


@pytest.fixture
def backend() -> MagicMock:
    client = MagicMock(spec=BackendClient)
    client.ask_question = AsyncMock(
        return_value=AskResponse(
            answer="Вот задания.",
            items=[
                HomeworkItem(
                    subject="Физика",
                    description="Лаба 3",
                    deadline=datetime(2026, 11, 19, 23, 59, tzinfo=UTC),
                )
            ],
        )
    )
    return client


@pytest.fixture
def bot() -> MagicMock:
    mocked_bot = MagicMock()
    mocked_bot.send_chat_action = AsyncMock()
    return mocked_bot


@pytest.mark.parametrize(
    "text",
    [
        "что задали на неделю?",
        "какие дедлайны",
        "Когда лаба по физике",
        "сколько заданий осталось",
        "задали что-то по матану",
    ],
)
def test_looks_like_question_true(text: str) -> None:
    assert looks_like_question(text) is True


@pytest.mark.parametrize(
    "text", ["привет", "/start", "ДЗ матан: номер 12", "", "  ", None]
)
def test_looks_like_question_false(text: str | None) -> None:
    assert looks_like_question(text) is False


async def test_question_handler_answers_with_formatted_items(
    message: MagicMock,
    backend: MagicMock,
    bot: MagicMock,
) -> None:
    throttle = QuestionThrottle(interval=5.0)

    await question_handler(message, cast(BackendClient, backend), throttle, bot)

    backend.ask_question.assert_awaited_once_with(42, "что задали по физике?")
    bot.send_chat_action.assert_awaited_once_with(chat_id=99, action=ChatAction.TYPING)
    message.answer.assert_awaited_once()
    text = message.answer.call_args.args[0]
    assert "Вот задания." in text
    assert "Физика" in text
    assert "19.11.2026" in text


async def test_question_handler_throttles_repeated_requests(
    message: MagicMock,
    backend: MagicMock,
    bot: MagicMock,
) -> None:
    clock = FakeClock()
    throttle = QuestionThrottle(interval=5.0, clock=clock)

    await question_handler(message, cast(BackendClient, backend), throttle, bot)
    await question_handler(message, cast(BackendClient, backend), throttle, bot)

    backend.ask_question.assert_awaited_once()
    second_text = message.answer.call_args.args[0]
    assert "Слишком часто" in second_text


async def test_question_handler_reports_unbound_student(
    message: MagicMock,
    backend: MagicMock,
    bot: MagicMock,
) -> None:
    backend.ask_question.side_effect = BackendAPIError(404, "not bound")
    throttle = QuestionThrottle(interval=5.0)

    await question_handler(message, cast(BackendClient, backend), throttle, bot)

    text = message.answer.call_args.args[0]
    assert "групп" in text


async def test_question_handler_reports_backend_outage(
    message: MagicMock,
    backend: MagicMock,
    bot: MagicMock,
) -> None:
    backend.ask_question.side_effect = BackendClientError("unavailable")
    throttle = QuestionThrottle(interval=5.0)

    await question_handler(message, cast(BackendClient, backend), throttle, bot)

    text = message.answer.call_args.args[0]
    assert "недоступ" in text.lower()


def test_settings_has_question_throttle() -> None:
    settings = Settings(bot_token=SecretStr("123456:TEST"))
    assert settings.question_throttle_seconds > 0


async def test_question_handler_reports_closed_beta(
    message: MagicMock,
    backend: MagicMock,
    bot: MagicMock,
) -> None:
    backend.ask_question.side_effect = BackendAPIError(403, "closed beta")
    throttle = QuestionThrottle(interval=5.0)

    await question_handler(message, cast(BackendClient, backend), throttle, bot)

    text = message.answer.call_args.args[0]
    assert "закрыт" in text.lower()
