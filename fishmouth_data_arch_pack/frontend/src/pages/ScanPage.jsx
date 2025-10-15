import React, { useState } from 'react';
import DrawTool from '../components/Scanner/DrawTool';
import api from '../services/api/client';

export default function ScanPage(){
  const [area, setArea] = useState(null);
  const [name, setName] = useState('My Service Area');
  const [status, setStatus] = useState(null);
  const [scanId, setScanId] = useState(null);

  const startScan = async () => {
    const res = await api.post('/api/v1/scans', {
      name,
      area_geojson: area,
      provider_policy: { imagery: ['bing','google'], caps: { daily: 5 } },
      filters: { min_roof_age: 12 }
    });
    setScanId(res.scan_id);
    setStatus('queued');
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Polygon Scan</h1>
      <div className="rounded border p-4 space-y-3">
        <label className="block">
          <span className="text-sm">Name</span>
          <input className="input" value={name} onChange={e=>setName(e.target.value)} />
        </label>
        <DrawTool onAreaChange={setArea} />
        <button disabled={!area} onClick={startScan} className="btn">Start Scan</button>
        {status && <div className="text-sm">Scan {scanId} — {status}</div>}
      </div>
    </div>
  );
}
