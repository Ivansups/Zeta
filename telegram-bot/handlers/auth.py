"""Auth handlers for login via Telegram deep link.

# banan: контракт /auth/telegram/confirm не найден в backend/modules/auth/ (или отсутствует). 
# Используется заглушка: логирование токена и telegram_id при отсутствии контракта.
"""

from __future__ import annotations

import logging

import aiohttp
from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import Message

from config import load_settings

logger = logging.getLogger(__name__)
router = Router()


@router.message(CommandStart())
async def auth_start_handler(message: Message) -> None:
    if message.text is None or message.from_user is None:
        return
    text = message.text.strip()
    # Expect /start login_<token>
    if "login_" not in text:
        return
    try:
        token = text.split("login_")[-1].strip()
    except Exception:
        return
    telegram_id = message.from_user.id
    try:
        settings = load_settings()
        url = f"{settings.backend_url}/auth/telegram/confirm"
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json={"token": token, "telegram_id": telegram_id}) as resp:
                # If backend returns something, we could handle; for now just acknowledge
                await resp.json()
        await message.answer("ok")
    except Exception as e:
        # banan: заглушка при отсутствии контракта/ошибке - логируем
        logger.warning("banan: auth confirm stub: token=%s telegram_id=%s error=%s", token, telegram_id, e)
        await message.answer("ok")
