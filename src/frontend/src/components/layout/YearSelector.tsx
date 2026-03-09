import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Plus, Check } from 'lucide-react'
import { useYear } from '../../context/YearContext'
import { budgetService } from '../../services/budgetService'

const CURRENT_YEAR = new Date().getFullYear()
const MIN_YEAR = 2010
const MAX_YEAR = 2040

function loadActiveYears(): number[] {
  try {
    const stored = localStorage.getItem('active-years')
    if (stored) {
      const parsed = JSON.parse(stored) as number[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.sort((a, b) => b - a)
    }
  } catch { /* ignore */ }
  return [CURRENT_YEAR]
}

function saveActiveYears(years: number[]) {
  try { localStorage.setItem('active-years', JSON.stringify(years)) } catch { /* ignore */ }
}

export function YearSelector() {
  const { selectedYear, setSelectedYear } = useYear()
  const [open, setOpen] = useState(false)
  const [activeYears, setActiveYears] = useState<number[]>(loadActiveYears)
  const [showAddInput, setShowAddInput] = useState(false)
  const [addYearValue, setAddYearValue] = useState(String(CURRENT_YEAR))
  const [adding, setAdding] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const addInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!activeYears.includes(selectedYear)) {
      const updated = [...activeYears, selectedYear].sort((a, b) => b - a)
      setActiveYears(updated)
      saveActiveYears(updated)
    }
  }, [selectedYear, activeYears])

  useEffect(() => {
    if (showAddInput) addInputRef.current?.focus()
  }, [showAddInput])

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setShowAddInput(false)
      }
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); setShowAddInput(false) }
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [])

  const handleSelectYear = (y: number) => {
    setSelectedYear(y)
    setOpen(false)
  }

  const handleAddYear = async () => {
    const y = parseInt(addYearValue, 10)
    if (isNaN(y) || y < MIN_YEAR || y > MAX_YEAR) return
    setAdding(true)
    try {
      await budgetService.createBudget(y)
    } catch { /* may already exist */ } finally {
      const updated = [...new Set([...activeYears, y])].sort((a, b) => b - a)
      setActiveYears(updated)
      saveActiveYears(updated)
      setSelectedYear(y)
      setShowAddInput(false)
      setOpen(false)
      setAdding(false)
    }
  }

  return (
    <div className="year-selector" ref={containerRef}>
      <button
        type="button"
        className="year-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select year"
      >
        <span className="year-trigger-label">{selectedYear}</span>
        <ChevronDown size={14} strokeWidth={2} className={`year-trigger-chevron${open ? ' year-trigger-chevron--open' : ''}`} />
      </button>

      {open && (
        <div className="year-dropdown" role="listbox" aria-label="Available years">
          {activeYears.map((y) => (
            <button
              key={y}
              type="button"
              role="option"
              aria-selected={y === selectedYear}
              className={`year-option${y === selectedYear ? ' year-option--active' : ''}`}
              onClick={() => handleSelectYear(y)}
            >
              <span>{y}</span>
              {y === selectedYear && <Check size={14} strokeWidth={2.5} />}
            </button>
          ))}

          <div className="year-dropdown-divider" />

          {showAddInput ? (
            <div className="year-add-row">
              <input
                ref={addInputRef}
                type="number"
                min={MIN_YEAR}
                max={MAX_YEAR}
                value={addYearValue}
                onChange={(e) => setAddYearValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddYear() }}
                className="year-add-input"
                aria-label="Year to add"
              />
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleAddYear}
                disabled={adding}
              >
                {adding ? '…' : 'Add'}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowAddInput(false)}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="year-option year-option--add"
              onClick={() => { setAddYearValue(String(CURRENT_YEAR)); setShowAddInput(true) }}
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>Add year</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
