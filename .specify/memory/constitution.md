# Clearline Constitution

Governing principles and constraints for Spec-Driven Development of Clearline. All specs, plans, tasks, and implementation must align with this document. Source: [Clearline.md](../Clearline.md) (PRD).

## Core Principles

### I. Product-First and Single Source of Truth
- **Income is the single source of truth** for both Budget and Tax. Users enter income once on the Income page; Budget totals and Tax calculations read from it. No duplicate income entry in the Tax module.
- **Budget-derived deductions** are read-only in Tax; tax-only deductions and credits are managed in the Tax module. Specifications and implementation must preserve these boundaries.
- Features must serve the PRD goals: simplify tax preparation, clear estimated tax bill, household transparency, premium UX (dark/light theme, responsive).

### II. Technology Stack (Non-Negotiable for MVP)
- **Frontend:** React with TypeScript, Vite (or equivalent). State: React Context and/or React Query; routing: React Router. One responsive web app for computer and phone.
- **Backend:** Node.js (LTS), Express or Fastify or Vercel Serverless Functions, TypeScript. RESTful API with versioning (e.g. `/api/v1`).
- **Database:** Supabase (PostgreSQL). Schema and migrations per PRD §6.2; use Supabase migrations or SQL.
- **Hosting:** Vercel for frontend and API; Supabase for database and auth. Minimize cost (free tiers where possible).
- **Auth:** Google OAuth 2.0 for production; email sign-in for test/development. First user becomes account owner; invitations via `account_invitations` with token and expiry.

### III. Quality and Testing
- **Unit test coverage:** Business logic must have ≥ 70% unit test coverage (NFR-MAINT-002). Plan and tasks must include test tasks for core logic.
- **API versioning** for backward compatibility (NFR-MAINT-003). Database changes via migrations only (NFR-MAINT-004).
- Tax calculation logic must be testable against IRS/WA rules; include validation scenarios where applicable.

### IV. User Experience and Accessibility
- **Responsive and cross-device:** Same features and flows on computer and phone (NFR-USE-007). No desktop-only or mobile-only features. Touch targets ≥ 44×44px on phone; no horizontal scroll for primary content (NFR-USE-008, NFR-USE-009).
- **Accessibility:** Color contrast WCAG 2.1 AA (min 4.5:1 for text) in both dark and light themes (NFR-USE-004). Semantic colors consistent across themes (NFR-USE-006).
- **Forms:** Inline validation, clear error messages, required fields indicated. Monetary amounts non-negative unless explicitly supported (NFR-USE-002). Loading and error states on data-dependent screens (NFR-REL-004, NFR-REL-005).
- **Navigation:** ≤ 3 clicks to any feature (NFR-USE-003). Design system: Atlanta Falcons–inspired palette and typography per PRD §7.

### V. Security and Reliability
- **Security:** TLS 1.3 in transit; encryption at rest (AES-256). Auth tokens expire per policy (e.g. 24h). Sensitive financial data must not be logged (NFR-SEC-001–006). API endpoints require authentication; rate limiting on auth (e.g. max 5 failed logins per 15 min).
- **Reliability:** Graceful error handling; user-friendly messages and retry on API failure. No broken or blank screens (NFR-REL-004). Use Vercel/Supabase SLAs and backups where available (NFR-REL-001–003).

### VI. Performance and Scale
- **Performance:** Page load < 2 s on standard broadband; mobile screens < 1.5 s; DB queries < 500 ms p95 (NFR-PERF-001–003). Support 100 concurrent users without degradation (NFR-PERF-004).
- **Scope:** One responsive codebase; support Chrome, Firefox, Safari, Edge (latest 2 versions) and modern mobile browsers (NFR-COMP-001–003).

## Additional Constraints

- **State support:** Washington (WA) only at launch. Data model and tax logic must be extensible for additional states (state_code, state-specific rules) without core schema redesign.
- **Currency:** USD only for MVP; no multi-currency. Display and input use dollar formatting (e.g. $1,234.56).
- **Tax disclaimer:** App is for estimation only; users are responsible for verifying with a tax professional. Implementation must not imply otherwise.

## Development Workflow

- **Spec-Driven Development:** Follow the spec-kit workflow: constitution (this file) → specify → plan → tasks → implement. Reference Clearline.md for full requirements; specs summarize and cite requirement IDs (e.g. FR-AUTH-000, FR-BUDGET-INCOME-001).
- **Code style:** Node.js/TypeScript and React/TypeScript best practices (NFR-MAINT-001). Prefer clarity and maintainability; avoid over-engineering. Justify any constitution exception in plan or PR.
- **Feature scope:** MVP scope is defined by PRD §8 (Phases 1–5) and §10.1 (MVP launch criteria). Out-of-scope or future work must be explicitly deferred.

## Governance

- This constitution supersedes ad-hoc preferences for spec, plan, and implementation decisions. When in doubt, resolve by referring to Clearline.md and this document.
- Amendments require updating this file and documenting the change (version/date). Implementation and specs must stay consistent with the amended constitution.
- All plan and task generation must pass a constitution check: stack, NFRs, and principles above must be satisfied or explicitly justified (e.g. in plan’s Complexity Tracking).

**Version:** 1.0.0 | **Ratified:** 2026-03-07 | **Last Amended:** 2026-03-07
