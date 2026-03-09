import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useYear } from '../../context/YearContext'
import { budgetService } from '../../services/budgetService'
import { BudgetCategory, LineItem, LinePeriod } from '../../types'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Modal } from '../../components/ui/Modal'
import { Spinner } from '../../components/ui/Spinner'
import { ErrorMessage } from '../../components/ui/ErrorMessage'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
}

function annualAmount(amount: number, period: LinePeriod): number {
  return period === 'Monthly' ? amount * 12 : amount
}

function categoryTotal(cat: BudgetCategory): number {
  return cat.budget_category_line_items.reduce((s, li) => s + annualAmount(li.amount, li.period), 0)
}

interface LineItemFormData {
  name: string
  amount: string
  period: LinePeriod
}

export default function BudgetCategories() {
  const { selectedYear } = useYear()
  const queryClient = useQueryClient()

  const [addCatOpen, setAddCatOpen] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatTaxDeduct, setNewCatTaxDeduct] = useState(false)
  const [addLineItemTarget, setAddLineItemTarget] = useState<BudgetCategory | null>(null)
  const [editLineItemTarget, setEditLineItemTarget] = useState<{ cat: BudgetCategory; item: LineItem } | null>(null)
  const [lineItemForm, setLineItemForm] = useState<LineItemFormData>({ name: '', amount: '', period: 'Annual' })
  const [lineItemErrors, setLineItemErrors] = useState<Partial<LineItemFormData>>({})

  const { data: categories, isLoading, error, refetch } = useQuery({
    queryKey: ['categories', selectedYear],
    queryFn: () => budgetService.getCategories(selectedYear),
  })

  const addCategoryMutation = useMutation({
    mutationFn: (data: Parameters<typeof budgetService.createCategory>[1]) =>
      budgetService.createCategory(selectedYear, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', selectedYear] })
      setAddCatOpen(false)
      setNewCatName('')
    },
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: budgetService.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', selectedYear] })
      queryClient.invalidateQueries({ queryKey: ['budget-summary', selectedYear] })
    },
  })

  const addLineItemMutation = useMutation({
    mutationFn: ({ catId, data }: { catId: string; data: Parameters<typeof budgetService.addLineItem>[2] }) =>
      budgetService.addLineItem(selectedYear, catId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', selectedYear] })
      queryClient.invalidateQueries({ queryKey: ['budget-summary', selectedYear] })
      setAddLineItemTarget(null)
    },
  })

  const updateLineItemMutation = useMutation({
    mutationFn: ({ catId, itemId, data }: { catId: string; itemId: string; data: Parameters<typeof budgetService.updateLineItem>[3] }) =>
      budgetService.updateLineItem(selectedYear, catId, itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', selectedYear] })
      queryClient.invalidateQueries({ queryKey: ['budget-summary', selectedYear] })
      setEditLineItemTarget(null)
    },
  })

  const deleteLineItemMutation = useMutation({
    mutationFn: ({ catId, itemId }: { catId: string; itemId: string }) =>
      budgetService.deleteLineItem(selectedYear, catId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', selectedYear] })
      queryClient.invalidateQueries({ queryKey: ['budget-summary', selectedYear] })
    },
  })

  const validateLineItem = (): boolean => {
    const e: Partial<LineItemFormData> = {}
    if (!lineItemForm.name.trim()) e.name = 'Name is required'
    if (!lineItemForm.amount || isNaN(Number(lineItemForm.amount)) || Number(lineItemForm.amount) < 0) {
      e.amount = 'Enter a valid amount (0 or greater)'
    }
    setLineItemErrors(e)
    return Object.keys(e).length === 0
  }

  const handleAddLineItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateLineItem() || !addLineItemTarget) return
    addLineItemMutation.mutate({
      catId: addLineItemTarget.id,
      data: { name: lineItemForm.name, amount: Number(lineItemForm.amount), period: lineItemForm.period },
    })
  }

  const handleEditLineItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateLineItem() || !editLineItemTarget) return
    updateLineItemMutation.mutate({
      catId: editLineItemTarget.cat.id,
      itemId: editLineItemTarget.item.id,
      data: { name: lineItemForm.name, amount: Number(lineItemForm.amount), period: lineItemForm.period },
    })
  }

  const openAddLineItem = (cat: BudgetCategory) => {
    setLineItemForm({ name: '', amount: '', period: 'Annual' })
    setLineItemErrors({})
    setAddLineItemTarget(cat)
  }

  const openEditLineItem = (cat: BudgetCategory, item: LineItem) => {
    setLineItemForm({ name: item.name, amount: String(item.amount), period: item.period })
    setLineItemErrors({})
    setEditLineItemTarget({ cat, item })
  }

  if (isLoading) return <div className="loading-container"><Spinner size="lg" /></div>
  if (error) return <ErrorMessage onRetry={refetch} />

  const isEmpty = !categories || categories.length === 0

  const incomeCategory = categories?.find((c) => c.is_income_category)
  const taxesCategory = categories?.find((c) => c.is_taxes_category)
  const expenseCategories = categories?.filter((c) => !c.is_income_category && !c.is_taxes_category) ?? []

  const lineItemForm_ = (onSubmit: (e: React.FormEvent) => void, loading: boolean, onCancel: () => void) => (
    <form onSubmit={onSubmit} noValidate>
      <Input
        label="Name"
        required
        value={lineItemForm.name}
        onChange={(e) => setLineItemForm({ ...lineItemForm, name: e.target.value })}
        placeholder="e.g. Rent"
        error={lineItemErrors.name}
      />
      <Input
        label="Amount"
        type="number"
        required
        value={lineItemForm.amount}
        onChange={(e) => setLineItemForm({ ...lineItemForm, amount: e.target.value })}
        placeholder="0"
        min="0"
        step="0.01"
        error={lineItemErrors.amount}
      />
      <Select
        label="Period"
        value={lineItemForm.period}
        onChange={(e) => setLineItemForm({ ...lineItemForm, period: e.target.value as LinePeriod })}
        options={[{ value: 'Annual', label: 'Annual' }, { value: 'Monthly', label: 'Monthly' }]}
      />
      <div className="modal-footer">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>Save</Button>
      </div>
    </form>
  )

  return (
    <div>
      <div className="section-header">
        <h3 className="section-title">Budget Categories</h3>
        <Button variant="secondary" size="sm" onClick={() => setAddCatOpen(true)}>
          + Add category
        </Button>
      </div>

      {isEmpty ? (
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden="true">📂</div>
          <h3 className="empty-state-title">No categories yet</h3>
          <p className="empty-state-desc">Add categories to organize your expenses.</p>
          <Button onClick={() => setAddCatOpen(true)}>Add your first category</Button>
        </div>
      ) : (
        <div className="categories-list">
          {incomeCategory && (
            <div className="category-group category-group-system">
              <div className="category-header">
                <span className="category-name">{incomeCategory.name}</span>
                <span className="badge badge-system">Income (read-only)</span>
                <span className="category-total">{formatCurrency(categoryTotal(incomeCategory))}</span>
              </div>
            </div>
          )}

          {expenseCategories.map((cat) => (
            <div key={cat.id} className="category-group">
              <div className="category-header">
                <span className="category-name">{cat.name}</span>
                {cat.is_tax_deduction && <span className="badge badge-info">Tax deductible</span>}
                <span className="category-total">{formatCurrency(categoryTotal(cat))}</span>
                <div className="category-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => openAddLineItem(cat)}>+ Line item</button>
                  <button
                    className="btn btn-ghost btn-sm btn-danger-ghost"
                    onClick={() => { if (confirm(`Delete "${cat.name}"?`)) deleteCategoryMutation.mutate(cat.id) }}
                    aria-label={`Delete ${cat.name}`}
                  >
                    Delete
                  </button>
                </div>
              </div>
              {cat.budget_category_line_items.length > 0 && (
                <ul className="line-items-list">
                  {cat.budget_category_line_items.map((item) => (
                    <li key={item.id} className="line-item">
                      <span className="line-item-name">{item.name}</span>
                      <span className="line-item-period">{item.period}</span>
                      <span className="line-item-amount">{formatCurrency(item.amount)}</span>
                      <span className="line-item-annual">
                        ({formatCurrency(annualAmount(item.amount, item.period))}/yr)
                      </span>
                      <div className="line-item-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => openEditLineItem(cat, item)}>Edit</button>
                        <button
                          className="btn btn-ghost btn-sm btn-danger-ghost"
                          onClick={() => deleteLineItemMutation.mutate({ catId: cat.id, itemId: item.id })}
                          aria-label={`Delete ${item.name}`}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          {taxesCategory && (
            <div className="category-group category-group-system">
              <div className="category-header">
                <span className="category-name">{taxesCategory.name}</span>
                <span className="badge badge-system">System (from Tax)</span>
              </div>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={addCatOpen} onClose={() => setAddCatOpen(false)} title="Add category">
        <form onSubmit={(e) => { e.preventDefault(); if (newCatName.trim()) addCategoryMutation.mutate({ name: newCatName, is_tax_deduction: newCatTaxDeduct }) }} noValidate>
          <Input
            label="Category name"
            required
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="e.g. Housing"
          />
          <label className="checkbox-label">
            <input type="checkbox" checked={newCatTaxDeduct} onChange={(e) => setNewCatTaxDeduct(e.target.checked)} />
            Tax deductible
          </label>
          <div className="modal-footer">
            <Button type="button" variant="ghost" onClick={() => setAddCatOpen(false)}>Cancel</Button>
            <Button type="submit" loading={addCategoryMutation.isPending}>Add</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!addLineItemTarget}
        onClose={() => setAddLineItemTarget(null)}
        title={`Add line item to "${addLineItemTarget?.name}"`}
      >
        {lineItemForm_(handleAddLineItem, addLineItemMutation.isPending, () => setAddLineItemTarget(null))}
      </Modal>

      <Modal
        isOpen={!!editLineItemTarget}
        onClose={() => setEditLineItemTarget(null)}
        title="Edit line item"
      >
        {lineItemForm_(handleEditLineItem, updateLineItemMutation.isPending, () => setEditLineItemTarget(null))}
      </Modal>
    </div>
  )
}
