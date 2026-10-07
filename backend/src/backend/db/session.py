from collections.abc import AsyncGenerator
from functools import lru_cache

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from backend.config import Settings


def create_session_factory(database_url: str) -> async_sessionmaker[AsyncSession]:
    """Build a session factory bound to a new async engine."""
    engine = create_async_engine(database_url)
    return async_sessionmaker(engine, expire_on_commit=False)


@lru_cache
def _default_session_factory() -> async_sessionmaker[AsyncSession]:
    return create_session_factory(Settings().database_url)


async def get_session() -> AsyncGenerator[AsyncSession]:
    """FastAPI dependency yielding a request-scoped `AsyncSession`."""
    async with _default_session_factory()() as session:
        yield session
