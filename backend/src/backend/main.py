from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth.router import router as auth_router
from backend.db.session import get_session
from backend.homework.router import router as homework_router
from backend.llm.router import router as llm_router
from backend.schedule.router import router as schedule_router

app = FastAPI(title="Zeta")

app.include_router(auth_router)
app.include_router(homework_router)
app.include_router(llm_router)
app.include_router(schedule_router)


@app.get("/health")
async def health(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> dict[str, str]:
    """Readiness probe: reports unhealthy when the database is unreachable."""
    try:
        await session.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="database unavailable",
        ) from exc
    return {"status": "ok"}
