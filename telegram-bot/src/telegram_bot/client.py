"""HTTP client for Zeta Backend REST API."""

import logging
from collections.abc import Mapping
from typing import Any

import httpx
from pydantic import BaseModel, ValidationError

from telegram_bot.api_models import (
    AskResponse,
    BotUser,
    ConfirmedHomework,
    HomeworkDraft,
)

logger = logging.getLogger(__name__)


class BackendClientError(Exception):
    """Base exception for backend API client failures."""


class BackendAPIError(BackendClientError):
    """Backend responded with an HTTP error status."""

    def __init__(self, status_code: int, detail: str) -> None:
        """Store the HTTP status and human-readable detail."""
        super().__init__(f"Backend API error {status_code}: {detail}")
        self.status_code = status_code


def _error_detail(response: httpx.Response) -> str:
    try:
        data = response.json()
    except ValueError:
        return response.text[:200]
    if isinstance(data, dict) and "detail" in data:
        return str(data["detail"])
    return response.text[:200]


def _validate_payload[ModelT: BaseModel](
    model: type[ModelT], payload: dict[str, Any], path: str
) -> ModelT:
    try:
        return model.model_validate(payload)
    except ValidationError as err:
        logger.error("Backend response from %s failed validation: %s", path, err)
        raise BackendClientError(f"Backend response from {path} is invalid") from err


class BackendClient:
    """Asynchronous client for interacting with Zeta Backend."""

    def __init__(
        self,
        base_url: str,
        timeout: float = 10.0,
        internal_secret: str | None = None,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        """Initialize the backend client with base URL, timeout, and internal auth secret."""
        self._base_url = base_url.rstrip("/")
        headers = {}
        if internal_secret:
            headers["X-Internal-Secret"] = internal_secret
        self._client = httpx.AsyncClient(
            base_url=self._base_url,
            timeout=timeout,
            headers=headers,
            transport=transport,
        )

    async def __aenter__(self) -> "BackendClient":
        """Enter async context manager."""
        await self._client.__aenter__()
        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: Any,
    ) -> None:
        """Exit async context manager and close client."""
        await self._client.__aexit__(exc_type, exc_val, exc_tb)

    async def close(self) -> None:
        """Close underlying HTTP client connections."""
        await self._client.aclose()

    async def healthcheck(self) -> bool:
        """Check if backend is healthy.

        Returns True if /health responds with 200 and status 'ok', False otherwise.
        """
        try:
            response = await self._client.get("/health")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, dict) and data.get("status") == "ok":
                    return True
            logger.warning(
                "Backend healthcheck returned unexpected status: %s %s",
                response.status_code,
                response.text,
            )
            return False
        except (httpx.HTTPError, ValueError) as err:
            logger.warning("Backend healthcheck failed with network error: %s", err)
            return False

    async def get(self, path: str, **kwargs: Any) -> httpx.Response:
        """Send GET request to backend."""
        try:
            return await self._client.get(path, **kwargs)
        except httpx.HTTPError as err:
            logger.error("GET request to %s failed: %s", path, err)
            raise BackendClientError(f"Backend GET {path} failed: {err}") from err

    async def _post_json(
        self, path: str, payload: Mapping[str, object]
    ) -> dict[str, Any]:
        try:
            response = await self._client.post(path, json=payload)
        except httpx.HTTPError as err:
            logger.error("POST request to %s failed: %s", path, err)
            raise BackendClientError(f"Backend POST {path} failed: {err}") from err
        if response.status_code >= 400:
            detail = _error_detail(response)
            logger.warning(
                "Backend POST %s returned %s: %s", path, response.status_code, detail
            )
            raise BackendAPIError(response.status_code, detail)
        try:
            data = response.json()
        except ValueError as err:
            logger.error("Backend POST %s returned invalid JSON: %s", path, err)
            raise BackendClientError(
                f"Backend POST {path} returned invalid JSON"
            ) from err
        if not isinstance(data, dict):
            raise BackendClientError(f"Backend POST {path} returned non-object JSON")
        return data

    async def get_telegram_user(self, telegram_id: int) -> BotUser:
        """Resolve the Zeta user and role bound to a Telegram account."""
        payload = await self._post_json(
            "/auth/telegram/bot", {"telegram_id": telegram_id}
        )
        return _validate_payload(BotUser, payload, "/auth/telegram/bot")

    async def parse_homework_draft(self, telegram_id: int, text: str) -> HomeworkDraft:
        """Send free-form homework text to the backend for structuring."""
        payload = await self._post_json(
            "/homework/parse-from-text", {"telegram_id": telegram_id, "text": text}
        )
        return _validate_payload(HomeworkDraft, payload, "/homework/parse-from-text")

    async def confirm_homework_draft(
        self, telegram_id: int, draft_id: str
    ) -> ConfirmedHomework:
        """Persist a previously parsed homework draft."""
        payload = await self._post_json(
            "/homework/confirm-draft",
            {"telegram_id": telegram_id, "draft_id": draft_id},
        )
        return _validate_payload(ConfirmedHomework, payload, "/homework/confirm-draft")

    async def ask_question(self, telegram_id: int, question: str) -> AskResponse:
        """Ask the LLM a question scoped to the user's group and subgroup."""
        payload = await self._post_json(
            "/llm/ask", {"telegram_id": telegram_id, "question": question}
        )
        return _validate_payload(AskResponse, payload, "/llm/ask")
