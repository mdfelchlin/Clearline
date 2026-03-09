import { Router, Response } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { requireAuth } from '../middleware/auth'
import { AuthenticatedRequest } from '../types'
import { logger } from '../lib/logger'

const router = Router()

const incomeSchema = z.object({
  type: z.enum(['W2', 'Bonus', 'RSU', 'ESPP', 'SelfEmployed', 'Other']),
  description: z.string().max(200).optional(),
  amount: z.number().nonnegative(),
  status: z.enum(['Expected', 'Official']).default('Expected'),
  type_specific_data: z.record(z.unknown()).optional(),
})

const categorySchema = z.object({
  name: z.string().min(1).max(100),
  is_tax_deduction: z.boolean().default(false),
  sort_order: z.number().int().nonnegative().optional(),
})

const lineItemSchema = z.object({
  name: z.string().min(1).max(200),
  amount: z.number().nonnegative(),
  period: z.enum(['Annual', 'Monthly']),
})

const reorderSchema = z.array(z.object({ id: z.string().uuid(), sort_order: z.number().int() }))
const moveLineItemSchema = z.object({ target_category_id: z.string().uuid() })

async function getOrCreateBudget(accountId: string, year: number) {
  const { data: existing } = await supabase
    .from('budgets')
    .select('id')
    .eq('account_id', accountId)
    .eq('year', year)
    .single()

  if (existing) return existing.id

  const { data: newBudget, error } = await supabase
    .from('budgets')
    .insert({ account_id: accountId, year })
    .select('id')
    .single()

  if (error || !newBudget) throw new Error('Failed to create budget')

  await supabase.from('budget_categories').insert([
    { budget_id: newBudget.id, name: 'Income', is_income_category: true, sort_order: 0 },
    { budget_id: newBudget.id, name: 'Taxes', is_taxes_category: true, sort_order: 1 },
  ])

  return newBudget.id
}

router.get('/:year', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const year = parseInt(req.params.year as string, 10)
    if (isNaN(year)) { res.status(400).json({ error: 'Invalid year' }); return }

    const { data, error } = await supabase
      .from('budgets')
      .select('id, year, created_at')
      .eq('account_id', req.user!.accountId)
      .eq('year', year)
      .single()

    if (error || !data) { res.status(404).json({ error: 'Budget not found for this year' }); return }
    res.json({ budget: data })
  } catch (err) {
    logger.error({ err }, 'Get budget error')
    res.status(500).json({ error: 'Failed to get budget' })
  }
})

router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { year } = z.object({ year: z.number().int().min(2000).max(2100) }).parse(req.body)
    const budgetId = await getOrCreateBudget(req.user!.accountId, year)
    res.status(201).json({ budget: { id: budgetId, year } })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: 'Invalid request', details: err.errors }); return }
    logger.error({ err }, 'Create budget error')
    res.status(500).json({ error: 'Failed to create budget' })
  }
})

router.get('/:year/summary', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const year = parseInt(req.params.year as string, 10)
    if (isNaN(year)) { res.status(400).json({ error: 'Invalid year' }); return }

    const { data: budget } = await supabase
      .from('budgets')
      .select('id')
      .eq('account_id', req.user!.accountId)
      .eq('year', year)
      .single()

    if (!budget) { res.json({ totalIncome: 0, totalExpenses: 0, amountLeftOver: 0, hasBudget: false }); return }

    const { data: incomes } = await supabase
      .from('budget_income_sources')
      .select('amount')
      .eq('budget_id', budget.id)
      .eq('status', 'Official')

    const totalIncome = incomes?.reduce((sum, i) => sum + (i.amount ?? 0), 0) ?? 0

    const { data: lineItems } = await supabase
      .from('budget_category_line_items')
      .select('amount, period, budget_categories!inner(is_income_category, is_taxes_category, budget_id)')
      .eq('budget_categories.budget_id', budget.id)
      .eq('budget_categories.is_income_category', false)
      .eq('budget_categories.is_taxes_category', false)

    const totalExpenses = lineItems?.reduce((sum, li) => {
      const annual = li.period === 'Monthly' ? li.amount * 12 : li.amount
      return sum + annual
    }, 0) ?? 0

    res.json({ totalIncome, totalExpenses, amountLeftOver: totalIncome - totalExpenses, hasBudget: true })
  } catch (err) {
    logger.error({ err }, 'Budget summary error')
    res.status(500).json({ error: 'Failed to get budget summary' })
  }
})

