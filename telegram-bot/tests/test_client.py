import httpx
import pytest

from telegram_bot.client import BackendClient, BackendClientError


async def test_backend_client_healthcheck_success() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/health"
        return httpx.Response(200, json={"status": "ok"})

    transport = httpx.MockTransport(handler)
    async with BackendClient(
        base_url="http://testbackend", transport=transport
    ) as client:
        is_healthy = await client.healthcheck()
        assert is_healthy is True


async def test_backend_client_healthcheck_unhealthy() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, json={"status": "error"})

    transport = httpx.MockTransport(handler)
    async with BackendClient(
        base_url="http://testbackend", transport=transport
    ) as client:
        is_healthy = await client.healthcheck()
        assert is_healthy is False


async def test_backend_client_connection_error_handling() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("Connection refused")

    transport = httpx.MockTransport(handler)
    async with BackendClient(
        base_url="http://testbackend", transport=transport
    ) as client:
        with pytest.raises(BackendClientError):
            await client.get("/api/v1/some-endpoint")
