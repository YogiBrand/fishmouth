import React, { useMemo } from 'react';
import { AlertTriangle, Clock, DollarSign, Mail, Mic, PhoneOff, Play, Sparkles, User, X } from 'lucide-react';

const defaultTurns = (summary) =>
  summary
    ? [
        {
          role: 'assistant',
          text: summary,
        },
      ]
    : [];

const buildTurns = (call, details) => {
  const source =
    details?.transcript_json?.turns ||
    call?.transcript_json?.turns ||
    details?.transcript_json ||
    call?.transcript_json;

  if (Array.isArray(source)) {
    return source;
  }

  if (source && Array.isArray(source.turns)) {
    return source.turns;
  }

  if (typeof details?.transcript === 'string' && details.transcript.trim()) {
    return defaultTurns(details.transcript);
  }

  if (typeof call?.ai_summary === 'string' && call.ai_summary.trim()) {
    return defaultTurns(call.ai_summary);
  }

  return [];
};

const formatDuration = (seconds) => {
  if (!seconds) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = Math.max(0, Math.round(seconds % 60));
  if (mins === 0) {
    return `${secs}s`;
  }
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
};

const formatCurrency = (value) => {
  if (value === undefined || value === null) {
    return '—';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(Number(value));
};

const capitalize = (value) => {
  if (!value) return '—';
  return value
    .replace(/[_-]/g, ' ')
    .split(' ')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
};

const VoiceTranscriptModal = ({
  call,
  details,
  loading,
  onClose,
  isDark = false,
  lead,
  onFollowUpCall,
  onSendEmail,
  onOpenChat,
  onDownloadTranscript,
}) => {
  const turns = useMemo(() => buildTurns(call, details), [call, details]);

  if (!call) return null;

  const meta = {
    outcome: details?.outcome || call?.outcome,
    interest: details?.interest_level || call?.interest_level,
    duration: details?.duration_seconds || call?.duration_seconds,
    totalCost: details?.total_cost ?? call?.total_cost ?? call?.call_cost,
    aiCost: details?.ai_cost ?? call?.ai_cost,
    latency: details?.first_audio_latency_ms || call?.first_audio_latency_ms,
    carrier: details?.carrier || call?.carrier,
  };

  const summary = details?.ai_summary || call?.ai_summary;
  const nextSteps = details?.next_steps || call?.next_steps;
  const recordingUrl = details?.recording_url || call?.recording_url;
  const leadEmail = details?.lead_email || call?.lead_email || lead?.homeowner_email || lead?.email;
  const leadPhone = details?.to_number || call?.to_number || lead?.homeowner_phone || lead?.phone;

  const surfaceClasses = isDark
    ? 'bg-slate-900 border border-slate-800 text-slate-50'
    : 'bg-white border border-gray-200 text-gray-900';

  const headerMuted = isDark ? 'text-slate-400' : 'text-gray-500';
  const divider = isDark ? 'border-slate-800' : 'border-gray-200';
  const bodyBg = isDark ? 'bg-slate-950/60' : 'bg-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm px-4">
      <div className={`w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden ${surfaceClasses}`}>
        <div className={`px-6 py-5 flex items-start justify-between gap-4 ${divider}`}>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Call transcript</h3>
            <p className={`text-sm ${headerMuted}`}>
              {call.lead_name || call.to_number || 'Unassigned lead'} ·{' '}
              {call.created_at ? new Date(call.created_at).toLocaleString() : 'Unknown start'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-lg transition ${
              isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
            aria-label="Close transcript viewer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className={`px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs ${divider}`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-3 py-1 rounded-full font-semibold ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'}`}>
              {capitalize(meta.conversation_state || call?.conversation_state || 'conversation')}
            </span>
            <span className={headerMuted}>Call ID: {call.id}</span>
            {leadPhone && <span className={headerMuted}>Dialed: {leadPhone}</span>}
            {leadEmail && <span className={headerMuted}>Email: {leadEmail}</span>}
          </div>
          <div className="flex items-center gap-2">
            {recordingUrl && (
              <a
                href={recordingUrl}
                target="_blank"
                rel="noreferrer"
                className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                  isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Download recording
              </a>
            )}
            <button
              type="button"
              onClick={() => {
                if (typeof onDownloadTranscript === 'function') {
                  onDownloadTranscript({ call, details, turns });
                } else {
                  const blob = new Blob([JSON.stringify({ call, details, transcript: turns }, null, 2)], {
                    type: 'application/json',
                  });
                  const url = URL.createObjectURL(blob);
                  const anchor = document.createElement('a');
                  anchor.href = url;
                  anchor.download = `voice-transcript-${call.id}.json`;
                  anchor.click();
                  URL.revokeObjectURL(url);
                }
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Export transcript
            </button>
          </div>
        </div>

        <div className={`px-6 py-3 flex flex-wrap items-center gap-3 text-sm ${divider} ${bodyBg}`}>
          <MetaChip icon={Play} label="Outcome" value={capitalize(meta.outcome)} isDark={isDark} />
          <MetaChip icon={Mic} label="Interest" value={capitalize(meta.interest)} isDark={isDark} tone="emerald" />
          <MetaChip icon={Clock} label="Duration" value={formatDuration(meta.duration)} isDark={isDark} />
          <MetaChip icon={DollarSign} label="Spend" value={formatCurrency(meta.totalCost)} isDark={isDark} />
          {meta.aiCost != null && (
            <MetaChip icon={DollarSign} label="AI" value={formatCurrency(meta.aiCost)} isDark={isDark} tone="purple" />
          )}
          {meta.latency != null && (
            <MetaChip
              icon={AlertTriangle}
              label="Latency"
              value={`${meta.latency.toLocaleString()} ms`}
              isDark={isDark}
              tone={meta.latency > 2500 ? 'amber' : 'slate'}
            />
          )}
          {meta.carrier && <MetaChip icon={User} label="Carrier" value={meta.carrier.toUpperCase()} isDark={isDark} />}
        </div>

        <div className={`px-6 py-4 space-y-4 text-sm leading-6 ${isDark ? 'bg-slate-950/40' : 'bg-white'}`}>
          {summary && (
            <div
              className={`rounded-2xl px-4 py-3 flex flex-col gap-2 ${
                isDark
                  ? 'bg-blue-500/10 border border-blue-500/20 text-slate-100'
                  : 'bg-blue-50 border border-blue-200 text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Play className="w-4 h-4" />
                AI Highlights
              </div>
              <p className="text-sm leading-relaxed">{summary}</p>
              {nextSteps && <p className="text-xs opacity-80">Next steps: {nextSteps}</p>}
            </div>
          )}

          <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
            {loading ? (
              <div className={`flex items-center justify-center h-48 ${headerMuted}`}>Loading transcript…</div>
            ) : turns.length === 0 ? (
              <div className={`flex flex-col items-center justify-center gap-2 h-48 ${headerMuted}`}>
                <PhoneOff className="w-5 h-5" />
                No transcript captured for this call.
              </div>
            ) : (
              turns.map((turn, index) => (
                <TranscriptTurn key={`${turn.role}-${index}`} turn={turn} isDark={isDark} />
              ))
            )}
          </div>

          <div className="border-t border-dashed border-slate-700/40 pt-4 flex flex-col gap-3">
            <span className={`text-xs font-semibold uppercase tracking-wide ${headerMuted}`}>Take action</span>
            <div className="flex flex-wrap items-center gap-2">
              <ActionChip
                label="Call lead"
                icon={<PhoneOff className="w-3.5 h-3.5" />}
                onClick={() => {
                  if (typeof onFollowUpCall === 'function') {
                    onFollowUpCall({ call, details, leadPhone, lead });
                  } else if (leadPhone) {
                    window.open(`tel:${leadPhone}`);
                  }
                }}
                disabled={!leadPhone && typeof onFollowUpCall !== 'function'}
                isDark={isDark}
              />
              <ActionChip
                label="Send email"
                icon={<Mail className="w-3.5 h-3.5" />}
                onClick={() => {
                  if (typeof onSendEmail === 'function') {
                    onSendEmail({ call, details, leadEmail, lead });
                  } else if (leadEmail) {
                    window.open(`mailto:${leadEmail}?subject=Following up on our call`);
                  }
                }}
                disabled={!leadEmail && typeof onSendEmail !== 'function'}
                isDark={isDark}
              />
              <ActionChip
                label="Open AI workspace"
                icon={<Sparkles className="w-3.5 h-3.5" />}
                onClick={() => {
                  if (typeof onOpenChat === 'function') {
                    onOpenChat({ call, details, lead });
                  } else {
                    console.info('AI workspace action not connected');
                  }
                }}
                isDark={isDark}
              />
            </div>
          </div>

          {recordingUrl && (
            <div className="border-t border-dashed border-slate-700/40 pt-4 space-y-2">
              <span className={`text-xs font-semibold uppercase tracking-wide ${headerMuted}`}>Call recording</span>
              <audio controls src={recordingUrl} className="w-full" preload="metadata">
                <track kind="captions" />
              </audio>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MetaChip = ({ icon: Icon, label, value, isDark, tone = 'slate' }) => {
  const palette = {
    slate: isDark ? 'bg-slate-800 text-slate-200' : 'bg-gray-100 text-gray-600',
    emerald: isDark ? 'bg-emerald-500/15 text-emerald-200' : 'bg-emerald-50 text-emerald-600',
    purple: isDark ? 'bg-purple-500/15 text-purple-200' : 'bg-purple-50 text-purple-600',
    amber: isDark ? 'bg-amber-500/20 text-amber-200' : 'bg-amber-50 text-amber-600',
  }[tone] || (isDark ? 'bg-slate-800 text-slate-200' : 'bg-gray-100 text-gray-600');

  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${palette}`}>
      <Icon className="w-3.5 h-3.5" />
      <span className="uppercase tracking-wide">{label}</span>
      <span className="opacity-90 capitalize">{value || '—'}</span>
    </span>
  );
};

const TranscriptTurn = ({ turn, isDark }) => {
  const isAgent = (turn.role || '').toLowerCase() === 'assistant' || (turn.role || '').toLowerCase() === 'agent';
  const heading = isAgent ? 'AI Agent' : 'Lead';
  const bubbleClass = isAgent
    ? isDark
      ? 'bg-blue-500/15 border border-blue-500/20 text-slate-100'
      : 'bg-blue-50 border border-blue-200 text-gray-800'
    : isDark
    ? 'bg-slate-900/60 border border-slate-800 text-slate-100'
    : 'bg-white border border-gray-200 text-gray-800';

  return (
    <div className={`rounded-2xl px-4 py-3 shadow-sm backdrop-blur-sm ${bubbleClass}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${isAgent ? 'bg-blue-500' : 'bg-emerald-500'}`} />
          <span className="text-sm font-semibold">{heading}</span>
        </div>
        {turn.audio_url && (
          <audio controls src={turn.audio_url} className="w-40" preload="metadata">
            <track kind="captions" />
          </audio>
        )}
      </div>
      {turn.text && (
        <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap">{turn.text}</p>
      )}
      {!turn.text && turn.content && (
        <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap">{turn.content}</p>
      )}
    </div>
  );
};

const ActionChip = ({ label, icon, onClick, isDark, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold transition ${
      disabled
        ? isDark
          ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed'
          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        : isDark
        ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }`}
  >
    {icon}
    {label}
  </button>
);

export default VoiceTranscriptModal;
