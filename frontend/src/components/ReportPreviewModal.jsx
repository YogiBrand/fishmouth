import React, { useMemo } from 'react';
import { ArrowRight, FileText, MapPin, Sparkles, X } from 'lucide-react';

const ReportPreviewModal = ({ template, lead, onClose, onGenerate, isDark = false }) => {
  const businessProfile = useMemo(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = window.localStorage.getItem('businessProfile');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to load business profile for report preview', error);
      return null;
    }
  }, []);

  const toTitle = (value) =>
    typeof value === 'string'
      ? value
          .split('_')
          .join(' ')
          .replace(/\b\w/g, (char) => char.toUpperCase())
      : value;

  const homeownerSignals = useMemo(() => {
    const insights = [];
    if (!lead) return insights;
    if (lead.replacement_urgency || lead.priority) {
      insights.push(
        `Roof flagged as ${toTitle(lead.replacement_urgency || lead.priority)} — position a rapid follow-up window.`
      );
    }
    if (Array.isArray(lead.damage_indicators) && lead.damage_indicators.length) {
      insights.push(
        `AI detected ${lead.damage_indicators.slice(0, 3).map(toTitle).join(', ')} — bring matching photos to reinforce the risk.`
      );
    }
    if (lead.roof_age_years && Number(lead.roof_age_years) >= 15) {
      insights.push(`Roof age is ${lead.roof_age_years}+ years — highlight manufacturer warranty cliffs and code upgrades.`);
    }
    if (lead.last_contact) {
      insights.push(
        `Last engagement was ${new Date(lead.last_contact).toLocaleDateString()} — reopen the conversation with upgraded visuals.`
      );
    }
    return insights;
  }, [lead]);

  if (!template || !lead) return null;

  const brandPalette = businessProfile?.branding || {};
  const accentColor = brandPalette.accentColor || '#f59e0b';
  const persona = businessProfile?.company?.tagline || 'Exterior restoration specialists';

  const container = isDark
    ? 'bg-slate-900 text-slate-100 border border-slate-800'
    : 'bg-white text-gray-900 border border-gray-200';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm px-4">
      <div className={`w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden ${container}`}>
        <div className={`flex items-start justify-between gap-4 px-6 py-5 ${isDark ? 'border-b border-slate-800' : 'border-b border-gray-200'}`}>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wide font-semibold">
              <FileText className={isDark ? 'text-blue-300' : 'text-blue-500'} size={14} />
              Template preview
            </div>
            <h3 className="text-2xl font-semibold mt-1">{template.name}</h3>
            <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{template.description}</p>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em]" style={{ color: accentColor }}>
              <span>{persona}</span>
              {template.landingHook && (
                <>
                  <span className={isDark ? 'text-slate-600' : 'text-gray-300'}>•</span>
                  <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>{template.landingHook}</span>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-lg transition ${
              isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            aria-label="Close report preview"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 text-sm leading-6 overflow-y-auto">
          <div className={`rounded-2xl px-4 py-3 border ${
            isDark ? 'border-slate-800 bg-slate-900/60' : 'border-gray-200 bg-slate-50'
          }`}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2">Lead context</p>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div>
                <p className="font-semibold">{lead.homeowner_name || lead.address}</p>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{lead.address}, {lead.city}, {lead.state}</p>
              </div>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                isDark ? 'bg-slate-800 text-slate-200' : 'bg-gray-100 text-gray-600'
              }`}>
                <MapPin className="w-3 h-3" /> Score {Math.round(lead.lead_score || lead.score || 0)}
              </span>
              {lead.replacement_urgency && (
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                  isDark ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-100 text-amber-600'
                }`}>
                  {lead.replacement_urgency.replace('_', ' ')}
                </span>
              )}
            </div>
          </div>

          {lead.aerial_image_url && (
            <div className="rounded-2xl overflow-hidden border border-slate-200/60 dark:border-slate-800/60">
              <img src={lead.aerial_image_url} alt={`Roof of ${lead.address}`} className="w-full h-48 object-cover" loading="lazy" />
            </div>
          )}

          <div className={`rounded-2xl px-4 py-3 border ${
            isDark ? 'border-slate-800 bg-slate-900/60' : 'border-gray-200 bg-white'
          }`}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2">Included sections</p>
            <ul className={`text-sm space-y-1.5 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
              {template.sections?.map((section) => (
                <li key={`${template.id}-${section}`} className="flex items-center gap-2">
                  <Sparkles className={isDark ? 'text-blue-300' : 'text-blue-500'} size={14} />
                  {section}
                </li>
              ))}
            </ul>
          </div>

          {(homeownerSignals.length > 0 || template.homeownerPainPoints?.length || template.rooferAngles?.length) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(template.homeownerPainPoints?.length || homeownerSignals.length) && (
                <div
                  className={`rounded-2xl px-4 py-3 border ${
                    isDark ? 'border-rose-500/25 bg-rose-500/10 text-rose-100' : 'border-rose-200 bg-rose-50 text-rose-600'
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2">Homeowner hot buttons</p>
                  <ul className="text-sm space-y-1.5 leading-snug">
                    {template.homeownerPainPoints?.map((point) => (
                      <li key={`${template.id}-detail-${point}`}>• {point}</li>
                    ))}
                    {homeownerSignals.map((signal) => (
                      <li key={`signal-${signal}`}>• {signal}</li>
                    ))}
                  </ul>
                </div>
              )}
              {template.rooferAngles?.length && (
                <div
                  className={`rounded-2xl px-4 py-3 border ${
                    isDark ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100' : 'border-emerald-200 bg-emerald-50 text-emerald-600'
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2">Crew advantage</p>
                  <ul className="text-sm space-y-1.5 leading-snug">
                    {template.rooferAngles.map((angle) => (
                      <li key={`${template.id}-advantage-${angle}`}>• {angle}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className={`rounded-2xl px-4 py-3 border ${
            isDark ? 'border-slate-800 bg-slate-900/60' : 'border-gray-200 bg-white'
          }`}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2">Preview excerpt</p>
            <p className={`text-sm leading-6 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
              {lead.ai_analysis?.summary || 'AI summary will appear here once imagery analysis completes.'}
            </p>
          </div>
        </div>

        <div className={`px-6 py-4 border-t ${isDark ? 'border-slate-800 bg-slate-900/70' : 'border-gray-200 bg-gray-50'} flex flex-wrap items-center justify-between gap-3`}>
          <div className="flex-1 min-w-[60%]">
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Reports render in the background and deliver a shareable PDF to the notifications center.
            </p>
            {template.recommendedCTA && (
              <p className={`text-[11px] mt-1 ${isDark ? 'text-emerald-200' : 'text-emerald-600'}`}>
                Recommended next move: {template.recommendedCTA}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              onGenerate?.();
              onClose?.();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold"
          >
            Generate for {lead.homeowner_name || lead.address}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportPreviewModal;
