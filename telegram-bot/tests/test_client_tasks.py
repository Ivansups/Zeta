import json
from datetime import UTC, datetime
from typing import cast

import httpx
import pytest

from telegram_bot.client import BackendAPIError, BackendClient, BackendClientError


def _json_body(request: httpx.Request) -> dict[str, object]:
    return cast(dict[str, object], json.loads(request.content))


async def test_parse_homework_draft_sends_text_and_telegram_id() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/homework/parse-from-text"
        assert _json_body(request) == {
            "telegram_id": 42,
            "text": "ДЗ матан: номер 12 к среде",
        }
        return httpx.Response(
            200,
            json={
                "draft_id": "draft-1",
                "subject": "Матан",
                "description": "Номер 12",
                "deadline": "2026-11-18T09:00:00Z",
                "pair_number": 2,
                "subgroup": 1,
            },
        )

    transport = httpx.MockTransport(handler)
    async with BackendClient(
        base_url="http://testbackend", transport=transport
    ) as client:
        draft = await client.parse_homework_draft(42, "ДЗ матан: номер 12 к среде")

    assert draft.draft_id == "draft-1"
    assert draft.subject == "Матан"
    assert draft.pair_number == 2
    assert draft.subgroup == 1
    assert draft.deadline == datetime(2026, 11, 18, 9, 0, tzinfo=UTC)


async def test_confirm_homework_draft_sends_draft_id() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/homework/confirm-draft"
        assert _json_body(request) == {"telegram_id": 42, "draft_id": "draft-1"}
        return httpx.Response(
            201,
            json={
                "id": "hw-1",
                "subject": "Матан",
                "description": "Номер 12",
                "deadline": "2026-11-18T09:00:00Z",
                "pair_number": 2,
                "subgroup": 1,
            },
        )

    transport = httpx.MockTransport(handler)
    async with BackendClient(
        base_url="http://testbackend", transport=transport
    ) as client:
        confirmed = await client.confirm_homework_draft(42, "draft-1")

    assert confirmed.id == "hw-1"
    assert confirmed.subject == "Матан"


async def test_ask_question_sends_question() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/llm/ask"
        assert _json_body(request) == {
            "telegram_id": 42,
            "question": "что задали по физике?",
        }
        return httpx.Response(
            200,
            json={
                "answer": "Вот задания на неделю.",
                "items": [
                    {
                        "subject": "Физика",
                        "description": "Лаба 3",
                        "deadline": "2026-11-19T23:59:00Z",
                        "subgroup": 2,
                    }
                ],
            },
        )

    transport = httpx.MockTransport(handler)
    async with BackendClient(
        base_url="http://testbackend", transport=transport
    ) as client:
        response = await client.ask_question(42, "что задали по физике?")

    assert response.answer == "Вот задания на неделю."
    assert len(response.items) == 1
    assert response.items[0].subject == "Физика"


async def test_backend_api_error_exposes_status_code() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404, json={"detail": "not bound to group"})

    transport = httpx.MockTransport(handler)
    async with BackendClient(
        base_url="http://testbackend", transport=transport
    ) as client:
        with pytest.raises(BackendAPIError) as exc_info:
            await client.ask_question(42, "что задали?")

    assert exc_info.value.status_code == 404


async def test_backend_invalid_json_raises_client_error() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text="<html>proxy</html>")

    transport = httpx.MockTransport(handler)
    async with BackendClient(
        base_url="http://testbackend", transport=transport
    ) as client:
        with pytest.raises(BackendClientError):
            await client.parse_homework_draft(42, "ДЗ")


async def test_backend_invalid_payload_raises_client_error() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"unexpected": True})

    transport = httpx.MockTransport(handler)
    async with BackendClient(
        base_url="http://testbackend", transport=transport
    ) as client:
        with pytest.raises(BackendClientError):
            await client.parse_homework_draft(42, "ДЗ")
