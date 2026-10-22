from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message
from handlers.homework import (
    HomeworkStates,
    homework_cancel_handler,
    homework_confirm_handler,
    homework_start_handler,
    homework_text_handler,
)
from services.homework import HomeworkService


@pytest.mark.asyncio
async def test_start_enters_awaiting_text() -> None:
    message = AsyncMock(spec=Message)
    message.answer = AsyncMock()
    state = AsyncMock(spec=FSMContext)

    await homework_start_handler(message, state)

    state.set_state.assert_awaited_once_with(HomeworkStates.awaiting_text)
    message.answer.assert_awaited_once()


@pytest.mark.asyncio
async def test_text_parses_and_moves_to_awaiting_confirm() -> None:
    draft = {"pair_id": 1, "subgroup": 2, "description": "Параграф 5"}
    message = AsyncMock(spec=Message)
    message.text = "ДЗ матан: параграф 5"
    message.answer = AsyncMock()
    state = AsyncMock(spec=FSMContext)

    with patch(
        "handlers.homework.homework_service.parse_from_text",
        new=AsyncMock(return_value=draft),
    ) as parse_mock:
        await homework_text_handler(message, state)

    parse_mock.assert_awaited_once_with("ДЗ матан: параграф 5")
    state.update_data.assert_awaited_once_with(draft=draft)
    state.set_state.assert_awaited_once_with(HomeworkStates.awaiting_confirm)

    message.answer.assert_awaited_once()
    markup = message.answer.call_args.kwargs["reply_markup"]
    buttons = markup.inline_keyboard[0]
    assert [button.text for button in buttons] == ["Подтвердить", "Отменить"]
    assert [button.callback_data for button in buttons] == [
        "homework_confirm",
        "homework_cancel",
    ]


@pytest.mark.asyncio
async def test_empty_text_stays_in_awaiting_text() -> None:
    message = AsyncMock(spec=Message)
    message.text = "   "
    message.answer = AsyncMock()
    state = AsyncMock(spec=FSMContext)

    with patch(
        "handlers.homework.homework_service.parse_from_text",
        new=AsyncMock(),
    ) as parse_mock:
        await homework_text_handler(message, state)

    parse_mock.assert_not_awaited()
    state.set_state.assert_not_awaited()
    state.update_data.assert_not_awaited()
    message.answer.assert_awaited_once()


@pytest.mark.asyncio
async def test_confirm_clears_state() -> None:
    draft = {"pair_id": 1, "subgroup": 2, "description": "Параграф 5"}
    callback = AsyncMock(spec=CallbackQuery)
    callback.message = AsyncMock(spec=Message)
    callback.message.answer = AsyncMock()
    callback.answer = AsyncMock()
    state = AsyncMock(spec=FSMContext)
    state.get_data = AsyncMock(return_value={"draft": draft})

    await homework_confirm_handler(callback, state)

    state.get_data.assert_awaited_once()
    state.clear.assert_awaited_once()
    callback.message.answer.assert_awaited_once()
    callback.answer.assert_awaited_once()


@pytest.mark.asyncio
async def test_cancel_clears_state() -> None:
    callback = AsyncMock(spec=CallbackQuery)
    callback.message = AsyncMock(spec=Message)
    callback.message.answer = AsyncMock()
    callback.answer = AsyncMock()
    state = AsyncMock(spec=FSMContext)

    await homework_cancel_handler(callback, state)

    state.clear.assert_awaited_once()
    callback.message.answer.assert_awaited_once()
    callback.answer.assert_awaited_once()


@pytest.mark.asyncio
async def test_service_posts_text_to_backend(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("BOT_TOKEN", "123:abc")
    monkeypatch.setenv("BACKEND_URL", "http://localhost:8000")
    response = AsyncMock()
    response.status = 200
    response.json = AsyncMock(
        return_value={"pair_id": 1, "subgroup": 2, "description": "Параграф 5"}
    )
    response.__aenter__.return_value = response
    response.__aexit__.return_value = False

    with patch("services.homework.aiohttp.ClientSession") as session_cls:
        session = AsyncMock()
        session.__aenter__.return_value = session
        session.__aexit__.return_value = False
        session.post = MagicMock(return_value=response)
        session_cls.return_value = session

        result = await HomeworkService().parse_from_text("ДЗ матан: параграф 5")

    session.post.assert_called_once()
    assert session.post.call_args.args[0].endswith("/homework/parse-from-text")
    assert session.post.call_args.kwargs["json"] == {"text": "ДЗ матан: параграф 5"}
    assert result == {"pair_id": 1, "subgroup": 2, "description": "Параграф 5"}


@pytest.mark.asyncio
async def test_service_falls_back_to_stub_on_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("BOT_TOKEN", "123:abc")
    monkeypatch.setenv("BACKEND_URL", "http://localhost:8000")
    response = AsyncMock()
    response.status = 404
    response.json = AsyncMock(return_value={})
    response.__aenter__.return_value = response
    response.__aexit__.return_value = False

    with patch("services.homework.aiohttp.ClientSession") as session_cls:
        session = AsyncMock()
        session.__aenter__.return_value = session
        session.__aexit__.return_value = False
        session.post = MagicMock(return_value=response)
        session_cls.return_value = session

        result = await HomeworkService().parse_from_text("ДЗ матан: параграф 5")

    assert result == {
        "pair_id": 1,
        "subgroup": 2,
        "description": "ДЗ матан: параграф 5",
    }
