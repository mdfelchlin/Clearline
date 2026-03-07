# Feature Specification: Clearline MVP

**Feature Branch**: `001-clearline-mvp`  
**Created**: 2026-03-07  
**Status**: Draft  
**Canonical PRD**: [Clearline.md](../../../Clearline.md) — all detailed requirements and IDs are defined there; this spec distills user stories and references.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Authenticated access and dashboard (Priority: P1)

Primary account holder (or household member) signs in with Google or email, lands on Dashboard, and sees the app-level year selector. Unauthenticated users see only login; after login they are placed on Dashboard. They can sign out and have session/refresh handled.

**Why this priority**: Nothing else is usable without auth and the home view.

**Independent Test**: Sign in (Google or email), confirm redirect to Dashboard and year selector in top bar; sign out and confirm redirect to login. No app content visible when unauthenticated.

**Acceptance Scenarios**:

1. **Given** unauthenticated user visits any path, **When** page loads, **Then** only login experience is shown (FR-AUTH-000, FR-AUTH-000b).
2. **Given** user completes Google or email sign-in, **When** auth succeeds, **Then** user is placed on Dashboard (FR-AUTH-000c).
3. **Given** authenticated user, **When** they use user area/settings to sign out, **Then** session is cleared and they are redirected to login (FR-AUTH-007b).

---

### User Story 2 - Budget and income entry (Priority: P2)

User selects year (default current year), adds income sources on the Income page (e.g. W-2, bonus, RSU), marks income as Expected or Official. User adds budget categories and line items (amount + period). Budget Overview shows Total Income (Official only), Total Expenses, Amount Left Over. Income is single source of truth for Budget and Tax.

**Why this priority**: Core value is tracking income and budget; Tax and Dashboard depend on it.

**Independent Test**: Add W-2 and one expense category with line items; confirm Budget Overview shows correct Total Income, Total Expenses, Amount Left Over. Confirm Income page is the only place to edit income.

**Acceptance Scenarios**:

1. **Given** selected year, **When** user adds income on Income page and marks as Official, **Then** Budget Total Income and Amount Left Over include it (FR-BUDGET-INCOME-001, FR-BUDGET-INCOME-002, FR-BUDGET-INCOME-012–014).
2. **Given** user on Budget Categories, **When** user adds category and line items (amount, period Annual/Monthly), **Then** category total is sum in annual equivalent and Total Expenses update (FR-BUDGET-003, FR-BUDGET-005b, FR-BUDGET-019).
3. **Given** no income for year, **When** user opens Income page, **Then** empty state with CTA to add first income source is shown (FR-BUDGET-INCOME-007b).

---

### User Story 3 - Tax view and estimated tax (Priority: P3)

User opens Tax Preparation and sees Income group (read-only, from Income page), deductions (budget-derived read-only + tax-side), tax settings (state, filing status, dependents, pre-tax deductions), and estimated tax bill. User can add/edit tax-only deductions and credits. System shows standard vs itemized when relevant.

**Why this priority**: Delivers the “clear tax picture” goal; depends on Income and Budget.

**Independent Test**: With Official income and tax profile set, open Tax; confirm income is read-only with “Edit income” to Income tab; change tax settings and see estimated tax update. Add a tax-only deduction and confirm it affects calculation.

**Acceptance Scenarios**:

1. **Given** user has Official income, **When** user opens Tax Preparation, **Then** Income group lists income read-only with link to Income tab (FR-TAX-001, FR-TAX-002).
2. **Given** user has budget categories marked tax deduction, **When** on Tax view, **Then** those deductions appear read-only; user can add additional deductions/credits in Tax (FR-TAX-010, FR-TAX-011).
3. **Given** user sets tax settings (state, filing status, etc.), **When** calculation runs, **Then** estimated tax bill (and optional YTD withholding / refund owed) is displayed (FR-TAX-013, FR-TAX-016).

---

### User Story 4 - Household and settings (Priority: P4)

Account owner invites users via email; invitees accept and join account. All members have equal read/write access. Users see account members; owner can remove members; any user can leave. Settings: notification preferences, Invite Users, Account & Members, Profile, Appearance (theme Dark/Light persisted). Sidebar shows user area (avatar, name) linking to Settings.

**Why this priority**: Enables household transparency and personalization; can follow core budget/tax flows.

**Independent Test**: As owner, invite an email; as invitee, accept and see shared account. Change theme and confirm persistence. View members, remove (owner), leave (member).

**Acceptance Scenarios**:

1. **Given** account owner, **When** they invite by email, **Then** invitation is stored with token and expiry; invitee can accept (FR-AUTH-003).
2. **Given** authenticated user, **When** they open Settings, **Then** Notification Preferences, Invite Users, Account & Members, Profile, Appearance (theme) are available (FR-SETTINGS-001).
3. **Given** user changes theme to Light, **When** they reload or switch device (logged in), **Then** theme is Light (FR-PREF-001, FR-PREF-002).

