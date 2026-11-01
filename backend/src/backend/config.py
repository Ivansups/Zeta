from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from the environment and `.env`."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    telegram_bot_token: str = "mock-bot-token"  # noqa: S105
    jwt_secret_key: str = "zeta-dev-secret-key-change-in-production-must-be-long-enough"  # noqa: S105
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30
