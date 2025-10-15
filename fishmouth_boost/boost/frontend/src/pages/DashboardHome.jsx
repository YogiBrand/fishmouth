import React, { useEffect, useState } from 'react';

export default function DashboardHome() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/v1/dashboard/summary');
        const data = await res.json();
        setSummary(data);
      } catch (e) {
        setError('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div>Loading…</div>;
  if (error) return <div>{error}</div>;
  if (!summary) return <div>No data</div>;

  const k = summary.kpis || {};
  return (
    <div className="p-4 space-y-6">
      <section className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {Object.entries(k).map(([key, val]) => (
          <div key={key} className="rounded border p-3">
            <div className="text-xs uppercase opacity-60">{key.replace('_',' ')}</div>
            <div className="text-2xl font-semibold">{val}</div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Funnel</h2>
        <pre className="bg-gray-50 p-3 rounded border text-sm">{JSON.stringify(summary.funnel, null, 2)}</pre>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Activity</h2>
        <ActivityFeed />
      </section>
    </div>
  );
}

function ActivityFeed() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    fetch('/api/v1/activity').then(r => r.json()).then(d => setItems(d.items || []));
  }, []);
  return (
    <ul className="divide-y">
      {items.map((it, idx) => (
        <li key={idx} className="py-2 text-sm">
          <span className="font-mono text-xs opacity-60">{it.at}</span>
          <span className="ml-2">{it.type}</span>
          {it.report_id ? <span className="ml-2 opacity-70">#{it.report_id}</span> : null}
        </li>
      ))}
    </ul>
  );
}
