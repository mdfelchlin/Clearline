import { describe, it, expect } from 'vitest'

// Budget summary logic tests (pure functions / logic extracted from routes)

function calcBudgetSummary(incomes: Array<{ amount: number; status: 'Expected' | 'Official' }>, lineItems: Array<{ amount: number; period: 'Annual' | 'Monthly' }>) {
  const totalIncome = incomes
    .filter((i) => i.status === 'Official')
    .reduce((sum, i) => sum + i.amount, 0)

  const totalExpenses = lineItems.reduce((sum, li) => {
    return sum + (li.period === 'Monthly' ? li.amount * 12 : li.amount)
  }, 0)

  return { totalIncome, totalExpenses, amountLeftOver: totalIncome - totalExpenses }
}

describe('budget summary logic', () => {
  it('includes only Official income in totalIncome', () => {
    const result = calcBudgetSummary(
      [
        { amount: 100000, status: 'Official' },
        { amount: 20000, status: 'Expected' },
      ],
      []
    )
    expect(result.totalIncome).toBe(100000)
  })

  it('sums Annual line items directly', () => {
    const result = calcBudgetSummary([], [
      { amount: 12000, period: 'Annual' },
      { amount: 6000, period: 'Annual' },
    ])
    expect(result.totalExpenses).toBe(18000)
  })

  it('annualizes Monthly line items', () => {
    const result = calcBudgetSummary([], [
      { amount: 1000, period: 'Monthly' },
    ])
    expect(result.totalExpenses).toBe(12000)
  })

  it('mixes Annual and Monthly items', () => {
    const result = calcBudgetSummary([], [
      { amount: 1000, period: 'Monthly' },
      { amount: 5000, period: 'Annual' },
    ])
    expect(result.totalExpenses).toBe(17000)
  })

  it('calculates amountLeftOver correctly', () => {
    const result = calcBudgetSummary(
      [{ amount: 100000, status: 'Official' }],
      [{ amount: 2000, period: 'Monthly' }]
    )
    expect(result.amountLeftOver).toBe(100000 - 24000)
  })

  it('handles negative amountLeftOver', () => {
    const result = calcBudgetSummary(
      [{ amount: 10000, status: 'Official' }],
      [{ amount: 5000, period: 'Monthly' }]
    )
    expect(result.amountLeftOver).toBeLessThan(0)
  })

  it('returns zero totals for empty data', () => {
    const result = calcBudgetSummary([], [])
    expect(result.totalIncome).toBe(0)
    expect(result.totalExpenses).toBe(0)
    expect(result.amountLeftOver).toBe(0)
  })
})
