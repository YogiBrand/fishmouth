import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Flame, Download, RefreshCcw, Wand2, Building2, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

import LeadIntelligenceTable from '../components/LeadIntelligenceTable';
import GeoScatterMap from '../components/GeoScatterMap';
import ScannerCostModal from '../components/ScannerCostModal';
import { leadAPI } from '../services/api';

const StatBadge = ({ label, value, tone = 'slate' }) => {
  const palette = {
    slate: 'bg-slate-100 text-slate-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-rose-100 text-rose-700',
    emerald: 'bg-emerald-100 text-emerald-700',
  };
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${palette[tone] || palette.slate}`}>
      {label}: {value ?? '—'}
    </span>
  );
};

const MetricRow = ({ label, value }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-slate-500">{label}</span>
    <span className="font-semibold text-slate-900">{value}</span>
  </div>
);

const HeatClusterDetail = () => {
  const navigate = useNavigate();
  const { clusterId } = useParams();
  const [cluster, setCluster] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCostModal, setShowCostModal] = useState(false);

  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
    []
  );

  const formatCurrency = useCallback((value) => currencyFormatter.format(Number(value || 0)), [currencyFormatter]);

  const loadCluster = useCallback(async () => {
    if (!clusterId) return;
    setLoading(true);
    try {
      const detail = await leadAPI.getHeatCluster(clusterId);
      setCluster(detail);
      setLeads(Array.isArray(detail?.leads) ? detail.leads : []);
    } catch (error) {
      console.error('Failed to load cluster', error);
      toast.error('Unable to load cluster details');
    } finally {
      setLoading(false);
    }
  }, [clusterId]);

  useEffect(() => {
    loadCluster();
  }, [loadCluster]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCluster();
    setRefreshing(false);
  };

  const handleExport = () => {
    if (!leads.length) {
      toast.error('No leads to export');
      return;
    }
    const headers = ['Lead ID', 'Address', 'City', 'State', 'Zip', 'Score', 'Priority', 'Phone', 'Email'];
    const rows = leads.map((lead) => [
      lead.id,
      lead.address,
      lead.city,
      lead.state,
      lead.zip_code,
      lead.lead_score,
      lead.priority,
      lead.homeowner_phone || lead.phone || '',
      lead.homeowner_email || lead.email || '',
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${(value ?? '').toString().replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `heat-cluster-${clusterId}-leads.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success('Lead export ready.');
  };

  const handleOpenEnrichment = () => {
    if (!cluster?.cost_estimate) {
      toast.error('Cost estimate unavailable. Run enrichment first.');
      return;
    }
    setShowCostModal(true);
  };

  const handleConfirmEnrichment = () => {
    setShowCostModal(false);
    toast.success('Heat cluster enrichment confirmed. Wallet deduction scheduled.');
  };

  const costEstimate = cluster?.cost_estimate;
  const mapData = cluster?.map;
  const summary = useMemo(() => cluster?.summary || {}, [cluster?.summary]);
  const insights = cluster?.insights || {};

  const statBadges = useMemo(() => {
    const clusterScore = cluster?.cluster_score != null ? Number(cluster.cluster_score).toFixed(1) : '—';
    const roiValue = summary.predicted_roi_multiple != null
      ? Number(summary.predicted_roi_multiple).toFixed(1)
      : cluster?.cluster_score != null
      ? (Number(cluster.cluster_score) / 20).toFixed(1)
      : null;
    const roiMultiple = roiValue ? `${roiValue}×` : '—';
    return [
      { label: 'Permits', value: summary.permit_count, tone: 'amber' },
      { label: 'Cluster score', value: clusterScore, tone: 'red' },
      { label: 'Likely new roofs', value: summary.likely_new_roofs, tone: 'emerald' },
      { label: 'ROI multiple', value: roiMultiple },
    ];
  }, [cluster?.cluster_score, summary]);

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
    const phone = lead?.homeowner_phone || lead?.phone;
    if (phone) {
      window.open(`tel:${phone}`);
    } else {
      toast.error('No phone number on file for this lead');
    }
  };

  const handleAssignSequence = (lead) => {
    toast.success(`Queued ${lead?.homeowner_name || lead?.address}. Open Sequences to enroll.`);
    navigate('/dashboard');
  };

  const handleInspectImagery = handleViewLead;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
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
                <Flame className="h-4 w-4 text-amber-500" />
                <span>Heat cluster #{clusterId}</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900">{cluster?.label || 'Loading cluster…'}</h1>
              <p className="mt-1 text-sm text-slate-600">
                Status: <span className="font-semibold capitalize">{cluster?.cluster_status || 'unknown'}</span>
                {cluster?.last_activity_at && ` • Last activity ${new Date(cluster.last_activity_at).toLocaleString()}`}
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
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
            >
              <Wand2 className="h-4 w-4" />
              Enrich properties
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
            Loading cluster intelligence…
          </div>
        ) : (
          <>
            <section className="flex flex-wrap items-center gap-3">
              {statBadges.map((badge) => (
                <StatBadge key={badge.label} {...badge} />
              ))}
            </section>

            {mapData?.heatmap_points?.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-slate-600">
                  <Building2 className="h-4 w-4" />
                  <h2 className="text-lg font-semibold text-slate-900">Cluster footprint & property density</h2>
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
                  <TrendingUp className="h-4 w-4" />
                  <h3 className="text-lg font-semibold text-slate-900">Cluster momentum</h3>
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  <MetricRow label="Active claims" value={summary.active_claims ?? '—'} />
                  <MetricRow label="Leads overlapping" value={summary.lead_overlap ?? '—'} />
                  <MetricRow label="Associated scans" value={Array.isArray(summary.associated_scans) ? summary.associated_scans.join(', ') : '—'} />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Flame className="h-4 w-4 text-amber-500" />
                  <h3 className="text-lg font-semibold text-slate-900">AI recommendations</h3>
                </div>
                <p className="mt-3 text-sm text-slate-600">{insights.summary || cluster?.ai_takeaway || 'AI recommendations will appear once enrichment completes.'}</p>
                {Array.isArray(insights.recommendations) && insights.recommendations.length > 0 && (
                  <ul className="mt-4 space-y-2 text-sm text-slate-600">
                    {insights.recommendations.map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
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
                      className="mt-4 w-full rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
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
        title="Confirm cluster enrichment cost"
        description="This will enrich every property in the cluster and queue outreach budgets."
      />
    </div>
  );
};

export default HeatClusterDetail;
