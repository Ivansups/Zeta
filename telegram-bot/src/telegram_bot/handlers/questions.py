"""Handlers for free-form student questions answered via the LLM."""

import logging

from aiogram import Bot, F, Router
from aiogram.enums import ChatAction
from aiogram.types import Message

from telegram_bot.client import BackendAPIError, BackendClient, BackendClientError
from telegram_bot.formatters import format_ask_response
from telegram_bot.messages import CLOSED_BETA_MESSAGE
from telegram_bot.throttle import QuestionThrottle

logger = logging.getLogger(__name__)

QUESTION_STARTS = {
    "что",
    "какие",
    "какой",
    "какая",
    "когда",
    "где",
    "сколько",
    "как",
    "есть",
    "задали",
}

router = Router(name="questions")


def looks_like_question(text: str) -> bool:
    """Heuristically detect a free-form question addressed to the bot."""
    stripped = text.strip()
    if not stripped or stripped.startswith("/"):
        return False
    if "?" in stripped:
        return True
    words = stripped.lower().split()
    if not words:
        return False
    return words[0] in QUESTION_STARTS or "задали" in words


@router.message(F.text.func(looks_like_question))
async def question_handler(
    message: Message,
    backend_client: BackendClient,
    question_throttle: QuestionThrottle,
    bot: Bot,
) -> None:
    """Answer a student question using the group-scoped LLM context."""
    user = message.from_user
    text = (message.text or "").strip()
    if user is None or not text:
        return
    if not question_throttle.allow(user.id):
        await message.answer(
            "⏳ Слишком часто. Подожди немного перед следующим вопросом."
        )
        return
    await bot.send_chat_action(chat_id=message.chat.id, action=ChatAction.TYPING)
    try:
        response = await backend_client.ask_question(user.id, text)
    except BackendAPIError as err:
        logger.warning("Failed to answer question: %s", err)
        if err.status_code == 403:
            await message.answer(CLOSED_BETA_MESSAGE)
        elif err.status_code in {404, 409}:
            await message.answer(
                "Твоя группа не найдена. Войди в Zeta через веб-версию, "
                "чтобы привязать аккаунт."
            )
        else:
            await message.answer("Получить ответ не получилось. Попробуй позже.")
        return
    except BackendClientError:
        await message.answer("Сервис Zeta недоступен. Попробуй позже.")
        return
    await message.answer(format_ask_response(response))
