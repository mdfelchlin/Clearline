import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Gift, TrendingUp, Building2, Briefcase, MoreHorizontal, LucideIcon } from 'lucide-react'
import { useYear } from '../../context/YearContext'
import { budgetService } from '../../services/budgetService'
import { IncomeSource, IncomeType, IncomeStatus } from '../../types'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Dropdown } from '../../components/ui/Dropdown'
import { Modal } from '../../components/ui/Modal'
import { Spinner } from '../../components/ui/Spinner'
import { ErrorMessage } from '../../components/ui/ErrorMessage'

const INCOME_TYPE_LABELS: Record<IncomeType, string> = {
  W2: 'W-2 Salary',
  Bonus: 'Bonus',
  RSU: 'RSU',
  ESPP: 'ESPP',
  SelfEmployed: 'Self-Employed',
  Other: 'Other',
}

const INCOME_TYPE_ICONS: Record<IncomeType, LucideIcon> = {
  W2: FileText,
  Bonus: Gift,
  RSU: TrendingUp,
  ESPP: Building2,
  SelfEmployed: Briefcase,
  Other: MoreHorizontal,
}

const INCOME_TYPE_DESCRIPTIONS: Record<IncomeType, string> = {
  W2: 'Regular wages from an employer',
  Bonus: 'Performance or signing bonus',
  RSU: 'Restricted stock unit vesting',
  ESPP: 'Employee stock purchase plan',
  SelfEmployed: 'Freelance or business income',
  Other: 'Any other income source',
}

interface IncomeTypePickerProps {
  onSelect: (type: IncomeType) => void
}

function IncomeTypePicker({ onSelect }: IncomeTypePickerProps) {
  return (
    <div className="income-type-grid">
      {(Object.keys(INCOME_TYPE_LABELS) as IncomeType[]).map((type) => {
        const Icon = INCOME_TYPE_ICONS[type]
        return (
          <button
            key={type}
            type="button"
            className="income-type-tile"
            onClick={() => onSelect(type)}
          >
            <span className="income-type-tile-icon">
              <Icon size={32} strokeWidth={1.5} />
            </span>
            <span className="income-type-tile-label">{INCOME_TYPE_LABELS[type]}</span>
            <span className="income-type-tile-desc">{INCOME_TYPE_DESCRIPTIONS[type]}</span>
          </button>
        )
      })}
    </div>
  )
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
}

interface IncomeFormData {
  type: IncomeType
  description: string
  amount: string
  status: IncomeStatus
}

interface IncomeFormProps {
  initial?: IncomeFormData
  onSubmit: (data: IncomeFormData) => void
  onCancel: () => void
  loading: boolean
}

