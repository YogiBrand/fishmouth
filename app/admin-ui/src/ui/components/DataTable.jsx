import React from 'react'

export default function DataTable({ columns, rows, keyField = 'id', renderEmpty, onRowClick }) {
  if (!rows || rows.length === 0) {
    return renderEmpty || <div className="table__empty">No data yet.</div>
  }

  return (
    <table className="table">
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key || col.label}>{col.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => (
          <tr
            key={row[keyField] || idx}
            className={onRowClick ? 'table__row--interactive' : undefined}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          >
            {columns.map((col) => (
              <td
                key={col.key || col.label}
                style={col.align ? { textAlign: col.align } : undefined}
              >
                {col.render ? col.render(row) : row[col.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
