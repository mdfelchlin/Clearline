import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  title?: string
  action?: React.ReactNode
}

export function Card({ children, className = '', title, action }: CardProps) {
  return (
    <div className={`card ${className}`}>
      {(title || action) && (
        <div className="card-header">
          {title && <h3 className="card-title">{title}</h3>}
          {action && <div className="card-action">{action}</div>}
        </div>
      )}
      <div className="card-body">{children}</div>
    </div>
  )
}

interface SummaryCardProps {
  label: string
  value: string
  variant?: 'default' | 'positive' | 'negative' | 'warning'
}

export function SummaryCard({ label, value, variant = 'default' }: SummaryCardProps) {
  return (
    <div className={`summary-card summary-card-${variant}`}>
      <span className="summary-card-label">{label}</span>
      <span className="summary-card-value">{value}</span>
    </div>
  )
}
