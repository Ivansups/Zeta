from fastapi import FastAPI

from backend.auth.router import router as auth_router
from backend.schedule.router import router as schedule_router

app = FastAPI(title="Zeta")

app.include_router(auth_router)
app.include_router(schedule_router)


@app.get("/health")
async def health() -> dict[str, str]:
    """Liveness probe."""
    return {"status": "ok"}
