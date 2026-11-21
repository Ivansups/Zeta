from pydantic import SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_JWT_SECRET = "zeta-dev-secret-key-change-in-production-must-be-long-enough"  # noqa: S105
DEFAULT_BOT_TOKEN = "mock-bot-token"  # noqa: S105


class Settings(BaseSettings):
    """Application settings loaded from the environment and `.env`."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    environment: str = "development"
    telegram_bot_token: str = DEFAULT_BOT_TOKEN
    jwt_secret_key: str = DEFAULT_JWT_SECRET
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30

    # Internal API Secret for trusted bot-to-backend communication
    internal_api_secret: str | None = None

    # Allowed Telegram users/IDs for closed beta testing (comma or space separated)
    allowed_telegram_users: str | None = None

    # LLM (OpenAI-compatible)
    llm_api_key: SecretStr | None = None
    llm_base_url: str = "https://api.openai.com/v1"
    llm_model: str = "gpt-4o-mini"
    llm_timeout: float = 30.0

    @model_validator(mode="after")
    def _reject_insecure_defaults_in_production(self) -> "Settings":
        """Refuse to start in production with development secrets."""
        if self.environment.strip().lower() != "production":
            return self

        insecure: list[str] = []
        if self.jwt_secret_key == DEFAULT_JWT_SECRET:
            insecure.append("JWT_SECRET_KEY")
        if self.telegram_bot_token == DEFAULT_BOT_TOKEN:
            insecure.append("TELEGRAM_BOT_TOKEN")
        if not (self.internal_api_secret or "").strip():
            insecure.append("INTERNAL_API_SECRET")

        if insecure:
            msg = "Production requires secure values for: " + ", ".join(insecure)
            raise ValueError(msg)
        return self
