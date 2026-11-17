# [Изменение] Каркас Telegram-бота, long polling и онбординг (/start, /help)

> **Change ID:** `bot-scaffold-and-onboarding`  
> **Дата:** `2026-11-02`  
> **Итерация:** `Итерация 1 (20.10–03.11)`  
> **Затронутые пакеты:** `telegram-bot`  
> **Связанные задачи:** Refs #25 (Z-08, Z-09)  
> **Архив OpenSpec:** `openspec/changes/archive/2026-11-02-bot-scaffold-and-onboarding/`

---

## 1. Контекст и мотивация (Зачем?)

- **Проблема:** Telegram-бот Zeta является ключевым тонким клиентом платформы для студентов и старост, однако в пакете `telegram-bot/` отсутствовала рабочая точка входа, конфигурация, long polling рантайм, асинхронный HTTP-клиент к REST API и приветственный онбординг пользователей.
- **Обоснование:** Реализация задач Z-08 и Z-09 в рамках Итерации 1 обеспечивает запуск независимого сервиса бота, проверку готовности Telegram-канала взаимодействия и возможность последующей реализации бизнес-логики домашних заданий и LLM во 2-й итерации.

## 2. Что сделано (Что изменилось?)

- **`telegram-bot/`:**
  - Настроены зависимости `aiogram>=3.15.0`, `httpx>=0.28.0`, `pydantic-settings>=2.6.0` в `pyproject.toml`.
  - Реализован типобезопасный модуль конфигурации `src/telegram_bot/config.py` (`Settings`) и шаблон `.env.example`.
  - Реализован асинхронный HTTP-клиент `src/telegram_bot/client.py` (`BackendClient`) для связи с FastAPI бэкендом.
  - Реализован модуль клавиатур `src/telegram_bot/keyboards/onboarding.py` с inline-кнопкой перехода в веб-приложение Zeta.
  - Реализован роутер онбординга `src/telegram_bot/handlers/onboarding.py`: обработка команд `/start`, `/help`, callback-кнопки справки и fallback-обработчик неизвестных сообщений.
  - Реализована точка входа `src/telegram_bot/main.py`: фабрики бота и диспетчера, поддержка reverse proxy Telegram Bot API (#78), структурированное логирование, long polling с обработкой сигналов завершения (`SIGINT`/`SIGTERM`).
  - Написаны unit-тесты (15 тестов) для конфигурации, HTTP-клиента, хэндлеров онбординга и точки входа.
  - Обновлён `telegram-bot/README.md` с инструкциями локального запуска и проверки качества.

## 3. Архитектурные решения (Как?)

- **Тонкий клиент:** Бот не содержит прямого подключения к PostgreSQL или Redis. Все внешние данные запрашиваются через `BackendClient`.
- **Long polling и сигналы:** Использован асинхронный polling `dp.start_polling(bot, handle_signals=True)` с гарантированным закрытием сессий `bot.session.close()` и `backend_client.close()` в блоке `finally`.
- **Поддержка Cloudflare Reverse Proxy:** Фабрика `create_bot` инициализирует `TelegramAPIServer.from_base(settings.telegram_proxy_url)` при наличии настройки прокси.
- **Тестирование по TDD:** Все тесты используют моки `httpx.MockTransport` и aiogram Message/CallbackQuery, предотвращая сетевые вызовы в реальный Telegram API и бэкенд.

## 4. Спецификации и требования (OpenSpec Delta)

- `telegram-bot/core`:
  - `Requirement: Bot Configuration` — валидация переменных окружения и токена.
  - `Requirement: Long Polling Lifecycle` — цикл опроса и graceful shutdown.
  - `Requirement: Backend API Client` — базовый URL, таймаут и обработка сбоев соединения.
- `telegram-bot/onboarding`:
  - `Requirement: Welcome and Onboarding Message` — `/start` с описанием Zeta и веб-ссылкой.
  - `Requirement: Help Command` — `/help` со списком команд.
  - `Requirement: Fallback for Unknown Input` — подсказка при неизвестном вводе.

## 5. Выполненные задачи

- [x] 1.1 Добавить зависимости `aiogram`, `pydantic-settings`, `httpx` в `telegram-bot/pyproject.toml` и синхронизировать с помощью `uv sync`
- [x] 1.2 Написать падающий тест для `Settings` в `telegram-bot/tests/test_config.py` и реализовать `src/telegram_bot/config.py`
- [x] 1.3 Создать шаблон переменных окружения `telegram-bot/.env.example` с описанием всех ключей
- [x] 2.1 Написать падающий тест для `BackendClient` в `telegram-bot/tests/test_client.py`
- [x] 2.2 Реализовать `src/telegram_bot/client.py` с асинхронным клиентом `httpx`
- [x] 3.1 Написать падающие тесты для хэндлеров `/start`, `/help` и fallback в `telegram-bot/tests/test_handlers_onboarding.py`
- [x] 3.2 Реализовать inline-кнопку перехода в веб-приложение в `src/telegram_bot/keyboards/onboarding.py`
- [x] 3.3 Реализовать роутер с хэндлерами `/start`, `/help` и fallback в `src/telegram_bot/handlers/onboarding.py`
- [x] 4.1 Написать тесты для сборки приложения и роутеров в `telegram-bot/tests/test_app.py`
- [x] 4.2 Реализовать точку входа `src/telegram_bot/main.py` со структурированным логированием и graceful shutdown
- [x] 4.3 Обновить `telegram-bot/README.md` с инструкциями локального запуска и проверки качества
- [x] 5.1 Запустить полный цикл проверок `telegram-bot/`: `uv run ruff check .`, `uv run ruff format --check .`, `uv run mypy .`, `uv run pytest`

## 6. Проверка и тестирование (QA)

- **Линтеры и форматирование:** `uv run ruff check .` и `uv run ruff format --check .` — без замечаний.
- **Статическая типизация:** `uv run mypy .` — без замечаний в strict режиме (13 source files).
- **Тесты:** `uv run pytest` — 15 passed in 2.70s.
