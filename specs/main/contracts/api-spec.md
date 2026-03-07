# API Contract: Clearline MVP

**Base URL (local)**: `http://localhost:3000/api/v1` (or same-origin proxy from Vite, e.g. `http://localhost:5173/api/v1`)  
**Base URL (production)**: `https://<project>.vercel.app/api/v1`  
**Versioning**: All endpoints under `/api/v1` (NFR-MAINT-003).  
**Authentication**: All endpoints except auth and invite-accept require valid JWT (e.g. `Authorization: Bearer <token>`). Rate limit on auth: max 5 failed logins per 15 minutes (NFR-SEC-006).

Source: [Clearline.md](../../../Clearline.md) §6.3.

---

## Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/google` | Authenticate with Google (body: token or code per implementation) |
| POST | `/api/v1/auth/email` | Sign in with email (test accounts: magic link or email+password) |
| POST | `/api/v1/auth/refresh` | Refresh JWT token |
| GET | `/api/v1/auth/user` | Get current user profile (requires auth) |
| PUT | `/api/v1/auth/user/preferences` | Update theme, notification preferences, display name (requires auth) |

---

## Account Management

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/accounts` | Get user's account (requires auth) |
| POST | `/api/v1/accounts` | Create new account (e.g. on first sign-in) |
| GET | `/api/v1/accounts/{id}/members` | Get account members |
| GET | `/api/v1/accounts/{id}/invitations` | List pending invitations (status = pending) |
| POST | `/api/v1/accounts/{id}/members` | Invite member (creates account_invitation, token, expires_at) |
| DELETE | `/api/v1/accounts/{id}/members/{userId}` | Remove member (owner only) |
| POST | `/api/v1/invitations/accept` | Accept invite (token in body or query); add to account_members, update invitation |

---

## Budget

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/budgets/{year}` | Get budget for year |
| POST | `/api/v1/budgets` | Create/update budget |
| GET | `/api/v1/budgets/{year}/summary` | Summary: totalIncome (Official only), totalExpenses, amountLeftOver; Taxes from Tax API |
| GET | `/api/v1/budgets/{year}/income` | Get income sources (Income page); used for Budget Total Income and Tax |
| POST | `/api/v1/budgets/{year}/income` | Add/update income source |
| DELETE | `/api/v1/budgets/{year}/income/{id}` | Remove income source |
| GET | `/api/v1/stocks` | List user's stocks (for ESPP/RSU linking) |
| POST | `/api/v1/stocks` | Add stock by ticker symbol |
| GET | `/api/v1/stocks/{id}/price` or `?ticker=` | Current (or delayed) price for estimates |
| GET | `/api/v1/budgets/{year}/categories` | Get categories (Income, Taxes special + expense); Taxes value from Tax API; create budget if missing |
| POST | `/api/v1/budgets/{year}/categories` | Create custom category |
| PUT | `/api/v1/budgets/categories/{id}` | Update category (rename, is_tax_deduction); not Income/Taxes |
| PATCH | `/api/v1/budgets/{year}/categories/reorder` | Body: `[{ id, sort_order }]` |
| DELETE | `/api/v1/budgets/categories/{id}` | Remove category; not Income or Taxes |
| GET | `/api/v1/budgets/{year}/categories/{id}/line-items` | List line items |
| POST | `/api/v1/budgets/{year}/categories/{id}/line-items` | Create line item (name, amount, period: Annual\|Monthly) |
| PUT | `/api/v1/budgets/{year}/categories/{id}/line-items/{lineItemId}` | Update line item |
| DELETE | `/api/v1/budgets/{year}/categories/{id}/line-items/{lineItemId}` | Delete line item |

---

## Tax Profile

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/tax/{year}` | Get tax profile (state_code, filing_status, dependents, pre_tax_deductions, ytd_withholding). Income read from budgets/{year}/income. |
| PUT | `/api/v1/tax/{year}` | Set tax profile; WA only at launch |
| GET | `/api/v1/tax/{year}/deductions` | Budget-derived + tax-only deductions |
| GET | `/api/v1/tax/{year}/deductions/other` | Tax-only deductions/credits (not in budget) |
| POST | `/api/v1/tax/{year}/deductions/other` | Add tax-only deduction |
| PUT | `/api/v1/tax/{year}/deductions/other/{id}` | Update tax-only deduction |
| DELETE | `/api/v1/tax/{year}/deductions/other/{id}` | Remove tax-only deduction |
| GET | `/api/v1/tax/{year}/calculate` | Calculate tax liability (income from Income page, budget deductions read-only, tax-side deductions/credits) |
| GET | `/api/v1/tax/{year}/summary` | Tax summary for dashboard |

---

## Response and error behavior

- **2xx**: Success; body per endpoint (JSON).
- **401**: Unauthorized (missing or invalid token); client should redirect to login (FR-AUTH-006).
- **403**: Forbidden (e.g. not account owner for remove member).
- **404**: Resource not found.
- **4xx/5xx**: User-friendly message in body; no stack traces or sensitive data (NFR-REL-004, NFR-SEC-004).
