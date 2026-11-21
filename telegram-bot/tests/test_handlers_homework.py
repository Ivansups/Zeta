from typing import Any, cast
from unittest.mock import AsyncMock, MagicMock

import pytest
from aiogram.fsm.context import FSMContext
from aiogram.types import InlineKeyboardMarkup, Message, User
from pydantic import SecretStr

from telegram_bot.api_models import BotUser, ConfirmedHomework, HomeworkDraft
from telegram_bot.client import BackendAPIError, BackendClient
from telegram_bot.config import Settings
from telegram_bot.handlers import homework as homework_module
from telegram_bot.handlers.homework import (
    draft_callback_handler,
    edit_text_handler,
    homework_text_handler,
)
from telegram_bot.states import HomeworkDraftStates


class FakeState:
    def __init__(self) -> None:
        self.state: str | None = None
        self.data: dict[str, Any] = {}

    async def set_state(self, state: Any = None) -> None:
        self.state = None if state is None else str(state.state)

    async def get_state(self) -> str | None:
        return self.state

    async def set_data(self, data: dict[str, Any]) -> None:
        self.data = dict(data)

    async def get_data(self) -> dict[str, Any]:
        return dict(self.data)

    async def update_data(
        self, data: dict[str, Any] | None = None, **kwargs: Any
    ) -> dict[str, Any]:
        if data:
            self.data.update(data)
        self.data.update(kwargs)
        return dict(self.data)

    async def clear(self) -> None:
        self.state = None
        self.data = {}


@pytest.fixture(autouse=True)
def disable_expiry_scheduler(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        homework_module, "_schedule_expiry", lambda *args, **kwargs: None
    )


@pytest.fixture
def settings() -> Settings:
    return Settings(
        bot_token=SecretStr("123456:TEST"),
        draft_ttl_seconds=900,
    )


@pytest.fixture
def message() -> MagicMock:
    msg = MagicMock(spec=Message)
    user = MagicMock(spec=User)
    user.id = 42
    user.full_name = "Даниил"
    msg.from_user = user
    msg.text = "ДЗ матан: номер 12 к среде"
    msg.chat = MagicMock()
    msg.chat.id = 99
    msg.answer = AsyncMock()
    msg.edit_text = AsyncMock()
    return msg


@pytest.fixture
def backend() -> MagicMock:
    client = MagicMock(spec=BackendClient)
    client.get_telegram_user = AsyncMock(
        return_value=BotUser(telegram_id=42, role="elder")
    )
    client.parse_homework_draft = AsyncMock(
        return_value=HomeworkDraft(
            draft_id="draft-1",
            subject="Матан",
            description="Номер 12",
            pair_number=2,
            subgroup=1,
        )
    )
    client.confirm_homework_draft = AsyncMock(
        return_value=ConfirmedHomework(
            id="hw-1",
            subject="Матан",
            description="Номер 12",
            pair_number=2,
        )
    )
    return client


@pytest.fixture
def bot() -> MagicMock:
    mocked_bot = MagicMock()
    mocked_bot.send_message = AsyncMock()
    return mocked_bot


def _callbacks(markup: InlineKeyboardMarkup) -> list[str]:
    return [
        button.callback_data or "" for row in markup.inline_keyboard for button in row
    ]


async def test_homework_text_handler_shows_draft_card(
    message: MagicMock,
    backend: MagicMock,
    settings: Settings,
    bot: MagicMock,
) -> None:
    state = FakeState()

    await homework_text_handler(
        message, cast(FSMContext, state), cast(BackendClient, backend), settings, bot
    )

    backend.get_telegram_user.assert_awaited_once_with(42)
    backend.parse_homework_draft.assert_awaited_once_with(
        42, "ДЗ матан: номер 12 к среде"
    )
    message.answer.assert_awaited_once()
    text = message.answer.call_args.args[0]
    assert "Черновик" in text
    assert "Матан" in text
    markup = message.answer.call_args.kwargs["reply_markup"]
    assert isinstance(markup, InlineKeyboardMarkup)
    callbacks = _callbacks(markup)
    assert "draft:confirm:draft-1" in callbacks
    assert "draft:edit:draft-1" in callbacks
    assert "draft:cancel:draft-1" in callbacks
    assert state.state == HomeworkDraftStates.waiting_for_confirmation.state
    assert state.data["draft"]["draft_id"] == "draft-1"
    assert state.data["expires_at"] > 0


async def test_homework_text_handler_rejects_student(
    message: MagicMock,
    backend: MagicMock,
    settings: Settings,
    bot: MagicMock,
) -> None:
    backend.get_telegram_user.return_value = BotUser(telegram_id=42, role="student")
    state = FakeState()

    await homework_text_handler(
        message, cast(FSMContext, state), cast(BackendClient, backend), settings, bot
    )

    backend.parse_homework_draft.assert_not_awaited()
    text = message.answer.call_args.args[0]
    assert "староста" in text or "помощник" in text
    assert state.state is None


async def test_homework_text_handler_reports_unbound_user(
    message: MagicMock,
    backend: MagicMock,
    settings: Settings,
    bot: MagicMock,
) -> None:
    backend.get_telegram_user.side_effect = BackendAPIError(404, "not found")
    state = FakeState()

    await homework_text_handler(
        message, cast(FSMContext, state), cast(BackendClient, backend), settings, bot
    )

    backend.parse_homework_draft.assert_not_awaited()
    text = message.answer.call_args.args[0]
    assert "привязан" in text


