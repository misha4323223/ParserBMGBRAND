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
- **AI**: Gemini 2.5 Flash (`@google/generative-ai`) — для вкладки Блогеры
- **Internet Search**: Tavily Search API (`@tavily/core`)

## Applications

### Booomerangs CRM (`artifacts/booomerangs-crm`)
- CRM для бренда молодёжной одежды Booomerangs (Тула, Россия)
- Тёмный UI с неоново-зелёными акцентами
- Страницы: Дашборд, Клиенты, Добавить клиента, Карточка клиента, AI Поиск
- Preview path: `/`

### API Server (`artifacts/api-server`)
- Express 5 backend, порт 3000 (Start application) / порт 8080 (artifacts/api-server: API Server)
- Фронтенд подключён к порту **8080** (`artifacts/api-server: API Server`)
- Routes: `/api/clients`, `/api/clients/stats`, `/api/ai-search`, `/api/vk-search`, `/api/vk-oauth/*`, `/api/collab-search`, `/api/gemini-key/*`

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

## Вкладка "Блогеры" (collab-search) — как работает

### Маршрут: `POST /api/collab-search`

1. **Генерация запросов** — мгновенно, локально (3 варианта на основе запроса пользователя)
2. **VK + Tavily** — параллельно (~10–15 сек):
   - VK: ищет группы/страницы артистов, блогеров, инфлюенсеров (если токен подключён)
   - Tavily: веб-поиск по тем же запросам как резервный/дополнительный источник
3. **Gemini 2.5 Flash** — обогащает топ-8 кандидатов (~15–25 сек, жёсткий таймаут 25 сек):
   - `fitScore` (1–10) — оценка совместимости с брендом
   - `whyRelevant` — почему подходит
   - `pitch` — готовое первое сообщение для предложения коллаба
4. Результаты сортируются по `fitScore` и отображаются карточками

### Ключевые файлы

- `artifacts/api-server/src/routes/collab-search.ts` — основной маршрут
- `artifacts/api-server/src/lib/gemini-key-store.ts` — хранение Gemini ключа в БД
- `artifacts/api-server/src/routes/gemini-key.ts` — маршруты `/api/gemini-key/*`
- `artifacts/booomerangs-crm/src/pages/ai-search.tsx` — фронтенд (все три вкладки)

### Подключение Gemini ключа

Вкладка **Блогеры** показывает жёлтый блок «Подключите Gemini AI» если ключ не введён.
- Ввод прямо в UI → сохраняется в таблицу `app_settings` в БД
- Если задан `GEMINI_API_KEY` в переменных окружения — используется как запасной вариант (показывается зелёная полоска «Gemini AI подключён»)
- Получить бесплатный ключ: [aistudio.google.com](https://aistudio.google.com/app/apikey)

### API-типы (обновлены вручную, без codegen)

Добавлены поля `fitScore` и `pitch` в трёх местах:
- `lib/api-zod/src/generated/types/collabPersonResult.ts`
- `lib/api-zod/src/generated/api.ts`
- `lib/api-client-react/src/generated/api.schemas.ts`

## Вкладка "ВКонтакте" — как работает

- Токен VK вводится прямо в UI вкладки ВКонтакте
- Хранится в `app_settings` через `artifacts/api-server/src/lib/vk-token-store.ts`
- Маршруты: `/api/vk-oauth/token`, `/api/vk-oauth/status`, `/api/vk-oauth/disconnect`

## Вкладка "Интернет + ИИ" — как работает

- `POST /api/ai-search` — Tavily (2 запроса) → структурированные данные о компаниях
- Результаты добавляются в CRM кнопкой «В CRM»

## Важные замечания для разработки

- **Два одинаковых сервера**: `Start application` (порт 3000) и `artifacts/api-server: API Server` (порт 8080). Фронтенд подключается к 8080. При изменениях нужно перезапускать **оба**.
- **API типы не регенерируются**: при добавлении новых полей в ответ API — редактировать вручную три файла выше.
- **Кэш localStorage**: вкладка Блогеры кэширует результаты в `collab_search_state_v1`. Старые результаты без `fitScore`/`pitch` — нужен новый поиск.
- **Таймаут Gemini**: жёсткий 25 сек. Если превышен — результаты возвращаются без оценок (graceful fallback).
