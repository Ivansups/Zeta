import pytest
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine

from backend.config import Settings

TEST_DB_NAME = "zeta_test"


@pytest.fixture(scope="session")
async def test_database_url() -> str:
    """Create the scratch database once and return its async URL."""
    url = make_url(Settings().database_url)
    admin_engine = create_async_engine(
        url.set(database="postgres"), isolation_level="AUTOCOMMIT"
    )
    async with admin_engine.connect() as conn:
        exists = await conn.scalar(
            text("SELECT 1 FROM pg_database WHERE datname = :name"),
            {"name": TEST_DB_NAME},
        )
        if not exists:
            await conn.execute(text(f'CREATE DATABASE "{TEST_DB_NAME}"'))
    await admin_engine.dispose()
    return url.set(database=TEST_DB_NAME).render_as_string(hide_password=False)
