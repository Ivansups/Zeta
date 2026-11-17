import pytest
from pydantic import SecretStr, ValidationError

from telegram_bot.config import Settings


def test_settings_valid_defaults() -> None:
    settings = Settings(bot_token=SecretStr("123456:TEST_TOKEN"))
    assert settings.bot_token.get_secret_value() == "123456:TEST_TOKEN"
    assert settings.backend_base_url == "http://localhost:8000"
    assert settings.web_app_url == "http://localhost:3000"
    assert settings.polling_timeout == 30
    assert settings.log_level == "INFO"
    assert settings.telegram_proxy_url is None
    assert settings.backend_timeout == 10.0
    assert settings.draft_ttl_seconds == 900
    assert settings.question_throttle_seconds == 3.0


def test_settings_custom_values() -> None:
    settings = Settings(
        bot_token=SecretStr("123456:CUSTOM"),
        backend_base_url="https://api.zeta.example.com",
        web_app_url="https://zeta.example.com",
        polling_timeout=45,
        log_level="DEBUG",
        telegram_proxy_url="https://proxy.example.com",
        backend_timeout=25.5,
    )
    assert settings.bot_token.get_secret_value() == "123456:CUSTOM"
    assert settings.backend_base_url == "https://api.zeta.example.com"
    assert settings.web_app_url == "https://zeta.example.com"
    assert settings.polling_timeout == 45
    assert settings.log_level == "DEBUG"
    assert settings.telegram_proxy_url == "https://proxy.example.com"
    assert settings.backend_timeout == 25.5


def test_settings_aliases_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "123456:ALIAS_TOKEN")
    monkeypatch.setenv("BACKEND_URL", "http://backend-alias:8080")
    monkeypatch.setenv("FRONTEND_URL", "http://frontend-alias:3000")
    monkeypatch.setenv("BOT_POLLING_TIMEOUT", "60")
    monkeypatch.setenv("BOT_LOG_LEVEL", "WARNING")
    monkeypatch.setenv("TG_PROXY_URL", "http://proxy-alias:8000")
    monkeypatch.setenv("BACKEND_REQUEST_TIMEOUT", "7.5")
    monkeypatch.setenv("DRAFT_TTL_SECONDS", "120")
    monkeypatch.setenv("QUESTION_THROTTLE_SECONDS", "1.5")

    settings = Settings()
    assert settings.bot_token.get_secret_value() == "123456:ALIAS_TOKEN"
    assert settings.backend_base_url == "http://backend-alias:8080"
    assert settings.web_app_url == "http://frontend-alias:3000"
    assert settings.polling_timeout == 60
    assert settings.log_level == "WARNING"
    assert settings.telegram_proxy_url == "http://proxy-alias:8000"
    assert settings.backend_timeout == 7.5
    assert settings.draft_ttl_seconds == 120
    assert settings.question_throttle_seconds == 1.5


def test_settings_missing_token_raises_validation_error() -> None:
    with pytest.raises(ValidationError):
        Settings(bot_token=SecretStr(""))
