import React, { useMemo } from 'react';
import { Scan, Flame, ArrowUpRight } from 'lucide-react';

const normalizeDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const buildScannerRows = (scanSummaries = [], clusterSummaries = []) => {
  const rows = [];

  (Array.isArray(scanSummaries) ? scanSummaries : []).forEach((scan) => {
    const id = scan?.id || scan?.scan_id;
    if (!id) {
      return;
    }
    const processed = Number(scan.processed_properties ?? scan.properties_processed ?? 0);
    const totalProps = Number(
      scan.total_properties ??
        scan.estimated_properties ??
        scan.properties_estimated ??
        scan.properties_total ??
        0
    );
    rows.push({
      id: String(id),
      type: 'scan',
      typeLabel: 'Roof Scan',
      name: scan.area_name || scan.name || `Scan ${id}`,
      status: (scan.status || 'queued').toLowerCase(),
      metricLabel: 'Qualified Leads',
      metricValue: scan.qualified_leads ?? scan.hot_leads ?? 0,
      propertiesTotal: Number.isFinite(totalProps) && totalProps > 0 ? totalProps : null,
      propertiesProcessed: Number.isFinite(processed) && processed >= 0 ? processed : null,
      permits: scan.permit_count ?? null,
      leads: scan.qualified_leads ?? scan.hot_leads ?? 0,
      progress: Number.isFinite(scan.progress_percentage)
        ? Number(scan.progress_percentage)
        : null,
      spend: scan.estimated_cost ?? scan.cost_estimate ?? null,
      lastActivity: normalizeDate(scan.completed_at || scan.updated_at || scan.created_at),
      link: `/scan/${id}/results`,
      raw: scan,
    });
  });

  (Array.isArray(clusterSummaries) ? clusterSummaries : []).forEach((cluster) => {
    const id = cluster?.id || cluster?.cluster_id;
    if (!id) {
      return;
    }
    rows.push({
      id: String(id),
      type: 'cluster',
      typeLabel: 'Heat Cluster',
      name:
        cluster.label ||
        [cluster.city, cluster.state].filter(Boolean).join(', ') ||
        `Cluster ${id}`,
      status: (cluster.cluster_status || cluster.status || 'active').toLowerCase(),
      metricLabel: 'Cluster Score',
      metricValue:
        cluster.cluster_score != null
          ? Number(cluster.cluster_score).toFixed(1)
          : null,
      propertiesTotal:
        cluster.scanned_properties ?? cluster.total_properties ?? cluster.properties_total ?? null,
      propertiesProcessed: null,
      permits: cluster.permit_count ?? null,
      leads: cluster.likely_new_roofs ?? cluster.lead_overlap ?? null,
      progress: null,
      spend: cluster.predicted_roi_multiple ?? null,
      lastActivity: normalizeDate(cluster.last_activity_at || cluster.date_range_end),
      radius: cluster.radius_miles ?? null,
      link: `/clusters/${id}`,
      raw: cluster,
    });
  });

  return rows.sort((a, b) => {
    const aTime = a.lastActivity ? a.lastActivity.getTime() : 0;
    const bTime = b.lastActivity ? b.lastActivity.getTime() : 0;
    return bTime - aTime;
  });
};

