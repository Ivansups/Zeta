"""Shared LLM adapter for OpenAI-compatible APIs."""

from backend.llm.client import LangChainLLMClient, LLMClientProtocol

__all__ = [
    "LLMClientProtocol",
    "LangChainLLMClient",
]
