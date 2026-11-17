"""Inline keyboards for homework drafts."""

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup


def build_draft_keyboard(draft_id: str) -> InlineKeyboardMarkup:
    """Create confirm/edit/cancel buttons bound to a draft id."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="✅ Подтвердить",
                    callback_data=f"draft:confirm:{draft_id}",
                ),
            ],
            [
                InlineKeyboardButton(
                    text="✏️ Редактировать",
                    callback_data=f"draft:edit:{draft_id}",
                ),
                InlineKeyboardButton(
                    text="❌ Отмена",
                    callback_data=f"draft:cancel:{draft_id}",
                ),
            ],
        ]
    )
