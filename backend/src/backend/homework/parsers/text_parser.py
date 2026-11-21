"""Text parsing helpers for extracting subject, subgroup, and deadline from homework messages."""

import re
from datetime import UTC, datetime, timedelta

SUBJECT_ALIASES: list[tuple[list[str], str]] = [
    (["матан", "математик", "матанализ"], "Математический анализ"),
    (["питон", "python", "пайтон"], "Программирование на Python"),
    (["алгоритм", "структур", "аисд"], "Алгоритмы и структуры данных"),
    (["англ", "english", "инглиш"], "Английский язык"),
    (["дискрет", "кнф", "днф"], "Дискретная математика"),
    (["истор"], "История России"),
]

WEEKDAY_MAP: dict[str, int] = {
    "понедельник": 0,
    "пн": 0,
    "вторник": 1,
    "вт": 1,
    "среда": 2,
    "среду": 2,
    "ср": 2,
    "четверг": 3,
    "четвергу": 3,
    "чт": 3,
    "пятниц": 4,
    "пятнице": 4,
    "пт": 4,
    "суббот": 5,
    "субботе": 5,
    "сб": 5,
    "воскресень": 6,
    "вс": 6,
}


def extract_subject(norm_text: str) -> str:
    """Detect known subject name from text, defaulting to 'Домашнее задание'."""
    for keywords, alias in SUBJECT_ALIASES:
        if any(kw in norm_text for kw in keywords):
            return alias
    return "Домашнее задание"


def extract_subgroup(norm_text: str) -> int | None:
    """Detect subgroup 1 or 2 from text."""
    if re.search(r"(\b1\s*подгрупп|подгрупп[а-я]*\s*1|перв[а-я]*\s*подгрупп)", norm_text):
        return 1
    if re.search(r"(\b2\s*подгрупп|подгрупп[а-я]*\s*2|втор[а-я]*\s*подгрупп)", norm_text):
        return 2
    return None


def extract_deadline(norm_text: str, base_time: datetime | None = None) -> datetime:
    """Calculate target deadline date and set time to 23:59:00."""
    now = base_time or datetime.now(UTC)
    deadline: datetime = (now + timedelta(days=1)).replace(
        hour=23, minute=59, second=0, microsecond=0
    )

    for w_name, w_idx in WEEKDAY_MAP.items():
        if w_name in norm_text:
            diff = (w_idx - now.weekday()) % 7
            if diff == 0:
                diff = 7
            deadline = (now + timedelta(days=diff)).replace(
                hour=23, minute=59, second=0, microsecond=0
            )
            break
    return deadline


def clean_homework_description(text: str) -> str:
    """Strip keywords, day names, and prefixes leaving only the actual homework instructions."""
    cleaned = re.sub(r"(?i)^дз[:\s]*", "", text).strip()
    cleaned = re.sub(
        r"(?i)(?:для\s*)?(?:[12]\s*подгрупп[а-я]*|вся\s*группа|для\s*всех)",
        "",
        cleaned,
    ).strip()
    cleaned = re.sub(
        r"(?i)(?:по\s*)?(?:матану?|математике?|питону?|python|алгоритмам?|аисд|английскому?|english|дискретке?|истории?)",
        "",
        cleaned,
    ).strip()
    cleaned = re.sub(
        r"(?i)(?:к|на)\s*(?:четвергу?|пятнице?|субботе?|понедельнику?|вторнику?|среде?|завтра|сегодня)",
        "",
        cleaned,
    ).strip(" ,.:;-")

    if len(cleaned) < 3:
        return text.strip()
    return cleaned
