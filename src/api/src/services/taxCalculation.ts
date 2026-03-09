import { FilingStatus, IncomeType } from '../types'

interface TaxBracket {
  rate: number
  min: number
  max: number
}

const FEDERAL_BRACKETS_2026: Record<FilingStatus, TaxBracket[]> = {
  single: [
    { rate: 0.10, min: 0, max: 11925 },
    { rate: 0.12, min: 11925, max: 48475 },
    { rate: 0.22, min: 48475, max: 103350 },
    { rate: 0.24, min: 103350, max: 197300 },
    { rate: 0.32, min: 197300, max: 250525 },
    { rate: 0.35, min: 250525, max: 626350 },
    { rate: 0.37, min: 626350, max: Infinity },
  ],
  married_filing_jointly: [
    { rate: 0.10, min: 0, max: 23850 },
    { rate: 0.12, min: 23850, max: 96950 },
    { rate: 0.22, min: 96950, max: 206700 },
    { rate: 0.24, min: 206700, max: 394600 },
    { rate: 0.32, min: 394600, max: 501050 },
    { rate: 0.35, min: 501050, max: 751600 },
    { rate: 0.37, min: 751600, max: Infinity },
  ],
  married_filing_separately: [
    { rate: 0.10, min: 0, max: 11925 },
    { rate: 0.12, min: 11925, max: 48475 },
    { rate: 0.22, min: 48475, max: 103350 },
    { rate: 0.24, min: 103350, max: 197300 },
    { rate: 0.32, min: 197300, max: 250525 },
    { rate: 0.35, min: 250525, max: 375800 },
    { rate: 0.37, min: 375800, max: Infinity },
  ],
  head_of_household: [
    { rate: 0.10, min: 0, max: 17000 },
    { rate: 0.12, min: 17000, max: 64850 },
    { rate: 0.22, min: 64850, max: 103350 },
    { rate: 0.24, min: 103350, max: 197300 },
    { rate: 0.32, min: 197300, max: 250500 },
    { rate: 0.35, min: 250500, max: 626350 },
    { rate: 0.37, min: 626350, max: Infinity },
  ],
}

const STANDARD_DEDUCTIONS_2026: Record<FilingStatus, number> = {
  single: 15000,
  married_filing_jointly: 30000,
  married_filing_separately: 15000,
  head_of_household: 22500,
}

const CHILD_TAX_CREDIT = 2000
const DEPENDENT_CREDIT_PHASEOUT_SINGLE = 200000
const DEPENDENT_CREDIT_PHASEOUT_MFJ = 400000

const SOCIAL_SECURITY_WAGE_BASE_2026 = 176100
const SOCIAL_SECURITY_RATE = 0.062
const MEDICARE_RATE = 0.0145
const ADDITIONAL_MEDICARE_RATE = 0.009
const ADDITIONAL_MEDICARE_THRESHOLD_SINGLE = 200000
const ADDITIONAL_MEDICARE_THRESHOLD_MFJ = 250000

interface IncomeSource {
  type: IncomeType
  amount: number
  status: 'Expected' | 'Official'
  type_specific_data?: Record<string, unknown>
}

interface TaxCalculationInput {
  filingStatus: FilingStatus
  state: string
  dependents: number
  incomes: IncomeSource[]
  preTaxDeductions: number
  budgetDeductions: number
  taxOnlyDeductions: number
  taxOnlyCredits: number
  ytdWithholding: number
}

