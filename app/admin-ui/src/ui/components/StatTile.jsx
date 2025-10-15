import React from 'react'

export default function StatTile({ label, value, delta, deltaLabel, positive = true, icon: Icon, secondary }) {
  return (
    <div className="stat-tile">
      <div className="stat-tile__label">{label}</div>
      <div className="stat-tile__value">
        {Icon && <Icon size={24} style={{ marginRight: 8 }} />}
        {value}
      </div>
      {(delta || deltaLabel) && (
        <div className={`stat-tile__delta ${positive ? 'delta-up' : 'delta-down'}`}>
          <span>{deltaLabel || delta}</span>
        </div>
      )}
      {secondary && <div className="card__meta">{secondary}</div>}
    </div>
  )
}
