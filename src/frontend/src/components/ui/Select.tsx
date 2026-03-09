import React from 'react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: SelectOption[]
}

export function Select({ label, error, options, id, className = '', ...props }: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="form-field">
      {label && (
        <label htmlFor={selectId} className="form-label">
          {label}
          {props.required && <span className="form-required" aria-hidden="true"> *</span>}
        </label>
      )}
      <select
        {...props}
        id={selectId}
        className={`form-select ${error ? 'form-input-error' : ''} ${className}`}
        aria-invalid={!!error}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <span className="form-error" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
