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
- **AI**: Anthropic Claude (claude-sonnet-4-6) via Replit AI Integrations
- **Internet Search**: Tavily Search API (`@tavily/core`)

## Applications

### Booomerangs CRM (`artifacts/booomerangs-crm`)
- Wholesale client management app for Booomerangs brand (Tula, Russia)
- Modern dark UI with neon-green accents
- Pages: Dashboard, Clients list, Add client, Client detail, AI Search
- AI Search now searches the **internet** for new potential clients
- Preview path: `/`

### API Server (`artifacts/api-server`)
- Express 5 backend
- Routes: `/api/clients`, `/api/clients/stats`, `/api/ai-search`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Database Schema

- `clients` — wholesale client records (company, contact, region, status, order volume)

## AI Internet Search — How It Works

The AI Search feature (`/api/ai-search`) now searches the internet for NEW potential clients:

1. **Tavily Search API** performs two real internet searches based on the user's query
2. **Claude AI** analyzes the search results and extracts structured data about each found company:
   - Company name, city, phone, website, Instagram, category, description, source URL
3. Results are returned as potential new clients (not from the database)
4. Each result has an **"В CRM"** button to add the company to the database as a prospect

### API Response Format (`POST /api/ai-search`)
```json
{
  "internetResults": [
    {
      "companyName": "...",
      "city": "...",
      "phone": "...",
      "website": "...",
      "category": "...",
      "description": "...",
      "sourceUrl": "...",
      "instagram": "..."
    }
  ],
  "explanation": "...",
  "query": "..."
}
```

## Environment Variables / Secrets

- `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` — PostgreSQL (auto-managed by Replit)
- `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`, `AI_INTEGRATIONS_ANTHROPIC_API_KEY` — Anthropic Claude via Replit AI Integrations (auto-provisioned via `setupReplitAIIntegrations`)
- `TAVILY_API_KEY` — Tavily Search API key for internet search (user-provided)
- `SESSION_SECRET` — Express session secret

## What Was Changed (Internet Search Feature)

### Problem
The original AI Search only filtered **existing clients** from the database — it did not search the internet.

### Solution
Completely rewrote the AI Search to find **new potential clients** on the internet:

1. **`lib/api-spec/openapi.yaml`** — Added `InternetClient` schema and replaced `clients` array with `internetResults` in `AiSearchResult`
2. **`artifacts/api-server/src/routes/ai-search.ts`** — Rewrote to:
   - Use Tavily to run 2 internet searches per query
   - Pass results to Claude which extracts structured company data
   - Return list of potential new clients found online
3. **`artifacts/booomerangs-crm/src/pages/ai-search.tsx`** — Rewrote UI to:
   - Show internet results as cards with company info
   - Display website links, phone, city, category, description
   - "В CRM" button on each card to add as prospect to database
4. **`lib/integrations-anthropic-ai/src/client.ts`** — Changed from throwing at module load to lazy initialization (fixes startup crash when env vars load after module import)
5. **`lib/db`** — Ran `drizzle-kit push` to sync database schema

### Dependencies Added
- `@tavily/core` — Tavily Search SDK (installed in `artifacts/api-server`)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
