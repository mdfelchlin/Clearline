import { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, MoreVertical } from 'lucide-react'
import { useYear } from '../../context/YearContext'
import { budgetService } from '../../services/budgetService'
import { BudgetCategory, LineItem, LinePeriod } from '../../types'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { CurrencyInput } from '../../components/ui/CurrencyInput'
import { Select } from '../../components/ui/Select'
import { Modal } from '../../components/ui/Modal'
import { Spinner } from '../../components/ui/Spinner'
import { ErrorMessage, getErrorMessage } from '../../components/ui/ErrorMessage'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
}

function annualAmount(amount: number, period: LinePeriod): number {
  return period === 'Monthly' ? amount * 12 : amount
}

function categoryTotal(cat: BudgetCategory): number {
  return cat.budget_category_line_items.reduce((s, li) => s + annualAmount(li.amount, li.period), 0)
}

function findLineItemContext(
  lineItemId: string,
  categories: BudgetCategory[]
): { cat: BudgetCategory; item: LineItem } | null {
  for (const c of categories) {
    const item = c.budget_category_line_items.find((li) => li.id === lineItemId)
    if (item) return { cat: c, item }
  }
  return null
}

interface LineItemFormData {
  name: string
  amount: string
  period: LinePeriod
}

interface BudgetCategoriesProps {
  categories?: BudgetCategory[] | null
}

