# telegram-bot

Тонкий клиент к платформе Zeta через Telegram Bot API (режим long polling).
Пакет не содержит собственной базы данных и бизнес-логики, взаимодействует исключительно через REST API бэкенда Zeta.

Владелец: Ульянченко Даниил (@DLqwerty).

## Требования

- Python >= 3.13
- Менеджер пакетов `uv`
- Токен Telegram-бота от [@BotFather](https://t.me/BotFather)

## Локальный запуск

1. Перейдите в каталог пакета:
   ```bash
   cd telegram-bot
   ```

2. Установите зависимости:
   ```bash
   uv sync
   ```

3. Создайте `.env` файл на основе шаблона:
   ```bash
   cp .env.example .env
   ```
   Укажите ваш `BOT_TOKEN` в файле `.env`.

4. Запустите бота:
   ```bash
   uv run python -m telegram_bot.main
   ```

## Переменные окружения

| Переменная | По умолчанию | Описание |
|---|---|---|
| `BOT_TOKEN` | *Обязательно* | Токен бота от BotFather |
| `BACKEND_BASE_URL` | `http://localhost:8000` | Базовый URL API бэкенда Zeta |
| `WEB_APP_URL` | `http://localhost:3000` | URL веб-приложения Zeta для входа и онбординга |
| `POLLING_TIMEOUT` | `30` | Таймаут long polling запросов (сек) |
| `LOG_LEVEL` | `INFO` | Уровень логирования (`DEBUG`, `INFO`, `WARNING`, `ERROR`) |
| `TELEGRAM_PROXY_URL` | *None* | Опциональный reverse proxy для Telegram Bot API (например, Cloudflare Worker) |

## Тестирование и линтинг

Согласно `AGENTS.md`, перед коммитом все проверки должны быть чистыми:

```bash
uv run pytest
uv run ruff check .
uv run ruff format --check .
uv run mypy .
```
