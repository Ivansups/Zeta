"""Unit and integration tests for schedule Excel parser and LLM fallback."""

from unittest.mock import AsyncMock

import httpx
import pytest
from openpyxl import Workbook

from backend.schedule.cell_parser import parse_lesson_cell
from backend.schedule.excel_parser import ScheduleExcelParser
from backend.schedule.llm_fallback import HttpLLMClient, LLMFallbackService
from backend.schedule.models import WeekParity


def test_parse_standard_cell_with_id_and_online() -> None:
    """Parse cell with subject, subject ID, academic title, teacher and online room."""
    raw = "Введение в программирование (id=10570) ст.преп. Соломатин Д.И. (ДО)"
    result = parse_lesson_cell(raw)

    assert result is not None
    assert result.subject == "Введение в программирование"
    assert result.subject_id == "10570"
    assert result.teacher_title == "ст.преп."
    assert result.teacher == "Соломатин Д.И."
    assert result.room == "ДО"
    assert result.is_online is True
    assert result.parsed_by == "regex"


def test_parse_cell_with_physical_room_and_no_id() -> None:
    """Parse cell with physical classroom and no subject id."""
    raw = "Технологии искусственного интеллекта  асс. Крутаков Р.С.  295"
    result = parse_lesson_cell(raw)

    assert result is not None
    assert result.subject == "Технологии искусственного интеллекта"
    assert result.subject_id is None
    assert result.teacher_title == "асс."
    assert result.teacher == "Крутаков Р.С."
    assert result.room == "295"
    assert result.is_online is False
    assert result.parsed_by == "regex"


def test_parse_cell_with_suffix_room() -> None:
    """Parse cell with room with letter suffix (e.g. 308П or 314П)."""
    raw = "Моделирование бизнес-процессов (id=30582) доц. Громковский А.А. 314П"
    result = parse_lesson_cell(raw)

    assert result is not None
    assert result.subject == "Моделирование бизнес-процессов"
    assert result.subject_id == "30582"
    assert result.teacher_title == "доц."
    assert result.teacher == "Громковский А.А."
    assert result.room == "314П"
    assert result.is_online is False


def test_unstructured_cell_returns_none_for_deterministic_parser() -> None:
    """Non-standard cells without teacher or irregular layout fail regex parsing."""
    raw = "Военная подготовка"
    result = parse_lesson_cell(raw)
    assert result is None


@pytest.mark.asyncio
async def test_llm_fallback_resolves_unstructured_cell() -> None:
    """LLM fallback is invoked when deterministic parsing fails."""
    mock_client = AsyncMock()
    mock_client.complete_json.return_value = {
        "subject": "Военная подготовка",
        "subject_id": None,
        "teacher": None,
        "teacher_title": None,
        "room": "ВУЦ",
        "is_online": False,
        "lesson_type": "practice",
        "notes": ["ВУЦ"],
    }

    fallback_service = LLMFallbackService(client=mock_client)
    res = await fallback_service.resolve(
        raw_text="Военная подготовка",
        context={"day": "Понедельник", "pair": 1, "group": "14 группа"},
    )

    assert res is not None
    assert res.subject == "Военная подготовка"
    assert res.room == "ВУЦ"
    assert res.parsed_by == "llm"
    mock_client.complete_json.assert_awaited_once()


@pytest.mark.asyncio
async def test_http_llm_client_completes_json() -> None:
    """HttpLLMClient formats OpenAI JSON request and parses reply."""

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["Authorization"] == "Bearer test-key"
        content = (
            '{"choices": [{"message": {"content": "{\\"subject\\": '
            '\\"История\\", \\"room\\": \\"101\\"}"}}]}'
        )
        return httpx.Response(200, content=content.encode("utf-8"))

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as mock_http:
        client = HttpLLMClient(api_key="test-key", http_client=mock_http)
        res = await client.complete_json("Parse this cell")
        assert res["subject"] == "История"
        assert res["room"] == "101"


@pytest.mark.asyncio
async def test_schedule_excel_parser_end_to_end() -> None:
    """End-to-end parsing of an in-memory workbook with merged parity and groups."""
    wb = Workbook()
    ws = wb.active
    ws.title = "Расписание (бак., спец.)"

    # Row 1: Course
    ws["A1"] = "День недели"
    ws["B1"] = "Часы звонков"
    ws["C1"] = "1 курс"
    ws["D1"] = "1 курс"
    ws.merge_cells("C1:D1")

    # Row 2: Groups
    ws["C2"] = "1 группа"
    ws["D2"] = "2 группа"

    # Row 3: Direction
    ws["C3"] = 'Направление "Информационные системы и технологии"'
    ws["D3"] = 'Направление "Информационные системы и технологии"'

    # Row 4: Profile
    ws["C4"] = 'профиль "Инженерия ИСТ"'
    ws["D4"] = 'профиль "Инженерия ИСТ"'

    # Row 5: Monday 8:00 - 9:35 numerator
    ws["A5"] = "Понедельник"
    ws["B5"] = "8:00 - 9:35"
    ws["C5"] = "Введение в программирование (id=10570) ст.преп. Соломатин Д.И. (ДО)"
    # D5 is merged across C5:D5 (lecture for both groups 1 and 2)
    ws.merge_cells("C5:D5")

    # Row 6: denominator
    ws["C6"] = "Технологии искусственного интеллекта асс. Крутаков Р.С. 295"
    ws["D6"] = "Военная подготовка"

    # Merge time B5:B6 and day A5:A6
    ws.merge_cells("A5:A6")
    ws.merge_cells("B5:B6")

    # Mock LLM for D6 (Военная подготовка)
    mock_client = AsyncMock()
    mock_client.complete_json.return_value = {
        "subject": "Военная подготовка",
        "subject_id": None,
        "teacher": None,
        "teacher_title": None,
        "room": "ВУЦ",
        "is_online": False,
        "lesson_type": "practice",
        "notes": ["ВУЦ"],
    }
    fallback_service = LLMFallbackService(client=mock_client)

    parser = ScheduleExcelParser(llm_service=fallback_service)
    result = await parser.parse_workbook(wb)

    assert result.total_cells_processed >= 3
    assert result.regex_parsed_count >= 2
    assert result.llm_parsed_count == 1

    lessons = result.lessons
    c5_lessons = [
        item for item in lessons if item.subject == "Введение в программирование"
    ]
    assert len(c5_lessons) == 2
    assert {item.group for item in c5_lessons} == {"1 группа", "2 группа"}
    assert c5_lessons[0].week_parity == WeekParity.NUMERATOR
    assert c5_lessons[0].start_time == "08:00"
    assert c5_lessons[0].end_time == "09:35"
    assert c5_lessons[0].is_online is True

    d6_lessons = [item for item in lessons if item.subject == "Военная подготовка"]
    assert len(d6_lessons) == 1
    assert d6_lessons[0].group == "2 группа"
    assert d6_lessons[0].week_parity == WeekParity.DENOMINATOR
    assert d6_lessons[0].parsed_by == "llm"
