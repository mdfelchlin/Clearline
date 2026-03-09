import React from 'react'
import { Dropdown } from './Dropdown'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string
  error?: string
  options: SelectOption[]
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
}

/**
 * Shared dropdown that matches the budget year selector style (trigger + panel).
 * Uses a custom dropdown list instead of the native select menu.
 */
export function Select({
  label,
  error,
  options,
  value = '',
  onChange,
  id,
  className,
  required,
  disabled,
  ...rest
}: SelectProps) {
  const selectId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  return (
    <Dropdown
      label={label}
      error={error}
      required={required}
      disabled={disabled}
      options={options}
      value={String(value ?? '')}
      onChange={(v) =>
        onChange?.({ target: { value: v } } as React.ChangeEvent<HTMLSelectElement>)
      }
      id={selectId}
      aria-label={rest['aria-label']}
    />
  )
}
