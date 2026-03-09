import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export interface DropdownOption {
  value: string
  label: string
}

interface DropdownProps {
  label?: string
  error?: string
  required?: boolean
  disabled?: boolean
  options: DropdownOption[]
  value: string
  onChange: (value: string) => void
  id?: string
  'aria-label'?: string
  /** Shown in trigger when value is empty; avoids showing a placeholder option in the list */
  placeholder?: string
}

export function Dropdown({
  label,
  error,
  required,
  disabled,
  options,
  value,
  onChange,
  id: idProp,
  'aria-label': ariaLabel,
  placeholder,
}: DropdownProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const id = idProp ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)
  const selectedOption = options.find((o) => o.value === value)
  const triggerLabel = value ? (selectedOption?.label ?? value) : (placeholder ?? '')

  useEffect(() => {
    if (!open) return
    const handleOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [open])

  const handleSelect = (v: string) => {
    onChange(v)
    setOpen(false)
  }

  return (
    <div className="form-field">
      {label && (
        <label htmlFor={id} className="form-label">
          {label}
          {required && <span className="form-required" aria-hidden="true"> *</span>}
        </label>
      )}
      <div className="dropdown-root" ref={rootRef}>
        <button
          type="button"
          id={id}
          className={`dropdown-trigger ${error ? 'form-input-error' : ''}${!value && placeholder ? ' dropdown-trigger--placeholder' : ''}`}
          onClick={() => !disabled && setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={ariaLabel ?? label ?? 'Choose option'}
          disabled={disabled}
        >
          <span>{triggerLabel}</span>
          <ChevronDown
            size={14}
            strokeWidth={2}
            className={`dropdown-trigger-chevron${open ? ' dropdown-trigger-chevron--open' : ''}`}
          />
        </button>
        {open && (
          <div className="dropdown-panel" role="listbox" aria-label={label ?? 'Options'}>
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={opt.value === value}
                className={`dropdown-option${opt.value === value ? ' dropdown-option--active' : ''}`}
                onClick={() => handleSelect(opt.value)}
              >
                <span>{opt.label}</span>
                {opt.value === value && <Check size={14} strokeWidth={2.5} />}
              </button>
            ))}
          </div>
        )}
      </div>
      {error && (
        <span className="form-error" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
