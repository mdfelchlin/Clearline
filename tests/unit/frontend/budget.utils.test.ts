import { describe, it, expect } from 'vitest'

// Frontend budget utility tests

type LinePeriod = 'Annual' | 'Monthly'

function annualAmount(amount: number, period: LinePeriod): number {
  return period === 'Monthly' ? amount * 12 : amount
}

function categoryTotal(lineItems: Array<{ amount: number; period: LinePeriod }>): number {
  return lineItems.reduce((s, li) => s + annualAmount(li.amount, li.period), 0)
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

function getAvailableYears(minYear = 2016, maxYear = 2036): number[] {
  const years: number[] = []
  for (let y = minYear; y <= maxYear; y++) years.push(y)
  return years
}

describe('annualAmount', () => {
  it('returns the amount as-is for Annual', () => {
    expect(annualAmount(5000, 'Annual')).toBe(5000)
  })

  it('multiplies by 12 for Monthly', () => {
    expect(annualAmount(1000, 'Monthly')).toBe(12000)
  })

  it('handles zero', () => {
    expect(annualAmount(0, 'Monthly')).toBe(0)
  })
})

describe('categoryTotal', () => {
  it('sums mixed period line items', () => {
    const items = [
      { amount: 12000, period: 'Annual' as LinePeriod },
      { amount: 500, period: 'Monthly' as LinePeriod },
    ]
    expect(categoryTotal(items)).toBe(12000 + 6000)
  })

  it('returns 0 for empty list', () => {
    expect(categoryTotal([])).toBe(0)
  })
})

describe('formatCurrency', () => {
  it('formats a number as USD', () => {
    expect(formatCurrency(1500)).toBe('$1,500')
  })

  it('handles negative amounts', () => {
    expect(formatCurrency(-500)).toBe('-$500')
  })

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('$0')
  })
})

describe('getAvailableYears', () => {
  it('returns correct range', () => {
    const years = getAvailableYears(2020, 2025)
    expect(years).toEqual([2020, 2021, 2022, 2023, 2024, 2025])
  })

  it('includes min and max years', () => {
    const years = getAvailableYears(2016, 2036)
    expect(years[0]).toBe(2016)
    expect(years[years.length - 1]).toBe(2036)
  })

  it('returns 21 years for default range', () => {
    const years = getAvailableYears()
    expect(years).toHaveLength(21)
  })
})
