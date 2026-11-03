"""Unit tests for the shared LangChain LLM client."""

from unittest.mock import MagicMock

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.runnables import RunnableLambda
from langchain_openai import ChatOpenAI
from pydantic import SecretStr, ValidationError

from backend.config import Settings
from backend.llm.client import LangChainLLMClient
from backend.schedule.models import LessonCellExtraction


async def test_llm_client_returns_schema_validated_output() -> None:
    """The client asks LangChain for a Pydantic schema instead of raw JSON."""
    fake_model = MagicMock(spec=BaseChatModel)
    fake_model.with_structured_output.return_value = RunnableLambda(
        lambda _: LessonCellExtraction(subject="История", room="101")
    )

    client = LangChainLLMClient(chat_model=fake_model)
    res = await client.complete_structured("Parse this cell", LessonCellExtraction)

    assert res.subject == "История"
    assert res.room == "101"
    fake_model.with_structured_output.assert_called_once_with(
        LessonCellExtraction, method="json_schema", strict=True
    )


async def test_llm_client_retries_after_validation_error() -> None:
    """Validation failures are retried instead of surfacing to the caller."""
    attempts: list[int] = []

    def reply(_: object) -> LessonCellExtraction:
        attempts.append(1)
        if len(attempts) < 3:
            raise ValidationError.from_exception_data(
                "LessonCellExtraction",
                [{"type": "missing", "loc": ("subject",), "input": {}}],
            )
        return LessonCellExtraction(subject="История")

    fake_model = MagicMock(spec=BaseChatModel)
    fake_model.with_structured_output.return_value = RunnableLambda(reply)

    client = LangChainLLMClient(chat_model=fake_model)
    res = await client.complete_structured("Parse this cell", LessonCellExtraction)

    assert res.subject == "История"
    assert len(attempts) == 3


def test_llm_client_from_settings_uses_config_values() -> None:
    """Client picks the endpoint, model, key and timeout up from Settings."""
    settings = Settings(
        database_url="postgresql+asyncpg://zeta:zeta@localhost:5432/zeta",
        llm_api_key="test-key",
        llm_base_url="https://llm.example/v1",
        llm_model="test-model",
        llm_timeout=12.5,
    )

    client = LangChainLLMClient.from_settings(settings)

    assert isinstance(client._chat_model, ChatOpenAI)
    assert client._chat_model.model_name == "test-model"
    assert client._chat_model.openai_api_base == "https://llm.example/v1"
    assert client._chat_model.request_timeout == 12.5
    assert isinstance(client._chat_model.openai_api_key, SecretStr)
    assert client._chat_model.openai_api_key.get_secret_value() == "test-key"
