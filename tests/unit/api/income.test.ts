import { describe, it, expect } from 'vitest'

// Income validation logic tests

type IncomeType = 'W2' | 'Bonus' | 'RSU' | 'ESPP' | 'SelfEmployed' | 'Other'
type IncomeStatus = 'Expected' | 'Official'

interface IncomeInput {
  type: IncomeType
  amount: number
  status: IncomeStatus
}

function validateIncome(input: Partial<IncomeInput>): string[] {
  const errors: string[] = []
  const validTypes: IncomeType[] = ['W2', 'Bonus', 'RSU', 'ESPP', 'SelfEmployed', 'Other']
  const validStatuses: IncomeStatus[] = ['Expected', 'Official']

  if (!input.type || !validTypes.includes(input.type)) {
    errors.push('type must be one of: ' + validTypes.join(', '))
  }
  if (input.amount === undefined || input.amount < 0 || isNaN(input.amount)) {
    errors.push('amount must be a non-negative number')
  }
  if (!input.status || !validStatuses.includes(input.status)) {
    errors.push('status must be Expected or Official')
  }
  return errors
}

function totalOfficialIncome(incomes: IncomeInput[]): number {
  return incomes.filter((i) => i.status === 'Official').reduce((s, i) => s + i.amount, 0)
}

describe('income validation', () => {
  it('accepts valid W2 income', () => {
    const errors = validateIncome({ type: 'W2', amount: 100000, status: 'Official' })
    expect(errors).toHaveLength(0)
  })

  it('rejects negative amount', () => {
    const errors = validateIncome({ type: 'W2', amount: -1, status: 'Official' })
    expect(errors).toContain('amount must be a non-negative number')
  })

  it('allows zero amount', () => {
    const errors = validateIncome({ type: 'W2', amount: 0, status: 'Expected' })
    expect(errors).toHaveLength(0)
  })

  it('rejects invalid type', () => {
    const errors = validateIncome({ type: 'InvalidType' as IncomeType, amount: 100, status: 'Official' })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('rejects invalid status', () => {
    const errors = validateIncome({ type: 'W2', amount: 100, status: 'Pending' as IncomeStatus })
    expect(errors.length).toBeGreaterThan(0)
  })

  it('accepts all valid income types', () => {
    const types: IncomeType[] = ['W2', 'Bonus', 'RSU', 'ESPP', 'SelfEmployed', 'Other']
    for (const type of types) {
      const errors = validateIncome({ type, amount: 0, status: 'Expected' })
      expect(errors).toHaveLength(0)
    }
  })
})

describe('totalOfficialIncome', () => {
  it('only counts Official income', () => {
    const incomes: IncomeInput[] = [
      { type: 'W2', amount: 100000, status: 'Official' },
      { type: 'Bonus', amount: 10000, status: 'Expected' },
    ]
    expect(totalOfficialIncome(incomes)).toBe(100000)
  })

  it('sums multiple Official sources', () => {
    const incomes: IncomeInput[] = [
      { type: 'W2', amount: 100000, status: 'Official' },
      { type: 'Bonus', amount: 5000, status: 'Official' },
    ]
    expect(totalOfficialIncome(incomes)).toBe(105000)
  })

  it('returns 0 with only Expected income', () => {
    const incomes: IncomeInput[] = [
      { type: 'W2', amount: 100000, status: 'Expected' },
    ]
    expect(totalOfficialIncome(incomes)).toBe(0)
  })
})
