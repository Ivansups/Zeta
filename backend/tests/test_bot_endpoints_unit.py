import uuid
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from backend.auth.models import RoleEnum, User
from backend.db.session import get_session
from backend.homework.models import HomeworkDraft
from backend.main import app


@pytest.mark.asyncio
async def test_bot_user_endpoint_known_and_guest() -> None:
    mock_session = AsyncMock()
    group_id = uuid.uuid4()
    known_user = User(
        id=uuid.uuid4(),
        telegram_id=123456789,
        role=RoleEnum.STUDENT.value,
        group_id=group_id,
        subgroup_number=2,
    )
    mock_res_known = MagicMock()
    mock_res_known.scalar_one_or_none.return_value = known_user

    mock_res_guest = MagicMock()
    mock_res_guest.scalar_one_or_none.return_value = None

    # First call: known user, Second call: guest
    mock_session.execute.side_effect = [mock_res_known, mock_res_guest]

    app.dependency_overrides[get_session] = lambda: mock_session
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # Known user
            resp = await client.post(
                "/auth/telegram/bot", json={"telegram_id": 123456789}
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["telegram_id"] == 123456789
            assert data["role"] == "student"
            assert data["group_id"] == str(group_id)
            assert data["subgroup"] == 2

            # Guest
            resp_guest = await client.post(
                "/auth/telegram/bot", json={"telegram_id": 999999999}
            )
            assert resp_guest.status_code == 200
            data_guest = resp_guest.json()
            assert data_guest["telegram_id"] == 999999999
            assert data_guest["role"] == "guest"
            assert data_guest["group_id"] is None
            assert data_guest["subgroup"] is None
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

    from datetime import UTC, datetime, timedelta

    draft_record = HomeworkDraft(
        id=uuid.uuid4(),
        group_id=group_id,
        created_by_id=elder_user.id,
        subject="Математический анализ",
        description="номера 12-18",
        subgroup=1,
        deadline=datetime.now(UTC) + timedelta(days=2),
        expires_at=datetime.now(UTC) + timedelta(hours=1),
    )

    def mock_scalar(val: Any) -> MagicMock:
        m = MagicMock()
        m.scalar_one_or_none.return_value = val
        return m

    # Call 1: parse -> select(User)
    # Call 2: confirm -> select(User)
    # Call 3: confirm -> select(HomeworkDraft)
    mock_session.execute.side_effect = [
        mock_scalar(elder_user),
        mock_scalar(elder_user),
        mock_scalar(draft_record),
    ]

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
                    "draft_id": str(draft_record.id),
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
        telegram_id=444555666,
        role=RoleEnum.STUDENT.value,
        group_id=group_id,
        subgroup_number=1,
    )

    # 1. select user -> student_user
    mock_user_res = MagicMock()
    mock_user_res.scalar_one_or_none.return_value = student_user

    # 2. select homeworks -> empty list
    mock_hw_res = MagicMock()
    mock_hw_res.scalars.return_value.all.return_value = []

    mock_session.execute.side_effect = [mock_user_res, mock_hw_res]

    app.dependency_overrides[get_session] = lambda: mock_session
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/llm/ask",
                json={
                    "telegram_id": 444555666,
                    "question": "Что задали по математике?",
                },
            )
            assert resp.status_code == 200
            data = resp.json()
            assert "answer" in data
            assert isinstance(data["items"], list)
    finally:
        app.dependency_overrides.pop(get_session, None)
