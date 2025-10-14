import React from 'react';
import { ArrowLeftCircle, Gift, History, MinusCircle, X } from 'lucide-react';

const PointsLedgerModal = ({
  onClose,
  points,
  pointsPerLead = 100,
  redeemedLeads = 0,
  onRedeem,
  pointHistory = [],
  streak = 0,
  isDark = false,
}) => {
  if (!onClose) return null;

  const canRedeem = points >= pointsPerLead;
  const container = isDark
    ? 'bg-slate-900 text-slate-100 border border-slate-800'
    : 'bg-white text-gray-900 border border-gray-200';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm px-4">
      <div className={`w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl ${container}`}>
        <div className={`px-6 py-5 border-b ${isDark ? 'border-slate-800' : 'border-gray-200'} flex items-start justify-between gap-4`}>
          <div>
            <p className="text-xs uppercase tracking-wide font-semibold flex items-center gap-2">
              <History className={isDark ? 'text-amber-300' : 'text-amber-500'} size={14} />
              Points & Rewards
            </p>
            <h3 className="text-2xl font-semibold mt-1">Free Leads Ledger</h3>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Track points earned from automation, redeem them, and watch your streak climb.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-lg transition ${
              isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            aria-label="Close points ledger"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 grid grid-cols-1 lg:grid-cols-2 gap-5 overflow-y-auto">
          <div className={`rounded-2xl border px-4 py-4 ${isDark ? 'border-slate-800 bg-slate-900/70' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold uppercase tracking-wide">Current balance</h4>
              <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Streak {streak} days</span>
            </div>
            <p className="text-3xl font-bold mt-2">{points.toLocaleString()} pts</p>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              {pointsPerLead} pts = 1 free lead credit
            </p>
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={onRedeem}
                disabled={!canRedeem}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  canRedeem
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : isDark
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Gift className="w-4 h-4" />
                Redeem free lead
              </button>
              <div className={`inline-flex items-center gap-2 px-3 py-2 text-xs rounded-lg border ${
                isDark ? 'border-slate-700 bg-slate-900/60' : 'border-gray-200 bg-white'
              }`}>
                <ArrowLeftCircle className="w-3.5 h-3.5" />
                {redeemedLeads} redeemed
              </div>
            </div>
            <p className={`text-xs mt-3 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Redeeming a free lead will automatically assign the next AI-qualified prospect to your account.
            </p>
          </div>

          <div className={`rounded-2xl border px-4 py-4 ${isDark ? 'border-slate-800 bg-slate-900/70' : 'border-gray-200 bg-white'}`}>
            <h4 className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
              <MinusCircle className="w-4 h-4 text-rose-400" />
              Point activity
            </h4>
            <div className="mt-3 space-y-2 max-h-64 overflow-y-auto pr-1 text-sm">
              {pointHistory.length === 0 && (
                <p className={`${isDark ? 'text-slate-400' : 'text-gray-500'} text-sm`}>
                  No point transactions yet. Complete actions on the dashboard to earn rewards.
                </p>
              )}
              {pointHistory.map((entry, index) => (
                <div
                  key={`${entry.timestamp}-${index}`}
                  className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 border ${
                    isDark ? 'border-slate-800 bg-slate-900/50' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{entry.reason || entry.type}</p>
                    <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      {new Date(entry.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      entry.amount >= 0
                        ? isDark
                          ? 'text-emerald-300'
                          : 'text-emerald-600'
                        : isDark
                        ? 'text-rose-300'
                        : 'text-rose-600'
                    }`}
                  >
                    {entry.amount >= 0 ? '+' : ''}
                    {entry.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PointsLedgerModal;
