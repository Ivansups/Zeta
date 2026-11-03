"""Deterministic regex-based parser for schedule cell contents."""

import re

from backend.schedule.models import LessonCellData, LessonType

# Regex for optional subject ID like (id=10570)
ID_PATTERN = re.compile(r"\(id=(\d+)\)")

# Academic positions commonly found in schedules
TITLES = [
    r"ст\.преп\.",
    r"преп\.",
    r"доц\.",
    r"доцент",
    r"проф\.",
    r"профессор",
    r"асс\.",
    r"ассистент",
]
TITLE_GROUP = f"({'|'.join(TITLES)})"

# Teacher pattern: title + Surname N.P.
TEACHER_PATTERN = re.compile(
    rf"{TITLE_GROUP}\s+([А-ЯЁ][а-яё\-]+(?:\s+[А-ЯЁ]\.\s*[А-ЯЁ]\.|\s+[А-ЯЁ]\.))"
)

# Room pattern: (ДО) or 3-4 digit rooms with optional suffix (e.g. 295, 308П)
ONLINE_PATTERN = re.compile(r"\((ДО|дистант)\)", re.IGNORECASE)
PHYSICAL_ROOM_PATTERN = re.compile(
    r"(?:^|\s)(\d{2,4}[А-ЯЁA-Zа-яёa-z]?)(?:\s*$)", re.IGNORECASE
)


def parse_lesson_cell(raw_text: str) -> LessonCellData | None:
    """Attempt deterministic extraction of lesson attributes from raw cell text.

    Returns None if text structure is non-standard or cannot be safely parsed.
    """
    clean_text = raw_text.strip()
    if not clean_text:
        return None

    # Check for online flag
    is_online = False
    room: str | None = None
    notes: list[str] = []

    online_match = ONLINE_PATTERN.search(clean_text)
    if online_match:
        is_online = True
        room = online_match.group(1).upper()
        notes.append("ДО")
        # remove online tag from working text
        clean_text = ONLINE_PATTERN.sub("", clean_text).strip()

    # Extract subject ID if present
    subject_id: str | None = None
    id_match = ID_PATTERN.search(clean_text)
    if id_match:
        subject_id = id_match.group(1)
        clean_text = ID_PATTERN.sub("", clean_text).strip()

    # Search for teacher & title
    teacher_match = TEACHER_PATTERN.search(clean_text)
    if not teacher_match:
        # If no recognized teacher format, fail deterministic parsing
        return None

    teacher_title = teacher_match.group(1).strip()
    teacher_name = teacher_match.group(2).strip()

    # Subject is everything before the teacher match
    subject = clean_text[: teacher_match.start()].strip()
    # Remove any trailing commas, spaces, dashes
    subject = re.sub(r"[\s,\-]+$", "", subject).strip()
    if not subject:
        return None

    # Room is typically in the remaining part after teacher
    after_teacher = clean_text[teacher_match.end() :].strip()
    if not is_online:
        room_match = PHYSICAL_ROOM_PATTERN.search(after_teacher)
        if room_match:
            room = room_match.group(1).strip()
        elif after_teacher:
            # Fallback to trailing token as room if simple
            tokens = after_teacher.split()
            if tokens and len(tokens[0]) <= 8:
                room = tokens[0]

    # Heuristic for lesson type
    lesson_type = LessonType.OTHER
    subject_lower = subject.lower()
    if "лекц" in subject_lower:
        lesson_type = LessonType.LECTURE
    elif "практ" in subject_lower:
        lesson_type = LessonType.PRACTICE
    elif "лаб" in subject_lower:
        lesson_type = LessonType.LAB

    return LessonCellData(
        subject=subject,
        subject_id=subject_id,
        teacher=teacher_name,
        teacher_title=teacher_title,
        room=room,
        is_online=is_online,
        lesson_type=lesson_type,
        notes=notes,
        parsed_by="regex",
    )
