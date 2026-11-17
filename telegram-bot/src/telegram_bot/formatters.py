"""Text formatting for homework drafts and answers."""

import html
from collections import OrderedDict

from telegram_bot.api_models import (
    AskResponse,
    ConfirmedHomework,
    HomeworkDraft,
    HomeworkItem,
)

DATE_FORMAT = "%d.%m.%Y"
DATETIME_FORMAT = "%d.%m.%Y %H:%M"


def _format_deadline(draft: HomeworkDraft | ConfirmedHomework) -> str | None:
    if draft.deadline is None:
        return None
    return draft.deadline.strftime(DATETIME_FORMAT)


def format_draft_card(draft: HomeworkDraft) -> str:
    """Render a homework draft card with HTML markup for Telegram."""
    lines = [
        "🗒 <b>Черновик домашнего задания</b>",
        f"Предмет: <b>{html.escape(draft.subject)}</b>",
    ]
    deadline = _format_deadline(draft)
    if deadline is not None:
        lines.append(f"Дата: {deadline}")
    if draft.pair_number is not None:
        lines.append(f"Пара: {draft.pair_number}")
    if draft.subgroup is not None:
        lines.append(f"Подгруппа: {draft.subgroup}")
    lines.append(f"Задание: {html.escape(draft.description)}")
    lines.append("")
    lines.append("Подтвердить запись?")
    return "\n".join(lines)


def format_confirmation(confirmed: ConfirmedHomework) -> str:
    """Render a success message after homework is saved."""
    lines = [
        "✅ <b>ДЗ сохранено</b>",
        f"Предмет: <b>{html.escape(confirmed.subject)}</b>",
    ]
    deadline = _format_deadline(confirmed)
    if deadline is not None:
        lines.append(f"Дата: {deadline}")
    if confirmed.pair_number is not None:
        lines.append(f"Пара: {confirmed.pair_number}")
    if confirmed.subgroup is not None:
        lines.append(f"Подгруппа: {confirmed.subgroup}")
    return "\n".join(lines)


def _format_item(item: HomeworkItem) -> str:
    text = f"• {html.escape(item.subject)} — {html.escape(item.description)}"
    if item.subgroup is not None:
        text += f" (подгруппа {item.subgroup})"
    return text


def format_ask_response(response: AskResponse) -> str:
    """Render an LLM answer followed by homework grouped by day."""
    if not response.items:
        return response.answer

    groups: OrderedDict[str, list[HomeworkItem]] = OrderedDict()
    undated: list[HomeworkItem] = []
    for item in response.items:
        if item.deadline is None:
            undated.append(item)
            continue
        day = item.deadline.strftime(DATE_FORMAT)
        groups.setdefault(day, []).append(item)

    lines = [html.escape(response.answer), "", "📚 <b>Задания:</b>"]
    for day, items in groups.items():
        lines.append(f"<b>{day}</b>")
        lines.extend(_format_item(item) for item in items)
    if undated:
        lines.append("<b>Без даты</b>")
        lines.extend(_format_item(item) for item in undated)
    return "\n".join(lines)
