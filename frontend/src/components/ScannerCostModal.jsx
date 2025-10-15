import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

const ScannerCostModal = ({
  open,
  onClose,
  onConfirm,
  costEstimate,
  title = 'Confirm scan enrichment cost',
  description = 'Review the projected spend for imagery, enrichment, and outreach before proceeding.',
}) => {
  if (!open) return null;

  const { imagery = 0, enrichment = 0, outreach_budget: outreach = 0, total = 0 } = costEstimate || {};

  const rows = [
    { label: 'Imagery & tiles', value: imagery },
    { label: 'Data enrichment', value: enrichment },
    { label: 'Outreach budget placeholder', value: outreach },
  ];

  const formatCurrency = (value) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle className="h-4 w-4" />
            <span>Charges post directly to your wallet. Confirm the spend to proceed.</span>
          </div>

          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between text-sm">
                <span className="text-slate-500">{row.label}</span>
                <span className="font-medium text-slate-900">{formatCurrency(row.value)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base font-semibold text-slate-900">
              <span>Total projected</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Confirm & Enrich
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScannerCostModal;
