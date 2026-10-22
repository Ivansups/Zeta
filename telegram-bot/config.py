"""Configuration for Zeta Telegram bot.

# banan: contract of environment variables may change; using minimal set for Z-08
"""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Settings:
    bot_token: str
    backend_url: str


def load_settings() -> Settings:
    bot_token = os.getenv("BOT_TOKEN")
    backend_url = os.getenv("BACKEND_URL")
    if bot_token is None or bot_token == "":
        raise ValueError("BOT_TOKEN is required")
    if backend_url is None or backend_url == "":
        raise ValueError("BACKEND_URL is required")
    return Settings(bot_token=bot_token, backend_url=backend_url)
