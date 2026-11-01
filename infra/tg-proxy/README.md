# zeta-tg-proxy (Cloudflare Worker Reverse Proxy)

Легковесный reverse-proxy для Telegram Bot API на Cloudflare Workers.
Позволяет Telegram-боту на сервере в РФ стабильно общаться с `api.telegram.org` без сетевых блокировок.

## Безопасность

- **Фильтрация по белому списку**: воркер пропускает запросы **только** с IP, указанного в вашем `.env`. Все чужие запросы отклоняются с ошибкой `403 Forbidden`.
- **Конфиденциальность**: файл `.env` внесён в `.gitignore` и **никогда не попадёт в историю Git**.

---

## Как пользоваться (простая инструкция)

### 1. Укажите IP сервера в `.env`

Откройте файл `.env` в этой папке и впишите статический IP вашего сервера
(если файла ещё нет — `cp .env.example .env`):
```env
ALLOWED_IP=185.xxx.xxx.xxx
```

### 2. Задеплойте прокси

Выполните команду в терминале:
```bash
pnpm run deploy
```
*Скрипт сам прочитает ваш IP из `.env` и отправит его в Cloudflare. Трогать `wrangler.toml` не нужно.*

После завершения Cloudflare выдаст ссылку на ваш прокси:
`https://zeta-tg-proxy.<ваш-поддомен>.workers.dev`

### 3. Проверьте работоспособность

Откройте в браузере:
`https://zeta-tg-proxy.<ваш-поддомен>.workers.dev/health`

Вам вернётся ответ:
```json
{
  "status": "ok",
  "service": "zeta-tg-proxy",
  "client_ip": "ваш_текущий_ip",
  "ip_protection_enabled": true
}
```

---

## Как подключить прокси в Telegram-боте

В коде бота (`telegram-bot`):
```python
from aiogram import Bot
from aiogram.client.session.aiohttp import AiohttpSession
from aiogram.client.telegram import TelegramAPIServer

# URL вашего развёрнутого прокси:
PROXY_URL = "https://zeta-tg-proxy.<ваш-поддомен>.workers.dev"

custom_server = TelegramAPIServer.from_base(PROXY_URL)
session = AiohttpSession(api=custom_server)

bot = Bot(token="BOT_TOKEN", session=session)
```
