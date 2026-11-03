"""Prompt templates for schedule cell parsing."""


def build_schedule_cell_prompt(raw_text: str) -> str:
    """Construct the prompt for extracting fields from one schedule cell."""
    return (
        "Ты — парсер расписания вуза. Извлеки структурированную информацию "
        "из текста одной ячейки таблицы.\n\n"
        f"Текст ячейки: '{raw_text}'"
    )
