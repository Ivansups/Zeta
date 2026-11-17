"""FSM states for the homework draft dialog."""

from aiogram.fsm.state import State, StatesGroup


class HomeworkDraftStates(StatesGroup):
    """Dialog states for creating homework from free-form text."""

    waiting_for_confirmation = State()
    editing = State()
