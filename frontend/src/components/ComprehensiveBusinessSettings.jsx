import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Building2,
  Palette,
  Award,
  Camera,
  Bot,
  Settings,
  Upload,
  Globe,
  Loader,
  Plus,
  Trash2,
  Save,
  Gift,
  Sparkles,
  Trophy,
  Zap,
  RefreshCw,
  Shield,
  Phone,
  Mail,
  ArrowRight,
  Target,
  Wallet,
  Coins,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import businessProfileService from '../services/businessProfileService';
import PointsLedgerModal from './PointsLedgerModal';
import WalletRewardsModal from './WalletRewardsModal';

const LEVEL_STEP_POINTS = 250;
const POINTS_PER_LEAD = 100;
const DAILY_LOGIN_BONUS = 100;
const POINTS_PER_DOLLAR = 25;
const CREDIT_PRICING = {
  scans: { label: 'Roof SmartScan', cost: 4.5, apiCost: 1.25, unit: 'scan' },
  voice: { label: 'AI Voice Call', cost: 0.2, apiCost: 0.05, unit: 'call' },
  sms: { label: 'AI SMS', cost: 0.08, apiCost: 0.02, unit: 'message' },
  email: { label: 'AI Email', cost: 0.09, apiCost: 0.0225, unit: 'email' },
  leads: { label: 'AI Hot Lead', cost: 45, apiCost: 12, unit: 'lead' },
};

