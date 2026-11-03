"""API tests for the schedule Excel import endpoint."""

from io import BytesIO
from typing import Any
from unittest.mock import AsyncMock

from httpx import AsyncClient
from openpyxl.workbook import Workbook
from openpyxl.worksheet.worksheet import Worksheet
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth.models import RoleEnum, User
from backend.auth.security import create_access_token
from backend.config import Settings
from backend.main import app
from backend.schedule.dependencies import get_llm_fallback_service
from backend.schedule.llm_fallback import LLMFallbackService
from backend.schedule.models import LessonCellExtraction, WeekParity

SHEET = "Расписание (бак., спец.)"
XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def _add_headers(ws: Worksheet) -> None:
    ws["A1"] = "День недели"
    ws["B1"] = "Часы звонков"
    ws["C1"] = "1 курс"
    ws["D1"] = "1 курс"
    ws.merge_cells("C1:D1")
    ws["C2"] = "1 группа"
    ws["D2"] = "2 группа"
    direction = 'Направление "Информационные системы и технологии"'
    ws["C3"] = direction
    ws["D3"] = direction
    profile = 'профиль "Инженерия ИСТ"'
    ws["C4"] = profile
    ws["D4"] = profile


def _new_workbook(sheet_name: str = SHEET) -> tuple[Workbook, Worksheet]:
    wb = Workbook()
    ws = wb.active
    ws.title = sheet_name
    _add_headers(ws)
    return wb, ws


def _to_bytes(wb: Workbook) -> bytes:
    buffer = BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


async def _auth_headers(
    db_session: AsyncSession,
    settings: Settings,
    *,
    telegram_id: int,
    role: str,
) -> dict[str, str]:
    user = User(telegram_id=telegram_id, role=role, token_version=1)
    db_session.add(user)
    await db_session.flush()
    token = create_access_token(
        subject=str(user.id),
        role=user.role,
        token_version=user.token_version,
        secret_key=settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )
    return {"Authorization": f"Bearer {token}"}


async def _admin_headers(
    db_session: AsyncSession, settings: Settings
) -> dict[str, str]:
    return await _auth_headers(
        db_session, settings, telegram_id=9001, role=RoleEnum.ADMIN.value
    )


async def _parse(
    client: AsyncClient,
    headers: dict[str, str],
    wb: Workbook,
    filename: str = "schedule.xlsx",
) -> dict[str, Any]:
    response = await client.post(
        "/schedule/parse",
        headers=headers,
        files={"file": (filename, _to_bytes(wb), XLSX_MIME)},
    )
    assert response.status_code == 200, response.text
    payload: dict[str, Any] = response.json()
    return payload


async def test_parse_returns_lessons_with_parity_and_groups(
    client: AsyncClient, db_session: AsyncSession, test_settings: Settings
) -> None:
    """Standard cells are parsed, merged lectures fan out to every group."""
    wb, ws = _new_workbook()
    ws["A5"] = "Понедельник"
    ws["B5"] = "8:00 - 9:35"
    ws["C5"] = "Введение в программирование (id=10570) ст.преп. Соломатин Д.И. (ДО)"
    ws.merge_cells("C5:D5")
    ws["C6"] = "Технологии искусственного интеллекта  асс. Крутаков Р.С.  295"
    ws["D6"] = "Моделирование бизнес-процессов доц. Громковский А.А. 314П"
    ws.merge_cells("A5:A6")
    ws.merge_cells("B5:B6")

    data = await _parse(client, await _admin_headers(db_session, test_settings), wb)

    assert data["regex_parsed_count"] == 3
    assert data["unresolved_count"] == 0
    lessons = data["lessons"]

    lecture = [item for item in lessons if item["subject"].startswith("Введение")]
    assert len(lecture) == 2
    assert {item["group"] for item in lecture} == {"1 группа", "2 группа"}
    assert lecture[0]["subject_id"] == "10570"
    assert lecture[0]["teacher_title"] == "ст.преп."
    assert lecture[0]["room"] == "ДО"
    assert lecture[0]["is_online"] is True
    assert lecture[0]["week_parity"] == WeekParity.NUMERATOR
    assert lecture[0]["start_time"] == "08:00"
    assert lecture[0]["end_time"] == "09:35"

    practice = next(
        item
        for item in lessons
        if item["group"] == "1 группа" and item["subject"].startswith("Технологии")
    )
    assert practice["room"] == "295"
    assert practice["week_parity"] == WeekParity.DENOMINATOR

    lab = next(item for item in lessons if item["subject"].startswith("Моделирование"))
    assert lab["room"] == "314П"
    assert lab["group"] == "2 группа"


