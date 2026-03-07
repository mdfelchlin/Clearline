# Implementation Plan: Clearline MVP

**Branch**: `main` | **Date**: 2026-03-07 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/main/spec.md` and [Clearline.md](../../Clearline.md) §6 (Technical Architecture). User stack: React + Vite + TypeScript, Node API on Vercel, Supabase; follow Clearline.md §6 and the constitution.

## Summary

Build the Clearline MVP as a single responsive web app: React (TypeScript + Vite) frontend and Node.js API (Vercel serverless or Express/Fastify), with Supabase for PostgreSQL and auth. Income is the single source of truth for Budget and Tax; no duplicate income entry. Delivers: authenticated access and dashboard (P1), budget and income entry (P2), tax view and estimated tax (P3), household and settings (P4), year selector and empty states (P5). Deploy to Vercel with minimal cost; meet constitution NFRs (performance, security, WCAG 2.1 AA, ≥70% test coverage for business logic).

## Technical Context

**Language/Version**: TypeScript (strict); Node.js LTS; React 18+  
**Primary Dependencies**: React, Vite, React Router, TanStack Query (or React Context), Supabase client (`@supabase/supabase-js`). Backend: Express or Fastify or Vercel serverless; Zod or Joi for validation; Pino or structured logging.  
**Storage**: Supabase (PostgreSQL). Schema per PRD §6.2; migrations via Supabase migrations or SQL.  
**Testing**: Vitest (or Jest) for frontend/API unit tests; React Testing Library for components; ≥70% coverage for business logic (constitution).  
**Target Platform**: Web (responsive 360px–2560px); Chrome, Firefox, Safari, Edge (latest 2); modern mobile browsers.  
**Project Type**: Web application (frontend SPA + backend API).  
**Performance Goals**: Page load < 2s; mobile screens < 1.5s; DB queries < 500ms p95; 100 concurrent users (NFR-PERF-001–004).  
**Constraints**: TLS 1.3, encryption at rest; no logging of sensitive financial data; WCAG 2.1 AA; touch targets ≥44px on phone (NFR-SEC, NFR-USE).  
**Stocks API**: GET/POST `/api/v1/stocks` and GET price are in the API contract; implement with stub or optional external API for MVP (RSU/ESPP income types); full price integration can follow in a later phase.  
**Scale/Scope**: Single household account; MVP scope per PRD §8 Phases 1–5 and §10.1.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|--------|
| I. Single source of truth (Income) | Pass | Income page only place to enter income; Budget and Tax read from it. |
| II. Tech stack (React, Vite, Node, Supabase, Vercel) | Pass | Plan uses exactly this stack. |
| III. Quality (≥70% unit test coverage, API versioning, migrations) | Pass | Plan includes test tasks; API at `/api/v1`; Supabase migrations. |
| IV. UX & accessibility (responsive, WCAG 2.1 AA, loading/error states) | Pass | Design system and NFRs in PRD §7 and §5.4. |
| V. Security & reliability | Pass | Auth, TLS, no sensitive logging; graceful errors (NFR-REL-004/005). |
| VI. Performance | Pass | Goals and constraints above match NFR-PERF. |

No constitution violations. Complexity Tracking table left empty.

## Project Structure

### Documentation (this feature)

```text
specs/main/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── api-spec.md
└── tasks.md
```

### Source Code (repository root)

```text
frontend/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── index.tsx
│   ├── App.tsx
│   ├── css/
│   │   ├── app.css
│   │   ├── theme-dark.css
│   │   └── theme-light.css
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── auth/
│   │   │   ├── Login.tsx
│   │   │   └── GoogleCallback.tsx
│   │   ├── budget/
│   │   │   ├── BudgetOverview.tsx
│   │   │   ├── BudgetCategories.tsx
│   │   │   └── Income.tsx
│   │   ├── tax/
│   │   │   └── TaxDashboard.tsx
│   │   └── settings/
│   │       └── Settings.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── MainLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── UserArea.tsx
│   │   └── (ChartComponent, etc.)
│   ├── services/
│   │   ├── api.ts
│   │   ├── authService.ts
│   │   ├── budgetService.ts
│   │   └── taxService.ts
│   ├── hooks/
│   ├── context/
│   ├── types/
│   └── utils/
├── package.json
├── vite.config.ts
└── tsconfig.json

api/
├── src/
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── accounts.ts
│   │   ├── budgets.ts
│   │   └── tax.ts
│   ├── middleware/
│   │   └── auth.ts
│   ├── services/
│   └── lib/
│       └── supabase.ts
├── package.json
└── tsconfig.json

tests/
├── unit/
│   ├── frontend/
│   └── api/
├── integration/
└── contract/
```

**Structure Decision**: Web application with separate `frontend/` and `api/` directories. Frontend deployed to Vercel as static/Vite build; API as Vercel Serverless Functions under `/api/*` or single Node server. Same repo; single deployment unit. See [quickstart.md](./quickstart.md) for run instructions.

## Complexity Tracking

No constitution violations.
