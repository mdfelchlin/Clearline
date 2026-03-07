# Clearline - Product Requirements Document (PRD)
---

## 1. Executive Summary

### 1.1 Product Overview
Clearline is a comprehensive personal finance management application designed to help users track income, manage budgets, and prepare for taxes. The application will feature a modern, sleek interface with an Atlanta Falcons-inspired design and support for both dark and light themes (black, red, silver/white in dark mode; white, red, charcoal in light mode).

### 1.2 Target Users
- Primary: Individual with W-2 income, stock compensation (ESPP/RSU), and self-employment income
- Secondary: Household members who need shared access to financial data
- Location: Initially Washington State residents; **architecture and data model are plumbed to support additional states** so state-specific tax rules can be added without redesign.

### 1.3 Key Value Propositions
- Centralized financial tracking for complex income sources
- Clear tax picture and estimated tax bill (income and budget feed Tax; user manages deductions and credits)
- Multi-user household access with synchronized data
- **Deployment:** Hosted on Vercel (React frontend + Node.js API) with Supabase for database and optional auth; minimal cost
- **Cross-device:** The full app shall be accessible and easy to use on both computer (desktop/laptop) and phone; one responsive web app for all screen sizes

---

## 2. Product Goals & Success Metrics

### 2.1 Goals
1. Simplify tax preparation by consolidating all income sources
2. Provide a clear estimated tax bill and deduction/credit management to minimize tax surprises
3. Enable household financial transparency through multi-user access
4. Deliver a premium user experience with modern UI and optional dark or light theme

### 2.2 Success Metrics
- User adoption: Active monthly users
- Data accuracy: Tax calculation validation against IRS/WA DOR rules
- User satisfaction: NPS score, user feedback
- Performance: Page load times < 2 seconds, app responsiveness

---

## 3. User Personas

### Persona 1: Primary Account Holder
- **Name:** Mark
- **Role:** W-2 employee with stock compensation, husband and father
- **Goals:** 
  - Optimize tax withholding to avoid large tax bills
  - Monitor household budget adherence
- **Pain Points:**
  - Complex income sources make tax planning difficult
  - Spreadsheets are error-prone and time-consuming
  - Difficult to visualize overall financial health

### Persona 2: Household Member
- **Name:** Spouse/Partner
- **Role:** Joint financial decision-maker
- **Goals:**
  - View household financial status
  - Understand budget allocation
  - Track shared expenses
- **Pain Points:**
  - Limited visibility into family finances
  - Difficulty accessing financial information on-the-go

---

## 4. Functional Requirements

## 4.1 Authentication & User Management

### 4.1.1 Access & Login
- **FR-AUTH-000:** The application shall be fully gated: unauthenticated users cannot see any app content. Any visit to the site (root or any path) shall require login before showing dashboard, budget, tax, settings, or any other feature.
- **FR-AUTH-000b:** Unauthenticated users shall see only the login experience (e.g., "Sign in with Google" and "Sign in with email"); no data or navigation is visible until signed in.
- **FR-AUTH-000c:** After successful login, the user shall be placed into their Dashboard (home). The default landing page for authenticated users is the Dashboard.

### 4.1.2 Google and Email Authentication
- **FR-AUTH-001:** Users shall authenticate via **Google Sign-In (OAuth 2.0)** for production use.
- **FR-AUTH-001b:** The app shall also support **sign-in with email** (e.g. magic link or email + password) for **test accounts** and development; this allows testers and developers to log in without Google. Implementation may use the same Supabase auth or a separate test-user flow.
- **FR-AUTH-002:** **First user to register** (via Google or email) **becomes the account owner**. On first sign-in, if the user is not yet in the system, the backend creates a user record and an account, and sets that user as the account owner. Subsequent sign-ins attach the user to their existing account.
- **FR-AUTH-003:** Account owner can invite additional users via email. Each invitation shall have an **expiry** (e.g. 7 days); the invitee must accept (or sign up) before expiry. Only one pending invitation per email per account at a time; the owner may resend an invite (which may extend or replace the existing one). Implementation stores invite in account_invitations with token and expires_at.
- **FR-AUTH-004:** All users have equal read/write permissions (no role hierarchy)
- **FR-AUTH-005:** Users can log in from multiple devices simultaneously
- **FR-AUTH-006:** Session management with automatic token refresh. When the session or token expires (e.g. per NFR-SEC-003), the app shall redirect the user to the login screen and preserve the intended URL so that after re-authentication they can be returned to the page they were on (or to Dashboard if not applicable).
- **FR-AUTH-007b:** Users shall be able to **sign out (logout)** from within the app (e.g. from the user area menu or Settings). On logout, the app shall clear the session and redirect to the login screen.

### 4.1.3 Account Management
- **FR-AUTH-007:** Users can view list of all account members
- **FR-AUTH-008:** Account owner can remove users from the account. Before removing a member, the system shall confirm (e.g. "Remove [name] from the account?").
- **FR-AUTH-009:** Users can leave an account voluntarily. Before leaving, the system shall confirm (e.g. "Leave this account? You will lose access to its data.").

### 4.1.4 User Preferences
- **FR-PREF-001:** Users can select application theme: Dark or Light
- **FR-PREF-002:** Theme preference shall be persisted (per user, synced across devices when logged in)
- **FR-PREF-003:** Default theme shall be Dark; first-time users see Dark theme until they change it
- **FR-PREF-004:** Theme switch shall apply immediately without requiring app restart

### 4.1.5 Sidebar User Area & Settings
- **FR-SIDE-001:** The sidebar shall display a user area at the bottom showing the current user's icon (avatar) and display name
- **FR-SIDE-002:** Clicking the user area (icon or name) shall navigate the user to the Settings page
- **FR-SETTINGS-001:** Settings page shall include:
  - **Notification Preferences:** Users can configure how and when they receive notifications (e.g., budget alerts, tax reminders, account activity)
  - **Invite Users:** Account owner can invite additional users to the household account via email (see FR-AUTH-003)
  - **Account & Members:** View account members, remove members (owner only), leave account
  - **Appearance:** Theme selection (Dark/Light) — see FR-PREF-001
  - **Profile Details:** Display name (optional override of Google name), email (read-only from Google), and other profile fields as added
- **FR-SETTINGS-002:** Notification preference choices shall be persisted per user and may include: email on/off, in-app notifications on/off, budget threshold alerts, tax deadline reminders
- **FR-SETTINGS-003:** Settings page shall be accessible only when the user is authenticated

### 4.1.6 App-level year selector
Dashboard, Budget (Overview, Income, Categories), and Tax Preparation all use a **single selected year** so the user sees one year at a time across the app.

- **FR-YEAR-001:** The **default year** shall be the **current calendar year** when the user opens the app or has not yet selected a year.
- **FR-YEAR-002:** A **year selector** shall appear in the **top bar** of the main layout (visible on Dashboard, Budget, and Tax). It shall be a **dropdown** that lists available years (e.g. current year and any years the user has added or that have budget/tax data). Selecting a year updates the context for all three areas: Dashboard, Budget (all tabs), and Tax show data for the selected year.
- **FR-YEAR-003:** The user shall be able to **add a year** (e.g. "Add year" or "+" in or near the dropdown) so they can plan or view a different calendar year. The UI may prompt for a year (e.g. modal or inline input); the system shall accept a **reasonable range** (e.g. current year ± 10 years, or 2016–2036; current year is 2026 per Assumption 12) to avoid invalid entries. Once added, the system creates a budget (and optionally a tax profile) for that year so it appears in the dropdown; the user can switch to it. All three areas (Dashboard, Budget, Tax) stay linked to the same selected year.
- **FR-YEAR-004:** **Available years** in the dropdown shall include at least the current year and any year for which the account has a budget (or that the user has explicitly added). The default selection is the current calendar year when the user has not yet chosen a year in the session.

---

## 4.2 Module: Budget Management

### 4.2.1 Income (single source of truth for Budget and Tax)
- **FR-BUDGET-INCOME-001:** The app shall provide an **Income** page (tab or dedicated page) where users enter **all** of their income sources. The Income page is the **single source of truth** for income: both the **Budget** page and the **Tax Preparation** module use this data. Users do not enter income twice; tax calculations and budget totals read from Income.
- **FR-BUDGET-INCOME-002:** **Total income** (for budget and tax) is derived from the Income page. Only income marked **Official** (see FR-BUDGET-INCOME-012) is included in the Budget page "Total Income" and in tax calculations. **Expected (not guaranteed)** income is visible for planning but tracked separately until marked Official.
- **FR-BUDGET-INCOME-003:** Tax Preparation does not duplicate income entry; it reads W-2, bonus, RSU, ESPP, self-employment, interest, PFML, and other income from the Income page. Tax-specific attributes (e.g., withholding status, filing status) may be edited in Tax or on the income entry where applicable.

#### Income status: Expected (not guaranteed) vs Official
- **FR-BUDGET-INCOME-012:** Each income source has a **status**: **Expected (not guaranteed)** or **Official**. **Expected** = money the user thinks they will receive but has not yet been received; the exact amount may change. **Official** = confirmed/received; include in Budget "Total Income" and in Tax calculations. Users can **mark an entry as Official** when the income is confirmed (e.g., received or locked in).
- **FR-BUDGET-INCOME-013:** **Expected** income is displayed on the Income page and **also on the Budget page** so users can see "money we think we will make but it hasn't cashed" (e.g., a separate line or card such as "Expected income (not yet received): $X"). It is not included in the main Total Income used for "Amount Left Over" until marked Official.
- **FR-BUDGET-INCOME-014:** When an income entry is marked **Official**, it is included in (1) the Budget page Total Income and Amount Left Over, and (2) the Tax Preparation module for tax calculations.

