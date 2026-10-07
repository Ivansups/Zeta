from fastapi import FastAPI

app = FastAPI(title="Zeta")


@app.get("/health")
async def health() -> dict[str, str]:
    """Liveness probe."""
    return {"status": "ok"}
