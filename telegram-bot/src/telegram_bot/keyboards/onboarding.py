"""Inline and reply keyboards for onboarding."""

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup


def build_onboarding_keyboard(
    web_app_url: str, invite_token: str | None = None
) -> InlineKeyboardMarkup:
    """Create inline keyboard with link to Zeta Web App and help action."""
    button_url = (
        f"{web_app_url.rstrip('/')}/invite/{invite_token}"
        if invite_token
        else web_app_url
    )
    button_text = "🌐 Вступить в группу в Zeta" if invite_token else "🌐 Открыть Zeta Web"

    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text=button_text,
                    url=button_url,
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
