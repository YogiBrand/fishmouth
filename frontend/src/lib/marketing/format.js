// marketing/src/lib/marketing/format.js
export const fmt = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

export function pct(n) {
  try { return `${(n * 100).toFixed(0)}%`; } catch { return '—'; }
}