const ComprehensiveBusinessSettings = () => {
  const [activeTab, setActiveTab] = useState('company');
  const [showRewardsModal, setShowRewardsModal] = useState(false);
  const getStoredNumber = (key, fallback = 0) => {
    if (typeof window === 'undefined') return fallback;
    const raw = window.localStorage.getItem(key);
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const getStoredObject = (key, fallback = {}) => {
    if (typeof window === 'undefined') return fallback;
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.warn('Failed to parse stored data for', key, error);
      return fallback;
    }
  };
  const [points, setPoints] = useState(() => getStoredNumber('fm_points', 0));
  const [redeemedLeads, setRedeemedLeads] = useState(() => getStoredNumber('fm_redeemed_leads', 0));
  const [pointHistory, setPointHistory] = useState(() => {
    const history = getStoredObject('fm_point_history', []);
    return Array.isArray(history) ? history : [];
  });
  const [streak, setStreak] = useState(() => getStoredNumber('fm_login_streak', 0));
  const [level, setLevel] = useState(() => getStoredNumber('fm_level', 1) || 1);
  const [completedQuests, setCompletedQuests] = useState(() => getStoredObject('fm_completed_quests', {}));
  const [dailyRotation, setDailyRotation] = useState(() => {
    if (typeof window === 'undefined') {
      return { date: '', tasks: [], wave: 0 };
    }
    try {
      const raw = window.localStorage.getItem('fm_daily_rotation');
      if (!raw) return { date: '', tasks: [], wave: 0 };
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.date && Array.isArray(parsed.tasks)) {
        return { wave: 0, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to parse daily rotation', error);
    }
    return { date: '', tasks: [], wave: 0 };
  });
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
  const [walletBalance, setWalletBalance] = useState(() => getStoredNumber('fm_wallet_balance', 0));
  const [creditBuckets, setCreditBuckets] = useState(() => {
    const stored = getStoredObject('fm_credit_buckets', {});
    return { ...defaultCreditBuckets, ...stored };
  });
  const [usageRules, setUsageRules] = useState(() => {
    const stored = getStoredObject('fm_credit_usage_rules', {});
    return { ...defaultUsageRules, ...stored };
  });
  const [walletRewardsModal, setWalletRewardsModal] = useState({ open: false, tab: 'wallet' });
  const [isDarkMode, setIsDarkMode] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );
  const [businessProfile, setBusinessProfile] = useState({
    company: {
      name: '',
      tagline: '',
      phone: '',
      email: '',
      address: '',
      website: '',
      yearsInBusiness: '',
      licenseNumber: '',
      insuranceCoverage: '',
      serviceRadius: ''
    },
    branding: {
      primaryColor: '#2563eb',
      secondaryColor: '#64748b',
      accentColor: '#f59e0b',
      logo: null,
      fontFamily: 'Inter',
      brandPersonality: 'professional',
      valuePropositions: []
    },
    services: {
      primaryServices: [],
      specialties: [],
      certifications: [],
      serviceAreas: [],
      pricing: {
        emergencyCallout: '',
        inspectionFee: '',
        typicalProjectRange: ''
      }
    },
    caseStudies: {
      portfolio: [],
      testimonials: [],
      beforeAfterSets: []
    },
    aiAgent: {
      personality: 'professional',
      communicationStyle: 'consultative',
      keyMessaging: [],
      objectionHandling: [],
      closingApproaches: []
    },
    integrations: {
      website: '',
      crmSystem: '',
      calendarLink: '',
      socialMedia: {
        facebook: '',
        instagram: '',
        linkedin: '',
        youtube: ''
      }
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [completionScore, setCompletionScore] = useState(0);
  const [websiteScraping, setWebsiteScraping] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const notifyBillingUpdate = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fm-billing-refresh'));
    }
  }, []);

  const openWalletRewards = useCallback((tab = 'wallet') => {
    setWalletRewardsModal({ open: true, tab });
  }, []);

  const closeWalletRewards = useCallback(() => {
    setWalletRewardsModal((prev) => ({ ...prev, open: false }));
  }, []);

  const tabs = useMemo(
    () => [
      { id: 'company', label: 'Company Info', icon: Building2, color: 'blue' },
      { id: 'branding', label: 'Brand & Design', icon: Palette, color: 'purple' },
      { id: 'services', label: 'Services & Pricing', icon: Award, color: 'emerald' },
      { id: 'portfolio', label: 'Portfolio & Cases', icon: Camera, color: 'amber' },
      { id: 'messaging', label: 'AI & Messaging', icon: Bot, color: 'rose' },
      { id: 'integrations', label: 'Integrations', icon: Settings, color: 'cyan' },
      { id: 'rewards', label: 'Rewards & Credits', icon: Trophy, color: 'violet' },
    ],
    []
  );

  const computeLevelValue = useCallback(
    (value = 0) => Math.max(1, Math.floor((value ?? 0) / LEVEL_STEP_POINTS) + 1),
    []
  );

  const logPointEvent = useCallback(
    (amount, reason, meta = {}) => {
      const entry = {
        amount,
        reason,
        timestamp: new Date().toISOString(),
        ...meta,
      };
      setPointHistory((prev) => {
        const history = [entry, ...prev].slice(0, 100);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('fm_point_history', JSON.stringify(history));
        }
        return history;
      });
    },
    []
  );

  const awardPoints = useCallback(
    (amount, reason, meta = {}) => {
      if (!amount) return;
      setPoints((prev) => {
        const previous = prev ?? 0;
        const next = previous + amount;
        const nextLevel = computeLevelValue(next);
        setLevel(nextLevel);
        return next;
      });
      logPointEvent(amount, reason, meta);
      if (amount > 0) {
        toast.success(`+${amount} pts • ${reason}`);
      }
    },
    [computeLevelValue, logPointEvent]
  );

  const handleRedeemLeadCredit = useCallback(() => {
    if ((points ?? 0) < POINTS_PER_LEAD) {
      const shortfall = POINTS_PER_LEAD - (points ?? 0);
      toast.error(`Earn ${shortfall} more pts to redeem a free lead.`);
      return;
    }
    setPoints((prev) => {
      const next = Math.max(0, (prev ?? 0) - POINTS_PER_LEAD);
      const nextLevel = computeLevelValue(next);
      setLevel(nextLevel);
      return next;
    });
    setRedeemedLeads((prev) => prev + 1);
    logPointEvent(-POINTS_PER_LEAD, 'Redeemed free lead', { type: 'redeem' });
    toast.success('Free lead credit issued! Your next AI-qualified prospect will be added automatically.');
  }, [points, computeLevelValue, logPointEvent]);

  const handleStripeCheckout = useCallback(
    async (amount) => {
      const value = Number(amount);
      if (!Number.isFinite(value) || value <= 0) {
        toast.error('Enter a valid amount to start checkout.');
        return;
      }
      try {
        const response = await fetch('/api/billing/stripe/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: value }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data?.checkoutUrl) {
            window.open(data.checkoutUrl, '_blank', 'noopener');
            toast.success('Stripe checkout opened in a new tab.');
            return;
          }
        }
        toast.error('Stripe checkout unavailable. Add your API keys and retry.');
      } catch (error) {
        console.warn('Stripe checkout fallback', error);
        toast.error('Unable to reach Stripe. Verify configuration and retry.');
      }
    },
    []
  );

  const handleAllocateCredits = useCallback(
    (channel, units = 10) => {
      const pricing = CREDIT_PRICING[channel];
      if (!pricing) return;
      const normalizedUnits = Math.max(1, Math.floor(Number(units) || 0));
      const debit = pricing.cost * normalizedUnits;
      if ((walletBalance ?? 0) < debit) {
        toast.error('Wallet balance is too low. Add funds first.');
        return;
      }
      setWalletBalance((prev) => prev - debit);
      setCreditBuckets((prev) => ({
        ...prev,
        [channel]: Math.max(0, (prev[channel] || 0) + normalizedUnits),
      }));
      setTimeout(() => notifyBillingUpdate(), 120);
      toast.success(
        `Converted $${debit.toFixed(2)} into ${normalizedUnits} ${pricing.unit}${normalizedUnits === 1 ? '' : 's'}.`
      );
    },
    [walletBalance, notifyBillingUpdate]
  );

  const handleExchangePointsForCredits = useCallback(
    (channel, units = 1) => {
      const pricing = CREDIT_PRICING[channel];
      if (!pricing) return;
      const normalizedUnits = Math.max(1, Math.floor(Number(units) || 0));
      const requiredPoints = Math.ceil(pricing.cost * POINTS_PER_DOLLAR * normalizedUnits);
      if ((points ?? 0) < requiredPoints) {
        toast.error('Not enough points for that exchange yet.');
        return;
      }
      setPoints((prev) => Math.max(0, (prev ?? 0) - requiredPoints));
      setCreditBuckets((prev) => ({
        ...prev,
        [channel]: Math.max(0, (prev?.[channel] || 0) + normalizedUnits),
      }));
      notifyBillingUpdate();
      setPointHistory((prev) => {
        const entry = {
          amount: -requiredPoints,
          reason: `Converted points to ${pricing.label || channel}`,
          timestamp: new Date().toISOString(),
        };
        const history = [entry, ...prev].slice(0, 100);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('fm_point_history', JSON.stringify(history));
        }
        return history;
      });
      toast.success(`Converted ${requiredPoints} pts into ${normalizedUnits} ${pricing.unit}${normalizedUnits === 1 ? '' : 's'}.`);
    },
    [points, notifyBillingUpdate]
  );

  const handleToggleUsageRule = useCallback(
    (channel) => {
      setUsageRules((prev) => {
        const next = { ...prev, [channel]: !prev[channel] };
        const enabled = next[channel];
        const label = CREDIT_PRICING[channel]?.label || channel;
        toast.success(`${label} auto wallet usage ${enabled ? 'enabled' : 'disabled'}.`);
        return next;
      });
      setTimeout(() => notifyBillingUpdate(), 120);
    },
    [notifyBillingUpdate]
  );

  const handleSimulateUsage = useCallback(
    (channel, units = 1) => {
      const pricing = CREDIT_PRICING[channel];
      if (!pricing) return;
      const normalizedUnits = Math.max(1, Math.floor(Number(units) || 0));
      const available = creditBuckets[channel] || 0;
      const fromCredits = Math.min(available, normalizedUnits);
      const deficit = normalizedUnits - fromCredits;
      if (deficit > 0 && !usageRules[channel]) {
        toast.error('Enable wallet usage for this channel or allocate more credits first.');
        return;
      }
      const requiredWallet = deficit > 0 ? pricing.cost * deficit : 0;
      if (requiredWallet > 0 && (walletBalance ?? 0) < requiredWallet) {
        toast.error('Wallet balance cannot cover the requested usage.');
        return;
      }
      setCreditBuckets((prev) => ({
        ...prev,
        [channel]: Math.max(0, (prev[channel] || 0) - fromCredits),
      }));
      if (requiredWallet > 0) {
        setWalletBalance((prev) => prev - requiredWallet);
      }
      setTimeout(() => notifyBillingUpdate(), 120);
      const label = CREDIT_PRICING[channel]?.label || channel;
      const walletNote = requiredWallet > 0 ? ` • Wallet debited $${requiredWallet.toFixed(2)}` : '';
      toast.success(`Logged ${normalizedUnits} ${pricing.unit}${normalizedUnits === 1 ? '' : 's'} for ${label}${walletNote}`);
    },
    [creditBuckets, usageRules, walletBalance, notifyBillingUpdate]
  );

  const buildRotation = useCallback(
    (wave = 0) => {
      const today = new Date();
      const todayKey = today.toISOString().slice(0, 10);
      const basePool = [
        {
          id: 'lead-review',
          title: 'Review today\'s AI-ranked lead',
          description: 'Open any lead detail panel to confirm AI insights.',
          points: 35,
          actionLabel: 'Log lead review',
          icon: Sparkles,
          requiresPurchase: false,
          minLevel: 1,
        },
        {
          id: 'sequence-touch',
          title: 'Queue a nurture follow-up',
          description: 'Enroll one homeowner in a follow-up sequence.',
          points: 45,
          actionLabel: 'Log follow-up',
          icon: Mail,
          requiresPurchase: false,
          minLevel: 1,
        },
        {
          id: 'conversion-checkup',
          title: 'Check conversion analytics',
          description: 'Visit the dashboard analytics to monitor close rates.',
          points: 25,
          actionLabel: 'Log analytics check',
          icon: Target,
          requiresPurchase: false,
          minLevel: 1,
        },
        {
          id: 'portfolio-refresh',
          title: 'Add a new project photo',
          description: 'Upload a before/after set to strengthen credibility.',
          points: 40,
          actionLabel: 'Log case study update',
          icon: Camera,
          requiresPurchase: false,
          minLevel: 2,
        },
        {
          id: 'agent-script',
          title: 'Refresh AI agent messaging',
          description: 'Tweak your persuasion framework in AI settings.',
          points: 30,
          actionLabel: 'Log script refresh',
          icon: Bot,
          requiresPurchase: false,
          minLevel: 2,
        },
      ].filter((task) => (task.minLevel ?? 1) <= level);

      const premiumPool = [
        {
          id: 'smartscan',
          title: 'Launch a SmartScan',
          description: 'Run a premium scan on a new address to unlock annotated roof intelligence.',
          points: 85,
          actionLabel: 'Log SmartScan',
          icon: Camera,
          requiresPurchase: true,
          unlocksAt: 10,
          billing: '$4.50 per scan • billed instantly',
          minLevel: 2,
        },
        {
          id: 'voice-burst',
          title: 'Deploy AI voice agent burst',
          description: 'Schedule 5 outbound AI calls to revive stalled leads.',
          points: 90,
          actionLabel: 'Log voice burst',
          icon: Phone,
          requiresPurchase: true,
          unlocksAt: 10,
          billing: '$0.45 per connected call',
          minLevel: 2,
        },
        {
          id: 'email-surge',
          title: 'Send 25 AI-personalized emails',
          description: 'Kick off a micro-campaign targeting a storm cluster.',
          points: 75,
          actionLabel: 'Log email surge',
          icon: Mail,
          requiresPurchase: true,
          unlocksAt: 20,
          billing: '$0.09 per email send',
          minLevel: 3,
        },
      ].filter(
        (task) =>
          (task.minLevel ?? 1) <= level &&
          (redeemedLeads ?? 0) >= (task.unlocksAt ?? 0)
      );

      const baseTasks = [];
      if (basePool.length) {
        const startIndex = (today.getDate() + wave) % basePool.length;
        baseTasks.push(basePool[startIndex]);
        if (basePool.length > 1) {
          baseTasks.push(basePool[(startIndex + 1) % basePool.length]);
        }
      }

      const tasks = [...baseTasks];
      if (premiumPool.length) {
        const premiumIndex = (today.getDay() + wave) % premiumPool.length;
        tasks.push(premiumPool[premiumIndex]);
      }

      return {
        date: todayKey,
        wave,
        tasks,
      };
    },
    [level, redeemedLeads]
  );

  const tasksMatch = (current = [], incoming = []) => {
    if (current.length !== incoming.length) return false;
    return current.every((task, index) => task.id === incoming[index]?.id);
  };

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    const targetWave = dailyRotation.date === todayKey ? dailyRotation.wave ?? 0 : 0;
    const expected = buildRotation(targetWave);
    if (
      dailyRotation.date !== expected.date ||
      (dailyRotation.wave ?? 0) !== targetWave ||
      !tasksMatch(dailyRotation.tasks, expected.tasks)
    ) {
      const nextRotation = { ...expected, wave: targetWave };
      setDailyRotation(nextRotation);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('fm_daily_rotation', JSON.stringify(nextRotation));
      }
    }
  }, [dailyRotation.date, dailyRotation.wave, dailyRotation.tasks, buildRotation]);

  const refreshDailyRotation = useCallback(() => {
    const nextWave = (dailyRotation.wave ?? 0) + 1;
    const rotation = buildRotation(nextWave);
    const nextRotation = { ...rotation, wave: nextWave };
    setDailyRotation(nextRotation);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('fm_daily_rotation', JSON.stringify(nextRotation));
    }
    toast.success('Fresh quests loaded');
  }, [dailyRotation.wave, buildRotation]);

  useEffect(() => {
    if (!dailyRotation.date) return;
    setCompletedQuests((prev) => {
      const activePrefix = `daily:${dailyRotation.date}:`;
      let changed = false;
      const clone = { ...prev };
      Object.keys(clone).forEach((key) => {
        if (key.startsWith('daily:') && !key.startsWith(activePrefix)) {
          delete clone[key];
          changed = true;
        }
      });
      return changed ? clone : prev;
    });
  }, [dailyRotation.date]);

  const handleCompleteDailyTask = useCallback(
    (task) => {
      if (!task) return;
      const wave = dailyRotation.wave ?? 0;
      const dateKey = dailyRotation.date || new Date().toISOString().slice(0, 10);
      const completionKey = `daily:${dateKey}:wave${wave}:${task.id}`;
      let alreadyLogged = false;
      setCompletedQuests((prev) => {
        if (prev[completionKey]) {
          alreadyLogged = true;
          return prev;
        }
        return {
          ...prev,
          [completionKey]: true,
        };
      });
      if (alreadyLogged) {
        return;
      }
      awardPoints(task.points, `Daily reward • ${task.title}`, {
        type: 'daily_reward',
        taskId: task.id,
        wave,
        date: dateKey,
      });
    },
    [dailyRotation.date, dailyRotation.wave, awardPoints]
  );

  useEffect(() => {
    const computed = computeLevelValue(points);
    if (computed !== level) {
      setLevel(computed);
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('fm_points', String(points ?? 0));
      window.localStorage.setItem('fm_level', String(computed));
    }
  }, [points, level, computeLevelValue]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('fm_redeemed_leads', String(redeemedLeads ?? 0));
    }
  }, [redeemedLeads]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('fm_point_history', JSON.stringify(pointHistory));
    }
  }, [pointHistory]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('fm_completed_quests', JSON.stringify(completedQuests));
    }
  }, [completedQuests]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('fm_login_streak', String(streak ?? 0));
    }
  }, [streak]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('fm_wallet_balance', String(walletBalance ?? 0));
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
      } else if (diffDays === 0) {
        nextStreak = streak || 1;
      } else {
        nextStreak = 1;
      }
    } else if (streak > 1) {
      nextStreak = streak;
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
    const handleBillingSync = () => {
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
      window.addEventListener('fm-billing-refresh', handleBillingSync);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('fm-billing-refresh', handleBillingSync);
      }
    };
  }, [defaultCreditBuckets, defaultUsageRules]);

  useEffect(() => {
    (async () => {
      try {
        const profile = await businessProfileService.load();
        if (profile) setBusinessProfile((prev) => ({ ...prev, ...profile }));
      } catch (error) {
        console.error('Error loading business profile:', error);
      }
    })();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const validTabs = new Set(tabs.map((tab) => tab.id));
    const target = window.localStorage.getItem('fm_settings_target_tab');
    if (target && validTabs.has(target)) {
      setActiveTab(target);
      window.localStorage.removeItem('fm_settings_target_tab');
      return;
    }
    const last = window.localStorage.getItem('fm_settings_last_tab');
    if (last && validTabs.has(last)) {
      setActiveTab(last);
    }
  }, [tabs]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('fm_settings_last_tab', activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'rewards') {
      openWalletRewards('wallet');
    }
  }, [activeTab, openWalletRewards]);


  const saveBusinessProfile = async () => {
    try {
      setLoading(true);
      await businessProfileService.save(businessProfile);
      toast.success('Business profile saved successfully!');
    } catch (error) {
      toast.error('Failed to save business profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let totalFields = 0;
    let completedFields = 0;

    const countFields = (obj) => {
      Object.values(obj).forEach((value) => {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          countFields(value);
        } else {
          totalFields += 1;
          if (Array.isArray(value) ? value.length > 0 : value) {
            completedFields += 1;
          }
        }
      });
    };

    countFields(businessProfile);
    const score = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;
    setCompletionScore(score);
  }, [businessProfile]);

  const scrapeWebsite = async (url) => {
    if (!url) return;
    
    setWebsiteScraping(true);
    try {
      // Mock website scraping - in real app this would call your AI service
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const scrapedData = {
        company: {
          name: "Elite Roofing Solutions",
          tagline: "Excellence Above, Protection Below",
          phone: "(555) 123-4567",
          email: "info@eliteroofing.com",
          yearsInBusiness: "15",
          serviceRadius: "50 miles"
        },
        services: {
          primaryServices: ["Roof Replacement", "Storm Damage Repair", "Gutter Installation"],
          specialties: ["Metal Roofing", "Tile Restoration", "Emergency Repairs"],
          certifications: ["GAF Master Elite", "CertainTeed ShingleMaster"]
        },
        branding: {
          valuePropositions: [
            "15+ years of trusted service",
            "100% satisfaction guarantee",
            "Licensed & fully insured"
          ]
        }
      };

      setBusinessProfile(prev => ({
        ...prev,
        ...scrapedData,
        company: { ...prev.company, ...scrapedData.company },
        services: { ...prev.services, ...scrapedData.services },
        branding: { ...prev.branding, ...scrapedData.branding }
      }));

      toast.success('Website data imported successfully!');
    } catch (error) {
      toast.error('Failed to scrape website data');
    } finally {
      setWebsiteScraping(false);
    }
  };

  const handleInputChange = (section, field, value) => {
    setBusinessProfile(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleNestedInputChange = (section, subsection, field, value) => {
    setBusinessProfile(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subsection]: {
          ...prev[section][subsection],
          [field]: value
        }
      }
    }));
  };

  const addArrayItem = (section, field, item) => {
    setBusinessProfile(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: [...(prev[section][field] || []), item]
      }
    }));
  };

  const removeArrayItem = (section, field, index) => {
    setBusinessProfile(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: prev[section][field].filter((_, i) => i !== index)
      }
    }));
  };

  const uploadFile = async (file, section, field) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/uploads', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();
      handleInputChange(section, field, data.url);
      toast.success('File uploaded successfully');
    } catch (error) {
      toast.error('File upload failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <div className="inline-flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">🏗️</div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Business Profile</h1>
                  <p className="text-sm text-slate-500">Set up your brand, portfolio, and AI messaging</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <CompletionIndicator score={completionScore} />
              <button
                onClick={saveBusinessProfile}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 text-white rounded-xl shadow-lg transition"
              >
                {loading ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white/90 dark:bg-slate-900/70 backdrop-blur-sm border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 overflow-x-auto py-4">
            {tabs.map((tab) => (
              <TabButton
                key={tab.id}
                tab={tab}
                isActive={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {activeTab === 'company' && (
          <CompanyInfoSection
            data={businessProfile.company}
            onChange={(field, value) => handleInputChange('company', field, value)}
            onWebsiteScrape={scrapeWebsite}
            scraping={websiteScraping}
          />
        )}
        {activeTab === 'branding' && (
          <BrandingSection
            data={businessProfile.branding}
            onChange={(field, value) => handleInputChange('branding', field, value)}
            onUpload={(file) => uploadFile(file, 'branding', 'logo')}
          />
        )}
        {activeTab === 'services' && (
          <ServicesSection
            data={businessProfile.services}
            onChange={(field, value) => handleInputChange('services', field, value)}
            onNestedChange={(subsection, field, value) => handleNestedInputChange('services', subsection, field, value)}
            onAddItem={(field, item) => addArrayItem('services', field, item)}
            onRemoveItem={(field, index) => removeArrayItem('services', field, index)}
          />
        )}
        {activeTab === 'portfolio' && (
          <PortfolioSection
            data={businessProfile.caseStudies}
            onChange={(field, value) => handleInputChange('caseStudies', field, value)}
            onAddItem={(field, item) => addArrayItem('caseStudies', field, item)}
            onRemoveItem={(field, index) => removeArrayItem('caseStudies', field, index)}
          />
        )}
        {activeTab === 'messaging' && (
          <AIMessagingSection
            data={businessProfile.aiAgent}
            onChange={(field, value) => handleInputChange('aiAgent', field, value)}
            onAddItem={(field, item) => addArrayItem('aiAgent', field, item)}
            onRemoveItem={(field, index) => removeArrayItem('aiAgent', field, index)}
            businessData={businessProfile}
          />
        )}
        {activeTab === 'integrations' && (
          <IntegrationsSection
            data={businessProfile.integrations}
            onChange={(field, value) => handleInputChange('integrations', field, value)}
            onNestedChange={(subsection, field, value) => handleNestedInputChange('integrations', subsection, field, value)}
          />
        )}
        {activeTab === 'rewards' && (
          <RewardsSection
            points={points}
            level={level}
            streak={streak}
            redeemedLeads={redeemedLeads}
            pointsPerLead={POINTS_PER_LEAD}
            levelStep={LEVEL_STEP_POINTS}
            pointHistory={pointHistory}
            dailyRotation={dailyRotation}
            completedQuests={completedQuests}
            onCompleteTask={handleCompleteDailyTask}
            onRefreshDailyTasks={refreshDailyRotation}
            onRedeem={handleRedeemLeadCredit}
            walletBalance={walletBalance}
            creditBuckets={creditBuckets}
            usageRules={usageRules}
            pricing={CREDIT_PRICING}
            onAllocateCredits={handleAllocateCredits}
            onSimulateUsage={handleSimulateUsage}
            onToggleUsage={handleToggleUsageRule}
            onStartCheckout={handleStripeCheckout}
            onOpenLedger={() => setShowRewardsModal(true)}
          />
        )}
      </main>

      {/* Preview Mode */}
      {previewMode && (
        <BrandPreview
          businessProfile={businessProfile}
          onClose={() => setPreviewMode(false)}
        />
      )}
      {showRewardsModal && (
        <PointsLedgerModal
          onClose={() => setShowRewardsModal(false)}
          points={points}
          pointsPerLead={POINTS_PER_LEAD}
          redeemedLeads={redeemedLeads}
          onRedeem={handleRedeemLeadCredit}
          pointHistory={pointHistory}
          streak={streak}
        />
      )}
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
          dailyRotation={dailyRotation}
          completedQuests={completedQuests}
          usageRules={usageRules}
          creditBuckets={creditBuckets}
          pricing={CREDIT_PRICING}
          nextLevelPoints={level * LEVEL_STEP_POINTS}
          levelProgress={Math.min(100, Math.round(((points - (level - 1) * LEVEL_STEP_POINTS) / LEVEL_STEP_POINTS) * 100))}
          onStripeTopUp={handleStripeCheckout}
          onRedeemLead={handleRedeemLeadCredit}
          onCompleteTask={handleCompleteDailyTask}
          onRefreshDailyTasks={refreshDailyRotation}
          onToggleAutoSpend={handleToggleUsageRule}
          onAllocateCredits={handleAllocateCredits}
          onExchangePoints={handleExchangePointsForCredits}
          onOpenLedger={() => setShowRewardsModal(true)}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
};

const RewardsSection = ({
  points = 0,
  level = 1,
  streak = 0,
  redeemedLeads = 0,
  pointsPerLead = POINTS_PER_LEAD,
  levelStep = LEVEL_STEP_POINTS,
  pointHistory = [],
  dailyRotation = { tasks: [], wave: 0, date: '' },
  completedQuests = {},
  onCompleteTask,
  onRefreshDailyTasks,
  onRedeem,
  walletBalance = 0,
  creditBuckets = {},
  usageRules = {},
  pricing = CREDIT_PRICING,
  onAllocateCredits,
  onSimulateUsage,
  onToggleUsage,
  onStartCheckout,
  onOpenLedger,
}) => {
  const safePoints = points ?? 0;
  const safeLevel = Math.max(level || 1, 1);
  const levelStart = Math.max(0, (safeLevel - 1) * levelStep);
  const pointsIntoLevel = Math.max(0, safePoints - levelStart);
  const levelProgress = Math.min(100, Math.round((pointsIntoLevel / levelStep) * 100));
  const pointsToNext = Math.max(safeLevel * levelStep - safePoints, 0);
  const nextLeadMilestone = [10, 20].find((threshold) => redeemedLeads < threshold);
  const wave = dailyRotation?.wave ?? 0;
  const dateKey = dailyRotation?.date || new Date().toISOString().slice(0, 10);
  const tasks = Array.isArray(dailyRotation?.tasks) ? dailyRotation.tasks : [];
  const completedCount = tasks.filter((task) => completedQuests[`daily:${dateKey}:wave${wave}:${task.id}`]).length;
  const taskProgress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
  const canRefresh =
    typeof onRefreshDailyTasks === 'function' && tasks.length > 0 && completedCount === tasks.length;
  const recentHistory = (pointHistory || []).slice(0, 6);
  const daysToWeekly = streak > 0 ? (streak % 7 === 0 ? 0 : 7 - (streak % 7)) : 7;
  const safeWallet = Number(walletBalance ?? 0);
  const leadCredits = Math.max(0, Math.floor(safePoints / pointsPerLead));
  const creditChannels = ['voice', 'sms', 'email', 'scans', 'leads'];

  const premiumGuides = [
    {
      id: 'smartscan',
      threshold: 10,
      title: 'SmartScan accelerator',
      description:
        'After 10 free leads, each SmartScan fuels full roof intelligence overlays and bonus XP.',
      icon: Camera,
      reward: '+85 pts per scan',
      cost: '$4.50 per scan',
    },
    {
      id: 'voice-burst',
      threshold: 10,
      title: 'AI voice agent burst',
      description:
        'Queue a 5-call AI burst to revive prospects. Usage is billed, but levels jump faster.',
      icon: Phone,
      reward: '+90 pts per burst',
      cost: '$0.45 per connected call',
    },
    {
      id: 'email-surge',
      threshold: 20,
      title: 'Omni email surge',
      description:
        'Send 25 AI-personalized emails to storm clusters and stack compounding engagement rewards.',
      icon: Mail,
      reward: '+75 pts per surge',
      cost: '$0.09 per email send',
    },
  ].map((guide) => {
    const unlocked = redeemedLeads >= guide.threshold;
    const doneToday = pointHistory.some(
      (entry) => entry?.taskId === guide.id && entry?.date === dateKey
    );
    const lastLogged = pointHistory.find((entry) => entry?.taskId === guide.id);
    const status = !unlocked ? 'locked' : doneToday ? 'complete' : 'active';
    return { ...guide, unlocked, status, lastLogged };
  });

  const handleComplete = (task) => {
    if (typeof onCompleteTask === 'function') {
      onCompleteTask(task);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
        <RewardSummaryCard
          icon={Sparkles}
          label="Points balance"
          value={`${safePoints.toLocaleString()} pts`}
          subLabel={`Redeem ${pointsPerLead.toLocaleString()} pts for one lead credit`}
          accent="from-indigo-500 to-blue-500"
          action={
            <button
              type="button"
              onClick={onRedeem}
              disabled={safePoints < pointsPerLead}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                safePoints >= pointsPerLead
                  ? 'bg-blue-600 text-white hover:bg-blue-50 dark:bg-blue-500/200'
                  : 'bg-slate-200 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Gift className="w-4 h-4" />
              Redeem free lead
            </button>
          }
        />
        <RewardSummaryCard
          icon={Wallet}
          label="Wallet balance"
          value={`$${safeWallet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subLabel="Keep funds loaded to auto-spend on premium actions"
          accent="from-blue-500 to-cyan-500"
        />
        <RewardSummaryCard
          icon={Trophy}
          label="Program level"
          value={`Level ${safeLevel}`}
          subLabel={
            pointsToNext > 0
              ? `${levelProgress}% toward Level ${safeLevel + 1}`
              : 'Legend status unlocked'
          }
          accent="from-amber-500 to-rose-500"
          progress={Math.min(levelProgress, 100)}
          progressLabel={
            pointsToNext > 0
              ? `${pointsToNext.toLocaleString()} pts to next level`
              : 'Max level reached'
          }
        />
        <RewardSummaryCard
          icon={Gift}
          label="Lead credits"
          value={`${leadCredits.toLocaleString()} live`}
          subLabel={
            nextLeadMilestone
              ? `${nextLeadMilestone - redeemedLeads} more redemptions to unlock premium boosts`
              : `${redeemedLeads.toLocaleString()} leads redeemed all-time`
          }
          accent="from-emerald-500 to-teal-500"
        />
        <RewardSummaryCard
          icon={Zap}
          label="Daily streak"
          value={`${streak} day${streak === 1 ? '' : 's'}`}
          subLabel={
            daysToWeekly === 0
              ? 'Weekly bonus unlocked today'
              : `${daysToWeekly} day${daysToWeekly === 1 ? '' : 's'} until weekly bonus`
          }
          accent="from-purple-500 to-violet-500"
        />
    </div>

      <WalletTopUpPanel walletBalance={safeWallet} onStripeCheckout={onStartCheckout} />

      <div className="bg-white dark:bg-slate-900/70/70 backdrop-blur-sm border border-slate-200/60 shadow-xl rounded-3xl p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-500" />
              {`Daily reward rotation · Wave ${wave + 1}`}
            </p>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">Keep the points flowing</h2>
            <p className="text-sm text-slate-500">
              Clear these quests to trigger fresh opportunities. We refresh the lineup whenever you
              finish a wave.
            </p>
          </div>
          <div className="w-full md:w-56">
            <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all"
                style={{ width: `${taskProgress}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {tasks.length
                ? `${completedCount}/${tasks.length} complete • ${taskProgress}%`
                : 'Build momentum to unlock daily quests'}
            </p>
          </div>
      </div>

      <div className="space-y-4">
        {tasks.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white dark:bg-slate-900/70/60 p-6 text-sm text-slate-500">
            Build your profile and redeem a few free leads to unlock daily quests.
          </div>
        )}
        {tasks.map((task) => {
          const completionKey = `daily:${dateKey}:wave${wave}:${task.id}`;
          const completed = Boolean(completedQuests[completionKey]);
          return (
            <DailyTaskCard key={completionKey} task={task} completed={completed} onComplete={handleComplete} />
          );
        })}
      </div>

      {canRefresh && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-t border-slate-200/60 pt-4">
          <p className="text-sm text-slate-500">
            All wave {wave + 1} quests are logged. Drop a fresh set to keep earning today.
          </p>
          <button
            type="button"
            onClick={onRefreshDailyTasks}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-50 dark:bg-blue-500/200 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Drop new quests
          </button>
        </div>
      )}
    </div>

    <div className="bg-white dark:bg-slate-900/70/75 backdrop-blur-sm border border-slate-200/60 shadow-xl rounded-3xl p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-blue-500" />
            Credit routing & automation
          </p>
          <h3 className="text-xl font-semibold text-slate-900 mt-1">Control where wallet funds flow</h3>
          <p className="text-sm text-slate-500">
            Toggle auto-spend and convert dollars into feature credits. Every action bills at a 4× ROI markup so your ops stay profitable.
          </p>
        </div>
        <div className="text-sm text-slate-500">
          <div className="font-semibold text-slate-900">${safeWallet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="text-xs">Current wallet balance</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {creditChannels.map((channel) => {
          const config = pricing?.[channel] || {};
          const balance = creditBuckets?.[channel] ?? 0;
          const enabled = usageRules?.[channel] ?? false;
          return (
            <CreditControlCard
              key={channel}
              channel={channel}
              config={config}
              balance={balance}
              enabled={enabled}
              walletBalance={safeWallet}
              onAllocate={onAllocateCredits}
              onSpend={onSimulateUsage}
              onToggle={onToggleUsage}
            />
          );
        })}
      </div>
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {premiumGuides.map((guide) => (
        <PremiumMilestoneCard key={guide.id} {...guide} />
      ))}
      </div>

      <div className="bg-white dark:bg-slate-900/70/70 backdrop-blur-sm border border-slate-200/60 shadow-xl rounded-3xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Points activity
            </p>
            <h3 className="text-xl font-semibold text-slate-900 mt-1">Ledger preview</h3>
            <p className="text-sm text-slate-500">
              Track how quests, premium actions, and redemptions influence your balance.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenLedger}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition"
          >
            <ArrowRight className="w-4 h-4" />
            Open full ledger
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {recentHistory.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white dark:bg-slate-900/70/60 p-6 text-sm text-slate-500">
              No reward activity yet. Complete quests or run premium automations to start filling the ledger.
            </div>
          )}
          {recentHistory.map((entry, index) => (
            <RewardHistoryRow key={`${entry.timestamp}-${index}`} entry={entry} />
          ))}
        </div>
      </div>
    </div>
  );
};

const RewardSummaryCard = ({ icon: Icon, label, value, subLabel, accent, progress, progressLabel, action }) => (
  <div className="bg-white dark:bg-slate-900/70/70 backdrop-blur-sm border border-slate-200/60 shadow-xl rounded-2xl p-5 flex flex-col gap-4">
    <div className="flex items-center gap-3">
      <div className={`w-11 h-11 flex items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
    {subLabel && <p className="text-sm text-slate-500">{subLabel}</p>}
    {typeof progress === 'number' && (
      <div>
        <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-500 transition-all"
            style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }}
          />
        </div>
        {progressLabel && <p className="text-xs text-slate-500 mt-2">{progressLabel}</p>}
      </div>
    )}
    {action}
  </div>
);

const DailyTaskCard = ({ task, completed, onComplete }) => {
  const Icon = task.icon || Sparkles;
  return (
    <div
      className={`flex flex-col md:flex-row md:items-center gap-4 rounded-2xl border px-4 py-4 transition ${
        completed
          ? 'border-emerald-200 bg-emerald-50'
          : task.requiresPurchase
          ? 'border-violet-200 bg-violet-50/60'
          : 'border-slate-200 bg-white dark:bg-slate-900/70/80'
      }`}
    >
      <div className="flex items-start gap-4 flex-1 min-w-0">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center ${
            completed
              ? 'bg-emerald-500 text-white'
              : task.requiresPurchase
              ? 'bg-violet-500 text-white'
              : 'bg-blue-50 dark:bg-blue-500/200 text-white'
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{task.title}</p>
          <p className="text-xs text-slate-500">{task.description}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-300">
              <Sparkles className="w-3 h-3" />
              +{task.points} pts
            </span>
            {task.requiresPurchase && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-violet-700">
                {task.billing || 'Premium usage billed per action'}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onComplete?.(task)}
          disabled={completed}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            completed
              ? 'bg-emerald-100 text-emerald-600 cursor-default'
              : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          {completed ? 'Completed' : task.actionLabel || 'Log completion'}
        </button>
      </div>
    </div>
  );
};

const PremiumMilestoneCard = ({ icon: Icon, title, description, reward, cost, threshold, status, lastLogged }) => {
  const statusStyles = {
    locked: 'bg-slate-100 text-slate-600 border-slate-200',
    active: 'bg-violet-100 text-violet-700 border-violet-200',
    complete: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };

  const statusLabel =
    status === 'locked'
      ? `Unlocks at ${threshold} free leads`
      : status === 'complete'
      ? 'Logged today – keep going'
      : 'Premium quest ready';

  const lastLoggedLabel = lastLogged?.timestamp
    ? `Last logged ${new Date(lastLogged.timestamp).toLocaleString()}`
    : 'No premium usage logged yet';

  return (
    <div className="bg-white dark:bg-slate-900/70/70 backdrop-blur-sm border border-slate-200/60 shadow-xl rounded-3xl p-6 space-y-4">
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        <span
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${statusStyles[status]}`}
        >
          <Shield className="w-3 h-3" />
          {statusLabel}
        </span>
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-700">
          <Sparkles className="w-3 h-3" />
          {reward}
        </span>
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-600">
          {cost}
        </span>
      </div>
      <p className="text-xs text-slate-400">{status === 'locked' ? `Redeem ${threshold} free leads to activate premium quests.` : lastLoggedLabel}</p>
    </div>
  );
};

const RewardHistoryRow = ({ entry }) => {
  if (!entry) return null;
  const amount = Number(entry.amount ?? 0);
  const isPositive = amount >= 0;
  const timestamp = entry.timestamp ? new Date(entry.timestamp) : null;
  const label = entry.reason || entry.type || 'Reward update';
  const timestampLabel = timestamp ? timestamp.toLocaleString() : 'Recently';

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white dark:bg-slate-900/70/80 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">{label}</p>
        <p className="text-xs text-slate-500">{timestampLabel}</p>
      </div>
      <span
        className={`text-sm font-semibold ${
          isPositive ? 'text-emerald-600' : 'text-rose-600'
        }`}
      >
        {isPositive ? '+' : ''}
        {amount}
      </span>
    </div>
  );
};

const WalletTopUpPanel = ({ walletBalance = 0, onStripeCheckout }) => {
  const presetAmounts = [100, 250, 500, 750, 1000];
  const [selectedAmount, setSelectedAmount] = useState(presetAmounts[1]);
  const [customAmount, setCustomAmount] = useState('');

  const activeAmount = customAmount !== '' ? Number(customAmount) : selectedAmount;
  const isValidAmount = Number.isFinite(activeAmount) && activeAmount > 0;

  const handleStripeCheckoutClick = () => {
    if (!isValidAmount) {
      toast.error('Choose a valid amount to purchase.');
      return;
    }
    onStripeCheckout?.(activeAmount);
  };

  return (
    <div className="bg-white dark:bg-slate-900/70/85 backdrop-blur-sm border border-slate-200 shadow-xl rounded-3xl p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 flex items-center gap-2">
            <Coins className="w-4 h-4" />
            Wallet funding
          </p>
          <h3 className="text-xl font-semibold text-slate-900 mt-1">Stripe wallet reload</h3>
          <p className="text-sm text-slate-500">
            Select a preset or enter a custom amount. Stripe processes payment immediately and balances refresh within seconds.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-slate-400">Current balance</p>
          <p className="text-2xl font-bold text-slate-900">${walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {presetAmounts.map((amount) => {
          const isActive = customAmount === '' && selectedAmount === amount;
          return (
            <button
              key={`wallet-preset-${amount}`}
              type="button"
              onClick={() => {
                setSelectedAmount(amount);
                setCustomAmount('');
              }}
              className={`rounded-2xl border px-4 py-3 text-lg font-semibold transition ${
                isActive
                  ? 'border-slate-900 bg-slate-900 text-white shadow shadow-slate-300/50'
                  : 'border-slate-200 bg-white dark:bg-slate-900/70 text-slate-600 hover:border-slate-400 hover:text-slate-900'
              }`}
            >
              ${amount}
            </button>
          );
        })}
        <div className="col-span-2 sm:col-span-4 lg:col-span-2 rounded-2xl border border-slate-200 bg-white dark:bg-slate-900/70 p-4">
          <label className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Custom amount</label>
          <div className="mt-2 flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input
                type="number"
                min="1"
                step="1"
                value={customAmount}
                onChange={(event) => {
                  setCustomAmount(event.target.value);
                  setSelectedAmount(null);
                }}
                placeholder="Enter amount"
                className="w-full rounded-xl border border-slate-200 pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <button
              type="button"
              onClick={() => setCustomAmount('')}
              className="text-xs font-semibold text-slate-400 hover:text-slate-900"
            >
              Clear
            </button>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Recommended: preload $50+ to keep SmartScans and AI outreach running without interruption.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <button
          type="button"
          onClick={handleStripeCheckoutClick}
          className="rounded-2xl border border-slate-900/15 bg-slate-900 px-4 py-5 text-left text-white hover:bg-slate-800 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">Proceed to Stripe checkout</span>
            <Sparkles className="w-4 h-4" />
          </div>
          <p className="text-xs text-slate-200/90 mt-2">Secure payment window. Wallet balance refreshes seconds after confirmation.</p>
          <p className="mt-3 text-sm font-semibold">${isValidAmount ? activeAmount.toFixed(2) : '0.00'}</p>
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900/70/85 px-4 py-4 text-xs text-slate-600 space-y-2">
        <p className="font-semibold text-slate-700">Automatic usage billing</p>
        <p>Wallet funds route to voice, SMS, email, SmartScans, and paid lead unlocks based on the channel toggles below. Adjust limits anytime—Stripe reloads keep campaigns running without manual intervention.</p>
        <p>Lead quality reviews credit back unresponsive contacts and issue two replacement hot leads automatically, ensuring spend always maps to actionable opportunities.</p>
      </div>
    </div>
  );
};

const CreditControlCard = ({
  channel,
  config = {},
  balance = 0,
  enabled = false,
  walletBalance = 0,
  onAllocate,
  onSpend,
  onToggle,
}) => {
  const label = config.label || channel;
  const cost = Number(config.cost ?? 0);
  const apiCost = Number(config.apiCost ?? 0);
  const unit = config.unit || 'unit';
  const markup = apiCost > 0 ? (cost / apiCost).toFixed(1) : '4.0';
  const ToggleIcon = enabled ? ToggleRight : ToggleLeft;

  const allocate = () => onAllocate?.(channel, 10);
  const spend = () => onSpend?.(channel, 1);
  const toggle = () => onToggle?.(channel);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70/75 dark:bg-slate-900/70 p-5 space-y-4 text-slate-900 dark:text-slate-100">
      <div>
        <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 dark:text-slate-400">{label}</p>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{balance.toLocaleString()}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">{unit}{balance === 1 ? '' : 's'} ready</span>
        </div>
      </div>
      <div
        className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-semibold transition ${
          enabled
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/20 dark:border-emerald-400/40 dark:text-emerald-200'
            : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-900/60 dark:border-slate-700 dark:text-slate-300'
        }`}
      >
        <span>Auto charge {enabled ? 'on' : 'off'}</span>
        <button
          type="button"
          onClick={toggle}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border transition ${
            enabled
              ? 'bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-400'
              : 'bg-white dark:bg-slate-900/70 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
          aria-pressed={enabled}
        >
          <ToggleIcon className="w-4 h-4" />
          <span>{enabled ? 'On' : 'Off'}</span>
        </button>
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
        <p>${cost.toFixed(2)} per {unit} • API cost ${apiCost.toFixed(2)} · {markup}× margin</p>
        <p className="text-slate-400 dark:text-slate-500">Wallet ${walletBalance.toFixed(2)} available for conversions</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={allocate}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition"
        >
          <Coins className="w-3.5 h-3.5" />
          Convert $ {(cost * 10).toFixed(2)}
        </button>
        <button
          type="button"
          onClick={spend}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Log 1 {unit}
        </button>
      </div>
      {channel === 'leads' && (
        <p className="text-[11px] text-emerald-600/90">
          Systematic hot leads only. Approved quality reviews auto-credit two replacements instantly.
        </p>
      )}
    </div>
  );
};


// Completion Indicator Component
const CompletionIndicator = ({ score }) => (
  <div className="flex items-center space-x-3">
    <div className="relative w-12 h-12">
      <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="40"
          stroke="#e2e8f0"
          strokeWidth="8"
          fill="none"
        />
        <circle
          cx="50"
          cy="50"
          r="40"
          stroke="#3b82f6"
          strokeWidth="8"
          fill="none"
          strokeDasharray={`${score * 2.51} 251`}
          className="transition-all duration-300"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-slate-900">{score}%</span>
      </div>
    </div>
    <div>
      <div className="text-sm font-medium text-slate-900">Profile Complete</div>
      <div className="text-xs text-slate-500">
        {score >= 80 ? 'Ready to launch!' : score >= 50 ? 'Almost there' : 'Getting started'}
      </div>
    </div>
  </div>
);

// Tab Button Component
const TabButton = ({ tab, isActive, onClick }) => {
  const colors = {
    blue: isActive ? 'bg-blue-100 text-blue-700 border-blue-200' : 'text-slate-600 hover:text-blue-600 dark:text-blue-300',
    purple: isActive ? 'bg-purple-100 text-purple-700 border-purple-200' : 'text-slate-600 hover:text-purple-600',
    emerald: isActive ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'text-slate-600 hover:text-emerald-600',
    amber: isActive ? 'bg-amber-100 text-amber-700 border-amber-200' : 'text-slate-600 hover:text-amber-600 dark:text-amber-300',
    rose: isActive ? 'bg-rose-100 text-rose-700 border-rose-200' : 'text-slate-600 hover:text-rose-600',
    cyan: isActive ? 'bg-cyan-100 text-cyan-700 border-cyan-200' : 'text-slate-600 hover:text-cyan-600'
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-2 px-6 py-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap border ${
        isActive ? `border ${colors[tab.color]}` : 'border-transparent hover:bg-slate-100'
      }`}
    >
      <tab.icon size={16} />
      <span>{tab.label}</span>
    </button>
  );
};

// Company Info Section Component
const CompanyInfoSection = ({ data, onChange, onWebsiteScrape, scraping }) => {
  const [websiteUrl, setWebsiteUrl] = useState('');

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900/70/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Company Information</h2>
            <p className="text-slate-600">Basic details about your business</p>
          </div>
          <div className="flex items-center space-x-3">
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="Enter website URL to auto-fill"
              className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() => onWebsiteScrape(websiteUrl)}
              disabled={scraping || !websiteUrl}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {scraping ? <Loader size={16} className="animate-spin" /> : <Globe size={16} />}
              <span>Auto-Fill</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Company Name"
            required
            value={data.name}
            onChange={(value) => onChange('name', value)}
            placeholder="Elite Roofing Solutions"
          />
          <FormField
            label="Business Tagline"
            value={data.tagline}
            onChange={(value) => onChange('tagline', value)}
            placeholder="Excellence Above, Protection Below"
          />
          <FormField
            label="Phone Number"
            required
            type="tel"
            value={data.phone}
            onChange={(value) => onChange('phone', value)}
            placeholder="(555) 123-4567"
          />
          <FormField
            label="Email Address"
            required
            type="email"
            value={data.email}
            onChange={(value) => onChange('email', value)}
            placeholder="info@company.com"
          />
          <FormField
            label="Business Address"
            value={data.address}
            onChange={(value) => onChange('address', value)}
            placeholder="123 Main St, City, State 12345"
            className="md:col-span-2"
          />
          <FormField
            label="Website URL"
            type="url"
            value={data.website}
            onChange={(value) => onChange('website', value)}
            placeholder="https://www.company.com"
          />
          <FormField
            label="Years in Business"
            type="number"
            value={data.yearsInBusiness}
            onChange={(value) => onChange('yearsInBusiness', value)}
            placeholder="15"
          />
          <FormField
            label="License Number"
            value={data.licenseNumber}
            onChange={(value) => onChange('licenseNumber', value)}
            placeholder="RC-123456"
          />
          <FormField
            label="Service Radius"
            value={data.serviceRadius}
            onChange={(value) => onChange('serviceRadius', value)}
            placeholder="50 miles"
          />
        </div>
      </div>
    </div>
  );
};

