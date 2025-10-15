import React from 'react'

export function LoadingState({ label = 'Loading data…' }) {
  return (
    <div className="empty-state">
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
        <div className="spinner" />
        <span>{label}</span>
      </div>
    </div>
  )
}

export function ErrorState({ title = 'Something went wrong', description, retry }) {
  return (
    <div className="empty-state" style={{ borderStyle: 'solid', borderColor: 'rgba(248, 113, 113, 0.28)' }}>
      <strong style={{ display: 'block', marginBottom: 6 }}>{title}</strong>
      {description && <p style={{ marginBottom: 12 }}>{description}</p>}
      {retry && (
        <button type="button" className="button button--ghost button--sm" onClick={retry}>
          Retry
        </button>
      )}
    </div>
  )
}
