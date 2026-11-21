"""FSM handlers for creating homework from free-form text."""

import asyncio
import logging
import time

from aiogram import Bot, F, Router
from aiogram.exceptions import TelegramAPIError
from aiogram.filters import StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message

from telegram_bot.api_models import HomeworkDraft
from telegram_bot.client import BackendAPIError, BackendClient, BackendClientError
from telegram_bot.config import Settings
from telegram_bot.formatters import format_confirmation, format_draft_card
from telegram_bot.keyboards.homework import build_draft_keyboard
from telegram_bot.messages import CLOSED_BETA_MESSAGE
from telegram_bot.states import HomeworkDraftStates

logger = logging.getLogger(__name__)

HOMEWORK_ROLES = {"elder", "helper"}
HOMEWORK_TEXT_PATTERN = r"(?i)^дз(?:\s|:|$)"
EXPIRED_MESSAGE = "⌛ Черновик истёк. Отправь ДЗ заново."
STALE_MESSAGE = "Черновик устарел. Создай новый."
UNAVAILABLE_MESSAGE = "Сервис Zeta недоступен. Попробуй позже."

router = Router(name="homework")
_background_tasks: set[asyncio.Task[None]] = set()


async def _ensure_can_manage(message: Message, backend: BackendClient) -> bool:
    user = message.from_user
    if user is None:
        await message.answer("Пользователь не определён.")
        return False
    try:
        bot_user = await backend.get_telegram_user(user.id)
    except BackendAPIError as err:
        if err.status_code == 403:
            await message.answer(CLOSED_BETA_MESSAGE)
        elif err.status_code == 404:
            await message.answer(
                "Ты не привязан к группе. Сначала войди в Zeta через веб-версию."
            )
        else:
            await message.answer("Проверить права сейчас нельзя. Попробуй позже.")
        return False
    except BackendClientError:
        await message.answer(UNAVAILABLE_MESSAGE)
        return False
    if bot_user.role not in HOMEWORK_ROLES:
        await message.answer("Создавать ДЗ могут только староста и помощник.")
        return False
    return True


def _schedule_expiry(
    state: FSMContext,
    chat_id: int,
    draft_id: str,
    expires_at: float,
    ttl: int,
    bot: Bot,
) -> None:
    async def expire() -> None:
        await asyncio.sleep(ttl)
        data = await state.get_data()
        draft = data.get("draft")
        if (
            not isinstance(draft, dict)
            or draft.get("draft_id") != draft_id
            or data.get("expires_at") != expires_at
        ):
            return
        await state.clear()
        try:
            await bot.send_message(chat_id, EXPIRED_MESSAGE)
        except TelegramAPIError:
            logger.warning("Could not notify about expired draft %s", draft_id)

    task = asyncio.create_task(expire())
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)


async def _show_draft(
    message: Message,
    state: FSMContext,
    draft: HomeworkDraft,
    settings: Settings,
    bot: Bot,
) -> None:
    expires_at = time.monotonic() + settings.draft_ttl_seconds
    await state.set_state(HomeworkDraftStates.waiting_for_confirmation)
    await state.set_data(
        {"draft": draft.model_dump(mode="json"), "expires_at": expires_at}
    )
    await message.answer(
        format_draft_card(draft),
        reply_markup=build_draft_keyboard(draft.draft_id),
    )
    _schedule_expiry(
        state,
        message.chat.id,
        draft.draft_id,
        expires_at,
        settings.draft_ttl_seconds,
        bot,
    )


async def _handle_homework_text(
    message: Message,
    state: FSMContext,
    backend: BackendClient,
    settings: Settings,
    bot: Bot,
) -> None:
    user = message.from_user
    text = (message.text or "").strip()
    if user is None or not text:
        return
    try:
        draft = await backend.parse_homework_draft(user.id, text)
    except BackendAPIError as err:
        await state.clear()
        logger.warning("Failed to parse homework draft: %s", err)
        await message.answer(
            "Разобрать ДЗ не получилось. Проверь предмет и дату и попробуй ещё раз."
        )
        return
    except BackendClientError:
        await state.clear()
        await message.answer(UNAVAILABLE_MESSAGE)
        return
    await _show_draft(message, state, draft, settings, bot)


@router.message(StateFilter(HomeworkDraftStates.editing), F.text)
async def edit_text_handler(
    message: Message,
    state: FSMContext,
    backend_client: BackendClient,
    settings: Settings,
    bot: Bot,
) -> None:
    """Accept corrected homework text after the user pressed Edit."""
    await _handle_homework_text(message, state, backend_client, settings, bot)


@router.message(F.text.regexp(HOMEWORK_TEXT_PATTERN))
async def homework_text_handler(
    message: Message,
    state: FSMContext,
    backend_client: BackendClient,
    settings: Settings,
    bot: Bot,
) -> None:
    """Parse a message that starts with "ДЗ" into a draft."""
    if not await _ensure_can_manage(message, backend_client):
        return
    await _handle_homework_text(message, state, backend_client, settings, bot)


@router.callback_query(F.data.startswith("draft:"))
async def draft_callback_handler(
    callback: CallbackQuery,
    state: FSMContext,
    backend_client: BackendClient,
) -> None:
    """Handle confirm, edit and cancel actions on a homework draft card."""
    user = callback.from_user
    message = callback.message
    if user is None or not isinstance(message, Message):
        await callback.answer("Сообщение недоступно", show_alert=True)
        return
    parts = (callback.data or "").split(":", 2)
    if len(parts) != 3:
        await callback.answer()
        return
    _, action, draft_id = parts
    data = await state.get_data()
    draft_data = data.get("draft")
    stored_id = draft_data.get("draft_id") if isinstance(draft_data, dict) else None
    if not isinstance(stored_id, str) or stored_id != draft_id:
        await callback.answer(STALE_MESSAGE, show_alert=True)
        return
    expires_at = data.get("expires_at")
    if not isinstance(expires_at, (int, float)) or time.monotonic() > expires_at:
        await state.clear()
        await message.edit_text(EXPIRED_MESSAGE)
        await callback.answer()
        return

    if action == "cancel":
        await state.clear()
        await message.edit_text("❌ Черновик отменён.")
        await callback.answer("Отменено")
        return
    if action == "edit":
        await state.set_state(HomeworkDraftStates.editing)
        await message.edit_text("✏️ Отправь исправленный текст ДЗ одним сообщением.")
        await callback.answer()
        return
    if action == "confirm":
        try:
            confirmed = await backend_client.confirm_homework_draft(user.id, draft_id)
        except BackendAPIError as err:
            await state.clear()
            logger.warning("Failed to confirm homework draft: %s", err)
            if err.status_code in {403, 404, 409}:
                text = "Сохранить ДЗ не получилось: проверь привязку к группе."
            else:
                text = "Сохранить ДЗ не получилось. Попробуй позже."
            await message.edit_text(text)
            await callback.answer("Ошибка", show_alert=True)
            return
        except BackendClientError:
            await state.clear()
            await message.edit_text(UNAVAILABLE_MESSAGE)
            await callback.answer("Ошибка", show_alert=True)
            return
        await state.clear()
        await message.edit_text(format_confirmation(confirmed))
        await callback.answer("Сохранено")
        return
    await callback.answer()
