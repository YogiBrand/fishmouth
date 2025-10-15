import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Camera,
  Check,
  Coins,
  CreditCard,
  Gift,
  Mail,
  Phone,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Trophy,
  Wallet,
  Zap,
} from 'lucide-react';

const RETAIL_LEAD_COST = 150;

const tabButtonClasses = (isActive, isDark) =>
  `flex-1 px-4 py-2 text-sm font-semibold rounded-xl transition ${
    isActive
      ? 'bg-blue-600 text-white shadow-lg shadow-blue-400/40'
      : isDark
      ? 'bg-slate-800/70 text-slate-200 hover:bg-slate-700/80'
      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
  }`;

const WalletRewardsModal = ({
  open,
  defaultTab = 'wallet',
  onClose,
  points = 0,
  level = 1,
  streak = 0,
  walletBalance = 0,
  redeemedLeads = 0,
  pointHistory = [],
  dailyRotation = { tasks: [], wave: 0, date: '' },
  completedQuests = {},
  usageRules = {},
  creditBuckets = {},
  pricing = {},
  nextLevelPoints = 0,
  levelProgress = 0,
  onStripeTopUp,
  onPlanCheckout,
  onRedeemLead,
  onCompleteTask,
  onRefreshDailyTasks,
  onToggleAutoSpend,
  onAllocateCredits,
  onExchangePoints,
  onOpenLedger,
  isDarkMode,
  promotions = [],
  selectedPromotion = null,
  onSelectPromotion,
  onLockPromotion,
  currentTimestamp = Date.now(),
  recommendedAmount = 250,
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [customAmount, setCustomAmount] = useState('');
  const [presetAmount, setPresetAmount] = useState(100);
  const [plannedUnits, setPlannedUnits] = useState({});
  const [pointConversions, setPointConversions] = useState({});
  const [lockingPromotionId, setLockingPromotionId] = useState(null);
  const resolvedIsDark =
    typeof isDarkMode === 'boolean'
      ? isDarkMode
      : typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const safePromotions = useMemo(() => (Array.isArray(promotions) ? promotions : []), [promotions]);
  const activePromotions = useMemo(
    () => safePromotions.filter((promo) => promo.status === 'active'),
    [safePromotions]
  );
  const selectedPromotionId = selectedPromotion?.id ?? null;
  const formatCountdown = (expiresAt) => {
    if (!expiresAt) return 'Limited time';
    const expires = new Date(expiresAt).getTime();
    if (Number.isNaN(expires)) return 'Limited time';
    const diff = expires - currentTimestamp;
    if (diff <= 0) return 'Expires soon';
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h remaining`;
    }
    if (hours >= 1) {
      return `${hours}h ${remainingMinutes}m remaining`;
    }
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s remaining`;
  };
  const overlayClasses = resolvedIsDark ? 'bg-slate-950/85' : 'bg-slate-900/30';
  const containerClasses = resolvedIsDark
    ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-blue-500/20 text-slate-100'
    : 'bg-white border border-slate-200 text-slate-900';
  const containerShadow = resolvedIsDark
    ? 'shadow-[0_35px_80px_rgba(24,31,55,0.55)]'
    : 'shadow-[0_35px_80px_rgba(15,23,42,0.18)]';
  const headerBarClasses = resolvedIsDark ? 'border-blue-500/20 bg-blue-500/10' : 'border-slate-200 bg-blue-50';
  const headerAccentText = resolvedIsDark ? 'text-blue-200' : 'text-blue-600';
  const headerTitleClass = resolvedIsDark ? 'text-white' : 'text-slate-900';
  const subtleTextClass = resolvedIsDark ? 'text-slate-400' : 'text-slate-500';
  const panelHeadingClass = resolvedIsDark ? 'text-slate-100' : 'text-slate-900';
  const sectionDivider = resolvedIsDark ? 'border-slate-700/60' : 'border-slate-200/60';

  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
    }
  }, [open, defaultTab]);

  useEffect(() => {
    if (!open) {
      setCustomAmount('');
      setPresetAmount(100);
      setPlannedUnits({});
      setPointConversions({});
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setPresetAmount(recommendedAmount);
    }
  }, [open, recommendedAmount]);

  useEffect(() => {
    if (!selectedPromotion || !safePromotions.length) return;
    if (!safePromotions.some((promo) => promo.id === selectedPromotion.id)) {
      onSelectPromotion?.(null);
    }
  }, [safePromotions, selectedPromotion, onSelectPromotion]);

  const PREMIUM_GUIDES = useMemo(
    () => [
      {
        id: 'smartscan',
        title: 'SmartScan accelerator',
        description: 'Auto-route aerial intelligence with annotated heatmaps.',
        icon: Camera,
        reward: '+85 pts per scan',
        cost: '$4.50 per scan',
      },
      {
        id: 'voice-burst',
        title: 'AI voice agent burst',
        description: 'Book callbacks with 5 outbound AI conversations.',
        icon: Phone,
        reward: '+90 pts per burst',
        cost: '$0.20 per minute',
      },
      {
        id: 'email-surge',
        title: 'Storm email surge',
        description: 'Send 25 AI-personalized adjuster emails to storm clusters.',
        icon: Mail,
        reward: '+75 pts per surge',
        cost: '$0.09 per email',
      },
    ],
    []
  );

  const PLAN_OPTIONS = useMemo(() => {
    const basePlans = [
      {
        id: 'builder',
        name: 'Growth Builder',
        price: 499,
        valueMultiplier: 3,
        badge: 'Most Popular',
        highlight: 'Steady outbound engine with guaranteed roofing leads every month.',
        perks: [
          '3,000 omnichannel touches each month (voice • SMS • email)',
          '15 AI-guided SmartScans & heatmaps to queue canvassing crews',
          'Weekly AI coaching briefs with outreach optimisations',
        ],
      },
      {
        id: 'scale',
        name: 'Market Scale',
        price: 1499,
        valueMultiplier: 4,
        badge: 'Crew Ready',
        highlight: 'Spin up multiple canvassing crews with guaranteed leads and automated follow-up.',
        perks: [
          '9,000 omnichannel touches/month with deliverability monitoring',
          'Unlimited SmartScan requests with MLS + permit enrichment',
          'AI voice playbooks plus automated nurture sequences',
        ],
      },
      {
        id: 'prime',
        name: 'Prime Unlimited',
        price: 2999,
        valueMultiplier: 5,
        badge: 'White Glove',
        highlight: 'Enterprise concierge guarantees high-volume leads with proactive compliance.',
        perks: [
          'Unlimited campaigns with intelligent daily compliance caps',
          'Dedicated AI analyst for playbook tuning and KPI reviews',
          'Automatic lead replacement credits when sentiment dips',
        ],
      },
    ];

    return basePlans.map((plan) => {
      const walletEquivalent = plan.price * plan.valueMultiplier;
      const planLeads = Math.max(1, Math.floor(walletEquivalent / RETAIL_LEAD_COST));
      const reloadLeads = Math.max(1, Math.floor(plan.price / RETAIL_LEAD_COST));
      return {
        ...plan,
        walletEquivalent,
        planLeads,
        reloadLeads,
      };
    });
  }, []);

  const channels = useMemo(() => Object.keys(pricing || {}), [pricing]);

  if (!open) return null;

  const safePoints = points ?? 0;
  const safeWallet = Number(walletBalance ?? 0);
  const leadCredits = Math.max(0, Math.floor(safePoints / 100));
  const dailyTasks = Array.isArray(dailyRotation?.tasks) ? dailyRotation.tasks : [];
  const wave = dailyRotation?.wave ?? 0;
  const dateKey = dailyRotation?.date || new Date().toISOString().slice(0, 10);

  const completedCount = dailyTasks.filter((task) => completedQuests[`daily:${dateKey}:wave${wave}:${task.id}`]).length;
  const taskProgress = dailyTasks.length ? Math.round((completedCount / dailyTasks.length) * 100) : 0;
  const canRefresh = dailyTasks.length > 0 && completedCount === dailyTasks.length;
  const enabledChannels = channels.filter((channel) => Boolean(usageRules?.[channel]));
  const autoSpendSummary =
    enabledChannels.length === channels.length
      ? 'Automatic billing active on every channel.'
      : `${enabledChannels.length} of ${channels.length} channels auto-funded.`;
  const totalAllocatedUnits = channels.reduce((sum, channel) => sum + (creditBuckets?.[channel] ?? 0), 0);
  const channelBreakdown = channels
    .map((channel) => `${(creditBuckets?.[channel] ?? 0).toLocaleString()} ${pricing[channel]?.unit || channel}`)
    .join(' • ');
  const manualChannels = channels.length - enabledChannels.length;

  const handleTopUp = () => {
    const amount = customAmount !== '' ? Number(customAmount) : presetAmount;
    if (!Number.isFinite(amount) || amount <= 0) return;
    if (selectedPromotion) {
      onStripeTopUp?.(amount, { promotion: selectedPromotion });
    } else {
      onStripeTopUp?.(amount);
    }
    setCustomAmount('');
    setPresetAmount(amount);
  };

  const handleApplyPromotion = async (promo) => {
    if (!promo) return;
    const suggestedAmount = Number(promo?.metadata?.recommended_amount ?? recommendedAmount) || recommendedAmount;
    setLockingPromotionId(promo.id);
    try {
      if (onLockPromotion) {
        await onLockPromotion(promo, suggestedAmount);
      }
      onSelectPromotion?.(promo);
      setCustomAmount('');
      setPresetAmount(suggestedAmount);
    } catch (error) {
      /* handled upstream */
    } finally {
      setLockingPromotionId(null);
    }
  };

  const dailyRewardsHeader = (
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
      <div>
        <p className={`text-xs uppercase tracking-wide font-semibold ${subtleTextClass} flex items-center gap-2`}>
          <RefreshCw className="w-4 h-4 text-blue-500" />
          {`Daily quests · Wave ${wave + 1}`}
        </p>
        <h2 className={`text-2xl font-bold ${panelHeadingClass} mt-1`}>Stay on track with daily actions</h2>
        <p className={`text-sm ${subtleTextClass}`}>
          Clear each task to keep streak bonuses active and unlock additional automation perks.
        </p>
      </div>
      <div className="w-full md:w-56">
        <div className={`h-2 rounded-full ${resolvedIsDark ? 'bg-slate-800' : 'bg-slate-200'} overflow-hidden`}>
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all"
            style={{ width: `${taskProgress}%` }}
          />
        </div>
        <p className={`text-xs ${subtleTextClass} mt-2`}>
          {dailyTasks.length
            ? `${completedCount}/${dailyTasks.length} complete • ${taskProgress}%`
            : 'Redeem a few leads to unlock daily quests'}
        </p>
      </div>
    </div>
  );

  const dailyTasksList = (
    <div className="space-y-4">
      {dailyTasks.length === 0 && (
        <div
          className={`rounded-2xl border border-dashed ${resolvedIsDark ? 'border-slate-700 bg-slate-900/50 text-slate-300' : 'border-slate-300 bg-white/60 text-slate-500'} p-6 text-sm`}
        >
          Build your profile and redeem a few free leads to unlock daily quests.
        </div>
      )}
      {dailyTasks.map((task) => {
        const completionKey = `daily:${dateKey}:wave${wave}:${task.id}`;
        const completed = Boolean(completedQuests[completionKey]);
        return (
          <DailyTaskCard
            key={completionKey}
            task={task}
            completed={completed}
            onComplete={() => onCompleteTask?.(task)}
            isDark={resolvedIsDark}
          />
        );
      })}
      {canRefresh && (
        <div className={`flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-t ${sectionDivider} pt-4`}>
          <p className={`text-sm ${subtleTextClass}`}>Wave complete! Load fresh quests to keep the streaks alive.</p>
          <button
            type="button"
            onClick={() => onRefreshDailyTasks?.()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Drop new quests
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className={`fixed inset-0 z-[60] flex items-center justify-center ${overlayClasses} backdrop-blur-sm px-4`}>
      <div className={`w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-3xl ${containerClasses} ${containerShadow}`}>
        <div className={`flex items-center justify-between px-6 py-5 border-b ${headerBarClasses}`}>
          <div>
            <p className={`text-xs uppercase tracking-[0.3em] ${headerAccentText}`}>Wallet & rewards</p>
            <h2 className={`text-2xl font-bold mt-1 ${headerTitleClass}`}>
              Level {level} • {points.toLocaleString()} pts · Wallet ${safeWallet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-full transition ${
              resolvedIsDark
                ? 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800'
            }`}
            aria-label="Close wallet rewards modal"
          >
            ×
          </button>
        </div>

        <div className="px-6 pt-4 pb-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('wallet')}
            className={tabButtonClasses(activeTab === 'wallet', resolvedIsDark)}
          >
            Wallet
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rewards')}
            className={tabButtonClasses(activeTab === 'rewards', resolvedIsDark)}
          >
            Rewards
          </button>
        </div>

        <div className="px-6 pb-6 overflow-y-auto space-y-8 max-h-[75vh] custom-scrollbar">
          {activeTab === 'wallet' && (
            <div className="space-y-8">
              {activePromotions.length > 0 && (
                <section className="space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <h3 className={`text-sm font-semibold uppercase tracking-wide ${panelHeadingClass}`}>
                        Limited-time wallet boost
                      </h3>
                      <p className={`text-sm ${subtleTextClass}`}>
                        Double every reload before the countdown expires. Apply the reward and head straight to checkout.
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold ${
                        resolvedIsDark ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      <Sparkles className="w-3 h-3" />
                      Fast-acting reward
                    </span>
                  </div>
                  <div className="grid gap-3">
                    {activePromotions.map((promo) => {
                      const isSelected = selectedPromotionId === promo.id;
                      const countdownLabel = formatCountdown(promo.expires_at);
                      const urgent = new Date(promo.expires_at || 0).getTime() - currentTimestamp < 5 * 60 * 1000;
                      const isPendingCheckout = promo.status === 'pending_checkout';
                      const buttonDisabled = lockingPromotionId === promo.id || isPendingCheckout;
                      return (
                        <div
                          key={promo.id}
                          className={`rounded-3xl border px-5 py-4 transition ${
                            resolvedIsDark
                              ? isSelected
                                ? 'border-emerald-400/60 bg-emerald-500/10 shadow-lg shadow-emerald-500/20'
                                : 'border-slate-700 bg-slate-900/70'
                              : isSelected
                              ? 'border-emerald-400 bg-emerald-50 shadow-md shadow-emerald-100'
                              : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <span
                                className={`inline-flex items-center justify-center w-9 h-9 rounded-full ${
                                  resolvedIsDark ? 'bg-emerald-500/15 text-emerald-200' : 'bg-emerald-100 text-emerald-600'
                                }`}
                              >
                                <Gift className="w-4 h-4" />
                              </span>
                              <div>
                                <p className="text-sm font-semibold">2× wallet credits</p>
                                <p className={`text-xs ${resolvedIsDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                  Use code <span className="font-mono font-semibold">{promo.code}</span> at checkout.
                                </p>
                              </div>
                            </div>
                            <span
                              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold ${
                                urgent
                                  ? resolvedIsDark
                                    ? 'bg-rose-500/20 text-rose-200 border border-rose-500/40'
                                    : 'bg-rose-100 text-rose-600 border border-rose-200'
                                  : resolvedIsDark
                                  ? 'bg-blue-500/20 text-blue-200 border border-blue-500/40'
                                  : 'bg-blue-100 text-blue-700 border border-blue-200'
                              }`}
                            >
                              <RefreshCw className="w-3 h-3" />
                              {countdownLabel}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleApplyPromotion(promo)}
                              disabled={buttonDisabled}
                              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                                resolvedIsDark
                                  ? isSelected
                                    ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                                    : 'bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30'
                                  : isSelected
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                                  : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              }`}
                            >
                              {lockingPromotionId === promo.id
                                ? 'Applying...'
                                : isPendingCheckout && isSelected
                                ? 'Checkout pending'
                                : isSelected
                                ? 'Promotion applied'
                                : 'Apply & reload'}
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  if (navigator?.clipboard?.writeText) {
                                    await navigator.clipboard.writeText(promo.code);
                                    toast.success('Promotion code copied');
                                  }
                                } catch (error) {
                                  console.warn('Failed to copy promotion code', error);
                                }
                              }}
                              className={`text-xs font-semibold px-3 py-1.5 rounded-lg underline-offset-2 ${
                                resolvedIsDark ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                              }`}
                            >
                              Copy code
                            </button>
                            {isSelected && (
                              <span className={`text-xs font-semibold ${resolvedIsDark ? 'text-emerald-200' : 'text-emerald-600'}`}>
                                Any reload amount applies instantly.
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <SummaryBadge
                  isDark={resolvedIsDark}
                  icon={Wallet}
                  title="Wallet balance"
                  metric={`$${safeWallet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  subtitle="Funds ready for SmartScans, voice, SMS, email, and paid lead unlocks."
                />
                <SummaryBadge
                  isDark={resolvedIsDark}
                  icon={ToggleRight}
                  title="Auto-spend status"
                  metric={`${enabledChannels.length}/${channels.length}`}
                  subtitle="Channels currently auto-funded"
                />
                <SummaryBadge
                  isDark={resolvedIsDark}
                  icon={Coins}
                  title="Channel credits ready"
                  metric={totalAllocatedUnits.toLocaleString()}
                  subtitle={channelBreakdown || 'No credits allocated yet'}
                />
                <SummaryBadge
                  isDark={resolvedIsDark}
                  icon={RefreshCw}
                  title="Manual approvals"
                  metric={manualChannels === 0 ? 'None' : `${manualChannels} channel${manualChannels === 1 ? '' : 's'}`}
                  subtitle={
                    manualChannels === 0
                      ? 'All outreach runs automatically'
                      : 'These channels require confirmation before spend'
                  }
                />
              </div>

              <WalletTopUpStrip
                isDark={resolvedIsDark}
                presetAmount={presetAmount}
                onPresetChange={setPresetAmount}
                customAmount={customAmount}
                onCustomAmountChange={setCustomAmount}
                onSubmitStripe={handleTopUp}
                planOptions={PLAN_OPTIONS}
                selectedPromotion={selectedPromotion}
                recommendedAmount={recommendedAmount}
              />

              <section className="space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div>
                    <h3 className={`text-sm font-semibold uppercase tracking-wide ${panelHeadingClass}`}>Lock in best-value plans</h3>
                    <p className={`text-sm ${subtleTextClass}`}>
                      Skip one-off reloads — Stripe plans bundle 4–5× more wallet value for SmartScans and outreach.
                    </p>
                  </div>
                  <div
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                      resolvedIsDark ? 'bg-slate-900/70 border border-slate-700 text-slate-200' : 'bg-slate-100 border border-slate-200 text-slate-600'
                    }`}
                  >
                    Stripe subscription • cancel anytime
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {PLAN_OPTIONS.map((plan) => (
                    <PlanComparisonCard
                      key={plan.id}
                      plan={plan}
                      isDark={resolvedIsDark}
                      onSelect={() => onPlanCheckout?.(plan)}
                    />
                  ))}
                </div>
                <div
                  className={`rounded-2xl border px-5 py-4 space-y-2 ${
                    resolvedIsDark ? 'border-blue-500/30 bg-blue-500/10 text-blue-100' : 'border-blue-200 bg-blue-50 text-blue-900'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold">
                      <ShieldCheck className="w-4 h-4" />
                      30-day money-back guarantee*
                    </span>
                    <a
                      href="/billing-terms#guarantee"
                      className={`text-xs font-semibold underline-offset-2 hover:underline ${
                        resolvedIsDark ? 'text-blue-100' : 'text-blue-700'
                      }`}
                    >
                      Read the refund policy
                    </a>
                  </div>
                  <p className="text-xs leading-relaxed">
                    * Cancel within 30 days to receive a full refund of plan fees. Direct API, imagery, carrier, or payment processing costs already incurred while fulfilling your leads remain payable.
                  </p>
                </div>
                <div
                  className={`flex items-center gap-2 text-xs font-semibold ${
                    resolvedIsDark ? 'text-blue-200' : 'text-blue-600'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  Powered by Stripe secure payments
                </div>
              </section>

              <section className="space-y-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <h3 className={`text-sm font-semibold uppercase tracking-wide ${panelHeadingClass}`}>
                      Automatic usage billing
                    </h3>
                    <p className={`text-sm ${subtleTextClass}`}>
                      Set channel caps once and the wallet routes Stripe funds to voice, SMS, email, SmartScans, and paid lead unlocks in real time.
                    </p>
                  </div>
                  <div
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                      resolvedIsDark ? 'bg-slate-900/70 border border-slate-700 text-slate-200' : 'bg-slate-100 border border-slate-200 text-slate-600'
                    }`}
                  >
                    {autoSpendSummary}
                  </div>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {channels.map((channel) => (
                    <CreditControlCard
                      key={channel}
                      isDark={resolvedIsDark}
                      channel={channel}
                      config={pricing[channel]}
                      balance={creditBuckets?.[channel] ?? 0}
                      autoEnabled={Boolean(usageRules?.[channel])}
                      plannedUnits={plannedUnits[channel] ?? 0}
                      onPlannedUnitsChange={(value) =>
                        setPlannedUnits((prev) => ({ ...prev, [channel]: value }))
                      }
                      onToggleAuto={() => onToggleAutoSpend?.(channel)}
                      walletBalance={safeWallet}
                      onApply={(units) => {
                        const safeUnits = Number.isFinite(units) ? units : 0;
                        if (safeUnits > 0) {
                          onAllocateCredits?.(channel, safeUnits, { force: true });
                          setPlannedUnits((prev) => ({ ...prev, [channel]: 0 }));
                        }
                      }}
                    />
                  ))}
                </div>
              </section>

              <section
                className={`rounded-2xl px-4 py-4 ${
                  resolvedIsDark ? 'border border-slate-700 bg-slate-900/60 text-slate-200' : 'border border-slate-200 bg-white text-slate-600'
                } space-y-2`}
              >
                <h3 className={`text-sm font-semibold ${panelHeadingClass}`}>Lead supply assurance</h3>
                <p className="text-sm">
                  Only systematic hot leads are delivered. Request a quality review if a contact is unresponsive — the AI audits call,
                  SMS, and email activity, then refunds the original charge and drops <strong>two replacement leads</strong> straight into your wallet.
                </p>
                <p className="text-xs">
                  {redeemedLeads.toLocaleString()} replacement credits already issued. Refunds post instantly as wallet credits.
                </p>
              </section>
            </div>
          )}

          {activeTab === 'rewards' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <SummaryBadge
                  isDark={resolvedIsDark}
                  icon={Sparkles}
                  title="Points balance"
                  metric={`${safePoints.toLocaleString()} pts`}
                  subtitle="Redeem 100 pts for 1 lead credit"
                  actionLabel="Redeem lead"
                  onAction={onRedeemLead}
                  disabled={safePoints < 100}
                />
                <SummaryBadge
                  isDark={resolvedIsDark}
                  icon={Gift}
                  title="Lead credits ready"
                  metric={`${leadCredits.toLocaleString()}`}
                  subtitle={`${redeemedLeads.toLocaleString()} redeemed all-time`}
                />
                <SummaryBadge
                  isDark={resolvedIsDark}
                  icon={Trophy}
                  title="Program level"
                  metric={`Level ${level}`}
                  subtitle={`${Math.max(0, nextLevelPoints - safePoints).toLocaleString()} pts to next tier`}
                />
                <SummaryBadge
                  isDark={resolvedIsDark}
                  icon={Zap}
                  title="Daily streak"
                  metric={`${streak} day${streak === 1 ? '' : 's'}`}
                  subtitle="Weekly engagement bonus posts on day 7"
                />
              </div>

              {dailyRewardsHeader}
              {dailyTasksList}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {channels.map((channel) => (
                  <PointExchangeCard
                    key={`exchange-${channel}`}
                    isDark={resolvedIsDark}
                    channel={channel}
                    config={pricing[channel]}
                    points={safePoints}
                    plannedUnits={pointConversions[channel] ?? 0}
                    onPlannedUnitsChange={(value) =>
                      setPointConversions((prev) => ({ ...prev, [channel]: value }))
                    }
                    onExchange={() => {
                      const units = Number(pointConversions[channel] ?? 0);
                      if (!Number.isFinite(units) || units <= 0) return;
                      onExchangePoints?.(channel, units, { force: true });
                      setPointConversions((prev) => ({ ...prev, [channel]: 0 }));
                    }}
                  />
                ))}
              </div>

              <div
                className={`rounded-3xl border shadow-xl p-5 ${
                  resolvedIsDark ? 'bg-slate-900/60 border-slate-700 text-slate-100' : 'bg-white/80 border-slate-200 text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className={`text-xs uppercase tracking-wide font-semibold flex items-center gap-2 ${subtleTextClass}`}>
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      Recent ledger activity
                    </p>
                    <h3 className={`text-lg font-semibold ${panelHeadingClass}`}>Points & wallet movements</h3>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenLedger}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                      resolvedIsDark ? 'bg-slate-800 text-slate-100 hover:bg-slate-700' : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    Open full ledger
                  </button>
                </div>
              <div className="space-y-3">
                {(pointHistory || []).slice(0, 6).map((entry, index) => (
                  <RewardHistoryRow key={`${entry.timestamp}-${index}`} entry={entry} isDark={resolvedIsDark} />
                ))}
                {(!pointHistory || pointHistory.length === 0) && (
                    <div className={`text-sm ${subtleTextClass}`}>
                      No point transactions yet. Complete quests or reload wallet to start your ledger trail.
                    </div>
                  )}
              </div>
            </div>

            <div
              className={`rounded-2xl border px-4 py-3 text-xs ${
                resolvedIsDark ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            >
              Systematic hot leads only — if AI detects an unresponsive homeowner after you request a quality review, the original charge is reversed and <strong>two replacement leads</strong> are issued automatically.
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {PREMIUM_GUIDES.map((guide) => (
                  <PremiumMilestoneCard key={guide.id} {...guide} isDark={resolvedIsDark} />
                ))}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

const PlanComparisonCard = ({ plan, isDark, onSelect }) => {
  const multiplier = plan.valueMultiplier ?? 1;
  const estimatedValue = Math.round(plan.walletEquivalent ?? plan.price * multiplier);
  const roundedValue = Math.round(estimatedValue / 10) * 10;
  const multiplierLabel = Number.isInteger(multiplier) ? multiplier : multiplier.toFixed(1);
  const leadsWithPlan = plan.planLeads ?? Math.max(1, Math.floor(estimatedValue / RETAIL_LEAD_COST));
  const leadsWithReload = plan.reloadLeads ?? Math.max(1, Math.floor(plan.price / RETAIL_LEAD_COST));
  const netLeadGain = Math.max(0, leadsWithPlan - leadsWithReload);
  const shellClasses = isDark
    ? 'border border-slate-700 bg-slate-900/70 text-slate-100 hover:border-blue-500/40'
    : 'border border-slate-200 bg-white text-slate-900 hover:border-blue-200';
  const badgeClasses =
    plan.id === 'builder'
      ? isDark
        ? 'bg-amber-500/20 text-amber-100 border border-amber-400/40'
        : 'bg-amber-100 text-amber-700 border border-amber-200'
      : isDark
      ? 'bg-blue-500/20 text-blue-100 border border-blue-500/30'
      : 'bg-blue-100 text-blue-700 border border-blue-200';
  const highlightClass = isDark ? 'text-slate-300' : 'text-slate-600';
  const valuePillClass = isDark
    ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-500/40'
    : 'bg-emerald-100 text-emerald-700 border border-emerald-200';

  return (
    <div className={`h-full rounded-3xl p-6 flex flex-col gap-6 transition-shadow shadow-sm hover:shadow-xl ${shellClasses}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>{plan.name}</p>
          <p className="text-2xl font-semibold mt-1">
            ${plan.price.toLocaleString()}
            <span className="text-sm font-medium ml-1">/month</span>
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap tracking-wide ${badgeClasses}`}
        >
          <Sparkles className="w-3 h-3" />
          {plan.badge}
        </span>
      </div>
      <p className={`text-sm leading-relaxed ${highlightClass}`}>{plan.highlight}</p>
      <div className="space-y-3">
        {plan.perks.map((perk, index) => (
          <div key={`${plan.id}-perk-${index}`} className="flex items-start gap-2 text-sm leading-relaxed">
            <Check className={`w-4 h-4 mt-0.5 ${plan.id === 'builder' ? 'text-amber-500' : isDark ? 'text-blue-200' : 'text-blue-500'}`} />
            <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>{perk}</span>
          </div>
        ))}
      </div>
      <div className="mt-auto space-y-3">
        <div className="space-y-2">
          <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border ${valuePillClass}`}>
            Value ≈ ${roundedValue.toLocaleString()} wallet ({multiplierLabel}×)
          </span>
          <span
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold ${
              isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            ≈ {leadsWithPlan.toLocaleString()} qualified roofing leads / month
          </span>
          <span
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold ${
              isDark ? 'bg-slate-900/70 text-slate-300' : 'bg-slate-50 text-slate-600'
            }`}
          >
            <Check className="w-3 h-3" />
            {netLeadGain > 0
              ? `One-off reload ≈ ${leadsWithReload.toLocaleString()} leads — plan adds ${netLeadGain.toLocaleString()} more`
              : `One-off reload ≈ ${leadsWithReload.toLocaleString()} leads at a la carte rates`}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onSelect?.(plan)}
          className={`w-full px-4 py-2 rounded-xl text-sm font-semibold transition ${
            isDark ? 'bg-blue-500 text-white hover:bg-blue-400' : 'bg-blue-600 text-white hover:bg-blue-500'
          }`}
        >
          Activate {plan.name}
        </button>
      </div>
      <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        Best for replacing {multiplierLabel}× one-time reloads each month. Includes automated lead replacement credits and outreach oversight.
      </p>
    </div>
  );
};

const SummaryBadge = ({ icon: Icon, title, metric, subtitle, actionLabel, onAction, disabled, isDark }) => {
  const wrapClass = isDark
    ? 'border border-blue-200/40 bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-slate-900/40 text-slate-100 shadow-lg shadow-blue-900/30'
    : 'border border-slate-200 bg-white text-slate-900 shadow-sm';
  const iconClass = isDark ? 'bg-blue-500/25 text-blue-100' : 'bg-blue-500/10 text-blue-600';
  const titleClass = isDark ? 'text-blue-100/80' : 'text-slate-500';
  const metricClass = isDark ? 'text-white' : 'text-slate-900';
  const subtitleClass = isDark ? 'text-blue-100/70' : 'text-slate-500';
  const actionEnabled = isDark ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-slate-900 text-white hover:bg-slate-800';

  return (
    <div className={`rounded-2xl px-4 py-4 ${wrapClass}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wide ${titleClass}`}>{title}</p>
          <p className={`text-xl font-semibold ${metricClass}`}>{metric}</p>
        </div>
      </div>
      {subtitle && <p className={`text-xs mt-2 ${subtitleClass}`}>{subtitle}</p>}
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          disabled={disabled}
          className={`mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            disabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : actionEnabled
          }`}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

const WalletTopUpStrip = ({
  isDark,
  presetAmount,
  onPresetChange,
  customAmount,
  onCustomAmountChange,
  onSubmitStripe,
  planOptions = [],
  selectedPromotion,
  recommendedAmount,
}) => {
  const popularAmount = 1100;
  const presetAmounts = [100, 250, 500, 750, popularAmount];
  const parsedCustom = Number(customAmount);
  const selectedAmount =
    customAmount !== '' && Number.isFinite(parsedCustom) && parsedCustom > 0 ? parsedCustom : Number(presetAmount);
  const estimatedReloadLeads =
    Number.isFinite(selectedAmount) && selectedAmount > 0 ? Math.max(1, Math.floor(selectedAmount / RETAIL_LEAD_COST)) : 0;
  const boostedValue =
    selectedPromotion && Number.isFinite(selectedAmount) && selectedAmount > 0
      ? selectedAmount * (selectedPromotion.multiplier || 2)
      : null;
  const formattedSelectedAmount = Number.isFinite(selectedAmount)
    ? selectedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00';
  const primaryPlan = planOptions[0];
  const primaryPlanLeads = primaryPlan?.planLeads ?? 0;
  const primaryPlanName = primaryPlan?.name ?? 'Growth Builder';
  const primaryPlanMultiplier = Number(primaryPlan?.valueMultiplier ?? 3);
  const primaryPlanMultiplierLabel = Number.isFinite(primaryPlanMultiplier)
    ? `${Number.isInteger(primaryPlanMultiplier) ? primaryPlanMultiplier : primaryPlanMultiplier.toFixed(1)}×`
    : '3×';
  const leadGain = primaryPlanLeads && estimatedReloadLeads ? Math.max(0, primaryPlanLeads - estimatedReloadLeads) : 0;

  return (
    <div
      className={`rounded-3xl p-7 space-y-7 ${
        isDark ? 'border border-slate-800 bg-slate-900/70 text-slate-100' : 'border border-slate-200 bg-white text-slate-900 shadow-sm'
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <p className={`text-xs uppercase tracking-wide font-semibold ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Add funds</p>
          <h3 className="text-2xl font-semibold">Stripe wallet reload</h3>
          <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Use secure Stripe checkout to fund SmartScans, outreach minutes, and paid lead unlocks.
          </p>
        </div>
        <div
          className={`flex items-center gap-2 text-xs rounded-full px-3 py-1.5 ${
            isDark ? 'bg-slate-800 text-slate-200 border border-slate-700' : 'bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Funds arrive in <strong className="font-semibold">&lt;5 seconds</strong>
        </div>
      </div>

      {selectedPromotion && (
        <div className="space-y-3">
          <div className="flex justify-center">
            <div
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide uppercase ${
                isDark ? 'bg-emerald-400/20 text-emerald-100 border border-emerald-300/40' : 'bg-emerald-500 text-white shadow-sm'
              }`}
            >
              Save 2× with promo code:
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(selectedPromotion.code);
                    toast.success('Promo code copied');
                  } catch (error) {
                    console.warn('copy promo code failed', error);
                  }
                }}
                className={`font-mono text-sm font-bold px-2 py-0.5 rounded ${
                  isDark ? 'bg-emerald-500/30 text-emerald-100' : 'bg-white/20 text-white'
                }`}
              >
                {selectedPromotion.code}
              </button>
            </div>
          </div>
          <div
            className={`rounded-2xl border px-4 py-3 flex items-center gap-3 ${
              isDark ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            <span
              className={`inline-flex items-center justify-center w-9 h-9 rounded-full ${
                isDark ? 'bg-emerald-400/20 text-emerald-100' : 'bg-emerald-100 text-emerald-600'
              }`}
            >
              <Gift className="w-4 h-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">Double credits ready</p>
              <p className="text-xs">
                Any reload during this window is boosted automatically. Recommended amount:{' '}
                <span className="font-semibold">${Number(recommendedAmount || 0).toLocaleString()}</span>.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
        {presetAmounts.map((amount) => {
          const isActive = customAmount === '' && presetAmount === amount;
          const isRecommended = amount === recommendedAmount;
          const isPopular = amount === popularAmount;
          const highlightPopular = isPopular && (presetAmount === 100 || isActive);
          return (
            <button
              key={`preset-${amount}`}
              type="button"
              onClick={() => {
                onPresetChange(amount);
                onCustomAmountChange('');
              }}
              className={`relative rounded-2xl border px-5 py-2.5 text-lg font-semibold transition ${
                isActive
                  ? isDark
                    ? isPopular
                      ? 'border-emerald-300 bg-emerald-500/20 text-emerald-100 shadow shadow-emerald-900/30'
                      : 'border-blue-300 bg-blue-500/20 text-blue-100 shadow shadow-blue-900/30'
                    : isPopular
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                    : 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                  : isRecommended
                  ? isDark
                    ? 'border-blue-400/60 bg-slate-900/70 text-blue-200 hover:border-blue-300'
                    : 'border-blue-400 bg-blue-50 text-blue-700 hover:border-blue-300'
                  : isDark
                  ? 'border-slate-700 bg-slate-900/70 text-slate-200 hover:border-blue-400'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-blue-400'
              }`}
            >
              {isPopular && (
                <span
                  className={`absolute -top-3 right-3 inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-[10px] font-semibold ${
                    highlightPopular
                      ? isDark
                        ? 'bg-emerald-400 text-slate-900 shadow shadow-emerald-900/40'
                        : 'bg-emerald-500 text-white shadow-sm'
                      : isDark
                      ? 'bg-slate-700 text-emerald-200 border border-emerald-300/40'
                      : 'bg-slate-800 text-emerald-200 border border-emerald-300/40'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  Popular
                </span>
              )}
              ${amount}
            </button>
          );
        })}
      </div>

      <div
        className={`rounded-2xl border p-5 space-y-3 ${
          isDark ? 'border-slate-700 bg-slate-900/60' : 'border-slate-200 bg-slate-50'
        }`}
      >
      <label className={`text-xs uppercase tracking-wide font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Custom amount</label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>$</span>
          <input
            type="number"
            min="50"
            step="25"
            value={customAmount}
            onChange={(event) => onCustomAmountChange(event.target.value)}
            placeholder="Enter an amount"
            className={`w-full rounded-xl pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDark ? 'bg-slate-950/60 border border-slate-700 text-slate-100' : 'bg-white border border-slate-300 text-slate-900'
            }`}
          />
        </div>
        <button
          type="button"
          onClick={() => onCustomAmountChange('')}
          className={`text-xs font-semibold underline-offset-2 hover:underline ${isDark ? 'text-slate-200' : 'text-slate-600'}`}
        >
          Clear
        </button>
      </div>
      <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        Need ACH or invoicing? Message the help desk and we’ll arrange it for you.
      </p>
      </div>

      <div
        className={`rounded-2xl border px-5 py-4 ${
          isDark ? 'border-slate-700 bg-slate-900/60 text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-700'
        }`}
      >
        <p className="text-sm font-semibold">
          This reload ≈ <span className="text-blue-500">{estimatedReloadLeads > 0 ? `${estimatedReloadLeads.toLocaleString()} qualified leads` : '—'}</span> using a la carte credits.
        </p>
        {primaryPlanLeads > 0 && (
          <p className="text-xs leading-relaxed mt-1">
            {primaryPlanName} delivers ≈ {primaryPlanLeads.toLocaleString()} leads each month ({primaryPlanMultiplierLabel} wallet value)
            {leadGain > 0 && estimatedReloadLeads > 0 ? ` — about ${leadGain.toLocaleString()} more than this single reload.` : ''} Backed by our 30-day guarantee.
          </p>
        )}
      </div>

      <div
        className={`rounded-2xl border px-5 py-4 space-y-2 ${
          isDark ? 'border-slate-700 bg-slate-900/70' : 'border-slate-200 bg-slate-50'
        }`}
      >
      <button
        type="button"
        onClick={onSubmitStripe}
        className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-white font-semibold shadow-sm transition bg-[#635bff] hover:bg-[#4a44d4]"
      >
        <span className="text-base">
          {selectedPromotion ? 'Proceed to Stripe checkout (2× boost)' : 'Proceed to Stripe checkout'}
        </span>
        <Sparkles className="w-4 h-4" />
      </button>
      <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
        Charges post to your Stripe customer account and wallet balances update immediately after confirmation.
      </p>
      {selectedPromotion && Number.isFinite(selectedAmount) && selectedAmount > 0 && (
        <p className={`text-xs font-semibold ${isDark ? 'text-emerald-200' : 'text-emerald-600'}`}>
          Reload ${formattedSelectedAmount} → credits ${
            boostedValue
              ? boostedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : (selectedAmount * (selectedPromotion.multiplier || 2)).toLocaleString()
          } after payment.
        </p>
      )}
      <span
        className={`inline-flex items-center gap-2 text-[11px] font-semibold ${
          isDark ? 'text-blue-200' : 'text-blue-600'
        }`}
      >
        <CreditCard className="w-4 h-4" />
        Powered by Stripe secure payments
      </span>
      </div>
    </div>
  );
};

const DailyTaskCard = ({ task, completed, onComplete, isDark }) => {
  const Icon = task.icon || Sparkles;
  const cardClasses = completed
    ? isDark
      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-100'
      : 'border-emerald-200 bg-emerald-50'
    : task.requiresPurchase
    ? isDark
      ? 'border-violet-500/40 bg-violet-500/10 text-slate-100'
      : 'border-violet-200 bg-violet-50/70'
    : isDark
    ? 'border-slate-700 bg-slate-900/60 text-slate-200'
    : 'border-slate-200 bg-white/90';
  const badgeTone = completed
    ? isDark
      ? 'bg-emerald-500 text-white'
      : 'bg-emerald-500 text-white'
    : task.requiresPurchase
    ? isDark
      ? 'bg-violet-500 text-white'
      : 'bg-violet-500 text-white'
    : isDark
    ? 'bg-blue-500 text-white'
    : 'bg-blue-500 text-white';
  return (
    <div className={`flex flex-col md:flex-row md:items-center gap-4 rounded-2xl border px-4 py-4 transition ${cardClasses}`}>
      <div className="flex items-start gap-4 flex-1 min-w-0">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${badgeTone}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="space-y-1 min-w-0">
          <p className={`text-sm font-semibold truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{task.title}</p>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{task.description}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className={`inline-flex items-center gap-1 ${isDark ? 'text-amber-300' : 'text-amber-600'}`}>
              <Sparkles className="w-3 h-3" />
              +{task.points} pts
            </span>
            {task.requiresPurchase && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                  isDark ? 'bg-violet-500/25 text-violet-100' : 'bg-violet-100 text-violet-700'
                }`}
              >
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
              ? isDark
                ? 'bg-emerald-500/20 text-emerald-200 cursor-default'
                : 'bg-emerald-100 text-emerald-600 cursor-default'
              : isDark
              ? 'bg-slate-800 text-slate-100 hover:bg-slate-700'
              : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          {completed ? 'Completed' : task.actionLabel || 'Log completion'}
        </button>
      </div>
    </div>
  );
};

const CreditControlCard = ({
  channel,
  config = {},
  balance = 0,
  autoEnabled = false,
  plannedUnits = 0,
  onPlannedUnitsChange,
  onToggleAuto,
  onApply,
  walletBalance = 0,
  isDark,
}) => {
  const ToggleIcon = autoEnabled ? ToggleRight : ToggleLeft;
  const unit = config.unit || 'unit';
  const incremental = config.cost || 1;

  const affordableUnits = incremental > 0 ? Math.floor((walletBalance || 0) / incremental) : 0;
  const sliderMax = Math.max(0, Math.min(500, affordableUnits));
  const clampedUnits = Math.min(plannedUnits, sliderMax);
  const disabled = !clampedUnits || sliderMax === 0;

  return (
    <div
      className={`rounded-2xl border p-5 space-y-4 ${
        isDark ? 'border-slate-700 bg-slate-900/60 text-slate-100' : 'border-slate-200 bg-white/85 text-slate-900'
      }`}
    >
      <div>
        <p className={`text-xs uppercase tracking-wide font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{config.label || channel}</p>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-bold">{balance.toLocaleString()}</span>
          <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {unit}
            {balance === 1 ? '' : 's'} ready
          </span>
        </div>
        <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>${incremental.toFixed(2)} per {unit}</p>
      </div>
      <div
        className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-semibold transition ${
          autoEnabled
            ? isDark
              ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
              : 'bg-emerald-50 border-emerald-200 text-emerald-600'
            : isDark
            ? 'bg-slate-900/60 border-slate-700 text-slate-300'
            : 'bg-slate-50 border-slate-200 text-slate-500'
        }`}
      >
        <span>Auto charge {autoEnabled ? 'on' : 'off'}</span>
        <button
          type="button"
          onClick={onToggleAuto}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border transition ${
            autoEnabled
              ? isDark
                ? 'bg-emerald-500/80 border-emerald-400 text-white hover:bg-emerald-500'
                : 'bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-400'
              : isDark
              ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-200'
          }`}
          aria-pressed={autoEnabled}
        >
          <ToggleIcon className="w-4 h-4" />
          <span>{autoEnabled ? 'On' : 'Off'}</span>
        </button>
      </div>
      <div>
        <label className={`text-xs uppercase tracking-wide font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Allocate new credits</label>
        <input
          type="range"
          min="0"
          max={sliderMax}
          step="1"
          value={clampedUnits}
          onChange={(event) => onPlannedUnitsChange(Number(event.target.value))}
          className="w-full mt-2 accent-blue-500"
        />
        <div className={`flex items-center justify-between text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          <span>{clampedUnits} {unit}{clampedUnits === 1 ? '' : 's'}</span>
          <span>Cost ${ (clampedUnits * incremental).toFixed(2)}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onApply(clampedUnits)}
        disabled={disabled}
        className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition ${
          !disabled
            ? isDark
              ? 'bg-blue-500 text-white hover:bg-blue-400'
              : 'bg-blue-600 text-white hover:bg-blue-500'
            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
        }`}
      >
        <Coins className="w-3.5 h-3.5" />
        Convert wallet → {clampedUnits} {unit}{clampedUnits === 1 ? '' : 's'}
      </button>
      {channel === 'leads' && (
        <p className={`text-[11px] ${isDark ? 'text-emerald-200/80' : 'text-emerald-600/90'}`}>
          Systematic hot leads only. Approved quality reviews auto-credit two replacements instantly.
        </p>
      )}
    </div>
  );
};

const PointExchangeCard = ({ channel, config = {}, points = 0, plannedUnits = 0, onPlannedUnitsChange, onExchange, isDark }) => {
  const unit = config.unit || 'unit';
  const unitCostPoints = Math.ceil((config.cost || 1) * 25);
  const maxUnits = Math.min(500, Math.floor(points / Math.max(1, unitCostPoints))) || 0;

  return (
    <div
      className={`rounded-2xl border p-5 space-y-4 ${
        isDark ? 'border-slate-700 bg-slate-900/60 text-slate-100' : 'border-slate-200 bg-white/90 text-slate-900'
      }`}
    >
      <div>
        <p className={`text-xs uppercase tracking-wide font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Convert for {config.label || channel}
        </p>
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{unitCostPoints} pts = 1 {unit}</p>
      </div>
      <div>
        <input
          type="range"
          min="0"
          max={maxUnits}
          value={plannedUnits}
          onChange={(event) => onPlannedUnitsChange(Number(event.target.value))}
          className="w-full accent-amber-500"
        />
        <div className={`flex items-center justify-between text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          <span>{plannedUnits} {unit}{plannedUnits === 1 ? '' : 's'}</span>
          <span>Cost {plannedUnits * unitCostPoints} pts</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onExchange}
        disabled={!plannedUnits}
        className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition ${
          plannedUnits
            ? isDark
              ? 'bg-amber-500 text-white hover:bg-amber-400'
              : 'bg-amber-500 text-white hover:bg-amber-400'
            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
        }`}
      >
        <Sparkles className="w-3.5 h-3.5" />
        Exchange points
      </button>
    </div>
  );
};

