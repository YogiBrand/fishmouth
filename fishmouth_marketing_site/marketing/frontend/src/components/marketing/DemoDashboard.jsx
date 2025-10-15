import React, { useEffect, useState } from 'react';

export default function DemoDashboard() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch('/api/v1/dashboard/summary', { method: 'GET' });
        if (!cancelled) setSummary(await r.json());
      } catch {
        if (!cancelled) {
          setSummary({
            kpis: { hot_leads: 28, warm_leads: 76, reports_sent: 12, report_views: 25, replies: 9, appointments: 4 },
            funnel: { sent: 12, viewed: 25, replied: 9, booked: 4, median_step_times: { sent_to_viewed: "1.6h" } },
            usage: { period: "7d", leads_qualified: 102, credits_balance: 90 },
            errors_24h: 0
          });
        }
      }
    }
    load();
    return () => { cancelled = true; }
  }, []);

  const k = summary?.kpis || {};

  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold mb-4">Live product demo</h2>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {Object.entries(k).map(([key, val]) => (
            <div key={key} className="rounded border p-3 bg-white">
              <div className="text-xs uppercase opacity-60">{key.replace('_',' ')}</div>
              <div className="text-2xl font-semibold">{val}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
