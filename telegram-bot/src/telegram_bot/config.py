"""Configuration settings for Telegram Bot."""

from pathlib import Path

from pydantic import AliasChoices, Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment or .env file."""

    model_config = SettingsConfigDict(
        env_file=(
            Path(__file__).resolve().parents[2] / ".env",  # telegram-bot/.env
            Path(__file__).resolve().parents[3] / ".env",  # root .env
            ".env",
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    bot_token: SecretStr = Field(
        ...,
        validation_alias=AliasChoices("BOT_TOKEN", "TELEGRAM_BOT_TOKEN"),
        description="Telegram bot token obtained from BotFather",
    )
    backend_base_url: str = Field(
        default="http://localhost:8000",
        validation_alias=AliasChoices("BACKEND_BASE_URL", "BACKEND_URL"),
        description="Base URL of Zeta backend API",
    )
    web_app_url: str = Field(
        default="http://localhost:3000",
        validation_alias=AliasChoices("WEB_APP_URL", "FRONTEND_URL"),
        description="Base URL of Zeta web application",
    )
    polling_timeout: int = Field(
        default=30,
        validation_alias=AliasChoices("POLLING_TIMEOUT", "BOT_POLLING_TIMEOUT"),
        description="Long polling timeout in seconds",
    )
    log_level: str = Field(
        default="INFO",
        validation_alias=AliasChoices("LOG_LEVEL", "BOT_LOG_LEVEL"),
        description="Logging level",
    )
    telegram_proxy_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices("TELEGRAM_PROXY_URL", "TG_PROXY_URL"),
        description="Optional proxy URL for Telegram Bot API requests",
    )

    @field_validator("bot_token")
    @classmethod
    def validate_bot_token_not_empty(cls, value: SecretStr) -> SecretStr:
        """Ensure bot token is not an empty string."""
        if not value.get_secret_value().strip():
            msg = "BOT_TOKEN must not be empty"
            raise ValueError(msg)
        return value
