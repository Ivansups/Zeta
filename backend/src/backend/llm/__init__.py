"""Shared LLM adapter for OpenAI-compatible APIs."""

from backend.llm.client import HttpLLMClient, LLMClientProtocol

__all__ = [
    "HttpLLMClient",
    "LLMClientProtocol",
]
