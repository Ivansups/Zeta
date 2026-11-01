from collections.abc import AsyncGenerator
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from backend.auth.dependencies import get_settings
from backend.config import Settings
from backend.db.session import get_session
from backend.main import app

TEST_DB_NAME = "zeta_test"
BACKEND_DIR = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="session")
def setup_test_database_sync() -> str:
    """Create the scratch database once synchronously and run migrations."""
    import asyncio

    async def _create_db() -> str:
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

    db_url = asyncio.run(_create_db())
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_DIR / "migrations"))
    config.set_main_option("sqlalchemy.url", db_url)
    command.upgrade(config, "head")
    return db_url


@pytest.fixture(scope="session")
def test_database_url(setup_test_database_sync: str) -> str:
    return setup_test_database_sync


@pytest.fixture
async def db_session(
    test_database_url: str,
) -> AsyncGenerator[AsyncSession]:
    """Yield a transactional session, truncating tables after test."""
    engine = create_async_engine(test_database_url)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        yield session

    # Очистка таблиц после теста
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "TRUNCATE TABLE audit_log, refresh_tokens, invite_tokens, "
                "users, groups RESTART IDENTITY CASCADE"
            )
        )
    await engine.dispose()


@pytest.fixture
def test_settings() -> Settings:
    return Settings(
        database_url=Settings().database_url,
        telegram_bot_token="mock_bot_token_for_tests",
        jwt_secret_key="mock_secret_key_at_least_32_bytes_long_for_tests",
        jwt_algorithm="HS256",
        access_token_expire_minutes=15,
        refresh_token_expire_days=30,
    )


@pytest.fixture
async def client(
    db_session: AsyncSession, test_settings: Settings
) -> AsyncGenerator[AsyncClient]:
    async def override_get_session() -> AsyncGenerator[AsyncSession]:
        yield db_session

    def override_get_settings() -> Settings:
        return test_settings

    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[get_settings] = override_get_settings

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
