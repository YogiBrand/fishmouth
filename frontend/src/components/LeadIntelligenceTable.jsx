import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bot,
  Clock,
  Eye,
  FileText,
  MapPin,
  Mail,
  Phone,
  Thermometer,
  Image as ImageIcon,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import { getLeadUrgency, formatLeadAgeLabel, resolveLeadCreatedAt } from '../utils/leads';

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
};

const pickRoofIntel = (lead) =>
  lead?.roof_intelligence ||
  lead?.ai_analysis?.enhanced_roof_intelligence ||
  lead?.ai_analysis?.roof_intelligence ||
  null;

const gatherAnomalies = (lead, roofIntel) => {
  const roofAnomalies = asArray(roofIntel?.anomalies);
  const streetViewAnomalies = asArray(roofIntel?.street_view).flatMap((view) =>
    asArray(view?.anomalies).map((anomaly) => ({
      ...anomaly,
      heading: view?.heading,
      context: 'street_view',
    }))
  );
  const aiAnomalies = asArray(lead?.ai_analysis?.damage_indicators).map((indicator) => ({
    type: indicator,
    probability: 0.6,
    context: 'ai_analysis',
  }));
  return [...roofAnomalies, ...streetViewAnomalies, ...aiAnomalies];
};

const normalizeProbability = (value) => {
  if (value == null) return null;
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return null;
  if (numeric <= 1) return Math.round(numeric * 100);
  return Math.round(Math.min(numeric, 100));
};

const selectPrimaryImagery = (lead) => {
  const roofIntel = pickRoofIntel(lead);
  const aiImagery = lead?.ai_analysis?.imagery || {};
  const baseImage =
    roofIntel?.roof_view?.image_url ||
    roofIntel?.imagery?.public_url ||
    aiImagery?.normalized_view_url ||
    lead?.aerial_image_url ||
    null;
  const overlay = roofIntel?.heatmap?.url || aiImagery?.heatmap_url || null;
  const mask = roofIntel?.roof_view?.mask_url || null;
  const anomalies = gatherAnomalies(lead, roofIntel);
  const primary = anomalies.reduce((best, anomaly) => {
    const probability = normalizeProbability(anomaly?.probability ?? anomaly?.confidence);
    if (!best || (probability ?? 0) > (best.probability ?? 0)) {
      return {
        ...anomaly,
        probability,
      };
    }
    return best;
  }, null);
  const label =
    primary?.type?.replace(/_/g, ' ') ||
    (lead?.damage_indicators?.[0]?.replace(/_/g, ' ') ?? 'AI highlight');

  return {
    baseImage,
    overlay,
    mask,
    label,
    probability: primary?.probability ?? null,
    anomaly: primary,
    roofIntel,
  };
};

const qualityBadge = (status = 'pending', isDark) => {
  const palette = {
    passed: isDark ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    review: isDark ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'bg-amber-100 text-amber-700 border border-amber-200',
    failed: isDark ? 'bg-red-500/15 text-red-300 border border-red-500/30' : 'bg-red-100 text-red-700 border border-red-200',
    pending: isDark ? 'bg-slate-700 text-slate-200 border border-slate-600' : 'bg-gray-100 text-gray-600 border border-gray-200',
  };
  return palette[status] || palette.pending;
};

const scoreBadge = (score = 0) => {
  if (score >= 90) return 'bg-red-500/15 text-red-400 border border-red-500/30';
  if (score >= 80) return 'bg-orange-500/15 text-orange-400 border border-orange-500/30';
  if (score >= 70) return 'bg-yellow-500/15 text-yellow-500 border border-yellow-500/30';
  return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
};

