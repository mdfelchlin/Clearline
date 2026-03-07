# Tasks: Clearline MVP

**Input**: Design documents from `specs/main/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Constitution requires ≥70% unit test coverage for business logic. Test tasks are included for API and key frontend logic.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `frontend/src/`, `api/src/`, `tests/unit/frontend/`, `tests/unit/api/`, `tests/integration/`, `tests/contract/`
- All paths relative to repository root (Clearline)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure per plan.md

- [ ] T001 Create directory structure: frontend/, api/, tests/unit/frontend/, tests/unit/api/, tests/integration/, tests/contract/ per plan.md
- [ ] T002 Initialize frontend with Vite + React + TypeScript: frontend/package.json, frontend/vite.config.ts, frontend/tsconfig.json, frontend/index.html
- [ ] T003 Initialize API with Node.js + TypeScript: api/package.json, api/tsconfig.json, api/src entry (Express or Fastify or Vercel serverless layout)
- [ ] T004 [P] Add frontend dependencies: React, React Router, TanStack Query, @supabase/supabase-js; frontend/package.json
- [ ] T005 [P] Add API dependencies: Express or Fastify, Zod, @supabase/supabase-js, Pino or structured logging; api/package.json
- [ ] T006 [P] Configure ESLint and Prettier for frontend (frontend/.eslintrc, frontend/.prettierrc or equivalent)
- [ ] T007 [P] Configure ESLint and Prettier for API (api/.eslintrc, api/.prettierrc or equivalent)
- [ ] T008 Add Vitest and React Testing Library to frontend for unit tests; frontend/vite.config.ts and frontend/package.json

**Checkpoint**: Repo has frontend and api packages; `npm run dev` runs frontend; API can start or be stubbed.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story. No user story work until this phase is complete.

- [ ] T009 Create Supabase migration(s) for schema per data-model.md and PRD §6.2: users, accounts, account_members, account_invitations (in supabase/migrations/ or documented SQL)
- [ ] T010 Add Supabase migrations for budgets, budget_income_sources, budget_categories, budget_category_line_items, stocks, tax_profiles, tax_only_deductions
- [ ] T011 [P] Implement API auth middleware: verify JWT, attach user to request; api/src/middleware/auth.ts
- [ ] T012 [P] Implement API base routing and /api/v1 mount; api/src/ (or Vercel api/ routes)
- [ ] T013 [P] Create Supabase client helper for API (service role); api/src/lib/supabase.ts
- [ ] T014 Configure centralized error handling and user-friendly response format (no stack traces, no sensitive data); api/src/middleware or error handler
- [ ] T015 Configure structured logging (Pino or equivalent); do not log sensitive financial data; api/src/lib/logger.ts or equivalent
- [ ] T016 Add environment configuration: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET (or Supabase JWT); api/.env.example and validation
- [ ] T017 Add frontend API client base: base URL (VITE_API_URL or proxy), auth header injection; frontend/src/services/api.ts
- [ ] T018 Add AuthContext and useAuth hook for frontend (session, user, login redirect); frontend/src/context/AuthContext.tsx, frontend/src/hooks/useAuth.ts
- [ ] T018b [P] Implement auth rate limiting (max 5 failed logins per 15 min) on auth endpoints per NFR-SEC-006 and constitution §V; api/src/middleware/rateLimit.ts or api/src/routes/auth.ts

**Checkpoint**: Foundation ready — DB schema exists, API can authenticate and route, frontend has API client and auth context. User story implementation can begin.

---

## Phase 3: User Story 1 - Authenticated access and dashboard (Priority: P1) — MVP

**Goal**: User can sign in (Google or email), land on Dashboard, see year selector in top bar; unauthenticated users see only login; user can sign out.

**Independent Test**: Sign in (Google or email), confirm redirect to Dashboard and year selector; sign out and confirm redirect to login. No app content visible when unauthenticated.

### Tests for User Story 1

- [ ] T019 [P] [US1] Unit test auth middleware (valid/invalid JWT) in tests/unit/api/auth.middleware.test.ts
- [ ] T020 [P] [US1] Unit test POST /api/v1/auth/google or auth flow in tests/unit/api/auth.routes.test.ts

### Implementation for User Story 1

- [ ] T021 [US1] Implement POST /api/v1/auth/google: validate Google token, create/fetch user and account (first user = owner), return JWT; api/src/routes/auth.ts
- [ ] T022 [US1] Implement POST /api/v1/auth/email for test accounts (magic link or email+password via Supabase); api/src/routes/auth.ts
- [ ] T023 [US1] Implement GET /api/v1/auth/user and POST /api/v1/auth/refresh; api/src/routes/auth.ts
- [ ] T024 [US1] Implement Login page: Google and email sign-in only; no app content when unauthenticated; frontend/src/pages/auth/Login.tsx
- [ ] T025 [US1] Implement OAuth callback route and redirect to Dashboard on success; frontend/src/pages/auth/GoogleCallback.tsx or equivalent
- [ ] T026 [US1] Implement route guard: all routes except login and callback require auth; redirect unauthenticated to login with return URL preserved (query param or sessionStorage) and redirect to that URL after re-auth per FR-AUTH-006; frontend/src/App.tsx or router
- [ ] T027 [US1] Implement MainLayout with top bar (year selector placeholder) and Sidebar; frontend/src/components/layout/MainLayout.tsx, Sidebar.tsx
- [ ] T028 [US1] Implement Dashboard page (placeholder summary cards and year in top bar); frontend/src/pages/Dashboard.tsx
- [ ] T029 [US1] Implement UserArea (avatar, display name) and sign-out: clear session, redirect to login; frontend/src/components/layout/UserArea.tsx and authService logout
- [ ] T030 [US1] Wire authService (login, logout, get user, refresh) to API; frontend/src/services/authService.ts

**Checkpoint**: User Story 1 complete. Sign in → Dashboard; sign out → login; no app content when unauthenticated.

---

## Phase 4: User Story 2 - Budget and income entry (Priority: P2)

**Goal**: User selects year, adds income on Income page (e.g. W-2), marks Official; adds budget categories and line items; Budget Overview shows Total Income (Official only), Total Expenses, Amount Left Over.

**Independent Test**: Add W-2 and one expense category with line items; confirm Budget Overview shows correct totals. Income page is the only place to edit income.

### Tests for User Story 2

- [ ] T031 [P] [US2] Unit test budget summary logic (Official income only, category totals) in tests/unit/api/budgets.test.ts
- [ ] T032 [P] [US2] Unit test income CRUD and status Expected/Official in tests/unit/api/income.test.ts

### Implementation for User Story 2

- [ ] T033 [US2] Implement GET/POST /api/v1/budgets and GET /api/v1/budgets/{year}/summary (totalIncome from Official income, totalExpenses, amountLeftOver); api/src/routes/budgets.ts
- [ ] T034 [US2] Implement GET/POST/DELETE /api/v1/budgets/{year}/income; api/src/routes/budgets.ts or income sub-routes
- [ ] T035 [US2] Implement GET/POST/PUT/PATCH/DELETE for categories and line items per contracts/api-spec.md; api/src/routes/budgets.ts
- [ ] T035b [US2] Implement GET/POST /api/v1/stocks and GET /api/v1/stocks/{id}/price (stub or optional external API) per contracts/api-spec.md; api/src/routes/stocks.ts
- [ ] T036 [US2] Ensure one Income and one Taxes special category per budget (system-created); api services
- [ ] T037 [US2] Implement Income page: list income by type, add (type selector + type-specific dialog), Edit/Duplicate/Delete, status Expected/Official; frontend/src/pages/budget/Income.tsx
- [ ] T038 [US2] Implement Budget Overview page: three cards (Total Income, Total Expenses, Amount Left Over), breakdown, one chart (expenses by category); frontend/src/pages/budget/BudgetOverview.tsx
- [ ] T039 [US2] Implement Budget Categories page: Income group (read-only), expense categories, line items (amount, period Annual/Monthly), Taxes category (read-only from API); frontend/src/pages/budget/BudgetCategories.tsx
- [ ] T040 [US2] Implement budgetService and taxService (get summary, income, categories, line items); frontend/src/services/budgetService.ts
- [ ] T041 [US2] Income page empty state: CTA "Add your first income source" when no income for year; frontend/src/pages/budget/Income.tsx
- [ ] T042 [US2] Budget Categories empty state: CTA when no categories/line items; frontend/src/pages/budget/BudgetCategories.tsx

**Checkpoint**: User Story 2 complete. Income page is single source of truth; Budget Overview and Categories show correct totals and empty states.

---

## Phase 5: User Story 3 - Tax view and estimated tax (Priority: P3)

**Goal**: User opens Tax Preparation and sees Income (read-only), deductions (budget-derived read-only + tax-side), tax settings, estimated tax bill. User can add/edit tax-only deductions; system shows standard vs itemized when relevant.

**Independent Test**: With Official income and tax profile set, open Tax; income read-only with "Edit income" link; change tax settings and see estimated tax update; add tax-only deduction and confirm calculation.

### Tests for User Story 3

- [ ] T043 [P] [US3] Unit test tax calculation (federal brackets, standard vs itemized, credits) in tests/unit/api/tax.calculate.test.ts
- [ ] T044 [P] [US3] Unit test tax profile and tax_only_deductions CRUD in tests/unit/api/tax.routes.test.ts

### Implementation for User Story 3

- [ ] T045 [US3] Implement GET/PUT /api/v1/tax/{year} (tax profile); GET /api/v1/tax/{year}/deductions and /deductions/other CRUD; api/src/routes/tax.ts
- [ ] T046 [US3] Implement GET /api/v1/tax/{year}/calculate: read income from budgets/{year}/income (Official only), budget-derived deductions, tax_only_deductions; apply federal brackets, standard deduction, credits; api/src/routes/tax.ts and service
- [ ] T047 [US3] Implement GET /api/v1/tax/{year}/summary for dashboard; api/src/routes/tax.ts
- [ ] T048 [US3] Implement TaxDashboard page: Income group (read-only, link "Edit income" to Income tab), Deductions section (budget read-only + add/edit tax-only), Tax settings (state, filing status, dependents, pre-tax), estimated tax bill; frontend/src/pages/tax/TaxDashboard.tsx
- [ ] T049 [US3] Tax calculation service: 2026 brackets (Single/MFJ), standard deduction, FICA by income type per PRD; api/src/services/taxCalculation.ts or equivalent
- [ ] T050 [US3] Tax empty/guided state: message and links when no Official income or no tax profile; frontend/src/pages/tax/TaxDashboard.tsx
- [ ] T051 [US3] Wire taxService (get profile, deductions, calculate, summary) in frontend; frontend/src/services/taxService.ts

**Checkpoint**: User Story 3 complete. Tax view shows read-only income, deductions, settings, and estimated tax; tax-only deductions affect calculation.

---

## Phase 6: User Story 4 - Household and settings (Priority: P4)

**Goal**: Account owner can invite by email; invitee accepts and joins. Settings: Notification Preferences, Invite Users, Account & Members, Profile, Appearance (theme). Theme persisted; sidebar UserArea links to Settings.

**Independent Test**: As owner invite email; as invitee accept; change theme and confirm persistence; view members, remove (owner), leave (member).

### Tests for User Story 4

- [ ] T052 [P] [US4] Unit test account members and invitations (invite, accept, remove, leave) in tests/unit/api/accounts.test.ts
- [ ] T053 [P] [US4] Unit test user preferences (theme) update in tests/unit/api/auth.preferences.test.ts

### Implementation for User Story 4

- [ ] T054 [US4] Implement GET /api/v1/accounts, GET/POST /api/v1/accounts/{id}/members, GET /api/v1/accounts/{id}/invitations, DELETE members, POST /api/v1/invitations/accept; api/src/routes/accounts.ts
- [ ] T055 [US4] Implement PUT /api/v1/auth/user/preferences (theme, notification preferences, display name); api/src/routes/auth.ts
- [ ] T056 [US4] Implement Settings page: Notification Preferences, Invite Users (owner), Account & Members (list, remove, leave), Profile (display name, email read-only), Appearance (theme Dark/Light); frontend/src/pages/settings/Settings.tsx
- [ ] T057 [US4] Theme persistence: save theme via API on change, load on app init; apply immediately (no restart); frontend ThemeContext or useTheme + authService preferences
- [ ] T058 [US4] Sidebar UserArea click navigates to Settings; frontend/src/components/layout/UserArea.tsx and Sidebar.tsx
- [ ] T059 [US4] Invitation flow: owner sends invite (token, expiry); invitee accepts via link or token; add to account_members, update invitation status; api and frontend invite UI

**Checkpoint**: User Story 4 complete. Invites work; Settings and theme persistence work; UserArea → Settings.

---

## Phase 7: User Story 5 - Year selector and empty states (Priority: P5)

**Goal**: Year selector in top bar (default current year); user can add a year; Dashboard, Budget, and Tax use same selected year. Empty states for Dashboard and Budget when no data; Tax guided state.

**Independent Test**: Add a year, switch years and confirm all areas reflect it; clear data and confirm empty/guided states.

### Implementation for User Story 5

- [ ] T060 [US5] Implement year selector in MainLayout top bar: dropdown with available years (current + years with budget/data), "Add year" (e.g. 2016–2036); store selected year in context or URL; frontend/src/components/layout/MainLayout.tsx and YearSelector component
- [ ] T061 [US5] Pass selected year to Dashboard, Budget (all tabs), and Tax; all API calls use selected year; frontend context or route/state
- [ ] T062 [US5] Dashboard empty state: when no income/budget for selected year, show message and CTAs (add income, set up budget); frontend/src/pages/Dashboard.tsx
- [ ] T063 [US5] Ensure Budget Overview and Categories empty states and Tax guided state are consistent with spec (FR-DASH-005, FR-BUDGET-014, FR-TAX-018)

**Checkpoint**: User Story 5 complete. Year selector drives all views; empty and guided states correct.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility, coverage, and validation per constitution and quickstart.

- [ ] T064 [P] Add unit tests for frontend business logic (budget totals, year handling) to reach ≥70% coverage for business logic; tests/unit/frontend/
- [ ] T065 [P] Add unit tests for API services (tax calculation, budget summary) to reach ≥70% coverage; tests/unit/api/
- [ ] T066 Implement design system: Atlanta Falcons palette (theme-dark.css, theme-light.css), WCAG 2.1 AA contrast, touch targets ≥44px; frontend/src/css/
- [ ] T067 Add loading states for data-dependent screens (Dashboard, Budget, Tax, Income); skeleton or spinner per NFR-REL-005
- [ ] T068 Add error states and user-friendly messages with retry for API failures; no broken/blank screens per NFR-REL-004
- [ ] T069 Form validation: required fields, non-negative amounts, inline errors per NFR-USE-002; frontend forms
- [ ] T070 Run quickstart.md validation: local run, sign-in, add income, budget, tax flow; fix any gaps
- [ ] T071 [P] Add .env.example and document SPECIFY_FEATURE, Supabase, and API URLs in README or quickstart

**Checkpoint**: Polish complete. ≥70% test coverage for business logic; accessibility and error handling in place; quickstart passes.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories.
- **Phase 3 (US1)**: Depends on Phase 2 only — first deliverable MVP.
- **Phase 4 (US2)**: Depends on Phase 2; uses auth from US1.
- **Phase 5 (US3)**: Depends on Phase 2; uses income and budget from US2.
- **Phase 6 (US4)**: Depends on Phase 2; uses auth and account from US1.
- **Phase 7 (US5)**: Depends on Phase 3 (layout); can overlap with US2–US4.
- **Phase 8 (Polish)**: Depends on completion of desired user stories.

### User Story Dependencies

- **US1 (P1)**: No dependency on other stories. Delivers auth and dashboard.
- **US2 (P2)**: Needs US1 for auth; independently testable (add income, categories, view summary).
- **US3 (P3)**: Needs US2 for income and budget data; independently testable (tax view and calculation).
- **US4 (P4)**: Needs US1 for auth; independently testable (invite, settings, theme).
- **US5 (P5)**: Needs US1 for layout; enhances US2/US3 with year selector and empty states.

### Within Each User Story

- Tests (T019–T020, T031–T032, etc.) can be written first and run in parallel where marked [P].
- API routes and services before frontend pages that call them.
- Commit after each task or logical group.

### Parallel Opportunities

- Phase 1: T004, T005, T006, T007 can run in parallel.
- Phase 2: T011, T012, T013 can run in parallel.
- Within US1: T019, T020 in parallel; US2: T031, T032 in parallel; US3: T043, T044 in parallel; US4: T052, T053 in parallel.
- Phase 8: T064, T065, T071 in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup  
2. Complete Phase 2: Foundational  
3. Complete Phase 3: User Story 1  
4. **STOP and VALIDATE**: Sign in, Dashboard, sign out.  
5. Deploy/demo if ready.

### Incremental Delivery

1. Setup + Foundational → foundation ready.  
2. Add US1 → test (auth + dashboard) → deploy.  
3. Add US2 → test (income + budget) → deploy.  
4. Add US3 → test (tax) → deploy.  
5. Add US4 → test (household, settings) → deploy.  
6. Add US5 → test (year selector, empty states) → deploy.  
7. Phase 8 Polish → final validation.

### Suggested MVP Scope

- **Minimum**: Phases 1–3 (Setup, Foundational, User Story 1). Delivers sign-in, Dashboard, year selector placeholder, sign-out.  
- **Next**: Phase 4 (User Story 2) for core value (income + budget).

---

## Notes

- [P] = parallelizable (different files, no blocking dependencies).
- [USn] = task belongs to User Story n for traceability.
- Each user story phase is independently testable per spec.
- File paths follow plan.md: frontend/src/, api/src/, tests/unit/frontend/, tests/unit/api/.
