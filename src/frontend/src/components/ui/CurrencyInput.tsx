import React, { useState, useCallback } from 'react'

function formatForDisplay(raw: string): string {
  if (raw === '' || raw === '.') return ''
  const n = parseFloat(raw)
  if (Number.isNaN(n)) return ''
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function parseInput(input: string): string {
  const stripped = input.replace(/,/g, '')
  if (stripped === '') return ''
  const parts = stripped.split('.')
  if (parts.length > 2) return parts[0] + '.' + parts.slice(1).join('')
  if (parts.length === 2 && parts[1].length > 2) return parts[0] + '.' + parts[1].slice(0, 2)
  if (/^\d*\.?\d*$/.test(stripped)) return stripped
  return stripped.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1')
}

interface CurrencyInputProps {
  label?: string
  error?: string
  required?: boolean
  disabled?: boolean
  value: string
  onChange: (value: string) => void
  id?: string
  placeholder?: string
}

export function CurrencyInput({
  label,
  error,
  required,
  disabled,
  value,
  onChange,
  id: idProp,
  placeholder = '0.00',
}: CurrencyInputProps) {
  const [focused, setFocused] = useState(false)
  const inputId = idProp ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)
  const displayValue = focused ? value : formatForDisplay(value)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = parseInput(e.target.value)
      onChange(parsed)
    },
    [onChange]
  )

  return (
    <div className="form-field">
      {label && (
        <label htmlFor={inputId} className={`form-label${disabled ? ' form-label--disabled' : ''}`}>
          {label}
          {required && <span className="form-required" aria-hidden="true"> *</span>}
        </label>
      )}
      <div className="form-input-wrapper">
        <div className="form-input-prefix">$</div>
        <input
          type="text"
          inputMode="decimal"
          id={inputId}
          value={displayValue}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`form-input ${error ? 'form-input-error' : ''} form-input-has-prefix`}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
        />
      </div>
      {error && (
        <span id={`${inputId}-error`} className="form-error" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
