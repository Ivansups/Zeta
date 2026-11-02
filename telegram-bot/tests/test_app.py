from aiogram import Dispatcher
from pydantic import SecretStr

from telegram_bot.config import Settings
from telegram_bot.main import create_bot, create_dispatcher, setup_logging


def test_create_dispatcher() -> None:
    settings = Settings(bot_token=SecretStr("123456:TEST_DISPATCHER"))
    dp = create_dispatcher(settings)

    assert isinstance(dp, Dispatcher)
    assert dp.get("settings") == settings

    sub_router_names = [r.name for r in dp.sub_routers]
    assert "onboarding" in sub_router_names


def test_create_bot_standard() -> None:
    settings = Settings(bot_token=SecretStr("123456:TEST_BOT"))
    bot = create_bot(settings)

    assert bot.token == "123456:TEST_BOT"


def test_create_bot_with_proxy() -> None:
    settings = Settings(
        bot_token=SecretStr("123456:TEST_BOT_PROXY"),
        telegram_proxy_url="http://127.0.0.1:8080",
    )
    bot = create_bot(settings)

    assert bot.token == "123456:TEST_BOT_PROXY"
    assert bot.session is not None


def test_setup_logging() -> None:
    setup_logging("DEBUG")
