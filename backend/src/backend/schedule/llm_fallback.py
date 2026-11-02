"""LLM fallback service for resolving complex or non-standard schedule cells."""

import json
from typing import Any, Protocol, runtime_checkable

import httpx

from backend.schedule.models import LessonCellData, LessonType


@runtime_checkable
class LLMClientProtocol(Protocol):
    """Protocol for LLM client handling JSON completions."""

    async def complete_json(self, prompt: str) -> dict[str, Any]:
        """Send prompt and receive parsed JSON dictionary."""
        ...


class HttpLLMClient:
    """HTTP client for OpenAI-compatible LLM endpoints."""

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.openai.com/v1",
        model: str = "gpt-4o-mini",
        timeout: float = 30.0,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout
        self._http_client = http_client

    async def complete_json(self, prompt: str) -> dict[str, Any]:
        """Send chat completion request expecting JSON object."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "response_format": {"type": "json_object"},
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a timetable parser. Always respond with valid JSON."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.0,
        }
        if self._http_client is not None:
            resp = await self._http_client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
            )
        else:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                )
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        result: dict[str, Any] = json.loads(content)
        return result


class LLMFallbackService:
    """Service to fall back to an LLM when regex extraction fails."""

    def __init__(self, client: LLMClientProtocol | None = None) -> None:
        self.client = client

    def _build_prompt(self, raw_text: str, context: dict[str, Any]) -> str:
        """Construct the prompt instructing the LLM to extract schedule fields."""
        return (
            "Ты — парсер расписания вуза. Извлеки структурированную информацию "
            "из содержимого ячейки таблицы в формате JSON.\n\n"
            f"Контекст: {context}\n"
            f"Текст ячейки: '{raw_text}'\n\n"
            "Верни JSON со следующими полями:\n"
            "- subject: название предмета (str)\n"
            "- subject_id: числовой идентификатор предмета или null\n"
            "- teacher: ФИО преподавателя (str или null)\n"
            "- teacher_title: должность преподавателя (ст.преп./доц./проф./асс.)\n"
            "- room: номер аудитории или 'ДО'/'ВУЦ' (str или null)\n"
            "- is_online: флаг дистанционного формата (bool)\n"
            "- lesson_type: 'lecture', 'practice', 'lab', 'seminar' или 'other'\n"
            "- notes: список служебных пометок (e.g. ['ДО', 'ВУЦ'])\n"
        )

    async def resolve(
        self, raw_text: str, context: dict[str, Any]
    ) -> LessonCellData | None:
        """Query LLM to extract lesson info from an unstructured cell."""
        if not self.client:
            return None

        prompt = self._build_prompt(raw_text, context)
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
