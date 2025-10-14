import React, { useMemo } from 'react';
import { Eye, Image as ImageIcon, Mail, MapPin, Phone, Sparkles } from 'lucide-react';

const ACTION_POINT_VALUES = {
  inspect: 5,
  sequence: 25,
  call: 15,
  email: 10,
};

const TOTAL_ACTION_POINTS = Object.values(ACTION_POINT_VALUES).reduce((sum, value) => sum + value, 0);

const URGENCY_LABELS = {
  critical: 'Critical',
  high: 'High',
  medium: 'Warm',
  normal: 'Fresh',
  unknown: 'Queued',
};

const URGENCY_BADGES = {
  critical: 'bg-red-500/20 text-red-200 border border-red-500/40',
  high: 'bg-amber-500/20 text-amber-200 border border-amber-500/40',
  medium: 'bg-yellow-500/20 text-yellow-200 border border-yellow-500/40',
  normal: 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/35',
  unknown: 'bg-slate-500/20 text-slate-200 border border-slate-500/35',
};

const MapBackground = ({ isDark }) => (
  <div
    className={`absolute inset-0 ${
      isDark
        ? 'bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900'
        : 'bg-gradient-to-br from-slate-100 via-white to-slate-200'
    }`}
  >
    <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.45),_transparent_55%)]" />
    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_bottom,_rgba(16,185,129,0.4),_transparent_55%)]" />
    <div className="absolute inset-0 mix-blend-overlay opacity-30 bg-[url('https://images.fishmouth.ai/demo/map-grid.png')]" />
  </div>
);

const generatePosition = (seed) => {
  if (!seed) return { top: '48%', left: '48%', hash: 0 };
  const hash = Array.from(seed.toString()).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const vertical = (hash % 60) + 18;
  const horizontal = ((hash * 7) % 70) + 18;
  return { top: `${vertical}%`, left: `${horizontal}%`, hash };
};

const formatLocation = (lead) => {
  if (!lead) return '';
  const parts = [lead.address, lead.city, lead.state].filter(Boolean);
  return parts.join(', ');
};

const getPreviewImage = (lead) => {
  if (!lead) return null;
  return (
    lead?.roof_intelligence?.roof_view?.image_url ||
    lead?.ai_analysis?.imagery?.normalized_view_url ||
    lead?.roof_intelligence?.overview?.image_url ||
    lead?.primary_image_url ||
    lead?.aerial_image_url ||
    lead?.image_url ||
    null
  );
};

const getHeatmapImage = (lead) => {
  if (!lead) return null;
  return (
    lead?.roof_intelligence?.heatmap?.url ||
    lead?.ai_analysis?.imagery?.heatmap_url ||
    lead?.heatmap_image_url ||
    null
  );
};

