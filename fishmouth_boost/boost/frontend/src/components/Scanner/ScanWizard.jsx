import React, { useState } from 'react';

export default function ScanWizard() {
  const [areaType, setAreaType] = useState('zip'); // zip|city|county|polygon
  const [query, setQuery] = useState('');
  const [budget, setBudget] = useState(5);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState([]);

  async function runScan() {
    setRunning(true);
    try {
      // Stub: call your backend scan_jobs endpoint
      await new Promise(r => setTimeout(r, 800));
      setResults([{ address: '123 Main St', priority: 88, confidence: 'High', reasons: ['Age', 'Granule loss'] }]);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="block">
          <div className="text-sm">Area type</div>
          <select className="border rounded w-full p-2" value={areaType} onChange={e => setAreaType(e.target.value)}>
            <option value="zip">ZIP</option>
            <option value="city">City</option>
            <option value="county">County</option>
            <option value="polygon">Draw polygon</option>
          </select>
        </label>
        <label className="block">
          <div className="text-sm">Query</div>
          <input className="border rounded w-full p-2" value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g., 78704" />
        </label>
        <label className="block">
          <div className="text-sm">Budget (USD)</div>
          <input className="border rounded w-full p-2" type="number" value={budget} onChange={e => setBudget(Number(e.target.value))} />
        </label>
      </div>
      <div>
        <button className="px-3 py-2 border rounded" disabled={running} onClick={runScan}>{running ? 'Scanning…' : 'Run scan'}</button>
      </div>
      <div className="grid gap-2">
        {results.map((r, i) => (
          <div key={i} className="border rounded p-3">
            <div className="font-semibold">{r.address}</div>
            <div className="text-sm">Priority: {r.priority} • Confidence: {r.confidence} • Reasons: {r.reasons.join(', ')}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
