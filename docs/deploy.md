# Развёртывание и эксплуатация Zeta

В документе описаны два сценария развёртывания системы Zeta:
1. **Локальный запуск** полного стека сервисов через Docker Compose для разработки и приёмочного тестирования.
2. **Продакшен-развёртывание** на VPS под управлением Coolify 4 и Traefik с автоматическим CI/CD деплоем по вебхукам.

---

## 1. Архитектура сервисов

Система состоит из 4 изолированных сервисов:

```mermaid
graph LR
    U[Браузер / Telegram WebApp] -->|HTTPS :443| T[Traefik Reverse Proxy]
    T -->|/| F[zeta-frontend:3000]
    F -->|/api/* (proxy)| B[zeta-backend:8000]
    Bot[zeta-bot long polling] -->|HTTP /bot/*| B
    B -->|asyncpg :5432| DB[(zeta-db:5432 PostgreSQL 17)]
```

- **`zeta-frontend` (Next.js 16 App Router):** веб-клиент и Mini App.
- **`zeta-backend` (FastAPI + async SQLAlchemy 2.0):** API и бизнес-логика во внутренней сети.
- **`zeta-bot` (aiogram 3):** Telegram-бот на long polling (без внешнего порта).
- **`zeta-db` (PostgreSQL 17-alpine):** база данных с volume-персистентностью.

---

## 2. Локальный запуск (Docker Compose)

### Требования
- Docker Engine 24+ и Docker Compose v2.
- Свободные локальные порты: `3000` (frontend), `8000` (backend), `5432` (db).

### Быстрый старт одной командой

1. Склонируйте репозиторий и перейдите в корень:
   ```bash
   git clone https://github.com/Ivansups/Zeta.git
   cd Zeta
   ```

2. Запустите стек сервисов:
   ```bash
   docker compose up -d --build
   ```

3. Проверьте статус контейнеров и healthcheck:
   ```bash
   docker compose ps
   ```
   Все сервисы (`zeta-db`, `zeta-backend`, `zeta-frontend`, `zeta-bot`) должны перейти в состояние `healthy` или `Up`.

4. Применение миграций базы данных:
   Миграции Alembic применяются автоматически при старте бэкенда (`alembic upgrade head`). Для ручного запуска:
   ```bash
   docker compose exec backend uv run alembic upgrade head
   ```

5. Наполнение демонстрационными данными:
   ```bash
   docker compose exec backend uv run python -m backend.seed
   ```

6. Доступ к локальным сервисам:
   - **Веб-интерфейс:** http://localhost:3000
   - **OpenAPI Swagger:** http://localhost:8000/docs
   - **Healthcheck бэкенда:** http://localhost:8000/health

7. Остановка стека:
   ```bash
   docker compose down
   # Либо с удалением volumes:
   docker compose down -v
   ```

---

## 3. Продакшен-развёртывание (Coolify + Traefik)

Боевая среда развёртывается на VPS (Ubuntu 24.04 LTS) под управлением платформы Coolify 4.

### 3.1 Схема портов и сетевой изоляции

Наружу открыт **только порт 443 (HTTPS)** через Traefik к `zeta-frontend`.
Backend, бот и база данных изолированы во внутренней Docker-сети Coolify (`coolify`). Межсервисный DNS разрешается по именам контейнеров.

| Ресурс | Тип | Внутренний порт | Публичный доступ | FQDN / Домен |
|---|---|:---:|:---:|---|
| `zeta-db` | PostgreSQL 17 | `5432` | Нет | Внутренний DNS: `zeta-db` |
| `zeta-backend` | Application (Dockerfile) | `8000` | Нет | Внутренний DNS: `zeta-backend` |
| `zeta-frontend` | Application (Dockerfile) | `3000` | Да (HTTPS) | Домен приложения |
| `zeta-bot` | Application (Dockerfile) | — | Нет (polling) | — |

---

### 3.2 Конфигурация переменных окружения

В Coolify создаётся проект `Zeta` и настраиваются переменные:

#### `zeta-db` (PostgreSQL)
```ini
POSTGRES_USER=zeta_prod
POSTGRES_PASSWORD=<пароль_бд>
POSTGRES_DB=zeta_prod
```

