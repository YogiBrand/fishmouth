import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, RefreshCcw, Wand2, Activity, Sparkles, Target } from 'lucide-react';
import toast from 'react-hot-toast';

import LeadIntelligenceTable from '../components/LeadIntelligenceTable';
import GeoScatterMap from '../components/GeoScatterMap';
import ScannerCostModal from '../components/ScannerCostModal';
import { leadAPI } from '../services/api';

const StatCard = ({ label, value, highlight }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
    <p className={`mt-2 text-2xl font-semibold text-slate-900 ${highlight || ''}`}>{value ?? '—'}</p>
  </div>
);

const MetricRow = ({ label, value }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-slate-500">{label}</span>
    <span className="font-semibold text-slate-900">{value}</span>
  </div>
);

const ScanResults = () => {
  const navigate = useNavigate();
  const { scanId } = useParams();
  const [scan, setScan] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCostModal, setShowCostModal] = useState(false);

  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
    []
  );

  const formatCurrency = useCallback((value) => currencyFormatter.format(Number(value || 0)), [currencyFormatter]);

  const loadScan = useCallback(async () => {
    if (!scanId) return;
    setLoading(true);
    try {
      const scanResults = await leadAPI.getScanResults(scanId);
      setScan(scanResults);
      setLeads(Array.isArray(scanResults?.leads) ? scanResults.leads : []);
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

  const handleOpenEnrichment = () => {
    if (!scan?.cost_estimate) {
      toast.error('Cost estimate unavailable.');
      return;
    }
    setShowCostModal(true);
  };

  const handleConfirmEnrichment = () => {
    setShowCostModal(false);
    toast.success('Scan enrichment confirmed. Wallet deduction scheduled.');
  };

  const summary = scan?.scan_summary || {};
  const performance = scan?.performance_metrics || {};
  const insights = scan?.insights || {};
  const mapData = scan?.map;
  const costEstimate = scan?.cost_estimate;

  const damageDistribution = useMemo(() => {
    const distribution = summary.damage_distribution || {};
    return Object.entries(distribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [summary.damage_distribution]);

  const statCards = [
    { label: 'Qualified Leads', value: summary.qualified_leads ?? scan?.qualified_leads ?? 0, highlight: 'text-blue-600' },
    { label: 'Average Lead Score', value: summary.average_lead_score ? `${summary.average_lead_score}/100` : '—' },
    { label: 'Average Roof Age', value: summary.average_roof_age ? `${summary.average_roof_age} yrs` : '—' },
    { label: 'Score Threshold', value: summary.score_threshold ?? 70 },
  ];

  const handleViewLead = (lead) => {
    if (lead?.id) {
      navigate(`/leads/${lead.id}`);
    }
  };

  const handleGenerateReport = (lead) => {
    if (lead?.id) {
      navigate(`/reports/${lead.id}`);
    }
  };

  const handleCallLead = (lead) => {
    const phone = lead?.homeowner_phone || lead?.phone || lead?.primary_phone;
    if (phone) {
      window.open(`tel:${phone}`);
    } else {
      toast.error('No phone number on file for this lead');
    }
  };

  const handleAssignSequence = (lead) => {
    toast.success(`Ready to enroll ${lead?.homeowner_name || lead?.address}. Open the Sequences tab to continue.`);
    navigate('/dashboard');
  };

  const handleInspectImagery = handleViewLead;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <button
              onClick={() => navigate(-1)}
              className="rounded-lg border border-slate-200 p-2 transition-colors hover:bg-slate-100"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Target className="h-4 w-4" />
                <span>Scan #{scanId}</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900">{scan?.area_name || 'Loading Scan…'}</h1>
              <p className="mt-1 text-sm text-slate-600">
                Status: <span className="font-semibold capitalize">{scan?.status || 'unknown'}</span>
                {scan?.created_at && ` • Started ${new Date(scan.created_at).toLocaleString()}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100"
              disabled={refreshing}
            >
              <RefreshCcw className="h-4 w-4" />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
            <button
              onClick={handleOpenEnrichment}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              <Wand2 className="h-4 w-4" />
              Enrich data
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              Export Leads
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
            Loading scan results…
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {statCards.map((card) => (
                <StatCard key={card.label} {...card} />
              ))}
            </section>

            {damageDistribution.length > 0 && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Top Issues Detected</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {damageDistribution.map(([issue, total]) => (
                    <span
                      key={issue}
                      className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700"
                    >
                      {issue.replace(/_/g, ' ')} • {total}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {mapData?.heatmap_points?.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-slate-600">
                  <Activity className="h-4 w-4" />
                  <h2 className="text-lg font-semibold text-slate-900">Scan footprint & contagion overlay</h2>
                </div>
                <GeoScatterMap
                  center={mapData.center}
                  bounds={mapData.bounds}
                  points={mapData.heatmap_points}
                  height={380}
                />
              </section>
            )}

            <section className="grid gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Sparkles className="h-4 w-4" />
                  <h3 className="text-lg font-semibold text-slate-900">AI Insights</h3>
                </div>
                <p className="mt-3 text-sm text-slate-600">{insights.summary || 'AI insights will appear here once enrichment completes.'}</p>
                {Array.isArray(insights.playbook) && insights.playbook.length > 0 && (
                  <ul className="mt-4 space-y-2 text-sm text-slate-600">
                    {insights.playbook.map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Activity className="h-4 w-4" />
                  <h3 className="text-lg font-semibold text-slate-900">Performance metrics</h3>
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  <MetricRow label="Scan efficiency" value={`${performance.scan_efficiency ?? '—'}%`} />
                  <MetricRow label="AI accuracy rate" value={`${performance.ai_accuracy_rate ?? '—'}%`} />
                  <MetricRow label="False positive rate" value={`${performance.false_positive_rate ?? '—'}%`} />
                  <MetricRow label="Processing time / property" value={performance.processing_time_per_property || '—'} />
                  <MetricRow label="Total scan duration" value={performance.total_scan_duration || '—'} />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Wand2 className="h-4 w-4" />
                  <h3 className="text-lg font-semibold text-slate-900">Projected spend</h3>
                </div>
                {costEstimate ? (
                  <div className="mt-3 space-y-2 text-sm">
                    <MetricRow label="Imagery & tiles" value={formatCurrency(costEstimate.imagery)} />
                    <MetricRow label="Data enrichment" value={formatCurrency(costEstimate.enrichment)} />
                    <MetricRow label="Outreach budget" value={formatCurrency(costEstimate.outreach_budget)} />
                    <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base font-semibold text-slate-900">
                      <span>Total projected</span>
                      <span>{formatCurrency(costEstimate.total)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenEnrichment}
                      className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                    >
                      Confirm spend & enrich
                    </button>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-600">Cost estimate will generate once enrichment completes.</p>
                )}
              </div>
            </section>

            <section>
              <LeadIntelligenceTable
                leads={leads}
                isDark={false}
                onGenerateReport={handleGenerateReport}
                onViewDetails={handleViewLead}
                onCallLead={handleCallLead}
                onInspectImagery={handleInspectImagery}
                onAssignSequence={handleAssignSequence}
              />
            </section>
          </>
        )}
      </main>

      <ScannerCostModal
        open={showCostModal}
        onClose={() => setShowCostModal(false)}
        onConfirm={handleConfirmEnrichment}
        costEstimate={costEstimate}
      />
    </div>
  );
};

export default ScanResults;
