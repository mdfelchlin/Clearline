import { Router, Response } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { requireAuth } from '../middleware/auth'
import { AuthenticatedRequest } from '../types'
import { logger } from '../lib/logger'
import { calculateTax } from '../services/taxCalculation'
import { FilingStatus, IncomeType, IncomeStatus } from '../types'

const router = Router()

const taxProfileSchema = z.object({
  state_code: z.string().length(2).default('WA'),
  filing_status: z.enum(['single', 'married_filing_jointly', 'married_filing_separately', 'head_of_household']).default('single'),
  dependents: z.number().int().nonnegative().default(0),
  pre_tax_deductions: z.number().nonnegative().default(0),
  ytd_withholding: z.number().nonnegative().default(0),
})

const taxDeductionSchema = z.object({
  name: z.string().min(1).max(200),
  item_type: z.enum(['deduction', 'credit']),
  amount: z.number().nonnegative(),
  description: z.string().max(500).optional(),
})

async function getOrCreateTaxProfile(accountId: string, year: number) {
  const { data: existing } = await supabase
    .from('tax_profiles')
    .select('*')
    .eq('account_id', accountId)
    .eq('year', year)
    .single()

  if (existing) return existing

  const { data: newProfile, error } = await supabase
    .from('tax_profiles')
    .insert({ account_id: accountId, year, state_code: 'WA', filing_status: 'single', dependents: 0, pre_tax_deductions: 0, ytd_withholding: 0 })
    .select('*')
    .single()

  if (error || !newProfile) throw new Error('Failed to create tax profile')
  return newProfile
}

router.get('/:year', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const year = parseInt(req.params.year as string, 10)
    if (isNaN(year)) { res.status(400).json({ error: 'Invalid year' }); return }

    const profile = await getOrCreateTaxProfile(req.user!.accountId, year)
    res.json({ taxProfile: profile })
  } catch (err) {
    logger.error({ err }, 'Get tax profile error')
    res.status(500).json({ error: 'Failed to get tax profile' })
  }
})

router.put('/:year', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const year = parseInt(req.params.year as string, 10)
    if (isNaN(year)) { res.status(400).json({ error: 'Invalid year' }); return }

    const profileData = taxProfileSchema.partial().parse(req.body)

    const { data: existing } = await supabase
      .from('tax_profiles').select('id').eq('account_id', req.user!.accountId).eq('year', year).single()

    let result
    if (existing) {
      const { data, error } = await supabase
        .from('tax_profiles').update(profileData).eq('id', existing.id).select('*').single()
      if (error || !data) { res.status(500).json({ error: 'Failed to update tax profile' }); return }
      result = data
    } else {
      const { data, error } = await supabase
        .from('tax_profiles')
        .insert({ ...profileData, account_id: req.user!.accountId, year })
        .select('*').single()
      if (error || !data) { res.status(500).json({ error: 'Failed to create tax profile' }); return }
      result = data
    }

    res.json({ taxProfile: result })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: 'Invalid tax profile data', details: err.errors }); return }
    logger.error({ err }, 'Update tax profile error')
    res.status(500).json({ error: 'Failed to update tax profile' })
  }
})

router.get('/:year/deductions', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const year = parseInt(req.params.year as string, 10)
    if (isNaN(year)) { res.status(400).json({ error: 'Invalid year' }); return }

    const { data: budget } = await supabase
      .from('budgets').select('id').eq('account_id', req.user!.accountId).eq('year', year).single()

    const budgetDeductions: Array<{ name: string; amount: number; source: string }> = []
    if (budget) {
      const { data: taxDeductCategories } = await supabase
        .from('budget_categories')
        .select('id, name, budget_category_line_items(name, amount, period)')
        .eq('budget_id', budget.id)
        .eq('is_tax_deduction', true)

      taxDeductCategories?.forEach(cat => {
        const items = cat.budget_category_line_items as Array<{ name: string; amount: number; period: string }>
        items?.forEach(item => {
          const annual = item.period === 'Monthly' ? item.amount * 12 : item.amount
          budgetDeductions.push({ name: item.name, amount: annual, source: cat.name })
        })
      })
    }

    const profile = await getOrCreateTaxProfile(req.user!.accountId, year)
    const { data: taxOnlyDeductions } = await supabase
      .from('tax_only_deductions')
      .select('id, name, item_type, amount, description')
      .eq('tax_profile_id', profile.id)

    res.json({
      budgetDerived: budgetDeductions,
      taxOnly: taxOnlyDeductions ?? [],
    })
  } catch (err) {
    logger.error({ err }, 'Get deductions error')
    res.status(500).json({ error: 'Failed to get deductions' })
  }
})

router.get('/:year/deductions/other', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const year = parseInt(req.params.year as string, 10)
    if (isNaN(year)) { res.status(400).json({ error: 'Invalid year' }); return }

    const profile = await getOrCreateTaxProfile(req.user!.accountId, year)

    const { data, error } = await supabase
      .from('tax_only_deductions')
      .select('id, name, item_type, amount, description, created_at')
      .eq('tax_profile_id', profile.id)
      .order('created_at')

    if (error) { res.status(500).json({ error: 'Failed to get deductions' }); return }
    res.json({ deductions: data ?? [] })
  } catch (err) {
    logger.error({ err }, 'Get tax-only deductions error')
    res.status(500).json({ error: 'Failed to get deductions' })
  }
})

