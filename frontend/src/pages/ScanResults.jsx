import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Download, RefreshCcw } from 'lucide-react';
import toast from 'react-hot-toast';

import LeadList from '../components/LeadList';
import { leadAPI } from '../services/api';

const ScanResults = () => {
  const navigate = useNavigate();
  const { scanId } = useParams();
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadScan = useCallback(async () => {
    if (!scanId) return;
    setLoading(true);
    try {
      const scanResults = await leadAPI.getScanResults(scanId);
      setScan(scanResults);
    } catch (error) {
      console.error('Failed to load scan', error);
      toast.error('Unable to load scan details');
    } finally {
      setLoading(false);
    }
  }, [scanId]);

  useEffect(() => {
    loadScan();
  }, [loadScan]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadScan();
    setRefreshing(false);
  };

  const handleExport = async () => {
    try {
      const data = await leadAPI.exportLeads({ area_scan_id: scanId });
      const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `scan-${scanId}-leads.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error', error);
      toast.error('Unable to export scan results');
    }
  };

  const summary = scan?.scan_summary || {};

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <MapPin size={16} />
                <span>Scan #{scanId}</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                {scan?.area_name || 'Loading Scan…'}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Status: <span className="font-semibold capitalize">{scan?.status || 'unknown'}</span>
                {scan?.created_at && ` • Started ${new Date(scan.created_at).toLocaleString()}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              disabled={refreshing}
            >
              <RefreshCcw size={16} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>

            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download size={16} />
              Export Leads
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {loading ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
            Loading scan results…
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard label="Qualified Leads" value={scan?.qualified_leads ?? 0} highlight="text-blue-600" />
              <SummaryCard label="Average Lead Score" value={summary.average_lead_score ? `${summary.average_lead_score}/100` : '—'} />
              <SummaryCard label="Average Roof Age" value={summary.average_roof_age ? `${summary.average_roof_age} yrs` : '—'} />
              <SummaryCard label="Score Threshold" value={summary.score_threshold ?? 60} />
            </section>

            {summary.damage_distribution && Object.keys(summary.damage_distribution).length > 0 && (
              <section className="bg-white border border-gray-200 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Issues Detected</h2>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(summary.damage_distribution)
                    .sort((a, b) => b[1] - a[1])
                    .map(([issue, total]) => (
                      <span
                        key={issue}
                        className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200 text-sm"
                      >
                        {issue.replace(/_/g, ' ')} • {total}
                      </span>
                    ))}
                </div>
              </section>
            )}

            <section className="bg-white border border-gray-200 rounded-xl">
              <LeadList
                title="Qualified Leads"
                filters={{ area_scan_id: scanId }}
                limit={200}
              />
            </section>
          </>
        )}
      </main>
    </div>
  );
};

const SummaryCard = ({ label, value, highlight }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-5">
    <p className="text-sm text-gray-600">{label}</p>
    <p className={`mt-2 text-2xl font-semibold ${highlight || 'text-gray-900'}`}>{value ?? '—'}</p>
  </div>
);

export default ScanResults;