---

### User Story 5 - Year selector and empty states (Priority: P5)

User sees year selector in top bar (default current year); can add a year in reasonable range. Dashboard, Budget, and Tax all use the same selected year. When no data for the year, Dashboard and Budget show empty states with CTAs (add income, set up budget); Tax shows guided state.

**Why this priority**: Completes cross-module consistency and onboarding feel.

**Independent Test**: Add a year; switch years and confirm Dashboard, Budget, Tax all reflect selected year. Clear data for a year and confirm empty/guided states.

**Acceptance Scenarios**:

1. **Given** user opens app, **When** they have not selected a year, **Then** default year is current calendar year (FR-YEAR-001).
2. **Given** user adds a year (e.g. 2027), **When** they select it, **Then** Dashboard, Budget (all tabs), and Tax show data for that year (FR-YEAR-002, FR-YEAR-003).
3. **Given** no budget/income for selected year, **When** user is on Dashboard, **Then** empty state with CTAs to add income or set up budget (FR-DASH-005).

### Edge Cases

- Unauthenticated access to any path: redirect to login; no app content (FR-AUTH-000).
- Session/token expiry: redirect to login, preserve intended URL for post re-auth (FR-AUTH-006).
- API/network failure: show user-friendly message and retry; loading state while fetching (NFR-REL-004, NFR-REL-005).
- Invalid numeric/monetary input: validate before submit; non-negative amounts (NFR-USE-002).
- Remove category/member/leave account: confirmation required (FR-BUDGET-002, FR-AUTH-008, FR-AUTH-009).

## Requirements *(mandatory)*

Full text for each requirement is in **Clearline.md**. This section references by area and ID.

### Functional Requirements (by area)

- **Auth & access:** FR-AUTH-000, FR-AUTH-000b, FR-AUTH-000c, FR-AUTH-001, FR-AUTH-001b, FR-AUTH-002 through FR-AUTH-009, FR-AUTH-007b. Unauthenticated users see only login; first user is owner; invitations; session and logout.
- **Preferences & UI:** FR-PREF-001–004 (theme), FR-SIDE-001–002 (sidebar user area), FR-SETTINGS-001–003 (Settings), FR-YEAR-001–004 (year selector).
- **Budget & income:** FR-BUDGET-INCOME-001–014 (Income page as single source of truth; Official vs Expected; type-specific dialogs; W-2, Bonus, RSU, ESPP, etc.), FR-BUDGET-001–021 (categories, line items, Income/Taxes special categories, summary cards, empty states).
- **Tax:** FR-TAX-001–018 (income read-only from Income page; deductions; tax settings; calculation; empty/guided state).
- **Dashboard:** FR-DASH-001–008 (summary cards, chart, quick actions, empty state, optional walkthrough).

### Key Entities

From PRD §6.2 (Supabase/PostgreSQL):

- **users** — id, google_id, email, name, display_name, account_id, theme_preference, notification_preferences, etc.
- **accounts** — id, owner_id, account_name.
- **account_members**, **account_invitations** — household membership and invites.
- **budgets** — per account per year.
- **budget_income_sources** — Income page; type, amount, status (Expected/Official), type_specific_data.
- **budget_categories** — Income group, expense categories, Taxes category; is_tax_deduction, etc.
- **budget_category_line_items** — amount, period (Annual/Monthly).
- **tax_profiles** — per account per year; state_code, filing_status, dependents, pre_tax_deductions, ytd_withholding.
- **tax_only_deductions** — deductions/credits not in budget.
- **stocks** — for ESPP/RSU real-time estimates (ticker, account).

## Success Criteria *(mandatory)*

From PRD §10.1 (MVP launch criteria) and §10.2 (UAC):

### Measurable Outcomes

- **SC-001:** User can sign in with Google (and email for test).
- **SC-002:** User can select and persist dark or light theme (Settings).
- **SC-003:** User can invite household members and manage account/members.
- **SC-004:** User can create and track annual budget (categories, line items; Income page as source of truth).
- **SC-005:** User can enter income types (W-2, ESPP, RSU, bonuses, etc.) on Income page.
- **SC-006:** System calculates federal tax liability; displays estimated tax and optional YTD withholding / refund or owed.
- **SC-007:** React web app is responsive and equally usable on computer and phone (same features, touch-friendly).
- **SC-008:** Application deployed on Vercel (React frontend + Node.js API + Supabase).
- **SC-009:** Core features have ≥ 70% test coverage.
- **SC-010:** Users can complete common workflows in < 5 minutes; “easy to use” ≥ 4/5; zero critical bugs; tax calculations within $50 of IRS examples where validated.
