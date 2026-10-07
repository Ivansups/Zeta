# telegram-bot

Thin Telegram client over the backend API (long polling). No business logic, no direct DB or LLM access.

Owner: Ульянченко.

```bash
uv sync                                          # install deps
uv run pytest                                    # tests
uv run ruff check . && uv run ruff format --check . && uv run mypy .
```
