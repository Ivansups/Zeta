from datetime import UTC, datetime

from telegram_bot.api_models import (
    AskResponse,
    ConfirmedHomework,
    HomeworkDraft,
    HomeworkItem,
)
from telegram_bot.formatters import (
    format_ask_response,
    format_confirmation,
    format_draft_card,
)


def _deadline(day: int = 18, hour: int = 9) -> datetime:
    return datetime(2026, 11, day, hour, 0, tzinfo=UTC)


def test_format_draft_card_contains_all_fields_and_escapes_html() -> None:
    draft = HomeworkDraft(
        draft_id="draft-1",
        subject="Матан <b>",
        description="Номер 12 & 13",
        deadline=_deadline(),
        pair_number=2,
        subgroup=1,
    )

    text = format_draft_card(draft)

    assert "Черновик" in text
    assert "Матан &lt;b&gt;" in text
    assert "Номер 12 &amp; 13" in text
    assert "18.11.2026" in text
    assert "2" in text
    assert "Подгруппа" in text


def test_format_draft_card_handles_missing_optional_fields() -> None:
    draft = HomeworkDraft(
        draft_id="draft-1",
        subject="Физика",
        description="Лаба",
    )

    text = format_draft_card(draft)

    assert "Физика" in text
    assert "Дата" not in text
    assert "Пара" not in text
    assert "Подгруппа" not in text


def test_format_confirmation_contains_subject_and_slot() -> None:
    confirmed = ConfirmedHomework(
        id="hw-1",
        subject="Матан",
        deadline=_deadline(),
        pair_number=2,
    )

    text = format_confirmation(confirmed)

    assert "Матан" in text
    assert "18.11.2026" in text
    assert "2" in text


def test_format_ask_response_groups_items_by_day() -> None:
    response = AskResponse(
        answer="Вот задания.",
        items=[
            HomeworkItem(
                subject="Матан",
                description="№12",
                deadline=_deadline(day=18),
            ),
            HomeworkItem(
                subject="Физика",
                description="Лаба",
                deadline=_deadline(day=18, hour=12),
            ),
            HomeworkItem(
                subject="История",
                description="Эссе",
                deadline=_deadline(day=19),
            ),
        ],
    )

    text = format_ask_response(response)

    assert "Вот задания." in text
    assert "18.11.2026" in text
    assert "19.11.2026" in text
    assert text.count("18.11.2026") == 1
    assert "Матан" in text
    assert "Физика" in text
    assert "История" in text


def test_format_ask_response_without_items_returns_answer_only() -> None:
    response = AskResponse(answer="ДЗ не найдены.")

    assert format_ask_response(response) == "ДЗ не найдены."