interface TaxCalculationResult {
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

export function calculateFederalTax(taxableIncome: number, filingStatus: FilingStatus): number {
  const brackets = FEDERAL_BRACKETS_2026[filingStatus]
  let tax = 0

  for (const bracket of brackets) {
    if (taxableIncome <= bracket.min) break
    const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min
    tax += taxableInBracket * bracket.rate
  }

  return Math.round(tax * 100) / 100
}

export function getMarginalRate(taxableIncome: number, filingStatus: FilingStatus): number {
  const brackets = FEDERAL_BRACKETS_2026[filingStatus]
  for (const bracket of [...brackets].reverse()) {
    if (taxableIncome > bracket.min) return bracket.rate
  }
  return brackets[0].rate
}

export function calculateFICA(
  incomes: IncomeSource[],
  filingStatus: FilingStatus
): { socialSecurity: number; medicare: number } {
  const w2Wages = incomes
    .filter((i) => i.type === 'W2' || i.type === 'Bonus')
    .reduce((sum, i) => sum + i.amount, 0)

  const ssTaxable = Math.min(w2Wages, SOCIAL_SECURITY_WAGE_BASE_2026)
  const socialSecurity = Math.round(ssTaxable * SOCIAL_SECURITY_RATE * 100) / 100

  const totalWages = incomes
    .filter((i) => i.type !== 'SelfEmployed')
    .reduce((sum, i) => sum + i.amount, 0)

  const medicareThreshold =
    filingStatus === 'married_filing_jointly'
      ? ADDITIONAL_MEDICARE_THRESHOLD_MFJ
      : ADDITIONAL_MEDICARE_THRESHOLD_SINGLE

  const baseMedicare = Math.round(totalWages * MEDICARE_RATE * 100) / 100
  const additionalMedicare =
    totalWages > medicareThreshold
      ? Math.round((totalWages - medicareThreshold) * ADDITIONAL_MEDICARE_RATE * 100) / 100
      : 0

  return {
    socialSecurity,
    medicare: baseMedicare + additionalMedicare,
  }
}

export function calculateDependentCredit(
  dependents: number,
  filingStatus: FilingStatus,
  agi: number
): number {
  if (dependents === 0) return 0

  const phaseoutThreshold =
    filingStatus === 'married_filing_jointly'
      ? DEPENDENT_CREDIT_PHASEOUT_MFJ
      : DEPENDENT_CREDIT_PHASEOUT_SINGLE

  if (agi > phaseoutThreshold) {
    const reduction = Math.ceil((agi - phaseoutThreshold) / 2500) * 50 * dependents
    const credit = Math.max(0, dependents * CHILD_TAX_CREDIT - reduction)
    return credit
  }

  return dependents * CHILD_TAX_CREDIT
}

export function calculateTax(input: TaxCalculationInput): TaxCalculationResult {
  const officialIncomes = input.incomes.filter((i) => i.status === 'Official')
  const grossIncome = officialIncomes.reduce((sum, i) => sum + i.amount, 0)
  const agi = Math.max(0, grossIncome - input.preTaxDeductions)

  const standardDeduction = STANDARD_DEDUCTIONS_2026[input.filingStatus]
  const itemizedDeduction = input.budgetDeductions + input.taxOnlyDeductions
  const useItemized = itemizedDeduction > standardDeduction
  const deductionUsed = useItemized ? itemizedDeduction : standardDeduction

  const taxableIncome = Math.max(0, agi - deductionUsed)
  const federalTaxBeforeCredits = calculateFederalTax(taxableIncome, input.filingStatus)

  const dependentCredit = calculateDependentCredit(input.dependents, input.filingStatus, agi)
  const federalTax = Math.max(0, federalTaxBeforeCredits - dependentCredit - input.taxOnlyCredits)

  const fica = calculateFICA(officialIncomes, input.filingStatus)
  const ficaTax = fica.socialSecurity + fica.medicare

  const totalTax = federalTax + ficaTax
  const effectiveRate = grossIncome > 0 ? totalTax / grossIncome : 0
  const marginalRate = getMarginalRate(taxableIncome, input.filingStatus)
  const estimatedBalance = totalTax - input.ytdWithholding

  return {
    grossIncome,
    adjustedGrossIncome: agi,
    standardDeduction,
    itemizedDeduction,
    deductionUsed,
    taxableIncome,
    federalTax,
    ficaTax,
    socialSecurityTax: fica.socialSecurity,
    medicareTax: fica.medicare,
    totalTax,
    effectiveRate: Math.round(effectiveRate * 10000) / 100,
    marginalRate: marginalRate * 100,
    estimatedBalance,
    useItemized,
  }
}
