import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useYear } from '../../context/YearContext'
import { budgetService } from '../../services/budgetService'
import { SummaryCard } from '../../components/ui/Card'
import { Spinner } from '../../components/ui/Spinner'
import { ErrorMessage, getErrorMessage } from '../../components/ui/ErrorMessage'
import BudgetCategories from './BudgetCategories'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
}

export default function Budget() {
  const { selectedYear } = useYear()

  const { data: summary, isLoading: summaryLoading, error: summaryError, refetch: refetchSummary } = useQuery({
    queryKey: ['budget-summary', selectedYear],
    queryFn: () => budgetService.getSummary(selectedYear),
  })

  const { data: categories } = useQuery({
    queryKey: ['categories', selectedYear],
    queryFn: () => budgetService.getCategories(selectedYear),
  })

  const isLoading = summaryLoading
  const error = summaryError
  const refetch = refetchSummary
  const isEmpty = !summary?.hasBudget

  if (isLoading) return <div className="page"><div className="page-header"><h1 className="page-title">Budget</h1></div><div className="loading-container"><Spinner size="lg" /></div></div>
  if (error) return <div className="page"><div className="page-header"><h1 className="page-title">Budget</h1></div><ErrorMessage message={getErrorMessage(error)} onRetry={refetch} /></div>

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Budget</h1>
      </div>

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

      {isEmpty && (
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
      )}

      <BudgetCategories categories={categories ?? undefined} />
    </div>
  )
}