#### Income Page Layout & Actions
- **FR-BUDGET-INCOME-004:** The Income page shall display and edit income for the **app-level selected year** (top bar year selector; see FR-YEAR-001 to FR-YEAR-003). The **top of the Income page** shall display **Total Income** (sum of **Official** income sources for the selected year) and a **summary breakdown by type** (e.g., "W-2: $X · Bonus: $Y · RSU: $Z · …") so users see the mix at a glance.
- **FR-BUDGET-INCOME-005:** In the **top-right corner** of the Income page, an **Add** button opens a dialog. The user first **selects the type** of income to add; then a **type-specific dialog** opens to input that type’s data (see dialogs below).
- **FR-BUDGET-INCOME-006:** Income items on the page are **grouped** (e.g., by type: W-2, Bonus, Self-Employment, etc.). Each **group can be collapsed**; when collapsed, the **group total** is shown on the **right side** of the group header.
- **FR-BUDGET-INCOME-007:** Each **line item** (income source) has **Edit**, **Duplicate**, and **Delete** actions. These are in a **submenu opened via a 3-dot (vertical ellipsis) menu** on the right of the line item. **Duplicate** creates a copy of the entry (user can then edit and save for another year or similar source). **Delete** shall require confirmation (e.g. "Remove this income source?") before removing.
- **FR-BUDGET-INCOME-007b:** When there are **no income sources** for the selected year, the Income page shall show an **empty state**: brief explanation that income here feeds both the Budget and Tax, and a clear call-to-action (e.g., "Add your first income source" or "Add income to see your budget total and tax estimate"). Include short guidance (e.g., start with W-2 salary, then add bonuses, RSU, etc.) to help users get started.

#### Income Type Selection & Type-Specific Dialogs
When the user clicks Add, a dialog asks **“What type of income?”** with options. After selection, a second dialog opens with fields for that type. Each type's dialog includes an optional **Notes** field (e.g., "Q4 bonus," "RSU vest from 2022 grant"). Required content for each type’s dialog:

**W-2 Salary**  
(W-2 is treated as **annual salary** for budget and tax display; the system derives annual amount from pay and frequency.)
- **Dialog asks for:** Employer name; pay amount and frequency (e.g., $X per paycheck, with pay periods per year such as 26); start date (when this pay started); optional end date.
- **Change in pay (FR-BUDGET-INCOME-008):** For W-2, users shall be able to **add one or more “change in pay”** entries (e.g., raise, new job mid-year). Each change has: **effective date**, **new pay amount** (and frequency if different). The system uses all segments (initial pay + changes) to compute the **estimated amount to be paid** for the year (pro-rated by date range). The Income page and Budget total reflect this estimated W-2 amount.
- **ESPP contribution from pay (FR-BUDGET-INCOME-009):** Users shall be able to **denote how much of their pay is attributed to ESPP** (e.g., percentage of gross pay per paycheck, or fixed amount per pay period). This is captured per W-2/salary entry (or per pay segment). The system uses this to show how much pay goes toward ESPP purchases and can feed real-time ESPP estimates (e.g., estimated shares at current stock price given that contribution).

**Bonus**
- **Dialog asks for:** Bonus amount; payment date (or year/period); bonus type (dropdown or free text: e.g., performance, signing, retention, other).

**Self-Employment**
- **Dialog asks for:** Description (optional, e.g., “Consulting”); total annual amount **or** amount + frequency (e.g., $X monthly, $Y quarterly) so the system can derive annual total.

**Interest (Bank / Investment)**
- **Dialog asks for:** Either **estimated annual interest** (single amount) **or** calculator inputs: account balance, APY (%), and optionally expected monthly change. System shows derived annual interest for the total.

**RSU (Restricted Stock Units)**
- **Dialog asks for:** Company name; **link to a stock** (ticker symbol — select from user’s stocks or add by ticker so the system can offer **real-time estimates**); vesting date; number of shares vested; FMV (fair market value) per share at vesting. Optional: sale date and sale price (for capital gain); for unvested grants, number of shares and expected vesting date so the system can show **estimated value at current stock price**.
- **Real-time estimates (FR-BUDGET-INCOME-010):** When an RSU entry is linked to a stock, the app shall display **real-time (or current) estimates** based on the current stock price, e.g., current value of vested/unvested shares, estimated value at next vesting. Price data may be delayed (e.g., 15 min) depending on data source; the PRD assumes a current-price feed is available (see Technical Architecture for data source).

**ESPP (Employee Stock Purchase Plan)**
- **Dialog asks for:** **Link to a stock** (ticker symbol — select or add by ticker for **real-time estimates**); purchase date; number of shares; start price (offering period start); end price (at purchase); discount percentage (e.g., 15%); sale date; sale price. Optionally, if the user has denoted **ESPP contribution from pay** (see W-2), the system can show estimated future ESPP purchase value at current stock price given that contribution rate.
- **Real-time estimates (FR-BUDGET-INCOME-011):** When an ESPP entry (or plan) is linked to a stock, the app shall offer **real-time estimates** such as: discount value at current price, or (if contribution from pay is set) estimated shares or dollar value of next purchase at current price.

**PFML (Paid Family Medical Leave – WA)**
- **Dialog asks for:** Description (e.g., “WA PFML benefits”); amount received; period or date received.

**Other / One-time**
- **Dialog asks for:** Description (e.g., “Side gig,” “Gift”); amount; optional date or period. Used for any income that doesn’t fit the above types.

Grouping on the Income page shall align with these types (e.g., one collapsible section per type that has at least one entry). Each group shows its total on the right when collapsed; each line item has the 3-dot menu (Edit, Duplicate, Delete).

### 4.2.2 Budget Setup & Categories
- **FR-BUDGET-001:** System shall provide an **Add category** button so users can add expense categories. A **small set of default expense categories** may be provided when the user creates their first budget (e.g. Housing, Transportation, Food, Utilities, Healthcare, Other); users may **remove** any default (except Income and Taxes) and **rename** any category. If no defaults are provided, the user starts from an empty list and adds categories manually.
- **FR-BUDGET-002:** Users can **add categories** and **remove** any category (including defaults). Before removing a category, the system shall confirm (e.g. "Remove this category and its line items?"). Two categories cannot be removed: **Income** (default group showing income breakdown; read-only from Income page) and **Taxes** (read-only from Tax service). See FR-BUDGET-020 and FR-BUDGET-021.
- **FR-BUDGET-002b:** Users can **reorder categories** (e.g., drag-and-drop or up/down) so the list order matches their preference; order is persisted (e.g., sort_order).
- **FR-BUDGET-003:** Each category has a **clear visual grouping**. Within each category, users add **line items** via an **Add line item** (or "Add item") button for that category. Spending is tracked at the **line item** level; category total = sum of its line items (in annual equivalent; see FR-BUDGET-005b).
- **FR-BUDGET-004:** **Categories default to collapsed**, showing only the **category total** (annual equivalent). Users may expand a category to see and edit **line items** and add new ones.
- **FR-BUDGET-005:** (Legacy frequency-based entry may apply to line items where useful.) Line items use **amount + period** (see FR-BUDGET-005b).
- **FR-BUDGET-005b:** Each **line item** has **amount** and **period** (Annual or Monthly). Display: one table per category with columns **Description**, **Amount**, **Period** (badge or dropdown: "Annual" / "Monthly"). Store amount + period; system derives the other (e.g., monthly × 12 = annual). **Category total** = sum of line items in **annual equivalent** (so all categories are comparable). **Total Expenses** = sum of category totals (all in annual terms). No progress bars or % used; totals only.
- **FR-BUDGET-006:** Users set amount and period per line item (except in Income and Taxes categories, which are read-only or from other modules). **Delete line item** shall require confirmation (e.g. "Remove this line item?") before removing. Amount shall be non-negative; period is strictly Annual or Monthly.
- **FR-BUDGET-008b:** **Tax deduction is at the category level.** Users can **flag a category** (not individual line items) as a tax deduction. When set, that **category’s total** (sum of line items in annual equivalent, or actual spent in that category) is **included in the Tax Preparation module** as a deduction. The tax side sums all budget categories marked as tax deductions. Categories not flagged do not affect the tax calculation.

### 4.2.3 Budget Page Summary & Taxes Category
- **FR-BUDGET-019:** The **top of the Budget page** shall display: **[Total Income]** (card) **−** **[Total Expenses]** (card) **=** **[Amount Left Over]** (card). **Total Income** = sum of **Official** income from the Income page. **Total Expenses** = sum of **actual** spending across expense categories (i.e., sum of all line item amounts in annual equivalent; see FR-BUDGET-005b). **Amount Left Over** = Total Income − Total Expenses (so leftover is based on actual expenses, not budgeted). **Expected (not yet received)** income shall be visible (e.g., separate line/card "Expected income (not yet received): $X"); it is not included in Total Income or Amount Left Over until marked Official. A **summary breakdown** (e.g., "Housing: $X · Transport: $Y · Food: $Z · …") shall be shown so users see the expense mix at a glance.
- **FR-BUDGET-020:** The budget shall include a **Taxes** category that **cannot be changed by the user** (no edit, remove, or rename). Its value is **pulled from the Tax Preparation service**. It appears in the same visual grouping as other categories but is read-only.
- **FR-BUDGET-021:** The budget shall include a default **Income** group (section) that **cannot be removed or renamed**. It displays the **line items** that make up Total Income (i.e., the Official income sources from the Income page: W-2, Bonus, RSU, etc.) so users see "all the pieces" in one place. This section is **read-only** on the Budget page. A **hint** (e.g., "From Income · Edit in Income tab") shall link or direct users to the Income tab to edit income.

### 4.2.4 Budget Tracking
- **FR-BUDGET-009:** Budgets are annual-based; category and Total Expenses are in **annual equivalent** (line items with period Monthly are converted to annual for totals).
- **FR-BUDGET-010:** Users enter **line items** per category (description, amount, period Annual or Monthly). The amount entered is the spending (actual or planned) for that item; category total = sum of line items in annual terms. No separate "budget vs actual" display or progress indicators; totals only.

### 4.2.5 Budget Empty State
- **FR-BUDGET-014:** When there are **no categories** (or no line items) for the selected year, the Budget page shall show an **empty state**: brief explanation that this is where users plan and track spending, and a clear call-to-action (e.g., "Add your first category" or "Set up your budget"). Include short guidance (e.g., add a category, then add line items with amount and period) to help users get started.

### 4.2.6 Budget Overview / Dashboard Tab
- **FR-BUDGET-015:** A **Budget Overview** (or **Dashboard**) tab shall be available and is the **default view** when users click Budget. It shows data for the **app-level selected year** (top bar); **three summary cards** (Total Income, Total Expenses, Amount Left Over) and optionally "Expected income (not yet received)"; **short breakdown** of income and expenses by category (e.g., "W-2: $X · Bonus: $Y" and "Housing: $X · Transport: $Y · …"); **one simple chart** (e.g., expenses by category — bar or pie); **links/CTAs** to "Edit income" (Income tab) and "View / edit budget" (category list). No progress bars or alerts on this tab.

### 4.2.7 Budget Reporting
- **FR-BUDGET-016:** Year-over-year comparison view (optional/future).

---

## 4.3 Module: Tax Preparation

