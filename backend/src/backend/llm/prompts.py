"""Centralized prompt templates for Zeta LLM services."""


def build_schedule_cell_prompt(raw_text: str) -> str:
    """Construct the prompt for extracting fields from one schedule cell."""
    return (
        "Ты — парсер расписания вуза. Извлеки структурированную информацию "
        "из текста одной ячейки таблицы.\n\n"
        f"Текст ячейки: '{raw_text}'"
    )


def build_student_qa_prompt(question: str, context: str) -> str:
    """Construct the prompt for answering student questions about homework and schedule."""
    return (
        "Ты — дружелюбный и лаконичный студенческий ассистент платформы Zeta.\n"
        "Отвечай на русском языке строго по делу, опираясь на данные ниже.\n\n"
        f"Список актуальных заданий группы:\n{context}\n\n"
        f"Вопрос студента: {question}\n\n"
        "Твой краткий ответ:"
    )
