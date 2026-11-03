"""LLM fallback service for resolving complex or non-standard schedule cells."""

from backend.llm.client import LLMClientProtocol
from backend.schedule.models import LessonCellData, LessonCellExtraction
from backend.schedule.prompts import build_schedule_cell_prompt


class LLMFallbackService:
    """Service to fall back to an LLM when regex extraction fails."""

    def __init__(self, client: LLMClientProtocol | None = None) -> None:
        self.client = client

    async def resolve(self, raw_text: str) -> LessonCellData | None:
        """Query LLM to extract lesson info from an unstructured cell."""
        if not self.client:
            return None

        try:
            data = await self.client.complete_structured(
                build_schedule_cell_prompt(raw_text), LessonCellExtraction
            )
        except Exception:
            return None

        subject = data.subject.strip()
        if not subject:
            return None

        return LessonCellData(
            subject=subject,
            subject_id=data.subject_id,
            teacher=data.teacher,
            teacher_title=data.teacher_title,
            room=data.room,
            is_online=data.is_online,
            lesson_type=data.lesson_type,
            notes=data.notes,
            parsed_by="llm",
        )
