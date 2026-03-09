import { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Gift, TrendingUp, Building2, Briefcase, MoreHorizontal, MoreVertical, LucideIcon, Plus } from 'lucide-react'
import { useYear } from '../../context/YearContext'
import { budgetService } from '../../services/budgetService'
import { IncomeSource, IncomeType, IncomeStatus, Stock } from '../../types'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { CurrencyInput } from '../../components/ui/CurrencyInput'
import { Select } from '../../components/ui/Select'
import { Modal } from '../../components/ui/Modal'
import { Spinner } from '../../components/ui/Spinner'
import { ErrorMessage, getErrorMessage } from '../../components/ui/ErrorMessage'

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

/** Predefined order for sorting income by type. */
const INCOME_TYPE_ORDER: IncomeType[] = ['W2', 'Bonus', 'RSU', 'ESPP', 'SelfEmployed', 'Other']

const FREQUENCY_OPTIONS = [
  { value: '', label: 'Select frequency' },
  { value: 'Annual', label: 'Annual (salaried)' },
  { value: 'Monthly', label: 'Monthly' },
  { value: 'SemiMonthly', label: 'Semi-monthly' },
  { value: 'BiWeekly', label: 'Bi-weekly' },
  { value: 'Weekly', label: 'Weekly' },
]

function getFrequencyMultiplier(frequency: string): number {
  switch (frequency) {
    case 'Annual': return 1
    case 'Monthly': return 12
    case 'SemiMonthly': return 24
    case 'BiWeekly': return 26
    case 'Weekly': return 52
    default: return 0
  }
}

