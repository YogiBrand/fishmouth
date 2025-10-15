import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DrawTool from '../components/Scanner/DrawTool';
import api from '../services/api/client';
import { leadAPI } from '../services/api';
import ScannerActivityTable, { buildScannerRows } from '../components/ScannerActivityTable';

const DEFAULT_POLICY = {
  order: ['naip', 'mapbox', 'google'],
  zoom: 18,
  qualityThreshold: 0.45,
  dailyCaps: { mapbox: 5000, google: 10000 },
};

export default function ScanPage() {
  const [areaFeature, setAreaFeature] = useState(null);
  const [name, setName] = useState('Service Region');
  const [scan, setScan] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [scanSummaries, setScanSummaries] = useState([]);
  const [clusterSummaries, setClusterSummaries] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);

  const canSubmit = useMemo(() => Boolean(areaFeature && areaFeature.geometry), [areaFeature]);

  const refreshScannerData = useCallback(async () => {
    setTableLoading(true);
    const extractArray = (payload, explicitKeys = []) => {
      if (!payload) return [];
      if (Array.isArray(payload)) return payload;
      const candidates = [...explicitKeys, 'items', 'data', 'results', 'records', 'list', 'scans', 'clusters'];
      for (const key of candidates) {
        const value = payload?.[key];
        if (Array.isArray(value)) {
          return value;
        }
      }
      return [];
    };

    try {
      const [scanPayload, clusterPayload] = await Promise.all([
        leadAPI.getScans(),
        leadAPI.getHeatClusters(),
      ]);
      setScanSummaries(extractArray(scanPayload, ['scans']));
      setClusterSummaries(extractArray(clusterPayload, ['clusters']));
    } catch (err) {
      console.error('scan:history fetch failed', err);
    } finally {
      setTableLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshScannerData();
  }, [refreshScannerData]);

  const startScan = async () => {
    if (!canSubmit) {
      return;
    }
    setError(null);
    try {
      const payload = {
        name,
        area_geojson: areaFeature,
        provider_policy: DEFAULT_POLICY,
        filters: { min_roof_age_years: 12 },
        enrichment_options: { imagery: true, scoring: true },
      };
      const response = await api.post('/api/v1/scans', payload);
      setScan(response);
      setStatus(response.status);
      refreshScannerData();
    } catch (err) {
      console.error('scan:create failed', err);
      setError(err?.response?.data?.detail || 'Failed to create scan');
    }
  };

  useEffect(() => {
    if (!scan?.id) {
      return;
    }
    setStatus(scan.status);
    const interval = setInterval(async () => {
      try {
        const next = await api.get(`/api/v1/scans/${scan.id}`);
        setStatus(next.status);
        if (next.status === 'completed' || next.status === 'failed') {
          clearInterval(interval);
          setScan((current) => ({ ...(current || {}), ...next }));
          refreshScannerData();
        }
      } catch (err) {
        console.error('scan:poll failed', err);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [refreshScannerData, scan?.id, scan?.status]);

  const scannerRows = useMemo(
    () => buildScannerRows(scanSummaries, clusterSummaries),
    [scanSummaries, clusterSummaries]
  );

  return (
    <div className="p-6 space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Geospatial Scanner</h1>
        <p className="text-sm text-slate-500">Draw a service region, spin up imagery fetch + enrichment, and monitor progress.</p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4 shadow-sm">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Scan name</span>
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="July storm polygon"
          />
        </label>

        <DrawTool onAreaChange={setAreaFeature} />

        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Provider policy: {DEFAULT_POLICY.order.join(' → ')} • Zoom {DEFAULT_POLICY.zoom}
          </div>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={startScan}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              canSubmit
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-slate-200 text-slate-500 cursor-not-allowed'
            }`}
          >
            {scan?.id ? 'Re-run scan' : 'Start scan'}
          </button>
        </div>
        {error && <div className="rounded bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>}
      </div>

      {scan?.id && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700">Scan {scan.id}</p>
              <p className="text-xs text-slate-500">Tiles estimated {scan.tiles_total}</p>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                status === 'completed'
                  ? 'bg-emerald-100 text-emerald-700'
                  : status === 'failed'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {status || 'queued'}
            </span>
          </div>
          {scan.tiles_processed != null && (
            <div className="text-xs text-slate-500">
              Processed {scan.tiles_processed ?? 0}/{scan.tiles_total ?? 0} tiles · Leads generated {scan.leads_generated ?? 0}
            </div>
          )}
        </div>
      )}

      <ScannerActivityTable
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        isDark={false}
        rows={scannerRows}
        scanCount={scanSummaries.length}
        clusterCount={clusterSummaries.length}
        loading={tableLoading}
        onRowNavigate={(row) => navigate(row.link)}
        emptyMessage="No scanner runs yet. Launch a SmartScan or cluster analysis to build momentum."
      />
    </div>
  );
}
