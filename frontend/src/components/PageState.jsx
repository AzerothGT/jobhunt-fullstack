export function LoadingState({ label = 'Memuat data…' }) {
  return <div className="state-panel" role="status"><span className="spinner" aria-hidden="true" /><p>{label}</p></div>
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="state-panel state-error" role="alert">
      <span className="eyebrow">ADA GANGGUAN</span>
      <p>{message || 'Data belum dapat dimuat.'}</p>
      {onRetry && <button className="text-button" type="button" onClick={onRetry}>Coba lagi <span aria-hidden="true">↗</span></button>}
    </div>
  )
}

export function EmptyState({ title = 'Belum ada data', children }) {
  return (
    <div className="state-panel state-empty">
      <span className="empty-mark" aria-hidden="true">∅</span>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
    </div>
  )
}