// Branding Section Component
const BrandingSection = ({ data, onChange, onUpload }) => (
  <div className="space-y-6">
    <div className="bg-white dark:bg-slate-900/70/70 backdrop-blur-sm rounded-3xl border border-slate-200/60 shadow-xl p-6">
      <div className="flex items-center justify-between mb-6">
          <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Brand & Design</h2>
          <p className="text-slate-500 text-sm">Colors, logo, and personality used throughout the app</p>
            </div>
          </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200 p-5">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Brand Colors</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ColorPicker label="Primary" value={data.primaryColor} onChange={(value) => onChange('primaryColor', value)} onExtractFromLogo={data.logo ? () => onChange('primaryColor', data.primaryColor || '#2563eb') : undefined} />
              <ColorPicker label="Secondary" value={data.secondaryColor} onChange={(value) => onChange('secondaryColor', value)} onExtractFromLogo={data.logo ? () => onChange('secondaryColor', data.secondaryColor || '#334155') : undefined} />
              <ColorPicker label="Accent" value={data.accentColor} onChange={(value) => onChange('accentColor', value)} onExtractFromLogo={data.logo ? () => onChange('accentColor', data.accentColor || '#f59e0b') : undefined} />
          </div>
          </div>
          <div className="rounded-2xl border border-slate-200 p-5">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Brand Personality</h3>
          <FormField
              label="Persona"
            type="select"
            value={data.brandPersonality}
            onChange={(value) => onChange('brandPersonality', value)}
            options={[
              { value: 'professional', label: 'Professional & Trustworthy' },
              { value: 'friendly', label: 'Friendly & Approachable' },
              { value: 'premium', label: 'Premium & Exclusive' },
              { value: 'reliable', label: 'Reliable & Dependable' }
            ]}
          />
        </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 p-5">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Logo</h3>
            <LogoUploader currentLogo={data.logo} onUpload={onUpload} />
        </div>
          <BrandPreviewCard colors={{ primary: data.primaryColor, secondary: data.secondaryColor, accent: data.accentColor }} logo={data.logo} personality={data.brandPersonality} />
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 p-5 mt-6">
        <ValuePropositionEditor propositions={data.valuePropositions} onChange={(propositions) => onChange('valuePropositions', propositions)} />
      </div>
    </div>
  </div>
);

