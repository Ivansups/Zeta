from fastapi import FastAPI

from backend.auth.router import router as auth_router

app = FastAPI(title="Zeta")

app.include_router(auth_router)


@app.get("/health")
async def health() -> dict[str, str]:
    """Liveness probe."""
    return {"status": "ok"}