router.post('/:year/deductions/other', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const year = parseInt(req.params.year as string, 10)
    if (isNaN(year)) { res.status(400).json({ error: 'Invalid year' }); return }

    const deductionData = taxDeductionSchema.parse(req.body)
    const profile = await getOrCreateTaxProfile(req.user!.accountId, year)

    const { data, error } = await supabase
      .from('tax_only_deductions')
      .insert({ ...deductionData, tax_profile_id: profile.id })
      .select('id, name, item_type, amount, description')
      .single()

    if (error || !data) { res.status(500).json({ error: 'Failed to add deduction' }); return }
    res.status(201).json({ deduction: data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: 'Invalid deduction data', details: err.errors }); return }
    logger.error({ err }, 'Create tax deduction error')
    res.status(500).json({ error: 'Failed to add deduction' })
  }
})

router.put('/:year/deductions/other/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const year = parseInt(req.params.year as string, 10)
    if (isNaN(year)) { res.status(400).json({ error: 'Invalid year' }); return }

    const deductionData = taxDeductionSchema.partial().parse(req.body)
    const profile = await getOrCreateTaxProfile(req.user!.accountId, year)

    const { data, error } = await supabase
      .from('tax_only_deductions')
      .update(deductionData)
      .eq('id', req.params.id)
      .eq('tax_profile_id', profile.id)
      .select('id, name, item_type, amount, description')
      .single()

    if (error || !data) { res.status(404).json({ error: 'Deduction not found' }); return }
    res.json({ deduction: data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: 'Invalid deduction data', details: err.errors }); return }
    logger.error({ err }, 'Update tax deduction error')
    res.status(500).json({ error: 'Failed to update deduction' })
  }
})

router.delete('/:year/deductions/other/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const year = parseInt(req.params.year as string, 10)
    if (isNaN(year)) { res.status(400).json({ error: 'Invalid year' }); return }

    const profile = await getOrCreateTaxProfile(req.user!.accountId, year)

    const { error } = await supabase
      .from('tax_only_deductions')
      .delete()
      .eq('id', req.params.id)
      .eq('tax_profile_id', profile.id)

    if (error) { res.status(500).json({ error: 'Failed to delete deduction' }); return }
    res.status(204).send()
  } catch (err) {
    logger.error({ err }, 'Delete tax deduction error')
    res.status(500).json({ error: 'Failed to delete deduction' })
  }
})

router.get('/:year/calculate', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const year = parseInt(req.params.year as string, 10)
    if (isNaN(year)) { res.status(400).json({ error: 'Invalid year' }); return }

    const profile = await getOrCreateTaxProfile(req.user!.accountId, year)

    const { data: budget } = await supabase
      .from('budgets').select('id').eq('account_id', req.user!.accountId).eq('year', year).single()

    let incomes: Array<{ type: IncomeType; amount: number; status: IncomeStatus }> = []
    let budgetDeductions = 0

    if (budget) {
      const { data: incomeData } = await supabase
        .from('budget_income_sources')
        .select('type, amount, status')
        .eq('budget_id', budget.id)
        .eq('status', 'Official')

      incomes = (incomeData ?? []).map(i => ({
        type: i.type as IncomeType,
        amount: i.amount,
        status: i.status as IncomeStatus,
      }))

      const { data: taxDeductCategories } = await supabase
        .from('budget_categories')
        .select('id, budget_category_line_items(amount, period)')
        .eq('budget_id', budget.id)
        .eq('is_tax_deduction', true)

      taxDeductCategories?.forEach(cat => {
        const items = cat.budget_category_line_items as Array<{ amount: number; period: string }>
        items?.forEach(item => {
          budgetDeductions += item.period === 'Monthly' ? item.amount * 12 : item.amount
        })
      })
    }

    const { data: taxOnlyData } = await supabase
      .from('tax_only_deductions')
      .select('item_type, amount')
      .eq('tax_profile_id', profile.id)

    const taxOnlyDeductions = taxOnlyData?.filter(d => d.item_type === 'deduction').reduce((sum, d) => sum + d.amount, 0) ?? 0
    const taxOnlyCredits = taxOnlyData?.filter(d => d.item_type === 'credit').reduce((sum, d) => sum + d.amount, 0) ?? 0

    const result = calculateTax({
      filingStatus: profile.filing_status as FilingStatus,
      state: profile.state_code,
      dependents: profile.dependents,
      incomes,
      preTaxDeductions: profile.pre_tax_deductions,
      budgetDeductions,
      taxOnlyDeductions,
      taxOnlyCredits,
      ytdWithholding: profile.ytd_withholding,
    })

    res.json({ calculation: result, year })
  } catch (err) {
    logger.error({ err }, 'Tax calculation error')
    res.status(500).json({ error: 'Failed to calculate tax' })
  }
})

router.get('/:year/summary', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const year = parseInt(req.params.year as string, 10)
    if (isNaN(year)) { res.status(400).json({ error: 'Invalid year' }); return }

    const profile = await getOrCreateTaxProfile(req.user!.accountId, year)

    const { data: budget } = await supabase
      .from('budgets').select('id').eq('account_id', req.user!.accountId).eq('year', year).single()

    const hasOfficialIncome = budget ? (await supabase
      .from('budget_income_sources')
      .select('id')
      .eq('budget_id', budget.id)
      .eq('status', 'Official')
      .limit(1)).data?.length ?? 0 > 0 : false

    res.json({
      hasTaxProfile: true,
      hasOfficialIncome,
      state: profile.state_code,
      filingStatus: profile.filing_status,
      year,
    })
  } catch (err) {
    logger.error({ err }, 'Tax summary error')
    res.status(500).json({ error: 'Failed to get tax summary' })
  }
})

export default router
