# Luminee — Women's Beauty Salon SaaS Management System

A multi-tenant SaaS platform for women's beauty salons to manage appointments, clients, employees, services, and financials.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/salon-app run dev` — run the React frontend (port assigned via PORT env)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas (then manually fix `lib/api-zod/src/index.ts` to remove `export * from "./generated/types"`)
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + Clerk auth (@clerk/express)
- Frontend: React + Vite + wouter + TanStack Query + shadcn/ui + framer-motion
- DB: PostgreSQL + Drizzle ORM
- Auth: Clerk (Replit-managed)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI source of truth
- `lib/db/src/schema/` — Drizzle table definitions (salons, clients, services, employees, appointments, payments, expenses)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/middlewares/` — requireAuth, requireSalon, clerkProxyMiddleware
- `artifacts/salon-app/src/` — React frontend
- `lib/api-client-react/src/generated/` — Generated React Query hooks
- `lib/api-zod/src/generated/` — Generated Zod validation schemas

## Architecture decisions

- **Multi-tenancy via salon_id**: Each salon is identified by a `clerk_user_id` on the `salons` table. All resources (clients, services, employees, appointments, payments) carry `salon_id` FK. The `requireSalon` middleware resolves the salon from the authenticated Clerk user.
- **Clerk for auth**: JWT-based auth via Replit-managed Clerk. The API server uses `@clerk/express` middleware; the frontend uses `@clerk/react` with a proxy at `/api/clerk`.
- **Contract-first API**: OpenAPI spec in `lib/api-spec/openapi.yaml` drives codegen of both React Query hooks and Zod validation schemas via Orval.
- **Codegen barrel fix**: After running codegen, `lib/api-zod/src/index.ts` must only export `./generated/api` (not `./generated/types`) since `api.ts` already re-exports types — otherwise TS reports duplicate member errors.
- **Decimal prices as strings**: Service prices and payment amounts are stored as PostgreSQL `numeric` and returned as strings to avoid float precision issues.

## Product

- Salon registration & onboarding flow
- Dashboard with today's stats, revenue charts, top services, upcoming appointments
- Client management with appointment history and notes
- Service catalog grouped by category with pricing and duration
- Employee management with specialties and commission tracking
- Appointment scheduling (daily/weekly/monthly views) with status tracking
- Expense tracking (supplies, rent, utilities, salaries, marketing, equipment) with category breakdown
- Financial page with 3 tabs: Receitas / Despesas / Resumo — KPI bar shows revenue, expenses, and net profit
- Historical stats on every section: Agendamentos (monthly revenue + daily counts), Serviços (top services by revenue), Equipe (per-employee revenue and appointment count)
- Salon branding/settings (logo upload, 6 color palettes, social links)
- Dynamic theming: palette selection instantly updates CSS variables across the whole app; choice saved to DB and localStorage
- Salon name shown as browser tab title (`document.title`) and in the sidebar/header

## User preferences

- Stack: React (frontend), Node.js + Express (backend), PostgreSQL
- UI must be fully responsive (mobile-first)
- Modern, feminine design with dark mode support

## Gotchas

- After codegen: always fix `lib/api-zod/src/index.ts` to have only `export * from "./generated/api"` — Orval overwrites this file with both exports which causes TS duplicate member errors
- The `requireSalon` middleware attaches `salonId` to the request; use `(req as Request & { salonId: number }).salonId`
- Employees' `commissionPct` is stored as `numeric` string in DB, converted to `number | null` in API responses
- Seeded demo salon uses `clerk_user_id = 'demo_user_placeholder'` — real salons get their actual Clerk user ID on registration
- `/api/salons/me` uses `resolveSalon(userId)` helper — falls back to first DB salon when userId is null (demo mode)
- Logo stored as base64 data URL in `salon.logoUrl` (max 2MB enforced client-side); no object storage needed
- ThemeContext at `artifacts/salon-app/src/contexts/theme-context.tsx` — PALETTES array + `applyPalette()` sets CSS vars on `documentElement`; palette id stored in `localStorage` for instant load before API response

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `clerk-auth` skill for Clerk setup and customization
- See the `database` skill for DB management and production schema changes
