"""Unit tests for bot integration endpoints."""

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from backend.auth.models import RoleEnum, User
from backend.db.session import get_session
from backend.main import app


@pytest.mark.asyncio
async def test_auth_telegram_bot_existing_user() -> None:
    mock_session = AsyncMock()
    user_id = uuid.uuid4()
    group_id = uuid.uuid4()
    fake_user = User(
        id=user_id,
        telegram_id=123456789,
        role=RoleEnum.ELDER.value,
        group_id=group_id,
        subgroup_number=1,
    )
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = fake_user
    mock_session.execute.return_value = mock_res

    app.dependency_overrides[get_session] = lambda: mock_session
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/auth/telegram/bot", json={"telegram_id": 123456789}
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["telegram_id"] == 123456789
            assert data["role"] == "elder"
            assert data["group_id"] == str(group_id)
            assert data["subgroup"] == 1
    finally:
        app.dependency_overrides.pop(get_session, None)


@pytest.mark.asyncio
async def test_auth_telegram_bot_guest_user() -> None:
    mock_session = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_res

    app.dependency_overrides[get_session] = lambda: mock_session
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/auth/telegram/bot", json={"telegram_id": 999999999}
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["telegram_id"] == 999999999
            assert data["role"] == "guest"
            assert data["group_id"] is None
            assert data["subgroup"] is None
    finally:
        app.dependency_overrides.pop(get_session, None)


@pytest.mark.asyncio
async def test_homework_parse_and_confirm_draft() -> None:
    mock_session = AsyncMock()
    group_id = uuid.uuid4()
    elder_user = User(
        id=uuid.uuid4(),
        telegram_id=111222333,
        role=RoleEnum.ELDER.value,
        group_id=group_id,
        subgroup_number=1,
    )
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = elder_user
    mock_session.execute.return_value = mock_res

    app.dependency_overrides[get_session] = lambda: mock_session
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Parse draft
            parse_resp = await client.post(
                "/homework/parse-from-text",
                json={
                    "telegram_id": 111222333,
                    "text": "ДЗ по матану: номера 12-18 к пятнице для 1 подгруппы",
                },
            )
            assert parse_resp.status_code == 200
            draft = parse_resp.json()
            assert "draft_id" in draft
            assert (
                "Математический анализ" in draft["subject"]
                or "матан" in draft["subject"].lower()
            )
            assert draft["subgroup"] == 1
            assert "12-18" in draft["description"]

            # 2. Confirm draft
            confirm_resp = await client.post(
                "/homework/confirm-draft",
                json={
                    "telegram_id": 111222333,
                    "draft_id": draft["draft_id"],
                },
            )
            assert confirm_resp.status_code == 200
            confirmed = confirm_resp.json()
            assert "id" in confirmed
            assert confirmed["subgroup"] == 1
    finally:
        app.dependency_overrides.pop(get_session, None)


@pytest.mark.asyncio
async def test_llm_ask_endpoint() -> None:
    mock_session = AsyncMock()
    group_id = uuid.uuid4()
    student_user = User(
        id=uuid.uuid4(),
        telegram_id=987654321,
        role=RoleEnum.STUDENT.value,
        group_id=group_id,
        subgroup_number=1,
    )
    mock_user_res = MagicMock()
    mock_user_res.scalar_one_or_none.return_value = student_user

    mock_hw_res = MagicMock()
    mock_hw_res.scalars.return_value.all.return_value = []
    mock_session.execute.side_effect = [mock_user_res, mock_hw_res]

    app.dependency_overrides[get_session] = lambda: mock_session
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/llm/ask",
                json={"telegram_id": 987654321, "question": "Какие ДЗ на завтра?"},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert "answer" in data
            assert isinstance(data["items"], list)
    finally:
        app.dependency_overrides.pop(get_session, None)
