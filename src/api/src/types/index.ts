import { Request } from 'express'

export interface AuthenticatedUser {
  id: string
  email: string
  accountId: string
  role: 'owner' | 'member'
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser
}

export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
}

export type FilingStatus = 'single' | 'married_filing_jointly' | 'married_filing_separately' | 'head_of_household'
export type IncomeType = 'W2' | 'Bonus' | 'RSU' | 'ESPP' | 'SelfEmployed' | 'Other'
export type IncomeStatus = 'Expected' | 'Official'
export type LinePeriod = 'Annual' | 'Monthly'
export type InvitationStatus = 'pending' | 'accepted' | 'expired'
export type DeductionItemType = 'deduction' | 'credit'
