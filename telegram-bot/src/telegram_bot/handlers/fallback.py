"""Fallback handler for messages not matched by any feature router."""

from aiogram import Router
from aiogram.types import Message

router = Router(name="fallback")


@router.message()
async def unknown_message_handler(message: Message) -> None:
    """Handle unrecognized messages and commands."""
    text = (
        "Я пока не понимаю эту команду 🤔\n\n"
        "Воспользуйся /start для возврата к приветствию или /help для справки."
    )
    await message.answer(text)
