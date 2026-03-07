# Quickstart: Clearline MVP

**Feature**: Clearline MVP | **Date**: 2026-03-07

How to run the Clearline app locally after implementation. Adjust paths if the repo structure differs (see [plan.md](./plan.md)).

---

## Prerequisites

- **Node.js** LTS (e.g. 20.x)
- **npm** or **pnpm**
- **Supabase** project ([supabase.com](https://supabase.com)); create one and note Project URL and anon key (and service role key for API)
- **Google OAuth** (optional for prod): create OAuth 2.0 credentials for sign-in

---

## Environment

Copy `.env.example` to `.env` (or `.env.local`) in repo root or in `frontend/` and `api/` as needed. Set at least:

- `SUPABASE_URL` — Supabase project URL  
- `SUPABASE_ANON_KEY` — Supabase anon key  
- `SUPABASE_SERVICE_ROLE_KEY` — Server-side only (API)  
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — For frontend (Vite exposes `VITE_*`)  
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — For Google sign-in (if implemented)

For API base URL from frontend:

- `VITE_API_URL=http://localhost:3000/api/v1` (or use Vite proxy so same-origin)

---

## Run frontend

```bash
cd frontend
npm install
npm run dev
```

- App: **http://localhost:5173** (Vite default)
- Unauthenticated users see only login; after sign-in, redirect to Dashboard (FR-AUTH-000c).

---

## Run API

If API is a separate Node server (Express/Fastify):

```bash
cd api
npm install
npm run dev
```

- API: **http://localhost:3000** (or port in config)
- Endpoints under **http://localhost:3000/api/v1** (see [contracts/api-spec.md](./contracts/api-spec.md)).

If API is Vercel serverless, use `vercel dev` from repo root so both frontend and `/api/*` run together (see Vercel docs).

---

## Vite proxy (optional)

To avoid CORS during local dev, in `frontend/vite.config.ts`:

```ts
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
```

Then frontend can call `/api/v1/...` as same-origin.

---

## Database

- Apply schema and migrations per PRD §6.2 (Supabase migrations or SQL in Supabase dashboard).
- Ensure RLS (row-level security) and service role usage match design: API uses service role; frontend only uses anon key for auth flows as intended.

---

## Validate

1. Open http://localhost:5173 → login only.  
2. Sign in (Google or email) → redirect to Dashboard; year selector in top bar.  
3. Add a year, add income (e.g. W-2), add budget category and line items → Budget Overview shows Total Income, Total Expenses, Amount Left Over.  
4. Open Tax Preparation → income read-only, link to Income tab; set tax settings → see estimated tax.  
5. Settings → theme, invite (owner), account members.

See [spec.md](./spec.md) and [Clearline.md](../../Clearline.md) for full requirements.
