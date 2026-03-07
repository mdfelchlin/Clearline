# Research: Clearline MVP

**Feature**: Clearline MVP | **Date**: 2026-03-07

Resolves technical choices for the stack (React + Vite + TypeScript, Node API on Vercel, Supabase). All items from Technical Context are specified by the user and PRD; this document records decisions and alternatives.

---

## 1. Frontend: React + Vite + TypeScript

**Decision**: React 18+ with TypeScript (strict), Vite as build tool, React Router for routing.

**Rationale**: PRD §6.1 specifies React with TypeScript recommended, Vite or CRA; constitution mandates React + Vite. Vite gives fast HMR and simple config; React 18 is stable and supports concurrent features if needed.

**Alternatives considered**:
- Create React App: heavier, slower; PRD allows Vite.
- Next.js: not required for SPA; Vercel hosts static export or SPA; keeps API separate per PRD.

---

## 2. State management: React Context and/or TanStack Query

**Decision**: React Context for auth and theme; TanStack Query (React Query) for server state (budgets, income, tax, account).

**Rationale**: PRD §6.1 lists "React Context and/or React Query"; server state (API data) benefits from caching and refetch (Query); local UI state (theme, selected year) fits Context.

**Alternatives considered**:
- Redux: overkill for MVP; constitution prefers clarity and avoid over-engineering.
- Context-only for everything: works but no built-in cache/refetch for API data.

---

## 3. Backend: Node.js API (Vercel serverless or Express/Fastify)

**Decision**: Node.js (LTS), TypeScript; implement as Vercel Serverless Functions under `/api/v1/*` in same repo as frontend, or as a single Express/Fastify server for local dev that can be adapted to serverless handlers.

**Rationale**: PRD §6.1: "Express or Fastify (or Vercel Serverless Functions for API routes)"; single Vercel project keeps deployment simple and cost minimal. Versioned API at `/api/v1` per NFR-MAINT-003.

**Alternatives considered**:
- Separate API repo: adds deploy and CORS; PRD allows same project.
- Supabase Edge Functions only: would move business logic to Edge; PRD expects Node API for auth and tax logic.

---

## 4. Database and auth: Supabase

**Decision**: Supabase for PostgreSQL (hosted), schema per PRD §6.2; Supabase Auth for Google OAuth and email (magic link or email+password) for test accounts. Backend uses Supabase client with service role for server-side operations; frontend uses anon key only for public auth flows; API validates JWT and talks to Supabase.

**Rationale**: Constitution and PRD require Supabase; auth via Google + email for test; first user becomes account owner; invitations in `account_invitations` with token and expiry.

**Alternatives considered**:
- Custom Postgres + Passport.js only: more work; Supabase provides auth and realtime if needed later.
- Auth0/Clerk: adds cost; PRD targets minimal cost with Supabase.

---

## 5. Validation and logging

**Decision**: Zod for request/response validation in API; Pino or structured console logging. No logging of sensitive financial data (NFR-SEC-004).

**Rationale**: PRD §6.1 suggests Zod, Joi, or express-validator; Zod is TypeScript-native. Logging: Pino or Winston per PRD; constitution forbids logging sensitive financial data.

---

## 6. Testing

**Decision**: Vitest for unit tests (frontend + API); React Testing Library for components. Target ≥70% coverage for business logic (constitution). Contract or integration tests for critical API flows optional but recommended.

**Rationale**: NFR-MAINT-002 and constitution require ≥70% unit test coverage for business logic. Vitest is fast and Vite-friendly; RTL is standard for React.

---

## 7. Stock price data (ESPP/RSU estimates)

**Decision**: Third-party market-data API (e.g. Yahoo Finance, Alpha Vantage) for current/delayed price by ticker; cache (e.g. 15 min) to respect rate limits and cost. Optional for MVP if ESPP/RSU real-time estimates are deferred.

**Rationale**: PRD §6.1 and spec mention real-time estimates for RSU/ESPP when linked to a stock; PRD notes rate limits and caching. Can stub or defer to post-MVP if needed to ship faster.

---

## 8. Hosting and deployment

**Decision**: Vercel for frontend (static build from Vite) and API (serverless functions); Supabase for DB and auth. Environment variables for Supabase URL/keys, Google OAuth client id/secret, API base URL. CI: Vercel Git integration; optional GitHub Actions for tests before deploy.

**Rationale**: PRD and constitution require Vercel + Supabase; minimal cost; single repo deployment.
