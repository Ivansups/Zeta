# @zeta/theme

Единый источник дизайн-токенов Zeta: цвета, скругления, отступы, тени и анимации.
Из одного файла получаются CSS-переменные для веба и типизированные константы для
React Native.

## Что здесь каноническое, а что сгенерированное

| Файл | Роль |
|---|---|
| `src/tokens.ts` | **Источник истины.** Здесь правятся значения |
| `src/css.ts` | Сериализация: CSS-переменные и TS-зеркало |
| `scripts/generate.ts` | Генератор (`--check` — только проверка) |
| `frontend/src/app/theme.generated.css` | Сгенерировано, руками не править |
| `frontend/src/theme/tokens.generated.ts` | Сгенерировано, руками не править |

## Как менять токены

```bash
# из frontend/
pnpm theme:css     # пересобрать сгенерированные артефакты
pnpm theme:check   # убедиться, что артефакты не разошлись с tokens.ts
```

Порядок: правим `packages/theme/src/tokens.ts` → `pnpm theme:css` → коммитим и токены,
и оба сгенерированных файла. Тест `frontend/src/theme/theme-sync.test.ts` падает,
если артефакты забыли пересобрать.

## Формат

Токены намеренно платформо-независимые:

- цвета — hex-строки (`#1d4ed8`), одинаково валидны в CSS и в `StyleSheet`;
- `radius` и `space` — числа без единиц (RN принимает числа как пиксели, веб получает `radiusPx`/CSS-переменные);
- `shadows` — слои с полями `x`, `y`, `blur`, `spread`, `rgb`, `opacity`: из них собирается CSS `box-shadow`, а RN может взять те же числа для `shadowOffset`/`shadowRadius`;
- `motion` — длительности в миллисекундах и кривые как контрольные точки Безье.

## Подключение

**Веб.** `frontend/src/app/globals.css` подключает сгенерированный файл через
`@import "./theme.generated.css"`. Компоненты используют `var(--primary)` и остальные
переменные, а JS-код — `import { lightColors } from "@/theme"`.

**React Native.** Пакет не зависит от DOM и React, поэтому его можно импортировать
напрямую, например `import { lightPalette, radius, space } from "@zeta/theme"`.
Мобильному пакету для этого нужно добавить `packages/theme` в `watchFolders` Metro
(сейчас `mobile` ещё живёт на собственных `mobile/src/theme/colors.ts`).

## Почему есть TS-зеркало

Сборка `frontend` идёт из Docker-контекста `./frontend` и не видит `packages/`.
Поэтому канонические токены материализуются в `frontend/src/theme/tokens.generated.ts`,
который импортируется как обычный модуль. Когда контекст сборки расширят до корня
репозитория, зеркало можно убрать и импортировать `@zeta/theme` напрямую.
