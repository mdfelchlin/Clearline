import { api } from './api'
import { TaxProfile, TaxDeduction, TaxCalculation, FilingStatus } from '../types'

export const taxService = {
  async getProfile(year: number): Promise<TaxProfile> {
    const data = await api.get<{ taxProfile: TaxProfile }>(`/tax/${year}`)
    return data.taxProfile
  },

  async updateProfile(year: number, profile: Partial<{
    state_code: string
    filing_status: FilingStatus
    dependents: number
    pre_tax_deductions: number
    ytd_withholding: number
  }>): Promise<TaxProfile> {
    const data = await api.put<{ taxProfile: TaxProfile }>(`/tax/${year}`, profile)
    return data.taxProfile
  },

  async getDeductions(year: number): Promise<{
    budgetDerived: Array<{ name: string; amount: number; source: string }>
    taxOnly: TaxDeduction[]
  }> {
    return api.get(`/tax/${year}/deductions`)
  },

  async getTaxOnlyDeductions(year: number): Promise<TaxDeduction[]> {
    const data = await api.get<{ deductions: TaxDeduction[] }>(`/tax/${year}/deductions/other`)
    return data.deductions
  },

  async addTaxOnlyDeduction(year: number, deduction: {
    name: string
    item_type: 'deduction' | 'credit'
    amount: number
    description?: string
  }): Promise<TaxDeduction> {
    const data = await api.post<{ deduction: TaxDeduction }>(`/tax/${year}/deductions/other`, deduction)
    return data.deduction
  },

  async updateTaxOnlyDeduction(year: number, id: string, updates: Partial<{
    name: string
    item_type: 'deduction' | 'credit'
    amount: number
    description: string
  }>): Promise<TaxDeduction> {
    const data = await api.put<{ deduction: TaxDeduction }>(`/tax/${year}/deductions/other/${id}`, updates)
    return data.deduction
  },

  async deleteTaxOnlyDeduction(year: number, id: string): Promise<void> {
    await api.delete(`/tax/${year}/deductions/other/${id}`)
  },

  async calculate(year: number): Promise<TaxCalculation> {
    const data = await api.get<{ calculation: TaxCalculation }>(`/tax/${year}/calculate`)
    return data.calculation
  },

  async getSummary(year: number) {
    return api.get<{
      hasTaxProfile: boolean
      hasOfficialIncome: boolean
      state: string
      filingStatus: FilingStatus
      year: number
    }>(`/tax/${year}/summary`)
  },
}
