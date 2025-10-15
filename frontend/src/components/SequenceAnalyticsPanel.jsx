import React from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';

const TIMEFRAME_OPTIONS = [
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: 'all', label: 'All Time' },
];

const formatNumber = (value) => {
  if (value === null || value === undefined) {
    return '—';
  }
  return Number(value).toLocaleString();
};

const formatPercent = (value) => {
  if (value === null || value === undefined) {
    return '—';
  }
  return `${Number(value).toFixed(1)}%`;
};

const formatMinutes = (value) => {
  if (value === null || value === undefined) {
    return '—';
  }
  if (value < 1) {
    return `${Math.round(value * 60)} sec`;
  }
  if (value >= 60) {
    const hours = value / 60;
    return `${hours.toFixed(1)} hrs`;
  }
  return `${value.toFixed(1)} min`;
};

const SequenceAnalyticsPanel = ({
  sequence,
  analytics,
  filters,
  loading,
  error,
  onClose,
  onRefresh,
  onFilterChange,
  onResetFilters,
  onPaginate,
}) => {
  const summary = analytics?.summary || {};
  const enrollmentSummary = summary.enrollment || {};
  const deliverySummary = summary.delivery || {};
  const automationHealth = analytics?.automation_health || [];
  const stepMetrics = analytics?.steps?.filtered || [];
  const engagements = analytics?.engagements || {
    total: 0,
    count: 0,
    limit: 0,
    offset: 0,
    items: [],
  };
  const filterOptions = analytics?.filters?.options || {};

  const offset = engagements.offset || 0;
  const count = engagements.count || (engagements.items?.length || 0);
  const limit = engagements.limit || count || 50;
  const total = engagements.total || 0;

  const pagination = {
    offset,
    count,
    limit,
    total,
    hasPrev: offset > 0,
    hasNext: offset + count < total,
    nextOffset: offset + limit,
    prevOffset: Math.max(offset - limit, 0),
  };

  if (!sequence) {
    return null;
  }

  const handleOpenLead = (leadId) => {
    if (!leadId) return;
    window.open(`/dashboard/leads/${leadId}`, '_blank', 'noopener');
  };

  const handleFilterUpdate = (changes) => {
    if (onFilterChange) {
      onFilterChange(changes);
    }
  };

  const deliveryCards = [
    {
      label: 'Messages Sent',
      value: formatNumber(deliverySummary.messages || engagements.total || 0),
      sublabel: `${formatNumber(deliverySummary.unique_leads || 0)} unique leads`,
      accent: 'bg-blue-500/10 text-blue-600 dark:text-blue-300',
    },
    {
      label: 'Delivered',
      value: formatNumber(deliverySummary.delivered || 0),
      sublabel: `Delivery rate ${formatPercent(deliverySummary.delivery_rate)}`,
      accent: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
    },
    {
      label: 'Engaged',
      value: formatNumber(deliverySummary.engaged || 0),
      sublabel: `Engagement rate ${formatPercent(deliverySummary.engagement_rate)}`,
      accent: 'bg-purple-500/10 text-purple-600 dark:text-purple-300',
    },
    {
      label: 'Failures',
      value: formatNumber(deliverySummary.failed || 0),
      sublabel: `Failure rate ${formatPercent(deliverySummary.failure_rate)}`,
      accent: 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
    },
    {
      label: 'Avg Response',
      value: formatMinutes(deliverySummary.average_response_minutes),
      sublabel: 'Time to first engagement',
      accent: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
    },
    {
      label: 'Replies',
      value: formatNumber(deliverySummary.replied || 0),
      sublabel: `${formatNumber(deliverySummary.clicked || 0)} clicks · ${formatNumber(deliverySummary.opened || 0)} opens`,
      accent: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300',
    },
  ];

  const enrollmentCards = [
    {
      label: 'Total Enrolled',
      value: formatNumber(enrollmentSummary.total || 0),
      sublabel: `${formatNumber(enrollmentSummary.active || 0)} active`,
    },
    {
      label: 'Completed',
      value: formatNumber(enrollmentSummary.completed || 0),
      sublabel: `Conversion ${formatPercent(enrollmentSummary.conversion_rate)}`,
    },
    {
      label: 'Converted',
      value: formatNumber(enrollmentSummary.converted || 0),
      sublabel: `Completion ${formatPercent(enrollmentSummary.completion_rate)}`,
    },
    {
      label: 'Messages Sent',
      value: formatNumber(enrollmentSummary.emails_sent + enrollmentSummary.sms_sent + enrollmentSummary.calls_made || 0),
      sublabel: `${formatNumber(enrollmentSummary.emails_sent || 0)} email · ${formatNumber(enrollmentSummary.sms_sent || 0)} sms · ${formatNumber(enrollmentSummary.calls_made || 0)} calls`,
    },
  ];

  const renderStatusBadge = (status) => {
    const normalized = (status || '').toLowerCase();
    const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium';
    if (normalized === 'delivered' || normalized === 'completed') {
      return <span className={`${base} bg-emerald-500/15 text-emerald-600 dark:text-emerald-300`}>{status}</span>;
    }
    if (normalized === 'failed' || normalized === 'bounced') {
      return <span className={`${base} bg-rose-500/15 text-rose-600 dark:text-rose-300`}>{status}</span>;
    }
    if (normalized === 'queued' || normalized === 'pending' || normalized === 'sending') {
      return <span className={`${base} bg-amber-500/15 text-amber-600 dark:text-amber-300`}>{status}</span>;
    }
    return <span className={`${base} bg-slate-500/15 text-slate-600 dark:text-slate-300`}>{status}</span>;
  };

  return (
    <div className="fixed inset-0 z-[70]">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 flex h-full w-full items-stretch justify-end">
        <div className="flex h-full w-full max-w-6xl flex-col bg-white text-slate-900 shadow-2xl dark:bg-slate-950 dark:text-slate-100">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <BarChart3 size={16} />
                Sequence Insights
              </div>
              <h2 className="mt-1 text-2xl font-bold">{sequence.name}</h2>
              {sequence.description && (
                <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{sequence.description}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:text-blue-300"
                title="Refresh analytics"
              >
                <RefreshCw className={loading ? 'animate-spin' : ''} size={16} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-rose-200 hover:text-rose-500 dark:border-slate-800 dark:hover:border-slate-700"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="space-y-6 px-6 py-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                  <div className="flex flex-col">
                    <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      <Filter size={14} />
                      Timeframe
                    </label>
                    <select
                      value={filters.timeframe}
                      onChange={(e) => handleFilterUpdate({ timeframe: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900"
                    >
                      {TIMEFRAME_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Step
                    </label>
                    <select
                      value={filters.step || ''}
                      onChange={(e) => handleFilterUpdate({ step: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900"
                    >
                      <option value="">All steps</option>
                      {(filterOptions.steps || []).map((step) => (
                        <option key={step.node_id} value={step.node_id}>
                          {step.label} · {step.channel}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Channel
                    </label>
                    <select
                      value={filters.channel || ''}
                      onChange={(e) => handleFilterUpdate({ channel: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900"
                    >
                      <option value="">All channels</option>
                      {(filterOptions.channels || []).map((channel) => (
                        <option key={channel} value={channel}>
                          {channel.charAt(0).toUpperCase() + channel.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Status
                    </label>
                    <select
                      value={filters.status || ''}
                      onChange={(e) => handleFilterUpdate({ status: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900"
                    >
                      <option value="">All statuses</option>
                      {(filterOptions.statuses || []).map((statusOption) => (
                        <option key={statusOption} value={statusOption}>
                          {statusOption.charAt(0).toUpperCase() + statusOption.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Search
                    </label>
                    <div className="relative flex items-center">
                      <Search size={16} className="absolute left-3 text-slate-400" />
                      <input
                        type="text"
                        value={filters.search || ''}
                        onChange={(e) => handleFilterUpdate({ search: e.target.value })}
                        placeholder="Search leads or keywords..."
                        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onResetFilters}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-blue-200 hover:text-blue-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
                  >
                    Reset filters
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
                  <AlertTriangle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {deliveryCards.map((card) => (
                  <div
                    key={card.label}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {card.label}
                    </div>
                    <div className={`mt-2 text-2xl font-semibold ${card.accent}`}>
                      {card.value}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{card.sublabel}</div>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {enrollmentCards.map((card) => (
                  <div
                    key={card.label}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {card.label}
                    </div>
                    <div className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                      {card.value}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{card.sublabel}</div>
                  </div>
                ))}
              </div>

              {automationHealth.length > 0 && (
                <div className="grid gap-3 md:grid-cols-2">
                  {automationHealth.map((item) => (
                    <div
                      key={item.channel}
                      className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
                        item.status === 'attention'
                          ? 'border-amber-200 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10'
                          : 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10'
                      }`}
                    >
                      {item.status === 'attention' ? (
                        <AlertTriangle className="mt-0.5 text-amber-500 dark:text-amber-300" size={18} />
                      ) : (
                        <CheckCircle2 className="mt-0.5 text-emerald-500 dark:text-emerald-300" size={18} />
                      )}
                      <div>
                        <h4 className="text-sm font-semibold capitalize">
                          {item.channel} automation {item.status === 'attention' ? 'needs review' : 'ready'}
                        </h4>
                        <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                          {item.missing_contacts
                            ? `${formatNumber(item.missing_contacts)} leads are missing contact details for this channel.`
                            : 'All enrolled leads have the required contact details.'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Step Performance
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Showing {stepMetrics.length} steps
                  </span>
                </div>
                {stepMetrics.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    No delivery activity found for the selected filters.
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {stepMetrics.map((step) => (
                      <div
                        key={step.node_id}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {step.label}
                            </div>
                            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              {step.channel} · {formatNumber(step.sends)} sends
                            </div>
                          </div>
                          <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                            {step.last_activity_at ? `Last ${new Date(step.last_activity_at).toLocaleString()}` : 'No activity'}
                          </div>
                        </div>
                        <div className="mt-4 flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
                          <div>
                            <span className="font-semibold text-emerald-500 dark:text-emerald-300">
                              {formatPercent(step.delivery_rate)}
                            </span>{' '}
                            delivered
                          </div>
                          <div>
                            <span className="font-semibold text-purple-500 dark:text-purple-300">
                              {formatPercent(step.engagement_rate)}
                            </span>{' '}
                            engaged
                          </div>
                          <div>
                            <span className="font-semibold text-rose-500 dark:text-rose-300">
                              {formatPercent(step.failure_rate)}
                            </span>{' '}
                            failed
                          </div>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                          <div
                            className="h-2 rounded-full bg-emerald-500"
                            style={{ width: `${Math.min(step.delivery_rate || 0, 100)}%` }}
                          />
                        </div>
                        <div className="mt-3 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                          <span>{formatNumber(step.opens)} opens</span>
                          <span>·</span>
                          <span>{formatNumber(step.clicks)} clicks</span>
                          <span>·</span>
                          <span>{formatNumber(step.replies)} replies</span>
                          <span>·</span>
                          <span>
                            Avg response {formatMinutes(step.avg_response_minutes)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Engagement Timeline
                  </h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {formatNumber(engagements.total)} total interactions
                  </div>
                </div>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="max-h-[420px] overflow-y-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                      <thead className="bg-slate-50 dark:bg-slate-900/60">
                        <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          <th className="px-4 py-3">Lead</th>
                          <th className="px-4 py-3">Step</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Engagement</th>
                          <th className="px-4 py-3">Sent</th>
                          <th className="px-4 py-3">Last Activity</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {engagements.items?.length ? (
                          engagements.items.map((item) => (
                            <tr key={`${item.execution_id}-${item.delivery?.message_id || item.lead?.id}`}>
                              <td className="px-4 py-3 align-top">
                                <div className="font-medium text-slate-900 dark:text-slate-100">
                                  {item.lead?.name || 'Lead'}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                  {item.lead?.email || item.lead?.phone || '—'}
                                </div>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <div className="font-medium text-slate-800 dark:text-slate-200">
                                  {item.sequence_node?.label || 'Step'}
                                </div>
                                <div className="text-xs capitalize text-slate-500 dark:text-slate-400">
                                  {item.channel} · {item.sequence_node?.type}
                                </div>
                              </td>
                              <td className="px-4 py-3 align-top">
                                {renderStatusBadge(item.delivery?.status || '—')}
                                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  Engine: {item.delivery?.engine_status || '—'}
                                </div>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <div className="font-medium text-slate-800 dark:text-slate-200">
                                  {item.engagement?.type || '—'}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                  {item.engagement?.occurred_at
                                    ? new Date(item.engagement.occurred_at).toLocaleString()
                                    : 'No engagement yet'}
                                </div>
                                {item.engagement?.response_minutes !== null && (
                                  <div className="text-xs text-slate-500 dark:text-slate-400">
                                    Responded in {formatMinutes(item.engagement.response_minutes)}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 align-top">
                                <div className="text-sm text-slate-700 dark:text-slate-300">
                                  {item.delivery?.sent_at
                                    ? new Date(item.delivery.sent_at).toLocaleString()
                                    : '—'}
                                </div>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <div className="text-sm text-slate-700 dark:text-slate-300">
                                  {item.delivery?.last_event_at
                                    ? new Date(item.delivery.last_event_at).toLocaleString()
                                    : '—'}
                                </div>
                              </td>
                              <td className="px-4 py-3 align-top text-right">
                                <button
                                  type="button"
                                  onClick={() => handleOpenLead(item.lead?.id)}
                                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-blue-200 hover:text-blue-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
                                >
                                  Open Lead
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={7}
                              className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400"
                            >
                              {loading ? 'Loading interactions…' : 'No interactions match the current filters.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
                    <div>
                      Showing {formatNumber(pagination.offset + 1)}–
                      {formatNumber(Math.min(pagination.offset + pagination.count, pagination.total))} of{' '}
                      {formatNumber(pagination.total)}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onPaginate && onPaginate(pagination.prevOffset)}
                        disabled={!pagination.hasPrev || loading}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition-colors hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
                      >
                        <ChevronLeft size={16} />
                        Prev
                      </button>
                      <button
                        type="button"
                        onClick={() => onPaginate && onPaginate(pagination.nextOffset)}
                        disabled={!pagination.hasNext || loading}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition-colors hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
                      >
                        Next
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SequenceAnalyticsPanel;
