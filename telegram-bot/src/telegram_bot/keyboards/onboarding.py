"""Inline and reply keyboards for onboarding."""

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup


def build_onboarding_keyboard(web_app_url: str) -> InlineKeyboardMarkup:
    """Create inline keyboard with link to Zeta Web App and help action."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🌐 Открыть Zeta Web",
                    url=web_app_url,
                ),
            ],
            [
                InlineKeyboardButton(
                    text="❓ Справка и команды",
                    callback_data="cmd_help",
                ),
            ],
        ]
    )