**Data sources (read-only in Tax):** The Tax Preparation module **pulls from two sources of truth** and does not duplicate entry:
- **Income:** All income (W-2, bonus, RSU, ESPP, self-employment, interest, PFML, other) is entered on the **Income page** (Budget module). Tax **displays** that income in a read-only group with a link to **edit in Income tab**. Tax uses only income marked **Official** for calculations.
- **Budget:** Amounts from budget categories **flagged as tax deduction** are pulled into Tax as **read-only** (category name and total from line items in annual equivalent). Users do not re-enter budget deductions in Tax.

**Tax-side data:** Deductions and credits that are not in the budget (e.g. additional deductions, Child Tax Credit, standard vs. itemized) are **managed on the Tax side**: user can add, edit, and remove them in the Tax module. Tax settings (filing status, state of residence, dependents, pre-tax deductions, etc.) are also set in Tax (e.g. Tax settings section or popup). State defaults (e.g. Social Security treatment, state-specific rules) are applied based on state of residence.

**Payroll tax by income type:** The system shall treat income types differently for **payroll taxes** (e.g. FICA) under the hood. For example: W-2 salary is subject to full FICA; **bonus** may be subject to different withholding (e.g. supplemental rate) or excluded from certain payroll taxes per IRS/state rules; **PFML** (e.g. WA) has its own tax treatment and is not subject to the same payroll taxes as regular wages. Calculation logic shall apply the correct rules per income type so the estimated tax bill and withholding picture are accurate.

### 4.3.1 Income in Tax (from Income page; read-only display)

Tax **displays** all Official income from the Income page. Users **edit income only on the Income tab**; the Tax view is read-only for income.

- **FR-TAX-001:** The Tax view shall show an **Income group** that lists all income sources from the Income page (Official only) for the selected year—e.g. W-2, Bonus, RSU, ESPP, self-employment, interest, PFML, other—with amounts. This list is **read-only** in Tax. A clear **link or button** (e.g. "Edit income") shall navigate the user to the **Income tab** (Budget module) to add or edit income.
- **FR-TAX-002:** Tax calculations (gross income, AGI, taxable income, liability) shall use the **sum of Official income** from the Income page. No income is entered or edited in the Tax module.

**Calculation rules by income type (system logic):** The following apply to **data already on the Income page**; Tax uses these rules when computing liability and payroll tax.

- **FR-TAX-003:** **W-2 salary:** System uses annual gross from Income; applies pre-tax deductions (from Tax settings) to derive taxable wages; applies **full FICA** (Social Security + Medicare) to wages subject to FICA per IRS rules (e.g. wage base cap for Social Security).
- **FR-TAX-004:** **Bonus:** System treats as income for federal/state tax; applies **correct payroll treatment** for supplemental wages (e.g. optional flat rate or aggregate method per IRS) so bonus is not necessarily subject to the same withholding as regular salary.
- **FR-TAX-005:** **PFML (e.g. WA):** System treats as taxable income for federal/state where applicable; applies **state-specific rules** (e.g. WA PFML not subject to same payroll taxes as regular wages) so the estimated tax and withholding are correct.
- **FR-TAX-006:** **ESPP:** System calculates ordinary income (discount) and capital gain/loss from Income page data; formulas per Appendix (e.g. discount = Shares × End Price × Discount%).
- **FR-TAX-007:** **RSU:** System calculates ordinary income at vesting and capital gain/loss on sale from Income page data; short-term vs. long-term based on holding period.
- **FR-TAX-008:** **Self-employment:** System calculates self-employment tax (15.3% of 92.35% of net) and QBI deduction (20% if applicable) from Income page self-employment amount.
- **FR-TAX-009:** **Interest, other:** System includes in gross income; no special payroll tax (interest not subject to FICA).

### 4.3.2 Tax Calculations (Federal + State; extensible for multiple states)

**State support:** Tax profile has **state of residence** (e.g. WA). State-specific logic (e.g. Social Security treatment, PFML, state tax when added) is applied from state defaults. **Only Washington (WA) is supported at launch**; adding another state is a matter of adding state rules and optional state-specific fields, not a core schema change.

#### Deductions and credits
- **FR-TAX-010:** **Budget-derived deductions** are **read-only** in Tax: system displays the list of budget categories marked as tax deduction and each category’s total (from line items, annual equivalent). Users do not edit these in Tax; they edit categories and line items in Budget. Tax calculation uses these amounts as itemized deductions when the user chooses to itemize.
- **FR-TAX-011:** The Tax module shall have a **Deductions section** where users can **add, edit, and remove additional deductions and credits** that are not in the budget—e.g. Sales Tax, Child Tax Credit, other credits. These are stored in the tax profile. Tax calculation uses budget-derived deductions (read-only) plus these tax-side deductions and credits.
- **FR-TAX-012:** System shall **compare itemized total to standard deduction** and show the user when **standard deduction is higher** (e.g. “Your itemized deductions are $X; standard deduction is $Y. Using standard deduction saves more.”) so they can see whether to itemize or take the standard deduction. Calculation uses the better of the two for taxable income.

#### Federal and state calculation
- **FR-TAX-013:** System calculates: gross income (from Income page); minus deductions (budget-derived read-only + tax-side deductions) or standard deduction (whichever is better); AGI; taxable income; federal income tax (current IRS brackets); then **applies tax-side credits** (e.g. Child Tax Credit) to reduce liability; FICA by income type (per 4.3.1); self-employment tax if applicable. **Estimated tax bill** is displayed so the user can adjust their withholding (e.g. with employer) themselves. **YTD withholding** is optional and user-entered (e.g. from pay stubs); when provided, **projected refund or amount owed** = estimated tax liability minus YTD withholding.
- **FR-TAX-014:** System stores **state of residence** per tax profile and applies **state defaults** (e.g. Social Security, state-specific rules like WA PFML). **Tax settings** (section or popup in the Tax tab) let the user set or change: state of residence, filing status, dependents, pre-tax deductions (e.g. 401(k), HSA, health premiums), and other tax-related settings. State defaults are pulled in for the selected state so the user can accept or override as needed.

#### State tax (WA first, extensible)
- **FR-TAX-015:** For **WA**: No state income tax; system includes WA-specific items (e.g. PFML premiums if self-employed). For **other states** (when added): state income tax and state deductions use the same state_code and profile; only state-specific logic and optional fields need to be added.

### 4.3.3 Tax view (single screen; Dashboard is default)

Tax is a **single view** (no sub-pages). When the user opens Tax Preparation, they see the Tax dashboard.

- **FR-TAX-016:** The **default tab** for Tax Preparation is the **Tax dashboard** (single screen). It uses the **app-level selected year** (top bar) and includes: **Income group** (all income sources from Income page, read-only, with link “Edit income” → Income tab); **Deductions section** (budget-derived deductions read-only, plus add/edit additional deductions and credits such as Child Tax Credit; show when standard deduction is better than itemized); **Tax settings** (section on the page or a popup/modal to set state of residence, filing status, dependents, pre-tax deductions, etc.; state defaults pulled in); **estimated tax bill** (and optionally YTD withholding, projected refund/owed) so the user can update their withholding as needed. Optional: income-by-source chart, tax bracket visualization. No W-4 recommendation card required.
- **FR-TAX-017:** Year-over-year tax comparison may be available (e.g. report or future enhancement).
- **FR-TAX-018:** When there is **no Official income** for the selected year or **no tax profile/settings** yet, the Tax view shall show an **empty or guided state** (e.g. message "Add income in the Income tab and set tax settings to see your estimate" with links to Income tab and Tax settings). The estimated tax bill may show $0 or a placeholder until data is present.

---

## 4.4 Dashboard (Home)

The Dashboard (Home) is the default landing page after login. It gives an at-a-glance view of budget and tax position for the selected year without duplicating full Budget or Tax flows.

- **FR-DASH-001:** The Dashboard shall display data for the **app-level selected year** (see FR-YEAR-001 to FR-YEAR-003). The year selector lives in the top bar; default is current year.
- **FR-DASH-002:** The Dashboard shall show **summary cards** derived from existing data: **(1) Total Income** (from Income page, Official only, same as Budget); **(2) Total Expenses** (sum of budget line items in annual equivalent, same as Budget); **(3) Amount Left Over** (Total Income − Total Expenses); **(4) Tax Liability Estimate** (from Tax Preparation module: estimated federal tax liability and/or projected refund or amount owed). Data is read-only on the Dashboard; no data entry here.
- **FR-DASH-003:** The Dashboard shall display **one chart** (e.g., expenses by category — horizontal bar or pie) using the same budget data as the Budget Overview. No progress bars or percent-on-track metrics; summary and chart only.
- **FR-DASH-004:** **Quick actions** shall link to the main modules: e.g. **"View / edit budget"** (navigates to Budget → Categories or Budget → Overview) and **"Update tax info"** or **"Tax summary"** (navigates to Tax Preparation). Labels may be adjusted for clarity; purpose is to let users jump to Budget or Tax from the Dashboard.
- **FR-DASH-005:** When the user has **no budget data** (no categories or no line items) and/or **no income data** for the selected year, the Dashboard shall show an **empty state**: brief message that this is their financial overview and clear CTAs to add income (Income tab) or set up budget (Budget → Categories). Summary cards may show $0 or "—"; the chart may be hidden or show an empty state. No error; the page remains usable and guides the user to next steps.
- **FR-DASH-006:** A **greeting** (e.g., "Welcome back" or time-based) may be shown at the top. All elements shall be responsive: on phone, cards and chart stack vertically; quick actions remain easily tappable (e.g., full-width or large touch targets).

### 4.4.1 Getting started walkthrough
An optional **walkthrough** introduces new users to the app. No data entry is required; it is a guided tour only.

- **FR-DASH-007:** The app may offer a **getting started walkthrough** (e.g., on first login or when the user has not yet completed it). The walkthrough shall **briefly introduce** the main areas: **Dashboard** (overview of income, expenses, and tax); **Budget** (income, categories, line items); **Income** (where to add W-2, bonus, RSU, etc.); **Tax Preparation** (estimates, deductions). Each step may be a short message and/or highlight of the relevant nav or section; the user advances by clicking **Next** (or equivalent) or **Skip** to exit. The walkthrough **does not require** the user to enter any data or complete any setup.
- **FR-DASH-008:** The user may **skip** or **dismiss** the walkthrough at any time. If the walkthrough is shown on first login, dismissing or completing it shall be remembered (e.g., per user or per account) so it is not shown again automatically. Optionally, a way to **replay** the walkthrough shall be provided (e.g., "Show get started tour" in Settings or a link on the Dashboard) so users can see it again if they want.

