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

**Decision**: Use **Finnhub** in the Node API for current price by ticker. Finnhub offers a free tier with an official REST API. Cache responses (e.g. 15 min) to stay within rate limits. Optional for MVP if ESPP/RSU real-time estimates are deferred; can stub the price endpoint until needed.

**Rationale**: Finnhub provides a free, official API for stock quotes—no scraping or unofficial wrappers. Good fit for a cost-conscious React + Node app: register at [finnhub.io](https://finnhub.io) for an API key, call the quote endpoint from the API server. Free tier has rate limits; caching keeps usage low and improves resilience.

**Implementation note (Node API)**:
- No extra npm package required: use `fetch` or `axios` to call `GET https://finnhub.io/api/v1/quote?symbol={SYMBOL}&token={FINNHUB_API_KEY}` (or send token via `X-Finnhub-Token` header).
- Response: `c` = current price; also `h`, `l`, `o`, `pc` (high, low, open, previous close). Expose via GET `/api/v1/stocks/{id}/price` (or by symbol).
- Set `FINNHUB_API_KEY` in API env (see `.env.example`). Cache results (in-memory or short TTL) to limit external calls.

**Example (API route handler)**:
```ts
async function getPrice(symbol: string): Promise<number | null> {
  const token = process.env.FINNHUB_API_KEY;
  if (!token) return null;
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${token}`;
  const res = await fetch(url);
  const data = await res.json();
  return data?.c ?? null;  // c = current price
}
```

**Alternatives considered**:
- yahoo-finance2: free but unofficial; can break if Yahoo changes layout.
- Alpha Vantage / other paid APIs: more features; add cost; consider later if needed.
- Stub only for MVP: valid; add Finnhub when implementing T035b if RSU/ESPP price display is in scope.

---

## 8. Hosting and deployment

**Decision**: Vercel for frontend (static build from Vite) and API (serverless functions); Supabase for DB and auth. Environment variables for Supabase URL/keys, Google OAuth client id/secret, API base URL. CI: Vercel Git integration; optional GitHub Actions for tests before deploy.

**Rationale**: PRD and constitution require Vercel + Supabase; minimal cost; single repo deployment.