/** Prorate pay within a budget year. If start is Jan 1 and no end (or end is Dec 31), returns 1. */
function getProrateRatio(startDate: string, endDate: string | undefined, year: number): number {
  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : new Date(year, 11, 31)
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year, 11, 31)
  const rangeStart = start < yearStart ? yearStart : start
  const rangeEnd = end > yearEnd ? yearEnd : end
  if (rangeStart > rangeEnd) return 0
  const daysInRange = Math.round((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
  const daysInYear = isLeap(year) ? 366 : 365
  return Math.min(1, Math.max(0, daysInRange / daysInYear))
}

function computeProratedAnnualAmount(
  payAmount: number,
  frequency: string,
  startDate: string,
  endDate: string | undefined,
  year: number
): number {
  const multiplier = getFrequencyMultiplier(frequency)
  if (multiplier <= 0) return 0
  const fullAnnual = payAmount * multiplier
  const ratio = getProrateRatio(startDate, endDate, year)
  return Math.round(fullAnnual * ratio)
}

const BONUS_TYPE_OPTIONS = [
  { value: '', label: 'Select type' },
  { value: 'performance', label: 'Performance' },
  { value: 'signing', label: 'Signing' },
  { value: 'retention', label: 'Retention' },
  { value: 'other', label: 'Other' },
]

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

/** Payload sent to API: common fields + type_specific_data built from form */
export interface IncomeSubmitPayload {
  type: IncomeType
  description?: string
  amount: number
  status: IncomeStatus
  type_specific_data?: Record<string, unknown>
}

/** Form state includes all possible type-specific fields; we build type_specific_data on submit */
interface IncomeFormState {
  type: IncomeType
  description: string
  amount: string
  status: IncomeStatus
  notes: string
  // W2
  pay_amount: string
  frequency: string
  start_date: string
  end_date: string
  // Bonus
  payment_date: string
  bonus_type: string
  // RSU
  stock_id: string
  vesting_date: string
  shares_vested: string
  fmv_per_share: string
  sale_date: string
  sale_price: string
  unvested_shares: string
  expected_vesting_date: string
  // ESPP
  purchase_date: string
  shares: string
  start_price: string
  end_price: string
  discount_percent: string
  // Other
  date: string
  period: string
}

const emptyFormState = (type: IncomeType): IncomeFormState => ({
  type,
  description: '',
  amount: '',
  status: 'Official',
  notes: '',
  pay_amount: '',
  frequency: '',
  start_date: '',
  end_date: '',
  payment_date: '',
  bonus_type: '',
  stock_id: '',
  vesting_date: '',
  shares_vested: '',
  fmv_per_share: '',
  sale_date: '',
  sale_price: '',
  unvested_shares: '',
  expected_vesting_date: '',
  purchase_date: '',
  shares: '',
  start_price: '',
  end_price: '',
  discount_percent: '',
  date: '',
  period: '',
})

function buildTypeSpecificData(type: IncomeType, form: IncomeFormState): Record<string, unknown> | undefined {
  const data: Record<string, unknown> = {}
  switch (type) {
    case 'W2':
      if (form.pay_amount && !isNaN(Number(form.pay_amount))) data.pay_amount = Number(form.pay_amount)
      if (form.frequency) data.frequency = form.frequency
      if (form.start_date) data.start_date = form.start_date
      if (form.end_date) data.end_date = form.end_date
      break
    case 'Bonus':
      if (form.payment_date) data.payment_date = form.payment_date
      if (form.bonus_type) data.bonus_type = form.bonus_type
      break
    case 'RSU':
      if (form.stock_id) data.stock_id = form.stock_id
      if (form.vesting_date) data.vesting_date = form.vesting_date
      if (form.shares_vested && !isNaN(Number(form.shares_vested))) data.shares_vested = Number(form.shares_vested)
      if (form.fmv_per_share && !isNaN(Number(form.fmv_per_share))) data.fmv_per_share = Number(form.fmv_per_share)
      if (form.sale_date) data.sale_date = form.sale_date
      if (form.sale_price && !isNaN(Number(form.sale_price))) data.sale_price = Number(form.sale_price)
      if (form.unvested_shares && !isNaN(Number(form.unvested_shares))) data.unvested_shares = Number(form.unvested_shares)
      if (form.expected_vesting_date) data.expected_vesting_date = form.expected_vesting_date
      break
    case 'ESPP':
      if (form.stock_id) data.stock_id = form.stock_id
      if (form.purchase_date) data.purchase_date = form.purchase_date
      if (form.shares && !isNaN(Number(form.shares))) data.shares = Number(form.shares)
      if (form.start_price && !isNaN(Number(form.start_price))) data.start_price = Number(form.start_price)
      if (form.end_price && !isNaN(Number(form.end_price))) data.end_price = Number(form.end_price)
      if (form.discount_percent && !isNaN(Number(form.discount_percent))) data.discount_percent = Number(form.discount_percent)
      if (form.sale_date) data.sale_date = form.sale_date
      if (form.sale_price && !isNaN(Number(form.sale_price))) data.sale_price = Number(form.sale_price)
      break
    case 'SelfEmployed':
      if (form.frequency) data.frequency = form.frequency
      if (form.pay_amount && !isNaN(Number(form.pay_amount))) data.amount_per_period = Number(form.pay_amount)
      break
    case 'Other':
      if (form.date) data.date = form.date
      if (form.period) data.period = form.period
      break
  }
  return Object.keys(data).length ? data : undefined
}

function formStateFromIncome(source: IncomeSource): IncomeFormState {
  const base = emptyFormState(source.type)
  base.description = source.description ?? ''
  base.amount = String(source.amount)
  base.status = source.status
  const d = source.type_specific_data as Record<string, unknown> | undefined
  if (!d) return base
  if (d.pay_amount != null) base.pay_amount = String(d.pay_amount)
  if (typeof d.frequency === 'string') base.frequency = d.frequency
  if (typeof d.start_date === 'string') base.start_date = d.start_date
  if (typeof d.end_date === 'string') base.end_date = d.end_date
  if (typeof d.payment_date === 'string') base.payment_date = d.payment_date
  if (typeof d.bonus_type === 'string') base.bonus_type = d.bonus_type
  if (typeof d.stock_id === 'string') base.stock_id = d.stock_id
  if (typeof d.vesting_date === 'string') base.vesting_date = d.vesting_date
  if (d.shares_vested != null) base.shares_vested = String(d.shares_vested)
  if (d.fmv_per_share != null) base.fmv_per_share = String(d.fmv_per_share)
  if (typeof d.sale_date === 'string') base.sale_date = d.sale_date
  if (d.sale_price != null) base.sale_price = String(d.sale_price)
  if (d.unvested_shares != null) base.unvested_shares = String(d.unvested_shares)
  if (typeof d.expected_vesting_date === 'string') base.expected_vesting_date = d.expected_vesting_date
  if (typeof d.purchase_date === 'string') base.purchase_date = d.purchase_date
  if (d.shares != null) base.shares = String(d.shares)
  if (d.start_price != null) base.start_price = String(d.start_price)
  if (d.end_price != null) base.end_price = String(d.end_price)
  if (d.discount_percent != null) base.discount_percent = String(d.discount_percent)
  if (typeof d.date === 'string') base.date = d.date
  if (typeof d.period === 'string') base.period = d.period
  if (d.amount_per_period != null) base.pay_amount = String(d.amount_per_period)
  return base
}

interface StockSelectorProps {
  value: string
  onChange: (stockId: string) => void
  stocks: Stock[]
  onStockAdded: (stock: Stock) => void
}

function StockSelector({ value, onChange, stocks, onStockAdded }: StockSelectorProps) {
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [ticker, setTicker] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [addError, setAddError] = useState<string | null>(null)

  const addStockMutation = useMutation({
    mutationFn: ({ t, name }: { t: string; name?: string }) => budgetService.addStock(t, name),
    onSuccess: async (stock) => {
      await queryClient.invalidateQueries({ queryKey: ['stocks'] })
      onStockAdded(stock)
      onChange(stock.id)
      setTicker('')
      setCompanyName('')
      setShowAdd(false)
    },
  })

  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault()
    setAddError(null)
    const t = ticker.trim().toUpperCase()
    if (!t) {
      setAddError('Enter a ticker symbol')
      return
    }
    addStockMutation.mutate({ t, name: companyName.trim() || undefined })
  }

  const displayError = addError ?? (addStockMutation.isError ? String(addStockMutation.error) : null)

  const options = [
    { value: '', label: 'No stock linked' },
    ...stocks.map((s) => ({ value: s.id, label: s.company_name ? `${s.ticker_symbol} – ${s.company_name}` : s.ticker_symbol })),
  ]

  return (
    <div className="form-group">
      <label className="form-label">Stock (for estimates)</label>
      <div className="flex gap-2 items-center flex-wrap">
        <Select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          options={options}
        />
        <Button type="button" variant="secondary" size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus size={14} aria-hidden /> Add by ticker
        </Button>
      </div>
      {showAdd && (
        <form onSubmit={handleAddStock} className="mt-3 p-3 border border-default rounded-md space-y-2">
          <Input
            label="Ticker symbol"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="e.g. AAPL"
            required
          />
          <Input
            label="Company name (optional)"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. Apple Inc."
          />
          {displayError && <p className="text-sm text-error">{displayError}</p>}
          <div className="flex gap-2">
            <Button type="submit" loading={addStockMutation.isPending}>Add stock</Button>
            <Button type="button" variant="ghost" onClick={() => { setShowAdd(false); setAddError(null) }}>Cancel</Button>
          </div>
        </form>
      )}
    </div>
  )
}

