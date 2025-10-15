import React from 'react';

const defaultLabel = (key) =>
  key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const cardClass = (isDark) =>
  `rounded-2xl border px-4 py-3 transition-colors ${
    isDark ? 'border-slate-800 bg-slate-900/70 text-slate-100' : 'border-gray-200 bg-white text-gray-900'
  }`;

const labelClass = (isDark) => (isDark ? 'text-slate-400 text-xs uppercase tracking-wide' : 'text-gray-500 text-xs uppercase tracking-wide');

const valueClass = (isDark) => (isDark ? 'text-2xl font-semibold text-white' : 'text-2xl font-semibold text-gray-900');

const periodClass = (isDark) => (isDark ? 'text-slate-500 text-xs' : 'text-gray-400 text-xs');

function formatValue(value) {
  if (value == null) return '0';
  if (typeof value === 'number') {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return value.toLocaleString();
  }
  return String(value);
}

export default function DashboardKpiRow({ kpiConfig = [], kpiData = {}, isDark = false }) {
  const entries = kpiConfig.map((key) => ({ key, data: kpiData[key] || { value: 0, label: defaultLabel(key) } }));
  if (!entries.length) {
    return null;
  }

  return (
    <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {entries.map(({ key, data }) => (
        <div key={key} className={cardClass(isDark)}>
          <div className={labelClass(isDark)}>{data.label || defaultLabel(key)}</div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={valueClass(isDark)}>{formatValue(data.value)}</span>
            {data.period ? <span className={periodClass(isDark)}>{data.period}</span> : null}
          </div>
        </div>
      ))}
    </section>
  );
}