---

## 5. Non-Functional Requirements

### 5.1 Performance
- **NFR-PERF-001:** Web pages shall load in < 2 seconds on standard broadband
- **NFR-PERF-002:** Mobile app screens shall render in < 1.5 seconds
- **NFR-PERF-003:** Database queries shall return results in < 500ms for 95th percentile
- **NFR-PERF-004:** System shall support 100 concurrent users without degradation

### 5.2 Security
- **NFR-SEC-001:** All data shall be encrypted in transit (TLS 1.3)
- **NFR-SEC-002:** All data shall be encrypted at rest (AES-256)
- **NFR-SEC-003:** Authentication tokens shall expire after 24 hours
- **NFR-SEC-004:** Sensitive financial data shall not be logged
- **NFR-SEC-005:** API endpoints shall require authentication
- **NFR-SEC-006:** Rate limiting shall prevent brute force attacks (max 5 failed logins per 15 minutes)

### 5.3 Reliability & Availability
- **NFR-REL-001:** Vercel and Supabase provide high availability; target uptime per provider SLA.
- **NFR-REL-002:** Scheduled maintenance (if any) per Vercel/Supabase provider notifications.
- **NFR-REL-003:** Use Supabase backups where available; export/backup strategy for critical data as needed.
- **NFR-REL-004:** System shall gracefully handle errors with user-friendly messages. When an API call fails (network error, 4xx/5xx), the UI shall show a clear, non-technical message and optionally a retry action; it shall not leave the user on a broken or blank screen.
- **NFR-REL-005:** Data-dependent screens (Dashboard, Budget, Tax, Income) shall show a **loading state** (e.g. skeleton, spinner, or placeholder) while fetching data. Once data is loaded, display the content; if the load fails, show an error state per NFR-REL-004.

### 5.4 Usability
- **NFR-USE-001:** Application shall be responsive and work on screen sizes from 360px (mobile) to 2560px (desktop)
- **NFR-USE-002:** Forms shall provide inline validation with clear error messages. Required fields shall be indicated and validated on submit (or on blur where appropriate). Invalid numeric input (e.g. negative amount, non-numeric) shall be caught before submit. Monetary amounts shall be non-negative unless the product explicitly supports negatives.
- **NFR-USE-003:** Navigation shall require ≤ 3 clicks to reach any feature
- **NFR-USE-004:** Color contrast shall meet WCAG 2.1 AA standards (minimum 4.5:1 for text) in both dark and light themes
- **NFR-USE-005:** Application shall provide helpful tooltips and contextual help
- **NFR-USE-006:** Dark and light theme shall use consistent semantic colors (e.g., success green, warning yellow, danger red) so meaning is clear in either theme

#### Cross-Device (Computer & Phone)
- **NFR-USE-007:** The same features and flows shall be available and usable on both computer and phone; no feature may be desktop-only or mobile-only
- **NFR-USE-008:** On phone: touch targets (buttons, links, form controls) shall be at least 44×44px; spacing shall prevent accidental taps
- **NFR-USE-009:** On phone: primary content shall not require horizontal scrolling; layouts shall reflow (e.g., single column, stacked cards, collapsible sidebar or bottom/hamburger navigation)
- **NFR-USE-010:** On computer: layout shall use space effectively (e.g., sidebar, multi-column where helpful) without requiring a phone-sized view
- **NFR-USE-011:** Text and controls shall be readable and operable without zoom on both phone and computer (e.g., minimum font sizes and viewport meta for mobile)

### 5.5 Compatibility
- **NFR-COMP-001:** Web app shall support:
  - Chrome (latest 2 versions)
  - Firefox (latest 2 versions)
  - Safari (latest 2 versions)
  - Edge (latest 2 versions)
  
- **NFR-COMP-002:** On mobile devices, the web app shall work in modern mobile browsers (iOS Safari, Chrome on Android, etc.); Android 8.0+ and current iOS versions
- **NFR-COMP-003:** Application shall work on phone, tablet, and desktop form factors with a single responsive codebase

### 5.6 Maintainability
- **NFR-MAINT-001:** Backend code shall follow Node.js/TypeScript best practices; frontend shall follow React and TypeScript best practices
- **NFR-MAINT-002:** Code shall have ≥ 70% unit test coverage for business logic
- **NFR-MAINT-003:** API shall be versioned to support backward compatibility
- **NFR-MAINT-004:** Database schema changes shall be managed via migrations (e.g., Supabase migrations or SQL)

---

## 6. Technical Architecture

### 6.1 Technology Stack

#### Frontend
- **Web Framework:** React (with TypeScript recommended)
- **Build Tool:** Vite or Create React App
- **UI Components:** Custom React components; component library (e.g., Material UI, Chakra UI, or custom) for consistency with design system
- **State Management:** React Context and/or React Query (TanStack Query) for server state; local state via useState/useReducer
- **HTTP Client:** fetch or axios; typed API client calling backend REST endpoints
- **Routing:** React Router
- **Platforms:**
  - Web (React SPA; responsive for mobile browsers)
  - Android: React Native (optional/future phase) or responsive web; Node.js API supports both

#### Backend
- **Runtime:** Node.js (LTS)
- **Framework:** Express or Fastify (or Vercel Serverless Functions for API routes)
- **Language:** TypeScript recommended
- **Authentication:** Google OAuth 2.0 (e.g., Passport.js, or Google auth library)
- **API Pattern:** RESTful API with versioning; can be implemented as Vercel serverless API routes
- **Validation:** e.g., Zod, Joi, or express-validator
- **Logging:** e.g., Pino, Winston, or console with structure

#### Database
- **Primary Database:** Supabase (PostgreSQL; hosted, with REST and realtime options)
- **Access:** Supabase client (`@supabase/supabase-js`) or `pg` with Supabase connection string (connection pooling via Supabase)
- **Schema Design:** Relational tables; JSONB available for flexible nested data where appropriate
- **Migrations:** Supabase migrations (SQL) or direct SQL in Supabase dashboard

#### Hosting & Deployment (Vercel + Supabase)
- **Goal:** Minimize cost; use Vercel and Supabase free tiers where possible.
- **Frontend:** React app deployed to Vercel (static or server-rendered); automatic builds from Git.
- **Backend:** Node.js API deployed as Vercel Serverless Functions (e.g., `/api/*` routes in same repo or separate API project).
- **Database:** Supabase project; connection via Supabase URL and anon/service key (or direct Postgres connection string) in environment variables.
- **CI/CD:** Vercel Git integration (auto deploy on push); optional GitHub Actions for tests before deploy.

#### Stock price data (real-time estimates for ESPP/RSU)
- **Source:** Current (or delayed) stock price from a third-party market-data API (e.g., Yahoo Finance, Alpha Vantage, or similar) to support **real-time estimates** when ESPP or RSU entries are linked to a stock (ticker).
- **Usage:** Fetch or cache price by ticker; use for RSU (e.g., current value of shares, estimated value at vesting) and ESPP (e.g., discount at current price, or estimated purchase from pay contribution). Consider rate limits and caching (e.g., 15-min delay) to minimize cost.

### 6.2 Database Schema Design (Supabase / PostgreSQL)

Core tables for users, accounts, budgets, and tax data. Use `uuid` or `bigint` for primary keys; JSONB where nested structures are convenient.

**Entity relationships (summary):** One **account** per household; **users** belong to an account (owner or member). **Budgets** are per account per **year**; each budget has **budget_income_sources** (Income page — single source of truth for income) and **budget_categories** (Income group, expense categories, Taxes category). Expense categories have **budget_category_line_items** (amount + period). **Tax_profiles** are per account per year; income for tax is read from budget_income_sources. **tax_only_deductions** store deductions and credits not in the budget. **Stocks** are per account and referenced from income entries (e.g. ESPP, RSU) via type_specific_data.

#### Table: users
| Column | Type | Notes |
|--------|------|-------|
| id | uuid / bigserial | PK |
| google_id | text | UNIQUE, nullable. Set for Google sign-in; null for email-only (test) users. |
| email | text | Required; used as login id for email sign-in; from Google for Google users. |
| name | text | From Google or user-entered for email users. |
| display_name | text | Optional override for sidebar. |
| profile_picture | text | URL; from Google or null. |
| account_id | uuid / bigint | FK → accounts. Set when user is assigned to an account (first sign-in or after accepting invite). |
| auth_provider | text | optional: 'google' \| 'email' — how the user signed up. |
| theme_preference | text | 'Dark' \| 'Light' |
| notification_preferences | jsonb | { emailEnabled, inAppEnabled, budgetAlertsEnabled, budgetAlertThresholdPercent, taxRemindersEnabled } |
| walkthrough_completed_at | timestamptz | optional; when set, do not auto-show getting started walkthrough again. |
| created_at | timestamptz | |
| last_login_at | timestamptz | |

#### Table: accounts
| Column | Type | Notes |
|--------|------|-------|
| id | uuid / bigserial | PK |
| owner_id | uuid / bigint | FK → users. First user to register becomes owner. |
| account_name | text | |
| created_at | timestamptz | |

#### Table: account_members
| Column | Type | Notes |
|--------|------|-------|
| account_id | uuid / bigint | FK → accounts |
| user_id | uuid / bigint | FK → users |
| joined_at | timestamptz | |
| PRIMARY KEY (account_id, user_id) | | |

#### Table: account_invitations
| Column | Type | Notes |
|--------|------|-------|
| id | uuid / bigserial | PK |
| account_id | uuid / bigint | FK → accounts |
| email | text | Invited email address. |
| invited_by_user_id | uuid / bigint | FK → users (account owner). |
| token | text | UNIQUE; for invite link; expire after use or TTL. |
| status | text | e.g. 'pending' \| 'accepted' \| 'expired' |
| expires_at | timestamptz | |
| created_at | timestamptz | |
| updated_at | timestamptz | optional |
Used for "Invite Users" (FR-AUTH-003). When invitee signs up or logs in (via link with token), add to account_members and set invitation status to accepted.

#### Table: budgets
| Column | Type | Notes |
|--------|------|-------|
| id | uuid / bigserial | PK |
| account_id | uuid / bigint | FK → accounts |
| year | int | Calendar year; one budget per account per year. Created when user first selects or adds that year. |
| created_at | timestamptz | optional |
| updated_at | timestamptz | |

