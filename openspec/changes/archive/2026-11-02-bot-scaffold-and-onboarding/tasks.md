# Tasks

## 1. Зависимости и конфигурация (Z-08)

- [x] 1.1 Добавить зависимости `aiogram`, `pydantic-settings`, `httpx` в `telegram-bot/pyproject.toml` и синхронизировать с помощью `uv sync`
- [x] 1.2 Написать падающий тест для `Settings` в `telegram-bot/tests/test_config.py` (валидация обязательных и опциональных полей) и реализовать `src/telegram_bot/config.py`, добившись зелёного теста
- [x] 1.3 Создать шаблон переменных окружения `telegram-bot/.env.example` с описанием всех ключей

## 2. HTTP-клиент к Backend (Z-08)

- [x] 2.1 Написать падающий тест для `BackendClient` в `telegram-bot/tests/test_client.py` (запрос healthcheck, базовый URL, таймаут, обработка сетевых сбоев)
- [x] 2.2 Реализовать `src/telegram_bot/client.py` с асинхронным клиентом `httpx` и добиться прохождения тестов

## 3. Обработка команд онбординга /start, /help и fallback (Z-09)

- [x] 3.1 Написать падающие тесты для хэндлеров `/start`, `/help` и fallback в `telegram-bot/tests/test_handlers_onboarding.py`
- [x] 3.2 Реализовать inline-кнопку перехода в веб-приложение в `src/telegram_bot/keyboards/onboarding.py`
- [x] 3.3 Реализовать роутер с хэндлерами `/start`, `/help` и fallback в `src/telegram_bot/handlers/onboarding.py`, добившись прохождения тестов

## 4. Точка входа, long polling и graceful shutdown (Z-08)

- [x] 4.1 Написать тесты для сборки приложения и роутеров в `telegram-bot/tests/test_app.py`
- [x] 4.2 Реализовать точку входа `src/telegram_bot/main.py` со структурированным логированием, регистрацией роутеров и поддержкой корректного завершения (graceful shutdown)
- [x] 4.3 Обновить `telegram-bot/README.md` с инструкциями локального запуска и проверки качества

## 5. Финальная верификация

- [x] 5.1 Запустить полный цикл проверок `telegram-bot/`: `uv run ruff check .`, `uv run ruff format --check .`, `uv run mypy .`, `uv run pytest` и убедиться в отсутствии замечаний