// Services Section Component
const ServicesSection = ({ data, onChange, onNestedChange, onAddItem, onRemoveItem }) => (
  <div className="space-y-6">
    <div className="bg-white dark:bg-slate-900/70/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-xl p-6">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Services & Specialties</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <ArrayFieldEditor
            label="Primary Services"
            items={data.primaryServices}
            onAdd={(item) => onAddItem('primaryServices', item)}
            onRemove={(index) => onRemoveItem('primaryServices', index)}
            placeholder="e.g., Roof Replacement"
          />
          
          <ArrayFieldEditor
            label="Specialties"
            items={data.specialties}
            onAdd={(item) => onAddItem('specialties', item)}
            onRemove={(index) => onRemoveItem('specialties', index)}
            placeholder="e.g., Storm Damage Repair"
          />
          
          <ArrayFieldEditor
            label="Certifications"
            items={data.certifications}
            onAdd={(item) => onAddItem('certifications', item)}
            onRemove={(index) => onRemoveItem('certifications', index)}
            placeholder="e.g., GAF Master Elite"
          />
        </div>
        
        <div className="space-y-6">
          <ArrayFieldEditor
            label="Service Areas"
            items={data.serviceAreas}
            onAdd={(item) => onAddItem('serviceAreas', item)}
            onRemove={(index) => onRemoveItem('serviceAreas', index)}
            placeholder="e.g., Dallas, TX"
          />
          
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Pricing Information</h3>
            <div className="space-y-4">
              <FormField
                label="Emergency Call-Out Fee"
                value={data.pricing?.emergencyCallout || ''}
                onChange={(value) => onNestedChange('pricing', 'emergencyCallout', value)}
                placeholder="$150"
              />
              <FormField
                label="Inspection Fee"
                value={data.pricing?.inspectionFee || ''}
                onChange={(value) => onNestedChange('pricing', 'inspectionFee', value)}
                placeholder="$75"
              />
              <FormField
                label="Typical Project Range"
                value={data.pricing?.typicalProjectRange || ''}
                onChange={(value) => onNestedChange('pricing', 'typicalProjectRange', value)}
                placeholder="$8,000 - $25,000"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Portfolio Section Component
const PortfolioSection = ({ data, onChange, onAddItem, onRemoveItem }) => (
  <div className="space-y-6">
    <div className="bg-white dark:bg-slate-900/70/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-xl p-6">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Portfolio & Case Studies</h2>
      
      <div className="space-y-8">
        <CaseStudyManager
          caseStudies={data.portfolio}
          onAdd={(caseStudy) => onAddItem('portfolio', caseStudy)}
          onRemove={(index) => onRemoveItem('portfolio', index)}
        />
        
        <TestimonialManager
          testimonials={data.testimonials}
          onAdd={(testimonial) => onAddItem('testimonials', testimonial)}
          onRemove={(index) => onRemoveItem('testimonials', index)}
        />
      </div>
    </div>
  </div>
);

// AI Messaging Section Component
const AIMessagingSection = ({ data, onChange, onAddItem, onRemoveItem, businessData }) => (
  <div className="space-y-6">
    <div className="bg-white dark:bg-slate-900/70/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-xl p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
          <Bot size={20} className="text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">AI Agent Configuration</h2>
          <p className="text-slate-600">Customize your AI agent's personality and messaging</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <FormField
            label="Communication Style"
            type="select"
            value={data.communicationStyle}
            onChange={(value) => onChange('communicationStyle', value)}
            options={[
              { value: 'consultative', label: 'Consultative & Advisory' },
              { value: 'direct', label: 'Direct & To-the-Point' },
              { value: 'friendly', label: 'Friendly & Conversational' },
              { value: 'professional', label: 'Professional & Formal' }
            ]}
          />
          
          <ArrayFieldEditor
            label="Key Messaging Points"
            items={data.keyMessaging}
            onAdd={(item) => onAddItem('keyMessaging', item)}
            onRemove={(index) => onRemoveItem('keyMessaging', index)}
            placeholder="e.g., We guarantee our work for 10 years"
          />
          
          <ArrayFieldEditor
            label="Common Objection Responses"
            items={data.objectionHandling}
            onAdd={(item) => onAddItem('objectionHandling', item)}
            onRemove={(index) => onRemoveItem('objectionHandling', index)}
            placeholder="e.g., Price concern: Our quality saves money long-term"
            textarea
          />
        </div>
        
        <div className="space-y-6">
          <AIPersonalityPreview
            personality={data.personality}
            style={data.communicationStyle}
            businessData={businessData}
          />
          
          <MessageTemplateGenerator
            businessData={businessData}
            agentConfig={data}
          />
        </div>
      </div>
    </div>
  </div>
);

// Integrations Section Component
const IntegrationsSection = ({ data, onChange, onNestedChange }) => (
  <div className="space-y-6">
    <div className="bg-white dark:bg-slate-900/70/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-xl p-6">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Integrations & Connections</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <FormField
            label="Calendar Booking Link"
            value={data.calendarLink}
            onChange={(value) => onChange('calendarLink', value)}
            placeholder="https://calendly.com/your-calendar"
          />
          
          <FormField
            label="CRM System"
            type="select"
            value={data.crmSystem}
            onChange={(value) => onChange('crmSystem', value)}
            options={[
              { value: '', label: 'Select CRM...' },
              { value: 'salesforce', label: 'Salesforce' },
              { value: 'hubspot', label: 'HubSpot' },
              { value: 'pipedrive', label: 'Pipedrive' },
              { value: 'custom', label: 'Custom/Other' }
            ]}
          />
        </div>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Social Media</h3>
            <div className="space-y-3">
              <FormField
                label="Facebook"
                value={data.socialMedia?.facebook || ''}
                onChange={(value) => onNestedChange('socialMedia', 'facebook', value)}
                placeholder="https://facebook.com/yourpage"
              />
              <FormField
                label="Instagram"
                value={data.socialMedia?.instagram || ''}
                onChange={(value) => onNestedChange('socialMedia', 'instagram', value)}
                placeholder="https://instagram.com/yourhandle"
              />
              <FormField
                label="LinkedIn"
                value={data.socialMedia?.linkedin || ''}
                onChange={(value) => onNestedChange('socialMedia', 'linkedin', value)}
                placeholder="https://linkedin.com/company/yourcompany"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Utility Components
const FormField = ({ label, required, value, onChange, type = 'text', placeholder, options, className, textarea }) => (
  <div className={className}>
    <label className="block text-sm font-medium text-slate-700 mb-2">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {type === 'select' ? (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    ) : textarea ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
      />
    ) : (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
      />
    )}
  </div>
);

const ColorPicker = ({ label, value, onChange, onExtractFromLogo }) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      {onExtractFromLogo && (
        <button
          type="button"
          onClick={onExtractFromLogo}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          Use logo colors
        </button>
      )}
    </div>
    <div className="flex items-center gap-4">
      <div className="relative">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
          className="w-14 h-14 rounded-full border-2 border-slate-200 cursor-pointer"
        />
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] bg-white px-1 rounded border border-slate-200 text-slate-500">
          {value}
        </div>
      </div>
      <div className="flex gap-2">
        {["#0ea5e9", "#1e293b", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6"].map((sw) => (
          <button
            key={sw}
            onClick={() => onChange(sw)}
            type="button"
            className="w-8 h-8 rounded-full border-2 border-white shadow ring-1 ring-slate-200"
            style={{ backgroundColor: sw }}
            title={sw}
          />
        ))}
      </div>
    </div>
  </div>
);

