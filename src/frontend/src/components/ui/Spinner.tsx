interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

export function Spinner({ size = 'md', label = 'Loading...' }: SpinnerProps) {
  return (
    <div className={`spinner spinner-${size}`} role="status">
      <span className="sr-only">{label}</span>
    </div>
  )
}

export function LoadingPage() {
  return (
    <div className="loading-page">
      <Spinner size="lg" />
    </div>
  )
}
