import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  suffix?: React.ReactNode
}

export function Input({ label, error, hint, suffix, id, className = '', ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="form-field">
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label}
          {props.required && <span className="form-required" aria-hidden="true"> *</span>}
        </label>
      )}
      <div className={suffix ? 'form-input-wrapper' : undefined}>
        <input
          {...props}
          id={inputId}
          className={`form-input ${error ? 'form-input-error' : ''} ${suffix ? 'form-input-has-suffix' : ''} ${className}`}
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