async def test_unstructured_cell_falls_back_to_llm(
    client: AsyncClient, db_session: AsyncSession, test_settings: Settings
) -> None:
    """Cells the regex parser rejects are resolved by the LLM service."""
    wb, ws = _new_workbook()
    ws["A5"] = "Понедельник"
    ws["B5"] = "8:00 - 9:35"
    ws["C5"] = "Военная подготовка"

    mock_client = AsyncMock()
    mock_client.complete_structured.return_value = LessonCellExtraction(
        subject="Военная подготовка",
        room="ВУЦ",
        lesson_type="practice",
        notes=["ВУЦ"],
    )
    app.dependency_overrides[get_llm_fallback_service] = lambda: LLMFallbackService(
        client=mock_client
    )

    data = await _parse(client, await _admin_headers(db_session, test_settings), wb)

    assert data["llm_parsed_count"] == 1
    lesson = data["lessons"][0]
    assert lesson["subject"] == "Военная подготовка"
    assert lesson["room"] == "ВУЦ"
    assert lesson["parsed_by"] == "llm"

    mock_client.complete_structured.assert_awaited_once()
    prompt, schema = mock_client.complete_structured.await_args.args
    assert "Военная подготовка" in prompt
    assert schema is LessonCellExtraction


async def test_unstructured_cell_without_llm_stays_unresolved(
    client: AsyncClient, db_session: AsyncSession, test_settings: Settings
) -> None:
    """Without an LLM API key the endpoint degrades instead of failing."""
    wb, ws = _new_workbook()
    ws["A5"] = "Понедельник"
    ws["B5"] = "8:00 - 9:35"
    ws["C5"] = "Военная подготовка"

    data = await _parse(client, await _admin_headers(db_session, test_settings), wb)

    assert data["unresolved_count"] == 1
    assert data["lessons"] == []


async def test_parse_requires_admin(
    client: AsyncClient, db_session: AsyncSession, test_settings: Settings
) -> None:
    """Only administrators may upload a university-wide timetable."""
    wb, _ = _new_workbook()
    student_headers = await _auth_headers(
        db_session, test_settings, telegram_id=9002, role=RoleEnum.STUDENT.value
    )

    forbidden = await client.post(
        "/schedule/parse",
        headers=student_headers,
        files={"file": ("schedule.xlsx", _to_bytes(wb), XLSX_MIME)},
    )
    assert forbidden.status_code == 403

    anonymous = await client.post(
        "/schedule/parse",
        files={"file": ("schedule.xlsx", _to_bytes(wb), XLSX_MIME)},
    )
    assert anonymous.status_code == 401


async def test_parse_rejects_non_xlsx_file(
    client: AsyncClient, db_session: AsyncSession, test_settings: Settings
) -> None:
    """Uploading anything but .xlsx is a client error."""
    wb, _ = _new_workbook()

    response = await client.post(
        "/schedule/parse",
        headers=await _admin_headers(db_session, test_settings),
        files={"file": ("schedule.csv", _to_bytes(wb), "text/csv")},
    )

    assert response.status_code == 415


async def test_parse_rejects_workbook_without_schedule_sheets(
    client: AsyncClient, db_session: AsyncSession, test_settings: Settings
) -> None:
    """A changed workbook structure produces a clear error, not an empty result."""
    wb, _ = _new_workbook(sheet_name="Лист1")

    response = await client.post(
        "/schedule/parse",
        headers=await _admin_headers(db_session, test_settings),
        files={"file": ("schedule.xlsx", _to_bytes(wb), XLSX_MIME)},
    )

    assert response.status_code == 422
    assert "schedule" in response.json()["detail"].lower()