router.get('/:year/income', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const year = parseInt(req.params.year as string, 10)
    if (isNaN(year)) { res.status(400).json({ error: 'Invalid year' }); return }

    const { data: budget } = await supabase
      .from('budgets').select('id').eq('account_id', req.user!.accountId).eq('year', year).single()

    if (!budget) { res.json({ income: [] }); return }

    const { data, error } = await supabase
      .from('budget_income_sources')
      .select('id, type, description, amount, status, type_specific_data, created_at')
      .eq('budget_id', budget.id)
      .order('created_at')

    if (error) { res.status(500).json({ error: 'Failed to get income' }); return }
    res.json({ income: data ?? [] })
  } catch (err) {
    logger.error({ err }, 'Get income error')
    res.status(500).json({ error: 'Failed to get income' })
  }
})

async function validateStockIdIfNeeded(
  accountId: string,
  type: string,
  typeSpecificData: Record<string, unknown> | undefined,
  res: Response
): Promise<boolean> {
  const stockId = typeSpecificData?.stock_id
  if ((type !== 'RSU' && type !== 'ESPP') || typeof stockId !== 'string') return true
  const { data: stock, error } = await supabase
    .from('stocks')
    .select('id')
    .eq('id', stockId)
    .eq('account_id', accountId)
    .single()
  if (error || !stock) {
    res.status(400).json({ error: 'Invalid or unknown stock for this account' })
    return false
  }
  return true
}

router.post('/:year/income', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const year = parseInt(req.params.year as string, 10)
    if (isNaN(year)) { res.status(400).json({ error: 'Invalid year' }); return }

    const incomeData = incomeSchema.parse(req.body)
    if (!(await validateStockIdIfNeeded(req.user!.accountId, incomeData.type, incomeData.type_specific_data, res))) return
    const budgetId = await getOrCreateBudget(req.user!.accountId, year)

    const { data, error } = await supabase
      .from('budget_income_sources')
      .insert({ ...incomeData, budget_id: budgetId })
      .select('id, type, description, amount, status, type_specific_data')
      .single()

    if (error || !data) { res.status(500).json({ error: 'Failed to add income' }); return }
    res.status(201).json({ income: data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: 'Invalid income data', details: err.errors }); return }
    logger.error({ err }, 'Create income error')
    res.status(500).json({ error: 'Failed to add income' })
  }
})

router.put('/:year/income/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const year = parseInt(req.params.year as string, 10)
    if (isNaN(year)) { res.status(400).json({ error: 'Invalid year' }); return }

    const incomeData = incomeSchema.partial().parse(req.body)
    const { data: budget } = await supabase
      .from('budgets').select('id').eq('account_id', req.user!.accountId).eq('year', year).single()
    if (!budget) { res.status(404).json({ error: 'Budget not found' }); return }
    const { data: existing } = await supabase
      .from('budget_income_sources')
      .select('type, type_specific_data')
      .eq('id', req.params.id)
      .eq('budget_id', budget.id)
      .single()
    const type = incomeData.type ?? existing?.type
    const typeSpecificData = incomeData.type_specific_data ?? existing?.type_specific_data as Record<string, unknown> | undefined
    if (type && !(await validateStockIdIfNeeded(req.user!.accountId, type, typeSpecificData, res))) return

    const { data, error } = await supabase
      .from('budget_income_sources')
      .update(incomeData)
      .eq('id', req.params.id)
      .eq('budget_id', budget.id)
      .select('id, type, description, amount, status, type_specific_data')
      .single()

    if (error || !data) { res.status(404).json({ error: 'Income source not found' }); return }
    res.json({ income: data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: 'Invalid income data', details: err.errors }); return }
    logger.error({ err }, 'Update income error')
    res.status(500).json({ error: 'Failed to update income' })
  }
})

router.delete('/:year/income/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const year = parseInt(req.params.year as string, 10)
    if (isNaN(year)) { res.status(400).json({ error: 'Invalid year' }); return }

    const { data: budget } = await supabase
      .from('budgets').select('id').eq('account_id', req.user!.accountId).eq('year', year).single()
    if (!budget) { res.status(404).json({ error: 'Budget not found' }); return }

    const { error } = await supabase
      .from('budget_income_sources')
      .delete()
      .eq('id', req.params.id)
      .eq('budget_id', budget.id)

    if (error) { res.status(500).json({ error: 'Failed to delete income' }); return }
    res.status(204).send()
  } catch (err) {
    logger.error({ err }, 'Delete income error')
    res.status(500).json({ error: 'Failed to delete income' })
  }
})

