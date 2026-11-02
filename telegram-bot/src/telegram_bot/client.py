"""HTTP client for Zeta Backend REST API."""

import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class BackendClientError(Exception):
    """Base exception for backend API client failures."""


class BackendClient:
    """Asynchronous client for interacting with Zeta Backend."""

    def __init__(
        self,
        base_url: str = "http://localhost:8000",
        timeout: float = 10.0,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        """Initialize the backend client with base URL and timeout."""
        self._base_url = base_url.rstrip("/")
        self._client = httpx.AsyncClient(
            base_url=self._base_url,
            timeout=timeout,
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
            if response.status_code == 200 and response.json().get("status") == "ok":
                return True
            logger.warning(
                "Backend healthcheck returned unexpected status: %s %s",
                response.status_code,
                response.text,
            )
            return False
        except httpx.HTTPError as err:
            logger.warning("Backend healthcheck failed with network error: %s", err)
            return False

    async def get(self, path: str, **kwargs: Any) -> httpx.Response:
        """Send GET request to backend."""
        try:
            return await self._client.get(path, **kwargs)
        except httpx.HTTPError as err:
            logger.error("GET request to %s failed: %s", path, err)
            raise BackendClientError(f"Backend GET {path} failed: {err}") from err

    async def post(self, path: str, **kwargs: Any) -> httpx.Response:
        """Send POST request to backend."""
        try:
            return await self._client.post(path, **kwargs)
        except httpx.HTTPError as err:
            logger.error("POST request to %s failed: %s", path, err)
            raise BackendClientError(f"Backend POST {path} failed: {err}") from err