const PremiumMilestoneCard = ({ icon: Icon, title, description, reward, cost, isDark }) => (
  <div
    className={`rounded-3xl border shadow-xl p-6 space-y-3 ${
      isDark ? 'bg-slate-900/60 border-slate-700 text-slate-100' : 'bg-white/90 border-slate-200 text-slate-900'
    }`}
  >
    <div className="flex items-start gap-3">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          isDark ? 'bg-blue-500/25 text-blue-100' : 'bg-blue-500/15 text-blue-600'
        }`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{description}</p>
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
      <span
        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${
          isDark ? 'bg-amber-500/20 text-amber-200' : 'bg-amber-100 text-amber-700'
        }`}
      >
        <Sparkles className="w-3 h-3" />
        {reward}
      </span>
      <span
        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${
          isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
        }`}
      >
        {cost}
      </span>
    </div>
  </div>
);

const RewardHistoryRow = ({ entry, isDark }) => {
  if (!entry) return null;
  const amount = Number(entry.amount ?? 0);
  const isPositive = amount >= 0;
  const timestamp = entry.timestamp ? new Date(entry.timestamp) : null;
  const label = entry.reason || entry.type || 'Reward update';
  const timestampLabel = timestamp ? timestamp.toLocaleString() : 'Recently';

  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 ${
        isDark ? 'border-slate-700 bg-slate-900/50 text-slate-100' : 'border-slate-200 bg-white/80 text-slate-900'
      }`}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate">{label}</p>
        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{timestampLabel}</p>
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

export default WalletRewardsModal;
