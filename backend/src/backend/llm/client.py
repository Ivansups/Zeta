"""Shared LLM adapter returning schema-validated structured output."""

from typing import Protocol, TypeVar, runtime_checkable

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, SecretStr

from backend.config import Settings

ModelT = TypeVar("ModelT", bound=BaseModel)

MAX_ATTEMPTS = 3


@runtime_checkable
class LLMClientProtocol(Protocol):
    """Protocol for LLM clients returning schema-validated results."""

    async def complete_structured(self, prompt: str, schema: type[ModelT]) -> ModelT:
        """Send the prompt and return the reply parsed into `schema`."""
        ...


class LangChainLLMClient:
    """LLM client that returns Pydantic models instead of free-form text.

    The reply is constrained by the schema at the API level, and invalid replies
    are retried automatically by the underlying runnable.
    """

    def __init__(self, chat_model: BaseChatModel) -> None:
        self._chat_model = chat_model

    @classmethod
    def from_settings(cls, settings: Settings) -> "LangChainLLMClient":
        """Build a client for the configured OpenAI-compatible endpoint."""
        if settings.llm_api_key is None:
            raise ValueError("LLM_API_KEY is not configured")
        return cls(
            ChatOpenAI(
                api_key=SecretStr(settings.llm_api_key.get_secret_value()),
                base_url=settings.llm_base_url,
                model=settings.llm_model,
                timeout=settings.llm_timeout,
                temperature=0.0,
            )
        )

    async def complete_structured(self, prompt: str, schema: type[ModelT]) -> ModelT:
        """Ask the model for `schema`, retrying when validation fails."""
        chain = self._chat_model.with_structured_output(
            schema, method="json_schema", strict=True
        ).with_retry(
            stop_after_attempt=MAX_ATTEMPTS,
            wait_exponential_jitter=False,
        )
        result = await chain.ainvoke(prompt)
        if not isinstance(result, schema):
            raise TypeError(
                f"LLM returned {type(result).__name__}, expected {schema.__name__}"
            )
        return result