const ArrayFieldEditor = ({ label, items, onAdd, onRemove, placeholder, textarea }) => {
  const [newItem, setNewItem] = useState('');

  const handleAdd = () => {
    if (newItem.trim()) {
      onAdd(newItem.trim());
      setNewItem('');
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-3">{label}</label>
      <div className="space-y-2 mb-3">
        {items?.map((item, index) => (
          <div key={index} className="flex items-center space-x-2 p-3 bg-slate-50 rounded-lg">
            <span className="flex-1 text-sm">{item}</span>
            <button
              onClick={() => onRemove(index)}
              className="p-1 text-red-500 hover:text-red-700 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center space-x-2">
        {textarea ? (
          <textarea
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder={placeholder}
            rows={2}
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        ) : (
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
          />
        )}
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
};

// Additional specialized components would go here...
const LogoUploader = ({ currentLogo, onUpload }) => (
  <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
    {currentLogo ? (
      <div>
        <img src={currentLogo} alt="Logo" className="h-20 mx-auto mb-4" />
        <button className="text-blue-600 dark:text-blue-300 hover:text-blue-700 text-sm">Change Logo</button>
      </div>
    ) : (
      <div>
        <Upload size={48} className="mx-auto text-slate-400 mb-4" />
        <p className="text-slate-600 mb-2">Upload your logo</p>
        <p className="text-sm text-slate-500">PNG, JPG up to 2MB</p>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => onUpload(e.target.files[0])}
          className="mt-4"
        />
      </div>
    )}
  </div>
);

// Placeholder components for complex features
const ValuePropositionEditor = ({ propositions = [], onChange }) => {
  const [value, setValue] = useState('');
  const add = () => {
    if (value.trim()) {
      onChange([...(propositions || []), value.trim()]);
      setValue('');
    }
  };
  const remove = (i) => onChange((propositions || []).filter((_, idx) => idx !== i));
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-slate-900">Value Propositions</h3>
      <div className="space-y-2">
        {(propositions || []).map((p, i) => (
          <div key={`${p}-${i}`} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
            <span className="flex-1 text-sm">{p}</span>
            <button onClick={() => remove(i)} className="p-1 text-red-500 hover:text-red-700"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g., 10-year workmanship guarantee" className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"/>
        <button onClick={add} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">Add</button>
      </div>
    </div>
  );
};

const BrandPreviewCard = ({ colors = {}, logo, personality }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4">
    <div className="flex items-center gap-3">
      {logo ? <img src={logo} alt="Logo" className="h-12 w-12 rounded-lg object-cover"/> : <div className="h-12 w-12 rounded-lg bg-slate-200"/>}
      <div>
        <div className="text-sm text-slate-500">Personality</div>
        <div className="font-semibold">{String(personality || 'professional').toUpperCase()}</div>
      </div>
    </div>
    <div className="mt-4 grid grid-cols-3 gap-2">
      {['primary','secondary','accent'].map((k) => (
        <div key={k} className="rounded-lg h-8 border" style={{ backgroundColor: colors[k] || '#e2e8f0' }} />
      ))}
    </div>
  </div>
);

const CaseStudyManager = ({ caseStudies = [], onAdd, onRemove, onChange }) => {
  const [draft, setDraft] = useState({ title: '', location: '', date: '', scope: '', challenge: '', solution: '', results: '', images: [], beforeAfter: [] });
  const addImage = async (file) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/uploads', { method: 'POST', body: form });
    if (res.ok) {
      const data = await res.json();
      setDraft((d) => ({ ...d, images: [...(d.images || []), data.url] }));
    }
  };
  const addBeforeAfter = async (beforeFile, afterFile) => {
    const upload = async (f) => {
      const form = new FormData();
      form.append('file', f);
      const r = await fetch('/api/uploads', { method: 'POST', body: form });
      return r.ok ? (await r.json()).url : '';
    };
    const beforeUrl = beforeFile ? await upload(beforeFile) : '';
    const afterUrl = afterFile ? await upload(afterFile) : '';
    setDraft((d) => ({ ...d, beforeAfter: [...(d.beforeAfter || []), { before: beforeUrl, after: afterUrl, caption: '' }] }));
  };
  const save = () => {
    if (!draft.title.trim()) return;
    onAdd({ ...draft, id: `${Date.now()}` });
    setDraft({ title: '', location: '', date: '', scope: '', challenge: '', solution: '', results: '', images: [], beforeAfter: [] });
  };
  const remove = (idx) => onRemove(idx);
  const updateField = (field, value) => setDraft((d) => ({ ...d, [field]: value }));

  const isValid = draft.title.trim().length > 0 && (draft.scope.trim().length > 0 || draft.results.trim().length > 0);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-900">Case Studies</h3>
        <button
          onClick={save}
          disabled={!isValid}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold shadow ${isValid ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}
        >
          <Plus className="w-4 h-4" /> Save Case Study
        </button>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm">
          <FormField label="Title" value={draft.title} onChange={(v) => updateField('title', v)} placeholder="Hillcrest roof replacement" />
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Location" value={draft.location} onChange={(v) => updateField('location', v)} placeholder="Austin, TX" />
            <FormField label="Date" value={draft.date} onChange={(v) => updateField('date', v)} placeholder="2025-08" />
          </div>
          <FormField label="Project scope (recommended)" textarea value={draft.scope} onChange={(v) => updateField('scope', v)} placeholder="3,200 sqft tear-off and re-shingle; GAF Timberline HDZ, ridge vent" />
          <FormField label="Challenge" textarea value={draft.challenge} onChange={(v) => updateField('challenge', v)} placeholder="Insurance claim delays; HOA style restrictions" />
          <FormField label="Solution" textarea value={draft.solution} onChange={(v) => updateField('solution', v)} placeholder="Handled adjuster meetings; sourced HOA-compliant shingle; expedited crew" />
          <FormField label="Results (recommended)" textarea value={draft.results} onChange={(v) => updateField('results', v)} placeholder="Job closed in 9 days; leak resolved; 15-year warranty; 4 referrals" />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Project Photos (optional)</label>
            <div className="flex items-center gap-3">
              <input type="file" accept="image/*" multiple onChange={(e) => Array.from(e.target.files || []).forEach(addImage)} />
            </div>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {(draft.images || []).map((url, i) => (
                <img key={`${url}-${i}`} src={url} alt="" className="h-28 w-full object-cover rounded-xl border" />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Before / After (optional)</label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <input type="file" accept="image/*" onChange={(e) => (window._ba_before = e.target.files?.[0])} />
              <span className="text-slate-400 text-sm sm:px-2">→</span>
              <input type="file" accept="image/*" onChange={(e) => (window._ba_after = e.target.files?.[0])} />
              <button type="button" onClick={() => addBeforeAfter(window._ba_before, window._ba_after)} className="px-3 py-2 text-sm bg-slate-900 text-white rounded-lg">Add Pair</button>
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              {(draft.beforeAfter || []).map((pair, i) => (
                <div key={`ba-${i}`} className="grid grid-cols-2 gap-2">
                  <img src={pair.before} alt="Before" className="h-24 w-full object-cover rounded-xl border" />
                  <img src={pair.after} alt="After" className="h-24 w-full object-cover rounded-xl border" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h4 className="font-semibold mb-2">AI‑ready summary</h4>
            <p className="text-sm text-slate-600">This content powers AI voice scripts, emails, and landing pages.</p>
            <ul className="mt-3 text-sm list-disc list-inside text-slate-700 space-y-1">
              <li>Title: {draft.title || '—'}</li>
              <li>Location: {draft.location || '—'}</li>
              <li>Highlights: {(draft.results || '').slice(0, 80) || '—'}</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h4 className="font-semibold mb-2">Portfolio</h4>
            {(caseStudies || []).length === 0 ? (
              <p className="text-sm text-slate-500">No case studies yet. Save your first on the left.</p>
            ) : (
              <div className="space-y-2">
                {(caseStudies || []).map((cs, idx) => (
                  <div key={cs.id || idx} className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{cs.title}</p>
                      <p className="text-xs text-slate-500 truncate">{cs.location} • {cs.date}</p>
                    </div>
                    <button onClick={() => onRemove(idx)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const TestimonialManager = ({ testimonials = [], onAdd, onRemove }) => {
  const [draft, setDraft] = useState({ name: '', quote: '', avatar: '' });
  const save = () => {
    if (!draft.quote.trim()) return;
    onAdd({ ...draft, id: `${Date.now()}` });
    setDraft({ name: '', quote: '', avatar: '' });
  };
  const addAvatar = async (file) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/uploads', { method: 'POST', body: form });
    if (res.ok) {
      const data = await res.json();
      setDraft((d) => ({ ...d, avatar: data.url }));
    }
  };
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-slate-900">Testimonials</h3>
      <FormField label="Customer name" value={draft.name} onChange={(v) => setDraft((d) => ({ ...d, name: v }))} placeholder="Maria Thompson" />
      <FormField label="Quote" textarea value={draft.quote} onChange={(v) => setDraft((d) => ({ ...d, quote: v }))} placeholder="They handled everything—zero stress and a beautiful roof!" />
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Avatar</label>
        <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && addAvatar(e.target.files[0])} />
        {draft.avatar && <img src={draft.avatar} alt="Avatar" className="h-12 w-12 rounded-full mt-2" />}
      </div>
      <div className="flex items-center justify-end">
        <button onClick={save} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">Add Testimonial</button>
      </div>
      <div className="space-y-2">
        {(testimonials || []).map((t, idx) => (
          <div key={t.id || idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="min-w-0 flex items-center gap-3">
              {t.avatar ? <img src={t.avatar} alt="" className="h-8 w-8 rounded-full"/> : <div className="h-8 w-8 rounded-full bg-slate-200"/>}
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{t.name || 'Customer'}</p>
                <p className="text-xs text-slate-500 truncate">{t.quote}</p>
              </div>
            </div>
            <button onClick={() => onRemove(idx)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
};

const AIPersonalityPreview = ({ personality, style, businessData }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4">
    <h4 className="font-semibold mb-2">Agent persona</h4>
    <p className="text-sm text-slate-600">
      {String(personality || 'professional').toUpperCase()} • {String(style || 'consultative').toUpperCase()}
    </p>
    <p className="text-xs text-slate-500 mt-2">This persona will guide AI voice scripts, email tone, and report copy to stay on-brand.</p>
  </div>
);

const MessageTemplateGenerator = ({ businessData, agentConfig }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4">
    <h4 className="font-semibold mb-2">Message templates</h4>
    <p className="text-sm text-slate-600">Templates will auto‑pull from case studies, testimonials, and brand propositions below.</p>
    <ul className="mt-3 text-sm list-disc list-inside text-slate-700">
      <li>Hero email: storm cluster outreach</li>
      <li>Voicemail follow‑up with case study link</li>
      <li>Inspection confirmation SMS</li>
    </ul>
  </div>
);
const BrandPreview = ({ businessProfile, onClose }) => <div>Brand Preview Modal</div>;

export default ComprehensiveBusinessSettings;
