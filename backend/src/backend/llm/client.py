"""Generic HTTP client for OpenAI-compatible LLM endpoints."""

import json
from typing import Any, Protocol, runtime_checkable

import httpx


@runtime_checkable
class LLMClientProtocol(Protocol):
    """Protocol for LLM client handling JSON completions."""

    async def complete_json(self, prompt: str) -> dict[str, Any]:
        """Send prompt and receive parsed JSON dictionary."""
        ...


class HttpLLMClient:
    """HTTP client for OpenAI-compatible LLM endpoints.

    Reusable across the project for any feature that needs LLM integration
    (schedule parsing, homework analysis, etc.).
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.openai.com/v1",
        model: str = "gpt-4o-mini",
        timeout: float = 30.0,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout
        self._http_client = http_client

    async def complete_json(self, prompt: str) -> dict[str, Any]:
        """Send chat completion request expecting JSON object."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "response_format": {"type": "json_object"},
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a timetable parser. Always respond with valid JSON."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.0,
        }
        if self._http_client is not None:
            resp = await self._http_client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
            )
        else:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                )
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        result: dict[str, Any] = json.loads(content)
        return result
