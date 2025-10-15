import React from 'react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend, CartesianGrid, LineChart, Line } from 'recharts'

export function AreaTrendChart({ data, areas, height = 260 }) {
  return (
    <div className="chart-container" style={{ height }}>
      <ResponsiveContainer>
        <AreaChart data={data}>
          <defs>
            {areas.map((area) => (
              <linearGradient key={area.dataKey} id={`gradient-${area.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={area.color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={area.color} stopOpacity={0.05} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke="rgba(148, 163, 184, 0.12)" vertical={false} />
          <XAxis dataKey="day" stroke="var(--color-text-subtle)" />
          <YAxis stroke="var(--color-text-subtle)" />
          <Tooltip
            contentStyle={{
              background: 'rgba(15, 23, 42, 0.94)',
              borderRadius: 12,
              border: '1px solid rgba(148,163,184,0.18)',
              color: '#f8fafc',
            }}
          />
          <Legend />
          {areas.map((area) => (
            <Area
              key={area.dataKey}
              type="monotone"
              dataKey={area.dataKey}
              stroke={area.color}
              fill={`url(#gradient-${area.dataKey})`}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function MultiLineChart({ data, lines, height = 260 }) {
  return (
    <div className="chart-container" style={{ height }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid stroke="rgba(148, 163, 184, 0.12)" vertical={false} />
          <XAxis dataKey="day" stroke="var(--color-text-subtle)" />
          <YAxis stroke="var(--color-text-subtle)" />
          <Tooltip
            contentStyle={{
              background: 'rgba(15, 23, 42, 0.94)',
              borderRadius: 12,
              border: '1px solid rgba(148,163,184,0.18)',
              color: '#f8fafc',
            }}
          />
          <Legend />
          {lines.map((line) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              stroke={line.color}
              strokeWidth={2.4}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
