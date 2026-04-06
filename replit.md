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

## Applications

### Booomerangs CRM (`artifacts/booomerangs-crm`)
- Wholesale client management app for Booomerangs brand (Tula, Russia)
- Modern dark UI with neon-green accents
- Pages: Dashboard, Clients list, Add client, Client detail, AI Search
- AI-powered natural language client search (Claude)
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

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
