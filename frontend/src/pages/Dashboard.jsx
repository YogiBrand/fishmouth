import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  AlertCircle,
  AlertTriangle,
  Download,
  FileText,
  Flame,
  Mail,
  Calendar,
  MapPin,
  Phone,
  Sparkles,
  Eye,
  Users,
  Settings,
  Scan,
  Home,
  LogOut,
  Bell,
  Sun,
  Moon,
  X,
  ArrowUpRight,
  LifeBuoy,
  Wallet,
  Coins,
  Gift,
  Fish,
  ChevronDown,
  ClipboardCheck,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

import LeadIntelligenceTable from '../components/LeadIntelligenceTable';
import AreaScanner from '../components/AreaScanner';
import VoiceCallManager from '../components/VoiceCallManager';
import SequenceManager from '../components/SequenceManager';
import EnhancedLeadDetailPage from '../components/EnhancedLeadDetailPage';
import ComprehensiveBusinessSettings from '../components/ComprehensiveBusinessSettings';
import DashboardLeadMap from '../components/DashboardLeadMap';
import DashboardQuestPanel from '../components/DashboardQuestPanel';
import ReportPreviewModal from '../components/ReportPreviewModal';
import EnhancedReportGenerator from '../components/EnhancedReportGenerator';
import PointsLedgerModal from '../components/PointsLedgerModal';
import WalletRewardsModal from '../components/WalletRewardsModal';
import ManualReviewModal from '../components/ManualReviewModal';
import DashboardKpiRow from '../components/DashboardKpiRow';
import LeadQueueTabs from '../components/LeadQueueTabs';
import WelcomeCelebration from '../components/WelcomeCelebration';
import { leadAPI } from '../services/api';
import businessProfileService from '../services/businessProfileService';
import { getLeadUrgency, formatLeadAgeLabel, resolveLeadCreatedAt } from '../utils/leads';

const LEVEL_THRESHOLDS = [0, 250, 650, 1200, 1900, 2800, 3900, 5200, 6700, 8400];
const DAILY_LOGIN_BONUS = 100;
const POINTS_PER_LEAD = 100;
const POINTS_PER_DOLLAR = 25;
const CREDIT_PRICING = {
  scans: { label: 'Roof SmartScan', cost: 4.5, apiCost: 1.25, unit: 'scan' },
  voice: { label: 'AI Voice Call', cost: 0.2, apiCost: 0.05, unit: 'call' },
  sms: { label: 'AI SMS', cost: 0.08, apiCost: 0.02, unit: 'message' },
  email: { label: 'AI Email', cost: 0.09, apiCost: 0.0225, unit: 'email' },
  leads: { label: 'AI Hot Lead', cost: 45, apiCost: 12, unit: 'lead' },
};

const DEFAULT_APP_CONFIG = {
  featureFlags: { reports: true, voice: true, scanner: true, roi: true },
  kpis: ['hot_leads_today', 'warm_leads_today', 'reports_sent_7d', 'views_7d', 'replies_7d', 'appointments_7d'],
  leadTableColumns: ['address', 'owner', 'verified_contacts', 'roof_age', 'priority', 'confidence', 'reason_codes', 'last_activity', 'next_step'],
  leadQueueTabs: [
    { id: 'hot', label: 'HOT' },
    { id: 'warm', label: 'WARM' },
    { id: 'followups', label: 'Follow-ups' },
    { id: 'unreached', label: 'Unreached' },
    { id: 'dnc', label: 'DNC' },
  ],
};

const MAX_HERO_LEADS = 20;

const ROOFER_CELEBRATION_QUOTES = [
  'Crew bonus unlocked—whoever closes next roof picks the taco spot.',
  'Fresh shingles, fat margins. Keep the hammers swinging.',
  'Ladder flex! Next homeowner gets the full VIP treatment.',
  'The storm is watching—time to cash in on those follow-ups.',
  'Another level up. Tell the crew the drone gets naming rights tonight.',
  'Payout vibes only. Claim the next roof before your rivals do.',
];

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const getLevelThreshold = (level) => {
  if (level <= 1) return 0;
  const index = level - 1;
  if (index < LEVEL_THRESHOLDS.length) {
    return LEVEL_THRESHOLDS[index];
  }
  const overflow = index - (LEVEL_THRESHOLDS.length - 1);
  const lastThreshold = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const incrementalGain = 1800;
  return lastThreshold + overflow * incrementalGain;
};

const PROGRESSION_PROGRAM = [
  {
    id: 'tier-0',
    label: 'Level 1 • Launch Pad',
    description: 'Prove product-market fit with your first automations.',
    tasks: [
      {
        id: 'progress.profile.complete',
        title: 'Complete business profile',
        description: 'Upload branding and company info so every doc is on brand.',
        points: 60,
        action: 'settings',
        requiresEvent: false,
        cta: 'Open settings',
      },
      {
        id: 'progress.scan.first',
        title: 'Run your first SmartScan',
        description: 'Launch a scan to uncover the first batch of qualified roofs.',
        points: 75,
        action: 'scanner',
        requiresEvent: true,
        cta: 'Launch scanner',
      },
      {
        id: 'progress.sequence.first',
        title: 'Enroll a lead into automation',
        description: 'Drop a hot roof into an AI follow-up sequence.',
        points: 90,
        action: 'sequences',
        requiresEvent: true,
        cta: 'Open sequences',
      },
    ],
  },
  {
    id: 'tier-1',
    label: 'Level 2 • Revenue Engine',
    description: 'Scale budgets and keep the pipeline full.',
    tasks: [
      {
        id: 'progress.wallet.500',
        title: 'Reload wallet with $500+',
        description: 'Fund outreach channels so the AI can keep dialing.',
        points: 120,
        action: 'wallet',
        requiresEvent: true,
        cta: 'Reload wallet',
      },
      {
        id: 'progress.plan.builder',
        title: 'Activate Growth Builder plan',
        description: 'Lock in 3× more value versus one-off wallet reloads.',
        points: 140,
        action: 'plans',
        requiresEvent: true,
        cta: 'View plans',
      },
      {
        id: 'progress.scan.five',
        title: 'Complete 5 SmartScans',
        description: 'Map storm clusters and send inspectors where the demand is.',
        points: 160,
        action: 'scanner',
        requiresEvent: true,
        cta: 'Launch scanner',
      },
    ],
  },
  {
    id: 'tier-2',
    label: 'Level 3 • Market Dominator',
    description: 'Maximise ROI with premium campaigns and analytics.',
    tasks: [
      {
        id: 'progress.wallet.1500',
        title: 'Maintain $1,500 active wallet',
        description: 'Keep multi-channel campaigns funded for the entire crew.',
        points: 220,
        action: 'wallet',
        requiresEvent: true,
        cta: 'Reload wallet',
      },
      {
        id: 'progress.plan.scale',
        title: 'Upgrade to Market Scale plan',
        description: 'Unlock 4× wallet value and elite deliverability safeguards.',
        points: 260,
        action: 'plans',
        requiresEvent: true,
        cta: 'View plans',
      },
      {
        id: 'progress.reports.ten',
        title: 'Deliver 10 AI roof dossiers',
        description: 'Send homeowners visual proof and close deals faster.',
        points: 240,
        action: 'reports',
        requiresEvent: true,
        cta: 'Open reports',
      },
    ],
  },
];

const HELP_DEFAULT_OPTIONS = ['wallet', 'campaigns', 'leads'];

const HELP_SCRIPTS = {
  wallet: {
    title: 'Wallet & Billing',
    responses: [
      'Your wallet covers SmartScans, voice minutes, SMS, email, and paid lead unlocks.',
      'Stripe checkout issues a receipt instantly and funds appear in under 5 seconds.',
      'Usage is debited per channel in real time. You can enable auto-allocation under Wallet → Usage controls.',
    ],
    followups: [
      {
        id: 'wallet.review',
        label: 'Request a billing review',
        responses: [
          'Sure thing — I can flag a billing specialist to audit the last 30 days of usage.',
          'Expect a summary in your email within the next business day. We automatically refund misapplied charges back to your wallet.',
        ],
        followups: HELP_DEFAULT_OPTIONS,
      },
      {
        id: 'wallet.costs',
        label: 'Explain channel costs',
        responses: [
          'SmartScans blend imagery, MLS, and permit data — $4.50 per scan covers API and compute fees.',
          'Voice calls debit $0.20 per connected minute (carrier + AI orchestration). SMS and email are pennies per send, billed only on delivery.',
          'Paid leads run $45 each — pricing includes enrichment and instant refunds when AI flags an unresponsive contact.',
        ],
        followups: HELP_DEFAULT_OPTIONS,
      },
      { id: 'support', label: 'Talk to a specialist' },
    ],
  },
  campaigns: {
    title: 'AI Campaign Setup',
    responses: [
      'Campaign recipes live inside Sequences. Choose a template, add a lead list, and the AI handles timing.',
      'Voice calls use compliant scripts and pause automatically if wallet thresholds are reached.',
      'The dashboard highlights stalled leads so you can re-engage with a single click.',
    ],
    followups: [
      {
        id: 'campaigns.tips',
        label: 'Share best practices',
        responses: [
          'Top performers blend voice + SMS touches within 48 hours of SmartScan delivery.',
          'Set “quiet hours” in Sequences to keep deliverability high and avoid over messaging.',
        ],
        followups: HELP_DEFAULT_OPTIONS,
      },
      {
        id: 'campaigns.pause',
        label: 'How to pause outreach',
        responses: [
          'Open Sequences → select the campaign → toggle Pause. All pending steps hold instantly.',
          'When you resume, the AI recalculates send windows so you stay compliant.',
        ],
        followups: HELP_DEFAULT_OPTIONS,
      },
      { id: 'support', label: 'Escalate to support' },
    ],
  },
  leads: {
    title: 'Lead Quality & Refunds',
    responses: [
      'Every paid lead includes imagery, anomaly scoring, and verification. If a homeowner is unresponsive within 72 hours, tap “Request review”.',
      'Our AI checks call logs, emails, and activity. When the lead fails the quality test, two replacement credits are auto-issued.',
      'Refunds post back to the wallet immediately and we flag the record for retraining.',
    ],
    followups: [
      {
        id: 'leads.review',
        label: 'Submit quality review',
        responses: [
          'Navigate to Leads → select the record → choose “Request quality review”.',
          'Once submitted, you will receive a decision in under 15 minutes. Approved reviews credit your wallet with two replacement leads automatically.',
        ],
        followups: HELP_DEFAULT_OPTIONS,
      },
      {
        id: 'leads.policy',
        label: 'See lead billing policy',
        responses: [
          'Only systematic hot leads are billed. If AI senses low engagement, the charge is reversed automatically.',
          'You can download the full billing policy under Wallet → Lead credits → Policy reference.',
        ],
        followups: HELP_DEFAULT_OPTIONS,
      },
      { id: 'support', label: 'Talk to a specialist' },
    ],
  },
  support: {
    title: 'Talk to a Specialist',
    responses: [
      'I’m bringing a live specialist into the thread. You’ll see a typing indicator while they join.',
      'While you wait, please keep the tab open—most conversations are resolved in under 2 minutes.',
    ],
    followups: [],
  },
};

const mapHelpOptions = (options) =>
  options.map((option) =>
    typeof option === 'string'
      ? { id: option, label: HELP_SCRIPTS[option]?.title || option }
      : option
  );

const websocketUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${window.location.host}/ws/activity`;
};

const surfaceClass = (isDark) =>
  isDark
    ? 'bg-slate-900/80 backdrop-blur rounded-3xl border border-slate-800 shadow-xl'
    : 'bg-white rounded-3xl border border-gray-200 shadow-sm';

const navButtonClass = (isActive, isDark) => {
  const base =
    'w-full flex items-center justify-between gap-5 px-6 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-200';
  if (isActive) {
    return `${base} bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white shadow-lg shadow-blue-400/20 ring-1 ring-blue-200/50`;
  }
  if (isDark) {
    return `${base} bg-slate-900/60 text-slate-200 hover:bg-slate-800/80 hover:text-white hover:shadow-md`;
  }
  return `${base} bg-white/85 text-slate-700 hover:bg-blue-50/90 hover:text-blue-600 hover:shadow-sm border border-transparent hover:border-blue-100`;
};

const NOTIFICATION_PRIORITY = {
  report_ready: 0,
  manual_review: 0,
  ai_call_completed: 1,
  appointment_booked: 1,
  lead_captured: 2,
  sequence_enrolled: 2,
  level_up: 1,
  default: 3,
};

const PRIORITY_LABELS = {
  0: 'Critical',
  1: 'High',
  2: 'Medium',
  3: 'Normal',
};

const PRIORITY_BADGES = {
  0: 'bg-rose-500/15 text-rose-500 border border-rose-500/20',
  1: 'bg-amber-500/15 text-amber-500 border border-amber-500/20',
  2: 'bg-blue-500/15 text-blue-500 border border-blue-500/20',
  3: 'bg-slate-500/10 text-slate-500 border border-slate-500/10',
};

const NOTIFICATION_VISUALS = {
  report_ready: { icon: FileText, tone: 'text-purple-500 bg-purple-500/10' },
  manual_review: { icon: ClipboardCheck, tone: 'text-amber-500 bg-amber-500/10' },
  ai_call_completed: { icon: Phone, tone: 'text-emerald-500 bg-emerald-500/10' },
  appointment_booked: { icon: Calendar, tone: 'text-blue-500 bg-blue-500/10' },
  lead_captured: { icon: Users, tone: 'text-orange-500 bg-orange-500/10' },
  sequence_enrolled: { icon: Mail, tone: 'text-indigo-500 bg-indigo-500/10' },
  level_up: { icon: Gift, tone: 'text-amber-500 bg-amber-500/10' },
  default: { icon: Sparkles, tone: 'text-slate-500 bg-slate-500/10' },
};

export default function Dashboard() {
  const { user, logout } = useAuth();

  const getStoredNumber = (key, fallback = 0) => {
    if (typeof window === 'undefined') return fallback;
    const raw = window.localStorage.getItem(key);
    const value = Number(raw);
    return Number.isFinite(value) ? value : fallback;
  };

  const getStoredObject = (key, fallback = {}) => {
    if (typeof window === 'undefined') return fallback;
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.warn('Unable to parse stored data for', key, error);
      return fallback;
    }
  };

  const defaultCreditBuckets = useMemo(
    () => ({
      scans: 0,
      voice: 0,
      sms: 0,
      email: 0,
      leads: 0,
    }),
    []
  );

  const defaultUsageRules = useMemo(
    () => ({
      scans: true,
      voice: true,
      sms: true,
      email: true,
      leads: true,
    }),
    []
  );

  const [theme, setTheme] = useState(() => window.localStorage.getItem('dashboardTheme') || 'dark');
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedLead, setSelectedLead] = useState(null);
  const [stats, setStats] = useState(null);
  const [appConfig, setAppConfig] = useState(DEFAULT_APP_CONFIG);
  const [kpiData, setKpiData] = useState({});
  const [leadQueue, setLeadQueue] = useState({});
  const [hotLeads, setHotLeads] = useState([]);
  const [leadList, setLeadList] = useState([]);
  const [leadLoading, setLeadLoading] = useState(true);
  const [clusters, setClusters] = useState([]);
  const [activity, setActivity] = useState([]);
  const [usageSummary, setUsageSummary] = useState({});
  const [roiSummary, setRoiSummary] = useState(null);
  const [dashboardErrors, setDashboardErrors] = useState([]);
  const [taskReminders, setTaskReminders] = useState([]);
  const [summaryGeneratedAt, setSummaryGeneratedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sequences, setSequences] = useState([]);
  const [sequenceModal, setSequenceModal] = useState({ open: false, lead: null, sequenceId: '' });
  const [sequenceLoading, setSequenceLoading] = useState(false);
  const [showNotificationTray, setShowNotificationTray] = useState(false);
  const [lastNotificationViewedAt, setLastNotificationViewedAt] = useState(() => 0);
  const [selectedMapLeadId, setSelectedMapLeadId] = useState(null);
  const [points, setPoints] = useState(() => getStoredNumber('fm_points', 0));
  const [level, setLevel] = useState(() => getStoredNumber('fm_level', 1) || 1);
  const [completedQuests, setCompletedQuests] = useState(() => getStoredObject('fm_completed_quests', {}));
  const [progressionTier, setProgressionTier] = useState(() => getStoredNumber('fm_progression_tier', 0));
  const [progressionMetrics, setProgressionMetrics] = useState(() =>
    getStoredObject('fm_progression_metrics', {
      scans_started: 0,
      reports_generated: 0,
      wallet_reload_total: 0,
      campaigns_launched: 0,
    })
  );
  const [reportPreview, setReportPreview] = useState(null);
  const [reportLeadId, setReportLeadId] = useState(null);
  const [showEnhancedReportGenerator, setShowEnhancedReportGenerator] = useState(false);
  const [generatorLeadOverride, setGeneratorLeadOverride] = useState(null);
  const [businessProfile, setBusinessProfile] = useState(null);
  const [showWelcomeCelebration, setShowWelcomeCelebration] = useState(false);
  const [welcomeReward, setWelcomeReward] = useState(null);
  const [redeemedLeads, setRedeemedLeads] = useState(() => getStoredNumber('fm_redeemed_leads', 0));
  const [walletBalance, setWalletBalance] = useState(() => getStoredNumber('fm_wallet_balance', 0));
  const [creditBuckets, setCreditBuckets] = useState(() => {
    const stored = getStoredObject('fm_credit_buckets', {});
    return { ...defaultCreditBuckets, ...stored };
  });
  const [usageRules, setUsageRules] = useState(() => {
    const stored = getStoredObject('fm_credit_usage_rules', {});
    return { ...defaultUsageRules, ...stored };
  });
  const [pointHistory, setPointHistory] = useState(() => {
    const history = getStoredObject('fm_point_history', []);
    return Array.isArray(history) ? history : [];
  });
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [streak, setStreak] = useState(() => getStoredNumber('fm_login_streak', 0));
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState('');
  const [celebrationQuote, setCelebrationQuote] = useState('');
  const [pointBursts, setPointBursts] = useState([]);
  const [recentlyRewardedLeadId, setRecentlyRewardedLeadId] = useState(null);
  const [walletRewardsModal, setWalletRewardsModal] = useState({ open: false, tab: 'wallet' });
  const [pendingTransaction, setPendingTransaction] = useState(null);
  const [helpConversation, setHelpConversation] = useState([]);
  const [helpIsTyping, setHelpIsTyping] = useState(false);
  const [helpAvailableTopics, setHelpAvailableTopics] = useState(() => mapHelpOptions(HELP_DEFAULT_OPTIONS));
  const [manualReviewQueue, setManualReviewQueue] = useState([]);
  const [activeManualReview, setActiveManualReview] = useState(null);
  const progressionTaskMap = useMemo(() => {
    const map = {};
    PROGRESSION_PROGRAM.forEach((tier) => {
      tier.tasks.forEach((task) => {
        map[task.id] = task;
      });
    });
    return map;
  }, []);
  const getWalletRotationSeed = () => {
    const today = new Date().toISOString().slice(0, 10);
    if (typeof window === 'undefined') return { date: today, wave: 0 };
    try {
      const stored = JSON.parse(window.localStorage.getItem('fm_wallet_rotation_meta') || 'null');
      if (stored && stored.date === today && typeof stored.wave === 'number') {
        return stored;
      }
    } catch (error) {
      console.warn('wallet rotation parse error', error);
    }
    return { date: today, wave: 0 };
  };
  const [walletRotationMeta, setWalletRotationMeta] = useState(getWalletRotationSeed);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const isDark = theme === 'dark';
  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  const headingClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';
  const totalLeadBadge = stats?.total_leads != null ? stats.total_leads.toLocaleString() : '0';
  const clusterBadge = clusters?.length != null ? clusters.length.toString() : '0';
  const notificationTrayRef = useRef(null);
  const profileMenuRef = useRef(null);
  const profileComplete = useMemo(
    () => Boolean(user?.company_name && user?.company_name !== 'Fish Mouth User'),
    [user?.company_name]
  );
  const supportDisplayName = user?.name || user?.email || 'there';
  const supportCompanyLabel = user?.company_name && user?.company_name !== 'Fish Mouth User' ? user.company_name : 'your account';
  const hasSequences = sequences.length > 0;
  const computeLevel = useCallback((value) => {
    if (!Number.isFinite(value) || value < 0) return 1;
    let levelCandidate = 1;
    for (let idx = 0; idx < 100; idx += 1) {
      const threshold = getLevelThreshold(idx + 1);
      const nextThreshold = getLevelThreshold(idx + 2);
      if (value < nextThreshold) {
        levelCandidate = idx + 1;
        break;
      }
      levelCandidate = idx + 2;
    }
    return levelCandidate;
  }, []);
  const broadcastBillingRefresh = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fm-billing-refresh'));
    }
  }, []);

  useEffect(() => {
    if (helpConversation.length === 0) {
      setHelpConversation([
        {
          id: 'help-intro',
          from: 'bot',
          text: `Hi ${user?.name || 'there'}! I can help you navigate billing, campaigns, or lead quality checks.`,
          timestamp: new Date().toISOString(),
        },
        {
          id: 'help-prompt',
          from: 'bot',
          text: 'Choose a quick topic below or ask to speak with a specialist.',
          timestamp: new Date().toISOString(),
        },
      ]);
      setHelpAvailableTopics(mapHelpOptions(HELP_DEFAULT_OPTIONS));
    }
  }, [helpConversation.length, user?.name]);

  useEffect(() => {
    const handleManualReviewEvent = (event) => {
      const detail = event?.detail;
      if (!detail?.id) return;
      const review = {
        ...detail,
        status: 'pending',
        createdAt: detail.createdAt || new Date().toISOString(),
      };
      setManualReviewQueue((prev) => {
        const filtered = prev.filter((item) => item.id !== review.id);
        return [review, ...filtered].slice(0, 25);
      });
      setActivity((prev) => [
        {
          id: review.id,
          type: 'manual_review',
          payload: { reviewId: review.id, review, stepLabel: review.stepLabel, sequenceName: review.sequenceName },
          occurred_at: review.createdAt,
        },
        ...prev,
      ]);
      toast('Manual review queued — open notifications to approve.', { icon: '📝' });
      setActiveManualReview(review);
    };

    window.addEventListener('fm-manual-review', handleManualReviewEvent);
    return () => window.removeEventListener('fm-manual-review', handleManualReviewEvent);
  }, [setActivity]);

  useEffect(() => {
    if (!user?.email) return;
    const normalizedEmail = user.email.toLowerCase();
    if (!normalizedEmail.includes('test')) return;
    setWalletBalance((prev) => {
      if (prev === 0) return prev;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('fm_wallet_balance', '0');
      }
      return 0;
    });
  }, [user?.email]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedReward = window.localStorage.getItem('fm_onboarding_reward');
    const welcomeShown = window.localStorage.getItem('fm_onboarding_welcome_shown') === '1';
    if (!storedReward) {
      setWelcomeReward(null);
      setShowWelcomeCelebration(false);
      return;
    }
    try {
      const parsed = JSON.parse(storedReward);
      setWelcomeReward(parsed);
      setShowWelcomeCelebration(!welcomeShown);
    } catch (error) {
      console.warn('welcome reward parse error', error);
      setWelcomeReward(null);
      setShowWelcomeCelebration(false);
    }
  }, [user?.id]);

  const logPointEvent = useCallback(
    (amount, reason, meta = {}) => {
      const entry = {
        amount,
        reason,
        timestamp: new Date().toISOString(),
        ...meta,
      };
      setPointHistory((prev) => {
        const history = [entry, ...prev].slice(0, 50);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('fm_point_history', JSON.stringify(history));
        }
        return history;
      });
      const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
      if (token) {
        fetch('/api/points/log', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(entry),
        }).catch(() => {
          /* swallow logging errors */
        });
      }
    },
    []
  );

  const appendHelpMessage = useCallback((message) => {
    setHelpConversation((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${prev.length}`,
        timestamp: new Date().toISOString(),
        ...message,
      },
    ]);
  }, []);

  const queueHelpFollowups = useCallback((options) => {
    if (!options || options.length === 0) {
      setHelpAvailableTopics(mapHelpOptions(HELP_DEFAULT_OPTIONS));
      return;
    }
    setHelpAvailableTopics(mapHelpOptions(options));
  }, []);

  const launchCelebration = useCallback((message, options = {}) => {
    const quotes = ROOFER_CELEBRATION_QUOTES;
    const fallbackQuote =
      quotes[Math.floor(Math.random() * quotes.length)] || 'Keep stacking wins and bank those referrals.';
    const quote =
      typeof options.quote === 'string' && options.quote.trim().length > 0 ? options.quote : fallbackQuote;
    setCelebrationMessage(message);
    setCelebrationQuote(quote);
    setShowCelebration(true);
  }, []);

  const spawnPointBurst = useCallback((amount, reason) => {
    if (!amount) return;
    const id = `${Date.now()}-${Math.random()}`;
    setPointBursts((prev) => [...prev, { id, amount, reason }]);
    setTimeout(() => {
      setPointBursts((prev) => prev.filter((burst) => burst.id !== id));
    }, 1800);
  }, []);

  const dismissWelcomeCelebration = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('fm_onboarding_welcome_shown', '1');
    }
    setShowWelcomeCelebration(false);
  }, []);

  const registerLeadReward = useCallback((leadId) => {
    if (!leadId) return;
    const numericId = Number(leadId);
    setRecentlyRewardedLeadId(numericId);
    setTimeout(() => {
      setRecentlyRewardedLeadId((prev) => (prev === numericId ? null : prev));
    }, 1000);
  }, []);

  const pushLevelUpNotification = useCallback(
    (newLevel) => {
      if (newLevel < 3) return;
      const now = Date.now();
      const bonusOffer = newLevel >= 4 ? 'Double deposit boost unlocked.' : '50% reload bonus ready.';
      const note = {
        id: `level-up-${now}`,
        type: 'level_up',
        priority: 1,
        priorityLabel: PRIORITY_LABELS[1],
        timestamp: new Date(now),
        timestampMs: now,
        leadId: null,
        title: `Level ${newLevel} unlocked — claim your premium perks`,
        message: `Level ${newLevel} unlocked — claim your premium perks`,
        payload: { level: newLevel, bonusOffer },
        raw: { type: 'level_up', payload: { level: newLevel, bonusOffer } },
        visual: NOTIFICATION_VISUALS.level_up,
        cta: 'Redeem rewards',
        bonusOffer,
      };
      setActivity((prev) => {
        const merged = [note, ...prev];
        return merged.slice(0, 25);
      });
      setShowNotificationTray(true);
    },
    [setActivity, setShowNotificationTray]
  );

  const awardPoints = useCallback(
    (amount, reason, meta = {}) => {
      if (!amount) return;
      setPoints((prev) => {
        const previous = prev ?? 0;
        const next = previous + amount;
        const prevLevel = computeLevel(previous);
        const nextLevel = computeLevel(next);
        if (nextLevel > prevLevel) {
          launchCelebration(`⭐ Level ${nextLevel} unlocked — premium automations activated.`);
          pushLevelUpNotification(nextLevel);
        }
        toast.success(`+${amount} pts${reason ? ` • ${reason}` : ''}`);
        return next;
      });
      logPointEvent(amount, reason, meta);
      spawnPointBurst(amount, reason);
      if (meta?.leadId) {
        registerLeadReward(meta.leadId);
      }
    },
    [computeLevel, logPointEvent, launchCelebration, spawnPointBurst, registerLeadReward, pushLevelUpNotification]
  );

  const handleCloseCelebration = useCallback(() => {
    setShowCelebration(false);
    setCelebrationQuote('');
  }, []);

  const markQuestComplete = useCallback(
    (questId, rewardPoints = 0, reason = 'Quest complete', meta = {}) => {
      if (!questId) return;
      let alreadyCompleted = false;
      setCompletedQuests((prev) => {
        if (prev[questId]) {
          alreadyCompleted = true;
          return prev;
        }
        return { ...prev, [questId]: true };
      });
      if (!alreadyCompleted && rewardPoints) {
        awardPoints(rewardPoints, reason, { ...meta, questId });
      } else if (!alreadyCompleted && !rewardPoints && Object.keys(meta || {}).length) {
        logPointEvent(0, reason, { ...meta, questId });
      }
    },
    [awardPoints, logPointEvent]
  );

  const updateProgressionMetrics = useCallback((updater) => {
    setProgressionMetrics((prev) => {
      const base = {
        scans_started: 0,
        reports_generated: 0,
        wallet_reload_total: 0,
        campaigns_launched: 0,
        ...prev,
      };
      const next = typeof updater === 'function' ? updater(base) : { ...base, ...updater };
      return next;
    });
  }, []);


  const handleHelpTopic = useCallback(
    (option) => {
      const choice = typeof option === 'string' ? { id: option } : option;
      const script = HELP_SCRIPTS[choice.id];
      const responses = choice.responses || script?.responses || [];
      const label = choice.label || script?.title || 'Help request';

      appendHelpMessage({ from: 'user', text: label });

      if (!responses.length && !script) {
        appendHelpMessage({
          from: 'bot',
          text: 'Thanks for the note — I have notified a billing specialist who will respond by email shortly.',
        });
        queueHelpFollowups([]);
        return;
      }

      setHelpIsTyping(true);
      const typingDelay = 420;
      responses.forEach((line, index) => {
        setTimeout(() => {
          appendHelpMessage({ from: 'bot', text: line });
        }, typingDelay * (index + 1));
      });

      if (responses.length === 0) {
        setHelpIsTyping(false);
        queueHelpFollowups(choice.followups || script?.followups || []);
        return;
      }

      const baseDelay = typingDelay * responses.length;
      if (choice.id === 'support') {
        const accountLine = `Hi ${supportDisplayName}, this is Riley — I’m looking at ${supportCompanyLabel} now. Wallet balance is $${(walletBalance ?? 0).toFixed(2)} with ${points.toLocaleString()} pts ready to use.`;
        const giftLine =
          'I’ve also added a 25 pt courtesy credit and queued an AI review so any unresponsive lead triggers two instant replacements. If one lands you a $25K roof, send me the win!';

        setTimeout(() => {
          appendHelpMessage({ from: 'bot', text: accountLine });
        }, baseDelay + 480);

        setTimeout(() => {
          appendHelpMessage({ from: 'bot', text: giftLine });
          awardPoints(25, 'Help desk courtesy credit', { type: 'support_gift' });
          setHelpIsTyping(false);
          queueHelpFollowups(HELP_DEFAULT_OPTIONS);
        }, baseDelay + 1200);
      } else {
        setTimeout(() => {
          setHelpIsTyping(false);
          queueHelpFollowups(choice.followups || script?.followups || []);
        }, baseDelay + 360);
      }
    },
    [appendHelpMessage, queueHelpFollowups, supportDisplayName, supportCompanyLabel, walletBalance, points, awardPoints]
  );
  const levelBasePoints = useMemo(() => getLevelThreshold(level), [level]);
  const nextLevelPoints = useMemo(() => getLevelThreshold(level + 1), [level]);
  const levelProgress = useMemo(() => {
    const span = Math.max(1, nextLevelPoints - levelBasePoints);
    const progress = (points - levelBasePoints) / span;
    return Math.max(0, Math.min(1, progress));
  }, [points, levelBasePoints, nextLevelPoints]);
  const openWalletRewards = useCallback((tab = 'wallet') => {
    setWalletRewardsModal({ open: true, tab });
  }, []);

  const closeWalletRewards = useCallback(() => {
    setWalletRewardsModal((prev) => ({ ...prev, open: false }));
  }, []);

  const handleRedeemLeadCredit = useCallback(() => {
    if (points < POINTS_PER_LEAD) {
      const shortfall = POINTS_PER_LEAD - points;
      toast.error(`Earn ${shortfall} more pts to redeem a free lead.`);
      return;
    }
    setPoints((prev) => Math.max(0, prev - POINTS_PER_LEAD));
    setRedeemedLeads((prev) => prev + 1);
    logPointEvent(-POINTS_PER_LEAD, 'Redeemed free lead', { type: 'redeem' });
    toast.success('Free lead credit issued! Your next AI-qualified prospect will be added automatically.');
  }, [points, logPointEvent]);

  const walletDailyTasks = useMemo(() => {
    const daysToBonus = streak > 0 ? (streak % 7 === 0 ? 0 : 7 - (streak % 7)) : 7;
    const autoChannelsEnabled = Object.values(usageRules || {}).filter(Boolean).length;
    const baseTasks = [
      {
        id: 'wallet-topup',
        title: 'Reload your wallet',
        description: 'Add funds so SmartScans and AI voice never pause.',
        points: 40,
        requiresPurchase: true,
        actionLabel: 'Add money',
        completed: completedQuests['wallet-topup'] || walletBalance > 0,
        onAction: () => openWalletRewards('wallet'),
      },
      {
        id: 'points-exchange',
        title: 'Convert points into credits',
        description: 'Swap loyalty points for SMS, email, or voice credits.',
        points: 35,
        actionLabel: 'Open exchange',
        completed: completedQuests['points-exchange'] || points < POINTS_PER_LEAD,
        onAction: () => openWalletRewards('rewards'),
      },
      {
        id: 'redeem',
        title: 'Redeem a free lead',
        description: 'Cash in 100 pts for an AI-qualified lead credit.',
        points: 30,
        actionLabel: points >= POINTS_PER_LEAD ? 'Redeem now' : 'Earn points',
        completed: completedQuests.redeem || points < POINTS_PER_LEAD,
        onAction: () => {
          if (points >= POINTS_PER_LEAD) {
            handleRedeemLeadCredit();
          } else {
            openWalletRewards('rewards');
          }
        },
      },
      {
        id: 'auto-spend',
        title: 'Enable auto-spend routing',
        description: 'Toggle auto-spend for at least one feature so credits auto-top-up.',
        points: 25,
        actionLabel: autoChannelsEnabled ? 'Auto enabled' : 'Enable routing',
        completed: completedQuests['auto-spend'] || autoChannelsEnabled > 0,
        onAction: () => openWalletRewards('wallet'),
      },
      {
        id: 'streak',
        title: 'Daily streak hero',
        description:
          daysToBonus === 0
            ? 'Weekly bonus unlocked! Claim your reward.'
            : `Stay active ${daysToBonus} more day${daysToBonus === 1 ? '' : 's'} to trigger a weekly bonus.`,
        points: 20,
        actionLabel: 'View streak',
        completed: completedQuests.streak || (streak > 0 && streak % 7 === 0),
        onAction: () => openWalletRewards('rewards'),
      },
    ];
    const count = Math.min(4, baseTasks.length);
    const startIndex = walletRotationMeta.wave % baseTasks.length;
    return Array.from({ length: count }).map((_, idx) => baseTasks[(startIndex + idx) % baseTasks.length]);
  }, [streak, usageRules, walletRotationMeta.wave, completedQuests, walletBalance, points, openWalletRewards, handleRedeemLeadCredit]);
  const walletDailyRotation = useMemo(
    () => ({
      date: walletRotationMeta.date,
      wave: walletRotationMeta.wave,
      tasks: walletDailyTasks,
    }),
    [walletRotationMeta, walletDailyTasks]
  );
  const refreshWalletDailyTasks = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    setWalletRotationMeta((prev) => ({
      date: today,
      wave: prev.date === today ? prev.wave + 1 : 1,
    }));
  }, []);
  const manualReviewMap = useMemo(() => {
    const map = new Map();
    manualReviewQueue.forEach((review) => {
      map.set(review.id, review);
    });
    return map;
  }, [manualReviewQueue]);

  const leadsForReports = useMemo(() => {
    if (hotLeads.length) {
      return hotLeads;
    }
    return leadList;
  }, [hotLeads, leadList]);

  const selectedReportLead = useMemo(() => {
    if (!Array.isArray(leadsForReports) || leadsForReports.length === 0) {
      return null;
    }
    if (reportLeadId != null) {
      const matched = leadsForReports.find(
        (lead) => Number(lead.id) === Number(reportLeadId)
      );
      if (matched) {
        return matched;
      }
    }
    return leadsForReports[0] || null;
  }, [leadsForReports, reportLeadId]);

  const activeGeneratorLead = generatorLeadOverride || selectedReportLead || null;

  useEffect(() => {
    if (!generatorLeadOverride) return;
    const overrideId = generatorLeadOverride.id;
    const overrideResolved = Array.isArray(leadsForReports)
      ? leadsForReports.some((lead) => Number(lead.id) === Number(overrideId))
      : false;
    if (overrideResolved) {
      setGeneratorLeadOverride(null);
    }
  }, [generatorLeadOverride, leadsForReports]);


