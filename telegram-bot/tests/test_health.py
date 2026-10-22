import pytest

from services.health import HealthService


@pytest.mark.asyncio
async def test_health_service_check() -> None:
    svc = HealthService()
    result = await svc.check()
    assert result == {"status": "ok"}
