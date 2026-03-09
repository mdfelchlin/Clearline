import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useYear } from '../../context/YearContext'
import { taxService } from '../../services/taxService'
import { budgetService } from '../../services/budgetService'
import { TaxDeduction, FilingStatus } from '../../types'
import { SummaryCard } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Modal } from '../../components/ui/Modal'
import { Spinner } from '../../components/ui/Spinner'
import { ErrorMessage } from '../../components/ui/ErrorMessage'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
}

const FILING_STATUS_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'married_filing_jointly', label: 'Married Filing Jointly' },
  { value: 'married_filing_separately', label: 'Married Filing Separately' },
  { value: 'head_of_household', label: 'Head of Household' },
]

export default function TaxDashboard() {
  const { selectedYear } = useYear()
  const queryClient = useQueryClient()

  const [addDeductionOpen, setAddDeductionOpen] = useState(false)
  const [editDeduction, setEditDeduction] = useState<TaxDeduction | null>(null)
  const [deductionForm, setDeductionForm] = useState({ name: '', item_type: 'deduction' as 'deduction' | 'credit', amount: '', description: '' })
  const [deductionErrors, setDeductionErrors] = useState<{ name?: string; amount?: string }>({})

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['tax-profile', selectedYear],
    queryFn: () => taxService.getProfile(selectedYear),
  })

  const { data: calculation, isLoading: calcLoading, refetch: refetchCalc } = useQuery({
    queryKey: ['tax-calculation', selectedYear],
    queryFn: () => taxService.calculate(selectedYear),
  })

  const { data: deductions } = useQuery({
    queryKey: ['tax-deductions', selectedYear],
    queryFn: () => taxService.getDeductions(selectedYear),
  })

  const { data: income } = useQuery({
    queryKey: ['income', selectedYear],
    queryFn: () => budgetService.getIncome(selectedYear),
  })

  const updateProfileMutation = useMutation({
    mutationFn: (data: Parameters<typeof taxService.updateProfile>[1]) =>
      taxService.updateProfile(selectedYear, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-profile', selectedYear] })
      queryClient.invalidateQueries({ queryKey: ['tax-calculation', selectedYear] })
    },
  })

  const addDeductionMutation = useMutation({
    mutationFn: (data: Parameters<typeof taxService.addTaxOnlyDeduction>[1]) =>
      taxService.addTaxOnlyDeduction(selectedYear, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-deductions', selectedYear] })
      queryClient.invalidateQueries({ queryKey: ['tax-calculation', selectedYear] })
      setAddDeductionOpen(false)
    },
  })

  const updateDeductionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof taxService.updateTaxOnlyDeduction>[2] }) =>
      taxService.updateTaxOnlyDeduction(selectedYear, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-deductions', selectedYear] })
      queryClient.invalidateQueries({ queryKey: ['tax-calculation', selectedYear] })
      setEditDeduction(null)
    },
  })

  const deleteDeductionMutation = useMutation({
    mutationFn: (id: string) => taxService.deleteTaxOnlyDeduction(selectedYear, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-deductions', selectedYear] })
      queryClient.invalidateQueries({ queryKey: ['tax-calculation', selectedYear] })
    },
  })

  const validateDeduction = (): boolean => {
    const e: { name?: string; amount?: string } = {}
    if (!deductionForm.name.trim()) e.name = 'Name is required'
    if (!deductionForm.amount || isNaN(Number(deductionForm.amount)) || Number(deductionForm.amount) < 0) {
      e.amount = 'Enter a valid amount'
    }
    setDeductionErrors(e)
    return Object.keys(e).length === 0
  }

  const handleAddDeduction = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateDeduction()) return
    addDeductionMutation.mutate({
      name: deductionForm.name,
      item_type: deductionForm.item_type,
      amount: Number(deductionForm.amount),
      description: deductionForm.description || undefined,
    })
  }

  const handleEditDeduction = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateDeduction() || !editDeduction) return
    updateDeductionMutation.mutate({
      id: editDeduction.id,
      data: {
        name: deductionForm.name,
        item_type: deductionForm.item_type,
        amount: Number(deductionForm.amount),
        description: deductionForm.description || undefined,
      },
    })
  }

  const openEditDeduction = (d: TaxDeduction) => {
    setDeductionForm({ name: d.name, item_type: d.item_type, amount: String(d.amount), description: d.description ?? '' })
    setDeductionErrors({})
    setEditDeduction(d)
  }

  const openAddDeduction = () => {
    setDeductionForm({ name: '', item_type: 'deduction', amount: '', description: '' })
    setDeductionErrors({})
    setAddDeductionOpen(true)
  }

  const isLoading = profileLoading || calcLoading
  const officialIncome = income?.filter((i) => i.status === 'Official') ?? []
  const hasOfficialIncome = officialIncome.length > 0

  if (isLoading) {
    return <div className="page"><div className="page-header"><h1 className="page-title">Tax Preparation</h1></div><div className="loading-container"><Spinner size="lg" /></div></div>
  }

  const isEmpty = !hasOfficialIncome || !profile

  const deductionFormContent = (onSubmit: (e: React.FormEvent) => void, loading: boolean, onCancel: () => void) => (
    <form onSubmit={onSubmit} noValidate>
      <Input label="Name" required value={deductionForm.name} onChange={(e) => setDeductionForm({ ...deductionForm, name: e.target.value })} error={deductionErrors.name} />
      <Select
        label="Type"
        value={deductionForm.item_type}
        onChange={(e) => setDeductionForm({ ...deductionForm, item_type: e.target.value as 'deduction' | 'credit' })}
        options={[{ value: 'deduction', label: 'Deduction' }, { value: 'credit', label: 'Credit' }]}
      />
      <Input label="Amount" type="number" required value={deductionForm.amount} onChange={(e) => setDeductionForm({ ...deductionForm, amount: e.target.value })} min="0" step="0.01" error={deductionErrors.amount} />
      <Input label="Description (optional)" value={deductionForm.description} onChange={(e) => setDeductionForm({ ...deductionForm, description: e.target.value })} />
      <div className="modal-footer">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>Save</Button>
      </div>
    </form>
  )

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Tax Preparation — {selectedYear}</h1>
      </div>

      {isEmpty && (
        <div className="alert alert-info">
          {!hasOfficialIncome ? (
            <>No Official income for {selectedYear}. <Link to="/income">Mark income as Official</Link> to see tax estimates.</>
          ) : (
            <>Set your tax profile below to calculate your estimated tax bill.</>
          )}
        </div>
      )}

      {/* Income (read-only) */}
      <section className="tax-section" aria-labelledby="tax-income-title">
        <div className="section-header">
          <h2 id="tax-income-title" className="section-title">Income</h2>
          <Link to="/income" className="btn btn-ghost btn-sm">Edit income →</Link>
        </div>
        {officialIncome.length === 0 ? (
          <p className="text-muted">No Official income for {selectedYear}. <Link to="/income">Add income</Link></p>
        ) : (
          <table className="data-table" aria-label="Income sources">
            <thead>
              <tr>
                <th scope="col">Type</th>
                <th scope="col">Description</th>
                <th scope="col" className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {officialIncome.map((item) => (
                <tr key={item.id}>
                  <td>{item.type}</td>
                  <td>{item.description ?? '—'}</td>
                  <td className="text-right">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
              <tr className="table-total">
                <td colSpan={2}><strong>Total</strong></td>
                <td className="text-right"><strong>{formatCurrency(officialIncome.reduce((s, i) => s + i.amount, 0))}</strong></td>
              </tr>
            </tbody>
          </table>
        )}
      </section>

      {/* Deductions */}
      <section className="tax-section" aria-labelledby="tax-deductions-title">
        <div className="section-header">
          <h2 id="tax-deductions-title" className="section-title">Deductions</h2>
          <Button variant="secondary" size="sm" onClick={openAddDeduction}>+ Add deduction/credit</Button>
        </div>

        {deductions?.budgetDerived && deductions.budgetDerived.length > 0 && (
          <div className="deductions-group">
            <h3 className="deductions-group-title">From budget (read-only)</h3>
            <ul className="deductions-list">
              {deductions.budgetDerived.map((d, i) => (
                <li key={i} className="deduction-item">
                  <span>{d.name} <span className="text-muted">({d.source})</span></span>
                  <span>{formatCurrency(d.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {deductions?.taxOnly && deductions.taxOnly.length > 0 && (
          <div className="deductions-group">
            <h3 className="deductions-group-title">Tax-only deductions &amp; credits</h3>
            <ul className="deductions-list">
              {deductions.taxOnly.map((d) => (
                <li key={d.id} className="deduction-item">
                  <span>
                    {d.name}
                    <span className={`badge badge-${d.item_type}`}>{d.item_type}</span>
                  </span>
                  <span className="deduction-item-actions">
                    {formatCurrency(d.amount)}
                    <button className="btn btn-ghost btn-sm" onClick={() => openEditDeduction(d)}>Edit</button>
                    <button
                      className="btn btn-ghost btn-sm btn-danger-ghost"
                      onClick={() => { if (confirm('Delete deduction?')) deleteDeductionMutation.mutate(d.id) }}
                      aria-label={`Delete ${d.name}`}
                    >
                      Delete
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Tax Settings */}
      <section className="tax-section" aria-labelledby="tax-settings-title">
        <h2 id="tax-settings-title" className="section-title">Tax Settings</h2>
        {profile && (
          <div className="tax-settings-form">
            <Select
              label="Filing status"
              value={profile.filing_status}
              onChange={(e) => updateProfileMutation.mutate({ filing_status: e.target.value as FilingStatus })}
              options={FILING_STATUS_OPTIONS}
            />
            <Select
              label="State"
              value={profile.state_code}
              onChange={(e) => updateProfileMutation.mutate({ state_code: e.target.value })}
              options={[{ value: 'WA', label: 'Washington (WA)' }]}
            />
            <Input
              label="Dependents"
              type="number"
              min="0"
              value={profile.dependents}
              onChange={(e) => updateProfileMutation.mutate({ dependents: parseInt(e.target.value, 10) || 0 })}
            />
            <Input
              label="Pre-tax deductions (401k, HSA, etc.)"
              type="number"
              min="0"
              step="0.01"
              value={profile.pre_tax_deductions}
              onChange={(e) => updateProfileMutation.mutate({ pre_tax_deductions: parseFloat(e.target.value) || 0 })}
            />
            <Input
              label="YTD withholding"
              type="number"
              min="0"
              step="0.01"
              value={profile.ytd_withholding}
              onChange={(e) => updateProfileMutation.mutate({ ytd_withholding: parseFloat(e.target.value) || 0 })}
            />
          </div>
        )}
      </section>

      {/* Estimated Tax */}
      <section className="tax-section" aria-labelledby="tax-estimate-title">
        <div className="section-header">
          <h2 id="tax-estimate-title" className="section-title">Estimated Tax Bill</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => refetchCalc()} aria-label="Recalculate">
            ↻ Recalculate
          </button>
        </div>

        {calculation ? (
          <div className="tax-results">
            <div className="summary-cards">
              <SummaryCard label="Gross Income" value={formatCurrency(calculation.grossIncome)} />
              <SummaryCard label="Federal Tax" value={formatCurrency(calculation.federalTax)} />
              <SummaryCard label="FICA Tax" value={formatCurrency(calculation.ficaTax)} />
              <SummaryCard
                label="Estimated Balance"
                value={formatCurrency(calculation.estimatedBalance)}
                variant={calculation.estimatedBalance > 0 ? 'negative' : 'positive'}
              />
            </div>
            <div className="tax-details">
              <div className="tax-detail-row">
                <span>Adjusted Gross Income</span><span>{formatCurrency(calculation.adjustedGrossIncome)}</span>
              </div>
              <div className="tax-detail-row">
                <span>{calculation.useItemized ? 'Itemized' : 'Standard'} Deduction</span>
                <span>{formatCurrency(calculation.deductionUsed)}</span>
              </div>
              <div className="tax-detail-row">
                <span>Taxable Income</span><span>{formatCurrency(calculation.taxableIncome)}</span>
              </div>
              <div className="tax-detail-row">
                <span>Effective Rate</span><span>{calculation.effectiveRate.toFixed(1)}%</span>
              </div>
              <div className="tax-detail-row">
                <span>Marginal Rate</span><span>{calculation.marginalRate}%</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <p>Add Official income to see estimated taxes.</p>
          </div>
        )}
      </section>

      <Modal isOpen={addDeductionOpen} onClose={() => setAddDeductionOpen(false)} title="Add deduction or credit">
        {deductionFormContent(handleAddDeduction, addDeductionMutation.isPending, () => setAddDeductionOpen(false))}
      </Modal>

      <Modal isOpen={!!editDeduction} onClose={() => setEditDeduction(null)} title="Edit deduction or credit">
        {deductionFormContent(handleEditDeduction, updateDeductionMutation.isPending, () => setEditDeduction(null))}
      </Modal>
    </div>
  )
}