router.get('/:year/categories', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const year = parseInt(req.params.year as string, 10)
    if (isNaN(year)) { res.status(400).json({ error: 'Invalid year' }); return }

    const budgetId = await getOrCreateBudget(req.user!.accountId, year)

    const { data, error } = await supabase
      .from('budget_categories')
      .select('id, name, is_income_category, is_taxes_category, is_tax_deduction, sort_order, budget_category_line_items(id, name, amount, period)')
      .eq('budget_id', budgetId)
      .order('sort_order')

    if (error) { res.status(500).json({ error: 'Failed to get categories' }); return }
    res.json({ categories: data ?? [] })
  } catch (err) {
    logger.error({ err }, 'Get categories error')
    res.status(500).json({ error: 'Failed to get categories' })
  }
})

router.post('/:year/categories', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const year = parseInt(req.params.year as string, 10)
    if (isNaN(year)) { res.status(400).json({ error: 'Invalid year' }); return }

    const categoryData = categorySchema.parse(req.body)
    const budgetId = await getOrCreateBudget(req.user!.accountId, year)

    const { data: maxSort } = await supabase
      .from('budget_categories').select('sort_order').eq('budget_id', budgetId).order('sort_order', { ascending: false }).limit(1).single()

    const sortOrder = categoryData.sort_order ?? ((maxSort?.sort_order ?? 0) + 1)

    const { data, error } = await supabase
      .from('budget_categories')
      .insert({ ...categoryData, budget_id: budgetId, sort_order: sortOrder })
      .select('id, name, is_income_category, is_taxes_category, is_tax_deduction, sort_order')
      .single()

    if (error || !data) { res.status(500).json({ error: 'Failed to create category' }); return }
    res.status(201).json({ category: data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: 'Invalid category data', details: err.errors }); return }
    logger.error({ err }, 'Create category error')
    res.status(500).json({ error: 'Failed to create category' })
  }
})

router.put('/categories/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const updateData = categorySchema.partial().parse(req.body)

    const { data: category } = await supabase
      .from('budget_categories')
      .select('id, is_income_category, is_taxes_category, budget_id, budgets!inner(account_id)')
      .eq('id', req.params.id)
      .single()

    if (!category) { res.status(404).json({ error: 'Category not found' }); return }

    const budget = category.budgets as unknown as { account_id: string } | null
    if (budget?.account_id !== req.user!.accountId) { res.status(403).json({ error: 'Access denied' }); return }
    if (category.is_income_category || category.is_taxes_category) { res.status(400).json({ error: 'Cannot modify system categories' }); return }

    const { data, error } = await supabase
      .from('budget_categories')
      .update(updateData)
      .eq('id', req.params.id)
      .select('id, name, is_income_category, is_taxes_category, is_tax_deduction, sort_order')
      .single()

    if (error || !data) { res.status(500).json({ error: 'Failed to update category' }); return }
    res.json({ category: data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: 'Invalid category data', details: err.errors }); return }
    logger.error({ err }, 'Update category error')
    res.status(500).json({ error: 'Failed to update category' })
  }
})

router.patch('/:year/categories/reorder', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const year = parseInt(req.params.year as string, 10)
    if (isNaN(year)) { res.status(400).json({ error: 'Invalid year' }); return }

    const items = reorderSchema.parse(req.body)

    await Promise.all(items.map(item =>
      supabase.from('budget_categories').update({ sort_order: item.sort_order }).eq('id', item.id)
    ))

    res.json({ message: 'Categories reordered' })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: 'Invalid reorder data', details: err.errors }); return }
    logger.error({ err }, 'Reorder categories error')
    res.status(500).json({ error: 'Failed to reorder categories' })
  }
})

router.delete('/categories/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { data: category } = await supabase
      .from('budget_categories')
      .select('id, is_income_category, is_taxes_category, budget_id, budgets!inner(account_id)')
      .eq('id', req.params.id)
      .single()

    if (!category) { res.status(404).json({ error: 'Category not found' }); return }

    const budget = category.budgets as unknown as { account_id: string } | null
    if (budget?.account_id !== req.user!.accountId) { res.status(403).json({ error: 'Access denied' }); return }
    if (category.is_income_category || category.is_taxes_category) { res.status(400).json({ error: 'Cannot delete system categories' }); return }

    const { error } = await supabase.from('budget_categories').delete().eq('id', req.params.id)
    if (error) { res.status(500).json({ error: 'Failed to delete category' }); return }
    res.status(204).send()
  } catch (err) {
    logger.error({ err }, 'Delete category error')
    res.status(500).json({ error: 'Failed to delete category' })
  }
})

