# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: Gemini с авто-фоллбэком моделей (`@google/generative-ai`) — для вкладки Блогеры
- **Internet Search**: Tavily Search API (`@tavily/core`)

## Applications

### Booomerangs CRM (`artifacts/booomerangs-crm`)
- CRM для бренда молодёжной одежды Booomerangs (Тула, Россия)
- Тёмный UI с неоново-зелёными акцентами
- Страницы: Дашборд, Клиенты, Добавить клиента, Карточка клиента, AI Поиск
- Preview path: `/`

### API Server (`artifacts/api-server`)
- Express 5 backend, порт **8080** (воркфлоу `artifacts/api-server: API Server`)
- Фронтенд проксирует `/api` запросы на порт **8080** через Vite proxy
- Routes: `/api/clients`, `/api/clients/stats`, `/api/ai-search`, `/api/vk-search`, `/api/vk-oauth/*`, `/api/collab-search`, `/api/gemini-key/*`, `/api/vk-messages/*`

## Key Commands

- `pnpm run typecheck` — полная проверка типов
- `pnpm run build` — typecheck + сборка всех пакетов
- `pnpm --filter @workspace/api-spec run codegen` — регенерация API хуков и Zod схем из OpenAPI spec
- `pnpm --filter @workspace/db run push` — применить изменения схемы БД (только dev)
- `pnpm --filter @workspace/api-server run dev` — запустить API сервер локально

## Database Schema

- `clients` — записи оптовых клиентов (компания, контакт, регион, статус, объём заказов)
- `app_settings` — системные настройки (VK токен, Gemini API ключ) — создаётся автоматически

## Environment Variables / Secrets

- `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` — PostgreSQL (авто, Replit)
- `GEMINI_API_KEY` — Google Gemini API ключ (для вкладки Блогеры). Также можно ввести через UI.
- `TAVILY_API_KEY` — Tavily Search API (интернет-поиск)
- `SESSION_SECRET` — секрет сессии Express
- `VK_APP_ID` — ID VK приложения для OAuth

## Gemini — модели и фоллбэк

Все Gemini запросы идут через `artifacts/api-server/src/lib/gemini-client.ts`.

### Цепочка моделей (все бесплатные, Google AI Studio free tier)

| Модель | Тип | Лимит | Причина |
|---|---|---|---|
| `gemini-2.5-flash` | Preview | 10 RPM, часто 503 | Пробуем первой — лучшее качество |
| `gemini-2.0-flash` | Stable GA | 15 RPM, надёжный | Фоллбэк при 503 |
| `gemini-1.5-flash` | Stable | 15 RPM, очень стабильный | Последний резерв |

При 503 («перегрузка») или 429 («квота») — автоматически переходит к следующей модели. Платных вызовов нет.

### Подключение Gemini ключа

