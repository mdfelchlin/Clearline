import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useYear } from '../../context/YearContext'
import { budgetService } from '../../services/budgetService'
import { SummaryCard } from '../../components/ui/Card'
import { Spinner } from '../../components/ui/Spinner'
import { ErrorMessage } from '../../components/ui/ErrorMessage'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
}

function formatPercent(n: number, total: number): string {
  if (total === 0) return '0%'
  return `${Math.round((n / total) * 100)}%`
}

export default function BudgetOverview() {
  const { selectedYear } = useYear()

  const { data: summary, isLoading, error, refetch } = useQuery({
    queryKey: ['budget-summary', selectedYear],
    queryFn: () => budgetService.getSummary(selectedYear),
  })

  const { data: categories } = useQuery({
    queryKey: ['categories', selectedYear],
    queryFn: () => budgetService.getCategories(selectedYear),
  })

  if (isLoading) return <div className="loading-container"><Spinner size="lg" /></div>
  if (error) return <ErrorMessage onRetry={refetch} />

  const isEmpty = !summary?.hasBudget

  const expenseCategories = categories?.filter(
    (c) => !c.is_income_category && !c.is_taxes_category
  ) ?? []

  return (
    <div>
      <div className="summary-cards">
        <SummaryCard
          label="Total Income (Official)"
          value={formatCurrency(summary?.totalIncome ?? 0)}
          variant="positive"
        />
        <SummaryCard
          label="Total Expenses"
          value={formatCurrency(summary?.totalExpenses ?? 0)}
          variant="default"
        />
        <SummaryCard
          label="Amount Left Over"
          value={formatCurrency(summary?.amountLeftOver ?? 0)}
          variant={(summary?.amountLeftOver ?? 0) >= 0 ? 'positive' : 'negative'}
        />
      </div>

      {isEmpty ? (
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden="true">💰</div>
          <h2 className="empty-state-title">No budget data for {selectedYear}</h2>
          <p className="empty-state-desc">
            Add income and budget categories to see your overview.
          </p>
          <div className="empty-state-actions">
            <Link to="/income" className="btn btn-primary">Add income</Link>
          </div>
        </div>
      ) : (
        <>
          {expenseCategories.length > 0 && (
            <div className="expense-breakdown">
              <h3 className="section-title">Expenses by category</h3>
              <div className="expense-chart">
                {expenseCategories.map((cat) => {
                  const catTotal = cat.budget_category_line_items.reduce((sum, li) => {
                    return sum + (li.period === 'Monthly' ? li.amount * 12 : li.amount)
                  }, 0)
                  const pct = formatPercent(catTotal, summary?.totalExpenses ?? 0)

                  return (
                    <div key={cat.id} className="expense-chart-row">
                      <span className="expense-chart-label">{cat.name}</span>
                      <div className="expense-chart-bar-container" aria-hidden="true">
                        <div
                          className="expense-chart-bar"
                          style={{ width: pct }}
                        />
                      </div>
                      <span className="expense-chart-value">{formatCurrency(catTotal)}</span>
                      <span className="expense-chart-pct">({pct})</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
