import { useState } from 'react'
import { useYear } from '../../context/YearContext'
import { budgetService } from '../../services/budgetService'

const MIN_YEAR = 2016
const MAX_YEAR = 2036

function getAvailableYears(): number[] {
  const years: number[] = []
  for (let y = MIN_YEAR; y <= MAX_YEAR; y++) {
    years.push(y)
  }
  return years
}

export function YearSelector() {
  const { selectedYear, setSelectedYear } = useYear()
  const [showAddYear, setShowAddYear] = useState(false)
  const [addYearValue, setAddYearValue] = useState(String(new Date().getFullYear()))
  const [adding, setAdding] = useState(false)

  const years = getAvailableYears()

  const handleAddYear = async () => {
    const y = parseInt(addYearValue, 10)
    if (isNaN(y) || y < MIN_YEAR || y > MAX_YEAR) return
    setAdding(true)
    try {
      await budgetService.createBudget(y)
      setSelectedYear(y)
      setShowAddYear(false)
    } catch {
      // Year may already exist
      setSelectedYear(y)
      setShowAddYear(false)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="year-selector">
      <select
        value={selectedYear}
        onChange={(e) => {
          const val = e.target.value
          if (val === '__add__') {
            setShowAddYear(true)
          } else {
            setSelectedYear(parseInt(val, 10))
          }
        }}
        className="year-select"
        aria-label="Select year"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
        <option value="__add__">+ Add year</option>
      </select>

      {showAddYear && (
        <div className="year-add-popover">
          <label htmlFor="add-year-input" className="form-label">Add year</label>
          <input
            id="add-year-input"
            type="number"
            min={MIN_YEAR}
            max={MAX_YEAR}
            value={addYearValue}
            onChange={(e) => setAddYearValue(e.target.value)}
            className="form-input"
            style={{ width: '100px' }}
          />
          <button onClick={handleAddYear} disabled={adding} className="btn btn-primary btn-sm">
            {adding ? 'Adding...' : 'Add'}
          </button>
          <button onClick={() => setShowAddYear(false)} className="btn btn-ghost btn-sm">
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
