"""Health check handler."""

from __future__ import annotations

from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message

from services.health import HealthService

router = Router()
health_service = HealthService()


@router.message(Command("health"))
async def health_handler(message: Message) -> None:
    result = await health_service.check()
    await message.answer(result["status"])