- Ввод прямо в UI → сохраняется в `app_settings` в БД
- Env var `GEMINI_API_KEY` — запасной вариант
- Получить бесплатный ключ: [aistudio.google.com](https://aistudio.google.com/app/apikey)
- Ключ валидируется при сохранении; ошибка 429/503 не блокирует сохранение (ключ рабочий)

## Вкладка "Блогеры" (collab-search) — как работает

### Маршрут: `POST /api/collab-search`

1. **Gemini (PRIMARY)** — генерирует 12 реальных кандидатов с именами, нишей, соц. сетями
2. **VK + Tavily** — параллельно, дополнительные кандидаты из реальных источников
3. **Gemini enrich** — оценивает топ-8 кандидатов (~15–25 сек, таймаут 50 сек):
   - `fitScore` (1–10), `whyRelevant`, `pitch`
4. Параметр `excludeNames` — исключает уже показанных (кнопка «Найти ещё»)
5. Результаты сортируются по `fitScore` и отображаются карточками

### Карточка блогера — BloggerSheet

Нажатие на имя блогера или иконку 💬 в карточке → открывается панель справа:
- Полный профиль: имя, тип, ниша, город, все соц. ссылки, оценка совместимости
- **Диалог ВКонтакте**: автоматически резолвит peer_id по VK-ссылке, загружает историю переписки
- **AI-составление сообщений**: описываешь что хочешь написать → Gemini формулирует текст
- **Отправка**: Ctrl+Enter или кнопка «Отправить»

### Ключевые файлы

- `artifacts/api-server/src/routes/collab-search.ts` — основной маршрут поиска
- `artifacts/api-server/src/routes/vk-messages.ts` — диалог ВКонтакте (resolve/send/history/ai-suggest)
- `artifacts/api-server/src/lib/gemini-client.ts` — Gemini с авто-фоллбэком моделей
- `artifacts/api-server/src/lib/gemini-key-store.ts` — хранение Gemini ключа в БД
- `artifacts/api-server/src/routes/gemini-key.ts` — маршруты `/api/gemini-key/*`
- `artifacts/booomerangs-crm/src/pages/ai-search.tsx` — фронтенд (все три вкладки)
- `artifacts/booomerangs-crm/src/components/collab/blogger-sheet.tsx` — панель блогера

### API-типы (обновлены вручную, без codegen)

Добавлены поля `fitScore` и `pitch` в трёх местах:
- `lib/api-zod/src/generated/types/collabPersonResult.ts`
- `lib/api-zod/src/generated/api.ts`
- `lib/api-client-react/src/generated/api.schemas.ts`

## Маршруты ВК-сообщений `/api/vk-messages/*`

- `POST /resolve` — получает `peer_id` по VK-ссылке (пробует как user, потом как group → 2B+id)
- `POST /send` — отправляет сообщение (требует scope `messages` в токене)
- `GET /history?peerId=N` — история переписки (код 100 = нет диалога → возвращает `[]`)
- `POST /ai-suggest` — Gemini генерирует следующее сообщение по контексту диалога

VK OAuth теперь запрашивает scope `groups,messages`. Если токен без messages scope — UI показывает подсказку переподключить.

## Вкладка "ВКонтакте" — как работает

- Токен VK вводится прямо в UI вкладки ВКонтакте
- Хранится в `app_settings` через `artifacts/api-server/src/lib/vk-token-store.ts`
- Маршруты: `/api/vk-oauth/token`, `/api/vk-oauth/status`, `/api/vk-oauth/disconnect`

## Вкладка "Интернет + ИИ" — как работает

- `POST /api/ai-search` — Tavily (2 запроса) → структурированные данные о компаниях
- Результаты добавляются в CRM кнопкой «В CRM»

## Запуск сервера в Replit (важно!)

### Архитектура воркфлоу

Проект использует систему **артефактов Replit** с собственным роутером. Публичный URL маршрутизируется так:
- `https://<домен>/` → порт **5000** (фронтенд Vite, воркфлоу `artifacts/booomerangs-crm: web`)
- `https://<домен>/api/*` → порт **8080** (API сервер, воркфлоу `artifacts/api-server: API Server`)

### Правильные воркфлоу (должны быть запущены)

| Воркфлоу | Порт | Что делает |
|---|---|---|
| `artifacts/booomerangs-crm: web` | 5000 | Фронтенд (Vite dev server) |
| `artifacts/api-server: API Server` | 8080 | API (Express, build + start) |
| `artifacts/mockup-sandbox: Component Preview Server` | — | Sandbox для UI компонентов |

> ⚠️ **НЕ создавай** воркфлоу "Start application" вручную — он конфликтует с артефактными воркфлоу и занимает порт 5000 до того, как `artifacts/booomerangs-crm: web` успевает его захватить.

### Как быстро запустить с нуля

1. Убедиться, что оба воркфлоу **running** в панели Replit (вкладка "Console" → выбрать воркфлоу)
2. Если фронтенд упал или занял порт 5001 вместо 5000 — в консоли выполнить:
   ```bash
   fuser -k 5000/tcp
   ```
   Затем перезапустить воркфлоу `artifacts/booomerangs-crm: web`
3. Проверить что всё работает:
   ```bash
   curl https://$REPLIT_DEV_DOMAIN/api/healthz
   ```

### Если что-то не работает (диагностика)

```bash
# Проверить какие порты заняты
curl -o /dev/null -w "%{http_code}" http://localhost:5000/   # фронтенд
curl -o /dev/null -w "%{http_code}" http://localhost:8080/api/healthz  # API

# Убить висящий процесс на порту 5000
fuser -k 5000/tcp

# Проверить публичный URL
curl https://$REPLIT_DEV_DOMAIN/
curl https://$REPLIT_DEV_DOMAIN/api/healthz
```

### Частые проблемы

- **502 на публичном URL** — фронтенд не запустился на порту 5000. Перезапусти воркфлоу `artifacts/booomerangs-crm: web`. Если пишет "Port 5000 is in use" — выполни `fuser -k 5000/tcp` и перезапусти снова.
- **Конфликт портов при старте** — кто-то создал воркфлоу "Start application". Удали его через Replit UI (вкладка воркфлоу → удалить).
- **API не отвечает** — перезапусти воркфлоу `artifacts/api-server: API Server`. API собирается ~30 сек (install + drizzle push + esbuild build + start).

## Важные замечания для разработки

- **API типы не регенерируются**: при добавлении новых полей в ответ API — редактировать вручную три файла выше.
- **Кэш localStorage**: вкладка Блогеры кэширует результаты в `collab_search_state_v1`. Старые результаты без `fitScore`/`pitch` — нужен новый поиск.
- **Таймаут Gemini**: жёсткий 25 сек. Если превышен — результаты возвращаются без оценок (graceful fallback).
- **Vite proxy**: `/api` запросы с фронтенда проксируются на `localhost:8080` через настройку в `artifacts/booomerangs-crm/vite.config.ts`.
