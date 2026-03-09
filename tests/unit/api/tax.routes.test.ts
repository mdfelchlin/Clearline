import { describe, it, expect } from 'vitest'

// Tax profile and deduction validation logic tests

type FilingStatus = 'single' | 'married_filing_jointly' | 'married_filing_separately' | 'head_of_household'

interface TaxProfileInput {
  filing_status: FilingStatus
  state_code: string
  dependents: number
  pre_tax_deductions: number
  ytd_withholding: number
}

interface TaxDeductionInput {
  name: string
  item_type: 'deduction' | 'credit'
  amount: number
}

function validateTaxProfile(input: Partial<TaxProfileInput>): string[] {
  const errors: string[] = []
  const validFilingStatuses: FilingStatus[] = ['single', 'married_filing_jointly', 'married_filing_separately', 'head_of_household']

  if (input.filing_status !== undefined && !validFilingStatuses.includes(input.filing_status)) {
    errors.push('filing_status must be a valid value')
  }
  if (input.dependents !== undefined && (input.dependents < 0 || !Number.isInteger(input.dependents))) {
    errors.push('dependents must be a non-negative integer')
  }
  if (input.pre_tax_deductions !== undefined && input.pre_tax_deductions < 0) {
    errors.push('pre_tax_deductions must be non-negative')
  }
  if (input.ytd_withholding !== undefined && input.ytd_withholding < 0) {
    errors.push('ytd_withholding must be non-negative')
  }
  return errors
}

function validateTaxDeduction(input: Partial<TaxDeductionInput>): string[] {
  const errors: string[] = []
  if (!input.name || input.name.trim().length === 0) {
    errors.push('name is required')
  }
  if (!input.item_type || !['deduction', 'credit'].includes(input.item_type)) {
    errors.push('item_type must be deduction or credit')
  }
  if (input.amount === undefined || input.amount < 0 || isNaN(input.amount)) {
    errors.push('amount must be non-negative')
  }
  return errors
}

describe('tax profile validation', () => {
  it('accepts valid profile', () => {
    const errors = validateTaxProfile({
      filing_status: 'single',
      state_code: 'WA',
      dependents: 1,
      pre_tax_deductions: 5000,
      ytd_withholding: 8000,
    })
    expect(errors).toHaveLength(0)
  })

  it('rejects invalid filing status', () => {
    const errors = validateTaxProfile({ filing_status: 'invalid' as FilingStatus })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('rejects negative dependents', () => {
    const errors = validateTaxProfile({ dependents: -1 })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('rejects fractional dependents', () => {
    const errors = validateTaxProfile({ dependents: 1.5 })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('rejects negative pre_tax_deductions', () => {
    const errors = validateTaxProfile({ pre_tax_deductions: -100 })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('rejects negative ytd_withholding', () => {
    const errors = validateTaxProfile({ ytd_withholding: -500 })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('accepts zero values', () => {
    const errors = validateTaxProfile({ dependents: 0, pre_tax_deductions: 0, ytd_withholding: 0 })
    expect(errors).toHaveLength(0)
  })
})

describe('tax deduction validation', () => {
  it('accepts valid deduction', () => {
    const errors = validateTaxDeduction({ name: 'Mortgage interest', item_type: 'deduction', amount: 5000 })
    expect(errors).toHaveLength(0)
  })

  it('accepts valid credit', () => {
    const errors = validateTaxDeduction({ name: 'Child care credit', item_type: 'credit', amount: 2000 })
    expect(errors).toHaveLength(0)
  })

  it('rejects empty name', () => {
    const errors = validateTaxDeduction({ name: '', item_type: 'deduction', amount: 100 })
    expect(errors).toContain('name is required')
  })

  it('rejects invalid item_type', () => {
    const errors = validateTaxDeduction({ name: 'Test', item_type: 'bonus' as 'deduction', amount: 100 })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('rejects negative amount', () => {
    const errors = validateTaxDeduction({ name: 'Test', item_type: 'deduction', amount: -500 })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('allows zero amount', () => {
    const errors = validateTaxDeduction({ name: 'Test', item_type: 'credit', amount: 0 })
    expect(errors).toHaveLength(0)
  })
})