#### Table: budget_income_sources (Income page)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid / bigserial | PK |
| budget_id | uuid / bigint | FK → budgets |
| type | text | W2, Bonus, SelfEmployment, Interest, RSU, ESPP, PFML, Other |
| name | text | e.g. employer name, "Consulting" (display label) |
| amount | decimal | annual or derived from type-specific fields |
| frequency | text | optional: BiWeekly, Monthly, Annually, etc. |
| type_specific_data | jsonb | all type-specific fields (employer, dates, shares, FMV, etc.) |
| status | text | Expected \| Official. Expected = not guaranteed, not yet received; Official = include in Budget Total Income and Tax |
| notes | text | optional user notes |
| sort_order | int | optional; for grouping and display order |
| created_at / updated_at | timestamptz | |

**Status:** When status = Official, include in Budget Total Income and in Tax calculations; when Expected, show on Budget as "Expected income (not yet received)" but do not include in Total Income or taxes. **Notes:** Optional.  
**W-2 change in pay:** Store in `type_specific_data` as array of segments, e.g. `{ "paySegments": [ { "effectiveDate", "amount", "frequency", "payPeriodsPerYear" }, ... ] }`. System computes estimated annual amount from segments (pro-rated by date range). Sum of all sources’ derived annual amounts = Total Income on Budget page. W-2 ESPP contribution: in type_specific_data use esppContributionPercent or esppContributionAmount + frequency. RSU/ESPP: use stockId (FK to stocks.id) or tickerSymbol in type_specific_data for real-time estimates.

#### Table: stocks (user-linked for real-time estimates)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid / bigserial | PK |
| account_id | uuid / bigint | FK → accounts |
| ticker_symbol | text | e.g. AAPL, MSFT |
| display_name | text | optional |
| created_at | timestamptz | |
Income entries (ESPP, RSU) reference stocks via stockId or tickerSymbol in budget_income_sources.type_specific_data. Current price from market-data API (or cached) for real-time estimates.

#### Table: budget_categories
| Column | Type | Notes |
|--------|------|-------|
| id | uuid / bigserial | PK |
| budget_id | uuid / bigint | FK → budgets |
| category_id | text | e.g. guid for grouping |
| name | text | user-editable except for Income, Taxes |
| parent_category_id | text | nullable |
| group | text | e.g. 'Housing', 'Transportation' |
| sort_order | int | for reordering categories |
| annual_budget | decimal | optional; for expense categories, total is derived from line items, not this column |
| actual_spent | decimal | optional; reserved for future tracking; not used for category total at MVP |
| is_custom | boolean | |
| is_income_category | boolean | if true, read-only; shows Income page breakdown (default group); exactly one per budget |
| is_taxes_category | boolean | if true, row is read-only; value from Tax module; exactly one per budget |
| is_tax_deduction | boolean | if true, this category’s amount is included as a deduction in Tax (category total from line items, annual equivalent) |
| tax_deduction_type | text | optional |
Taxes: one category per budget with is_taxes_category = true. Income: one with is_income_category = true (from Income page). Expense category total = sum of line items (annual equivalent). When is_tax_deduction = true, tax module uses this category’s amount (e.g., line items, annual equivalent) in deduction calculations.

#### Table: budget_category_line_items
| Column | Type | Notes |
|--------|------|-------|
| id | uuid / bigserial | PK |
| budget_category_id | uuid / bigint | FK → budget_categories |
| name | text | description (e.g. Rent, Electric) |
| amount | decimal | |
| period | text | Annual or Monthly |
| sort_order | int | optional |
| created_at / updated_at | timestamptz | |
Category total = sum of line items in annual equivalent (monthly × 12). Only expense categories have editable line items.

#### Table: tax_profiles
| Column | Type | Notes |
|--------|------|-------|
| id | uuid / bigserial | PK |
| account_id | uuid / bigint | FK → accounts |
| year | int | |
| state_code | text | State of residence (e.g. WA). Drives state-specific rules. |
| filing_status | text | e.g. Single, MarriedFilingJointly |
| dependents | jsonb | optional; array of { name, birthDate, relationship: 'Child' \| 'Other' }. Child Tax Credit qualification (under 17 at end of tax year) derived from birthDate and year. |
| pre_tax_deductions | jsonb | optional; e.g. { 401kPercent, 401kAmount, hsaAmount, healthPremiumPerPayPeriod, dentalPremiumPerPayPeriod, payPeriodsPerYear }. Used for W-2 taxable wage calculation (FR-TAX-003). |
| ytd_withholding | decimal | optional; user-entered year-to-date withholding (from pay stubs); used for projected refund/owed |
| state_specific_data | jsonb | optional; state-specific fields (e.g. WA PFML) so new states can be added without new columns |
| created_at | timestamptz | optional |
| updated_at | timestamptz | |
**Income source:** At MVP, income for tax is read from **budget_income_sources** (Income page), not stored in tax_profiles. Tax calculation uses Budget API for income. One tax_profile per account per year; created when user first opens Tax for that year.

#### Table: tax_only_deductions (deductions and credits not in budget)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid / bigserial | PK |
| tax_profile_id | uuid / bigint | FK → tax_profiles |
| name | text | e.g. "Sales Tax", "Child Tax Credit" |
| amount | decimal | |
| item_type | text | 'deduction' \| 'credit'. Deductions reduce taxable income; credits reduce tax liability (applied after tax from brackets). |
| deduction_type | text | optional: e.g. SalesTax, ChildTaxCredit, Other |
| sort_order | int | optional |
| created_at / updated_at | timestamptz | |
Tax calculation uses budget-derived deductions (from categories with is_tax_deduction) plus these tax-side items. Credits are applied after computing federal tax from brackets to reduce liability.

#### Related tables (tax detail) — deprecated for income at MVP
Income amounts for tax are sourced from **budget_income_sources** (Income page). The tables below are **not used for income entry at MVP**; they may be retained for tax-specific overrides (e.g. withholding) or removed. If kept: w2_salaries, espp_transactions, rsu_vestings, bonuses store tax-only overrides; income amounts come from Budget API.

Schema changes managed via Supabase migrations or SQL; Supabase uses standard PostgreSQL.

### 6.3 API Architecture

#### Base URL
- **Local:** React: `http://localhost:5173` (Vite); API: `http://localhost:3000/api/v1` or same-origin proxy (e.g. Vite proxy to Node).
- **Production (Vercel):** e.g. `https://<project>.vercel.app` for the app; API at `https://<project>.vercel.app/api/v1` if using Vercel serverless API routes in same project.

#### Authentication Flow (Google)
1. User navigates to the site (any URL). If not authenticated, the app shows only the login screen (no dashboard or other content).
2. User clicks "Sign in with Google" (or "Sign in with email" for test accounts).
3. **Google flow:** App redirects to Google OAuth consent screen
4. User authorizes, Google redirects back with authorization code
5. App exchanges code for access token (or backend does so via server-side flow if preferred)
6. App sends access token to backend `/auth/google` endpoint
7. Backend validates token with Google, creates/retrieves user
8. Backend generates JWT token
9. App stores JWT token securely (e.g., httpOnly cookie, or secure storage in React; for native apps, platform secure storage)
10. **App redirects the user to the Dashboard (home).** All subsequent navigation (sidebar, links) is from the authenticated app; API calls include JWT in Authorization header.

#### API Endpoints (Summary)

**Authentication**
- `POST /api/v1/auth/google` - Authenticate with Google
- `POST /api/v1/auth/email` - Sign in with email (for test accounts; e.g. magic link or email+password via Supabase or custom flow)
- `POST /api/v1/auth/refresh` - Refresh JWT token
- `GET /api/v1/auth/user` - Get current user profile
- `PUT /api/v1/auth/user/preferences` - Update user preferences (theme, notification preferences, display name)

**Account Management**
- `GET /api/v1/accounts` - Get user's account
- `POST /api/v1/accounts` - Create new account
- `GET /api/v1/accounts/{id}/members` - Get account members
- `GET /api/v1/accounts/{id}/invitations` - List pending invitations (account_invitations where status = pending)
- `POST /api/v1/accounts/{id}/members` - Invite member (creates account_invitation, sends invite email/link)
- `DELETE /api/v1/accounts/{id}/members/{userId}` - Remove member
- `POST /api/v1/invitations/accept` - Accept invite (token in body or query); add user to account_members, update invitation status

**Budget**
- `GET /api/v1/budgets/{year}` - Get budget for year
- `POST /api/v1/budgets` - Create/update budget
- `GET /api/v1/budgets/{year}/summary` - Get budget summary (totalIncome from Income tab, totalExpenses, amountLeftOver). **Taxes category** amount is supplied by the Tax module (e.g. estimated tax liability or projected amount owed from `GET /api/v1/tax/{year}/calculate` or summary).
- `GET /api/v1/budgets/{year}/income` - Get income sources (Income tab); used for Total Income on Budget page
- `POST /api/v1/budgets/{year}/income` - Add/update income source
- `DELETE /api/v1/budgets/{year}/income/{id}` - Remove income source
- `GET /api/v1/stocks` - List user's stocks (for linking ESPP/RSU)
- `POST /api/v1/stocks` - Add stock by ticker symbol
- `GET /api/v1/stocks/{id}/price` or `GET /api/v1/stocks/price?ticker=` - Current (or delayed) price for real-time estimates
- `GET /api/v1/budgets/{year}/categories` - Get categories for the budget year (Income and Taxes special categories plus expense categories; Taxes value from Tax API). If no budget exists for year, create on first access or return empty with system-generated Income/Taxes rows per FR-BUDGET-020/021.
- `POST /api/v1/budgets/{year}/categories` - Create custom category for that budget year
- `PUT /api/v1/budgets/categories/{id}` - Update category (rename, is_tax_deduction, etc.); not allowed for Income/Taxes
- `PATCH /api/v1/budgets/{year}/categories/reorder` - Update category sort_order (e.g. body: [{ id, sort_order }])
- `DELETE /api/v1/budgets/categories/{id}` - Remove category; not allowed for Income or Taxes
- `GET /api/v1/budgets/{year}/categories/{id}/line-items` - List line items for category
- `POST /api/v1/budgets/{year}/categories/{id}/line-items` - Create line item (name, amount, period: Annual|Monthly)
- `PUT /api/v1/budgets/{year}/categories/{id}/line-items/{lineItemId}` - Update line item
- `DELETE /api/v1/budgets/{year}/categories/{id}/line-items/{lineItemId}` - Delete line item

