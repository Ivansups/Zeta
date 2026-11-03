"""Prompt templates for schedule cell parsing."""

from typing import Any


def build_schedule_cell_prompt(raw_text: str, context: dict[str, Any]) -> str:
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