const ScannerActivityTable = ({
  className = '',
  isDark = false,
  rows = [],
  scanCount = 0,
  clusterCount = 0,
  loading = false,
  title = 'Scan & Cluster Activity',
  subtitle = 'Review every SmartScan and heat cluster with spend, permits, and conversion readiness in one view.',
  emptyMessage = 'Launch a SmartScan or run heat cluster analysis to populate this workspace.',
  onRowNavigate,
}) => {
  const headingClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';
  const dividerClass = isDark ? 'divide-slate-800' : 'divide-gray-200';
  const hoverClass = isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-50';
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }),
    []
  );

  const handleNavigate = (row) => {
    if (typeof onRowNavigate === 'function') {
      onRowNavigate(row);
    }
  };

  const renderStatusClass = (rowType, status, defaultClass) => {
    if (rowType === 'scan') {
      if (status === 'completed') return 'bg-emerald-500/15 text-emerald-500';
      if (status === 'failed') return 'bg-rose-500/15 text-rose-500';
      if (status === 'in_progress' || status === 'processing') return 'bg-sky-500/15 text-sky-500';
      return defaultClass;
    }
    if (status === 'hot') return 'bg-rose-500/15 text-rose-500';
    if (status === 'active') return 'bg-amber-500/15 text-amber-500';
    return 'bg-indigo-500/15 text-indigo-500';
  };

  const statusBaseClass = isDark ? 'bg-slate-800 text-slate-200' : 'bg-gray-100 text-gray-600';
  const headerBgClass = isDark ? 'bg-slate-900/60 text-slate-300' : 'bg-gray-100 text-gray-600';
  const loadingCardClass = isDark
    ? 'rounded-2xl border border-slate-800 bg-slate-900 px-6 py-10 text-center text-sm text-slate-300'
    : 'rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500';

  return (
    <div className={`space-y-4 ${className}`.trim()}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={`text-xl font-semibold ${headingClass}`}>{title}</h2>
          <p className={`text-sm ${mutedClass}`}>{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
              isDark ? 'bg-sky-500/20 text-sky-200' : 'bg-sky-100 text-sky-700'
            }`}
          >
            <Scan className="w-3.5 h-3.5" />
            {scanCount} scans
          </span>
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
              isDark ? 'bg-amber-500/20 text-amber-200' : 'bg-amber-100 text-amber-700'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            {clusterCount} clusters
          </span>
        </div>
      </div>

      {loading ? (
        <div className={loadingCardClass}>Syncing latest scanner activity…</div>
      ) : rows.length === 0 ? (
        <div className={loadingCardClass}>{emptyMessage}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className={`min-w-full text-sm ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
            <thead className={headerBgClass}>
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Item</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Highlight</th>
                <th className="px-4 py-3 text-left font-semibold">Properties</th>
                <th className="px-4 py-3 text-left font-semibold">Leads & Permits</th>
                <th className="px-4 py-3 text-left font-semibold">Last activity</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className={dividerClass}>
              {rows.map((row) => {
                const status = (row.status || '').toLowerCase();
                const highlightSecondary = row.type === 'scan'
                  ? row.spend
                    ? `${currencyFormatter.format(row.spend)} est. spend`
                    : row.progress != null
                    ? `${Math.round(row.progress)}% complete`
                    : null
                  : row.permits != null
                  ? `${row.permits} permits filed`
                  : null;
                const propertiesPrimary = row.type === 'scan'
                  ? row.propertiesTotal != null
                    ? `${row.propertiesProcessed ?? 0}/${row.propertiesTotal}`
                    : '—'
                  : row.propertiesTotal != null
                  ? row.propertiesTotal.toLocaleString()
                  : '—';
                const propertiesSecondary = row.type === 'scan' ? 'properties processed' : 'properties in radius';
                const leadsPrimary = row.leads != null ? row.leads.toLocaleString() : '—';
                const leadsSecondary = row.type === 'scan' ? 'qualified leads' : 'likely new roofs';
                const permitsSecondary = row.type === 'cluster' && row.permits != null ? `${row.permits} permits` : null;
                const lastActivity = row.lastActivity ? row.lastActivity.toLocaleString() : 'Awaiting data';

                return (
                  <tr
                    key={row.id}
                    onClick={() => handleNavigate(row)}
                    className={`cursor-pointer transition-colors ${hoverClass}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${
                            row.type === 'scan'
                              ? isDark
                                ? 'bg-sky-500/20 text-sky-200'
                                : 'bg-sky-100 text-sky-600'
                              : isDark
                              ? 'bg-amber-500/20 text-amber-200'
                              : 'bg-amber-100 text-amber-600'
                          }`}
                        >
                          {row.type === 'scan' ? <Scan className="w-4 h-4" /> : <Flame className="w-4 h-4" />}
                        </span>
                        <div>
                          <p className={`font-semibold ${headingClass}`}>{row.name}</p>
                          <p className={`text-xs ${mutedClass}`}>{row.typeLabel}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold capitalize ${
                          renderStatusClass(row.type, status, statusBaseClass)
                        }`}
                      >
                        {status || 'pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className={`text-sm font-semibold ${headingClass}`}>{row.metricValue ?? '—'}</div>
                      <div className={`text-xs ${mutedClass}`}>{row.metricLabel}</div>
                      {highlightSecondary && (
                        <div className={`text-xs ${mutedClass}`}>{highlightSecondary}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className={`text-sm font-semibold ${headingClass}`}>{propertiesPrimary}</div>
                      <div className={`text-xs ${mutedClass}`}>{propertiesSecondary}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className={`text-sm font-semibold ${headingClass}`}>{leadsPrimary}</div>
                      <div className={`text-xs ${mutedClass}`}>{leadsSecondary}</div>
                      {permitsSecondary && <div className={`text-xs ${mutedClass}`}>{permitsSecondary}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`block ${mutedClass}`}>{lastActivity}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleNavigate(row);
                        }}
                        className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                          isDark ? 'bg-slate-700 text-slate-100 hover:bg-slate-600' : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        View details
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ScannerActivityTable;
