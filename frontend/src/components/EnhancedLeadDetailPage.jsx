import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  TrendingUp,
  Activity,
  CheckCircle,
  Home,
  FileText,
  PlayCircle,
  Layers,
  Image as ImageIcon,
  Sparkles,
  Camera,
  AlertTriangle,
  Compass,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import VoiceTranscriptModal from './VoiceTranscriptModal';
import LeadEmailModal from './LeadEmailModal';
import EnhancedReportGenerator from './EnhancedReportGenerator';
import { activityAPI, voiceAPI } from '../services/api';

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

const normalizeProbability = (value) => {
  if (value == null) return null;
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return null;
  if (numeric <= 1) return Math.round(numeric * 100);
  return Math.round(Math.min(numeric, 100));
};

const buildLeadImageryContext = (lead) => {
  const roofIntel = pickRoofIntel(lead);
  const aiImagery = lead?.ai_analysis?.imagery || {};
  const baseImage =
    roofIntel?.roof_view?.image_url ||
    roofIntel?.imagery?.public_url ||
    aiImagery?.normalized_view_url ||
    lead?.aerial_image_url ||
    null;
  const capturedAtIso = roofIntel?.imagery?.captured_at;
  const capturedAt = capturedAtIso ? new Date(capturedAtIso) : null;
  const roofViewImage = roofIntel?.roof_view?.image_url || null;
  const heatmap = roofIntel?.heatmap?.url || aiImagery?.heatmap_url || null;
  const mask = roofIntel?.roof_view?.mask_url || null;

  const anomaliesRaw = [
    ...asArray(roofIntel?.anomalies).map((item) => ({ ...item, context: 'aerial' })),
    ...asArray(roofIntel?.analysis?.anomalies).map((item) => ({ ...item, context: 'aerial' })),
    ...asArray(aiImagery?.anomalies).map((item) => ({ ...item, context: 'ai_imagery' })),
  ];

  const streetViewEntries = [
    ...asArray(roofIntel?.street_view),
    ...asArray(aiImagery?.street_view),
    ...asArray(lead?.ai_analysis?.street_view),
  ];

  streetViewEntries.forEach((view) => {
    asArray(view?.anomalies).forEach((anomaly) => {
      anomaliesRaw.push({ ...anomaly, context: 'street_view', heading: view?.heading });
    });
  });

  const anomalies = anomaliesRaw
    .map((anomaly, idx) => ({
      id: `${anomaly?.type || 'anomaly'}-${idx}`,
      type: anomaly?.type?.replace(/_/g, ' ') || 'AI flag',
      probability: normalizeProbability(anomaly?.probability ?? anomaly?.confidence),
      severity:
        anomaly?.severity != null ? Math.round(Math.min(Number(anomaly.severity), 1) * 100) : null,
      description: anomaly?.description,
      context: anomaly?.context || 'aerial',
      heading: anomaly?.heading,
    }))
    .filter((anomaly) => anomaly.type);

  anomalies.sort((a, b) => (b.probability ?? 0) - (a.probability ?? 0));
  const topAnomaly = anomalies[0] || null;

  const coveragePercent =
    roofIntel?.roof_view?.coverage_ratio != null
      ? Math.round(Number(roofIntel.roof_view.coverage_ratio) * 100)
      : null;

  const streetViews = streetViewEntries.map((view, idx) => ({
    id: view?.public_url || `street-${idx}`,
    heading: view?.heading,
    quality_score: view?.quality_score,
    occlusion_score: view?.occlusion_score,
    public_url: view?.public_url,
    anomalies: asArray(view?.anomalies).map((anomaly, aidx) => ({
      id: `${view?.public_url || `street-${idx}`}-anomaly-${aidx}`,
      type: anomaly?.type?.replace(/_/g, ' ') || 'Street view anomaly',
      probability: normalizeProbability(anomaly?.probability ?? anomaly?.confidence),
      severity:
        anomaly?.severity != null ? Math.round(Math.min(Number(anomaly.severity), 1) * 100) : null,
      description: anomaly?.description,
    })),
  }));

  const imageryTiles = [];
  const addTile = (tile) => {
    if (!tile?.imageUrl) return;
    imageryTiles.push({
      anomalies: [],
      ...tile,
    });
  };

  if (baseImage) {
    addTile({
      id: 'satellite',
      label: 'Satellite Capture',
      imageUrl: baseImage,
      overlayUrl: null,
      badge: roofIntel?.imagery?.source ? roofIntel.imagery.source.toUpperCase() : 'SATELLITE',
      description: 'Base aerial imagery used for anomaly detection.',
      meta: capturedAt ? `Captured ${format(capturedAt, 'MMM dd, yyyy HH:mm')}` : null,
      tone: 'from-slate-900 via-slate-800 to-slate-700',
      anomalies: anomalies.filter((entry) => entry.context !== 'street_view'),
    });
  }

  if (roofViewImage && roofViewImage !== baseImage) {
    addTile({
      id: 'roof-view',
      label: 'Normalized Roof View',
      imageUrl: roofViewImage,
      overlayUrl: null,
      badge: 'ORTHO',
      description:
        coveragePercent != null
          ? `Perspective corrected view with ${coveragePercent}% coverage.`
          : 'Perspective corrected top-down view.',
      meta: coveragePercent != null ? `${coveragePercent}% coverage` : null,
      tone: 'from-blue-500/40 via-indigo-500/30 to-purple-500/30',
      anomalies: anomalies.filter((entry) => entry.context !== 'street_view'),
    });
  }

  if (heatmap) {
    addTile({
      id: 'heatmap',
      label: 'AI Damage Heatmap',
      imageUrl: roofViewImage || baseImage,
      overlayUrl: heatmap,
      badge: 'AI OVERLAY',
      description: topAnomaly?.type ? `Hotspots: ${topAnomaly.type}` : 'AI anomaly overlay highlighting risk zones.',
      meta: topAnomaly?.probability != null ? `${topAnomaly.probability}% confidence` : null,
      tone: 'from-rose-500/30 via-orange-500/30 to-amber-500/30',
      anomalies: anomalies.filter((entry) => entry.context !== 'street_view'),
    });
  }

  if (mask) {
    addTile({
      id: 'mask',
      label: 'Segmentation Mask',
      imageUrl: roofViewImage || baseImage,
      overlayUrl: mask,
      badge: 'MASK',
      description: 'Binary segmentation of impacted shingles used for accurate coverage estimates.',
      meta: topAnomaly?.severity != null ? `Severity ${topAnomaly.severity}%` : null,
      tone: 'from-emerald-500/25 via-teal-500/25 to-cyan-500/25',
      anomalies: anomalies.filter((entry) => entry.context !== 'street_view'),
    });
  }

  streetViews.forEach((view) => {
    addTile({
      id: view.id,
      label: `Street View ${view.heading != null ? `${Math.round(view.heading)}°` : ''}`.trim(),
      imageUrl: view.public_url,
      overlayUrl: null,
      badge: 'CURBSIDE',
      description: view.anomalies?.length
        ? view.anomalies.map((anomaly) => anomaly.type).join(', ')
        : 'Curbside imagery for curb appeal and validation.',
      meta: view.quality_score != null ? `Quality ${(view.quality_score * 100).toFixed(0)}%` : null,
      tone: 'from-amber-500/20 via-orange-500/20 to-red-500/20',
      heading: view.heading,
      anomalies: view.anomalies || [],
    });
  });

  return {
    baseImage,
    heatmap,
    mask,
    imageryTiles,
    anomalies,
    topAnomaly,
    streetViews,
    coveragePercent,
    capturedAt: roofIntel?.imagery?.captured_at,
    imageryQuality: roofIntel?.imagery?.quality,
    roofIntel,
  };
};

