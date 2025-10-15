import React, { useMemo } from 'react';
import { Sparkles, Gift, Trophy, CheckCircle, ArrowRight } from 'lucide-react';

const STEP_CARDS = [
  {
    title: 'Complete business profile',
    description: 'Upload logo, service areas, and storm specialties so AI conversations match your tone.',
    action: 'Open brand studio',
    target: '/dashboard/settings?tab=brand'
  },
  {
    title: 'Launch SmartScan',
    description: 'Pick a ZIP and let the system surface 200 aging roofs ready for inspection invites.',
    action: 'Run a scan',
    target: '/dashboard/scans/new'
  },
  {
    title: 'Activate outreach',
    description: 'Turn on AI email + SMS cadences so the free HOT leads book on your calendar.',
    action: 'Open Growth module',
    target: '/dashboard/growth'
  }
];

const WelcomeCelebration = ({ reward, onDismiss }) => {
  const giftCopy = useMemo(() => {
    if (!reward) return { leadCredits: 0, wallet: 0 };
    return {
      leadCredits: reward.gift_leads_awarded ?? 0,
      wallet: reward.gift_credits_awarded ?? 0
    };
  }, [reward]);

  const handleNavigate = (href) => {
    if (href) {
      window.location.assign(href);
    }
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-slate-900/75 backdrop-blur-sm" onClick={onDismiss} />
      <div className="relative max-w-3xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden animate-fade-in">
        <div className="absolute inset-x-0 -top-24 h-48 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-pink-500 to-purple-600 opacity-80 blur-3xl" />
        </div>
        <div className="relative px-8 pt-12 pb-8">
          <div className="flex items-center gap-3 text-amber-500 uppercase tracking-wide text-xs font-semibold">
            <Sparkles className="w-4 h-4" />
            Welcome to Fish Mouth AI
          </div>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-slate-900">
            Three HOT leads + wallet boost unlocked!
          </h2>
          <p className="mt-2 text-slate-600 text-sm sm:text-base max-w-2xl">
            We just dropped {giftCopy.leadCredits || 3} prioritized homeowners and ${giftCopy.wallet || 150} in campaign credits into your account.
            You’ll see them in your wallet and Growth module right away.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-5">
              <Gift className="w-8 h-8 text-amber-500" />
              <h3 className="mt-3 text-lg font-semibold text-amber-900">{giftCopy.leadCredits || 3}x HOT leads</h3>
              <p className="mt-2 text-sm text-amber-800">Instantly claimable in Growth → "Gift Leads" tab.</p>
            </div>
            <div className="rounded-2xl border border-purple-200 bg-purple-50/70 px-4 py-5">
              <Trophy className="w-8 h-8 text-purple-500" />
              <h3 className="mt-3 text-lg font-semibold text-purple-900">${giftCopy.wallet || 150} wallet credit</h3>
              <p className="mt-2 text-sm text-purple-800">Covers SmartScans, AI calls, and replacement quotas.</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-5">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
              <h3 className="mt-3 text-lg font-semibold text-emerald-900">Compliance ready</h3>
              <p className="mt-2 text-sm text-emerald-800">Consent logs + do-not-contact gates are already configured.</p>
            </div>
          </div>

          <div className="mt-10">
            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Next steps</h4>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {STEP_CARDS.map((step) => (
                <button
                  key={step.title}
                  onClick={() => handleNavigate(step.target)}
                  className="group h-full rounded-2xl border border-slate-200 bg-white px-4 py-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between text-slate-400 text-xs uppercase tracking-wide">
                    <span>Step</span>
                    <ArrowRight className="w-4 h-4 transition group-hover:translate-x-1" />
                  </div>
                  <h5 className="mt-2 text-lg font-semibold text-slate-900">{step.title}</h5>
                  <p className="mt-2 text-sm text-slate-600">{step.description}</p>
                  <span className="mt-3 inline-flex items-center text-sm font-medium text-blue-600">
                    {step.action}
                    <ArrowRight className="ml-1 w-4 h-4" />
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={onDismiss}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800"
            >
              Let’s go build!
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeCelebration;
