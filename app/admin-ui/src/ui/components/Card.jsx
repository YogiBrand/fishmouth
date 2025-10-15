import React from 'react'

export default function Card({ title, meta, actions, footer, accent = false, children }) {
  return (
    <section className={`card${accent ? ' card--accent' : ''}`}>
      {(title || actions || meta) && (
        <header className="card__header">
          <div>
            {title && <h3 className="card__title">{title}</h3>}
            {meta && <p className="card__meta">{meta}</p>}
          </div>
          {actions && <div className="page-actions">{actions}</div>}
        </header>
      )}
      <div className="card__body">{children}</div>
      {footer && <footer className="card__footer">{footer}</footer>}
    </section>
  )
}