#### `zeta-backend`
```ini
ENVIRONMENT=production
DATABASE_URL=postgresql+asyncpg://zeta_prod:<пароль>@zeta-db:5432/zeta_prod
TELEGRAM_BOT_TOKEN=<токен_бота_из_BotFather>
JWT_SECRET_KEY=<64_hex_символа>
INTERNAL_API_SECRET=<64_hex_символа_для_авторизации_бота>
ALLOWED_TELEGRAM_USERS=156587029 622949618 1153418028 916349682 630262858
DEV_LOGIN_ENABLED=false
LLM_API_KEY=<ключ_api>
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
LLM_TIMEOUT=30.0
```

> [!IMPORTANT]
> При `ENVIRONMENT=production` бэкенд проверяет корректность секретов: при дефолтных значениях `JWT_SECRET_KEY`, отсутствии `TELEGRAM_BOT_TOKEN` или включённом `DEV_LOGIN_ENABLED=true` сервис не запустится.

#### `zeta-frontend`
- **Runtime Variables:**
  ```ini
  API_URL=http://zeta-backend:8000
  PORT=3000
  HOSTNAME=0.0.0.0
  ```
- **Build Variables** (в Coolify включить отметку *Build Variable*):
  ```ini
  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=zeta_hometask_bot
  NEXT_PUBLIC_ENABLE_DEV_LOGIN=false
  ```

#### `zeta-bot`
```ini
BOT_TOKEN=<тот_же_токен_что_у_backend>
BACKEND_BASE_URL=http://zeta-backend:8000
BACKEND_INTERNAL_SECRET=<то_же_значение_что_INTERNAL_API_SECRET_в_backend>
WEB_APP_URL=https://<домен_фронтенда>
POLLING_TIMEOUT=30
LOG_LEVEL=INFO
DRAFT_TTL_SECONDS=900
QUESTION_THROTTLE_SECONDS=3.0
```

---

### 3.3 Настройка непрерывного деплоя (GitHub Webhook)

В GitHub репозитории `Ivansups/Zeta` настраивается Webhook на Coolify:
- **Payload URL:** `https://coolify.<домен>/webhooks/source/github/events/manual`
- **Content type:** `application/json`
- **Secret:** секретный ключ вебхука.
- **Events:** `push` в ветку `main`.

Для оптимизации ресурсов в настройках каждого приложения задаются фильтры `watch_paths`:
- `backend/**` -> пересборка `zeta-backend`;
- `frontend/**`, `packages/theme/**` -> пересборка `zeta-frontend`;
- `telegram-bot/**` -> перезапуск `zeta-bot`.

---

### 3.4 Порядок первого развёртывания в проде

1. **База данных (`zeta-db`):** создать ресурс PostgreSQL, настроить volume, выключить публичный порт.
2. **Бэкенд (`zeta-backend`):** задать переменные, проверить прохождение healthcheck `GET /health` на порту 8000. Входной скрипт контейнера накатывает `alembic upgrade head`.
3. **Фронтенд (`zeta-frontend`):** собрать с build-переменными, привязать домен, выпустить SSL-сертификат через Traefik.
4. **Бот (`zeta-bot`):** запустить контейнер бота (убедиться, что локальные инстансы остановлены во избежание ошибки 409 Conflict).
5. **Назначение первого администратора:**
   ```sql
   UPDATE users SET role = 'admin', token_version = token_version + 1
   WHERE telegram_id = <telegram_id_тимлида>;
   ```
6. **Кнопка меню в BotFather:**
   Выполнить команду `/setmenubutton` -> указать URL `https://<домен>/tg-app`.

---

## 4. Смоук-тестирование после развёртывания

- [x] Редирект HTTP -> HTTPS работает корректно, сертификат валиден.
- [x] Страница `/login` загружает виджет авторизации Telegram.
- [x] Авторизация пользователя из `ALLOWED_TELEGRAM_USERS` завершается выдачей `access_token` и установкой cookie `refresh_token` (`HttpOnly; Secure; SameSite=Lax`).
- [x] Запросы к `/api/*` проксируются к `zeta-backend`.
- [x] Роут `/tg-app` валидирует `initData` и авторизует пользователя внутри Telegram.
- [x] Бот отвечает на команду `/start`, отображает кнопки и поддерживает создание черновиков ДЗ.
- [x] В логах бэкенда нет ошибок БД и циклических перезапусков.