**Tax Profile**
- `GET /api/v1/tax/{year}` - Get tax profile for year (state_code, filing_status, dependents, pre_tax_deductions, ytd_withholding, etc.). Income for tax is **read from** `GET /api/v1/budgets/{year}/income`; no income entry endpoints in Tax.
- `PUT /api/v1/tax/{year}` - Set tax profile (state of residence, filing status, dependents, pre-tax deductions, YTD withholding); only WA supported at launch
- `GET /api/v1/tax/{year}/deductions` - Get deductions (budget-derived from categories with is_tax_deduction + tax-side deductions/credits from tax_only_deductions)
- `GET /api/v1/tax/{year}/deductions/other` - Get tax-only deductions (e.g., Sales Tax) — not in budget
- `POST /api/v1/tax/{year}/deductions/other` - Add tax-only deduction
- `PUT /api/v1/tax/{year}/deductions/other/{id}` - Update tax-only deduction
- `DELETE /api/v1/tax/{year}/deductions/other/{id}` - Remove tax-only deduction
- `GET /api/v1/tax/{year}/calculate` - Calculate tax liability (uses income from Income page, budget deductions read-only, tax-side deductions/credits)
- `GET /api/v1/tax/{year}/summary` - Get tax summary dashboard data

### 6.4 Frontend Architecture (React)

#### Project Structure
```
clearline-web/              (React app)
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── index.tsx
│   ├── App.tsx
│   ├── css/
│   │   ├── app.css (base + Atlanta Falcons variables)
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
│   │   │   └── BudgetReports.tsx
│   │   ├── tax/
│   │   │   └── TaxDashboard.tsx (single view: income group, deductions, tax settings, estimated tax bill)
│   │   └── settings/
│   │       └── Settings.tsx (Notification Preferences, Invite Users, Account/Members, Profile, Appearance)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── MainLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── UserArea.tsx (sidebar bottom: icon + name → Settings)
│   │   ├── BudgetProgressBar.tsx
│   │   ├── TaxBracketVisualizer.tsx
│   │   └── ChartComponent.tsx
│   ├── services/
│   │   ├── api.ts (HTTP client / base URL)
│   │   ├── authService.ts
│   │   ├── budgetService.ts
│   │   └── taxService.ts
│   ├── hooks/
│   │   └── (e.g., useAuth, useTheme)
│   ├── context/
│   │   └── (e.g., AuthContext, ThemeContext)
│   ├── types/
│   │   └── (DTOs, API response types)
│   └── utils/
├── package.json
└── vite.config.ts (or similar)
```

#### Navigation Structure
```
Main Layout (Sidebar Navigation)
├── Dashboard (Home)
├── Budget (default tab: Overview)
│   ├── Overview (default: uses year from top bar; three cards, breakdown, one chart, links to Income and View/edit budget)
│   ├── Income (income sources; total feeds Budget; edit here)
│   ├── Categories (View/edit budget: Income group, expense categories, line items)
│   └── Reports
├── Tax Preparation (single view; default: Tax dashboard)
├── Settings (navigated to via user area click)
│   ├── Notification Preferences
│   ├── Invite Users / Members
│   ├── Account & Profile Details
│   └── Appearance (Theme)
└── [User area at bottom of sidebar]
    └── User icon + display name → click navigates to Settings
```

**Routing & auth gate:** All routes except the login page (and OAuth callback) require an authenticated user. Unauthenticated access to any path (e.g. `/`, `/budget`, `/tax`) shall redirect to the login screen. After successful login, the user is always placed on the Dashboard (home); deep links to other pages may be supported after load, but the initial post-login destination is the Dashboard. The OAuth callback route (e.g. `/auth/callback` or `/auth/google/callback`) shall handle success (redirect to Dashboard) and errors (e.g. user denied consent — show message and link back to login).

---

## 7. User Interface Design

### 7.1 Design System

#### Theme Support
- The application supports **Dark** and **Light** themes with an Atlanta Falcons-inspired palette (red primary, neutral backgrounds).
- User selects theme in **Settings → Preferences**; preference is stored per user and applied across devices.
- All components and screens are defined for both themes so contrast and readability meet WCAG 2.1 AA in either mode.

#### Color Palette – Dark Theme (default)
- **Primary Colors:**
  - Falcon Black: `#000000` (backgrounds, navigation)
  - Falcon Red: `#A71930` (primary actions, accents)
  - Falcon Silver: `#A5ACAF` (secondary text, borders)
- **Supporting Colors:**
  - White: `#FFFFFF` (primary text on dark backgrounds)
  - Dark Gray: `#1A1A1A` (card backgrounds)
  - Medium Gray: `#2D2D2D` (input backgrounds)
  - Light Gray: `#404040` (disabled states)
- **Semantic (shared with Light):** Success Green `#28A745`, Warning Yellow `#FFC107`, Danger Red `#DC3545`

#### Color Palette – Light Theme
- **Primary Colors:**
  - White: `#FFFFFF` (backgrounds, cards)
  - Falcon Red: `#A71930` (primary actions, accents)
  - Charcoal: `#2D2D2D` (primary text)
- **Supporting Colors:**
  - Off-White: `#F5F5F5` (secondary backgrounds, navigation)
  - Light Gray: `#E0E0E0` (borders, dividers)
  - Medium Gray: `#757575` (secondary text, placeholders)
  - Dark Gray: `#404040` (input backgrounds, hover states)
- **Semantic (shared with Dark):** Success Green `#28A745`, Warning Yellow `#FFC107`, Danger Red `#DC3545`

#### Typography
- **Font Family:** 
  - Primary: Segoe UI, Roboto, sans-serif
  - Monospace (for numbers): Roboto Mono, Courier New, monospace
  
- **Font Sizes:**
  - H1: 32px (Page titles)
  - H2: 24px (Section headers)
  - H3: 20px (Card titles)
  - Body: 16px (Regular text)
  - Small: 14px (Secondary text, captions)
  - Tiny: 12px (Labels, hints)

#### Spacing
- Base unit: 8px
- Spacing scale: 8px, 16px, 24px, 32px, 48px, 64px

#### Components (theme-aware)
- **Buttons:**
  - Primary: Falcon red background, white text, rounded corners (8px) (both themes)
  - Secondary: Transparent background, border (silver in dark, charcoal in light), text matches theme
  - Disabled: Muted background and text per theme
  
- **Inputs:**
  - Dark: Medium gray background, silver border, white label text; focus: red border (2px)
  - Light: White or off-white background, light gray border, charcoal label text; focus: red border (2px)
  
- **Cards:**
  - Dark: Dark gray background, subtle silver border, subtle elevation
  - Light: White background, light gray border, subtle elevation
  - Padding: 24px (both)
  
- **Navigation:**
  - Dark: Falcon black background; active: red left border (4px), red text; hover: subtle silver; icons silver
  - Light: Off-white background; active: red left border (4px), red text; hover: light gray; icons charcoal
  
- **Charts:**
  - Line charts: Red primary line; grid and labels use theme-appropriate neutrals
  - Bar charts: Red bars; text and axes use theme-appropriate neutrals
  - Pie charts: Red, neutral segments (silver/dark gray in dark; charcoal/light gray in light)

### 7.2 Key Screens (Wireframe Descriptions)

#### Login Screen
**Purpose:** Unauthenticated users see only this (or redirect here). No app content or navigation is visible until signed in.

**Layout:**
- App branding or logo at top.
- **Sign in with Google** — primary button; triggers OAuth flow. On success, redirect to Dashboard; on error (e.g. user denied), show a short message and keep user on login screen with option to try again.
- **Sign in with email** — secondary option for test accounts (magic link or email + password per implementation). Same success/error handling.
- If an error occurs (network failure, invalid credentials, expired invite link), display a clear, user-friendly message and retry or re-enter option. No stack traces or raw API errors.
- Responsive: same options on phone and desktop; touch-friendly buttons.

**Cross-Device Behavior:** All screens shall adapt for computer and phone. On desktop: use sidebar navigation, multi-column grids, and full-width charts/tables where appropriate. On phone: use a single main column, stacked cards, collapsible or hamburger navigation, and touch-friendly lists/tables (e.g., card-style rows or horizontal scroll only where necessary). Same actions and data on both; only layout and navigation pattern change by viewport.

#### Dashboard (Home)
**Purpose:** At-a-glance view of budget and tax for the selected year. No data entry; all values read from Income, Budget, and Tax modules.

**Layout:**
- **Top bar** (main layout): **Year selector** — dropdown showing selected year (default current year), with option to **add a year**. Same year applies to Dashboard, Budget, and Tax. Optionally greeting (e.g., "Welcome back") in top bar or below it.
- **Row 1 — Summary cards:** Four cards in a row: **(1) Total Income** (from Income page, Official only); **(2) Total Expenses** (sum of budget line items, annual equivalent); **(3) Amount Left Over** (Income − Expenses); **(4) Tax Liability Estimate** (from Tax module: estimated liability and/or projected refund/owed). On phone: stack vertically (e.g., 2×2 grid or single column). No progress circles or %-on-track; totals only.
- **Row 2 — Chart:** One chart: **Budget by Category** (horizontal bar or pie), using same budget data as Budget Overview. On phone: full-width, labels readable. If no budget data, show empty state for chart or hide it.
- **Row 3 — Quick actions:** Buttons or links: **"View / edit budget"** (→ Budget, e.g. Overview or Categories tab); **"Tax summary"** or **"Update tax info"** (→ Tax Preparation). On phone: full-width or large touch targets (≥44px).
- **Empty state:** When no income and/or no budget for the year, show a short message and CTAs (e.g., "Add income" → Income tab, "Set up budget" → Budget → Categories). Cards may show $0 or "—"; chart empty or hidden.
- All elements usable and readable on small screens without horizontal scroll for main content.

**Getting started walkthrough (optional):** On first login (or when not yet completed), the app may present a short walkthrough: a few steps (e.g., overlay or modal) that introduce Dashboard, Budget, Income, and Tax Preparation. Each step is a brief explanation and/or highlight of the relevant area; user clicks Next or Skip. No data entry required. After dismiss or completion, do not auto-show again; optionally provide "Show get started tour" in Settings or on Dashboard so the user can replay it.