const urgencyBadge = (level = 'normal', isDark) => {
  const palette = {
    critical: isDark
      ? 'bg-red-500/20 text-red-200 border border-red-500/40'
      : 'bg-red-100 text-red-700 border border-red-200',
    high: isDark
      ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
      : 'bg-amber-100 text-amber-700 border border-amber-200',
    medium: isDark
      ? 'bg-yellow-500/15 text-yellow-200 border border-yellow-500/30'
      : 'bg-yellow-100 text-yellow-700 border border-yellow-200',
    normal: isDark
      ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30'
      : 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    unknown: isDark
      ? 'bg-slate-800 text-slate-200 border border-slate-700'
      : 'bg-slate-100 text-slate-600 border border-slate-200',
  };
  return palette[level] || palette.normal;
};

const urgencyLabel = (level = 'normal') => {
  switch (level) {
    case 'critical':
      return 'Critical';
    case 'high':
      return 'Urgent';
    case 'medium':
      return 'Soon';
    case 'unknown':
      return 'Unknown';
    default:
      return 'Fresh';
  }
};

const viewToggleButton = (isActive, isDark) =>
  `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
    isActive
      ? 'bg-blue-600 text-white shadow-sm'
      : isDark
      ? 'text-slate-300 hover:text-white hover:bg-slate-800'
      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
  }`;