const notifications = useMemo(() => {
    if (!Array.isArray(activity)) return [];
    return activity
      .map((item) => {
        const rawType = item?.type || 'default';
        const timestamp =
          item?.occurred_at || item?.timestamp || item?.payload?.timestamp || new Date().toISOString();
        const parsed = new Date(timestamp);
        const timestampMs = Number.isNaN(parsed.getTime()) ? Date.now() : parsed.getTime();
        const priority = NOTIFICATION_PRIORITY[rawType] ?? NOTIFICATION_PRIORITY.default;
        const visual = NOTIFICATION_VISUALS[rawType] || NOTIFICATION_VISUALS.default;
        return {
          id: item?.id || `${rawType}-${timestampMs}`,
          type: rawType,
          priority,
          priorityLabel: PRIORITY_LABELS[priority] || PRIORITY_LABELS[3],
          timestamp: parsed,
          timestampMs,
          raw: item,
          leadId: item?.payload?.lead_id || item?.lead_id,
          title: renderActivityLabel(item),
          message: item?.message,
          bonusOffer: item?.bonusOffer || item?.payload?.bonusOffer,
          cta: item?.cta,
          visual,
        };
      })
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return b.timestampMs - a.timestampMs;
      });
  }, [activity]);

  const unseenCount = useMemo(
    () => notifications.filter((note) => note.timestampMs > lastNotificationViewedAt).length,
    [notifications, lastNotificationViewedAt]
  );

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, description: 'Your roofing business overview' },
    { id: 'leads', label: 'Hot Leads', icon: Users, description: 'Leads that need immediate attention', badge: totalLeadBadge },
    { id: 'scanner', label: 'Roof Scanner', icon: Scan, description: 'Analyze properties for damage', badge: clusterBadge },
    { id: 'reports', label: 'Customer Reports', icon: FileText, description: 'Generate homeowner-ready dossiers' },
    { id: 'calls', label: 'Call Log', icon: Phone, description: 'Track customer conversations' },
    { id: 'sequences', label: 'Follow-up', icon: Mail, description: 'Automated customer nurturing' },
    { id: 'analytics', label: 'Business Metrics', icon: Sparkles, description: 'Track performance and ROI' },
    { id: 'help', label: 'Help Center', icon: LifeBuoy, description: 'Guided answers & live support' },
    { id: 'activity', label: 'Notifications', icon: Bell, description: 'Live intelligence feed' },
  ];

  const activeNav = navItems.find((item) => item.id === activeView);
  const headerLabel = activeView === 'lead-detail' ? 'Lead dossier' : activeNav?.label || 'Mission Control';
  const headerDescription =
    activeView === 'lead-detail'
      ? 'All intelligence for this property in one dossier'
      : activeNav?.description || 'Navigate the platform';
  useEffect(() => {
    loadAppConfig();
    refreshData();
    
    // Only attempt WebSocket connection if not in development or if endpoint exists
    let ws = null;
    try {
      ws = new WebSocket(websocketUrl());
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setActivity((prev) => {
            const merged = [message, ...prev];
            return merged.slice(0, 25);
          });
          if (message.type === 'report_ready') {
            refreshHotLeads();
          }
        } catch (error) {
          console.error('activity stream parse error', error);
        }
      };
      ws.onerror = (error) => {
        console.log('WebSocket not available - running in demo mode');
      };
      ws.onclose = () => {
        console.log('WebSocket connection closed');
      };
    } catch (error) {
      console.log('WebSocket not supported - running in demo mode');
    }
    
    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    window.localStorage.setItem('dashboardTheme', theme);
  }, [theme]);

  useEffect(() => {
    const loadSequences = async () => {
      try {
        const data = await leadAPI.getSequences();
        if (Array.isArray(data)) {
          setSequences(data);
        }
      } catch (error) {
        console.error('Failed to load sequences', error);
      }
    };
    loadSequences();
  }, []);

  // Load business profile for report generation
  useEffect(() => {
    const loadBusinessProfile = async () => {
      try {
        const profile = await businessProfileService.load();
        if (profile) {
          setBusinessProfile(profile);
        }
      } catch (error) {
        console.error('Failed to load business profile:', error);
      }
    };

    loadBusinessProfile();
  }, []);

  useEffect(() => {
    if (profileComplete) {
      const reward = progressionTaskMap['progress.profile.complete']?.points || 0;
      markQuestComplete('progress.profile.complete', reward, 'Business profile completed', {
        type: 'progression_profile',
      });
    }
  }, [profileComplete, markQuestComplete, progressionTaskMap]);

  useEffect(() => {
    if (selectedMapLeadId) return;
    const candidate = hotLeads[0] || leadList[0];
    if (candidate) {
      setSelectedMapLeadId(candidate.id);
    }
  }, [hotLeads, leadList, selectedMapLeadId]);

  useEffect(() => {
    if (reportLeadId) return;
    const candidate = hotLeads[0] || leadList[0];
    if (candidate) {
      setReportLeadId(candidate.id);
    }
  }, [hotLeads, leadList, reportLeadId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('fm_redeemed_leads', String(redeemedLeads));
    }
  }, [redeemedLeads]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('fm_wallet_balance', String(walletBalance));
    }
  }, [walletBalance]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('fm_credit_buckets', JSON.stringify(creditBuckets));
    }
  }, [creditBuckets]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('fm_credit_usage_rules', JSON.stringify(usageRules));
    }
  }, [usageRules]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('fm_wallet_rotation_meta', JSON.stringify(walletRotationMeta));
    }
  }, [walletRotationMeta]);

  useEffect(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    if (walletRotationMeta.date !== todayKey) {
      setWalletRotationMeta({ date: todayKey, wave: 0 });
    }
  }, [walletRotationMeta.date]);

  useEffect(() => {
    const handleExternalBillingUpdate = () => {
      setWalletBalance((prev) => {
        const next = getStoredNumber('fm_wallet_balance', prev);
        return Number.isFinite(next) ? next : prev;
      });
      setCreditBuckets((prev) => {
        const stored = getStoredObject('fm_credit_buckets', prev);
        const merged = { ...defaultCreditBuckets, ...stored };
        return JSON.stringify(prev) === JSON.stringify(merged) ? prev : merged;
      });
      setUsageRules((prev) => {
        const stored = getStoredObject('fm_credit_usage_rules', prev);
        const merged = { ...defaultUsageRules, ...stored };
        return JSON.stringify(prev) === JSON.stringify(merged) ? prev : merged;
      });
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('fm-billing-refresh', handleExternalBillingUpdate);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('fm-billing-refresh', handleExternalBillingUpdate);
      }
    };
  }, [defaultCreditBuckets, defaultUsageRules]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('fm_login_streak', String(streak));
    }
  }, [streak]);

  useEffect(() => {
    const computed = computeLevel(points);
    if (computed !== level) {
      setLevel(computed);
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('fm_points', String(points));
      window.localStorage.setItem('fm_level', String(computed));
    }
  }, [points, level, computeLevel]);

  useEffect(() => {
    const currentIndex = Math.min(progressionTier, PROGRESSION_PROGRAM.length - 1);
    const currentTier = PROGRESSION_PROGRAM[currentIndex];
    if (!currentTier) return;
    const allComplete = currentTier.tasks.every((task) => completedQuests[task.id]);
    if (allComplete && progressionTier < PROGRESSION_PROGRAM.length) {
      const nextTierIndex = Math.min(progressionTier + 1, PROGRESSION_PROGRAM.length);
      if (nextTierIndex !== progressionTier) {
        setProgressionTier(nextTierIndex);
        const nextTier = PROGRESSION_PROGRAM[Math.min(nextTierIndex, PROGRESSION_PROGRAM.length - 1)];
        const message = nextTier
          ? `${currentTier.label} complete — ${nextTier.label} unlocked!`
          : `${currentTier.label} complete — mastery achieved!`;
        launchCelebration(`🚀 ${message}`);
      }
    }
  }, [completedQuests, progressionTier, launchCelebration]);

  useEffect(() => {
    const todayKey = getTodayKey();
    const dailyIds = [`daily.streak.${todayKey}`, `daily.contact.${todayKey}`, `daily.report.${todayKey}`];
    const allDailyComplete = dailyIds.every((id) => completedQuests[id]);
    const bundleId = `daily.bundle.${todayKey}`;
    if (allDailyComplete && !completedQuests[bundleId]) {
      markQuestComplete(bundleId, 60, 'Daily quests complete', { type: 'daily_bundle', date: todayKey });
      launchCelebration('🔥 Daily quests complete! Bonus unlocked.');
    }
  }, [completedQuests, markQuestComplete, launchCelebration]);

  useEffect(() => {
    const metrics = progressionMetrics || {};
    const scanFirstPoints = progressionTaskMap['progress.scan.first']?.points || 0;
    const scanFivePoints = progressionTaskMap['progress.scan.five']?.points || 0;
    const wallet500Points = progressionTaskMap['progress.wallet.500']?.points || 0;
    const wallet1500Points = progressionTaskMap['progress.wallet.1500']?.points || 0;
    const reportsTenPoints = progressionTaskMap['progress.reports.ten']?.points || 0;

    if ((metrics.scans_started ?? 0) >= 1) {
      markQuestComplete('progress.scan.first', scanFirstPoints, 'First SmartScan launched', {
        type: 'progression_scan',
        count: metrics.scans_started,
      });
    }
    if ((metrics.scans_started ?? 0) >= 5) {
      markQuestComplete('progress.scan.five', scanFivePoints, 'Five SmartScans completed', {
        type: 'progression_scan',
        count: metrics.scans_started,
      });
    }
    if ((metrics.wallet_reload_total ?? 0) >= 500) {
      markQuestComplete('progress.wallet.500', wallet500Points, 'Wallet reload milestone', {
        type: 'progression_wallet',
        totalReloaded: metrics.wallet_reload_total,
      });
    }
    if ((metrics.wallet_reload_total ?? 0) >= 1500) {
      markQuestComplete('progress.wallet.1500', wallet1500Points, 'Funded wallet with $1,500+', {
        type: 'progression_wallet',
        totalReloaded: metrics.wallet_reload_total,
      });
    }
    if ((metrics.reports_generated ?? 0) >= 10) {
      markQuestComplete('progress.reports.ten', reportsTenPoints, 'Ten AI dossiers delivered', {
        type: 'progression_reports',
        count: metrics.reports_generated,
      });
    }
  }, [progressionMetrics, markQuestComplete, progressionTaskMap]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('fm_completed_quests', JSON.stringify(completedQuests));
    }
  }, [completedQuests]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('fm_progression_metrics', JSON.stringify(progressionMetrics));
    }
  }, [progressionMetrics]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('fm_progression_tier', String(progressionTier));
    }
  }, [progressionTier]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);
    const lastBonus = window.localStorage.getItem('fm_last_bonus');
    if (lastBonus === todayKey) {
      return;
    }

    let nextStreak = 1;
    if (lastBonus) {
      const lastDate = new Date(lastBonus);
      const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        nextStreak = (streak || 0) + 1;
      }
    }

    if (!lastBonus) {
      nextStreak = Math.max(streak, 1);
    }

    setStreak(nextStreak);
    window.localStorage.setItem('fm_login_streak', String(nextStreak));
    window.localStorage.setItem('fm_last_bonus', todayKey);

    awardPoints(DAILY_LOGIN_BONUS, 'Daily login bonus', { type: 'daily_login', streak: nextStreak });

    if (nextStreak > 0 && nextStreak % 7 === 0) {
      const weeklyBonus = 100;
      awardPoints(weeklyBonus, `Weekly streak bonus (${nextStreak} days)`, {
        type: 'weekly_streak',
        streak: nextStreak,
      });
      setCompletedQuests((prev) => ({ ...prev, streak: true }));
    } else if (nextStreak === 1 || nextStreak % 7 === 1) {
      setCompletedQuests((prev) => ({ ...prev, streak: false }));
    }
  }, [awardPoints, streak]);

  useEffect(() => {
    if (!showNotificationTray) return;
    const handleClickAway = (event) => {
      if (notificationTrayRef.current && !notificationTrayRef.current.contains(event.target)) {
        setShowNotificationTray(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowNotificationTray(false);
      }
    };
    document.addEventListener('mousedown', handleClickAway);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickAway);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showNotificationTray]);

  useEffect(() => {
    if (!showProfileMenu) return;
    const handleClickAway = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickAway);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickAway);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showProfileMenu]);

  const toggleNotificationTray = () => {
    setShowProfileMenu(false);
    setShowNotificationTray((prev) => {
      const next = !prev;
      if (!prev) {
        setLastNotificationViewedAt(Date.now());
      }
      return next;
    });
  };

  const openFullNotifications = () => {
    setActiveView('activity');
    setShowNotificationTray(false);
    setLastNotificationViewedAt(Date.now());
  };

  const handleAssignSequence = (lead) => {
    if (!lead || !lead.id) return;
    if (!sequences.length) {
      toast.error('Create a sequence first to enroll this lead.');
      return;
    }
    setSequenceModal({ open: true, lead, sequenceId: String(sequences[0].id || sequences[0].sequence_id || '') });
  };

  const confirmSequenceEnrollment = async () => {
    if (!sequenceModal.lead || !sequenceModal.sequenceId) return;
    setSequenceLoading(true);
    try {
      await leadAPI.enrollLeadsInSequence(sequenceModal.sequenceId, [sequenceModal.lead.id]);
      toast.success(`Enrolled ${sequenceModal.lead.homeowner_name || sequenceModal.lead.address} into sequence`);
      setSequenceModal({ open: false, lead: null, sequenceId: '' });
      awardPoints(25, 'Sequence enrollment', { type: 'sequence', leadId: sequenceModal.lead.id });
      const reward = progressionTaskMap['progress.sequence.first']?.points || 0;
      markQuestComplete('progress.sequence.first', reward, 'Lead enrolled into automation', {
        type: 'progression_sequence',
        leadId: sequenceModal.lead.id,
      });
    } catch (error) {
      console.error('Failed to enroll lead into sequence', error);
      toast.error('Unable to enroll lead in sequence right now');
    } finally {
      setSequenceLoading(false);
    }
  };

  const hotLeadInsights = useMemo(() => {
    if (!hotLeads.length) {
      return { top: [], avgScore: 0, totalValue: 0 };
    }
    const top = [...hotLeads].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 3);
    const avgScore = Math.round(
      top.reduce((sum, lead) => sum + (lead.score || lead.lead_score || 0), 0) / top.length
    );
    const totalValue = top.reduce((sum, lead) => sum + (lead.damage_estimate || lead.estimated_value || 0), 0);
    return { top, avgScore, totalValue };
  }, [hotLeads]);

  const analyticsSnapshot = useMemo(() => {
    const voiceWins = activity.filter((item) => (item.type || '').includes('ai_call_completed')).length;
    const emails = activity.filter((item) => (item.type || '').includes('email')).length;
    const scans = activity.filter((item) => (item.type || '').includes('scan')).length;
    const avgLeadScore = leadList.length
      ? Math.round(leadList.reduce((sum, lead) => sum + (lead.lead_score || 0), 0) / leadList.length)
      : 0;
    return {
      voiceWins,
      emails,
      scans,
      avgLeadScore,
      totalLeads: leadList.length,
      hotLeadCount: hotLeads.length,
    };
  }, [activity, leadList, hotLeads]);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }),
    []
  );

  const refreshData = async () => {
    setLoading(true);
    try {
      await Promise.all([refreshStats(), refreshLeadList(), refreshActivity()]);
    } catch (error) {
      console.error('Failed to refresh data:', error);
      // Load mock data on error
      loadMockData();
    }
    setLoading(false);
  };

  const loadMockData = () => {
    setStats({
      total_leads: 1247,
      ultra_hot_leads: 89,
      appointments_booked: 156,
      active_clusters: 23,
      new_clusters: 7,
      conversion_rate: 12.8,
      leads_over_time: [
        { date: '2024-01-01', leads: 45 },
        { date: '2024-01-02', leads: 52 },
        { date: '2024-01-03', leads: 48 },
        { date: '2024-01-04', leads: 61 },
        { date: '2024-01-05', leads: 55 },
        { date: '2024-01-06', leads: 67 },
        { date: '2024-01-07', leads: 72 }
      ],
      conversion_funnel: [
        { stage: 'Captured', count: 1247 },
        { stage: 'Qualified', count: 892 },
        { stage: 'Contacted', count: 567 },
        { stage: 'Appointments', count: 156 }
      ]
    });

    setKpiData({
      hot_leads_today: { label: 'Hot Leads (Today)', value: 9, period: '24h' },
      warm_leads_today: { label: 'Warm Leads (Today)', value: 14, period: '24h' },
      reports_sent_7d: { label: 'Reports Sent', value: 32, period: '7d' },
      views_7d: { label: 'Report Views', value: 76, period: '7d' },
      replies_7d: { label: 'Replies / Clicks', value: 21, period: '7d' },
      appointments_7d: { label: 'Appointments', value: 11, period: '7d' },
    });
    setUsageSummary({
      voice_minutes: { quantity: 184, cost: 36.8 },
      sms_messages: { quantity: 245, cost: 19.6 },
      emails_sent: { quantity: 420, cost: 37.8 },
    });
    setRoiSummary({
      spend_last_30: 420,
      pipeline_value: 128000,
      closed_value: 38500,
      roi_percent: 204,
    });
    setDashboardErrors([
      { type: 'message.bounced', count: 2, last_seen: new Date().toISOString() },
      { type: 'call.failed', count: 1, last_seen: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
    ]);
    setTaskReminders([
      {
        id: 'task-followup-1',
        lead_id: 1,
        task_type: 'schedule_follow_up',
        scheduled_for: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      },
      {
        id: 'task-inspection-1',
        lead_id: 2,
        task_type: 'inspection_site_walk',
        scheduled_for: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      },
    ]);
    setSummaryGeneratedAt(new Date().toISOString());

    const now = new Date();
    const sampleHotLeads = [
      {
        id: 1,
        name: 'Sarah Johnson',
        address: '123 Oak Street, Austin, TX 78704',
        phone: '(555) 123-4567',
        email: 'sarah.johnson@email.com',
        score: 95,
        lead_score: 95,
        lead_source: 'Storm Activity',
        damage_estimate: 15000,
        last_contact: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'immediate',
        damage_indicators: ['hail_damage', 'dark_streaks'],
        image_quality_score: 84.5,
        quality_validation_status: 'passed',
        street_view_quality: {
          angles_captured: 3,
          average_quality: 0.88,
          average_occlusion: 0.18,
          headings: [45, 160, 245],
        },
      },
      {
        id: 2,
        name: 'Mike Chen',
        address: '456 Pine Avenue, Austin, TX 78705',
        phone: '(555) 987-6543',
        email: 'mike.chen@email.com',
        score: 88,
        lead_score: 88,
        lead_source: 'Neighbor Activity',
        damage_estimate: 22000,
        last_contact: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'urgent',
        damage_indicators: ['granule_loss', 'moss_growth'],
        image_quality_score: 73.2,
        quality_validation_status: 'review',
        street_view_quality: {
          angles_captured: 2,
          average_quality: 0.81,
          average_occlusion: 0.27,
          headings: [15, 210],
        },
      },
      {
        id: 3,
        name: 'Jennifer Williams',
        address: '789 Maple Drive, Austin, TX 78706',
        phone: '(555) 555-0123',
        email: 'jennifer.williams@email.com',
        score: 92,
        lead_score: 92,
        lead_source: 'Insurance Activity',
        damage_estimate: 18500,
        last_contact: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        status: 'immediate',
        damage_indicators: ['missing_shingles', 'discoloration'],
        image_quality_score: 90.1,
        quality_validation_status: 'passed',
        street_view_quality: {
          angles_captured: 3,
          average_quality: 0.9,
          average_occlusion: 0.12,
          headings: [90, 180, 330],
        },
      },
    ];

    setHotLeads(sampleHotLeads);
    setLeadQueue({
      hot: { label: 'HOT', leads: sampleHotLeads },
      warm: {
        label: 'WARM',
        leads: sampleHotLeads.map((lead, index) => ({
          ...lead,
          id: `warm-${index}`,
          lead_score: (lead.score || 80) - 12,
          lead_score_numeric: (lead.score || 80) - 12,
          priority: 'warm',
        })),
      },
      followups: { label: 'Follow-ups', leads: sampleHotLeads.slice(0, 2) },
      unreached: { label: 'Unreached', leads: [] },
      dnc: { label: 'DNC', leads: [] },
    });
    setLeadList(
      sampleHotLeads.map((item, index) => ({
        id: item.id || index + 1,
        address: item.address.split(',')[0],
        city: item.address.split(',')[1]?.trim().split(' ')[0] || 'Austin',
        state: item.address.split(',')[1]?.trim().split(' ')[1] || 'TX',
        zip_code: item.address.split(',')[2]?.trim() || '78704',
        lead_score: item.score,
        priority: item.status === 'immediate' ? 'hot' : 'warm',
        replacement_urgency: item.status,
        damage_indicators: item.damage_indicators,
        image_quality_score: item.image_quality_score,
        quality_validation_status: item.quality_validation_status,
        street_view_quality: item.street_view_quality,
        homeowner_name: item.name,
        homeowner_phone: item.phone,
        homeowner_email: item.email,
        roof_age_years: 19,
        roof_condition_score: 62,
        roof_material: 'Asphalt Shingles',
        ai_analysis: {
          summary: 'Detected hail impacts and discoloration on north slope.',
        },
      }))
    );
    setLeadLoading(false);

    setClusters([
      {
        id: 'west-austin-tx',
        city: 'Austin',
        state: 'TX',
        permit_count: 18,
        cluster_score: 88.5,
        cluster_status: 'hot',
        radius_miles: 0.5,
        date_range_start: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000).toISOString(),
        date_range_end: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: { hot_leads: 12, ultra_hot_leads: 5 },
      },
      {
        id: 'east-austin-tx',
        city: 'Austin',
        state: 'TX',
        permit_count: 12,
        cluster_score: 81.4,
        cluster_status: 'active',
        radius_miles: 0.5,
        date_range_start: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        date_range_end: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: { hot_leads: 9, ultra_hot_leads: 2 },
      },
      {
        id: 'south-austin-tx',
        city: 'Austin',
        state: 'TX',
        permit_count: 9,
        cluster_score: 76.9,
        cluster_status: 'warming',
        radius_miles: 0.5,
        date_range_start: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString(),
        date_range_end: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: { hot_leads: 6, ultra_hot_leads: 1 },
      },
    ]);

    setActivity([
      {
        id: 1,
        type: 'lead_captured',
        message: 'New lead captured: Sarah Johnson',
        payload: {
          lead_name: 'Sarah Johnson',
          lead_id: sampleHotLeads[0]?.id,
          timestamp: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
        },
        occurred_at: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
      },
      {
        id: 2,
        type: 'appointment_booked',
        message: 'Appointment booked with Mike Chen',
        payload: {
          lead_name: 'Mike Chen',
          lead_id: sampleHotLeads[1]?.id,
          timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        },
        occurred_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 3,
        type: 'report_ready',
        message: 'Report generated for West Austin Cluster',
        payload: {
          lead_name: 'Cluster - West Austin',
          lead_id: sampleHotLeads[0]?.id,
          report_id: 'report-west-austin',
          template: 'lead_dossier',
          timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
        },
        occurred_at: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 4,
        type: 'ai_call_completed',
        message: 'AI call completed with Jennifer Williams',
        payload: {
          lead_name: 'Jennifer Williams',
          lead_id: sampleHotLeads[2]?.id,
          call_id: 'call-jennifer',
          timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
        },
        occurred_at: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      },
    ]);
  };

  const loadAppConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      const etag = localStorage.getItem('appConfigEtag');
      const res = await fetch('/api/v1/app-config', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(etag ? { 'If-None-Match': etag } : {}),
        },
      });
      if (res.status === 304) {
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch app config');
      const data = await res.json();
      const config = {
        featureFlags: data.featureFlags || DEFAULT_APP_CONFIG.featureFlags,
        kpis: Array.isArray(data.kpis) && data.kpis.length ? data.kpis : DEFAULT_APP_CONFIG.kpis,
        leadTableColumns:
          Array.isArray(data.leadTableColumns) && data.leadTableColumns.length
            ? data.leadTableColumns
            : DEFAULT_APP_CONFIG.leadTableColumns,
        leadQueueTabs:
          Array.isArray(data.leadQueueTabs) && data.leadQueueTabs.length
            ? data.leadQueueTabs
            : DEFAULT_APP_CONFIG.leadQueueTabs,
      };
      setAppConfig(config);
      const incomingEtag = res.headers.get('ETag');
      if (incomingEtag) {
        localStorage.setItem('appConfigEtag', incomingEtag);
      }
    } catch (error) {
      console.error('Failed to load app config:', error);
      setAppConfig(DEFAULT_APP_CONFIG);
    }
  };

  const applyDashboardSummary = (data) => {
    if (!data || typeof data !== 'object') return;
    const metricsPayload = data.metrics || data;
    if (metricsPayload) {
      setStats(metricsPayload);
    }
    setKpiData(data.kpis || {});
    setLeadQueue(data.lead_queue || {});
    const hotBucket = data.lead_queue?.hot;
    if (Array.isArray(hotBucket)) {
      setHotLeads(hotBucket);
    } else if (hotBucket?.leads) {
      setHotLeads(hotBucket.leads);
    } else if (Array.isArray(data.hot_leads)) {
      setHotLeads(data.hot_leads);
    }
    if (Array.isArray(data.clusters)) {
      setClusters(data.clusters);
    }
    setUsageSummary(data.usage || {});
    setRoiSummary(data.roi || null);
    setDashboardErrors(data.errors_24h || []);
    setTaskReminders(data.tasks || []);
    setSummaryGeneratedAt(data.generated_at || null);
  };

  const refreshStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/v1/dashboard/summary?lead_limit=25', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error('Failed to fetch dashboard summary');
      const data = await res.json();
      applyDashboardSummary(data);
      return data;
    } catch (error) {
      console.error('Failed to fetch dashboard summary:', error);
      throw error;
    }
  };

  const refreshHotLeads = async () => {
    await refreshStats();
  };

  const refreshLeadList = async () => {
    try {
      setLeadLoading(true);
      const data = await leadAPI.getLeads({ limit: 150 });
      if (Array.isArray(data)) {
        setLeadList(data);
      } else if (Array.isArray(data?.leads)) {
        setLeadList(data.leads);
      } else {
        setLeadList([]);
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error);
      throw error;
    } finally {
      setLeadLoading(false);
    }
  };

  const refreshActivity = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/v1/activity?limit=20', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }
      });
      if (!res.ok) throw new Error('Failed to fetch activity');
      const data = await res.json();
      setActivity(data.events || data.activity || []);
    } catch (error) {
      console.error('Failed to fetch activity:', error);
      throw error;
    }
  };

  const handleGenerateReport = useCallback(
    (leadId = null, _template = 'lead_dossier', leadDetails = null) => {
      const numericId = leadId != null ? Number(leadId) : null;
      const findLead = (collection) =>
        Array.isArray(collection) && numericId != null
          ? collection.find((lead) => Number(lead.id) === numericId)
          : null;

      const candidateLead =
        findLead(leadsForReports) ||
        findLead(leadList) ||
        findLead(hotLeads) ||
        (leadDetails && typeof leadDetails === 'object' ? leadDetails : null);

      const fallbackLead = candidateLead || (typeof leadDetails === 'object' ? leadDetails : null) || selectedReportLead || null;

      if (candidateLead?.id != null) {
        setReportLeadId(candidateLead.id);
      } else if (numericId != null && !candidateLead) {
        toast.error('Selected lead is not available yet. Try refreshing leads.');
      }

      if (!fallbackLead) {
        toast.error('Select or load a lead before generating a report');
      }

      setGeneratorLeadOverride(fallbackLead);
      setReportPreview(null);
      setShowEnhancedReportGenerator(true);
    },
    [hotLeads, leadList, leadsForReports, selectedReportLead]
  );

  const handleStartAICampaign = async (leadIds) => {
    try {
      const response = await fetch('/api/v1/ai-voice/campaign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lead_ids: leadIds }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('AI campaign started:', result);
        toast.success('AI campaign queued');
        updateProgressionMetrics((metrics) => ({
          ...metrics,
          campaigns_launched: (metrics.campaigns_launched || 0) + 1,
        }));
        awardPoints(20, 'AI campaign launched', {
          type: 'campaign',
          leadCount: Array.isArray(leadIds) ? leadIds.length : 1,
        });
      } else {
        console.error('Failed to start AI campaign');
        toast.error('Unable to start AI campaign right now');
      }
    } catch (error) {
      console.error('Error starting AI campaign:', error);
      toast.error('Error starting AI campaign');
    }
  };

  const handleScanTracked = useCallback(
    (scan) => {
      updateProgressionMetrics((metrics) => ({
        ...metrics,
        scans_started: (metrics.scans_started || 0) + 1,
      }));
    },
    [updateProgressionMetrics]
  );

  const handleCallLeadDirect = (lead) => {
    const phone = lead.homeowner_phone || lead.phone || lead.homeowner_phone_encrypted;
    if (phone) {
      window.open(`tel:${phone}`);
      const dailyContactId = `daily.contact.${getTodayKey()}`;
      markQuestComplete(dailyContactId, 40, 'Reached out to a hot lead', {
        type: 'daily_contact',
        leadId: lead.id,
      });
      awardPoints(15, 'Called a lead', { type: 'call', leadId: lead.id });
    }
  };

  const handleEmailLeadDirect = (lead) => {
    const email = lead.homeowner_email || lead.email;
    if (email) {
      window.open(`mailto:${email}`);
      const dailyContactId = `daily.contact.${getTodayKey()}`;
      markQuestComplete(dailyContactId, 40, 'Reached out to a hot lead', {
        type: 'daily_contact',
        leadId: lead.id,
      });
      awardPoints(10, 'Sent an email', { type: 'email', leadId: lead.id });
    } else {
      toast.error('No email available for this lead');
    }
  };
  const handleToggleAutoSpend = useCallback(
    (channel) => {
      setUsageRules((prev) => {
        const next = { ...prev, [channel]: !prev?.[channel] };
        const enabled = next[channel];
        toast.success(`${enabled ? 'Enabled' : 'Disabled'} auto-spend for ${CREDIT_PRICING[channel]?.label || channel}.`);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('fm_credit_usage_rules', JSON.stringify(next));
        }
        return next;
      });
      broadcastBillingRefresh();
    },
    [broadcastBillingRefresh]
  );

  const handleAllocateCredits = useCallback(
    (channel, units, options = {}) => {
      if (!channel || !Number.isFinite(units) || units <= 0) return;
      const config = CREDIT_PRICING[channel];
      if (!config) return;
      const totalCost = config.cost * units;
      if (!options.force && usageRules?.[channel] === false) {
        setPendingTransaction({ type: 'wallet_allocation', channel, units, totalCost, unitLabel: config.unit || 'unit' });
        return;
      }
      if ((walletBalance ?? 0) < totalCost) {
        toast.error('Wallet balance is too low for that conversion.');
        return;
      }
      setWalletBalance((prev) => prev - totalCost);
      setCreditBuckets((prev) => ({
        ...prev,
        [channel]: Math.max(0, (prev?.[channel] || 0) + units),
      }));
      toast.success(`Converted $${totalCost.toFixed(2)} into ${units} ${config.unit}${units === 1 ? '' : 's'}.`);
      broadcastBillingRefresh();
    },
    [walletBalance, usageRules, broadcastBillingRefresh]
  );

  const handleExchangePoints = useCallback(
    (channel, units, options = {}) => {
      if (!channel || !Number.isFinite(units) || units <= 0) return;
      const config = CREDIT_PRICING[channel];
      if (!config) return;
      const requiredPoints = Math.ceil(config.cost * POINTS_PER_DOLLAR * units);
      if ((points ?? 0) < requiredPoints) {
        toast.error('Not enough points for that exchange yet.');
        return;
      }
      if (!options.force && usageRules?.[channel] === false) {
        setPendingTransaction({ type: 'points_exchange', channel, units, points: requiredPoints, unitLabel: config.unit || 'unit' });
        return;
      }
      setPoints((prev) => Math.max(0, (prev ?? 0) - requiredPoints));
      setCreditBuckets((prev) => ({
        ...prev,
        [channel]: Math.max(0, (prev?.[channel] || 0) + units),
      }));
      logPointEvent(-requiredPoints, `Converted points to ${config.label || channel}`, {
        type: 'points_exchange',
        channel,
        units,
      });
      toast.success(`Converted ${requiredPoints} pts into ${units} ${config.unit}${units === 1 ? '' : 's'}.`);
      broadcastBillingRefresh();
    },
    [points, logPointEvent, broadcastBillingRefresh, usageRules]
  );

  const handleStripeTopUp = useCallback(
    async (amount) => {
      const numeric = Number(amount);
      if (!Number.isFinite(numeric) || numeric <= 0) {
        toast.error('Choose a valid top-up amount first.');
        return;
      }
      try {
        const response = await fetch('/api/billing/stripe/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: numeric }),
        });
        if (response.ok) {
          const data = await response.json();
          updateProgressionMetrics((metrics) => ({
            ...metrics,
            wallet_reload_total: (metrics.wallet_reload_total || 0) + numeric,
          }));
          if (data?.checkoutUrl) {
            window.open(data.checkoutUrl, '_blank', 'noopener');
            toast.success('Stripe checkout opened in a new tab.');
            return;
          }
          if (data?.sessionUrl) {
            window.open(data.sessionUrl, '_blank', 'noopener');
            toast.success('Stripe checkout ready in a new tab.');
            return;
          }
        }
        toast.error('Stripe checkout unavailable. Add your Stripe API keys and retry.');
      } catch (error) {
        console.warn('Stripe checkout fallback', error);
        toast.error('Unable to reach Stripe. Verify configuration and retry.');
      }
    },
    []
  );

  const handlePlanCheckout = useCallback(
    async (plan) => {
      if (!plan?.price) {
        toast.error('Plan details are missing.');
        return;
      }
      try {
        const response = await fetch('/api/billing/stripe/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'plan', planId: plan.id, amount: plan.price }),
        });
        if (response.ok) {
          const data = await response.json();
          const planId = plan.id;
          const builderPoints = progressionTaskMap['progress.plan.builder']?.points || 0;
          const scalePoints = progressionTaskMap['progress.plan.scale']?.points || 0;
          if (planId === 'builder' || planId === 'scale' || planId === 'prime') {
            markQuestComplete('progress.plan.builder', builderPoints, 'Growth Builder plan activated', {
              type: 'progression_plan',
              plan: planId,
            });
          }
          if (planId === 'scale' || planId === 'prime') {
            markQuestComplete('progress.plan.scale', scalePoints, 'Market Scale plan activated', {
              type: 'progression_plan',
              plan: planId,
            });
          }
          if (data?.checkoutUrl) {
            window.open(data.checkoutUrl, '_blank', 'noopener');
            toast.success(`Stripe checkout ready — finalize ${plan.name} in the new tab.`);
            return;
          }
          if (data?.sessionUrl) {
            window.open(data.sessionUrl, '_blank', 'noopener');
            toast.success(`Stripe checkout ready — finalize ${plan.name} in the new tab.`);
            return;
          }
        }
        toast.error('Stripe checkout unavailable. Add your API keys and try again.');
      } catch (error) {
        console.error('Plan checkout failed', error);
        toast.error('Unable to start Stripe checkout. Verify configuration and retry.');
      }
    },
    []
  );

  const handleResolveManualReview = useCallback(
    (reviewId, result) => {
      setManualReviewQueue((prev) => prev.filter((review) => review.id !== reviewId));
      setActivity((prev) => prev.filter((item) => item.type !== 'manual_review' || item.payload?.reviewId !== reviewId));
      setActiveManualReview(null);
      if (result?.status === 'manual') {
        toast.success('Draft saved for manual send.');
      } else if (result?.status === 'approved') {
        toast.success('Draft approved and released.');
      } else {
        toast.success('Manual review updated.');
      }
    },
    []
  );

  const handleProfileNavigate = useCallback(
    (view, tab) => {
      if (view === 'logout') {
        logout();
        setShowProfileMenu(false);
        return;
      }
      if (view === 'settings') {
        if (tab && typeof window !== 'undefined') {
          window.localStorage.setItem('fm_settings_target_tab', tab);
        } else if (typeof window !== 'undefined') {
          window.localStorage.removeItem('fm_settings_target_tab');
        }
        setActiveView('settings');
      } else if (view) {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('fm_settings_target_tab');
        }
        setActiveView(view);
      }
      setShowProfileMenu(false);
    },
    [logout]
  );

  const handleQuestAction = (task) => {
    if (!task) return;
    if (typeof task.onAction === 'function') {
      task.onAction();
    }
    switch (task.action) {
      case 'scanner':
        setActiveView('scanner');
        break;
      case 'wallet':
        openWalletRewards('wallet');
        break;
      case 'plans':
        openWalletRewards('wallet');
        break;
      case 'rewards':
        openWalletRewards('rewards');
        break;
      case 'sequences':
        setActiveView('sequences');
        break;
      case 'reports':
        setActiveView('reports');
        break;
      case 'settings':
        setActiveView('settings');
        break;
      default:
        break;
    }
    if (task.completed) {
      return;
    }
    if (task.requiresEvent) {
      toast('Complete the action to unlock this reward.');
      return;
    }
    markQuestComplete(task.id, task.points, task.title, { type: 'quest', id: task.id });
  };

  const handleInspectLead = useCallback(
    (lead) => {
    if (lead?.id) {
      setSelectedMapLeadId(lead.id);
      setReportLeadId(lead.id);
    }
    setSelectedLead(lead);
    awardPoints(5, 'Reviewed lead dossier', { type: 'inspect_lead', leadId: lead?.id });
    setActiveView('lead-detail');
    },
    [setSelectedMapLeadId, setReportLeadId, setSelectedLead, awardPoints, setActiveView]
  );

  const inspectLeadById = useCallback(
    async (leadId) => {
    if (!leadId) return;
      const localLead =
        leadList.find((lead) => Number(lead.id) === Number(leadId)) ||
        hotLeads.find((lead) => Number(lead.id) === Number(leadId));
    if (localLead) {
      handleInspectLead(localLead);
      setShowNotificationTray(false);
      setLastNotificationViewedAt(Date.now());
      return;
    }
    try {
      const lead = await leadAPI.getLead(leadId);
      if (lead) {
        handleInspectLead(lead);
        setShowNotificationTray(false);
        setLastNotificationViewedAt(Date.now());
      }
    } catch (error) {
      console.error('Failed to load lead from notification', error);
      toast.error('Unable to open lead from notification');
      }
    },
    [leadList, hotLeads, handleInspectLead, setShowNotificationTray, setLastNotificationViewedAt]
  );

  const handleNotificationNavigate = useCallback(
    (note, reviewDetail = null) => {
      if (!note) return;
      setShowNotificationTray(false);
      setLastNotificationViewedAt(Date.now());

      const targetLeadId = note.leadId || note.raw?.payload?.lead_id || note.raw?.lead_id;
      const type = note.type;

      const goTo = (view) => {
        if (view) {
          setActiveView(view);
        }
      };

      switch (type) {
        case 'manual_review':
          if (reviewDetail) {
            setActiveManualReview(reviewDetail);
            return;
          }
          if (targetLeadId) {
            inspectLeadById(targetLeadId);
            return;
          }
          goTo('activity');
          return;
        case 'report_ready':
          if (targetLeadId) {
            setReportLeadId(targetLeadId);
          }
          goTo('reports');
          return;
        case 'ai_call_completed':
          goTo('calls');
          if (targetLeadId) {
            inspectLeadById(targetLeadId);
          }
          return;
        case 'appointment_booked':
        case 'lead_captured':
          if (targetLeadId) {
            inspectLeadById(targetLeadId);
          } else {
            goTo('leads');
          }
          return;
        case 'sequence_enrolled':
          goTo('sequences');
          return;
        case 'level_up':
          openWalletRewards('rewards');
          goTo('dashboard');
          return;
        default:
          if (targetLeadId) {
            inspectLeadById(targetLeadId);
            return;
          }
          goTo('activity');
      }
    },
    [inspectLeadById, setActiveManualReview, setActiveView, setReportLeadId, setShowNotificationTray, setLastNotificationViewedAt]
  );

  const exportLeadsCsv = (rows) => {
    if (!rows.length) {
      toast.error('No leads to export');
      return;
    }
    const header = '"Name","Address","Phone","Email","Score"\n';
    const csvContent =
      header +
      rows
        .map((lead) =>
          `"${lead.homeowner_name || lead.name || ''}","${lead.address || ''}","${lead.homeowner_phone || lead.phone || ''}","${lead.homeowner_email || lead.email || ''}","${lead.lead_score || lead.score || 0}"`
        )
        .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };
  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        const totalLeads = stats?.total_leads || 0;
        const growthTarget = 1500;
        const growthProgress = Math.min(100, Math.round((totalLeads / growthTarget) * 100));
        const aiVictories = activity.filter((item) => item.type === 'ai_call_completed').length;
        const followUpsDue = leadList.filter((lead) => (lead.quality_validation_status || '').toLowerCase() === 'review').length;
        const conversionRate = stats?.conversion_rate || 0;
        const monthlyRevenue = stats?.revenue_this_month ?? 0;
        const pipelineValue = stats?.pipeline_value ?? 0;
        const avgDealSize = stats?.avg_deal_size ?? 0;
        const connectRate = stats?.call_connect_rate ?? 0;
        const costPerLead = stats?.cost_per_lead ?? 0;
        const appointmentsBooked = stats?.appointments_booked ?? 0;
        const activeCampaigns = stats?.active_campaigns ?? sequences.length ?? 0;
        const activeClusters = stats?.active_clusters ?? 0;
        const mapLeads = hotLeads.length ? hotLeads : leadList;
        const leadsWithUrgency = mapLeads.map((lead) => {
          const createdAt = resolveLeadCreatedAt(lead);
          const urgency = getLeadUrgency(createdAt);
          return {
            lead,
            urgency,
            createdAt,
          };
        });
        const criticalLeads = leadsWithUrgency.filter((entry) => entry.urgency.level === 'critical');
        const highLeads = leadsWithUrgency.filter((entry) => entry.urgency.level === 'high');
        const urgentCount = criticalLeads.length + highLeads.length;
        const primaryUrgentEntry = criticalLeads[0] || highLeads[0] || leadsWithUrgency[0] || null;
        const primaryUrgentLead = primaryUrgentEntry?.lead || null;
        const primaryUrgency = primaryUrgentEntry?.urgency || null;
        const primaryLeadAgeLabel = primaryUrgency ? formatLeadAgeLabel(primaryUrgency.hoursOld) : '—';
        const leadForCall =
          leadsWithUrgency.find(
            (entry) => entry.lead && (entry.lead.homeowner_phone || entry.lead.phone || entry.lead.homeowner_phone_encrypted)
          )?.lead || null;
        const leadForEmail =
          leadsWithUrgency.find((entry) => entry.lead && (entry.lead.homeowner_email || entry.lead.email))?.lead || null;
        const respondHeadline = criticalLeads.length
          ? `URGENT: ${criticalLeads.length} Hot Lead${criticalLeads.length === 1 ? '' : 's'} Need Response Today`
          : urgentCount > 0
          ? `High Priority: ${urgentCount} lead${urgentCount === 1 ? '' : 's'} waiting on you`
          : 'Stay sharp: strike while the roof is hot';
        const respondMessage =
          primaryUrgency?.message ||
          'Industry benchmark: 54% of homeowners expect a response within 48 hours.';
        const roiData = roiSummary || {
          spend_last_30: stats?.spend_last_30 ?? 0,
          pipeline_value: stats?.pipeline_value ?? 0,
          closed_value: stats?.closed_value ?? 0,
          roi_percent: stats?.roi ?? stats?.estimated_roi ?? null,
        };
        const roi = roiData?.roi_percent ?? 0;
        const upcomingTasks = (taskReminders || []).slice(0, 4);
        const errorItems = (dashboardErrors || []).slice(0, 4);
        const usageEntries = Object.entries(usageSummary || {}).slice(0, 3);
        const daysToBonus = streak > 0 ? (streak % 7 === 0 ? 0 : 7 - (streak % 7)) : 7;
        const todayKey = getTodayKey();
        const streakQuestId = `daily.streak.${todayKey}`;
        const contactQuestId = `daily.contact.${todayKey}`;
        const reportQuestId = `daily.report.${todayKey}`;

        const dailyTasks = [
          {
            id: streakQuestId,
            title: 'Check rewards streak',
            description:
              daysToBonus === 0
                ? 'Weekly bonus unlocked! Claim your reward.'
                : `Stay active ${daysToBonus} more day${daysToBonus === 1 ? '' : 's'} to trigger a weekly bonus.`,
            points: 35,
            action: 'rewards',
            requiresEvent: false,
            actionLabel: 'Open rewards',
            completed: Boolean(completedQuests[streakQuestId]),
          },
          {
            id: contactQuestId,
            title: 'Call or email a hot lead',
            description: 'Connect with at least one urgent homeowner today.',
            points: 40,
            action: 'dashboard',
            requiresEvent: true,
            actionLabel: 'View leads',
            completed: Boolean(completedQuests[contactQuestId]),
          },
          {
            id: reportQuestId,
            title: 'Generate a roof dossier',
            description: 'Send a homeowner a polished AI report today.',
            points: 45,
            action: 'reports',
            requiresEvent: true,
            actionLabel: 'Open reports',
            completed: Boolean(completedQuests[reportQuestId]),
          },
        ];

        const allTiersComplete = progressionTier >= PROGRESSION_PROGRAM.length;
        const activeProgressionIndex = Math.min(progressionTier, PROGRESSION_PROGRAM.length - 1);
        const progressionTierData = allTiersComplete ? null : PROGRESSION_PROGRAM[activeProgressionIndex];
        const progressionTasks = progressionTierData
          ? progressionTierData.tasks.map((task) => ({
              ...task,
              completed: Boolean(completedQuests[task.id]),
              requiresEvent: task.requiresEvent !== false,
              actionLabel: task.cta || 'Open',
            }))
          : [];
        const progressionSection = progressionTierData
          ? {
              id: progressionTierData.id,
              title: progressionTierData.label,
              description: progressionTierData.description,
              tasks: progressionTasks,
            }
          : {
              id: 'progression-mastered',
              title: 'Level Mastery',
              description: 'You have completed every progression mission. Keep scaling wallet funding to unlock future drops.',
              tasks: [],
            };
        const nextTierData = !allTiersComplete ? PROGRESSION_PROGRAM[activeProgressionIndex + 1] : null;
        const lockedSection = nextTierData
          ? {
              id: `${nextTierData.id}-locked`,
              title: `${nextTierData.label} (Locked)`,
              description: nextTierData.description,
              tasks: nextTierData.tasks.map((task) => ({
                ...task,
                completed: false,
                locked: true,
                requiresEvent: true,
                actionLabel: task.cta || 'Locked',
              })),
            }
          : null;

        const questSections = [
          {
            id: 'daily',
            title: 'Daily Momentum',
            description: 'Quick hitters that keep crews sharp and consistent.',
            tasks: dailyTasks,
          },
          progressionSection,
        ];
        if (lockedSection) {
          questSections.push(lockedSection);
        }

        const urgencyWeights = { critical: 0, high: 1, medium: 2, normal: 3, unknown: 4 };
        const sortedHeroLeads = [...leadsWithUrgency]
          .sort((a, b) => {
            const weightDiff = (urgencyWeights[a.urgency.level] ?? 5) - (urgencyWeights[b.urgency.level] ?? 5);
            if (weightDiff !== 0) return weightDiff;
            return (b.lead.lead_score || b.lead.score || 0) - (a.lead.lead_score || a.lead.score || 0);
          })
          .filter((entry) => entry.lead);
        const heroEntries = sortedHeroLeads.slice(0, MAX_HERO_LEADS);

        const respondDisabled = !primaryUrgentLead;
        const callDisabled = !leadForCall;
        const emailDisabled = !leadForEmail;
        return (
          <div className="space-y-8">
            <div className="space-y-4">
              <DashboardKpiRow kpiConfig={appConfig.kpis} kpiData={kpiData} isDark={isDark} />
              <LeadQueueTabs
                tabs={appConfig.leadQueueTabs}
                leadQueue={leadQueue}
                columns={appConfig.leadTableColumns}
                isDark={isDark}
                onOpenLead={handleInspectLead}
                onCallLead={handleCallLeadDirect}
                onAssignSequence={handleAssignSequence}
                onGenerateReport={handleGenerateReport}
              />
              {summaryGeneratedAt && (
                <div className={`text-xs text-right ${mutedClass}`}>
                  Updated {new Date(summaryGeneratedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-red-500 to-orange-500 p-5 rounded-3xl shadow-lg text-white flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold leading-tight">{respondHeadline}</h3>
                    <p className="text-sm opacity-90">
                      {respondMessage}
                      {primaryUrgency?.hoursOld != null && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold">
                          {primaryLeadAgeLabel}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (primaryUrgentLead) {
                      handleInspectLead(primaryUrgentLead);
                    } else {
                      setActiveView('leads');
                    }
                  }}
                  disabled={respondDisabled}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Respond now
                </button>
              </div>

              <div className={`${surfaceClass(isDark)} p-5`}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <h3 className={`text-sm font-semibold uppercase tracking-wide ${headingClass}`}>Priority actions</h3>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => {
                        if (leadForCall) {
                          handleCallLeadDirect(leadForCall);
                        } else {
                          setActiveView('leads');
                        }
                      }}
                      disabled={callDisabled}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-red-400"
                    >
                      <Phone className="w-4 h-4" />
                      Call hottest lead
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveView('scanner')}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
                    >
                      <Scan className="w-4 h-4" />
                      Quick scan
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (leadForEmail) {
                          handleEmailLeadDirect(leadForEmail);
                        } else {
                          setActiveView('leads');
                        }
                      }}
                      disabled={emailDisabled}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:bg-green-400"
                    >
                      <Mail className="w-4 h-4" />
                      Send follow-up
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <DashboardCard 
                title="Total Leads" 
                value={loading ? '...' : stats?.total_leads?.toLocaleString() || '0'} 
                change="+12% from last week" 
                icon={<Users className="w-6 h-6" />} 
                color="blue" 
                dark={isDark}
              />
              <DashboardCard 
                title="Ultra-Hot Leads" 
                value={loading ? '...' : stats?.ultra_hot_leads?.toLocaleString() || '0'} 
                change="+8% conversion rate" 
                icon={<Flame className="w-6 h-6" />} 
                color="red" 
                dark={isDark}
              />
              <DashboardCard 
                title="Appointments" 
                value={loading ? '...' : stats?.appointments_booked?.toLocaleString() || '0'} 
                change="23 this week" 
                icon={<Phone className="w-6 h-6" />} 
                color="green" 
                dark={isDark}
              />
              <DashboardCard 
                title="Active Clusters" 
                value={loading ? '...' : stats?.active_clusters?.toLocaleString() || '0'} 
                change="7 new this month" 
                icon={<MapPin className="w-6 h-6" />} 
                color="purple" 
                dark={isDark}
              />
            </div>

            {heroEntries.length > 0 && (
              <DashboardLeadMap
                leadEntries={heroEntries}
                clusters={clusters}
                onSelectLead={(lead) => setSelectedMapLeadId(lead.id)}
                selectedLeadId={selectedMapLeadId}
                onOpenLead={(lead) => {
                  setSelectedMapLeadId(lead.id);
                  handleInspectLead(lead);
                }}
                onStartSequence={(lead) => {
                  setSelectedMapLeadId(lead.id);
                  handleAssignSequence(lead);
                }}
                onCallLead={handleCallLeadDirect}
                onSendEmail={handleEmailLeadDirect}
                maxVisible={MAX_HERO_LEADS}
                recentlyRewardedLeadId={recentlyRewardedLeadId}
                isDark={isDark}
              />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className={`${surfaceClass(isDark)} p-6 space-y-2`}>
                <div className={`text-sm font-semibold uppercase tracking-wide ${headingClass}`}>ROI Snapshot</div>
                <div className={`text-3xl font-bold ${headingClass}`}>
                  {roiData?.roi_percent != null ? `${roiData.roi_percent.toFixed(1)}%` : '—'}
                </div>
                <div className={`text-xs ${mutedClass}`}>30-day spend {currencyFormatter.format(roiData?.spend_last_30 || 0)}</div>
                <div className={`text-xs ${mutedClass}`}>Pipeline value {currencyFormatter.format(roiData?.pipeline_value || 0)}</div>
                <div className={`text-xs ${mutedClass}`}>Closed last 30 days {currencyFormatter.format(roiData?.closed_value || 0)}</div>
              </div>

              <div className={`${surfaceClass(isDark)} p-6 space-y-3`}>
                <div className={`text-sm font-semibold uppercase tracking-wide ${headingClass}`}>Task Queue</div>
                {upcomingTasks.length === 0 ? (
                  <p className={`text-sm ${mutedClass}`}>No tasks queued—great job keeping things current.</p>
                ) : (
                  <ul className="space-y-2">
                    {upcomingTasks.map((task) => (
                      <li key={task.id} className={`${isDark ? 'bg-slate-900/60' : 'bg-gray-50'} rounded-xl px-3 py-2`}> 
                        <div className={`text-xs font-semibold ${headingClass}`}>{(task.task_type || 'Task').replace(/_/g, ' ')}</div>
                        <div className={`text-xs ${mutedClass}`}>
                          Due {task.scheduled_for ? formatRelativeTime(new Date(task.scheduled_for).getTime()) : 'soon'}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className={`${surfaceClass(isDark)} p-6 space-y-3`}>
                <div className={`text-sm font-semibold uppercase tracking-wide ${headingClass}`}>System Health</div>
                {errorItems.length === 0 ? (
                  <p className={`text-sm ${mutedClass}`}>No delivery issues detected in the last 24 hours.</p>
                ) : (
                  <ul className="space-y-2">
                    {errorItems.map((error) => (
                      <li key={error.type} className="text-xs">
                        <span className="font-semibold text-red-500 mr-2">{error.type.replace(/[_\.]/g, ' ')}</span>
                        <span className={mutedClass}>×{error.count} • {error.last_seen ? formatRelativeTime(new Date(error.last_seen).getTime()) : 'recent'}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {usageEntries.length > 0 && (
                  <div className="pt-2 border-t border-dashed border-slate-200 dark:border-slate-700">
                    <div className={`text-xs font-semibold mb-1 ${headingClass}`}>Usage (7d)</div>
                    <dl className="space-y-1 text-xs">
                      {usageEntries.map(([metric, value]) => (
                        <div key={metric} className="flex justify-between">
                          <dt className={mutedClass}>{metric.replace(/_/g, ' ')}</dt>
                          <dd className={headingClass}>
                            {(value.quantity ?? 0).toLocaleString()} • {currencyFormatter.format(value.cost ?? 0)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </div>
            </div>

            {/* Gamified progress */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className={`${surfaceClass(isDark)} p-6 space-y-3`}>
                <h3 className={`text-sm font-semibold ${headingClass} uppercase tracking-wide`}>Growth Quest</h3>
                <p className={`text-sm ${mutedClass}`}>Capture {growthTarget.toLocaleString()} total leads to unlock the "Pipeline Champion" badge.</p>
                <div className="h-2 rounded-full bg-gray-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${growthProgress}%` }}
                  />
                </div>
                <div className={`text-xs ${mutedClass}`}>{growthProgress}% complete • {totalLeads.toLocaleString()} leads tracked</div>
              </div>
              <div className={`${surfaceClass(isDark)} p-6 space-y-3`}>
                <h3 className={`text-sm font-semibold ${headingClass} uppercase tracking-wide`}>Call Team Streak</h3>
                <p className={`text-sm ${mutedClass}`}>AI agent closed {aiVictories} interest-driven calls today. Keep the streak alive!</p>
                <div className="flex gap-2">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <span
                      key={`win-${idx}`}
                      className={`flex-1 h-2 rounded-full ${idx < aiVictories ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-slate-800'}`}
                    ></span>
                  ))}
                </div>
                <div className={`text-xs ${mutedClass}`}>Goal: 5 wins/day • {aiVictories >= 5 ? 'Quest complete!' : `${5 - aiVictories} calls to go`}</div>
              </div>
              <div className={`${surfaceClass(isDark)} p-6 space-y-3`}>
                <h3 className={`text-sm font-semibold ${headingClass} uppercase tracking-wide`}>Quality Guardrail</h3>
                <p className={`text-sm ${mutedClass}`}>Leads flagged for manual review: {followUpsDue}. Maintain under 10 to stay in the green.</p>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`px-2 py-0.5 rounded-full ${followUpsDue < 10 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {followUpsDue} pending
                  </span>
                  <span className={mutedClass}>Conversion rate {conversionRate.toFixed(1)}%</span>
                </div>
              <div className={`text-xs ${mutedClass}`}>Tip: tighten image validation to reduce reviews.</div>
              </div>
            </div>

            {/* Roofer Operations */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className={`${surfaceClass(isDark)} p-6 space-y-4`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-sm font-semibold uppercase tracking-wide ${headingClass}`}>Field Ops Readiness</h3>
                  <span className={`text-xs font-semibold ${mutedClass}`}>Today</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className={`text-xs ${mutedClass}`}>Crews rolling</p>
                    <p className={`text-xl font-semibold ${headingClass}`}>{appointmentsBooked.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${mutedClass}`}>Hot roofs queued</p>
                    <p className={`text-xl font-semibold ${headingClass}`}>{(hotLeads?.length ?? 0).toLocaleString()}</p>
                  </div>
                </div>
                <ul className={`text-xs space-y-1 ${mutedClass}`}>
                  <li>• {activeClusters} storm clusters still waiting on crew coverage</li>
                  <li>• {followUpsDue} dossiers flagged for manual QA this morning</li>
                </ul>
                <div className={`text-xs ${isDark ? 'text-emerald-300' : 'text-emerald-600'}`}>
                  Tip: reserve two flex slots for AI callbacks that flip to onsite after 5pm.
                </div>
              </div>

              <div className={`${surfaceClass(isDark)} p-6 space-y-4`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-sm font-semibold uppercase tracking-wide ${headingClass}`}>Revenue Pulse</h3>
                  <span className={`text-xs font-semibold ${mutedClass}`}>This month</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className={`text-xs ${mutedClass}`}>Booked revenue</p>
                    <p className={`text-xl font-semibold ${headingClass}`}>{currencyFormatter.format(monthlyRevenue)}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${mutedClass}`}>Pipeline value</p>
                    <p className={`text-xl font-semibold ${headingClass}`}>{currencyFormatter.format(pipelineValue)}</p>
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className={mutedClass}>Avg deal</span>
                    <span className={headingClass}>{currencyFormatter.format(avgDealSize || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={mutedClass}>Cost / lead</span>
                    <span className={headingClass}>
                      {costPerLead ? `$${Number(costPerLead).toFixed(2)}` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={mutedClass}>Connect rate</span>
                    <span className={headingClass}>{connectRate ? `${connectRate.toFixed(1)}%` : '—'}</span>
                  </div>
                </div>
                <div className={`text-xs ${mutedClass}`}>
                  Keep nurture flows warm—{activeCampaigns} automation campaigns are live right now.
                </div>
              </div>

              <div className={`${surfaceClass(isDark)} p-6 space-y-4`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-sm font-semibold uppercase tracking-wide ${headingClass}`}>Alerts & Follow-ups</h3>
                  <span className={`text-xs font-semibold ${mutedClass}`}>Live</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className={`text-xs ${mutedClass}`}>New alerts</p>
                    <p className={`text-xl font-semibold ${headingClass}`}>{unseenCount}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${mutedClass}`}>AI wins today</p>
                    <p className={`text-xl font-semibold ${headingClass}`}>{aiVictories}</p>
                  </div>
                </div>
                <ul className={`text-xs space-y-1 ${mutedClass}`}>
                  <li>• Prioritise {Math.max(followUpsDue, 1)} insurance callbacks before the evening window</li>
                  <li>• {aiVictories} booked inspections awaiting estimator assignments</li>
                  <li>• Keep connect rate above {connectRate ? connectRate.toFixed(1) : 65}% with SMS nudges</li>
                </ul>
                <div className="flex items-center gap-2 pt-1">
                  <QuickActionButton
                    icon={<Bell className="w-4 h-4" />}
                    label="Open notifications"
                    onClick={openFullNotifications}
                    dark={isDark}
                  />
                </div>
              </div>
            </div>

            <section className={`${surfaceClass(isDark)} p-6 space-y-5`}>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div>
                  <h2 className={`text-xl font-semibold ${headingClass}`}>Lead cost analysis</h2>
                  <p className={`text-sm ${mutedClass}`}>
                    Keep your crews focused on roofs that return budget quickly. When response times slip, lead costs compound fast.
                  </p>
                </div>
                <div
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                    isDark ? 'bg-slate-900/70 text-slate-200 border border-slate-700' : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  Average roofing lead: $150–$350 • Act inside 24h for best ROI
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className={`${isDark ? 'bg-slate-900/60 border border-slate-800' : 'bg-gray-50 border border-gray-200'} rounded-2xl p-4`}>
                  <p className={`text-xs ${mutedClass}`}>Cost per lead</p>
                  <p className={`mt-1 text-2xl font-bold ${headingClass}`}>
                    {costPerLead ? `$${Number(costPerLead).toFixed(2)}` : '—'}
                  </p>
                  <p className="text-xs mt-2 text-amber-500">Watch spend when storms spike demand.</p>
              </div>
                <div className={`${isDark ? 'bg-slate-900/60 border border-slate-800' : 'bg-gray-50 border border-gray-200'} rounded-2xl p-4`}>
                  <p className={`text-xs ${mutedClass}`}>Conversion rate</p>
                  <p className={`mt-1 text-2xl font-bold ${headingClass}`}>{conversionRate ? `${conversionRate.toFixed(1)}%` : '—'}</p>
                  <p className="text-xs mt-2 text-blue-500">Layer follow-up automations to keep this climbing.</p>
                </div>
                <div className={`${isDark ? 'bg-slate-900/60 border border-slate-800' : 'bg-gray-50 border border-gray-200'} rounded-2xl p-4`}>
                  <p className={`text-xs ${mutedClass}`}>ROI impact</p>
                  <p className={`mt-1 text-2xl font-bold ${roi >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {roi ? `${roi > 0 ? '+' : ''}${Number(roi).toFixed(1)}%` : '—'}
                  </p>
                  <p className="text-xs mt-2 text-emerald-500">Fast responses deliver 4–5× value on every funded scan.</p>
                </div>
              </div>
              <p className={`text-xs ${mutedClass}`}>
                Tip: log every touch in the lead dossier. Crews can justify spend, and estimators know who to call first.
              </p>
            </section>

            <DashboardQuestPanel
              sections={questSections}
              totalPoints={points}
              onAction={handleQuestAction}
              isDark={isDark}
            />

              <div className={`${surfaceClass(isDark)} overflow-hidden`}>
                <div className={`p-6 border-b ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
                  <h2 className={`text-xl font-semibold ${headingClass}`}>Live Activity</h2>
                  <p className={`text-sm ${mutedClass}`}>Recent system activity</p>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                  {activity.slice(0, 6).map((item, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <AlertCircle className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{renderActivityLabel(item)}</p>
                          <p className="text-xs text-gray-500">{new Date(item.timestamp || Date.now()).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className={`${surfaceClass(isDark)} p-6 space-y-3`}>
                <h3 className={`text-sm font-semibold ${headingClass} uppercase tracking-wide`}>Automation overview</h3>
                <p className={`text-sm ${mutedClass}`}>Enroll leads into nurture journeys or trigger AI calls in one click.</p>
                <div className="flex flex-wrap gap-3">
                  <QuickActionButton
                    dark={isDark}
                    icon={<Mail className="w-4 h-4" />}
                    label="Enroll top leads"
                    onClick={() => {
                      if (hotLeadInsights.top.length) {
                        setActiveView('leads');
                        handleAssignSequence(hotLeadInsights.top[0]);
                      } else {
                        toast('No hot leads available yet.');
                      }
                    }}
                  />
                  <QuickActionButton
                    dark={isDark}
                    icon={<Phone className="w-4 h-4" />}
                    label="AI dial blitz"
                    onClick={() => handleStartAICampaign(leadList.slice(0, 10).map((lead) => lead.id))}
                  />
                </div>
              </div>
              <div className={`${surfaceClass(isDark)} p-6 space-y-3`}>
                <h3 className={`text-sm font-semibold ${headingClass} uppercase tracking-wide`}>Pipeline health</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className={`text-xs ${mutedClass}`}>Avg hot lead score</p>
                    <p className={`text-xl font-semibold ${headingClass}`}>{hotLeadInsights.avgScore || 0}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${mutedClass}`}>Total hot value</p>
                    <p className={`text-xl font-semibold ${headingClass}`}>${hotLeadInsights.totalValue.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className={`${surfaceClass(isDark)} p-6 space-y-3`}>
                <h3 className={`text-sm font-semibold ${headingClass} uppercase tracking-wide`}>Sequence coverage</h3>
                <p className={`text-sm ${mutedClass}`}>
                  {sequences.length ? `${sequences.length} live sequences ready to enroll leads.` : 'Create a sequence to unlock automated nurturing.'}
                </p>
                <ActionButton
                  icon={<Mail className="w-4 h-4" />}
                  label="Manage sequences"
                  onClick={() => setActiveView('sequences')}
                  dark={isDark}
                />
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Leads Over Time" subtitle="Daily inbound volume" type="line" data={stats?.leads_over_time || []} isDark={isDark} />
              <ChartCard title="Conversion Funnel" subtitle="Captured → Qualified → Appointments" type="bar" data={stats?.conversion_funnel || []} isDark={isDark} />
              <div className={`${surfaceClass(isDark)} p-6 space-y-4 lg:col-span-2`}>
                <h3 className={`text-sm font-semibold ${headingClass} uppercase tracking-wide`}>Automation & engagement</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <StatusPill label="Total leads" value={analyticsSnapshot.totalLeads.toLocaleString()} isDark={isDark} />
                  <StatusPill label="Hot leads" value={analyticsSnapshot.hotLeadCount.toLocaleString()} color="red" isDark={isDark} />
                  <StatusPill label="AI call wins" value={analyticsSnapshot.voiceWins.toLocaleString()} color="emerald" isDark={isDark} />
                  <StatusPill label="Email sends" value={analyticsSnapshot.emails.toLocaleString()} color="blue" isDark={isDark} />
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'leads':
        return (
          <div className="space-y-6">
            <header className="flex justify-between items-center">
              <div>
                <h1 className={`text-3xl font-bold ${headingClass}`}>All Leads</h1>
                <p className={`${mutedClass}`}>Manage and track all your leads in one place</p>
              </div>
              <div className="flex gap-3">
                <QuickActionButton
                  dark={isDark}
                  icon={<Download className="w-4 h-4" />}
                  label="Export CSV"
                  onClick={() => exportLeadsCsv(leadList)}
                />
                <QuickActionButton
                  dark={isDark}
                  icon={<Phone className="w-4 h-4" />}
                  label="AI Campaign"
                  onClick={() =>
                    handleStartAICampaign(
                      leadList
                        .slice(0, 15)
                        .map((lead) => lead.id)
                    )
                  }
                />
              </div>
            </header>
            {leadLoading ? (
              <div className={`${surfaceClass(isDark)} p-10 text-center text-sm ${mutedClass}`}>Loading leads…</div>
            ) : (
              <LeadIntelligenceTable
                leads={leadList}
                isDark={isDark}
                onGenerateReport={handleGenerateReport}
                onViewDetails={handleInspectLead}
                onCallLead={handleCallLeadDirect}
                onInspectImagery={handleInspectLead}
                onAssignSequence={handleAssignSequence}
              />
            )}
          </div>
        );
      
      case 'clusters':
      case 'scanner':
        return (
          <div className="space-y-6">
            <header>
              <h1 className={`text-3xl font-bold ${headingClass}`}>Scanner & Heat Clusters</h1>
              <p className={`text-sm ${mutedClass}`}>Scan new territories and monitor neighbourhood contagion in a single command center.</p>
            </header>
            <div className={`${surfaceClass(isDark)} p-6`}>
              <AreaScanner isDark={isDark} onScanStarted={handleScanTracked} />
            </div>
            <div className={`${surfaceClass(isDark)} p-6 space-y-4`}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className={`text-xl font-semibold ${headingClass}`}>Active heat clusters</h2>
                  <p className={`text-sm ${mutedClass}`}>Prioritise follow-up where neighbours are booking work right now.</p>
                </div>
                <span
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
                    isDark ? 'bg-indigo-500/20 text-indigo-200' : 'bg-indigo-50 text-indigo-600'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  {clusters.length} active
                </span>
              </div>
              {clusters.length === 0 ? (
                <div className={`${surfaceClass(isDark)} p-6 text-sm ${mutedClass}`}>
                  No contagion clusters detected yet. Run scans to populate activity.
                </div>
              ) : (
                <div className="grid gap-4">
                  {clusters.map((cluster) => (
                    <div
                      key={cluster.id}
                      className={`rounded-2xl border ${
                        isDark ? 'border-slate-700 bg-slate-900/60' : 'border-gray-200 bg-gray-50'
                      } p-4 space-y-3`}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <h3 className={`font-semibold ${headingClass}`}>
                            {cluster.city}, {cluster.state}
                          </h3>
                          <p className={`text-xs ${mutedClass}`}>
                            Radius {cluster.radius_miles?.toFixed(1) || 0.5} mi • Hot leads {cluster.metadata?.hot_leads ?? '—'}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            cluster.cluster_status === 'hot'
                              ? 'bg-rose-500/15 text-rose-500'
                              : cluster.cluster_status === 'active'
                              ? 'bg-amber-500/15 text-amber-500'
                              : 'bg-blue-500/15 text-blue-500'
                          }`}
                        >
                          {cluster.cluster_status}
                        </span>
                      </div>
                      <div className={`flex flex-wrap gap-4 text-xs ${mutedClass}`}>
                        <span>Permits: {cluster.permit_count}</span>
                        <span>Cluster score: {cluster.cluster_score}</span>
                        <span>Activity: {formatDateRange(cluster.date_range_start, cluster.date_range_end)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      
      case 'activity':
        return (
          <div className="space-y-6">
            <div className={`${surfaceClass(isDark)} p-6`}>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className={`text-2xl font-bold ${headingClass}`}>Live Activity Feed</h2>
                  <p className={`text-sm ${mutedClass}`}>Every automation, call, and scan—timestamped with AI context.</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${isDark ? 'bg-blue-500/15 text-blue-200 border border-blue-500/20' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                  {activity.length} tracked events
                </div>
              </div>
              <div className="divide-y divide-slate-800/70 dark:divide-slate-800">
                {activity.slice(0, 25).map((item, index) => (
                  <div key={item.id || index} className="py-4 flex items-start gap-3">
                    <div className={`${isDark ? 'bg-blue-500/10 text-blue-200 border border-blue-500/30' : 'bg-blue-50 text-blue-600 border border-blue-100'} w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`text-sm font-semibold ${headingClass}`}>{renderActivityLabel(item)}</p>
                        <span className={`text-[11px] uppercase tracking-wide ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                          {(item.type || 'event').replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className={`text-xs mt-1 ${mutedClass}`}>
                        {new Date(item.occurred_at || item.timestamp || Date.now()).toLocaleString()}
                      </p>
                      {item.payload?.lead_name && (
                        <p className={`text-xs mt-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                          Lead • {item.payload.lead_name}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {activity.length === 0 && (
                  <div className={`py-10 text-center text-sm ${mutedClass}`}>
                    No activity captured yet. Launch a scan or AI campaign to populate the feed.
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      
      case 'reports':
        const reportTemplates = [
          {
            id: 'storm_playbook',
            name: 'Storm Impact Playbook',
            description: 'Neighborhood storm path, impact map, and immediate mitigation plan.',
            sections: [
              'Storm timeline & map overlay',
              'Neighbourhood impact analysis',
              'Immediate mitigation steps',
              'Financing + insurance checklist',
            ],
            estimatedTime: '35s render',
            homeownerPainPoints: [
              'Concern that adjusters downplay scattered damage.',
              'Unsure about fastest way to tarp and file without surprise out-of-pocket costs.',
            ],
            rooferAngles: [
              'Use NOAA path and neighborhood comps to create urgency within 72 hours.',
              'Bundle tarping, financing, and claim steps to keep homeowner guided.',
            ],
            recommendedCTA:
              'Pair this playbook with a same-day mitigation quote and a checklist email follow-up.',
          },
          {
            id: 'insurance_packet',
            name: 'Insurance Evidence Pack',
            description: 'Annotated photos, scope notes, and code references tailored for adjusters.',
            sections: [
              'Annotated imagery + captions',
              'Scope of loss & materials',
              'Code + manufacturer references',
              'Next inspection milestones',
            ],
            estimatedTime: '60s render',
            homeownerPainPoints: [
              'Fear of denial/delay due to complex paperwork and codes.',
              'Unsure how to prove matching materials or specs to justify claim.',
            ],
            rooferAngles: [
              'Provide notes that speak the adjuster’s language from first visit.',
              'Highlight code upgrades and manufacturer requirements to support supplements.',
            ],
            recommendedCTA:
              'Walk homeowner through the evidence pack line-by-line and schedule adjuster meeting.',
          },
          {
            id: 'maintenance_plan',
            name: 'Maintenance & Upsell Plan',
            description: 'Seasonal tune-ups, upgrades, and referral prompts packaged clearly.',
            sections: [
              'Preventative maintenance calendar',
              'Upgrade recommendations',
              'Case studies & testimonials',
              'Referral incentives',
            ],
            estimatedTime: '40s render',
            homeownerPainPoints: [
              'Avoiding surprise leaks and tracking upkeep across seasons.',
              'Budget stress for upgrades until emergencies force action.',
            ],
            rooferAngles: [
              'Lay out a calendar to protect resale value without extra effort.',
              'Offer bundle pricing and referral perks so the plan pays for itself.',
            ],
            recommendedCTA:
              'Enroll into quarterly tune-up plan and share recap with insurance agent for trust.',
          },
        ];
        const recentReportsList = (stats?.recent_reports && stats.recent_reports.length
          ? stats.recent_reports.map((report) => ({
              id: report.id || report.report_id,
              template: report.template || 'lead_dossier',
              generated_at: report.generated_at || report.created_at,
              status: report.status || 'ready',
              thumbnail_url: report.thumbnail_url || report.preview_image,
              share_url: report.share_url,
              pdf_url: report.pdf_url,
              lead:
                report.lead ||
                leadsForReports.find((lead) => Number(lead.id) === Number(report.lead_id)) ||
                activeGeneratorLead,
            }))
          : leadsForReports.slice(0, 5).map((lead, idx) => ({
              id: `report-${lead.id || idx}`,
              template: 'lead_dossier',
              generated_at: lead.last_contacted || lead.created_at || new Date().toISOString(),
              status: 'ready',
              thumbnail_url: lead.thumbnail,
              lead,
            })));
        
        return (
          <div className="space-y-6">
            <div className={`${surfaceClass(isDark)} p-6`}>
              <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div>
                  <h1 className={`text-3xl font-bold ${headingClass}`}>Enhanced Reports & Dossiers</h1>
                  <p className={`text-sm ${mutedClass}`}>
                    Create professional, branded reports with AI-powered content and business integration.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={reportLeadId || ''}
                    onChange={(event) => setReportLeadId(event.target.value)}
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      isDark
                        ? 'bg-slate-900 border-slate-700 text-slate-100'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    {leadsForReports.map((lead) => (
                      <option key={`report-lead-${lead.id}`} value={lead.id}>
                        {lead.homeowner_name || lead.address}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setActiveView('settings')}
                    className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg ${
                      isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Settings className="w-3.5 h-3.5" /> Brand settings
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={() =>
                    handleGenerateReport(
                      selectedReportLead?.id ?? activeGeneratorLead?.id ?? null,
                      'damage-assessment',
                      selectedReportLead || activeGeneratorLead || null
                    )
                  }
                  className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-lg font-semibold"
                >
                  <FileText className="w-6 h-6" />
                  Create Professional Report
                </button>
              </div>

              {activeGeneratorLead && (
                <div className={`mt-6 p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <Home className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className={`font-semibold ${headingClass}`}>
                        Active Lead: {activeGeneratorLead.homeowner_name || activeGeneratorLead.address || 'No lead selected'}
                      </p>
                      <p className={`text-sm ${mutedClass}`}>
                        {activeGeneratorLead.address || 'Add an address in business profile'} • {activeGeneratorLead.property_type || 'Residential'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Template Grid */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(reportTemplates || []).map((template) => (
                  <div key={template.id} className={`rounded-2xl border p-4 space-y-3 ${isDark ? 'border-slate-800 bg-slate-900/70 text-slate-100' : 'border-gray-200 bg-white text-gray-900'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold">{template.name}</h3>
                        <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{template.description}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>{template.estimatedTime}</span>
                    </div>
                    <ul className={`text-xs space-y-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      {template.sections.map((section) => (
                        <li key={`${template.id}-${section}`}>• {section}</li>
                      ))}
                    </ul>
                    <div className="flex items-center gap-2 pt-1">
                      <QuickActionButton
                        icon={<Eye className="w-4 h-4" />}
                        label="Preview"
                        dark={isDark}
                        onClick={() => {
                          const previewLead = selectedReportLead || activeGeneratorLead;
                          if (!previewLead) {
                            toast.error('Select a lead to preview');
                            return;
                          }
                          setReportPreview({ template, lead: previewLead });
                        }}
                      />
                      <QuickActionButton
                        icon={<FileText className="w-4 h-4" />}
                        label="Generate"
                        dark={isDark}
                        onClick={() => {
                          handleGenerateReport(
                            selectedReportLead?.id ?? activeGeneratorLead?.id ?? null,
                            template.id,
                            selectedReportLead || activeGeneratorLead || null
                          );
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent Reports */}
              <div className={`mt-8 ${surfaceClass(isDark)} p-6 space-y-4`}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className={`text-lg font-semibold ${headingClass}`}>Recent reports</h3>
                  <span className={`text-xs ${mutedClass}`}>{recentReportsList.length}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className={isDark ? 'bg-slate-900/60 text-slate-300 border-b border-slate-800' : 'bg-slate-50 text-gray-600 border-b border-gray-200'}>
                      <tr>
                        <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wide">Lead</th>
                        <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wide">Template</th>
                        <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wide">Generated</th>
                        <th className="px-4 py-2 text-right text-[11px] uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody className={isDark ? 'divide-y divide-slate-800 text-slate-100' : 'divide-y divide-gray-200 text-gray-900'}>
                      {recentReportsList.map((report) => (
                        <tr key={report.id} className={isDark ? 'hover:bg-slate-900/40' : 'hover:bg-blue-50/60'}>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-3">
                              {report.thumbnail_url && (
                                <div className="flex-shrink-0">
                                  <img
                                    src={report.thumbnail_url}
                                    alt="Report thumbnail"
                                    className="h-12 w-9 rounded-md object-cover shadow-sm border border-gray-200"
                                  />
                                </div>
                              )}
                              <div>
                                <p className="font-semibold">{report.lead?.homeowner_name || report.lead?.address || 'Lead'}</p>
                                <p className={`text-[11px] ${mutedClass}`}>{report.lead?.address}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-xs capitalize">{String(report.template || '').replace('_', ' ')}</td>
                          <td className="px-4 py-2 text-xs">{new Date(report.generated_at).toLocaleString()}</td>
                          <td className="px-4 py-2 text-right text-xs">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                className={`px-3 py-1 rounded-full font-semibold ${isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                onClick={() => {
                                  if (report.lead) setReportPreview({ template: report.template, lead: report.lead });
                                }}
                              >
                                Preview
                              </button>
                              <button
                                type="button"
                                className="px-3 py-1 rounded-full font-semibold bg-blue-600 text-white hover:bg-blue-500"
                                onClick={() =>
                                  report.lead && handleGenerateReport(report.lead.id, report.template, report.lead)
                                }
                              >
                                Regenerate
                              </button>
                              <button
                                type="button"
                                className={`px-3 py-1 rounded-full font-semibold ${isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                onClick={() => window.open(`/reports/view/${report.id}`, '_blank')}
                              >
                                Open
                              </button>
                              {report.share_url && (
                                <button
                                  type="button"
                                  className={`px-3 py-1 rounded-full font-semibold ${isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                  onClick={() => navigator.clipboard.writeText(`${window.location.origin}${report.share_url}`)}
                                >
                                  Copy Link
                                </button>
                              )}
                              {report.pdf_url && (
                                <button
                                  type="button"
                                  className={`px-3 py-1 rounded-full font-semibold ${isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                  onClick={() => window.open(report.pdf_url, '_blank')}
                                >
                                  PDF
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'leads':
        return (
          <div className="space-y-6">
            <header className="flex justify-between items-center">
              <div>
                <h1 className={`text-3xl font-bold ${headingClass}`}>All Leads</h1>
                <p className={`${mutedClass}`}>Manage and track all your leads in one place</p>
              </div>
              <div className="flex gap-3">
                <QuickActionButton
                  dark={isDark}
                  icon={<Download className="w-4 h-4" />}
                  label="Export CSV"
                  onClick={() => exportLeadsCsv(leadList)}
                />
                <QuickActionButton
                  dark={isDark}
                  icon={<Phone className="w-4 h-4" />}
                  label="AI Campaign"
                  onClick={() =>
                    handleStartAICampaign(
                      leadList
                        .slice(0, 15)
                        .map((lead) => lead.id)
                    )
                  }
                />
              </div>
            </header>
            {leadLoading ? (
              <div className={`${surfaceClass(isDark)} p-6`}>
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className={`ml-3 ${mutedClass}`}>Loading leads...</span>
                </div>
              </div>
            ) : (
              <div className={`${surfaceClass(isDark)} p-6`}>
                <LeadIntelligenceTable
                  isDark={isDark}
                  leads={leadList}
                  onSelectLead={setSelectedLead}
                  selectedLead={selectedLead}
                  onGenerateReport={handleGenerateReport}
                />
              </div>
            )}
          </div>
        );
        const recentReports = (stats?.recent_reports && stats.recent_reports.length
          ? stats.recent_reports.map((report) => ({
              id: report.id || report.report_id,
              template: report.template || 'lead_dossier',
              generated_at: report.generated_at || report.created_at,
              status: report.status || 'ready',
              lead:
                report.lead ||
                leadsForReports.find((lead) => Number(lead.id) === Number(report.lead_id)) ||
                selectedReportLead,
            }))
          : leadsForReports.slice(0, 5).map((lead, idx) => ({
              id: `report-${lead.id || idx}`,
              template: 'lead_dossier',
              generated_at: lead.last_contacted || lead.created_at || new Date().toISOString(),
              status: 'ready',
              lead,
            })));
        const titleize = (value) =>
          typeof value === 'string'
            ? value
                .split('_')
                .join(' ')
                .replace(/\b\w/g, (char) => char.toUpperCase())
            : value;
        const reportCoaching = (() => {
          const tips = [];
          if (selectedReportLead) {
            if (selectedReportLead.replacement_urgency || selectedReportLead.priority) {
              tips.push(
                `Lead urgency: ${titleize(selectedReportLead.replacement_urgency || selectedReportLead.priority)} — open with the Storm Impact Playbook to lock a crew slot before competitors do.`
              );
            }
            if (Array.isArray(selectedReportLead.damage_indicators) && selectedReportLead.damage_indicators.length) {
              const indicators = selectedReportLead.damage_indicators.slice(0, 3).map(titleize).join(', ');
              tips.push(
                `Damage indicators flagged: ${indicators}. Pair the Insurance Evidence Pack with annotated photos to keep the adjuster on your side.`
              );
            }
            if (selectedReportLead.roof_age_years && Number(selectedReportLead.roof_age_years) >= 15) {
              tips.push(
                `Roof age is ${selectedReportLead.roof_age_years}+ years. Layer in the Maintenance & Upsell Plan to secure a seasonal service agreement.`
              );
            }
            if (selectedReportLead.last_contact) {
              const daysSinceTouch = Math.round(
                Math.max(0, (Date.now() - new Date(selectedReportLead.last_contact).getTime()) / (1000 * 60 * 60 * 24))
              );
              if (daysSinceTouch >= 3) {
                tips.push(
                  `It’s been ${daysSinceTouch} days since the last touch. Send the Roof Intelligence Brief recap with a same-day text follow-up.`
                );
              }
            }
          }
          if (tips.length < 3) {
            tips.push(
              'Always attach your logo and crew contact info inside Brand Settings so every PDF feels bespoke to the homeowner.'
            );
            tips.push(
              'Drop the PDF into your CRM sequence—notifications include a share link you can paste into SMS or email.'
            );
          }
          return tips;
        })();
        return (
          <div className="space-y-6">
            <div className={`${surfaceClass(isDark)} p-6 space-y-6`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className={`text-3xl font-bold ${headingClass}`}>Reports & Dossiers</h1>
                  <p className={`text-sm ${mutedClass}`}>
                    Package AI intelligence into homeowner-ready dossiers, storm briefs, and insurance packs.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={reportLeadId || ''}
                    onChange={(event) => setReportLeadId(event.target.value)}
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      isDark
                        ? 'bg-slate-900 border-slate-700 text-slate-100'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    {leadsForReports.map((lead) => (
                      <option key={`report-lead-${lead.id}`} value={lead.id}>
                        {lead.homeowner_name || lead.address}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setActiveView('settings')}
                    className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg ${
                      isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Settings className="w-3.5 h-3.5" /> Brand settings
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {(reportTemplates || []).map((template) => (
                  <div
                    key={template.id}
                    className={`rounded-2xl border p-4 space-y-3 ${
                      isDark ? 'border-slate-800 bg-slate-900/70 text-slate-100' : 'border-gray-200 bg-white text-gray-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold">{template.name}</h3>
                        <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{template.description}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>
                        {template.estimatedTime}
                      </span>
                    </div>
                    <ul className={`text-xs space-y-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      {template.sections.map((section) => (
                        <li key={`${template.id}-${section}`}>• {section}</li>
                      ))}
                    </ul>
                    {template.homeownerPainPoints?.length ? (
                      <div
                        className={`rounded-xl px-3 py-2 text-xs space-y-1 ${
                          isDark ? 'bg-rose-500/10 text-rose-200 border border-rose-500/20' : 'bg-rose-50 text-rose-600 border border-rose-200'
                        }`}
                      >
                        <p className="font-semibold uppercase tracking-wide text-[10px]">Homeowner hot buttons</p>
                        <ul className="space-y-1">
                          {template.homeownerPainPoints.map((point) => (
                            <li key={`${template.id}-pain-${point}`} className="leading-snug">
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {template.rooferAngles?.length ? (
                      <div
                        className={`rounded-xl px-3 py-2 text-xs space-y-1 ${
                          isDark ? 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        }`}
                      >
                        <p className="font-semibold uppercase tracking-wide text-[10px]">Crew advantage</p>
                        <ul className="space-y-1">
                          {template.rooferAngles.map((angle) => (
                            <li key={`${template.id}-angle-${angle}`} className="leading-snug">
                              {angle}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {template.recommendedCTA && (
                      <p className={`text-[11px] leading-snug ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                        <span className="font-semibold text-blue-500 uppercase tracking-wide text-[10px] mr-2">CTA</span>
                        {template.recommendedCTA}
                      </p>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <QuickActionButton
                        icon={<Eye className="w-4 h-4" />}
                        label="Preview"
                        dark={isDark}
                        onClick={() => {
                          if (!selectedReportLead) {
                            toast.error('Select a lead to preview');
                            return;
                          }
                          setReportPreview({ template, lead: selectedReportLead });
                        }}
                      />
                      <QuickActionButton
                        icon={<FileText className="w-4 h-4" />}
                        label="Generate"
                        dark={isDark}
                        onClick={() => {
                          if (!selectedReportLead) {
                            toast.error('Select a lead to generate a report');
                            return;
                          }
                          handleGenerateReport(selectedReportLead.id, template.id, selectedReportLead);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className={`${surfaceClass(isDark)} p-6 lg:col-span-2 space-y-4`}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className={`text-lg font-semibold ${headingClass}`}>Recent reports</h3>
                  <span className={`text-xs ${mutedClass}`}>{recentReports.length} generated in the last 24h</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className={isDark ? 'bg-slate-900/60 text-slate-300 border-b border-slate-800' : 'bg-slate-50 text-gray-600 border-b border-gray-200'}>
                      <tr>
                        <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wide">Lead</th>
                        <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wide">Template</th>
                        <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wide">Generated</th>
                        <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wide">Status</th>
                        <th className="px-4 py-2 text-right text-[11px] uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody className={isDark ? 'divide-y divide-slate-800 text-slate-100' : 'divide-y divide-gray-200 text-gray-900'}>
                      {recentReports.map((report) => (
                        <tr key={report.id} className={isDark ? 'hover:bg-slate-900/40' : 'hover:bg-blue-50/60'}>
                          <td className="px-4 py-2">
                            <div>
                              <p className="font-semibold">{report.lead?.homeowner_name || report.lead?.address || 'Lead'}</p>
                              <p className={`text-[11px] ${mutedClass}`}>{report.lead?.address}</p>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-xs capitalize">{report.template?.replace('_', ' ')}</td>
                          <td className="px-4 py-2 text-xs">{new Date(report.generated_at).toLocaleString()}</td>
                          <td className="px-4 py-2 text-xs">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
                              report.status === 'ready'
                                ? 'bg-emerald-500/15 text-emerald-500'
                                : 'bg-amber-500/15 text-amber-500'
                            }`}>
                              <Sparkles className="w-3 h-3" /> {report.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right text-xs">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                className={`px-3 py-1 rounded-full font-semibold ${isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                onClick={() => setReportPreview({ template: report.template, lead: report.lead })}
                              >
                                Preview
                              </button>
                              <button
                                type="button"
                                className="px-3 py-1 rounded-full font-semibold bg-blue-600 text-white hover:bg-blue-500"
                                onClick={() =>
                                  report.lead && handleGenerateReport(report.lead.id, report.template, report.lead)
                                }
                              >
                                Regenerate
                              </button>
                              <button
                                type="button"
                                className={`px-3 py-1 rounded-full font-semibold ${isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                onClick={() => {
                                  if (report.id) {
                                    // open full page view in a new tab for printing
                                    window.open(`/reports/view/${report.id}`, '_blank');
                                  }
                                }}
                              >
                                Open
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className={`${surfaceClass(isDark)} p-6 space-y-3`}>
                <h3 className={`text-lg font-semibold ${headingClass}`}>Template tips</h3>
                <ul className={`text-sm space-y-2 ${mutedClass}`}>
                  {reportCoaching.map((tip) => (
                    <li key={`coaching-${tip}`}>• {tip}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setActiveView('settings')}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-500"
                >
                  <ArrowUpRight className="w-4 h-4" /> Configure templates
                </button>
              </div>
            </div>
          </div>
        );
      
      case 'calls':
        return <VoiceCallManager isDark={isDark} />;
      
      case 'sequences':
        return <SequenceManager isDark={isDark} />;
      
      case 'analytics':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatusPill label="Avg lead score" value={`${analyticsSnapshot.avgLeadScore}/100`} color="indigo" isDark={isDark} />
              <StatusPill label="AI call wins" value={analyticsSnapshot.voiceWins.toLocaleString()} color="emerald" isDark={isDark} />
              <StatusPill label="Email sends" value={analyticsSnapshot.emails.toLocaleString()} color="blue" isDark={isDark} />
              <StatusPill label="Scans triggered" value={analyticsSnapshot.scans.toLocaleString()} color="orange" isDark={isDark} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Leads Over Time" subtitle="Daily inbound volume" type="line" data={stats?.leads_over_time || []} isDark={isDark} />
              <ChartCard title="Conversion Funnel" subtitle="Captured → Qualified → Appointments" type="bar" data={stats?.conversion_funnel || []} isDark={isDark} />
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className={`${surfaceClass(isDark)} p-6 space-y-3`}>
                <h3 className={`text-sm font-semibold ${headingClass} uppercase tracking-wide`}>Top hot leads</h3>
                <ul className="space-y-3 text-sm">
                  {(hotLeadInsights.top.length ? hotLeadInsights.top : hotLeads.slice(0, 3)).map((lead) => (
                    <li key={`analytics-hot-${lead.id}`} className="flex items-center justify-between gap-3">
                      <div>
                        <p className={`font-semibold ${headingClass}`}>{lead.name || lead.homeowner_name || lead.address}</p>
                        <p className={`text-xs ${mutedClass}`}>{lead.address}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase text-red-500 font-semibold">Score</p>
                        <p className={`text-lg font-semibold ${headingClass}`}>{lead.score || lead.lead_score || 0}</p>
                      </div>
                    </li>
                  ))}
                  {!hotLeads.length && (
                    <li className={`text-xs ${mutedClass}`}>Run an area scan to surface hot leads.</li>
                  )}
                </ul>
              </div>
              <div className={`${surfaceClass(isDark)} p-6 space-y-3`}>
                <h3 className={`text-sm font-semibold ${headingClass} uppercase tracking-wide`}>Sequence performance</h3>
                {sequences.length ? (
                  <ul className="space-y-2 text-sm">
                    {sequences.slice(0, 4).map((sequence) => (
                      <li key={`sequence-${sequence.id || sequence.sequence_id}`} className="flex items-center justify-between gap-3">
                        <div>
                          <p className={`font-semibold ${headingClass}`}>{sequence.name || sequence.sequence_name}</p>
                          <p className={`text-xs ${mutedClass}`}>{sequence.stage || sequence.status || 'Active'}</p>
                        </div>
                        <span className="text-xs font-semibold text-blue-500">
                          {sequence.enrolled_count != null ? `${sequence.enrolled_count} enrolled` : 'Ready'}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={`text-xs ${mutedClass}`}>No sequences yet. Build a nurture flow to monitor performance here.</p>
                )}
              </div>
            </div>
          </div>
        );
      
      case 'help':
        return (
          <div className="grid grid-cols-1 xl:grid-cols-[2fr,1fr] gap-6">
            <div className={`${surfaceClass(isDark)} p-6 flex flex-col h-full`}>
              <div className="flex flex-col gap-1">
                <h1 className={`text-3xl font-bold ${headingClass}`}>Help Center</h1>
                <p className={`text-sm ${mutedClass}`}>
                  Guided answers for billing, campaigns, and lead quality. Tap a topic to see the recommended workflow.
                </p>
              </div>
              <div className="mt-4 flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                {helpConversation.map((message) => (
                  <div key={message.id} className={`flex ${message.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-xl rounded-2xl px-4 py-3 text-sm shadow-sm whitespace-pre-wrap ${
                        message.from === 'user'
                          ? 'bg-blue-600 text-white'
                          : isDark
                          ? 'bg-slate-800 text-slate-100'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      <p>{message.text}</p>
                      <p className={`text-[10px] mt-1 opacity-70 ${message.from === 'user' ? 'text-white' : ''}`}>
                        {new Date(message.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                {helpIsTyping && (
                  <div className="flex justify-start">
                    <div className={`px-4 py-2 rounded-2xl text-sm ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'}`}>
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                        Preparing a reply…
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div className={`mt-5 border-t ${isDark ? 'border-slate-800' : 'border-gray-200'} pt-4 space-y-3`}>
                <p className={`text-xs uppercase tracking-wide font-semibold ${mutedClass}`}>Suggested actions</p>
                <div className="flex flex-wrap gap-2">
                  {helpAvailableTopics.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleHelpTopic(option)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                        isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <QuickActionButton
                    icon={<LifeBuoy className="w-4 h-4" />}
                    label="Connect to specialist"
                    onClick={() => handleHelpTopic({ id: 'support', label: HELP_SCRIPTS.support.title })}
                    dark={isDark}
                  />
                  <QuickActionButton
                    icon={<Wallet className="w-4 h-4" />}
                    label="Review wallet billing"
                    onClick={() => openWalletRewards('wallet')}
                    dark={isDark}
                  />
                </div>
              </div>
            </div>
            <div className={`${surfaceClass(isDark)} p-6 space-y-4`}>
              <h3 className={`text-lg font-semibold ${headingClass}`}>Key policies</h3>
              <ul className={`space-y-2 text-sm ${mutedClass}`}>
                <li>• Systematic hot leads only — refunds trigger automatically when AI flags low engagement.</li>
                <li>• Lead review approvals credit <strong>2 replacement leads</strong> and update your pipeline instantly.</li>
                <li>• Wallet usage can be auto-routed to voice, SMS, and email with real-time limits.</li>
                <li>• Stripe checkout records every receipt and keeps your account compliant for audits.</li>
              </ul>
              <div className={`rounded-2xl border px-4 py-3 ${isDark ? 'border-slate-700 bg-slate-900/60 text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                <p className="text-sm font-semibold mb-1">How refunds work</p>
                <p className="text-xs">
                  Request a quality review from any lead dossier. The system inspects call, SMS, and email logs. When the homeowner is unresponsive, credits post back automatically and two fresh hot leads queue for you.
                </p>
              </div>
              <div className={`rounded-2xl border px-4 py-3 ${isDark ? 'border-blue-500/30 bg-blue-500/10 text-blue-100' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
                <p className="text-xs">
                  Need human help? Specialists respond within minutes during business hours. Out-of-hours requests still receive automated resolutions when possible.
                </p>
              </div>
            </div>
          </div>
        );
        
      case 'settings':
        return <ComprehensiveBusinessSettings />;
      
      case 'lead-detail':
        return selectedLead ? (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setSelectedLead(null);
                  setActiveView('leads');
                }}
                className={`flex items-center gap-2 px-4 py-2 text-sm ${mutedClass} hover:text-blue-500`}
              >
                ← Back to Leads
              </button>
              <h1 className={`text-3xl font-bold ${headingClass}`}>{selectedLead.owner_name || selectedLead.address}</h1>
            </div>
            <div className={surfaceClass(isDark)}>
              <EnhancedLeadDetailPage lead={selectedLead} onRewardPoints={awardPoints} />
            </div>
          </div>
        ) : (
          <div className={`${surfaceClass(isDark)} p-6 ${mutedClass}`}>No lead selected</div>
        );
      
      default:
        return <div className={`${surfaceClass(isDark)} p-6 ${mutedClass}`}>View not found</div>;
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex items-center gap-3 text-xl">
          <Sparkles className="w-6 h-6 animate-spin" />
          Loading your command center…
        </div>
      </div>
    );
  }

  return (
    <>
      {pointBursts.map((burst) => (
        <div
          key={burst.id}
          className="fixed top-24 right-8 z-40 pointer-events-none flex items-center gap-3 rounded-2xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-100 shadow-lg animate-point-burst"
        >
          <Sparkles className="w-4 h-4 text-emerald-300" />
          <span>+{burst.amount.toLocaleString()} pts</span>
          {burst.reason && <span className="text-[11px] font-medium text-emerald-200/80">• {burst.reason}</span>}
        </div>
      ))}
      {showWelcomeCelebration && welcomeReward && (
        <WelcomeCelebration reward={welcomeReward} onDismiss={dismissWelcomeCelebration} />
      )}
    <div className={`min-h-screen flex items-stretch ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-gray-900'}`}>
      {/* Vertical Navigation Sidebar */}
      <div
        className={`w-[21.5rem] h-screen flex-shrink-0 flex flex-col border-r sticky top-0 overflow-hidden ${
          isDark ? 'bg-slate-950/90 border-slate-800 backdrop-blur-xl' : 'bg-white/95 border-gray-200 shadow-2xl backdrop-blur-xl'
        }`}
      >
        <div className="px-6 pt-6 pb-4">
          <div
            className={`rounded-3xl border ${
              isDark ? 'border-slate-800 bg-slate-900/70' : 'border-slate-200 bg-white/95'
            } px-4 py-5 space-y-5 shadow-sm`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 text-white shadow-lg shadow-blue-500/30"
                >
                  <Fish className="w-5 h-5" />
                </div>
                <div className="min-w-0 leading-tight">
                  <p className={`text-lg font-semibold tracking-tight ${headingClass}`}>Fish Mouth</p>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-blue-500">Hook Roof Leads</p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-xl transition-colors ${
                  isDark ? 'bg-slate-900 text-slate-200 hover:bg-slate-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                aria-label="Toggle theme"
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>

            <div className="space-y-2">
              <div className={`flex items-center justify-between text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <span className="font-semibold">Level {level}</span>
                <span className="font-semibold">{points.toLocaleString()} pts</span>
              </div>
              <div className={`h-2 rounded-full ${isDark ? 'bg-slate-800' : 'bg-slate-200'} overflow-hidden`}>
                <div
                  className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all"
                  style={{ width: `${Math.round(levelProgress * 100)}%` }}
                />
              </div>
              <div className={`flex items-center justify-between text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <span>{Math.max(0, nextLevelPoints - points).toLocaleString()} pts to LVL {level + 1}</span>
                <span>{redeemedLeads.toLocaleString()} leads redeemed</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div
                className={`rounded-xl border px-3 py-2 ${
                  isDark ? 'border-slate-800 bg-slate-900/60' : 'border-blue-100 bg-blue-50/70'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-semibold text-blue-500">
                  <span>Wallet</span>
                  <Wallet className="w-4 h-4" />
                </div>
                <p className={`text-lg font-semibold ${headingClass}`}>
                  ${walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <button
                  type="button"
                  onClick={() => openWalletRewards('wallet')}
                  className={`mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition ${
                    isDark ? 'bg-blue-500/20 text-blue-100 hover:bg-blue-500/30' : 'bg-blue-600 text-white hover:bg-blue-500'
                  }`}
                >
                  <Coins className="w-3.5 h-3.5" />
                  Add funds
                </button>
              </div>
              <div
                className={`rounded-xl border px-3 py-2 ${
                  isDark ? 'border-emerald-500/30 bg-emerald-500/15' : 'border-emerald-100 bg-emerald-50'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-600 dark:text-emerald-200">
                  <span>Rewards credits</span>
                  <Gift className="w-4 h-4" />
                </div>
                <p className={`text-lg font-semibold ${headingClass}`}>
                  {points.toLocaleString()}
                </p>
                <button
                  type="button"
                  onClick={() => openWalletRewards('rewards')}
                  className={`mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition ${
                    isDark ? 'bg-emerald-500/25 text-emerald-100 hover:bg-emerald-500/35' : 'bg-emerald-600 text-white hover:bg-emerald-500'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Use rewards
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => openWalletRewards('rewards')}
              className={`w-full inline-flex items-center justify-between px-4 py-2 rounded-xl text-xs font-semibold transition ${
                isDark ? 'bg-slate-900/60 text-slate-200 hover:bg-slate-800' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Rewards & credits
              </span>
            </button>
          </div>
        </div>

        <nav className="flex-1 px-6 pb-4 overflow-y-auto">
          <div className="space-y-2">
            {navItems.filter((item) => !item.hidden).map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              const badgeValue =
                item.badge != null
                  ? item.badge
                  : item.id === 'activity' && unseenCount > 0
                  ? unseenCount > 99
                    ? '99+'
                    : unseenCount
                  : null;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  className={navButtonClass(isActive, isDark)}
                >
                  <div className="flex items-start gap-3 text-left">
                    <div
                      className={`rounded-xl p-2.5 ${
                        isActive
                          ? 'bg-white/25 text-white shadow-inner shadow-blue-500/20'
                          : isDark
                          ? 'bg-slate-900/60 text-slate-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold leading-tight">{item.label}</span>
                      {item.description && (
                        <span
                          className={`text-xs mt-1 ${
                            isActive ? 'text-white/85' : isDark ? 'text-slate-400' : 'text-slate-500'
                          }`}
                        >
                          {item.description}
                        </span>
                      )}
                    </div>
                  </div>
                  {badgeValue != null && (
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        isActive
                          ? 'bg-white/30 text-white'
                          : isDark
                          ? 'bg-slate-800/70 text-slate-200'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {badgeValue}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        <div
          className={`mt-auto px-6 py-5 border-t ${
            isDark ? 'border-slate-800 bg-slate-950/70' : 'border-gray-200 bg-white/90'
          }`}
        >
          <button
            onClick={logout}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition ${
              isDark ? 'bg-slate-900 text-slate-200 hover:bg-slate-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <div
          className={`${
            isDark ? 'bg-slate-900/80 border-slate-800 backdrop-blur' : 'bg-white/90 border-gray-200 shadow-sm backdrop-blur'
          } border-b px-6 py-4`}
        >
          <div className="grid w-full items-center gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <h1 className={`text-2xl font-bold ${headingClass}`}>{headerLabel}</h1>
              <p className={`text-sm ${mutedClass}`}>{headerDescription}</p>
            </div>
            <div className="flex items-center justify-end gap-3 sm:gap-4 flex-wrap md:flex-nowrap min-w-0">
              <button
                type="button"
                onClick={() => openWalletRewards('wallet')}
                className={`inline-flex items-center justify-center gap-2 px-5 h-11 min-w-[11rem] rounded-2xl text-sm font-semibold transition ${
                  isDark ? 'bg-blue-600/90 text-white hover:bg-blue-500' : 'bg-blue-600 text-white hover:bg-blue-500'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Wallet & Rewards
              </button>
              <div ref={profileMenuRef} className="relative flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowNotificationTray(false);
                    setShowProfileMenu((prev) => !prev);
                  }}
                  className={`flex items-center gap-3 h-11 rounded-2xl border pl-3 pr-4 transition ${
                    isDark
                      ? 'bg-slate-900/80 text-slate-100 border-slate-800 hover:bg-slate-800'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                  aria-haspopup="menu"
                  aria-expanded={showProfileMenu}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                      isDark ? 'bg-blue-500/20 text-blue-200' : 'bg-blue-100 text-blue-600'
                    }`}
                  >
                    <Fish className="w-4 h-4" />
                  </span>
                  <span className="flex flex-col items-start leading-tight">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-blue-500">Profile</span>
                    <span className="text-sm font-semibold truncate max-w-[12rem]">
                      {user?.name || user?.email || 'Operator'}
                    </span>
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
                </button>
                {showProfileMenu && (
                  <div
                    className={`absolute right-0 mt-3 w-64 rounded-2xl border shadow-xl overflow-hidden z-50 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  >
              <div
                className={`${
                  isDark
                          ? 'bg-slate-900/90 border-b border-slate-800'
                          : 'bg-blue-50 border-b border-slate-200'
                      } px-4 py-4 space-y-3`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            isDark ? 'bg-blue-500/20 text-blue-200' : 'bg-blue-100 text-blue-600'
                          }`}
                        >
                          <Fish className="w-5 h-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">
                            {user?.name || user?.email || 'Operator'}
                          </p>
                          {user?.email && (
                            <p className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              {user.email}
                            </p>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide">
                          <span className={isDark ? 'text-slate-300' : 'text-slate-500'}>Level {level}</span>
                          <span className={isDark ? 'text-blue-200' : 'text-blue-600'}>
                            {points.toLocaleString()} pts
                          </span>
                        </div>
                        <div className={`mt-2 h-2 rounded-full ${isDark ? 'bg-slate-800' : 'bg-slate-200'} overflow-hidden`}>
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"
                            style={{ width: `${Math.round(levelProgress * 100)}%` }}
                          />
                        </div>
                        <p className={`mt-2 text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {Math.max(0, nextLevelPoints - points).toLocaleString()} pts to Level {level + 1}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleProfileNavigate('dashboard')}
                      className="w-full px-4 py-3 text-sm text-left hover:bg-blue-500/10"
                    >
                      Mission Control
                    </button>
                    <button
                      type="button"
                      onClick={() => handleProfileNavigate('settings', 'company')}
                      className="w-full px-4 py-3 text-sm text-left hover:bg-blue-500/10"
                    >
                      Business Settings
                    </button>
                    <button
                      type="button"
                      onClick={() => handleProfileNavigate('settings', 'rewards')}
                      className="w-full px-4 py-3 text-sm text-left hover:bg-blue-500/10"
                    >
                      Wallet & Rewards
                    </button>
                    <button
                      type="button"
                      onClick={() => handleProfileNavigate('settings', 'integrations')}
                      className="w-full px-4 py-3 text-sm text-left hover:bg-blue-500/10"
                    >
                      Integrations
                    </button>
                    <div className={isDark ? 'border-t border-slate-800' : 'border-t border-slate-200'} />
                    <button
                      type="button"
                      onClick={() => handleProfileNavigate('logout')}
                      className="w-full px-4 py-3 text-sm text-left text-rose-500 hover:bg-rose-500/10"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
              <div ref={notificationTrayRef} className="relative flex-shrink-0">
                <button
                  type="button"
                  className={`relative flex items-center gap-2 px-4 h-11 rounded-2xl transition-all duration-200 ${
                    isDark ? 'bg-slate-800/80 text-slate-200 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  aria-label="Open notifications"
                  aria-haspopup="true"
                  aria-expanded={showNotificationTray}
                  onClick={toggleNotificationTray}
                >
                  <Bell className="w-5 h-5" />
                  {unseenCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-rose-500 text-white">
                      {unseenCount > 99 ? '99+' : unseenCount}
                    </span>
                  )}
                </button>
                <div
                  className={`absolute right-0 mt-4 w-[22rem] transform transition-all duration-200 origin-top-right ${
                    showNotificationTray
                      ? 'scale-100 opacity-100 translate-y-0 pointer-events-auto'
                      : 'scale-95 opacity-0 -translate-y-2 pointer-events-none'
                  }`}
                >
                  <div
                    className={`rounded-3xl border shadow-2xl overflow-hidden ${
                      isDark ? 'border-slate-800 bg-slate-950/95' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="max-h-96 overflow-y-auto p-4 space-y-3">
                      {notifications.length === 0 ? (
                        <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'} text-center py-8`}>
                          Launch a scan or sequence to start receiving updates.
                        </div>
                      ) : (
                        notifications.map((note) => {
                          const Icon = note.visual.icon;
                          const reviewDetail =
                            note.type === 'manual_review'
                              ? manualReviewMap.get(note.payload?.reviewId) || note.payload?.review || note.raw?.payload?.review
                              : null;
                          return (
                            <div
                              key={note.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => handleNotificationNavigate(note, reviewDetail)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  handleNotificationNavigate(note, reviewDetail);
                                }
                              }}
                              className={`border rounded-2xl p-3 transition-all duration-200 hover:translate-y-[-2px] hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer ${
                                isDark ? 'border-slate-800 bg-slate-900/60' : 'border-gray-200 bg-white'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className={`flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center ${note.visual.tone}`}
                                >
                                  <Icon className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0 space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-semibold leading-snug flex-1 min-w-0 truncate">{note.title}</p>
                                    <span
                                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                        PRIORITY_BADGES[note.priority] || PRIORITY_BADGES[3]
                                      }`}
                                    >
                                      {note.priorityLabel}
                                    </span>
                                  </div>
                                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                    {formatRelativeTime(note.timestampMs)}
                                  </p>
                                  {note.bonusOffer && (
                                    <p
                                      className={`text-xs font-medium ${
                                        isDark ? 'text-amber-200/90' : 'text-amber-600'
                                      }`}
                                    >
                                      {note.bonusOffer}
                                    </p>
                                  )}
                                  {note.cta && (
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        openWalletRewards('rewards');
                                        setShowNotificationTray(false);
                                        setLastNotificationViewedAt(Date.now());
                                      }}
                                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                                        isDark
                                          ? 'bg-blue-500/20 text-blue-100 hover:bg-blue-500/30'
                                          : 'bg-blue-600 text-white hover:bg-blue-500'
                                      }`}
                                    >
                                      <Sparkles className="w-3 h-3" />
                                      {note.cta}
                                    </button>
                                  )}
                                  {note.leadId && (
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        inspectLeadById(note.leadId);
                                      }}
                                      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg ${
                                        isDark
                                          ? 'text-blue-300 hover:text-blue-200 hover:bg-slate-800'
                                          : 'text-blue-600 hover:text-blue-500 hover:bg-blue-50'
                                      }`}
                                    >
                                      <Eye className="w-3 h-3" /> Inspect lead
                                    </button>
                                  )}
                                  {note.type === 'manual_review' && (
                                    <div className="flex flex-wrap items-center gap-2 pt-2">
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          if (reviewDetail) {
                                            setActiveManualReview(reviewDetail);
                                            setShowNotificationTray(false);
                                          } else {
                                            toast.error('This draft has already been resolved.');
                                          }
                                        }}
                                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                                          isDark
                                            ? 'bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'
                                            : 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                                        }`}
                                      >
                                        Review draft
                                      </button>
                                      {reviewDetail?.manual_send && (
                                        <span
                                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                            isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                                          }`}
                                        >
                                          Manual send queued
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    <div
                      className={`flex items-center justify-between gap-3 px-4 py-3 border-t ${
                        isDark ? 'border-slate-800 bg-slate-900/80' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={openFullNotifications}
                        className="text-sm font-semibold text-blue-600 hover:text-blue-500"
                      >
                        View full timeline
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowNotificationTray(false)}
                        className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                          isDark
                            ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className={`flex-1 overflow-y-auto p-6 ${isDark ? 'bg-slate-950' : 'bg-slate-100'}`}>
          {renderContent()}
        </div>
      </div>
    </div>

  {walletRewardsModal.open && (
    <WalletRewardsModal
      open={walletRewardsModal.open}
      defaultTab={walletRewardsModal.tab}
      onClose={closeWalletRewards}
      points={points}
      level={level}
      streak={streak}
      walletBalance={walletBalance}
      redeemedLeads={redeemedLeads}
      pointHistory={pointHistory}
      dailyRotation={walletDailyRotation}
      completedQuests={completedQuests}
      usageRules={usageRules}
      creditBuckets={creditBuckets}
      pricing={CREDIT_PRICING}
      nextLevelPoints={nextLevelPoints}
      levelProgress={levelProgress * 100}
      onStripeTopUp={handleStripeTopUp}
      onPlanCheckout={handlePlanCheckout}
      onRedeemLead={handleRedeemLeadCredit}
      onCompleteTask={handleQuestAction}
      onRefreshDailyTasks={refreshWalletDailyTasks}
      onToggleAutoSpend={handleToggleAutoSpend}
      onAllocateCredits={handleAllocateCredits}
      onExchangePoints={handleExchangePoints}
      onOpenLedger={() => setShowPointsModal(true)}
      isDarkMode={isDark}
    />
  )}

  {activeManualReview && (
    <ManualReviewModal
      review={activeManualReview}
      onClose={() => setActiveManualReview(null)}
      onResolve={(payload) => handleResolveManualReview(activeManualReview.id, payload)}
      isDark={isDark}
    />
  )}

  {pendingTransaction && (
    <TransactionApprovalModal
      transaction={pendingTransaction}
      onCancel={() => setPendingTransaction(null)}
      onConfirm={() => {
        const { type, channel, units, totalCost, points } = pendingTransaction;
        setPendingTransaction(null);
        if (type === 'wallet_allocation') {
          handleAllocateCredits(channel, units, { force: true, totalCost });
        } else if (type === 'points_exchange') {
          handleExchangePoints(channel, units, { force: true, points });
        }
      }}
    />
  )}

  {showCelebration && (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <button
        type="button"
        onClick={handleCloseCelebration}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-fade-in"
        aria-label="Close celebration"
      />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 14 }).map((_, index) => {
          const delay = `${index * 0.15}s`;
          const horizontal = `${10 + (index * 6) % 80}%`;
          const vertical = `${10 + ((index * 13) % 70)}%`;
          const rotation = (index * 47) % 360;
          const hue = 40 + (index * 27) % 220;
          return (
            <span
              key={`confetti-${index}`}
              className="absolute block h-2 w-5 rounded-full opacity-0 animate-confetti"
              style={{
                animationDelay: delay,
                top: vertical,
                left: horizontal,
                transform: `rotate(${rotation}deg)`,
                background: `linear-gradient(90deg, hsla(${hue}, 95%, 72%, 0.9), hsla(${(hue + 40) % 360}, 95%, 65%, 0.6))`,
              }}
            />
          );
        })}
      </div>
      <div className="relative z-10 pointer-events-auto" onClick={(event) => event.stopPropagation()}>
        <div className="absolute -inset-12 bg-gradient-to-br from-amber-400/40 via-blue-500/30 to-purple-500/40 blur-3xl animate-pulse-slow" />
        <div className="relative px-10 py-8 bg-slate-900/90 border border-blue-400/40 rounded-[32px] shadow-[0_32px_80px_rgba(8,47,73,0.55)] text-slate-100 flex flex-col items-center gap-4 max-w-md">
          <div className="relative">
            <div className="absolute inset-0 blur-2xl bg-amber-400/40 animate-pulse-slow" />
            <div className="relative flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-br from-amber-400 via-orange-400 to-rose-500 shadow-[0_12px_40px_rgba(244,114,182,0.45)]">
              <div className="absolute inset-2 rounded-full border border-white/30 animate-spin-slow" />
              <div className="absolute inset-4 rounded-full border border-white/20 animate-spin-slower" />
              <Sparkles className="w-16 h-16 text-white drop-shadow-lg animate-pop" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <p className="text-[11px] uppercase tracking-[0.35em] text-amber-300/80">Level Up</p>
            <p className="text-3xl font-semibold leading-tight">
              {celebrationMessage || `Level ${level} unlocked`}
            </p>
            <p className="text-sm text-slate-300">
              {Math.max(0, nextLevelPoints - points).toLocaleString()} pts to Level {level + 1}. Keep stacking wins.
            </p>
            {celebrationQuote && (
              <p className="text-sm text-amber-200/90">{celebrationQuote}</p>
            )}
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs font-semibold text-amber-200 shadow-inner">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-bold">
              ★
            </span>
            Momentum boost activated — quests now pay extra bonus points for 15 minutes.
          </div>
          <button
            type="button"
            onClick={handleCloseCelebration}
            className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 text-sm font-semibold text-white shadow-lg hover:bg-blue-500"
          >
            Continue the run
          </button>
        </div>
      </div>
    </div>
  )}

  {sequenceModal.open && sequenceModal.lead && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md px-4">
      <div className={`${surfaceClass(isDark)} w-full max-w-md p-6 space-y-4`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className={`text-lg font-semibold ${headingClass}`}>Enroll lead into sequence</h3>
            <p className={`text-sm ${mutedClass}`}>
              {sequenceModal.lead.homeowner_name || sequenceModal.lead.address}
            </p>
          </div>
          <button
            type="button"
            onClick={() => !sequenceLoading && setSequenceModal({ open: false, lead: null, sequenceId: '' })}
            className={`p-2 rounded-lg ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            aria-label="Close sequence modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          <label className={`text-xs font-semibold uppercase ${mutedClass} tracking-wide`}>Sequence</label>
          <select
            value={sequenceModal.sequenceId}
            onChange={(event) => setSequenceModal((prev) => ({ ...prev, sequenceId: event.target.value }))}
            className={`w-full rounded-lg border px-3 py-2 text-sm ${
              isDark
                ? 'bg-slate-900 border-slate-700 text-slate-100'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            {sequences.map((sequence) => (
              <option key={sequence.id || sequence.sequence_id} value={sequence.id || sequence.sequence_id}>
                {sequence.name || sequence.sequence_name || `Sequence ${sequence.id}`}
              </option>
            ))}
          </select>
          {!sequences.length && (
            <p className={`text-xs ${mutedClass}`}>No sequences available. Create one in the Sequences tab.</p>
          )}
        </div>
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setSequenceModal({ open: false, lead: null, sequenceId: '' })}
            className={`px-4 py-2 rounded-lg text-sm ${isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmSequenceEnrollment}
            disabled={sequenceLoading || !sequenceModal.sequenceId}
            className={`px-4 py-2 rounded-lg text-sm font-semibold text-white ${sequenceLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-500'}`}
          >
            {sequenceLoading ? 'Enrolling…' : 'Enroll lead'}
          </button>
        </div>
      </div>
    </div>
  )}
  {showEnhancedReportGenerator && (
    <EnhancedReportGenerator
      lead={activeGeneratorLead}
      businessProfile={businessProfile}
      visible={showEnhancedReportGenerator}
      onClose={() => {
        setShowEnhancedReportGenerator(false);
        setGeneratorLeadOverride(null);
      }}
    />
  )}
  {reportPreview && reportPreview.lead && (
    <ReportPreviewModal
      template={reportPreview.template}
      lead={reportPreview.lead}
      onClose={() => setReportPreview(null)}
      onGenerate={() =>
        handleGenerateReport(reportPreview.lead.id, reportPreview.template?.id, reportPreview.lead)
      }
      isDark={isDark}
    />
  )}
  {showPointsModal && (
    <PointsLedgerModal
      onClose={() => setShowPointsModal(false)}
      points={points}
      pointsPerLead={POINTS_PER_LEAD}
      redeemedLeads={redeemedLeads}
      onRedeem={handleRedeemLeadCredit}
      pointHistory={pointHistory}
      streak={streak}
      isDark={isDark}
    />
  )}
  </>
  );
}

function DashboardCard({ title, value, change, icon, color, dark = false }) {
  const colorClasses = {
    blue: 'bg-blue-500 text-white',
    red: 'bg-red-500 text-white',
    green: 'bg-green-500 text-white',
    purple: 'bg-purple-500 text-white'
  };

  const containerClass = dark
    ? 'bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl'
    : 'bg-white rounded-3xl border border-gray-200 p-6 shadow-lg';
  const titleClass = dark ? 'text-slate-300' : 'text-gray-600';
  const valueClass = dark ? 'text-white' : 'text-gray-900';
  const changeClass = dark ? 'text-slate-400' : 'text-gray-500';

  return (
    <div className={`${containerClass} hover:shadow-2xl transition-shadow`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${titleClass}`}>{title}</p>
          <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
          <p className={`text-sm ${changeClass}`}>{change}</p>
        </div>
        <div className={`p-3 rounded-xl ${colorClasses[color] || colorClasses.blue}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function ActionButton({ icon, label, onClick, primary = false, dark = false }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        primary
          ? 'bg-blue-600 text-white hover:bg-blue-700'
          : dark
          ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function TransactionApprovalModal({ transaction, onConfirm, onCancel }) {
  if (!transaction) return null;
  const { type, channel, units, totalCost = 0, points = 0, unitLabel = 'unit' } = transaction;
  const label = CREDIT_PRICING[channel]?.label || channel;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-3xl border border-blue-400/30 bg-slate-950 text-slate-100 shadow-[0_25px_60px_rgba(2,12,33,0.65)] overflow-hidden">
        <div className="px-6 py-5 border-b border-blue-500/20 bg-blue-500/10">
          <p className="text-xs uppercase tracking-[0.3em] text-blue-200">Confirm spend</p>
          <h3 className="text-xl font-semibold text-white mt-1">Approve this transaction?</h3>
        </div>
        <div className="px-6 py-6 space-y-4">
          <div className="rounded-2xl border border-blue-400/20 bg-slate-900/60 px-4 py-3 text-sm">
            <p className="text-slate-300">Channel: <span className="font-semibold text-white">{label}</span></p>
            <p className="text-slate-300">Credits: <span className="font-semibold text-white">{units}</span> {unitLabel}{units === 1 ? '' : 's'}</p>
            {type === 'wallet_allocation' && (
              <p className="text-slate-300">Wallet debit: <span className="font-semibold text-white">${totalCost.toFixed(2)}</span></p>
            )}
            {type === 'points_exchange' && (
              <p className="text-slate-300">Point spend: <span className="font-semibold text-white">{points} pts</span></p>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Auto-spend is disabled for this feature. Confirm to complete the conversion.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 transition"
            >
              Confirm purchase
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickActionButton({ icon, label, onClick, dark = false }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full transition px-4 py-2 text-sm font-medium ${
        dark
          ? 'bg-slate-800 text-slate-100 hover:bg-slate-700'
          : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function renderActivityLabel(item) {
  if (item.message) return item.message;
  if (item.type === 'report_ready') return `Report ready for ${item.payload?.lead_name || 'lead'}`;
  if (item.type === 'manual_review') return `Review ${item.payload?.stepLabel || 'sequence draft'}`;
  if (item.type === 'ai_call_completed') return `AI call completed with ${item.payload?.lead_name || 'lead'}`;
  return `Activity: ${item.type}`;
}

function formatDateRange(start, end) {
  if (!start && !end) return '—';
  const format = (value) => {
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return value;
    }
  };
  if (start && end) {
    return `${format(start)} → ${format(end)}`;
  }
  return format(start || end);
}

function formatRelativeTime(timestampMs) {
  if (!timestampMs) return '';
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

function StatusPill({ label, value, color = 'slate', isDark = false }) {
  const palette = isDark
    ? {
        slate: { bg: 'bg-slate-800/70', text: 'text-slate-200', border: 'border border-slate-700' },
        blue: { bg: 'bg-blue-500/20', text: 'text-blue-200', border: 'border border-blue-400/40' },
        red: { bg: 'bg-rose-500/20', text: 'text-rose-200', border: 'border border-rose-400/40' },
        emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-200', border: 'border border-emerald-400/40' },
        orange: { bg: 'bg-amber-500/20', text: 'text-amber-200', border: 'border border-amber-400/40' },
        indigo: { bg: 'bg-indigo-500/20', text: 'text-indigo-200', border: 'border border-indigo-400/40' },
      }
    : {
        slate: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border border-slate-200' },
        blue: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border border-blue-200' },
        red: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border border-rose-200' },
        emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border border-emerald-200' },
        orange: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border border-orange-200' },
        indigo: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border border-indigo-200' },
      };
  const tones = palette[color] || palette.slate;
  const containerClass = isDark
    ? 'rounded-2xl px-4 py-3 border border-slate-800 bg-slate-900/70 shadow-sm space-y-2 text-slate-100'
    : 'rounded-2xl px-4 py-3 border border-gray-200 bg-white shadow-sm space-y-2 text-gray-900';
  return (
    <div className={containerClass}>
      <p className={`text-xs uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{label}</p>
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${tones.bg} ${tones.text} ${tones.border}`}>
        {value}
      </span>
    </div>
  );
}

function ChartCard({ title, subtitle, type, data, isDark = false }) {
  const containerClass = isDark
    ? 'bg-slate-900/70 border border-slate-800 text-slate-100'
    : 'bg-white border border-gray-200 text-gray-900';
  const subtitleClass = isDark ? 'text-slate-400' : 'text-gray-600';
  const gridStroke = isDark ? '#1f2937' : '#e5e7eb';
  const axisStroke = isDark ? '#94a3b8' : '#6b7280';
  const tooltipStyle = isDark
    ? { backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#e2e8f0' }
    : { backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#374151' };
  const lineColor = isDark ? '#60a5fa' : '#3b82f6';
  const barColor = lineColor;
  return (
    <div className={`${containerClass} rounded-xl shadow-xl p-6 hover:shadow-2xl transition-shadow`}>
      <div className="mb-6">
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className={`text-sm ${subtitleClass}`}>{subtitle}</p>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {type === 'line' ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="date" stroke={axisStroke} tick={{ fill: axisStroke }} />
              <YAxis stroke={axisStroke} tick={{ fill: axisStroke }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="leads" stroke={lineColor} strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="stage" stroke={axisStroke} tick={{ fill: axisStroke }} />
              <YAxis stroke={axisStroke} tick={{ fill: axisStroke }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill={barColor} radius={[6, 6, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
