"""Homework parsing service.

# banan: контракт /homework/parse-from-text не найден в backend/modules/homework/
# (такой папки в репозитории нет). Схема ответа неизвестна, поэтому при ошибке
# запроса возвращается фиктивный черновик ДЗ.
"""

from __future__ import annotations

import logging
from typing import TypedDict

import aiohttp
from config import load_settings

logger = logging.getLogger(__name__)


class HomeworkDraft(TypedDict):
    pair_id: int
    subgroup: int
    description: str


class HomeworkService:
    async def parse_from_text(self, text: str) -> HomeworkDraft:
        try:
            settings = load_settings()
            url = f"{settings.backend_url}/homework/parse-from-text"
            async with (
                aiohttp.ClientSession() as session,
                session.post(url, json={"text": text}) as resp,
            ):
                if resp.status != 200:
                    raise RuntimeError(f"unexpected status {resp.status}")
                data = await resp.json()
            return HomeworkDraft(
                pair_id=int(data["pair_id"]),
                subgroup=int(data["subgroup"]),
                description=str(data["description"]),
            )
        except Exception as exc:
            # banan: заглушка, пока контракт эндпоинта не согласован
            logger.warning("banan: homework parse stub: text=%s error=%s", text, exc)
            return HomeworkDraft(
                pair_id=1,
                subgroup=2,
                description=text,
            )
