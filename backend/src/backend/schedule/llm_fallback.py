"""LLM fallback service for resolving complex or non-standard schedule cells."""

from typing import Any

from backend.llm.client import LLMClientProtocol
from backend.schedule.models import LessonCellData, LessonType
from backend.schedule.prompts import build_schedule_cell_prompt


class LLMFallbackService:
    """Service to fall back to an LLM when regex extraction fails."""

    def __init__(self, client: LLMClientProtocol | None = None) -> None:
        self.client = client

    async def resolve(
        self, raw_text: str, context: dict[str, Any]
    ) -> LessonCellData | None:
        """Query LLM to extract lesson info from an unstructured cell."""
        if not self.client:
            return None

        prompt = build_schedule_cell_prompt(raw_text, context)
        try:
            data = await self.client.complete_json(prompt)
            subject = str(data.get("subject", "")).strip()
            if not subject:
                return None

            lesson_type_raw = str(data.get("lesson_type", "other")).lower()
            try:
                lesson_type = LessonType(lesson_type_raw)
            except ValueError:
                lesson_type = LessonType.OTHER

            notes = data.get("notes") or []
            if not isinstance(notes, list):
                notes = [str(notes)]

            return LessonCellData(
                subject=subject,
                subject_id=str(data["subject_id"]) if data.get("subject_id") else None,
                teacher=str(data["teacher"]) if data.get("teacher") else None,
                teacher_title=str(data["teacher_title"])
                if data.get("teacher_title")
                else None,
                room=str(data["room"]) if data.get("room") else None,
                is_online=bool(data.get("is_online", False)),
                lesson_type=lesson_type,
                notes=[str(n) for n in notes],
                parsed_by="llm",
            )
        except Exception:
            return None
