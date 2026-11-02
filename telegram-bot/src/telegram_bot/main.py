"""Entrypoint and application factory for Zeta Telegram Bot."""

import asyncio
import logging
import sys

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.client.session.aiohttp import AiohttpSession
from aiogram.client.telegram import TelegramAPIServer
from aiogram.enums import ParseMode

from telegram_bot.client import BackendClient
from telegram_bot.config import Settings
from telegram_bot.handlers.onboarding import router as onboarding_router

logger = logging.getLogger("telegram_bot")


def setup_logging(log_level: str = "INFO") -> None:
    """Configure structured logging for the application."""
    logging.basicConfig(
        level=log_level.upper(),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def create_bot(settings: Settings) -> Bot:
    """Create and configure Telegram Bot instance with optional reverse proxy."""
    session = None
    if settings.telegram_proxy_url:
        server = TelegramAPIServer.from_base(settings.telegram_proxy_url)
        session = AiohttpSession(api=server)

    return Bot(
        token=settings.bot_token.get_secret_value(),
        session=session,
        default=DefaultBotProperties(parse_mode=ParseMode.MARKDOWN),
    )


def create_dispatcher(settings: Settings) -> Dispatcher:
    """Create and configure Dispatcher with all registered routers and dependencies."""
    dp = Dispatcher()
    dp["settings"] = settings
    dp.include_router(onboarding_router)
    return dp


async def main() -> None:
    """Run bot application with long polling and graceful shutdown."""
    settings = Settings()  # type: ignore[call-arg]
    setup_logging(settings.log_level)
    logger.info("Starting Zeta Telegram Bot...")

    bot = create_bot(settings)
    dp = create_dispatcher(settings)

    async with BackendClient(base_url=settings.backend_base_url) as backend_client:
        dp["backend_client"] = backend_client

        is_backend_up = await backend_client.healthcheck()
        if is_backend_up:
            logger.info("Connected to Zeta Backend at %s", settings.backend_base_url)
        else:
            logger.warning(
                "Zeta Backend at %s is not reachable yet, continuing startup",
                settings.backend_base_url,
            )

        try:
            logger.info("Polling started (timeout: %ds)", settings.polling_timeout)
            await dp.start_polling(
                bot,
                polling_timeout=settings.polling_timeout,
                handle_signals=True,
            )
        finally:
            logger.info("Closing bot session...")
            await bot.session.close()
            logger.info("Zeta Telegram Bot stopped gracefully.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logger.info("Bot process terminated by user or OS signal.")
        sys.exit(0)