const EnhancedLeadDetailPage = ({ lead, onRewardPoints = () => {} }) => {
  const [loading, setLoading] = useState(false);
  const imageryContext = useMemo(() => buildLeadImageryContext(lead), [lead]);
  const [selectedImagery, setSelectedImagery] = useState(() => imageryContext.imageryTiles?.[0] || null);
  const [showLightbox, setShowLightbox] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timeline, setTimeline] = useState(() =>
    (lead?.activities || [])
      .map((activity, idx) => normalizeTimelineEntry(activity, idx))
      .filter(Boolean)
  );
  const [voiceCalls, setVoiceCalls] = useState([]);
  const [voiceCallsLoading, setVoiceCallsLoading] = useState(false);
  const [activeVoiceCall, setActiveVoiceCall] = useState(null);
  const [activeVoiceDetails, setActiveVoiceDetails] = useState(null);
  const [voiceModalLoading, setVoiceModalLoading] = useState(false);
  const [activeEmailThread, setActiveEmailThread] = useState(null);
  const [showReportGenerator, setShowReportGenerator] = useState(false);
  const [businessProfile, setBusinessProfile] = useState(null);

  useEffect(() => {
    setSelectedImagery(imageryContext.imageryTiles?.[0] || null);
  }, [imageryContext.imageryTiles, lead?.id]);

  useEffect(() => {
    setTimeline(
      (lead?.activities || [])
        .map((activity, idx) => normalizeTimelineEntry(activity, idx))
        .filter(Boolean)
    );
  }, [lead?.activities, lead?.id]);

  useEffect(() => {
    const fetchBusinessProfile = async () => {
      try {
        const response = await fetch('/api/v1/business-profile');
        if (response.ok) {
          const profile = await response.json();
          setBusinessProfile(profile);
        }
      } catch (error) {
        console.error('Failed to fetch business profile:', error);
      }
    };
    
    fetchBusinessProfile();
  }, []);

  useEffect(() => {
    if (!lead?.id) return;
    if (timeline.length > 0) return;
    let cancelled = false;
    const fetchTimeline = async () => {
      setTimelineLoading(true);
      try {
        const items = await activityAPI.getActivities({ lead_id: lead.id, limit: 40 });
        if (!cancelled && Array.isArray(items)) {
          const normalized = items
            .map((item, idx) => normalizeTimelineEntry(item, idx))
            .filter(Boolean);
          setTimeline(normalized);
        }
      } catch (error) {
        console.error('Failed to load lead timeline', error);
      } finally {
        if (!cancelled) setTimelineLoading(false);
      }
    };
    fetchTimeline();
    return () => {
      cancelled = true;
    };
  }, [lead?.id, timeline.length]);

  useEffect(() => {
    if (!lead?.id) {
      setVoiceCalls([]);
      return;
    }
    let cancelled = false;
    const fetchVoiceCalls = async () => {
      setVoiceCallsLoading(true);
      try {
        const calls = await voiceAPI.getCalls({ lead_id: lead.id, limit: 10 });
        if (!cancelled && Array.isArray(calls)) {
          setVoiceCalls(calls);
        }
      } catch (error) {
        console.error('Failed to load voice calls for lead', error);
      } finally {
        if (!cancelled) {
          setVoiceCallsLoading(false);
        }
      }
    };
    fetchVoiceCalls();
    return () => {
      cancelled = true;
    };
  }, [lead?.id]);

  useEffect(() => {
    setActiveVoiceCall(null);
    setActiveVoiceDetails(null);
  }, [lead?.id]);

  const heroBase = selectedImagery?.imageUrl || imageryContext.baseImage;
  const heroOverlay = overlayVisible ? selectedImagery?.overlayUrl || null : null;
  const topAnomaly = imageryContext.topAnomaly;
  const anomalies = imageryContext.anomalies;
  const streetViews = imageryContext.streetViews;
  const streetViewQuality = lead?.street_view_quality;
  const capturedAtDate = imageryContext.capturedAt ? new Date(imageryContext.capturedAt) : null;
  const capturedLabel =
    capturedAtDate && !Number.isNaN(capturedAtDate.valueOf())
      ? format(capturedAtDate, 'MMM dd, yyyy HH:mm')
      : null;
  const leadScore = lead?.lead_score ?? lead?.score ?? lead?.total_urgency_score ?? 0;
  const imageryQualityMetrics = imageryContext.imageryQuality?.metrics;
  const leadConfidence = lead?.analysis_confidence ?? lead?.ai_analysis?.confidence ?? null;
  const confidenceBadge = leadConfidence !== null ? (
    <div className="px-3 py-1 rounded-full text-sm font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-300 border border-sky-500/30">
      Confidence {Math.round(Math.min(Math.max(leadConfidence, 0), 0.995) * 100)}%
    </div>
  ) : null;
  const homeownerName = lead?.homeowner_name || lead?.owner_name || lead?.name || lead?.address;
  const homeownerEmail = lead?.homeowner_email || lead?.email;
  const homeownerPhone = lead?.homeowner_phone || lead?.phone || lead?.owner_phone;
  const formattedAddress = [lead?.address, lead?.city, lead?.state, lead?.zip_code].filter(Boolean).join(', ');
  const replacementStatus = (lead?.replacement_urgency || lead?.status || 'active').toString();
  const statusLabel = replacementStatus
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
  const sortedTimeline = useMemo(
    () =>
      timeline
        .filter(Boolean)
        .sort((a, b) => new Date(b.occurred_at || b.created_at || 0).getTime() - new Date(a.occurred_at || a.created_at || 0).getTime()),
    [timeline]
  );
  const emailThreads = useMemo(
    () => sortedTimeline.filter((item) => (item.type || '').includes('email')),
    [sortedTimeline]
  );
  const callThreads = useMemo(
    () => sortedTimeline.filter((item) => (item.type || '').includes('call')),
    [sortedTimeline]
  );

  const isDarkTheme = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  const handleVoiceFollowUpCall = useCallback(({ leadPhone }) => {
    const phoneToDial = leadPhone || homeownerPhone;
    if (phoneToDial) {
      window.open(`tel:${phoneToDial}`);
      onRewardPoints(15, 'Follow-up call', { type: 'call_followup', leadId: lead?.id });
    } else {
      toast.error('No phone number available for this lead');
    }
  }, [homeownerPhone, onRewardPoints, lead?.id]);

  const handleVoiceSendEmail = useCallback(({ leadEmail }) => {
    const emailToUse = leadEmail || homeownerEmail;
    if (emailToUse) {
      const subject = encodeURIComponent(`Following up on ${homeownerName}`);
      const body = encodeURIComponent('Hi there,\n\nThanks for the call today. Here are the next steps we discussed.\n\nBest regards,');
      window.open(`mailto:${emailToUse}?subject=${subject}&body=${body}`);
      onRewardPoints(10, 'Follow-up email', { type: 'email_followup', leadId: lead?.id });
    } else {
      toast.error('No email available for this lead');
    }
  }, [homeownerEmail, homeownerName, onRewardPoints, lead?.id]);

  const handleVoiceOpenWorkspace = useCallback(() => {
    toast.success('AI workspace opening soon');
    onRewardPoints(5, 'Opened AI workspace', { type: 'workspace', leadId: lead?.id });
  }, [onRewardPoints, lead?.id]);

  const handleOpenEmailThread = useCallback((thread) => {
    setActiveEmailThread(thread);
    onRewardPoints(3, 'Reviewed email thread', { type: 'email_thread', threadId: thread?.id, leadId: lead?.id });
  }, [onRewardPoints, lead?.id]);

  const handleCloseEmailThread = useCallback(() => {
    setActiveEmailThread(null);
  }, []);

  const handleReplyEmailThread = useCallback(
    ({ thread }) => {
      const emailToUse = thread?.from || homeownerEmail;
      if (emailToUse) {
        const subject = encodeURIComponent(`Re: ${thread?.title || homeownerName}`);
        const body = encodeURIComponent(`Hi ${thread?.from || homeownerName},\n\nThanks for the update.\n\nBest,\n`);
        window.open(`mailto:${emailToUse}?subject=${subject}&body=${body}`);
        onRewardPoints(12, 'Replied to email', { type: 'email_reply', threadId: thread?.id, leadId: lead?.id });
      } else {
        toast.error('No email available to reply');
      }
    },
    [homeownerEmail, homeownerName, onRewardPoints, lead?.id]
  );

  const handleForwardEmailThread = useCallback(({ thread }) => {
    const subject = encodeURIComponent(`Fwd: ${thread?.title || homeownerName}`);
    const body = encodeURIComponent(
      `${thread?.description || 'Forwarded conversation.'}\n\n---\nForwarded from Fish Mouth CRM`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
    onRewardPoints(8, 'Forwarded email', { type: 'email_forward', threadId: thread?.id, leadId: lead?.id });
  }, [homeownerName, onRewardPoints, lead?.id]);

  if (!lead) {
    return (
      <div className="bg-white dark:bg-slate-900/70 rounded-xl shadow-xl border border-gray-200 dark:border-slate-800 p-6">
        <div className="text-center text-gray-500 dark:text-slate-400">No lead data available</div>
      </div>
    );
  }

  const handleStartCall = () => {
    if (homeownerPhone) {
      window.open(`tel:${homeownerPhone}`);
      toast.success('Opening phone dialer');
      onRewardPoints(15, 'Called lead from dossier', { type: 'call', leadId: lead.id });
    } else {
      toast.error('No phone number available');
    }
  };

  const handleSendEmail = () => {
    if (homeownerEmail) {
      window.open(`mailto:${homeownerEmail}`);
      toast.success('Opening email client');
      onRewardPoints(10, 'Emailed lead from dossier', { type: 'email', leadId: lead.id });
    } else {
      toast.error('No email address available');
    }
  };

  const handleGenerateReport = () => {
    setShowReportGenerator(true);
  };

  const handleStartSequence = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/ai-voice/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_ids: [lead.id] }),
      });
      
      if (response.ok) {
        toast.success('AI sequence started');
        onRewardPoints(25, 'Started AI sequence', { type: 'sequence', leadId: lead.id });
      } else {
        toast.error('Failed to start sequence');
      }
    } catch (error) {
      toast.error('Error starting sequence');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenVoiceCall = async (call) => {
    if (!call?.id) return;
    setActiveVoiceCall(call);
    setActiveVoiceDetails(null);
    setVoiceModalLoading(true);
    try {
      const details = await voiceAPI.getCall(call.id);
      setActiveVoiceDetails(details);
      onRewardPoints(5, 'Reviewed call transcript', { type: 'call_transcript', callId: call.id, leadId: call.lead_id });
    } catch (error) {
      console.error('Failed to load voice call details', error);
      toast.error('Unable to load call transcript right now');
      setActiveVoiceCall(null);
    } finally {
      setVoiceModalLoading(false);
    }
  };

  const handleCloseVoiceModal = () => {
    setVoiceModalLoading(false);
    setActiveVoiceCall(null);
    setActiveVoiceDetails(null);
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-red-600 dark:text-rose-300 bg-red-100';
    if (score >= 70) return 'text-orange-600 dark:text-amber-300 bg-orange-100';
    if (score >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 dark:text-emerald-300 bg-green-100';
  };

  const getStatusBadge = (status) => {
    if (!status) return 'bg-gray-100 dark:bg-slate-800/60 text-gray-800 dark:text-slate-200';
    const normalized = status.toLowerCase();
    const colors = {
      ultra_hot: 'bg-red-100 text-red-800',
      hot: 'bg-orange-100 text-orange-800',
      warm: 'bg-yellow-100 text-yellow-800',
      cold: 'bg-gray-100 dark:bg-slate-800/60 text-gray-800 dark:text-slate-200',
      immediate: 'bg-rose-100 text-rose-700',
      urgent: 'bg-amber-100 text-amber-700',
      plan_ahead: 'bg-blue-100 text-blue-700',
      good_condition: 'bg-emerald-100 text-emerald-700',
      active: 'bg-indigo-100 text-indigo-700',
      new: 'bg-indigo-100 text-indigo-700',
      contacted: 'bg-blue-100 text-blue-700',
      qualified: 'bg-emerald-100 text-emerald-700',
      proposal_sent: 'bg-purple-100 text-purple-700',
      appointment_scheduled: 'bg-sky-100 text-sky-700',
      closed_won: 'bg-emerald-200 text-emerald-900',
      closed_lost: 'bg-gray-200 text-gray-700 dark:text-slate-300',
    };
    return colors[normalized] || 'bg-gray-100 dark:bg-slate-800/60 text-gray-800 dark:text-slate-200';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900/70 rounded-xl shadow-xl border border-gray-200 dark:border-slate-800 p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Home className="w-6 h-6 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{homeownerName}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                  <span className="text-gray-600 dark:text-slate-400">{formattedAddress}</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400 dark:text-slate-500" />
                <span className="text-gray-900 dark:text-slate-100">{homeownerPhone || 'No phone'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-400 dark:text-slate-500" />
                <span className="text-gray-900 dark:text-slate-100">{homeownerEmail || 'No email'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400 dark:text-slate-500" />
                <span className="text-gray-900 dark:text-slate-100">
                  {lead.created_at ? format(new Date(lead.created_at), 'MMM dd, yyyy') : 'Unknown date'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            <div className={`px-3 py-1 rounded-full text-sm font-semibold ${getScoreColor(leadScore)}`}>
              Score: {Math.round(leadScore)}
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadge(replacementStatus)}`}>
              {statusLabel}
            </div>
            {confidenceBadge}
          </div>
    </div>
  </div>

  {/* Imagery Intelligence */}
  <div className="bg-white dark:bg-slate-900/70 rounded-xl shadow-xl border border-gray-200 dark:border-slate-800 p-6 space-y-6">
    <div className="relative rounded-3xl overflow-hidden border border-gray-200 dark:border-slate-800 bg-gray-900/5 aspect-video">
      {heroBase ? (
        <>
          <img src={heroBase} alt="Roof aerial" className="w-full h-full object-cover" loading="lazy" />
          {heroOverlay && (
            <img
              src={heroOverlay}
              alt="AI overlay"
              className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-85"
              loading="lazy"
            />
          )}
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-sm text-gray-500 dark:text-slate-400">
          Imagery pending
        </div>
      )}
      {selectedImagery?.label && (
        <div className="absolute top-4 left-4 inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded-full bg-slate-900/85 text-white backdrop-blur">
          <ImageIcon className="w-4 h-4" />
          {selectedImagery.label}
        </div>
      )}
      {selectedImagery?.badge && (
        <div className="absolute top-4 right-4 inline-flex items-center gap-2 px-3 py-1 text-[10px] font-semibold rounded-full bg-white dark:bg-slate-900/70/80 text-gray-800 dark:text-slate-200 uppercase tracking-wide">
          {selectedImagery.badge}
        </div>
      )}
      {selectedImagery?.overlayUrl && (
        <button
          type="button"
          onClick={() => setOverlayVisible((prev) => !prev)}
          className="absolute top-4 right-32 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full bg-white/85 dark:bg-slate-900/80 text-gray-800 dark:text-slate-100 border border-gray-200/70 hover:bg-white"
        >
          {overlayVisible ? 'Hide Overlay' : 'Show Overlay'}
        </button>
      )}
      {topAnomaly && (
        <div className="absolute bottom-4 left-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded-full bg-rose-500/90 text-white">
            <AlertTriangle className="w-4 h-4" />
            {topAnomaly.type}
          </span>
          {topAnomaly.probability != null && (
            <span className="inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/90 text-white">
              Confidence {topAnomaly.probability}%
            </span>
          )}
          {topAnomaly.severity != null && (
            <span className="inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded-full bg-amber-500/90 text-white">
              Severity {topAnomaly.severity}%
            </span>
          )}
        </div>
      )}
      {capturedLabel && (
        <div className="absolute bottom-4 right-4 px-3 py-1 text-xs rounded-full bg-white dark:bg-slate-900/70/80 text-gray-700 dark:text-slate-300">
          Captured {capturedLabel}
        </div>
      )}
      {selectedImagery && (
        <div className="absolute bottom-4 right-28">
          <button
            type="button"
            onClick={() => setShowLightbox(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full bg-slate-900/80 text-white hover:bg-slate-900/90 backdrop-blur"
          >
            <Camera className="w-4 h-4" /> View full screen
          </button>
        </div>
      )}
    </div>

    {selectedImagery?.anomalies?.length > 0 && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {selectedImagery.anomalies.slice(0, 4).map((anomaly, idx) => (
          <div
            key={`${selectedImagery.id}-anomaly-${idx}`}
            className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/70/80 dark:bg-slate-900/60 dark:border-slate-700 p-4 space-y-1"
          >
            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 dark:text-slate-100 capitalize">{anomaly.type}</p>
            {anomaly.description && (
              <p className="text-xs text-gray-600 dark:text-slate-400 dark:text-slate-300 leading-5">{anomaly.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 dark:text-slate-400 dark:text-slate-400">
              {anomaly.probability != null && <span>Confidence {anomaly.probability}%</span>}
              {anomaly.severity != null && <span>Severity {anomaly.severity}%</span>}
              {anomaly.context && <span>Source {anomaly.context.replace(/_/g, ' ')}</span>}
            </div>
          </div>
        ))}
      </div>
    )}

    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {imageryContext.imageryTiles.map((tile) => {
        const isActive = selectedImagery?.id === tile.id;
        return (
          <button
            key={tile.id}
            type="button"
            onClick={() => setSelectedImagery(tile)}
            className={`text-left rounded-3xl border transition-all duration-200 overflow-hidden group ${
              isActive
                ? 'border-blue-500 shadow-lg shadow-blue-200/40'
                : 'border-gray-200 dark:border-slate-800 hover:border-blue-300 hover:shadow-lg'
            }`}
          >
            <div className={`relative aspect-[4/3] bg-gradient-to-br ${tile.tone || 'from-slate-800/10 via-slate-700/10 to-slate-600/10'}`}>
              <img
                src={tile.imageUrl}
                alt={tile.label}
                className={`w-full h-full object-cover transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-95 group-hover:opacity-100'}`}
                loading="lazy"
              />
              {overlayVisible && tile.overlayUrl && (
                <img
                  src={tile.overlayUrl}
                  alt={`${tile.label} overlay`}
                  className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-85"
                  loading="lazy"
                />
              )}
              {tile.badge && (
                <span className="absolute top-2 left-2 inline-flex items-center gap-2 px-2 py-1 text-[10px] font-semibold rounded-full bg-white dark:bg-slate-900/70/80 text-gray-800 dark:text-slate-200 uppercase tracking-wide">
                  {tile.badge}
                </span>
              )}
            </div>
            <div className="p-4 space-y-2">
              <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                {tile.label}
                {isActive && <span className="text-[10px] uppercase text-blue-600 dark:text-blue-300 font-semibold">Active</span>}
              </p>
              {tile.description && (
                <p className="text-xs text-gray-500 dark:text-slate-400 leading-5">{tile.description}</p>
              )}
              {tile.meta && (
                <span className="inline-flex items-center gap-1 text-[11px] text-blue-500">
                  <Sparkles className="w-3 h-3" />
                  {tile.meta}
                </span>
              )}
            </div>
          </button>
        );
      })}
      {imageryContext.imageryTiles.length === 0 && (
        <div className="text-sm text-gray-500 dark:text-slate-400 border border-dashed border-gray-300 dark:border-slate-700 rounded-xl p-4">
          Imagery overlays will appear after an AI scan completes.
        </div>
      )}
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
      <InfoPill icon={CheckCircle} label="Imagery Quality" value={lead.image_quality_score != null ? `${Math.round(lead.image_quality_score)}/100` : 'Pending'} />
      <InfoPill icon={Layers} label="Coverage" value={imageryContext.coveragePercent != null ? `${imageryContext.coveragePercent}%` : '—'} />
      <InfoPill icon={Compass} label="Street Angles" value={streetViewQuality?.angles_captured || streetViews.length || 0} />
      <InfoPill icon={TrendingUp} label="AI Confidence" value={topAnomaly?.probability != null ? `${topAnomaly.probability}%` : '—'} />
    </div>

    {lead.image_quality_issues?.length > 0 && (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-700">
        <span className="font-semibold mr-2">Quality Issues:</span>
        {lead.image_quality_issues.map((issue) => issue.replace(/_/g, ' ')).join(', ')}
      </div>
    )}

    {anomalies.length > 0 && (
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 uppercase tracking-wide mb-3">AI anomaly insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {anomalies.slice(0, 6).map((anomaly) => (
            <div key={anomaly.id} className="rounded-2xl border border-gray-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900/70/70">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 capitalize">{anomaly.type}</p>
                  {anomaly.description && (
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{anomaly.description}</p>
                  )}
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-2">
                    Source: {anomaly.context === 'street_view' ? 'Street view' : 'Aerial'}
                  </p>
                </div>
                <div className="text-right text-xs text-gray-500 dark:text-slate-400 space-y-1">
                  {anomaly.probability != null && (
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                      <TrendingUp className="w-3 h-3" />
                      {anomaly.probability}%
                    </span>
                  )}
                  {anomaly.severity != null && <p>Severity {anomaly.severity}%</p>}
                  {anomaly.heading != null && <p>Heading {Math.round(anomaly.heading)}°</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>

  {/* Quick Actions */}
  <div className="bg-white dark:bg-slate-900/70 rounded-xl shadow-xl border border-gray-200 dark:border-slate-800 p-6">
    <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Quick Actions</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <button
            onClick={handleStartCall}
            className="flex items-center gap-3 p-4 bg-green-50 dark:bg-emerald-500/20 hover:bg-green-100 border border-green-200 rounded-xl transition-colors"
          >
            <Phone className="w-5 h-5 text-green-600 dark:text-emerald-300" />
            <span className="font-medium text-green-800">Call Lead</span>
          </button>
          
          <button
            onClick={handleSendEmail}
            className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-500/20 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors"
          >
            <Mail className="w-5 h-5 text-blue-600 dark:text-blue-300" />
            <span className="font-medium text-blue-800">Send Email</span>
          </button>
          
          <button
            onClick={handleGenerateReport}
            disabled={loading}
            className="flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors disabled:opacity-60"
          >
            <FileText className="w-5 h-5 text-purple-600" />
            <span className="font-medium text-purple-800">
              {loading ? 'Generating...' : 'Generate Report'}
            </span>
          </button>
          
          <button
            onClick={handleStartSequence}
            disabled={loading}
            className="flex items-center gap-3 p-4 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl transition-colors disabled:opacity-60"
          >
            <PlayCircle className="w-5 h-5 text-orange-600 dark:text-amber-300" />
            <span className="font-medium text-orange-800">
              {loading ? 'Starting...' : 'AI Sequence'}
            </span>
          </button>
        </div>
      </div>

      {/* Lead Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900/70 rounded-xl shadow-xl border border-gray-200 dark:border-slate-800 p-6 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <Home className="w-5 h-5" />
            Property Snapshot
          </h2>
          <InfoRow label="Address" value={formattedAddress || lead.address} />
          <InfoRow label="Homeowner" value={homeownerName || 'N/A'} />
          <InfoRow label="Roof Material" value={lead.roof_material || 'Unknown'} />
          <InfoRow label="Roof Age" value={lead.roof_age_years != null ? `${lead.roof_age_years} yrs` : 'Unknown'} />
          <InfoRow label="Roof Size" value={lead.roof_size_sqft ? `${lead.roof_size_sqft.toLocaleString()} sqft` : '—'} />
          <InfoRow label="Estimated Project Value" value={lead.estimated_value ? `$${Number(lead.estimated_value).toLocaleString()}` : 'N/A'} />
          <InfoRow label="Notes" value={lead.notes || 'No internal notes yet.'} multiline />
        </div>

        <div className="bg-white dark:bg-slate-900/70 rounded-xl shadow-xl border border-gray-200 dark:border-slate-800 p-6 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Opportunity Metrics
          </h2>
          <InfoRow
            label="AI Deal Probability"
            value={lead.ai_analysis?.deal_probability != null ? `${lead.ai_analysis.deal_probability}%` : lead.conversion_probability != null ? `${Math.round(lead.conversion_probability)}%` : '—'}
          />
          <InfoRow
            label="Urgency Score"
            value={lead.ai_analysis?.urgency_score != null ? `${lead.ai_analysis.urgency_score}%` : '—'}
          />
          <InfoRow
            label="Budget Fit"
            value={lead.ai_analysis?.budget_fit || lead.ai_insights?.budget_fit || '—'}
          />
          <InfoRow
            label="Decision Timeline"
            value={lead.ai_analysis?.decision_timeline || lead.ai_insights?.decision_timeline || '—'}
          />
          <InfoRow
            label="Priority"
            value={lead.priority ? lead.priority.toString().replace(/_/g, ' ') : '—'}
          />
          <InfoRow
            label="Last Contact"
            value={lead.last_contacted ? format(new Date(lead.last_contacted), 'MMM dd, yyyy HH:mm') : 'Never'}
          />
        </div>
      </div>

      <CollapsibleSection
        title="AI Playbook & Notes"
        icon={Sparkles}
        badge={lead.ai_analysis?.deal_probability != null ? `${lead.ai_analysis.deal_probability}% win` : undefined}
        defaultOpen
      >
        <div className="space-y-4 text-sm text-gray-700 dark:text-slate-300">
          <p>{lead.ai_analysis?.summary || 'AI analysis summary will appear once scans are processed.'}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400 mb-2">Key Motivators</p>
              <ul className="space-y-1">
                {(lead.ai_analysis?.key_motivators || lead.ai_insights?.key_motivators || []).map((motivator) => (
                  <li key={motivator} className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-500/20 text-blue-700 rounded-full text-xs font-medium mr-2 mb-2">
                    <Sparkles className="w-3 h-3" />
                    {motivator}
                  </li>
                ))}
                {!((lead.ai_analysis?.key_motivators || lead.ai_insights?.key_motivators || []).length) && (
                  <li className="text-xs text-gray-500 dark:text-slate-400">No motivators captured yet.</li>
                )}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400 mb-2">Recommended Approach</p>
              <p className="text-sm text-gray-700 dark:text-slate-300">
                {lead.ai_analysis?.recommended_approach || lead.ai_insights?.recommended_approach || 'Run a roof scan to unlock AI recommendations.'}
              </p>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Communication Timeline"
        icon={Activity}
        badge={`${timeline.length} events`}
        defaultOpen
      >
        {timelineLoading ? (
          <div className="text-xs text-gray-500 dark:text-slate-400 py-4">Loading activity…</div>
        ) : sortedTimeline.length ? (
          <div className="space-y-3">
            {sortedTimeline.map((item) => {
              const Icon = getActivityIcon(item.type);
              return (
                <div key={item.id} className="flex items-start gap-3 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/70/70 p-3">
                  <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">{item.title}</p>
                      <span className="text-[11px] text-gray-500 dark:text-slate-400">
                        {formatRelativeTime(new Date(item.occurred_at).getTime())}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-gray-600 dark:text-slate-400 mt-1 leading-5">{item.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-xs text-gray-500 dark:text-slate-400 py-4">No timeline events recorded yet.</div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Email & Call Threads"
        icon={MessageSquare}
        badge={`${emailThreads.length} emails • ${(voiceCalls.length || callThreads.length)} calls`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm text-gray-700 dark:text-slate-300">
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400 mb-2">Email touchpoints</p>
            {emailThreads.length ? (
              <div className="space-y-2">
                {emailThreads.slice(0, 5).map((item) => (
                  <button
                    key={`email-${item.id}`}
                    type="button"
                    onClick={() => handleOpenEmailThread(item)}
                    className="w-full text-left p-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/70/70 hover:shadow-lg transition"
                  >
                    <p className="font-medium text-gray-900 dark:text-slate-100">{item.title}</p>
                    {item.description && <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 line-clamp-3">{item.description}</p>}
                    <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">{format(new Date(item.occurred_at), 'MMM dd, yyyy HH:mm')}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 dark:text-slate-400">No email communication logged.</p>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400 mb-2">Voice & call touchpoints</p>
            {voiceCallsLoading ? (
              <p className="text-xs text-gray-500 dark:text-slate-400">Loading voice intelligence…</p>
            ) : voiceCalls.length ? (
              <ul className="space-y-2">
                {voiceCalls.slice(0, 5).map((call) => (
                  <li key={`voice-${call.id}`} className="p-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/70/80">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-slate-100 capitalize">
                          {(call.outcome || call.status || 'call').replace(/_/g, ' ')}
                        </p>
                        <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
                          {call.created_at ? format(new Date(call.created_at), 'MMM dd, yyyy HH:mm') : 'Timestamp pending'}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-gray-500 dark:text-slate-400">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 font-semibold">
                            {(call.interest_level || 'unknown').toUpperCase()}
                          </span>
                          <span>Duration {formatVoiceDuration(call.duration_seconds)}</span>
                          <span>Cost {formatCurrencyUSD(call.total_cost)}</span>
                        </div>
                        {call.ai_summary && (
                          <p className="text-xs text-gray-600 dark:text-slate-400 mt-2 leading-5">{call.ai_summary}</p>
                        )}
                        {call.next_steps && (
                          <p className="text-xs text-indigo-500 mt-1 font-medium">Next: {call.next_steps}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenVoiceCall(call)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-300 hover:text-blue-500"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        View transcript
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : callThreads.length ? (
              <ul className="space-y-2">
                {callThreads.slice(0, 5).map((item) => (
                  <li key={`call-${item.id}`} className="p-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/70/70">
                    <p className="font-medium text-gray-900 dark:text-slate-100">{item.title}</p>
                    {item.description && <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{item.description}</p>}
                    <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">{format(new Date(item.occurred_at), 'MMM dd, yyyy HH:mm')}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-500 dark:text-slate-400">No calls recorded yet.</p>
            )}
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Data Quality & Imagery Metrics"
        icon={Layers}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700 dark:text-slate-300">
          <div className="space-y-2">
            <InfoRow label="Imagery Score" value={lead.image_quality_score != null ? `${Math.round(lead.image_quality_score)}/100` : 'Pending'} />
            <InfoRow label="Data Quality" value={(lead.quality_validation_status || 'pending').replace(/_/g, ' ')} />
            <InfoRow label="Coverage" value={imageryContext.coveragePercent != null ? `${imageryContext.coveragePercent}%` : '—'} />
            <InfoRow label="Street Angles" value={streetViewQuality?.angles_captured || streetViews.length || 0} />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Damage Indicators</p>
            <div className="flex flex-wrap gap-2">
              {(lead.damage_indicators || []).map((indicator) => (
                <span key={indicator} className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-rose-50 text-rose-600">
                  <AlertTriangle className="w-3 h-3" />
                  {indicator.replace(/_/g, ' ')}
                </span>
              ))}
              {!(lead.damage_indicators || []).length && (
                <span className="text-xs text-gray-500 dark:text-slate-400">No damage indicators recorded.</span>
              )}
            </div>
            {lead.image_quality_issues?.length > 0 && (
              <div className="text-xs text-amber-600 dark:text-amber-300">
                <span className="font-semibold mr-1">Quality Issues:</span>
                {lead.image_quality_issues.map((issue) => issue.replace(/_/g, ' ')).join(', ')}
              </div>
            )}
            {imageryQualityMetrics && (
              <div className="mt-2 space-y-1 text-xs text-gray-500 dark:text-slate-400">
                {Object.entries(imageryQualityMetrics).map(([metric, value]) => (
                  <div key={metric} className="flex justify-between">
                    <span className="capitalize">{metric.replace(/_/g, ' ')}</span>
                    <span className="font-semibold text-gray-700 dark:text-slate-300">
                      {typeof value === 'number' ? value.toFixed(3) : value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CollapsibleSection>

      {showLightbox && selectedImagery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-4xl bg-slate-900 text-slate-100 rounded-3xl overflow-hidden shadow-2xl border border-slate-700">
            <button
              type="button"
              onClick={() => setShowLightbox(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 text-slate-200 hover:bg-slate-700"
              aria-label="Close imagery preview"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="aspect-video bg-black">
              <img src={selectedImagery.imageUrl} alt={selectedImagery.label} className="w-full h-full object-cover" />
              {overlayVisible && selectedImagery.overlayUrl && (
                <img
                  src={selectedImagery.overlayUrl}
                  alt={`${selectedImagery.label} overlay`}
                  className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-85"
                />
              )}
            </div>
            <div className="p-6 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h3 className="text-lg font-semibold">{selectedImagery.label}</h3>
                {selectedImagery.badge && (
                  <span className="text-xs uppercase tracking-wide px-3 py-1 rounded-full bg-slate-800 text-slate-200">
                    {selectedImagery.badge}
                  </span>
                )}
              </div>
              {selectedImagery.description && (
                <p className="text-sm text-slate-300 leading-6">{selectedImagery.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                {selectedImagery.meta && (
                  <span className="inline-flex items-center gap-2">
                    <Sparkles className="w-3 h-3" />
                    {selectedImagery.meta}
                  </span>
                )}
                {selectedImagery.heading != null && (
                  <span>Heading {Math.round(selectedImagery.heading)}°</span>
                )}
              </div>
              {selectedImagery.anomalies?.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {selectedImagery.anomalies.map((anomaly, idx) => (
                    <div key={`lightbox-${selectedImagery.id}-${idx}`} className="rounded-2xl border border-slate-700 bg-slate-800/60 p-3 space-y-1">
                      <p className="text-sm font-semibold text-slate-100 capitalize">{anomaly.type}</p>
                      {anomaly.description && (
                        <p className="text-xs text-slate-300 leading-5">{anomaly.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                        {anomaly.probability != null && <span>Confidence {anomaly.probability}%</span>}
                        {anomaly.severity != null && <span>Severity {anomaly.severity}%</span>}
                        {anomaly.context && <span>Source {anomaly.context.replace(/_/g, ' ')}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {activeVoiceCall && (
        <VoiceTranscriptModal
          call={activeVoiceCall}
          details={activeVoiceDetails}
          loading={voiceModalLoading}
          onClose={handleCloseVoiceModal}
          isDark={isDarkTheme}
          lead={lead}
          onFollowUpCall={handleVoiceFollowUpCall}
          onSendEmail={handleVoiceSendEmail}
          onOpenChat={handleVoiceOpenWorkspace}
        />
      )}
      {activeEmailThread && (
        <LeadEmailModal
          thread={activeEmailThread}
          lead={lead}
          onClose={handleCloseEmailThread}
          isDark={isDarkTheme}
          onReply={handleReplyEmailThread}
          onForward={handleForwardEmailThread}
        />
      )}
      
      {showReportGenerator && (
        <EnhancedReportGenerator
          lead={lead}
          businessProfile={businessProfile}
          visible={showReportGenerator}
          onClose={() => setShowReportGenerator(false)}
        />
      )}
    </div>
  );
};

function formatVoiceDuration(seconds) {
  if (!seconds) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = Math.max(0, Math.round(seconds % 60));
  if (mins === 0) {
    return `${secs}s`;
  }
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
}

function formatCurrencyUSD(value) {
  if (value === undefined || value === null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(Number(value));
}

function normalizeTimelineEntry(activity, idx = 0) {
  if (!activity) return null;
  const type = (activity.activity_type || activity.type || 'activity').toLowerCase();
  const occurredAt =
    activity.occurred_at || activity.date || activity.created_at || activity.timestamp || new Date().toISOString();
  const baseTitle =
    activity.title || activity.description || activity.message || type.replace(/_/g, ' ') || 'Activity';
  return {
    id: activity.id || Number(`${Date.now()}${idx}`),
    type,
    title: baseTitle.charAt(0).toUpperCase() + baseTitle.slice(1),
    description: activity.description || activity.message || '',
    occurred_at: occurredAt,
    raw: activity,
  };
}

function formatRelativeTime(timestampMs) {
  if (!timestampMs || Number.isNaN(timestampMs)) return '';
  const diff = Date.now() - timestampMs;
  if (diff < 0) return 'Just now';
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff >= day) {
    const value = Math.floor(diff / day);
    return `${value} day${value === 1 ? '' : 's'} ago`;
  }
  if (diff >= hour) {
    const value = Math.floor(diff / hour);
    return `${value} hour${value === 1 ? '' : 's'} ago`;
  }
  if (diff >= minute) {
    const value = Math.max(1, Math.floor(diff / minute));
    return `${value} min${value === 1 ? '' : 's'} ago`;
  }
  const seconds = Math.max(1, Math.floor(diff / 1000));
  return `${seconds} sec${seconds === 1 ? '' : 's'} ago`;
}

function getActivityIcon(type = '') {
  const normalized = type.toLowerCase();
  if (normalized.includes('email')) return Mail;
  if (normalized.includes('voice') || normalized.includes('call')) return Phone;
  if (normalized.includes('sequence')) return MessageSquare;
  if (normalized.includes('scan')) return Sparkles;
  return Activity;
}

function InfoRow({ label, value, multiline = false }) {
  const resolvedValue = value !== undefined && value !== null && value !== '' ? value : '—';
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-600 dark:text-slate-400 text-sm">{label}:</span>
      {multiline ? (
        <p className="flex-1 text-right text-gray-900 dark:text-slate-100 text-sm whitespace-pre-line">{resolvedValue}</p>
      ) : (
        <span className="text-gray-900 dark:text-slate-100 text-sm font-medium text-right">{resolvedValue}</span>
      )}
    </div>
  );
}

function InfoPill({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/70/80 px-4 py-3 shadow-sm">
      <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{value}</p>
      </div>
    </div>
  );
}

function CollapsibleSection({ title, icon: Icon, badge, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white dark:bg-slate-900/70 rounded-xl shadow-xl border border-gray-200 dark:border-slate-800">
      <button
        type="button"
        className="w-full flex items-center justify-between gap-3 px-5 py-4"
        onClick={() => setOpen((prev) => !prev)}
      >
        <div className="flex items-center gap-3 text-left">
          {Icon && (
            <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300">
              <Icon className="w-4 h-4" />
            </span>
          )}
          <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">{title}</span>
        </div>
        <div className="flex items-center gap-3">
          {badge && (
            <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-gray-100 dark:bg-slate-800/60 text-gray-600 dark:text-slate-400">
              {badge}
            </span>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-gray-400 dark:text-slate-500" /> : <ChevronDown className="w-4 h-4 text-gray-400 dark:text-slate-500" />}
        </div>
      </button>
      {open && <div className="border-t border-gray-200 dark:border-slate-800 px-5 py-4 space-y-4">{children}</div>}
    </div>
  );
}

export default EnhancedLeadDetailPage;
