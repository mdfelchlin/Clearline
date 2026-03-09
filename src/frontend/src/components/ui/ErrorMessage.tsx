interface ErrorMessageProps {
  message?: string
  onRetry?: () => void
}

export function ErrorMessage({ message = 'Something went wrong. Please try again.', onRetry }: ErrorMessageProps) {
  return (
    <div className="error-state" role="alert">
      <span className="error-state-icon" aria-hidden="true">⚠️</span>
      <p className="error-state-message">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-secondary btn-sm">
          Try again
        </button>
      )}
    </div>
  )
}
