export type Theme = 'light' | 'dark'
export type FilingStatus = 'single' | 'married_filing_jointly' | 'married_filing_separately' | 'head_of_household'
export type IncomeType = 'W2' | 'Bonus' | 'RSU' | 'ESPP' | 'SelfEmployed' | 'Other'
export type IncomeStatus = 'Expected' | 'Official'
export type LinePeriod = 'Annual' | 'Monthly'
export type InvitationStatus = 'pending' | 'accepted' | 'expired'
export type DeductionItemType = 'deduction' | 'credit'

export interface User {
  id: string
  email: string
  display_name?: string
  theme_preference: Theme
  notification_preferences: Record<string, boolean>
  account_id: string
}

export interface Account {
  id: string
  owner_id: string
  created_at: string
}

export interface AccountMember {
  user_id: string
  role: 'owner' | 'member'
  created_at: string
  users: {
    id: string
    email: string
    display_name?: string
  }
}

export interface Invitation {
  id: string
  email: string
  status: InvitationStatus
  expires_at: string
  created_at: string
  token?: string
}

export interface IncomeSource {
  id: string
  type: IncomeType
  description?: string
  amount: number
  status: IncomeStatus
  type_specific_data?: Record<string, unknown>
}

export interface BudgetCategory {
  id: string
  name: string
  is_income_category: boolean
  is_taxes_category: boolean
  is_tax_deduction: boolean
  sort_order: number
  budget_category_line_items: LineItem[]
}

export interface LineItem {
  id: string
  name: string
  amount: number
  period: LinePeriod
}

export interface BudgetSummary {
  totalIncome: number
  totalExpenses: number
  amountLeftOver: number
  hasBudget: boolean
}

export interface TaxProfile {
  id: string
  account_id: string
  year: number
  state_code: string
  filing_status: FilingStatus
  dependents: number
  pre_tax_deductions: number
  ytd_withholding: number
}

export interface TaxDeduction {
  id: string
  name: string
  item_type: DeductionItemType
  amount: number
  description?: string
}

export interface TaxCalculation {
  grossIncome: number
  adjustedGrossIncome: number
  standardDeduction: number
  itemizedDeduction: number
  deductionUsed: number
  taxableIncome: number
  federalTax: number
  ficaTax: number
  socialSecurityTax: number
  medicareTax: number
  totalTax: number
  effectiveRate: number
  marginalRate: number
  estimatedBalance: number
  useItemized: boolean
}

export interface Stock {
  id: string
  ticker_symbol: string
  company_name?: string
}