#### Budget Overview tab (default when user clicks Budget)
**Layout:**
- Uses **year from top bar** (app-level year selector); no duplicate year control on this tab.
- **Three summary cards:** **[Total Income]** (from Income page, Official only) **−** **[Total Expenses]** (sum of line items in annual equivalent) **=** **[Amount Left Over]**. On phone: stack vertically. Optionally show **Expected income (not yet received): $X** (not included in Total Income or Amount Left Over).
- **Short breakdown:** Income by type (e.g., W-2: $X · Bonus: $Y) and expenses by category (e.g., Housing: $X · Transport: $Y).
- **One chart:** e.g. expenses by category (bar or pie).
- **Links/CTAs:** "Edit income" (→ Income tab), "View / edit budget" (→ Categories tab). No progress bars or alerts.

#### Budget Categories page (View / edit budget)
**Layout:**
- **Top summary:** Same three cards (Total Income, Total Expenses, Amount Left Over) and optional Expected income line.
- Uses **year from top bar**. **Add category** button.
- **Income group (first, read-only):** Displays the same breakdown as the Income page (Official income sources). Hint: "From Income · Edit in Income tab". Cannot be removed or renamed.
- **Expense categories:** Each category in a clear visual grouping. **Add line item** per category. **Line items table** per category: columns **Description**, **Amount**, **Period** (badge or dropdown: Annual | Monthly). Category total = sum of line items in annual equivalent (monthly × 12). **Tax deduction** toggle at category level only (not per line item). **Reorder** categories (e.g. drag handle or up/down). Remove/rename allowed except Income and Taxes.
- **Taxes category:** One read-only category, value from Tax Preparation service; no edit/remove/rename (e.g. "From Tax Estimate" or lock icon).
- **Summary breakdown** by category (e.g., Housing: $X · Transport: $Y · …).
- **Empty state:** When no categories (or no line items), brief explanation and CTA (e.g., "Add your first category", then add line items with amount and period). No progress bars.

#### Income Page (Budget module)
**Layout:**
- Uses **year from top bar**; income shown and edited for the app-level selected year.
- **Top:** **Total Income** (sum of **Official** income only for the selected year) displayed prominently. **Summary breakdown by type** (e.g., "W-2: $X · Bonus: $Y · RSU: $Z · …") so users see the mix at a glance. **Top-right corner:** **Add** button.
- **Add flow:** Click Add → dialog: **“What type of income?”** (W-2 Salary, Bonus, Self-Employment, Interest, RSU, ESPP, PFML, Other). After selection → type-specific dialog with the fields defined in 4.2.1 (including optional Notes). Each entry has a status: Expected (not guaranteed) or Official; user can mark as Official when confirmed. Details in 4.2.1 (e.g., W-2: employer, pay + frequency, start/end date, plus “change in pay” entries for mid-year changes).
- **Content:** All income sources **grouped by type** (e.g., W-2, Bonus, Self-Employment, …). Each **group is collapsible**; **collapsed by default** or per user preference. When **collapsed**, the **group total** is shown on the **right side** of the group header. When expanded, line items are listed underneath.
- **Line items:** Each row shows the income source (e.g., employer name, amount or description) and its status (Expected vs Official). On the **right of each row**, a **3-dot (vertical ellipsis) menu** opens a submenu with **Edit**, **Duplicate**, and **Delete**. **Duplicate** creates a copy for the user to edit (e.g., for another year or similar source).
- **Empty state:** When there are no income sources for the selected year, show a short explanation that income here feeds both the Budget and Tax, and a clear CTA (e.g., "Add your first income source"). Include brief guidance: e.g., start with W-2 salary, then add bonuses, RSU, ESPP, or other types to get a complete picture.
- **Total income** (Official only) from this page is the value shown in the "Total Income" card on the Budget page and used to compute "Amount Left Over" and for Tax calculations.

#### Tax Preparation (single view)
**Purpose:** One screen (no sub-pages). Income and budget-derived deductions are read-only; user edits income in Income tab and deductions/credits in the Tax Deductions section. Estimated tax bill is shown so the user can update withholding themselves.

**Layout:**
- Uses **year from top bar** (app-level year selector).
- **Income group:** Lists all income sources from the Income page (Official only) for the selected year—read-only. A clear **"Edit income"** link (or button) navigates to the **Income tab** (Budget module) to add or edit income.
- **Deductions section:** (1) **From budget** — list of budget categories marked as tax deduction and their amounts (read-only from budget). (2) **Additional deductions and credits** — user can add, edit, remove items here (e.g. Sales Tax, Child Tax Credit). System shows when **standard deduction is higher** than itemized so the user knows to use standard deduction.
- **Tax settings:** A **section on the page** or a **popup/modal** (e.g. "Tax settings" or "Set up tax") where the user can set or add: state of residence, filing status, dependents, pre-tax deductions (401(k), HSA, health premiums, etc.). System pulls **state defaults** (e.g. Social Security, state-specific rules) for the selected state so the user can accept or override.
- **Estimated tax bill:** Prominent display of estimated federal tax liability (and optionally YTD withholding, projected refund or amount owed) so the user can update their withholding (e.g. with employer) as needed. No W-4 recommendation card required.
- **Optional:** Income by source (pie chart), tax bracket visualization. All elements responsive; on phone stack vertically.

#### Main Layout (Top bar + Sidebar + Content)
**Layout:**
- **Top bar:** **Year selector** — dropdown listing available years (default current year), with option to **add a year**. Selecting a year updates Dashboard, Budget, and Tax to that year. Optionally greeting or page title in top bar. On phone: top bar remains visible (e.g. compact year dropdown).
- **Desktop:** Sidebar visible; top: app branding/logo; middle: navigation links (Dashboard, Budget, Tax Preparation); bottom: user area (avatar + display name, clickable → Settings).
- **Phone:** Sidebar collapses to hamburger menu or bottom navigation; user area (icon + name) remains accessible (e.g., in menu or bottom bar) and navigates to Settings. Ensure menu and user area have adequate touch targets (≥44px).
- User area is always available on both computer and phone; visually distinct so it is clear it is the current user.

#### Settings Page
**Entry:** User clicks their icon/name in the sidebar bottom (user area).

**Layout:**
- Page title: "Settings"
- Section: **Notification Preferences**
  - Email notifications: On / Off
  - In-app notifications: On / Off
  - Budget alerts: Enable and set threshold when implemented (e.g., notify when total expenses or category exceeds a limit; MVP may defer alerts if no per-category "spent" tracking)
  - Tax reminders: Enable reminders for key dates (e.g., estimated tax deadlines, year-end)
  - Preferences saved on change or via "Save" per section
- Section: **Invite Users**
  - (Account owner only) Invite household members by email; send invitation link
  - List of pending and accepted invitations
- Section: **Account & Members**
  - View all account members
  - Account owner: Remove member action
  - Any user: Leave account action
- Section: **Profile Details**
  - Display name (optional override of Google name; for email sign-in users, optional display name)
  - Email: Read-only — from Google for Google users; for email sign-in users, show the email used to sign in (login email)
  - Profile picture: Read-only (from Google); optional placeholder if none; for email users, optional avatar or initials
  - Additional fields may be added (e.g., time zone, currency display preference)
- Section: **Appearance**
  - Theme: Toggle or dropdown — "Dark" | "Light"
  - Preference applies immediately and is persisted (no save button required)

---

## 8. Development Phases & Milestones

### Phase 1: Foundation & Authentication (Weeks 1-2)
**Deliverables:**
- Node.js API setup (Express/Fastify or Vercel API routes) with TypeScript
- Supabase project and connection; initial schema (users, accounts, account_members, account_invitations)
- Google OAuth integration (backend + frontend)
- Email sign-in for test accounts (e.g. magic link or email+password via Supabase or custom flow)
- User and Account management APIs; on first sign-in, create user and account and set user as account owner
- React project setup (Vite + TypeScript)
- Login page and authentication flow (Google + email options)
- Basic navigation structure and layout (top bar with year selector, sidebar, user area)

**Milestone:** User can sign in with Google or email and see basic dashboard; app-level year selector in top bar (default current year)

---

### Phase 2: Budget Module (Weeks 3-4)
**Deliverables:**
- Budget, budget_income_sources (Income tab), budget_categories, and budget_category_line_items tables in Supabase; Income and Taxes as special categories (read-only from Income page and Tax module)
- Budget CRUD APIs (categories with line items CRUD; income sources CRUD; summary with totalIncome, totalExpenses, amountLeftOver; Taxes category value from Tax API)
- Budget Overview and Categories pages; Income tab (income sources with status Expected/Official)
- Line items per category (description, amount, period Annual/Monthly); category total = sum in annual equivalent
- Budget summary and chart (no progress bars); optional Budget reports

**Milestone:** User can create annual budget, add income and expense line items, and view budget summary

---

### Phase 3: Tax Preparation Module - Part 1 (Weeks 5-6)
**Deliverables:**
- Tax profile and tax_only_deductions tables in Supabase (tax_profiles: state_code, filing_status, dependents, pre_tax_deductions, ytd_withholding; tax_only_deductions with item_type deduction/credit)
- Tax dashboard page that reads income from Budget API (`GET /api/v1/budgets/{year}/income`); no income entry in Tax
- Tax settings UI (state of residence, filing status, dependents, pre-tax deductions); state defaults pulled in
- Basic tax calculation engine (federal brackets, standard vs itemized, credits applied after tax)
- Tax summary visualization and estimated tax bill; optional YTD withholding and projected refund/owed

**Milestone:** User sees Tax view with income (from Income tab), sets tax settings and deductions/credits, and sees estimated tax liability

---

### Phase 4: Tax Preparation Module - Part 2 (Weeks 7-8)
**Deliverables:**
- All income types (including ESPP, RSU) entered on **Income tab** (Budget module); Tax calculation uses that data for payroll-by-type and liability
- Tax bracket visualizer component (optional on Tax view)
- Interest calculator tool (Income page)
- Tax empty state when no income or no tax profile (FR-TAX-018)

**Milestone:** User can enter all income types on Income tab, see complete tax picture and estimated tax bill on Tax view; Tax pulls income and budget deductions read-only

---

### Phase 5: Polish & Deployment (Weeks 9-10)
**Deliverables:**
- Light theme implementation (CSS variables, theme-light.css) and theme toggle in Settings
- Theme preference persistence (user profile/API)
- Error handling and validation improvements
- Performance optimization
- Cross-device testing: verify full app is accessible and easy to use on computer and phone (responsive layouts, touch targets, no horizontal scroll for content, same features on both)
- Deploy to Vercel (React frontend + Node.js API); connect Supabase via env
- User documentation (in-app help)
- Final QA testing