async def test_draft_callback_confirm_saves_homework(
    message: MagicMock,
    backend: MagicMock,
) -> None:
    state = FakeState()
    state.state = HomeworkDraftStates.waiting_for_confirmation.state
    state.data = {
        "draft": {"draft_id": "draft-1"},
        "expires_at": 10_000_000_000.0,
    }
    callback = MagicMock()
    callback.data = "draft:confirm:draft-1"
    callback.from_user = message.from_user
    callback.message = message
    callback.answer = AsyncMock()

    await draft_callback_handler(
        callback, cast(FSMContext, state), cast(BackendClient, backend)
    )

    backend.confirm_homework_draft.assert_awaited_once_with(42, "draft-1")
    assert state.state is None
    callback.answer.assert_awaited_once()
    message.edit_text.assert_awaited_once()
    assert "Матан" in message.edit_text.call_args.args[0]


async def test_draft_callback_cancel_does_not_save(
    message: MagicMock,
    backend: MagicMock,
) -> None:
    state = FakeState()
    state.state = HomeworkDraftStates.waiting_for_confirmation.state
    state.data = {
        "draft": {"draft_id": "draft-1"},
        "expires_at": 10_000_000_000.0,
    }
    callback = MagicMock()
    callback.data = "draft:cancel:draft-1"
    callback.from_user = message.from_user
    callback.message = message
    callback.answer = AsyncMock()

    await draft_callback_handler(
        callback, cast(FSMContext, state), cast(BackendClient, backend)
    )

    backend.confirm_homework_draft.assert_not_awaited()
    assert state.state is None
    assert "отмен" in message.edit_text.call_args.args[0]


async def test_draft_callback_edit_switches_to_editing(
    message: MagicMock,
    backend: MagicMock,
) -> None:
    state = FakeState()
    state.state = HomeworkDraftStates.waiting_for_confirmation.state
    state.data = {
        "draft": {"draft_id": "draft-1"},
        "expires_at": 10_000_000_000.0,
    }
    callback = MagicMock()
    callback.data = "draft:edit:draft-1"
    callback.from_user = message.from_user
    callback.message = message
    callback.answer = AsyncMock()

    await draft_callback_handler(
        callback, cast(FSMContext, state), cast(BackendClient, backend)
    )

    assert state.state == HomeworkDraftStates.editing.state
    assert "исправлен" in message.edit_text.call_args.args[0]


async def test_edit_text_handler_reparses_draft(
    message: MagicMock,
    backend: MagicMock,
    settings: Settings,
    bot: MagicMock,
) -> None:
    state = FakeState()
    state.state = HomeworkDraftStates.editing.state
    message.text = "ДЗ физика: лаба 3"

    await edit_text_handler(
        message, cast(FSMContext, state), cast(BackendClient, backend), settings, bot
    )

    backend.parse_homework_draft.assert_awaited_once_with(42, "ДЗ физика: лаба 3")
    assert state.state == HomeworkDraftStates.waiting_for_confirmation.state


async def test_draft_callback_expired_clears_state(
    message: MagicMock,
    backend: MagicMock,
) -> None:
    state = FakeState()
    state.state = HomeworkDraftStates.waiting_for_confirmation.state
    state.data = {
        "draft": {"draft_id": "draft-1"},
        "expires_at": 0.0,
    }
    callback = MagicMock()
    callback.data = "draft:confirm:draft-1"
    callback.from_user = message.from_user
    callback.message = message
    callback.answer = AsyncMock()

    await draft_callback_handler(
        callback, cast(FSMContext, state), cast(BackendClient, backend)
    )

    backend.confirm_homework_draft.assert_not_awaited()
    assert state.state is None
    assert "истёк" in message.edit_text.call_args.args[0]


async def test_draft_callback_ignores_unknown_draft(
    message: MagicMock,
    backend: MagicMock,
) -> None:
    state = FakeState()
    state.state = HomeworkDraftStates.waiting_for_confirmation.state
    state.data = {
        "draft": {"draft_id": "draft-1"},
        "expires_at": 10_000_000_000.0,
    }
    callback = MagicMock()
    callback.data = "draft:confirm:draft-old"
    callback.from_user = message.from_user
    callback.message = message
    callback.answer = AsyncMock()

    await draft_callback_handler(
        callback, cast(FSMContext, state), cast(BackendClient, backend)
    )

    backend.confirm_homework_draft.assert_not_awaited()
    assert "устарел" in callback.answer.call_args.args[0]


async def test_draft_callback_backend_error_is_reported(
    message: MagicMock,
    backend: MagicMock,
) -> None:
    backend.confirm_homework_draft.side_effect = BackendAPIError(422, "invalid")
    state = FakeState()
    state.state = HomeworkDraftStates.waiting_for_confirmation.state
    state.data = {
        "draft": {"draft_id": "draft-1"},
        "expires_at": 10_000_000_000.0,
    }
    callback = MagicMock()
    callback.data = "draft:confirm:draft-1"
    callback.from_user = message.from_user
    callback.message = message
    callback.answer = AsyncMock()

    await draft_callback_handler(
        callback, cast(FSMContext, state), cast(BackendClient, backend)
    )

    assert state.state is None
    assert "получилось" in message.edit_text.call_args.args[0]


async def test_homework_text_handler_reports_closed_beta(
    message: MagicMock,
    backend: MagicMock,
    settings: Settings,
    bot: MagicMock,
) -> None:
    backend.get_telegram_user.side_effect = BackendAPIError(403, "closed beta")
    state = FakeState()

    await homework_text_handler(
        message, cast(FSMContext, state), cast(BackendClient, backend), settings, bot
    )

    backend.parse_homework_draft.assert_not_awaited()
    text = message.answer.call_args.args[0]
    assert "закрыт" in text.lower()
