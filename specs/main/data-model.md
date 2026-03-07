# Data Model: Clearline MVP

**Feature**: Clearline MVP | **Source**: [Clearline.md](../../Clearline.md) §6.2

Entity summary for Supabase (PostgreSQL). Full column definitions and notes are in the PRD. Schema changes via Supabase migrations or SQL only (NFR-MAINT-004).

---

## Entity relationships (summary)

- One **account** per household; **users** belong to an account (owner or member).
- **Budgets** are per account per **year**; each budget has **budget_income_sources** (Income page — single source of truth) and **budget_categories** (Income group, expense categories, Taxes category).
- Expense categories have **budget_category_line_items** (amount + period).
- **tax_profiles** are per account per year; income for tax is read from budget_income_sources.
- **tax_only_deductions** store deductions/credits not in the budget.
- **stocks** are per account; referenced from income entries (ESPP, RSU) via type_specific_data for real-time estimates.

---

## Tables

| Table | Purpose | Key relationships |
|-------|---------|--------------------|
| **users** | User identity, preferences, account link | account_id → accounts; theme_preference, notification_preferences |
| **accounts** | Household account | owner_id → users |
| **account_members** | User–account membership | (account_id, user_id) PK; FKs to accounts, users |
| **account_invitations** | Pending invites (token, expiry) | account_id, invited_by_user_id; status pending/accepted/expired |
| **budgets** | One per account per year | account_id, year |
| **budget_income_sources** | Income page (single source of truth) | budget_id; type (W2, Bonus, RSU, ESPP, …); status Expected/Official; type_specific_data (JSONB) |
| **stocks** | Ticker for ESPP/RSU estimates | account_id; ticker_symbol |
| **budget_categories** | Income group, expense categories, Taxes | budget_id; is_income_category, is_taxes_category, is_tax_deduction; sort_order |
| **budget_category_line_items** | Line items per category (amount, period) | budget_category_id; amount; period Annual/Monthly |
| **tax_profiles** | Per account per year | account_id, year; state_code, filing_status, dependents, pre_tax_deductions, ytd_withholding |
| **tax_only_deductions** | Deductions/credits not in budget | tax_profile_id; item_type deduction/credit; amount |

---

## Validation rules (from requirements)

- **budget_income_sources.status**: Only `Official` income included in Budget Total Income and Tax calculations (FR-BUDGET-INCOME-012–014).
- **budget_categories**: Exactly one row per budget with `is_income_category = true`, one with `is_taxes_category = true`; Taxes category value supplied by Tax module (FR-BUDGET-020, FR-BUDGET-021).
- **budget_category_line_items**: amount ≥ 0; period in { Annual, Monthly }; category total = sum of line items in annual equivalent (FR-BUDGET-005b, FR-BUDGET-006).
- **account_invitations**: One pending invitation per email per account at a time; expiry (e.g. 7 days) (FR-AUTH-003).
- **tax_profiles**: Income for tax read from budget_income_sources only; no income stored in tax_profiles (FR-TAX-002).

---

## State transitions

- **account_invitations.status**: pending → accepted (when invitee accepts) or expired (when expires_at passed).
- **budget_income_sources.status**: Expected → Official when user marks income as confirmed; affects Budget and Tax calculations immediately.