router.get('/:year/categories/:categoryId/line-items', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const year = parseInt(req.params.year as string, 10)
    if (isNaN(year)) { res.status(400).json({ error: 'Invalid year' }); return }

    const { data, error } = await supabase
      .from('budget_category_line_items')
      .select('id, name, amount, period, created_at')
      .eq('budget_category_id', req.params.categoryId)
      .order('created_at')

    if (error) { res.status(500).json({ error: 'Failed to get line items' }); return }
    res.json({ lineItems: data ?? [] })
  } catch (err) {
    logger.error({ err }, 'Get line items error')
    res.status(500).json({ error: 'Failed to get line items' })
  }
})

router.post('/:year/categories/:categoryId/line-items', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const lineItemData = lineItemSchema.parse(req.body)

    const { data, error } = await supabase
      .from('budget_category_line_items')
      .insert({ ...lineItemData, budget_category_id: req.params.categoryId })
      .select('id, name, amount, period')
      .single()

    if (error || !data) { res.status(500).json({ error: 'Failed to create line item' }); return }
    res.status(201).json({ lineItem: data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: 'Invalid line item data', details: err.errors }); return }
    logger.error({ err }, 'Create line item error')
    res.status(500).json({ error: 'Failed to create line item' })
  }
})

router.put('/:year/categories/:categoryId/line-items/:lineItemId', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const lineItemData = lineItemSchema.partial().parse(req.body)

    const { data, error } = await supabase
      .from('budget_category_line_items')
      .update(lineItemData)
      .eq('id', req.params.lineItemId)
      .eq('budget_category_id', req.params.categoryId)
      .select('id, name, amount, period')
      .single()

    if (error || !data) { res.status(404).json({ error: 'Line item not found' }); return }
    res.json({ lineItem: data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: 'Invalid line item data', details: err.errors }); return }
    logger.error({ err }, 'Update line item error')
    res.status(500).json({ error: 'Failed to update line item' })
  }
})

router.delete('/:year/categories/:categoryId/line-items/:lineItemId', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { error } = await supabase
      .from('budget_category_line_items')
      .delete()
      .eq('id', req.params.lineItemId)
      .eq('budget_category_id', req.params.categoryId)

    if (error) { res.status(500).json({ error: 'Failed to delete line item' }); return }
    res.status(204).send()
  } catch (err) {
    logger.error({ err }, 'Delete line item error')
    res.status(500).json({ error: 'Failed to delete line item' })
  }
})

router.patch('/:year/line-items/:lineItemId/move', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const year = parseInt(req.params.year as string, 10)
    if (isNaN(year)) { res.status(400).json({ error: 'Invalid year' }); return }
    const { target_category_id } = moveLineItemSchema.parse(req.body)

    const { data: lineItem } = await supabase
      .from('budget_category_line_items')
      .select('id, budget_category_id, budget_categories!inner(budget_id, budgets!inner(account_id))')
      .eq('id', req.params.lineItemId)
      .single()

    if (!lineItem) { res.status(404).json({ error: 'Line item not found' }); return }
    const catRow = (lineItem as unknown as { budget_categories: { budget_id: string; budgets: { account_id: string } } | Array<{ budget_id: string; budgets: { account_id: string } }> }).budget_categories
    const cat = Array.isArray(catRow) ? catRow[0] : catRow
    if (!cat?.budgets || cat.budgets.account_id !== req.user!.accountId) { res.status(403).json({ error: 'Access denied' }); return }

    const { data: targetCategory } = await supabase
      .from('budget_categories')
      .select('id, budget_id, is_income_category, is_taxes_category, budgets!inner(account_id)')
      .eq('id', target_category_id)
      .single()

    if (!targetCategory) { res.status(404).json({ error: 'Target category not found' }); return }
    const targetBudget = targetCategory.budgets as unknown as { account_id: string } | null
    if (!targetBudget || targetBudget.account_id !== req.user!.accountId) { res.status(403).json({ error: 'Access denied' }); return }
    const sourceBudgetId = cat.budget_id
    if (targetCategory.budget_id !== sourceBudgetId) { res.status(400).json({ error: 'Target category must be in the same budget' }); return }
    if (targetCategory.is_income_category || targetCategory.is_taxes_category) {
      res.status(400).json({ error: 'Cannot move line items into Income or Taxes' })
      return
    }
    if (target_category_id === lineItem.budget_category_id) {
      res.status(400).json({ error: 'Line item is already in that category' })
      return
    }

    const { data, error } = await supabase
      .from('budget_category_line_items')
      .update({ budget_category_id: target_category_id })
      .eq('id', req.params.lineItemId)
      .select('id, name, amount, period')
      .single()

    if (error) { res.status(500).json({ error: 'Failed to move line item' }); return }
    res.json({ lineItem: data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: 'Invalid request', details: err.errors }); return }
    logger.error({ err }, 'Move line item error')
    res.status(500).json({ error: 'Failed to move line item' })
  }
})

export default router
