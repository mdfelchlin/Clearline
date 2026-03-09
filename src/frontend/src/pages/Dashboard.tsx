import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useYear } from '../context/YearContext'
import { budgetService } from '../services/budgetService'
import { taxService } from '../services/taxService'
import { SummaryCard } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { ErrorMessage } from '../components/ui/ErrorMessage'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
}

export default function Dashboard() {
  const { selectedYear } = useYear()

  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ['budget-summary', selectedYear],
    queryFn: () => budgetService.getSummary(selectedYear),
  })

  const {
    data: taxSummary,
    isLoading: taxLoading,
  } = useQuery({
    queryKey: ['tax-summary', selectedYear],
    queryFn: () => taxService.getSummary(selectedYear),
  })

  const isLoading = summaryLoading || taxLoading

  if (isLoading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
        </div>
        <div className="loading-container">
          <Spinner size="lg" />
        </div>
      </div>
    )
  }

  if (summaryError) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
        </div>
        <ErrorMessage onRetry={refetchSummary} />
      </div>
    )
  }

  const isEmpty = !summary?.hasBudget

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
      </div>

      {isEmpty ? (
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden="true">📊</div>
          <h2 className="empty-state-title">No data for {selectedYear}</h2>
          <p className="empty-state-desc">
            Start by adding your income to get a full picture of your financial year.
          </p>
          <div className="empty-state-actions">
            <Link to="/income" className="btn btn-primary">
              Add income
            </Link>
            <Link to="/budget" className="btn btn-secondary">
              Set up budget
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="summary-cards">
            <SummaryCard
              label="Total Income"
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

          {taxSummary && taxSummary.hasOfficialIncome && (
            <div className="dashboard-tax-summary">
              <h2 className="section-title">Tax Overview</h2>
              <p className="tax-summary-info">
                Filing as <strong>{taxSummary.filingStatus.replace(/_/g, ' ')}</strong> in{' '}
                <strong>{taxSummary.state}</strong>.{' '}
                <Link to="/tax">View Tax Preparation →</Link>
              </p>
            </div>
          )}

          {taxSummary && !taxSummary.hasOfficialIncome && (
            <div className="alert alert-info dashboard-tax-nudge">
              Mark income as <strong>Official</strong> on the{' '}
              <Link to="/income">Income page</Link> to see tax estimates.
            </div>
          )}
        </>
      )}
    </div>
  )
}
