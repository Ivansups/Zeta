# frontend

Веб-приложение: Next.js (App Router), TypeScript, Tailwind. Только клиент — авторизация, сессии и данные целиком на стороне backend.

Владелец: Шелудько. Telegram Mini App — отдельный роут этого приложения, его делает Ульянченко.

```bash
pnpm install
pnpm dev                              # http://localhost:3000
pnpm lint && pnpm typecheck && pnpm test
```

## API-прокси

Route Handler `src/app/api/[...path]/route.ts` проксирует `GET`, `HEAD`, `POST`, `PUT`, `PATCH`, `DELETE` и `OPTIONS` на backend. В `.env.local` задайте `API_URL` как origin FastAPI, например `API_URL=http://localhost:8000`. Запрос клиента к `/api/health?verbose=1` уйдёт на `http://localhost:8000/health?verbose=1`; токены и остальные прикладные заголовки передаются backend без локальной авторизации или базы данных.

## UI-компоненты

- `AppShell` — общий desktop/mobile-каркас и навигация; принимает `active` и дочерний контент.
- `ScheduleDashboard` — расписание на день или неделю, выбор подгруппы и запуск создания ДЗ.
- `HomeworkBoard` — канбан домашних заданий по датам занятий с фильтром подгруппы; статусы ДЗ намеренно отсутствуют по ТЗ.
- `HomeworkEditor` — форма ручного создания ДЗ и режим черновика с помощником; изменения передаются через `onSave`.
- `AdminPanel` и `ThemeSettings` — административные действия и настройки, изолированные от каркаса.

Компоненты получают данные через props или клиентские API-вызовы и не должны обращаться к PostgreSQL напрямую. Новые экраны собирайте из этих компонентов, сохраняя существующие классы и типы из `src/lib`.

## Переиспользование в Telegram Mini App

Mini App остаётся отдельным роутом этого Next.js-приложения, поэтому визуальные компоненты и типы можно импортировать напрямую из `src/components` и `src/lib`. Для Mini App:

1. Используйте `ScheduleDashboard`/`HomeworkBoard` как содержимое собственного Telegram-каркаса; `AppShell` подключайте только если нужна веб-навигация.
2. Оставляйте запросы относительными (`/api/...`), чтобы они проходили через тот же proxy и единый backend-контракт.
3. Учитывайте WebView: сохраняйте крупные touch-targets, не полагайтесь на hover и обрабатывайте safe-area в оболочке Mini App.
4. Telegram `initData` и токены обрабатываются backend-контрактом; UI-компоненты не реализуют собственную авторизацию.
