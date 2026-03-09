import { api } from './api'
import { IncomeSource, BudgetCategory, BudgetSummary, LineItem, Stock, IncomeType, IncomeStatus, LinePeriod } from '../types'

export const budgetService = {
  async getBudget(year: number) {
    return api.get<{ budget: { id: string; year: number } }>(`/budgets/${year}`)
  },

  async createBudget(year: number) {
    return api.post<{ budget: { id: string; year: number } }>('/budgets', { year })
  },

  async getSummary(year: number): Promise<BudgetSummary> {
    return api.get<BudgetSummary>(`/budgets/${year}/summary`)
  },

  async getIncome(year: number): Promise<IncomeSource[]> {
    const data = await api.get<{ income: IncomeSource[] }>(`/budgets/${year}/income`)
    return data.income
  },

  async addIncome(year: number, income: {
    type: IncomeType
    description?: string
    amount: number
    status?: IncomeStatus
    type_specific_data?: Record<string, unknown>
  }): Promise<IncomeSource> {
    const data = await api.post<{ income: IncomeSource }>(`/budgets/${year}/income`, income)
    return data.income
  },

  async updateIncome(year: number, id: string, income: Partial<{
    type: IncomeType
    description: string
    amount: number
    status: IncomeStatus
    type_specific_data: Record<string, unknown>
  }>): Promise<IncomeSource> {
    const data = await api.put<{ income: IncomeSource }>(`/budgets/${year}/income/${id}`, income)
    return data.income
  },

  async deleteIncome(year: number, id: string): Promise<void> {
    await api.delete(`/budgets/${year}/income/${id}`)
  },

  async getCategories(year: number): Promise<BudgetCategory[]> {
    const data = await api.get<{ categories: BudgetCategory[] }>(`/budgets/${year}/categories`)
    return data.categories
  },

  async createCategory(year: number, category: {
    name: string
    is_tax_deduction?: boolean
    sort_order?: number
  }): Promise<BudgetCategory> {
    const data = await api.post<{ category: BudgetCategory }>(`/budgets/${year}/categories`, category)
    return data.category
  },

  async updateCategory(id: string, updates: Partial<{
    name: string
    is_tax_deduction: boolean
  }>): Promise<BudgetCategory> {
    const data = await api.put<{ category: BudgetCategory }>(`/budgets/categories/${id}`, updates)
    return data.category
  },

  async reorderCategories(year: number, items: Array<{ id: string; sort_order: number }>): Promise<void> {
    await api.patch(`/budgets/${year}/categories/reorder`, items)
  },

  async deleteCategory(id: string): Promise<void> {
    await api.delete(`/budgets/categories/${id}`)
  },

  async getLineItems(year: number, categoryId: string): Promise<LineItem[]> {
    const data = await api.get<{ lineItems: LineItem[] }>(`/budgets/${year}/categories/${categoryId}/line-items`)
    return data.lineItems
  },

  async addLineItem(year: number, categoryId: string, item: {
    name: string
    amount: number
    period: LinePeriod
  }): Promise<LineItem> {
    const data = await api.post<{ lineItem: LineItem }>(`/budgets/${year}/categories/${categoryId}/line-items`, item)
    return data.lineItem
  },

  async updateLineItem(year: number, categoryId: string, lineItemId: string, updates: Partial<{
    name: string
    amount: number
    period: LinePeriod
  }>): Promise<LineItem> {
    const data = await api.put<{ lineItem: LineItem }>(`/budgets/${year}/categories/${categoryId}/line-items/${lineItemId}`, updates)
    return data.lineItem
  },

  async deleteLineItem(year: number, categoryId: string, lineItemId: string): Promise<void> {
    await api.delete(`/budgets/${year}/categories/${categoryId}/line-items/${lineItemId}`)
  },

  async getStocks(): Promise<Stock[]> {
    const data = await api.get<{ stocks: Stock[] }>('/stocks')
    return data.stocks
  },

  async addStock(ticker: string, companyName?: string): Promise<Stock> {
    const data = await api.post<{ stock: Stock }>('/stocks', { ticker_symbol: ticker, company_name: companyName })
    return data.stock
  },

  async getStockPrice(id: string): Promise<{ ticker: string; price: number | null }> {
    return api.get(`/stocks/${id}/price`)
  },
}
