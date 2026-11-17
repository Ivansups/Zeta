"""Onboarding and general handlers for Zeta Telegram Bot."""

import html
import logging

from aiogram import F, Router
from aiogram.filters import Command, CommandStart
from aiogram.types import CallbackQuery, Message

from telegram_bot.config import Settings
from telegram_bot.keyboards.onboarding import build_onboarding_keyboard

logger = logging.getLogger(__name__)

HELP_MESSAGE_TEXT = (
    "📖 <b>Справка по командам Zeta:</b>\n\n"
    "• /start — перезапустить приветствие и онбординг\n"
    "• /help — показать эту справку\n\n"
    "Для входа в систему используй ссылку на веб-версию в приветствии."
)

router = Router(name="onboarding")


@router.message(CommandStart())
async def start_handler(message: Message, settings: Settings) -> None:
    """Handle /start command with welcome greeting and onboarding info."""
    raw_name = message.from_user.full_name if message.from_user else "студент"
    user_name = html.escape(raw_name)
    text = (
        f"Привет, {user_name}! 👋\n\n"
        "Я бот платформы <b>Zeta</b> — твоего помощника по расписанию "
        "и учебным заданиям.\n\n"
        "Здесь ты сможешь:\n"
        "• Узнавать актуальное расписание пар\n"
        "• Получать и отслеживать домашние задания\n"
        "• Авторизоваться в веб-версии через Telegram\n\n"
        "Нажми кнопку ниже, чтобы открыть веб-кабинет, "
        "или отправь /help для справки."
    )
    keyboard = build_onboarding_keyboard(settings.web_app_url)
    await message.answer(text, reply_markup=keyboard)


@router.message(Command("help"))
async def help_handler(message: Message) -> None:
    """Handle /help command with command list and usage guidance."""
    await message.answer(HELP_MESSAGE_TEXT)


@router.callback_query(F.data == "cmd_help")
async def help_callback_handler(callback: CallbackQuery) -> None:
    """Handle callback from the Help button in onboarding keyboard."""
    if callback.message and isinstance(callback.message, Message):
        await callback.message.answer(HELP_MESSAGE_TEXT)
    await callback.answer()
