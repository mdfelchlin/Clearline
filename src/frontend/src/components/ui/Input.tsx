import React from 'react'

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string
  error?: string
  hint?: string
  prefix?: React.ReactNode
  suffix?: React.ReactNode
}

export function Input({ label, error, hint, prefix, suffix, id, className = '', ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  const hasWrapper = prefix ?? suffix

  return (
    <div className="form-field">
      {label && (
        <label htmlFor={inputId} className={`form-label${props.disabled ? ' form-label--disabled' : ''}`}>
          {label}
          {props.required && <span className="form-required" aria-hidden="true"> *</span>}
        </label>
      )}
      <div className={hasWrapper ? 'form-input-wrapper' : undefined}>
        {prefix && <div className="form-input-prefix">{prefix}</div>}
        <input
          {...props}
          id={inputId}
          className={`form-input ${error ? 'form-input-error' : ''} ${prefix ? 'form-input-has-prefix' : ''} ${suffix ? 'form-input-has-suffix' : ''} ${className}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        />
        {suffix && <div className="form-input-suffix">{suffix}</div>}
      </div>
      {error && (
        <span id={`${inputId}-error`} className="form-error" role="alert">
          {error}
        </span>
      )}
      {hint && !error && (
        <span id={`${inputId}-hint`} className="form-hint">
          {hint}
        </span>
      )}
    </div>
  )
}