const LeadIntelligenceTable = ({
  leads = [],
  isDark = false,
  onGenerateReport,
  onViewDetails,
  onCallLead,
  onInspectImagery,
  onAssignSequence = () => {},
}) => {
  const [sortKey, setSortKey] = useState('lead_score');
  const [sortDir, setSortDir] = useState('desc');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('table'); // table | cards

  const metrics = useMemo(() => {
    const total = leads.length;
    const avgScore = total ? Math.round(leads.reduce((sum, lead) => sum + (lead.lead_score || 0), 0) / total) : 0;
    const reviewCount = leads.filter(
      (lead) => (lead.quality_validation_status || '').toLowerCase() === 'review'
    ).length;
    const failedQuality = leads.filter(
      (lead) => (lead.quality_validation_status || '').toLowerCase() === 'failed'
    ).length;
    const imageryReady = leads.filter((lead) => lead.image_quality_score != null).length;
    return { total, avgScore, reviewCount, failedQuality, imageryReady };
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const term = search.trim().toLowerCase();
    const base = term
      ? leads.filter((lead) => {
          const address = `${lead.address || ''} ${lead.city || ''} ${lead.state || ''}`.toLowerCase();
          const name = `${lead.homeowner_name || ''}`.toLowerCase();
          return address.includes(term) || name.includes(term);
        })
      : leads;

    const sortValueForLead = (lead, key) => {
      if (key === 'response_priority') {
        const urgency = getLeadUrgency(resolveLeadCreatedAt(lead));
        return urgency?.hoursOld ?? 0;
      }
      return lead?.[key] ?? 0;
    };

    const sorted = [...base].sort((a, b) => {
      const lhs = sortValueForLead(a, sortKey);
      const rhs = sortValueForLead(b, sortKey);
      if (lhs === rhs) return 0;
      return sortDir === 'asc' ? lhs - rhs : rhs - lhs;
    });
    return sorted;
  }, [leads, search, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  return (
    <div className={`rounded-3xl ${isDark ? 'bg-slate-900/70 border border-slate-800' : 'bg-white border border-gray-200'} p-6`}>
      {/* Summary */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6 mb-6">
        <div>
          <h3 className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Lead Intelligence</h3>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            {metrics.total} leads in scope • {metrics.reviewCount} flagged for review • {metrics.failedQuality} require new imagery.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className={viewToggleButton(viewMode === 'table', isDark)}
            onClick={() => setViewMode('table')}
          >
            Table
          </button>
          <button
            className={viewToggleButton(viewMode === 'cards', isDark)}
            onClick={() => setViewMode('cards')}
          >
            Cards
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        <KpiCard
          icon={<Activity className="w-4 h-4" />}
          label="Average score"
          value={`${metrics.avgScore}/100`}
          isDark={isDark}
        />
        <KpiCard
          icon={<Bot className="w-4 h-4" />}
          label="Imagery ready"
          value={`${metrics.imageryReady}/${metrics.total}`}
          sub="High-res roof tiles captured"
          isDark={isDark}
        />
        <KpiCard
          icon={<AlertTriangle className="w-4 h-4" />}
          label="Needs review"
          value={metrics.reviewCount}
          sub="Imagery flagged for manual validation"
          tone="warning"
          isDark={isDark}
        />
        <KpiCard
          icon={<AlertCircle className="w-4 h-4" />}
          label="Quality failures"
          value={metrics.failedQuality}
          sub="Imagery failed guardrails"
          tone="danger"
          isDark={isDark}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
        <div className="flex items-center gap-2 flex-1">
          <input
            className={`w-full rounded-lg px-4 py-2 text-sm ${
              isDark
                ? 'border border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/30'
                : 'border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500/20'
            }`}
            placeholder="Search by address or homeowner"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button
            className={`text-xs font-medium px-3 py-2 rounded-lg ${
              isDark ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
            }`}
            onClick={() => setSearch('')}
          >
            Clear
          </button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className={`${isDark ? 'border border-slate-800 rounded-2xl' : 'border border-gray-200 rounded-2xl'}`}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className={isDark ? 'bg-slate-900/80 text-slate-300 border-b border-slate-700' : 'bg-slate-50 text-gray-700 border-b border-gray-200'}>
                <tr>
                  <th className="px-6 py-3 text-left font-semibold uppercase tracking-wide text-[11px]">Risk preview</th>
                  <SortableHeader label="Score" field="lead_score" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} isDark={isDark} />
                  <SortableHeader label="Response Priority" field="response_priority" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} isDark={isDark} />
                  <th className="px-6 py-3 text-left font-semibold uppercase tracking-wide text-[11px] whitespace-nowrap">Lead</th>
                  <SortableHeader label="Roof age" field="roof_age_years" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} isDark={isDark} />
                  <th className="px-6 py-3 text-left font-semibold uppercase tracking-wide text-[11px] whitespace-nowrap">AI intelligence</th>
                  <th className="px-6 py-3 text-left font-semibold uppercase tracking-wide text-[11px] whitespace-nowrap">Data quality</th>
                  <th className="px-6 py-3 text-right font-semibold uppercase tracking-wide text-[11px] whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className={isDark ? 'bg-slate-900 text-slate-100 divide-y divide-slate-800' : 'bg-white text-gray-900 divide-y divide-gray-200'}>
                {filteredLeads.map((lead) => {
                const qualityStatus = (lead.quality_validation_status || lead.ai_analysis?.imagery?.quality_status || 'pending').toLowerCase();
                const streetAngles = lead.street_view_quality?.angles_captured || lead.ai_analysis?.street_view?.length || 0;
                const heatmapUrl = lead.roof_intelligence?.heatmap?.url || lead.ai_analysis?.imagery?.heatmap_url;
                const imagery = selectPrimaryImagery(lead);
                const createdAt = resolveLeadCreatedAt(lead);
                const urgency = getLeadUrgency(createdAt);
                const ageLabel = formatLeadAgeLabel(urgency.hoursOld);

                return (
                  <tr
                    key={lead.id}
                    onDoubleClick={() => onViewDetails?.(lead)}
                    className={`transition ${isDark ? 'odd:bg-slate-900/40 even:bg-slate-900/20 hover:bg-slate-800/60' : 'odd:bg-white even:bg-slate-50 hover:bg-blue-50'}`}
                  >
                    <td className="px-6 py-4 align-top">
                      <ImageryThumbnail imagery={imagery} isDark={isDark} />
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className={`inline-flex items-center justify-center px-3 py-1 text-xs font-semibold rounded-full border ${scoreBadge(lead.lead_score)}`}>
                        {Math.round(lead.lead_score || 0)}
                      </div>
                      <div className={`text-xs mt-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{(lead.priority || '').toString()}</div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${urgencyBadge(urgency.level, isDark)}`}>
                        {urgencyLabel(urgency.level)}
                      </div>
                      <div className={`flex items-center gap-2 mt-2 text-xs font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                        <Clock className="w-3.5 h-3.5" />
                        <span>{ageLabel}</span>
                        {urgency.level === 'critical' && <AlertTriangle className="w-3 h-3 text-red-500" />}
                      </div>
                      <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {urgency.message}
                      </p>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex items-start gap-2">
                        <MapPin className={`w-4 h-4 mt-1 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
                        <div>
                          <button
                            type="button"
                            onClick={() => onViewDetails?.(lead)}
                            className={`font-semibold ${isDark ? 'text-white hover:text-blue-300' : 'text-gray-900 hover:text-blue-600'}`}
                          >
                            {lead.address}
                          </button>
                          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                            {lead.city}, {lead.state} {lead.zip_code}
                          </p>
                          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'} mt-1`}>
                            {lead.homeowner_name || 'Unnamed homeowner'}
                          </p>
                          <div className="flex gap-2 text-xs mt-2">
                            {lead.homeowner_phone && (
                              <button
                                onClick={() => onCallLead?.(lead)}
                                className="text-blue-500 hover:text-blue-400"
                              >
                                {lead.homeowner_phone}
                              </button>
                            )}
                            {lead.homeowner_email && (
                              <button
                                type="button"
                                onClick={() => window.open(`mailto:${lead.homeowner_email}`)}
                                className={`${isDark ? 'text-slate-400 hover:text-blue-300' : 'text-gray-500 hover:text-blue-600'}`}
                              >
                                • {lead.homeowner_email}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className={`text-sm ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
                        {lead.roof_age_years ? `${lead.roof_age_years} yrs` : '—'}
                      </div>
                      <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        Condition: {lead.roof_condition_score ?? '—'}/100
                      </div>
                      <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        Material: {lead.roof_material || 'Unknown'}
                      </div>
                      <div className={`text-xs flex items-center gap-1 mt-2 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                        <Bot className="w-3 h-3" />
                        {lead.ai_analysis?.summary || 'AI summary coming soon'}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${qualityBadge(qualityStatus, isDark)}`}>
                        {qualityStatus.toUpperCase()}
                        {lead.image_quality_score != null && (
                          <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{Math.round(lead.image_quality_score)}</span>
                        )}
                      </div>
                      {lead.image_quality_issues?.length > 0 && (
                        <ul className={`mt-2 text-xs space-y-1 ${isDark ? 'text-amber-300' : 'text-amber-600'}`}>
                          {lead.image_quality_issues.map((issue) => (
                            <li key={issue}>• {issue.replace(/_/g, ' ')}</li>
                          ))}
                        </ul>
                      )}
                      <div className={`mt-2 text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {streetAngles > 0 ? `${streetAngles} street-view angles captured` : 'Pending curbside validation'}
                      </div>
                      {heatmapUrl && (
                        <button
                          onClick={() => onInspectImagery?.(lead)}
                          className="mt-2 inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-400"
                        >
                          <ImageIcon className="w-3 h-3" />
                          Open heatmap
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 align-top whitespace-nowrap">
                      <div className="flex flex-wrap justify-end gap-2 text-xs">
                        <button
                          onClick={() => onViewDetails?.(lead)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-purple-200 text-purple-600 hover:text-purple-500 hover:border-purple-300"
                        >
                          <Eye className="w-3 h-3" /> Details
                        </button>
                        <button
                          onClick={() => onGenerateReport?.(lead.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-blue-200 text-blue-600 hover:text-blue-500 hover:border-blue-300"
                        >
                          <FileText className="w-3 h-3" /> Report
                        </button>
                        <button
                          onClick={() => onAssignSequence?.(lead)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-indigo-200 text-indigo-600 hover:text-indigo-500 hover:border-indigo-300"
                        >
                          <Mail className="w-3 h-3" /> Sequence
                        </button>
                        <button
                          onClick={() => onCallLead?.(lead)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-emerald-200 text-emerald-600 hover:text-emerald-500 hover:border-emerald-300"
                        >
                          <Phone className="w-3 h-3" /> Call
                        </button>
                      </div>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredLeads.map((lead) => {
            const qualityStatus = (lead.quality_validation_status || lead.ai_analysis?.imagery?.quality_status || 'pending').toLowerCase();
            const damageIndicators = lead.damage_indicators || lead.ai_analysis?.damage_indicators || [];
            const streetAngles = lead.street_view_quality?.angles_captured || lead.ai_analysis?.street_view?.length || 0;
            const imagery = selectPrimaryImagery(lead);
            const createdAt = resolveLeadCreatedAt(lead);
            const urgency = getLeadUrgency(createdAt);
            const ageLabel = formatLeadAgeLabel(urgency.hoursOld);

            return (
              <div
                key={`card-${lead.id}`}
                className={`rounded-3xl border transition-shadow hover:shadow-xl ${
                  isDark ? 'border-slate-800 bg-slate-900/80 text-slate-100' : 'border-gray-200 bg-white text-gray-900'
                }`}
              >
                <div className="relative overflow-hidden rounded-t-3xl border-b border-white/10">
                  <div className="relative aspect-video">
                    {imagery.baseImage ? (
                      <>
                        <img
                          src={imagery.baseImage}
                          alt={`${lead.address} aerial`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {imagery.overlay && (
                          <img
                            src={imagery.overlay}
                            alt="AI damage heatmap overlay"
                            className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-85"
                            loading="lazy"
                          />
                        )}
                        {imagery.mask && (
                          <img
                            src={imagery.mask}
                            alt="AI damage mask overlay"
                            className="absolute inset-0 w-full h-full object-cover mix-blend-lighten opacity-75"
                            loading="lazy"
                          />
                        )}
                      </>
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center text-sm ${isDark ? 'bg-slate-800 text-slate-500' : 'bg-gray-100 text-gray-500'}`}>
                        Imagery pending
                      </div>
                    )}
                    <div className="absolute top-3 left-3 inline-flex items-center gap-2 px-3 py-1 text-[11px] font-semibold rounded-full bg-slate-900/85 text-white backdrop-blur">
                      <ImageIcon className="w-3 h-3" />
                      {imagery.label}
                      {imagery.probability != null && <span className="text-emerald-300">{imagery.probability}%</span>}
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className={`text-xs mb-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${scoreBadge(lead.lead_score)}`}>
                        Score {Math.round(lead.lead_score || 0)}
                      </div>
                      <h4 className="font-semibold text-lg">{lead.address}</h4>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {lead.city}, {lead.state}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${urgencyBadge(urgency.level, isDark)}`}>
                          {urgencyLabel(urgency.level)}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                          <Clock className="w-3 h-3" />
                          {ageLabel}
                        </span>
                      </div>
                      <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{urgency.message}</p>
                    </div>
                    <button
                      onClick={() => onCallLead?.(lead)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-full bg-blue-600 text-white hover:bg-blue-500"
                    >
                      Call
                    </button>
                  </div>
                  <div className="mt-4 space-y-2 text-sm">
                    <div className={`text-xs ${qualityBadge(qualityStatus, isDark)} inline-flex items-center gap-1 px-2 py-0.5 rounded-full`}>
                      Quality {qualityStatus}
                    </div>
                    <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      Roof age {lead.roof_age_years || '—'} years • Condition {lead.roof_condition_score ?? '—'}/100
                    </p>
                    <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      Imagery status: {streetAngles > 0 ? `${streetAngles} street angles` : 'Awaiting capture'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {damageIndicators.slice(0, 3).map((indicator) => (
                        <span
                          key={`${lead.id}-${indicator}`}
                          className="text-[11px] inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400"
                        >
                          <ShieldAlert className="w-3 h-3" />
                          {indicator.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3 text-xs font-medium">
                    <button
                      onClick={() => onViewDetails?.(lead)}
                      className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-400"
                    >
                      <Eye className="w-3 h-3" /> View
                    </button>
                    <button
                      onClick={() => onGenerateReport?.(lead.id)}
                      className="inline-flex items-center gap-1 text-slate-400 hover:text-blue-400"
                    >
                      <FileText className="w-3 h-3" /> Report
                    </button>
                    <button
                      onClick={() => onAssignSequence?.(lead)}
                      className="inline-flex items-center gap-1 text-indigo-500 hover:text-indigo-400"
                    >
                      <Mail className="w-3 h-3" /> Sequence
                    </button>
                    <span className={`inline-flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      <Thermometer className="w-3 h-3" />
                      {lead.replacement_urgency?.replace('_', ' ') || 'urgency TBD'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const SortableHeader = ({ label, field, sortKey, sortDir, onSort, isDark }) => {
  const isActive = sortKey === field;
  return (
    <th
      onClick={() => onSort(field)}
      className={`px-6 py-3 text-left font-semibold uppercase tracking-wide text-[11px] cursor-pointer select-none transition-colors ${
        isDark ? 'text-slate-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive && (
          <ArrowUpRight
            className={`w-3 h-3 ${isDark ? 'text-blue-400' : 'text-blue-600'} ${sortDir === 'desc' ? 'rotate-180' : ''}`}
          />
        )}
      </span>
    </th>
  );
};

const ImageryThumbnail = ({ imagery, isDark }) => {
  const { baseImage, overlay, mask, probability, label } = imagery || {};
  return (
    <div
      className={`relative w-28 h-20 rounded-xl overflow-hidden border ${
        isDark ? 'border-slate-800 bg-slate-900/60' : 'border-gray-200 bg-slate-50'
      }`}
    >
      {baseImage ? (
        <>
          <img src={baseImage} alt="Aerial roof preview" className="w-full h-full object-cover" loading="lazy" />
          {overlay && (
            <img
              src={overlay}
              alt="AI damage overlay"
              className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-85"
              loading="lazy"
            />
          )}
          {mask && (
            <img
              src={mask}
              alt="AI damage mask"
              className="absolute inset-0 w-full h-full object-cover mix-blend-lighten opacity-75"
              loading="lazy"
            />
          )}
        </>
      ) : (
        <div className={`w-full h-full flex items-center justify-center text-[10px] ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
          Imagery pending
        </div>
      )}
      <div
        className={`absolute bottom-1 left-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
          isDark ? 'bg-slate-900/80 text-slate-200' : 'bg-white/80 text-gray-700'
        }`}
      >
        {probability != null ? `${probability}% risk` : 'AI view'}
      </div>
      {label && (
        <div
          className={`absolute top-1 left-1 px-2 py-0.5 rounded-full text-[9px] ${
            isDark ? 'bg-blue-500/20 text-blue-200' : 'bg-blue-100 text-blue-600'
          }`}
        >
          {label}
        </div>
      )}
    </div>
  );
};

const KpiCard = ({ icon, label, value, sub, tone = 'default', isDark }) => {
  const palette = {
    default: isDark ? 'bg-slate-800/80 text-slate-200 border border-slate-700' : 'bg-gray-100 text-gray-700 border border-gray-200',
    warning: isDark ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30' : 'bg-amber-50 text-amber-600 border border-amber-100',
    danger: isDark ? 'bg-red-500/10 text-red-300 border border-red-500/30' : 'bg-red-50 text-red-600 border border-red-100',
  };
  const toneClasses = palette[tone] || palette.default;

  return (
    <div className={`rounded-2xl px-4 py-3 flex items-center gap-3 ${toneClasses}`}>
      <div className="p-2 bg-white/10 rounded-lg">{icon}</div>
      <div className="flex-1">
        <p className="text-xs uppercase tracking-wide">{label}</p>
        <p className="text-lg font-semibold">{value}</p>
        {sub && <p className="text-xs opacity-80">{sub}</p>}
      </div>
    </div>
  );
};

export default LeadIntelligenceTable;