export default function BudgetCategories({ categories: categoriesProp }: BudgetCategoriesProps) {
  const { selectedYear } = useYear()
  const queryClient = useQueryClient()
  const collapsedInitialized = useRef(false)

  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [addCatOpen, setAddCatOpen] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatTaxDeduct, setNewCatTaxDeduct] = useState(false)
  const [addLineItemTarget, setAddLineItemTarget] = useState<BudgetCategory | null>(null)
  const [editLineItemTarget, setEditLineItemTarget] = useState<{ cat: BudgetCategory; item: LineItem } | null>(null)
  const [moveLineItemTarget, setMoveLineItemTarget] = useState<{ cat: BudgetCategory; item: LineItem } | null>(null)
  const [moveTargetCategoryId, setMoveTargetCategoryId] = useState('')
  const [renameCategoryTarget, setRenameCategoryTarget] = useState<BudgetCategory | null>(null)
  const [renameCategoryName, setRenameCategoryName] = useState('')
  const [lineItemForm, setLineItemForm] = useState<LineItemFormData>({ name: '', amount: '', period: 'Annual' })
  const [lineItemErrors, setLineItemErrors] = useState<Partial<LineItemFormData>>({})
  const [openLineItemMenuId, setOpenLineItemMenuId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null)
  const lineItemMenuTriggerRef = useRef<HTMLButtonElement>(null)
  const lineItemMenuPortalRef = useRef<HTMLDivElement>(null)
  const [openCategoryMenuId, setOpenCategoryMenuId] = useState<string | null>(null)
  const [categoryMenuPosition, setCategoryMenuPosition] = useState<{ top: number; right: number } | null>(null)
  const categoryMenuTriggerRef = useRef<HTMLButtonElement>(null)
  const categoryMenuPortalRef = useRef<HTMLDivElement>(null)

  const toggleCategory = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const categoriesQuery = useQuery({
    queryKey: ['categories', selectedYear],
    queryFn: () => budgetService.getCategories(selectedYear),
    enabled: categoriesProp === undefined,
  })
  const categories = categoriesProp ?? categoriesQuery.data
  const isLoading = categoriesProp === undefined && categoriesQuery.isLoading
  const error = categoriesProp === undefined ? categoriesQuery.error : null
  const refetch = categoriesQuery.refetch

  useEffect(() => {
    if (!categories?.length || collapsedInitialized.current) return
    const expenseIds = categories.filter((c) => !c.is_income_category && !c.is_taxes_category).map((c) => c.id)
    if (expenseIds.length === 0) return
    collapsedInitialized.current = true
    setCollapsedIds(new Set(expenseIds))
  }, [categories])

  useLayoutEffect(() => {
    if (!openLineItemMenuId || !lineItemMenuTriggerRef.current) {
      setMenuPosition(null)
      return
    }
    const rect = lineItemMenuTriggerRef.current.getBoundingClientRect()
    setMenuPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
  }, [openLineItemMenuId])

  useLayoutEffect(() => {
    if (!openCategoryMenuId || !categoryMenuTriggerRef.current) {
      setCategoryMenuPosition(null)
      return
    }
    const rect = categoryMenuTriggerRef.current.getBoundingClientRect()
    setCategoryMenuPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
  }, [openCategoryMenuId])

  useEffect(() => {
    if (!openLineItemMenuId) return
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        lineItemMenuTriggerRef.current?.contains(target) ||
        lineItemMenuPortalRef.current?.contains(target)
      ) return
      setOpenLineItemMenuId(null)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [openLineItemMenuId])

  useEffect(() => {
    if (!openCategoryMenuId) return
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        categoryMenuTriggerRef.current?.contains(target) ||
        categoryMenuPortalRef.current?.contains(target)
      ) return
      setOpenCategoryMenuId(null)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [openCategoryMenuId])

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

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => budgetService.updateCategory(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', selectedYear] })
      setRenameCategoryTarget(null)
      setRenameCategoryName('')
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

  const moveLineItemMutation = useMutation({
    mutationFn: ({ lineItemId, targetCategoryId }: { lineItemId: string; targetCategoryId: string }) =>
      budgetService.moveLineItem(selectedYear, lineItemId, targetCategoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', selectedYear] })
      queryClient.invalidateQueries({ queryKey: ['budget-summary', selectedYear] })
      setMoveLineItemTarget(null)
      setMoveTargetCategoryId('')
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
  if (error) return <ErrorMessage message={getErrorMessage(error)} onRetry={refetch} />

  const isEmpty = !categories || categories.length === 0

  const incomeCategory = categories?.find((c) => c.is_income_category)
  const taxesCategory = categories?.find((c) => c.is_taxes_category)
  const expenseCategories = categories?.filter((c) => !c.is_income_category && !c.is_taxes_category) ?? []

  const openLineItemContext =
    openLineItemMenuId && expenseCategories.length > 0
      ? findLineItemContext(openLineItemMenuId, expenseCategories)
      : null

  const openCategoryContext = openCategoryMenuId != null ? expenseCategories.find((c) => c.id === openCategoryMenuId) ?? null : null

  const renderLineItemFormFields = (
    onSubmit: (e: React.FormEvent) => void,
    loading: boolean,
    onCancel: () => void
  ): React.ReactElement => (
    <form onSubmit={onSubmit} noValidate>
        <Input
          label="Name"
          required
          value={lineItemForm.name}
          onChange={(e) => setLineItemForm({ ...lineItemForm, name: e.target.value })}
          placeholder="e.g. Rent"
          error={lineItemErrors.name}
        />
        <CurrencyInput
          label="Amount"
          required
          value={lineItemForm.amount}
          onChange={(v) => setLineItemForm({ ...lineItemForm, amount: v })}
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

          {expenseCategories.map((cat) => {
            const isCollapsed = collapsedIds.has(cat.id)
            return (
              <div key={cat.id} className={`category-group${isCollapsed ? ' category-group--collapsed' : ''}`}>
                <div
                  className="category-header category-header--clickable"
                  onClick={() => toggleCategory(cat.id)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={!isCollapsed}
                  aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${cat.name}`}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCategory(cat.id) } }}
                >
                  <span className="category-header-chevron" aria-hidden>
                    {isCollapsed ? <ChevronRight size={18} strokeWidth={2} /> : <ChevronDown size={18} strokeWidth={2} />}
                  </span>
                  <span className="category-name">{cat.name}</span>
                  {cat.is_tax_deduction && <span className="badge badge-info">Tax deductible</span>}
                  <span className="category-total">{formatCurrency(categoryTotal(cat))}</span>
                  <div className="category-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openAddLineItem(cat)}>+ Line item</button>
                    <button
                      ref={openCategoryMenuId === cat.id ? categoryMenuTriggerRef : undefined}
                      type="button"
                      className="btn btn-ghost btn-sm btn-icon"
                      onClick={() => setOpenCategoryMenuId((id) => (id === cat.id ? null : cat.id))}
                      aria-label={`Actions for ${cat.name}`}
                      aria-expanded={openCategoryMenuId === cat.id}
                      aria-haspopup="menu"
                    >
                      <MoreVertical size={16} strokeWidth={2} />
                    </button>
                  </div>
                </div>
                {cat.budget_category_line_items.length > 0 && (
                  <div className="category-content">
                    <ul className="line-items-list">
                      {cat.budget_category_line_items.map((item) => (
                        <li key={item.id} className="line-item">
                          <span className="line-item-name">{item.name}</span>
                          <span className="line-item-period">{item.period}</span>
                          <span className="line-item-amount">{formatCurrency(item.amount)}</span>
                          <span className="line-item-annual">
                            ({formatCurrency(annualAmount(item.amount, item.period))}/yr)
                          </span>
                          <div className="line-item-actions line-item-actions--menu">
                            <button
                              ref={openLineItemMenuId === item.id ? lineItemMenuTriggerRef : undefined}
                              type="button"
                              className="btn btn-ghost btn-sm btn-icon"
                              onClick={() => setOpenLineItemMenuId((id) => (id === item.id ? null : item.id))}
                              aria-label={`Actions for ${item.name}`}
                              aria-expanded={openLineItemMenuId === item.id}
                              aria-haspopup="menu"
                            >
                              <MoreVertical size={16} strokeWidth={2} />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          })}

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

      {openCategoryContext &&
        categoryMenuPosition &&
        createPortal(
          <div
            ref={categoryMenuPortalRef}
            className="line-item-menu line-item-menu--portal"
            role="menu"
            style={{
              position: 'fixed',
              top: categoryMenuPosition.top,
              right: categoryMenuPosition.right,
              left: 'auto',
            }}
          >
            <button
              type="button"
              role="menuitem"
              className="line-item-menu-item"
              onClick={() => {
                setRenameCategoryTarget(openCategoryContext)
                setRenameCategoryName(openCategoryContext.name)
                setOpenCategoryMenuId(null)
              }}
            >
              Rename
            </button>
            <button
              type="button"
              role="menuitem"
              className="line-item-menu-item line-item-menu-item--danger"
              onClick={() => {
                if (confirm(`Delete "${openCategoryContext.name}"?`)) deleteCategoryMutation.mutate(openCategoryContext.id)
                setOpenCategoryMenuId(null)
              }}
            >
              Delete
            </button>
          </div>,
          document.body
        )}

      {openLineItemContext &&
        menuPosition &&
        createPortal(
          <div
            ref={lineItemMenuPortalRef}
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
                openEditLineItem(openLineItemContext.cat, openLineItemContext.item)
                setOpenLineItemMenuId(null)
              }}
            >
              Edit
            </button>
            <button
              type="button"
              role="menuitem"
              className="line-item-menu-item"
              onClick={() => {
                setMoveLineItemTarget({ cat: openLineItemContext.cat, item: openLineItemContext.item })
                setMoveTargetCategoryId('')
                setOpenLineItemMenuId(null)
              }}
            >
              Move
            </button>
            <button
              type="button"
              role="menuitem"
              className="line-item-menu-item line-item-menu-item--danger"
              onClick={() => {
                deleteLineItemMutation.mutate({ catId: openLineItemContext.cat.id, itemId: openLineItemContext.item.id })
                setOpenLineItemMenuId(null)
              }}
            >
              Delete
            </button>
          </div>,
          document.body
        )}

      <Modal
        isOpen={!!renameCategoryTarget}
        onClose={() => { setRenameCategoryTarget(null); setRenameCategoryName('') }}
        title="Rename category"
      >
        {renameCategoryTarget && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const name = renameCategoryName.trim()
              if (name) updateCategoryMutation.mutate({ id: renameCategoryTarget.id, name })
            }}
            noValidate
          >
            <Input
              label="Category name"
              required
              value={renameCategoryName}
              onChange={(e) => setRenameCategoryName(e.target.value)}
              placeholder="e.g. Housing"
              autoFocus
            />
            <div className="modal-footer">
              <Button type="button" variant="ghost" onClick={() => { setRenameCategoryTarget(null); setRenameCategoryName('') }}>Cancel</Button>
              <Button type="submit" loading={updateCategoryMutation.isPending} disabled={!renameCategoryName.trim()}>
                Save
              </Button>
            </div>
          </form>
        )}
      </Modal>

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
        {renderLineItemFormFields(handleAddLineItem, addLineItemMutation.isPending, () => setAddLineItemTarget(null))}
      </Modal>

      <Modal
        isOpen={!!editLineItemTarget}
        onClose={() => setEditLineItemTarget(null)}
        title="Edit line item"
      >
        {renderLineItemFormFields(handleEditLineItem, updateLineItemMutation.isPending, () => setEditLineItemTarget(null))}
      </Modal>

      <Modal
        isOpen={!!moveLineItemTarget}
        onClose={() => { setMoveLineItemTarget(null); setMoveTargetCategoryId('') }}
        title="Move line item"
      >
        {moveLineItemTarget && (
          <>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 16 }}>
              Move &quot;{moveLineItemTarget.item.name}&quot; from {moveLineItemTarget.cat.name} to:
            </p>
            <Select
              label="Category"
              placeholder="Select a category"
              value={moveTargetCategoryId}
              onChange={(e) => setMoveTargetCategoryId(e.target.value)}
              options={expenseCategories
                .filter((c) => c.id !== moveLineItemTarget.cat.id)
                .map((c) => ({ value: c.id, label: c.name }))}
            />
            <div className="modal-footer">
              <Button type="button" variant="ghost" onClick={() => { setMoveLineItemTarget(null); setMoveTargetCategoryId('') }}>Cancel</Button>
              <Button
                type="button"
                disabled={!moveTargetCategoryId}
                loading={moveLineItemMutation.isPending}
                onClick={() => moveTargetCategoryId && moveLineItemMutation.mutate({ lineItemId: moveLineItemTarget.item.id, targetCategoryId: moveTargetCategoryId })}
              >
                Move
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
