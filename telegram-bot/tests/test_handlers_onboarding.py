from unittest.mock import AsyncMock, MagicMock

import pytest
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, Message, User
from pydantic import SecretStr

from telegram_bot.config import Settings
from telegram_bot.handlers.onboarding import (
    help_callback_handler,
    help_handler,
    start_handler,
    unknown_message_handler,
)


@pytest.fixture
def dummy_settings() -> Settings:
    return Settings(
        bot_token=SecretStr("123456:TEST"),
        web_app_url="https://test.zeta.local",
    )


@pytest.fixture
def mock_message() -> MagicMock:
    message = MagicMock(spec=Message)
    user = MagicMock(spec=User)
    user.full_name = "Иван Иванов"
    message.from_user = user
    message.answer = AsyncMock()
    return message


async def test_start_handler(mock_message: MagicMock, dummy_settings: Settings) -> None:
    await start_handler(mock_message, dummy_settings)

    mock_message.answer.assert_called_once()
    args, kwargs = mock_message.answer.call_args
    text = args[0] if args else kwargs.get("text", "")
    assert "Zeta" in text
    assert "Иван Иванов" in text

    reply_markup = kwargs.get("reply_markup")
    assert isinstance(reply_markup, InlineKeyboardMarkup)
    assert any(
        button.url == "https://test.zeta.local"
        for row in reply_markup.inline_keyboard
        for button in row
    )


async def test_help_handler(mock_message: MagicMock) -> None:
    await help_handler(mock_message)

    mock_message.answer.assert_called_once()
    args, kwargs = mock_message.answer.call_args
    text = args[0] if args else kwargs.get("text", "")
    assert "/start" in text
    assert "/help" in text


async def test_help_callback_handler(mock_message: MagicMock) -> None:
    callback = MagicMock(spec=CallbackQuery)
    callback.message = mock_message
    callback.answer = AsyncMock()

    await help_callback_handler(callback)

    callback.answer.assert_called_once()
    mock_message.answer.assert_called_once()
    args, kwargs = mock_message.answer.call_args
    text = args[0] if args else kwargs.get("text", "")
    assert "/start" in text
    assert "/help" in text


async def test_unknown_message_handler(mock_message: MagicMock) -> None:
    await unknown_message_handler(mock_message)

    mock_message.answer.assert_called_once()
    args, kwargs = mock_message.answer.call_args
    text = args[0] if args else kwargs.get("text", "")
    assert "не понимаю" in text.lower()
    assert "/help" in text