function IncomeForm({ initial, onSubmit, onCancel, loading }: IncomeFormProps) {
  const [form, setForm] = useState<IncomeFormData>(
    initial ?? { type: 'W2', description: '', amount: '', status: 'Expected' }
  )
  const [errors, setErrors] = useState<Partial<Record<keyof IncomeFormData, string>>>({})

  const validate = (): boolean => {
    const e: typeof errors = {}
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) < 0) {
      e.amount = 'Enter a valid amount (0 or greater)'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Dropdown
        label="Income type"
        required
        value={form.type}
        onChange={(v) => setForm({ ...form, type: v as IncomeType })}
        options={Object.entries(INCOME_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
      />
      <Input
        label="Description (optional)"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        placeholder="e.g. Acme Corp"
      />
      <Input
        label="Annual amount"
        type="number"
        required
        value={form.amount}
        onChange={(e) => setForm({ ...form, amount: e.target.value })}
        placeholder="0"
        min="0"
        step="0.01"
        error={errors.amount}
      />
      <Dropdown
        label="Status"
        value={form.status}
        onChange={(v) => setForm({ ...form, status: v as IncomeStatus })}
        options={[
          { value: 'Expected', label: 'Expected (estimate)' },
          { value: 'Official', label: 'Official (confirmed)' },
        ]}
      />
      <div className="modal-footer">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>Save</Button>
      </div>
    </form>
  )
}

export default function IncomePage() {
  const { selectedYear } = useYear()
  const queryClient = useQueryClient()

  const [modalOpen, setModalOpen] = useState(false)
  const [addStep, setAddStep] = useState<'type-select' | 'form'>('type-select')
  const [selectedType, setSelectedType] = useState<IncomeType>('W2')
  const [editTarget, setEditTarget] = useState<IncomeSource | null>(null)

  const openAddModal = () => {
    setAddStep('type-select')
    setModalOpen(true)
  }

  const handleTypeSelect = (type: IncomeType) => {
    setSelectedType(type)
    setAddStep('form')
  }

  const closeAddModal = () => {
    setModalOpen(false)
    setAddStep('type-select')
    setEditTarget(null)
  }

  const {
    data: income,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['income', selectedYear],
    queryFn: () => budgetService.getIncome(selectedYear),
  })

  const addMutation = useMutation({
    mutationFn: (data: Parameters<typeof budgetService.addIncome>[1]) =>
      budgetService.addIncome(selectedYear, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income', selectedYear] })
      queryClient.invalidateQueries({ queryKey: ['budget-summary', selectedYear] })
      closeAddModal()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof budgetService.updateIncome>[2] }) =>
      budgetService.updateIncome(selectedYear, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income', selectedYear] })
      queryClient.invalidateQueries({ queryKey: ['budget-summary', selectedYear] })
      setEditTarget(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => budgetService.deleteIncome(selectedYear, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income', selectedYear] })
      queryClient.invalidateQueries({ queryKey: ['budget-summary', selectedYear] })
    },
  })

  const handleAdd = (form: IncomeFormData) => {
    addMutation.mutate({
      type: form.type,
      description: form.description || undefined,
      amount: Number(form.amount),
      status: form.status,
    })
  }

  const handleEdit = (form: IncomeFormData) => {
    if (!editTarget) return
    updateMutation.mutate({
      id: editTarget.id,
      data: {
        type: form.type,
        description: form.description || undefined,
        amount: Number(form.amount),
        status: form.status,
      },
    })
  }

  const openEdit = (item: IncomeSource) => {
    setEditTarget(item)
  }

  const openDuplicate = (item: IncomeSource) => {
    setSelectedType(item.type)
    setAddStep('form')
    setEditTarget({ ...item, id: '' })
    setModalOpen(true)
  }

  if (isLoading) return <div className="page"><div className="page-header"><h1 className="page-title">Income</h1></div><div className="loading-container"><Spinner size="lg" /></div></div>
  if (error) return <div className="page"><div className="page-header"><h1 className="page-title">Income</h1></div><ErrorMessage onRetry={refetch} /></div>

  const isEmpty = !income || income.length === 0
  const officialTotal = income?.filter(i => i.status === 'Official').reduce((s, i) => s + i.amount, 0) ?? 0

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Income</h1>
        <Button onClick={openAddModal}>+ Add income</Button>
      </div>

      {addMutation.error && (
        <div className="alert alert-error" role="alert">
          {String(addMutation.error)}
        </div>
      )}

      {isEmpty ? (
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden="true">💵</div>
          <h2 className="empty-state-title">No income for {selectedYear}</h2>
          <p className="empty-state-desc">Add your first income source to get started.</p>
          <Button onClick={openAddModal}>Add your first income source</Button>
        </div>
      ) : (
        <>
          <div className="income-summary">
            <span className="income-summary-label">Official total:</span>
            <span className="income-summary-value">{formatCurrency(officialTotal)}</span>
          </div>
          <div className="income-list">
            {income.map((item) => (
              <div key={item.id} className="income-item">
                <div className="income-item-info">
                  <span className="income-item-type">{INCOME_TYPE_LABELS[item.type]}</span>
                  {item.description && <span className="income-item-desc">{item.description}</span>}
                  <span className={`badge badge-${item.status.toLowerCase()}`}>{item.status}</span>
                </div>
                <div className="income-item-right">
                  <span className="income-item-amount">{formatCurrency(item.amount)}</span>
                  <div className="income-item-actions">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => openEdit(item)}
                      aria-label={`Edit ${item.description ?? item.type}`}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => openDuplicate(item)}
                      aria-label={`Duplicate ${item.description ?? item.type}`}
                    >
                      Duplicate
                    </button>
                    <button
                      className="btn btn-ghost btn-sm btn-danger-ghost"
                      onClick={() => {
                        if (confirm('Delete this income source?')) {
                          deleteMutation.mutate(item.id)
                        }
                      }}
                      aria-label={`Delete ${item.description ?? item.type}`}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={closeAddModal}
        title={addStep === 'type-select' ? 'Add income' : `Add ${INCOME_TYPE_LABELS[selectedType]}`}
        onBack={addStep === 'form' ? () => setAddStep('type-select') : undefined}
      >
        {addStep === 'type-select' ? (
          <IncomeTypePicker onSelect={handleTypeSelect} />
        ) : (
          <IncomeForm
            initial={editTarget?.id === ''
              ? { type: editTarget.type, description: editTarget.description ?? '', amount: String(editTarget.amount), status: editTarget.status }
              : { type: selectedType, description: '', amount: '', status: 'Expected' }
            }
            onSubmit={handleAdd}
            onCancel={closeAddModal}
            loading={addMutation.isPending}
          />
        )}
      </Modal>

      {editTarget && editTarget.id !== '' && (
        <Modal
          isOpen={true}
          onClose={() => setEditTarget(null)}
          title="Edit income"
        >
          <IncomeForm
            initial={{ type: editTarget.type, description: editTarget.description ?? '', amount: String(editTarget.amount), status: editTarget.status }}
            onSubmit={handleEdit}
            onCancel={() => setEditTarget(null)}
            loading={updateMutation.isPending}
          />
        </Modal>
      )}
    </div>
  )
}
