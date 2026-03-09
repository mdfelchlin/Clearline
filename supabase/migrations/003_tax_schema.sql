-- ============================================================
-- tax_profiles: per account per year
-- Income for tax is read from budget_income_sources only
-- ============================================================
CREATE TABLE IF NOT EXISTS tax_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  year INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  state_code CHAR(2) NOT NULL DEFAULT 'WA',
  filing_status TEXT NOT NULL DEFAULT 'single'
    CHECK (filing_status IN ('single', 'married_filing_jointly', 'married_filing_separately', 'head_of_household')),
  dependents INTEGER NOT NULL DEFAULT 0 CHECK (dependents >= 0),
  pre_tax_deductions NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (pre_tax_deductions >= 0),
  ytd_withholding NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (ytd_withholding >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, year)
);

-- ============================================================
-- tax_only_deductions: deductions/credits not in budget
-- ============================================================
CREATE TABLE IF NOT EXISTS tax_only_deductions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tax_profile_id UUID NOT NULL REFERENCES tax_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'deduction' CHECK (item_type IN ('deduction', 'credit')),
  amount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Row Level Security policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_income_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_category_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_only_deductions ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS — API uses service role for all operations
-- No client-side RLS policies needed since all access goes through the Node API with service role
