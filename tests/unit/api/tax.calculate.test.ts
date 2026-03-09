import { describe, it, expect } from 'vitest'
import {
  calculateFederalTax,
  getMarginalRate,
  calculateFICA,
  calculateDependentCredit,
  calculateTax,
} from '../../../src/api/src/services/taxCalculation'

describe('calculateFederalTax', () => {
  it('returns 0 for 0 income', () => {
    expect(calculateFederalTax(0, 'single')).toBe(0)
  })

  it('calculates 10% bracket correctly for single filer', () => {
    // First $11,925 at 10%
    expect(calculateFederalTax(10000, 'single')).toBeCloseTo(1000, 0)
  })

  it('calculates across multiple brackets for single filer', () => {
    // $50,000 crosses into the 22% bracket at $48,475
    // 10% on $11,925 + 12% on ($48,475 - $11,925) + 22% on ($50,000 - $48,475)
    const tax = calculateFederalTax(50000, 'single')
    const expected = 11925 * 0.10 + (48475 - 11925) * 0.12 + (50000 - 48475) * 0.22
    expect(tax).toBeCloseTo(expected, 0)
  })

  it('calculates correctly for married filing jointly', () => {
    const tax = calculateFederalTax(100000, 'married_filing_jointly')
    const expected = 23850 * 0.10 + (96950 - 23850) * 0.12 + (100000 - 96950) * 0.22
    expect(tax).toBeCloseTo(expected, 0)
  })

  it('handles high income with 37% bracket', () => {
    const tax = calculateFederalTax(700000, 'single')
    expect(tax).toBeGreaterThan(200000)
  })
})

describe('getMarginalRate', () => {
  it('returns 10% for low income', () => {
    expect(getMarginalRate(5000, 'single')).toBe(0.10)
  })

  it('returns 22% for middle income single', () => {
    expect(getMarginalRate(60000, 'single')).toBe(0.22)
  })

  it('returns 37% for very high income', () => {
    expect(getMarginalRate(700000, 'single')).toBe(0.37)
  })
})

describe('calculateFICA', () => {
  it('calculates social security for W2 income', () => {
    const result = calculateFICA([{ type: 'W2', amount: 100000, status: 'Official' }], 'single')
    expect(result.socialSecurity).toBeCloseTo(100000 * 0.062, 0)
  })

  it('caps social security at wage base', () => {
    const result = calculateFICA([{ type: 'W2', amount: 200000, status: 'Official' }], 'single')
    expect(result.socialSecurity).toBeCloseTo(176100 * 0.062, 0)
  })

  it('calculates additional Medicare for high earners', () => {
    const result = calculateFICA([{ type: 'W2', amount: 250000, status: 'Official' }], 'single')
    const baseMedicare = 250000 * 0.0145
    const additionalMedicare = (250000 - 200000) * 0.009
    expect(result.medicare).toBeCloseTo(baseMedicare + additionalMedicare, 0)
  })

  it('uses higher threshold for MFJ', () => {
    const single = calculateFICA([{ type: 'W2', amount: 220000, status: 'Official' }], 'single')
    const mfj = calculateFICA([{ type: 'W2', amount: 220000, status: 'Official' }], 'married_filing_jointly')
    expect(single.medicare).toBeGreaterThan(mfj.medicare)
  })
})

describe('calculateDependentCredit', () => {
  it('returns 0 for no dependents', () => {
    expect(calculateDependentCredit(0, 'single', 100000)).toBe(0)
  })

  it('returns $2000 per dependent below phaseout', () => {
    expect(calculateDependentCredit(2, 'single', 100000)).toBe(4000)
  })

  it('phases out above threshold for single', () => {
    const credit = calculateDependentCredit(1, 'single', 210000)
    expect(credit).toBeLessThan(2000)
  })

  it('uses higher threshold for MFJ', () => {
    const single = calculateDependentCredit(1, 'single', 210000)
    const mfj = calculateDependentCredit(1, 'married_filing_jointly', 210000)
    expect(mfj).toBeGreaterThan(single)
  })
})

describe('calculateTax (integration)', () => {
  it('uses only Official income', () => {
    const result = calculateTax({
      filingStatus: 'single',
      state: 'WA',
      dependents: 0,
      incomes: [
        { type: 'W2', amount: 80000, status: 'Official' },
        { type: 'W2', amount: 20000, status: 'Expected' },
      ],
      preTaxDeductions: 0,
      budgetDeductions: 0,
      taxOnlyDeductions: 0,
      taxOnlyCredits: 0,
      ytdWithholding: 0,
    })
    expect(result.grossIncome).toBe(80000)
  })

  it('applies standard deduction when higher than itemized', () => {
    const result = calculateTax({
      filingStatus: 'single',
      state: 'WA',
      dependents: 0,
      incomes: [{ type: 'W2', amount: 80000, status: 'Official' }],
      preTaxDeductions: 0,
      budgetDeductions: 5000,
      taxOnlyDeductions: 1000,
      taxOnlyCredits: 0,
      ytdWithholding: 0,
    })
    expect(result.useItemized).toBe(false)
    expect(result.deductionUsed).toBe(15000)
  })

  it('uses itemized deduction when higher than standard', () => {
    const result = calculateTax({
      filingStatus: 'single',
      state: 'WA',
      dependents: 0,
      incomes: [{ type: 'W2', amount: 80000, status: 'Official' }],
      preTaxDeductions: 0,
      budgetDeductions: 10000,
      taxOnlyDeductions: 8000,
      taxOnlyCredits: 0,
      ytdWithholding: 0,
    })
    expect(result.useItemized).toBe(true)
    expect(result.deductionUsed).toBe(18000)
  })

  it('calculates estimated balance from withholding', () => {
    const result = calculateTax({
      filingStatus: 'single',
      state: 'WA',
      dependents: 0,
      incomes: [{ type: 'W2', amount: 80000, status: 'Official' }],
      preTaxDeductions: 0,
      budgetDeductions: 0,
      taxOnlyDeductions: 0,
      taxOnlyCredits: 0,
      ytdWithholding: 10000,
    })
    expect(result.estimatedBalance).toBe(result.totalTax - 10000)
  })

  it('subtracts credits from federal tax', () => {
    const noCredit = calculateTax({
      filingStatus: 'single',
      state: 'WA',
      dependents: 0,
      incomes: [{ type: 'W2', amount: 80000, status: 'Official' }],
      preTaxDeductions: 0,
      budgetDeductions: 0,
      taxOnlyDeductions: 0,
      taxOnlyCredits: 0,
      ytdWithholding: 0,
    })
    const withCredit = calculateTax({
      filingStatus: 'single',
      state: 'WA',
      dependents: 0,
      incomes: [{ type: 'W2', amount: 80000, status: 'Official' }],
      preTaxDeductions: 0,
      budgetDeductions: 0,
      taxOnlyDeductions: 0,
      taxOnlyCredits: 2000,
      ytdWithholding: 0,
    })
    expect(withCredit.federalTax).toBe(Math.max(0, noCredit.federalTax - 2000))
  })
})
