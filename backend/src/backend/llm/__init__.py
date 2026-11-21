"""Shared LLM adapter for OpenAI-compatible APIs."""

from backend.llm.client import LangChainLLMClient, LLMClientProtocol
from backend.llm.prompts import (
    build_schedule_cell_prompt,
    build_student_qa_prompt,
)

__all__ = [
    "LLMClientProtocol",
    "LangChainLLMClient",
    "build_schedule_cell_prompt",
    "build_student_qa_prompt",
]
