import pytest
from pydantic import ValidationError

from backend.config import Settings

DATABASE_URL = "postgresql+asyncpg://zeta:zeta@localhost:5432/zeta"


def test_development_settings_allow_insecure_defaults() -> None:
    settings = Settings(_env_file=None, database_url=DATABASE_URL)

    assert settings.environment == "development"


def test_production_settings_reject_insecure_defaults() -> None:
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            _env_file=None,
            environment="production",
            database_url=DATABASE_URL,
            telegram_bot_token="mock-bot-token",
            jwt_secret_key="zeta-dev-secret-key-change-in-production-must-be-long-enough",
            internal_api_secret=None,
        )

    message = str(exc_info.value)
    assert "JWT_SECRET_KEY" in message
    assert "TELEGRAM_BOT_TOKEN" in message
    assert "INTERNAL_API_SECRET" in message


def test_production_settings_accept_real_secrets() -> None:
    settings = Settings(
        _env_file=None,
        environment="production",
        database_url=DATABASE_URL,
        telegram_bot_token="123456789:TEST-TOKEN",
        jwt_secret_key="a" * 64,
        internal_api_secret="b" * 64,
    )

    assert settings.environment == "production"
