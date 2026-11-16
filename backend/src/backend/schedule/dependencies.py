"""FastAPI dependencies for the schedule module."""

from typing import Annotated

from fastapi import Depends

from backend.auth.dependencies import get_settings
from backend.config import Settings
from backend.llm.client import LangChainLLMClient
from backend.schedule.llm_fallback import LLMFallbackService


def get_llm_fallback_service(
    settings: Annotated[Settings, Depends(get_settings)],
) -> LLMFallbackService:
    """Provide the LLM fallback, disabled when no API key is configured."""
    api_key = settings.llm_api_key
    if api_key is None or not api_key.get_secret_value():
        return LLMFallbackService(client=None)
    return LLMFallbackService(client=LangChainLLMClient.from_settings(settings))