interface IncomeFormProps {
  type: IncomeType
  initial: IncomeFormState
  onSubmit: (payload: IncomeSubmitPayload) => void
  onCancel: () => void
  loading: boolean
  selectedYear?: number
  existingW2Employers?: string[]
}

function IncomeForm({ type, initial, onSubmit, onCancel, loading, selectedYear, existingW2Employers }: IncomeFormProps) {
  const [form, setForm] = useState<IncomeFormState>(initial)
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})

  const { data: stocks = [], isLoading: stocksLoading } = useQuery({
    queryKey: ['stocks'],
    queryFn: () => budgetService.getStocks(),
    enabled: type === 'RSU' || type === 'ESPP',
  })

  // When adding W2 and employer matches an existing one, assume promotion and default start to today
  useEffect(() => {
    if (type !== 'W2' || !selectedYear || !existingW2Employers?.length) return
    const employer = form.description.trim()
    if (!employer || !existingW2Employers.includes(employer)) return
    const jan1 = `${selectedYear}-01-01`
    if (form.start_date !== jan1) return
    const today = new Date().toISOString().slice(0, 10)
    setForm((prev) => ({ ...prev, start_date: today }))
  }, [type, selectedYear, existingW2Employers, form.description, form.start_date])

  const validate = (): boolean => {
    const e: Partial<Record<string, string>> = {}
    if (type === 'W2') {
      if (!form.description.trim()) e.description = 'Employer is required'
      const payAmt = form.pay_amount.trim()
      if (!payAmt || isNaN(Number(payAmt)) || Number(payAmt) < 0) e.pay_amount = 'Enter a valid amount'
      if (!form.frequency) e.frequency = 'Select a pay frequency'
      if (!form.start_date) e.start_date = 'Start date is required'
      if (form.end_date && form.start_date && form.end_date < form.start_date) {
        e.end_date = 'End date must be on or after start date'
      }
    } else {
      const amt = form.amount.trim()
      if (!amt || isNaN(Number(amt)) || Number(amt) < 0) {
        e.amount = 'Enter a valid amount (0 or greater)'
      }
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    let amount: number
    const description = form.description.trim() || undefined
    const type_specific_data = buildTypeSpecificData(type, form)
    if (type === 'W2' && selectedYear != null) {
      amount = computeProratedAnnualAmount(
        Number(form.pay_amount) || 0,
        form.frequency,
        form.start_date,
        form.end_date || undefined,
        selectedYear
      )
    } else {
      amount = Number(form.amount) || 0
    }
    onSubmit({
      type: form.type,
      description,
      amount,
      status: form.status,
      type_specific_data,
    })
  }

  const set = (updates: Partial<IncomeFormState>) => setForm((prev) => ({ ...prev, ...updates }))

  return (
    <form onSubmit={handleSubmit} noValidate className="income-form">
      {type === 'W2' ? (
        <>
          <Input
            label="Employer"
            required
            value={form.description}
            onChange={(e) => set({ description: e.target.value })}
            placeholder="e.g. Acme Corp"
            error={errors.description}
          />
          <CurrencyInput
            label="Amount"
            required
            value={form.pay_amount}
            onChange={(v) => set({ pay_amount: v })}
            error={errors.pay_amount}
          />
          <Select
            label="Pay frequency"
            required
            value={form.frequency}
            onChange={(e) => set({ frequency: e.target.value })}
            options={FREQUENCY_OPTIONS}
            error={errors.frequency}
          />
          <Input
            label="Start date"
            type="date"
            required
            value={form.start_date}
            onChange={(e) => set({ start_date: e.target.value })}
            error={errors.start_date}
          />
          <Input
            label="End date (optional)"
            type="date"
            value={form.end_date}
            onChange={(e) => set({ end_date: e.target.value })}
            error={errors.end_date}
          />
        </>
      ) : (
        <>
          <CurrencyInput
            label="Annual amount"
            required
            value={form.amount}
            onChange={(v) => set({ amount: v })}
            error={errors.amount}
          />
          {(type === 'RSU' || type === 'SelfEmployed' || type === 'Other') && (
            <Input
              label={type === 'RSU' ? 'Company name' : 'Description'}
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
              placeholder={type === 'RSU' ? 'e.g. Employer' : 'e.g. Consulting'}
            />
          )}
        </>
      )}

      {type === 'Bonus' && (
        <>
          <Input label="Payment date" type="date" value={form.payment_date} onChange={(e) => set({ payment_date: e.target.value })} />
          <Select label="Bonus type" value={form.bonus_type} onChange={(e) => set({ bonus_type: e.target.value })} options={BONUS_TYPE_OPTIONS} />
        </>
      )}

      {(type === 'RSU' || type === 'ESPP') && (
        <>
          {stocksLoading ? (
            <div className="form-group"><Spinner size="sm" /></div>
          ) : (
            <StockSelector
              value={form.stock_id}
              onChange={(id) => set({ stock_id: id })}
              stocks={stocks}
              onStockAdded={() => {}}
            />
          )}
        </>
      )}

      {type === 'RSU' && (
        <>
          <Input label="Vesting date" type="date" value={form.vesting_date} onChange={(e) => set({ vesting_date: e.target.value })} />
          <Input label="Shares vested" type="number" min="0" step="1" value={form.shares_vested} onChange={(e) => set({ shares_vested: e.target.value })} />
          <CurrencyInput label="FMV per share at vesting" value={form.fmv_per_share} onChange={(v) => set({ fmv_per_share: v })} />
          <Input label="Sale date (optional)" type="date" value={form.sale_date} onChange={(e) => set({ sale_date: e.target.value })} />
          <CurrencyInput label="Sale price (optional)" value={form.sale_price} onChange={(v) => set({ sale_price: v })} />
        </>
      )}

      {type === 'ESPP' && (
        <>
          <Input label="Purchase date" type="date" value={form.purchase_date} onChange={(e) => set({ purchase_date: e.target.value })} />
          <Input label="Number of shares" type="number" min="0" step="1" value={form.shares} onChange={(e) => set({ shares: e.target.value })} />
          <CurrencyInput label="Start price (offering start)" value={form.start_price} onChange={(v) => set({ start_price: v })} />
          <CurrencyInput label="End price (at purchase)" value={form.end_price} onChange={(v) => set({ end_price: v })} />
          <Input label="Discount %" type="number" min="0" max="100" step="0.01" value={form.discount_percent} onChange={(e) => set({ discount_percent: e.target.value })} placeholder="e.g. 15" />
          <Input label="Sale date (optional)" type="date" value={form.sale_date} onChange={(e) => set({ sale_date: e.target.value })} />
          <CurrencyInput label="Sale price (optional)" value={form.sale_price} onChange={(v) => set({ sale_price: v })} />
        </>
      )}

      {type === 'Other' && (
        <>
          <Input label="Date (optional)" type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} />
          <Input label="Period (optional)" value={form.period} onChange={(e) => set({ period: e.target.value })} placeholder="e.g. Q1 2024" />
        </>
      )}

      <Input label="Notes (optional)" value={form.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="e.g. Q4 bonus" />
      <Select
        label="Status"
        value={form.status}
        onChange={(e) => set({ status: e.target.value as IncomeStatus })}
        options={[
          { value: 'Official', label: 'Actual' },
          { value: 'Expected', label: 'Estimated (e.g. unknown bonus)' },
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
  const [deleteTarget, setDeleteTarget] = useState<IncomeSource | null>(null)
  const [openIncomeMenuId, setOpenIncomeMenuId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null)
  const incomeMenuTriggerRef = useRef<HTMLButtonElement>(null)
  const incomeMenuPortalRef = useRef<HTMLDivElement>(null)

  const { data: stocks = [] } = useQuery({
    queryKey: ['stocks'],
    queryFn: () => budgetService.getStocks(),
  })

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

  const existingW2Employers = useMemo(
    () => income?.filter((i) => i.type === 'W2' && i.description).map((i) => i.description!.trim()) ?? [],
    [income]
  )

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
      setDeleteTarget(null)
    },
  })

  const handleAdd = (payload: IncomeSubmitPayload) => {
    addMutation.mutate({
      type: payload.type,
      description: payload.description,
      amount: payload.amount,
      status: payload.status,
      type_specific_data: payload.type_specific_data,
    })
  }

  const handleEdit = (payload: IncomeSubmitPayload) => {
    if (!editTarget) return
    updateMutation.mutate({
      id: editTarget.id,
      data: {
        type: payload.type,
        description: payload.description,
        amount: payload.amount,
        status: payload.status,
        type_specific_data: payload.type_specific_data,
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

  const getTickerForStockId = (stockId: string): string | null => {
    const stock = stocks.find((s) => s.id === stockId)
    return stock?.ticker_symbol ?? null
  }

  useLayoutEffect(() => {
    if (!openIncomeMenuId || !incomeMenuTriggerRef.current) {
      setMenuPosition(null)
      return
    }
    const rect = incomeMenuTriggerRef.current.getBoundingClientRect()
    setMenuPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
  }, [openIncomeMenuId])

  useEffect(() => {
    if (!openIncomeMenuId) return
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        incomeMenuTriggerRef.current?.contains(target) ||
        incomeMenuPortalRef.current?.contains(target)
      ) return
      setOpenIncomeMenuId(null)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [openIncomeMenuId])

  if (isLoading) return <div className="page"><div className="page-header"><h1 className="page-title">Income</h1></div><div className="loading-container"><Spinner size="lg" /></div></div>
  if (error) return <div className="page"><div className="page-header"><h1 className="page-title">Income</h1></div><ErrorMessage message={getErrorMessage(error)} onRetry={refetch} /></div>

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
          <div className="income-summary-card" aria-label={`Income total for ${selectedYear}`}>
            <span className="income-summary-card-label">Total</span>
            <span className="income-summary-card-value">{formatCurrency(officialTotal)}</span>
            <span className="income-summary-card-meta">Income for {selectedYear}</span>
          </div>
          <div className="income-list">
            {[...(income ?? [])]
              .sort((a, b) => INCOME_TYPE_ORDER.indexOf(a.type) - INCOME_TYPE_ORDER.indexOf(b.type))
              .map((item) => {
                const ticker = (item.type === 'RSU' || item.type === 'ESPP') && item.type_specific_data?.stock_id
                  ? getTickerForStockId(String(item.type_specific_data.stock_id))
                  : null
                return (
                  <div key={item.id} className="income-item">
                    <div className="income-item-info">
                      <span className="income-item-type">{INCOME_TYPE_LABELS[item.type]}</span>
                      {item.description && <span className="income-item-desc">{item.description}</span>}
                      {ticker && <span className="income-item-ticker">Linked: {ticker}</span>}
                      {item.status === 'Expected' && <span className="badge badge-expected">Estimated</span>}
                    </div>
                    <div className="income-item-right">
                      <span className="income-item-amount">{formatCurrency(item.amount)}</span>
                      <div className="income-item-actions income-item-actions--menu">
                        <button
                          ref={openIncomeMenuId === item.id ? incomeMenuTriggerRef : undefined}
                          type="button"
                          className="btn btn-ghost btn-sm btn-icon"
                          onClick={() => setOpenIncomeMenuId((id) => (id === item.id ? null : item.id))}
                          aria-label={`Actions for ${item.description ?? INCOME_TYPE_LABELS[item.type]}`}
                          aria-expanded={openIncomeMenuId === item.id}
                          aria-haspopup="menu"
                        >
                          <MoreVertical size={16} strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
          {openIncomeMenuId &&
            menuPosition &&
            (() => {
              const menuItem = income?.find((i) => i.id === openIncomeMenuId)
              if (!menuItem) return null
              return createPortal(
                <div
                  ref={incomeMenuPortalRef}
                  className="line-item-menu line-item-menu--portal"
                  role="menu"
                  style={{
                    position: 'fixed',
                    top: menuPosition.top,
                    right: menuPosition.right,
                    left: 'auto',
                  }}
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="line-item-menu-item"
                    onClick={() => {
                      openEdit(menuItem)
                      setOpenIncomeMenuId(null)
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="line-item-menu-item"
                    onClick={() => {
                      openDuplicate(menuItem)
                      setOpenIncomeMenuId(null)
                    }}
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="line-item-menu-item line-item-menu-item--danger"
                    onClick={() => {
                      setDeleteTarget(menuItem)
                      setOpenIncomeMenuId(null)
                    }}
                  >
                    Delete
                  </button>
                </div>,
                document.body
              )
            })()}
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
            type={selectedType}
            initial={
              editTarget?.id === ''
                ? formStateFromIncome(editTarget)
                : selectedType === 'W2'
                  ? { ...emptyFormState(selectedType), start_date: `${selectedYear}-01-01` }
                  : emptyFormState(selectedType)
            }
            onSubmit={handleAdd}
            onCancel={closeAddModal}
            loading={addMutation.isPending}
            selectedYear={selectedYear}
            existingW2Employers={existingW2Employers}
          />
        )}
      </Modal>

      {editTarget && editTarget.id !== '' && (() => {
        const editInitial = formStateFromIncome(editTarget)
        if (editTarget.type === 'W2' && !editInitial.start_date && selectedYear) {
          editInitial.start_date = `${selectedYear}-01-01`
        }
        // Exclude this record's employer so we don't treat "edit" as "promotion" and overwrite start_date with today
        const otherW2Employers = editTarget.type === 'W2' && editTarget.description?.trim()
          ? existingW2Employers.filter((e) => e !== editTarget.description!.trim())
          : existingW2Employers
        return (
          <Modal
            isOpen={true}
            onClose={() => setEditTarget(null)}
            title="Edit income"
          >
            <IncomeForm
              type={editTarget.type}
              initial={editInitial}
              onSubmit={handleEdit}
              onCancel={() => setEditTarget(null)}
              loading={updateMutation.isPending}
              selectedYear={selectedYear}
              existingW2Employers={otherW2Employers}
            />
          </Modal>
        )
      })()}

      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Remove income source?"
        footer={
          <div className="modal-footer">
            <Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              type="button"
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Remove
            </Button>
          </div>
        }
      >
        <p style={{ color: 'var(--color-text-secondary)' }}>
          {deleteTarget
            ? `Remove ${deleteTarget.description || INCOME_TYPE_LABELS[deleteTarget.type]}? This cannot be undone.`
            : ''}
        </p>
      </Modal>
    </div>
  )
}
