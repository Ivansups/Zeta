from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.session import create_session_factory, get_session


async def test_session_executes_queries(test_database_url: str) -> None:
    factory = create_session_factory(test_database_url)

    async with factory() as session:
        result = await session.execute(text("SELECT 1"))

    assert result.scalar_one() == 1


async def test_get_session_dependency_yields_async_session() -> None:
    generator = get_session()

    session = await anext(generator)

    assert isinstance(session, AsyncSession)
    await generator.aclose()
