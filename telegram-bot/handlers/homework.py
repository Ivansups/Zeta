"""Homework handlers: free-text input and confirmation FSM.

# banan: контракт /homework/parse-from-text не найден, черновик берётся из
# заглушки services.homework.
"""

from __future__ import annotations

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
)
from services.homework import HomeworkDraft, HomeworkService

router = Router()
homework_service = HomeworkService()

CONFIRM_CALLBACK = "homework_confirm"
CANCEL_CALLBACK = "homework_cancel"


class HomeworkStates(StatesGroup):
    awaiting_text = State()
    awaiting_confirm = State()


def format_draft(draft: HomeworkDraft) -> str:
    return (
        "Черновик ДЗ:\n"
        f"Пара: {draft['pair_id']}\n"
        f"Подгруппа: {draft['subgroup']}\n"
        f"Описание: {draft['description']}"
    )


@router.message(Command("homework"))
async def homework_start_handler(message: Message, state: FSMContext) -> None:
    await state.set_state(HomeworkStates.awaiting_text)
    await message.answer("Отправьте задание текстом.")


@router.message(HomeworkStates.awaiting_text)
async def homework_text_handler(message: Message, state: FSMContext) -> None:
    text = (message.text or "").strip()
    if text == "":
        error_text = "Не удалось распознать текст. Отправьте ДЗ ещё раз."  # noqa: RUF001
        await message.answer(error_text)
        return

    draft = await homework_service.parse_from_text(text)
    await state.update_data(draft=draft)
    await state.set_state(HomeworkStates.awaiting_confirm)

    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="Подтвердить", callback_data=CONFIRM_CALLBACK
                ),
                InlineKeyboardButton(text="Отменить", callback_data=CANCEL_CALLBACK),
            ]
        ]
    )
    await message.answer(format_draft(draft), reply_markup=keyboard)


@router.callback_query(HomeworkStates.awaiting_confirm, F.data == CONFIRM_CALLBACK)
async def homework_confirm_handler(callback: CallbackQuery, state: FSMContext) -> None:
    await state.get_data()
    await state.clear()
    if callback.message is not None:
        await callback.message.answer("ДЗ подтверждено.")
    await callback.answer()


@router.callback_query(HomeworkStates.awaiting_confirm, F.data == CANCEL_CALLBACK)
async def homework_cancel_handler(callback: CallbackQuery, state: FSMContext) -> None:
    await state.clear()
    if callback.message is not None:
        await callback.message.answer("Ввод ДЗ отменён.")
    await callback.answer()
