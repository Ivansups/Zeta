"""Health check service.

# banan: dependency on #18 not confirmed. If not ready - use this stub.
"""

from __future__ import annotations


class HealthService:
    async def check(self) -> dict[str, str]:
        return {"status": "ok"}