**Milestone:** Application deployed on Vercel and ready for use; minimal cost (Vercel + Supabase)

---

### Phase 6: Post-Launch Enhancements (Future)
**Potential Features:**
- Notifications and reminders
- Data import/export (CSV, Excel)
- Receipt photo upload and OCR
- Multi-year tax comparison
- iOS support
- Budget forecasting and projections

---

## 9. Risk Assessment & Mitigation

### 9.1 Technical Risks

**Risk 1: Supabase / Plan Limits**
- **Likelihood:** Low–Medium
- **Impact:** Low–Medium
- **Mitigation:**
  - Stay within Supabase free tier limits (database size, bandwidth). Use archiving for old tax/budget years if needed.
  - Monitor usage in Supabase dashboard; upgrade plan only when necessary to keep cost minimal.

**Risk 2: Vercel Serverless Cold Starts**
- **Likelihood:** Low
- **Impact:** Low
- **Mitigation:**
  - Accept minor latency on first request after idle; optimize DB queries and keep serverless functions lean. For very low traffic, cost remains minimal.

**Risk 3: Frontend Framework & Browser Compatibility**
- **Likelihood:** Low
- **Impact:** Low–Medium
- **Mitigation:**
  - Use stable React and tooling versions; follow React best practices
  - Test on all supported browsers (Chrome, Firefox, Safari, Edge)
  - Responsive design and testing on real devices; React Native or PWA can be added later for native Android if needed

**Risk 4: Tax Calculation Accuracy**
- **Likelihood:** Medium
- **Impact:** High
- **Mitigation:**
  - Use official IRS tax tables and formulas
  - Add disclaimer that app is for estimation only, not tax advice
  - Thorough testing with multiple scenarios
  - Annual review and update for new tax laws
  - Recommend users verify with tax professional

### 9.2 Business Risks

**Risk 1: User Adoption**
- **Likelihood:** Medium
- **Impact:** Medium
- **Mitigation:**
  - Focus on solving real pain points (tax visibility and estimated tax bill)
  - Gather user feedback early and iterate
  - Keep UX simple and intuitive
  - Provide clear value proposition

**Risk 2: Scope Creep**
- **Likelihood:** High
- **Impact:** Medium
- **Mitigation:**
  - Stick to defined MVP features
  - Use phased approach with clear milestones
  - Document future enhancements separately
  - Prioritize features based on user value

**Risk 3: Google OAuth Changes**
- **Likelihood:** Low
- **Impact:** High
- **Mitigation:**
  - Monitor Google OAuth deprecation notices
  - Build authentication abstraction layer
  - Have plan to add alternative auth methods if needed

---

## 10. Success Criteria

### 10.1 MVP Launch Criteria
- [ ] User can sign in with Google account
- [ ] User can select and persist dark or light theme (Settings)
- [ ] User can invite household members
- [ ] User can create and track annual budget
- [ ] User can enter all income types (W-2, ESPP, RSU, bonuses, etc.)
- [ ] System calculates federal tax liability
- [ ] System displays estimated tax liability (and optional YTD withholding / projected refund or owed)
- [ ] React web app functional and equally usable on computer and phone (responsive, touch-friendly, same features on both)
- [ ] Application deployed on Vercel (React frontend + Node.js API + Supabase)
- [ ] All core features have ≥ 70% test coverage

### 10.2 User Acceptance Criteria
- Users can complete common workflows in < 5 minutes
- Users report application is "easy to use" (rating ≥ 4/5)
- Zero critical bugs in production
- Tax calculations match IRS examples within $50

---

## 11. Open Questions & Assumptions

### 11.1 Open Questions
1. **Tax Filing Status:** Should the app support all filing statuses (Single, MFJ, MFS, HOH, QW)?
   - **Decision:** Support Single and Married Filing Jointly for MVP. Add others in Phase 8.

2. **Data Retention:** How long should archived data be retained?
   - **Decision:** Indefinite retention for MVP. Add configurable retention policy in Phase 8.

3. **Backup Strategy:** Should users be able to download their data?
   - **Decision:** Not in MVP. Add CSV/JSON export in Phase 8.

4. **Mobile-First vs. Desktop-First:** Which platform should be prioritized during development?
   - **Decision:** Build one responsive web app; design and test for both computer and phone. Full app must be accessible and easy to use on both (see NFR-USE-007 through NFR-USE-011). Desktop-first implementation is acceptable, but mobile layouts and touch usability are required at launch.

### 11.2 Assumptions
1. Users have basic financial literacy and understand concepts like gross income and withholding
2. Users are responsible for verifying tax calculations with a professional
3. Internet required for Google OAuth and Supabase; app is used online.
4. Supabase (free tier) will be sufficient for initial use; upgrade only if needed to keep cost minimal.
5. Single Vercel project (or monorepo) for frontend + API keeps deployment simple and cheap.
6. Google OAuth will remain free and available.
7. Users will not require offline mode for MVP.
8. Tax laws will remain relatively stable (annual updates manageable).
9. **State support:** Only Washington (WA) is supported at launch. The data model and tax logic are plumbed for multiple states (state_code, state-specific rules); adding a state is a matter of implementing that state's rules and adding it to the state selector, not a redesign.
10. **Currency:** All monetary amounts are in **USD**. No multi-currency support at MVP; display and input use dollar formatting (e.g. $1,234.56).
11. **Tax brackets and standard deduction:** The Appendix (12.1) provides reference values for **2026** (current year). The implementation shall use the values for the **selected tax year**; brackets and standard deduction may be updated annually and shall be configurable (e.g. by year) so the app remains accurate as tax laws change.
12. **Current year:** The **current calendar year** for this PRD and for the app’s default year selector is **2026**. The default selected year when a user has not chosen one shall be 2026 (or the actual current year at runtime). Year ranges (e.g. “add year”) should include 2026 as the baseline (e.g. 2016–2036 or current year ± 10).

---

## 12. Appendix

### 12.1 Tax Calculation Formulas

#### Federal Income Tax (2026 Tax Brackets - Married Filing Jointly)
| Taxable Income Range | Tax Rate | Tax Calculation |
|----------------------|----------|-----------------|
| $0 - $24,800 | 10% | 10% of income |
| $24,801 - $100,800 | 12% | $2,480 + 12% of amount over $24,800 |
| $100,801 - $211,400 | 22% | $11,600 + 22% of amount over $100,800 |
| $211,401 - $403,550 | 24% | $35,932 + 24% of amount over $211,400 |
| $403,551 - $512,450 | 32% | $82,048 + 32% of amount over $403,550 |
| $512,451 - $768,700 | 35% | $116,896 + 35% of amount over $512,450 |
| $768,701+ | 37% | $206,583.50 + 37% of amount over $768,700 |

**Standard Deduction (2026):** $32,200 (Married Filing Jointly); $16,100 (Single). The system shall use the value that matches the user's filing status from the tax profile (FR-TAX-014).

#### Federal Income Tax (2026 Tax Brackets - Single)
| Taxable Income Range | Tax Rate | Tax Calculation |
|----------------------|----------|-----------------|
| $0 - $12,400 | 10% | 10% of income |
| $12,401 - $50,400 | 12% | $1,240 + 12% of amount over $12,400 |
| $50,401 - $105,700 | 22% | $5,800 + 22% of amount over $50,400 |
| $105,701 - $201,775 | 24% | $17,966 + 24% of amount over $105,700 |
| $201,776 - $256,225 | 32% | $41,024 + 32% of amount over $201,775 |
| $256,226 - $640,600 | 35% | $58,448 + 35% of amount over $256,225 |
| $640,601+ | 37% | $192,979.25 + 37% of amount over $640,600 |

Tax calculation shall apply the bracket set (Single vs. MFJ) based on the user's filing status in the tax profile. Brackets and standard deduction shall be updated annually for the tax year (e.g. 2026, 2027). The PRD uses 2026 as the current year (Assumption 12).

#### FICA Taxes
- **Social Security:** 6.2% on first $184,500 of wages (2026)
- **Medicare:** 1.45% on all wages
- **Additional Medicare:** 0.9% on wages over $250,000 (MFJ)

#### Self-Employment Tax
- **Rate:** 15.3% (12.4% Social Security + 2.9% Medicare) on 92.35% of net self-employment income
- **Social Security Cap:** Same as FICA ($184,500 for 2026)

#### ESPP Taxation
- **Ordinary Income:** `Shares × FMV at Purchase × Discount%`
- **Short-term Capital Gain:** `Shares × (Sale Price - FMV at Purchase)`
  - If sold same day as purchase, typically no capital gain/loss

#### RSU Taxation
- **Ordinary Income at Vesting:** `Shares × FMV at Vesting`
- **Capital Gain/Loss on Sale:**
  - **Short-term** (held ≤ 1 year): `Shares × (Sale Price - FMV at Vesting)` - taxed as ordinary income
  - **Long-term** (held > 1 year): `Shares × (Sale Price - FMV at Vesting)` - taxed at capital gains rates (0%, 15%, 20%)

### 12.2 Glossary

- **Official income:** Income source marked as confirmed/received; included in Budget Total Income, Amount Left Over, and Tax calculations.
- **Expected income:** Income source marked as not yet received (planning only); shown on Budget as "Expected income (not yet received)" but not included in Total Income or tax.
- **AGI (Adjusted Gross Income):** Gross income minus specific deductions (e.g., IRA contributions, student loan interest)
- **APY (Annual Percentage Yield):** Interest rate earned on savings account over one year
- **ESPP (Employee Stock Purchase Plan):** Company benefit allowing employees to purchase company stock at a discount
- **FMV (Fair Market Value):** Current market price of an asset
- **PFML (Paid Family and Medical Leave):** Washington State program providing paid leave benefits (other states may have similar programs when state support is extended)
- **QBI (Qualified Business Income):** Deduction for self-employed individuals (up to 20% of qualified income)
- **RSU (Restricted Stock Unit):** Company compensation that converts to shares upon vesting
- **W-4:** IRS form employees submit to employers to determine tax withholding
- **W-2:** IRS form showing annual wages and taxes withheld

### 12.3 References

- IRS Publication 17: Your Federal Income Tax
- IRS Form W-4 Instructions
- Washington State Department of Revenue: https://dor.wa.gov (additional state revenue departments when those states are added)
- Vercel Documentation: https://vercel.com/docs
- Supabase Documentation: https://supabase.com/docs
- Node.js: https://nodejs.org
- React Documentation: https://react.dev
- React Router: https://reactrouter.com

---

**END OF DOCUMENT**
