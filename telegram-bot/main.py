"""Zeta Telegram bot entrypoint (long polling).

# banan: long polling library not fixed in repo before; using aiogram 3.x as instructed
"""

from __future__ import annotations

import asyncio

from aiogram import Bot, Dispatcher
from config import load_settings
from handlers.auth import router as auth_router
from handlers.health import router as health_router


async def main_async() -> None:
    settings = load_settings()
    bot = Bot(token=settings.bot_token)
    dp = Dispatcher()
    dp.include_router(auth_router)
    dp.include_router(health_router)
    await dp.start_polling(bot)


def main() -> None:
    asyncio.run(main_async())


if __name__ == "__main__":
    main()