const DashboardLeadMap = ({
  leadEntries = [],
  clusters = [],
  onSelectLead,
  selectedLeadId,
  onOpenLead,
  onStartSequence,
  onCallLead,
  onSendEmail,
  maxVisible = 12,
  recentlyRewardedLeadId,
  isDark = false,
}) => {
  const entryList = useMemo(
    () => (leadEntries || []).filter((entry) => entry?.lead),
    [leadEntries]
  );

  const visibleEntries = useMemo(
    () => entryList.slice(0, Math.max(1, Math.min(entryList.length, maxVisible))),
    [entryList, maxVisible]
  );

  const featuredEntries = useMemo(() => visibleEntries.slice(0, 4), [visibleEntries]);
  const supplementalEntries = useMemo(() => visibleEntries.slice(4), [visibleEntries]);

  const selectedEntry = useMemo(() => {
    if (!visibleEntries.length) return null;
    if (!selectedLeadId) return visibleEntries[0];
    return (
      visibleEntries.find((entry) => Number(entry.lead?.id) === Number(selectedLeadId)) ||
      visibleEntries[0]
    );
  }, [visibleEntries, selectedLeadId]);

  const selectedLead = selectedEntry?.lead || null;
  const selectedIndex = selectedLead
    ? visibleEntries.findIndex((entry) => Number(entry.lead?.id) === Number(selectedLead.id))
    : -1;
  const selectedRank = selectedIndex >= 0 ? selectedIndex + 1 : null;

  const totalVisible = visibleEntries.length;
  const poolCount = entryList.length;
  const averageScore = totalVisible
    ? Math.round(
        visibleEntries.reduce(
          (acc, entry) => acc + Math.round(entry.lead?.lead_score || entry.lead?.score || 0),
          0
        ) / totalVisible
      )
    : 0;
  const criticalCount = visibleEntries.filter((entry) => entry.urgency?.level === 'critical').length;
  const highestScore = visibleEntries.reduce((max, entry) => {
    const score = Math.round(entry.lead?.lead_score || entry.lead?.score || 0);
    return score > max ? score : max;
  }, 0);

  const surfacePrimary = isDark ? 'border-slate-800 bg-slate-950/70 text-slate-100' : 'border-slate-200 bg-white';
  const surfaceSecondary = isDark ? 'border-slate-800 bg-slate-900/70 text-slate-100' : 'border-slate-200 bg-white';
  const subTextClass = isDark ? 'text-slate-400' : 'text-gray-500';
  const headerTextClass = isDark ? 'text-slate-100' : 'text-gray-900';

  const mapPoints = featuredEntries.map((entry) => entry.lead).filter(Boolean);

  const insightLines = useMemo(() => {
    if (!selectedLead) return [];
    const insights = [];
    if (selectedEntry?.urgency?.message) insights.push(selectedEntry.urgency.message);
    if (selectedLead.ai_analysis?.summary) insights.push(selectedLead.ai_analysis.summary);
    if (selectedLead.ai_analysis?.recommendation) insights.push(selectedLead.ai_analysis.recommendation);
    if (selectedLead.ai_analysis?.next_steps) insights.push(selectedLead.ai_analysis.next_steps);
    if (Array.isArray(selectedLead.roof_intelligence?.alerts)) {
      insights.push(
        ...selectedLead.roof_intelligence.alerts
          .map((alert) => alert?.message)
          .filter(Boolean)
      );
    }
    return insights.filter(Boolean).slice(0, 4);
  }, [selectedLead, selectedEntry]);

  const handleSelectEntry = (entry) => {
    if (!entry?.lead) return;
    onSelectLead?.(entry.lead);
  };

  const findEntryByLeadId = (leadId) =>
    visibleEntries.find((entry) => Number(entry.lead?.id) === Number(leadId));

  return (
    <section className={`rounded-[32px] border ${surfacePrimary} shadow-xl`}>
      <div className="px-6 py-6 lg:px-8 lg:py-7 space-y-6">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-blue-500/80">Priority radar</p>
            <h2 className={`text-2xl font-semibold ${headerTextClass}`}>Hot lead command center</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${
                isDark ? 'bg-slate-800/70 text-emerald-200' : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {totalVisible.toLocaleString()} showing
            </span>
            <span className={subTextClass}>Pool {poolCount.toLocaleString()}</span>
            <span className={subTextClass}>Avg score {averageScore}</span>
            <span className={subTextClass}>Critical {criticalCount}</span>
            <span className={subTextClass}>Peak {highestScore}</span>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)] items-stretch">
          <div
            className={`relative rounded-3xl overflow-hidden border h-full min-h-[320px] ${
              isDark ? 'border-slate-800/70' : 'border-slate-200/80'
            } shadow-lg`}
          >
            <MapBackground isDark={isDark} />
            <div className="absolute inset-0">
              {clusters.slice(0, 5).map((cluster, idx) => {
                const position = generatePosition(cluster?.area_name || idx);
                return (
                  <div
                    key={`cluster-${cluster?.id || idx}`}
                    style={{ top: position.top, left: position.left }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 text-[11px]"
                  >
                    <div
                      className={`px-2 py-1 rounded-full shadow ${
                        isDark ? 'bg-emerald-500/20 text-emerald-200' : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {cluster?.area_name || cluster?.city || 'Storm pocket'}
                    </div>
                  </div>
                );
              })}
              {mapPoints.map((lead, idx) => {
                if (!lead) return null;
                const seed = lead?.zip_code || lead?.address || lead?.city || idx;
                const position = generatePosition(seed);
                const isActive =
                  selectedLead && Number(selectedLead.id) === Number(lead?.id);
                const isRewarded =
                  recentlyRewardedLeadId != null &&
                  Number(recentlyRewardedLeadId) === Number(lead?.id);
                return (
                  <button
                    type="button"
                    key={`map-lead-${lead?.id || idx}`}
                    style={{ top: position.top, left: position.left }}
                    onClick={() => {
                      const entry = findEntryByLeadId(lead?.id);
                      handleSelectEntry(entry || { lead });
                    }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-3 py-1.5 text-xs font-semibold shadow-xl transition ${
                      isActive
                        ? 'bg-blue-600 text-white scale-110 shadow-blue-400/40'
                        : isDark
                        ? 'bg-slate-900/80 text-slate-100 hover:bg-blue-500/80 hover:text-white'
                        : 'bg-white/95 text-gray-700 hover:bg-blue-100 hover:text-blue-700'
                    } ${isRewarded ? 'ring-2 ring-emerald-400/70' : ''}`}
                  >
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {lead?.homeowner_name || lead?.name || lead?.address || `Lead ${lead?.id}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedLead && (
            <div className={`rounded-3xl border ${surfaceSecondary} p-5 shadow-lg flex flex-col gap-4 h-full`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide font-semibold">
                    {selectedLead.status || 'Hot lead'}
                  </p>
                  <h3 className="text-xl font-semibold truncate">
                    {selectedLead.homeowner_name || selectedLead.name || selectedLead.address}
                  </h3>
                  <p className={`text-xs ${subTextClass}`}>
                    {formatLocation(selectedLead)}{' '}
                    {selectedLead.zip_code ? `· ${selectedLead.zip_code}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-[11px] uppercase tracking-wide ${subTextClass}`}>Damage likelihood</span>
                  <p className="text-2xl font-bold text-amber-500">
                    {Math.round(
                      selectedLead.ai_analysis?.deal_probability ||
                        selectedLead.lead_score ||
                        selectedLead.score ||
                        0
                    )}
                    %
                  </p>
                  <p className={`text-[11px] ${subTextClass}`}>
                    Score {Math.round(selectedLead.lead_score || selectedLead.score || 0)}
                  </p>
                </div>
              </div>

              <div className="relative h-40 rounded-2xl overflow-hidden border border-slate-200/50 dark:border-slate-800/60 bg-slate-900/30">
                {(() => {
                  const previewImage = getPreviewImage(selectedLead);
                  const heatmapImage = getHeatmapImage(selectedLead);
                  if (!previewImage) {
                    return (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-sm opacity-80">
                        <ImageIcon className="w-5 h-5" />
                        Imagery syncing…
                      </div>
                    );
                  }
                  return (
                    <>
                      <img
                        src={previewImage}
                        alt={selectedLead.address || 'Lead imagery'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {heatmapImage && (
                        <img
                          src={heatmapImage}
                          alt="Damage heatmap overlay"
                          className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-70"
                          loading="lazy"
                        />
                      )}
                    </>
                  );
                })()}
                {selectedRank && (
                  <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-slate-950/70 px-2 py-0.5 text-[11px] font-semibold text-white">
                    #{selectedRank} priority
                  </span>
                )}
              </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                <div className={`rounded-2xl border ${surfaceSecondary} px-3 py-2`}>
                  <p className={`uppercase tracking-wide ${subTextClass}`}>Roof intel</p>
                  <p className="mt-1 font-semibold">
                    {(selectedLead.roof_condition || selectedLead.roof_condition_score != null)
                      ? `${selectedLead.roof_condition || ''} ${selectedLead.roof_condition_score ?? ''}`.trim()
                      : 'Awaiting scan'}
                  </p>
                </div>
                <div className={`rounded-2xl border ${surfaceSecondary} px-3 py-2`}>
                  <p className={`uppercase tracking-wide ${subTextClass}`}>Urgency</p>
                  <p className="mt-1 font-semibold capitalize">
                    {selectedEntry?.urgency?.level || selectedLead.replacement_urgency || 'Pending'}
                  </p>
                </div>
              </div>

              {insightLines.length > 0 && (
                <div className={`rounded-2xl border ${surfaceSecondary} px-3 py-3`}>
                  <p className={`text-xs uppercase tracking-wide font-semibold ${subTextClass}`}>AI insights</p>
                  <ul className="mt-2 space-y-1.5 text-xs">
                    {insightLines.map((line, index) => (
                      <li key={`insight-${index}`} className={isDark ? 'text-slate-200' : 'text-slate-700'}>
                        • {line}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

                <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  {
                    key: 'inspect',
                    label: 'Inspect lead',
                    icon: <Eye className="w-3.5 h-3.5" />,
                    action: () => onOpenLead?.(selectedLead),
                    disabled: false,
                    points: ACTION_POINT_VALUES.inspect,
                    tone: 'amber',
                  },
                  {
                    key: 'sequence',
                    label: 'Sequence',
                    icon: <Sparkles className="w-3.5 h-3.5" />,
                    action: () => onStartSequence?.(selectedLead),
                    disabled: false,
                    points: ACTION_POINT_VALUES.sequence,
                    tone: 'indigo',
                  },
                  {
                    key: 'call',
                    label: 'Call',
                    icon: <Phone className="w-3.5 h-3.5" />,
                    action: () => onCallLead?.(selectedLead),
                    disabled: !selectedLead.homeowner_phone && !selectedLead.phone,
                    points: ACTION_POINT_VALUES.call,
                    tone: 'emerald',
                  },
                  {
                    key: 'email',
                    label: 'Email',
                    icon: <Mail className="w-3.5 h-3.5" />,
                    action: () => onSendEmail?.(selectedLead),
                    disabled: !selectedLead.homeowner_email && !selectedLead.email,
                    points: ACTION_POINT_VALUES.email,
                    tone: 'blue',
                  },
                ].map((action) => (
                  <LeadAction
                    key={`detail-action-${action.key}`}
                    label={action.label}
                    icon={action.icon}
                    onClick={action.action}
                    disabled={action.disabled}
                    points={action.points}
                    tone={action.tone}
                    isDark={isDark}
                  />
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ${
                    isDark ? 'bg-slate-800/80 text-emerald-200' : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  Potential +{TOTAL_ACTION_POINTS} pts today
                </span>
                {selectedLead.damage_estimate && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ${
                      isDark ? 'bg-slate-800/70 text-slate-200' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Est. value ${Number(selectedLead.damage_estimate).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {featuredEntries.length > 0 && (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            {featuredEntries.map((entry, idx) => {
              const lead = entry.lead;
              if (!lead) return null;
              const previewImage = getPreviewImage(lead);
              const heatmapImage = getHeatmapImage(lead);
              const isActive =
                selectedLead && Number(selectedLead.id) === Number(lead.id);
              const isRewarded =
                recentlyRewardedLeadId != null &&
                Number(recentlyRewardedLeadId) === Number(lead.id);
              const urgencyLevel = entry.urgency?.level || 'unknown';
              const urgencyTone = URGENCY_BADGES[urgencyLevel] || URGENCY_BADGES.unknown;
              const urgencyLabel = URGENCY_LABELS[urgencyLevel] || URGENCY_LABELS.unknown;
              const score = Math.round(lead.lead_score || lead.score || 0);
              const probability = Math.round(
                lead.ai_analysis?.deal_probability || lead.lead_score || lead.score || 0
              );

              return (
                <article
                  key={`featured-card-${lead.id || idx}`}
                  tabIndex={0}
                  onClick={() => handleSelectEntry(entry)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleSelectEntry(entry);
                    }
                  }}
                  className={`rounded-3xl border ${surfaceSecondary} text-left shadow-lg transition hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 flex flex-col h-full min-h-[250px] ${
                    isActive ? 'ring-2 ring-blue-400/60' : ''
                  } ${isRewarded ? 'ring-2 ring-emerald-400/60' : ''}`}
                >
                  <div className="relative h-32 w-full overflow-hidden rounded-t-3xl">
                    {previewImage ? (
                      <img
                        src={previewImage}
                        alt={lead.address || 'Lead imagery'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[11px] opacity-70">
                        Imagery syncing…
                      </div>
                    )}
                    {heatmapImage && (
                      <img
                        src={heatmapImage}
                        alt="Heatmap overlay"
                        className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-70"
                        loading="lazy"
                      />
                    )}
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-950/70 px-2 py-0.5 text-[11px] font-semibold text-white">
                        #{idx + 1}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${urgencyTone}`}
                      >
                        {urgencyLabel}
                      </span>
                    </div>
                    <span
                      className={`absolute top-3 right-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        isDark ? 'bg-amber-500/25 text-amber-200' : 'bg-amber-100 text-amber-700'
                      } ${isRewarded ? 'animate-point-drain' : ''}`}
                    >
                      <Sparkles className="w-3 h-3" /> +{TOTAL_ACTION_POINTS}
                    </span>
                  </div>
                  <div className="p-5 space-y-3 flex flex-col h-full">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold ${headerTextClass} truncate`}>
                          {lead.homeowner_name || lead.name || lead.address}
                        </p>
                        <p className={`text-xs ${subTextClass} truncate`}>
                          {formatLocation(lead) || 'Address syncing'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-[11px] uppercase tracking-wide ${subTextClass}`}>Score</p>
                        <p className="text-base font-semibold text-amber-500">{score}</p>
                      </div>
                    </div>
                    <p className={`text-xs ${subTextClass} line-clamp-2`}>
                      {entry.urgency?.message || 'Line up crews now—this homeowner is ready for next steps.'}
                    </p>
                    <div className="flex items-center justify-between text-[11px] font-semibold">
                      <span className={`inline-flex items-center gap-1 ${subTextClass}`}>
                        Likelihood {probability}%
                      </span>
                      {lead.damage_estimate && (
                        <span className={`inline-flex items-center gap-1 ${subTextClass}`}>
                          Est. ${Number(lead.damage_estimate).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 mt-auto">
                      {[
                        {
                          key: 'inspect',
                          label: 'Inspect',
                          icon: <Eye className="w-3.5 h-3.5" />,
                          action: () => onOpenLead?.(lead),
                          disabled: false,
                          points: ACTION_POINT_VALUES.inspect,
                          tone: 'amber',
                        },
                        {
                          key: 'sequence',
                          label: 'Sequence',
                          icon: <Sparkles className="w-3.5 h-3.5" />,
                          action: () => onStartSequence?.(lead),
                          disabled: false,
                          points: ACTION_POINT_VALUES.sequence,
                          tone: 'indigo',
                        },
                        {
                          key: 'call',
                          label: 'Call',
                          icon: <Phone className="w-3.5 h-3.5" />,
                          action: () => onCallLead?.(lead),
                          disabled: !lead.homeowner_phone && !lead.phone,
                          points: ACTION_POINT_VALUES.call,
                          tone: 'emerald',
                        },
                        {
                          key: 'email',
                          label: 'Email',
                          icon: <Mail className="w-3.5 h-3.5" />,
                          action: () => onSendEmail?.(lead),
                          disabled: !lead.homeowner_email && !lead.email,
                          points: ACTION_POINT_VALUES.email,
                          tone: 'blue',
                        },
                      ].map((action) => (
                        <LeadAction
                          key={`${lead.id}-${action.key}`}
                          label={action.label}
                          icon={action.icon}
                          onClick={action.action}
                          disabled={action.disabled}
                          points={action.points}
                          tone={action.tone}
                          isDark={isDark}
                        />
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {supplementalEntries.length > 0 && (
          <div className="space-y-3 pt-3 border-t border-slate-200/70 dark:border-slate-800/70">
            <p className={`text-xs uppercase tracking-wide ${subTextClass}`}>More hot leads</p>
            <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
              {supplementalEntries.map((entry, idx) => {
                const lead = entry.lead;
                if (!lead) return null;
                const previewImage = getPreviewImage(lead);
                const heatmapImage = getHeatmapImage(lead);
                const score = Math.round(lead.lead_score || lead.score || 0);
                return (
                  <button
                    type="button"
                    key={`supplemental-card-${lead.id || idx}`}
                    onClick={() => handleSelectEntry(entry)}
                    className={`w-60 flex-shrink-0 rounded-3xl border ${surfaceSecondary} text-left shadow-sm transition hover:shadow-lg`}
                  >
                    <div className="relative h-28 w-full overflow-hidden rounded-t-3xl">
                      {previewImage ? (
                        <img
                          src={previewImage}
                          alt={lead.address || 'Lead imagery'}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[11px] opacity-70">
                          Imagery syncing…
                        </div>
                      )}
                      {heatmapImage && (
                        <img
                          src={heatmapImage}
                          alt="Heatmap overlay"
                          className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-70"
                          loading="lazy"
                        />
                      )}
                    </div>
                    <div className="p-4 space-y-2">
                      <p className={`text-sm font-semibold ${headerTextClass} truncate`}>
                        {lead.homeowner_name || lead.name || lead.address}
                      </p>
                      <p className={`text-[11px] ${subTextClass} truncate`}>
                        Score {score} • {URGENCY_LABELS[entry.urgency?.level || 'unknown']}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

function LeadAction({ label, icon, onClick, disabled, points, tone, isDark }) {
  const toneClasses = {
    amber: isDark
      ? 'bg-amber-500/15 text-amber-200 hover:bg-amber-500/25'
      : 'bg-amber-100 text-amber-700 hover:bg-amber-200',
    indigo: isDark
      ? 'bg-indigo-500/15 text-indigo-200 hover:bg-indigo-500/25'
      : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200',
    emerald: isDark
      ? 'bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
      : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
    blue: isDark
      ? 'bg-blue-500/15 text-blue-200 hover:bg-blue-500/25'
      : 'bg-blue-100 text-blue-700 hover:bg-blue-200',
  };

  const disabledClasses = isDark
    ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
    : 'bg-gray-100 text-gray-400 cursor-not-allowed';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition ${
        disabled
          ? disabledClasses
          : toneClasses[tone] ||
            (isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')
      }`}
    >
      <span className="inline-flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      {typeof points === 'number' && <span className="text-[11px] font-semibold">+{points}</span>}
    </button>
  );
}

export default DashboardLeadMap;
