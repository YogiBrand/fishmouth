import React, { useMemo, useState } from 'react';
import {
  MapPin,
  Sparkles,
  Compass,
  FileText,
  CheckCircle,
  Loader2,
  Target,
  ClipboardList,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { leadAPI } from '../services/api';

const STEP_FLOW = [
  {
    id: 'location',
    title: 'Property',
    description: 'Pinpoint the exact rooftop we should analyze.',
    icon: MapPin,
  },
  {
    id: 'playbook',
    title: 'Deliverables',
    description: 'Pick the assets and depth you want generated.',
    icon: ClipboardList,
  },
  {
    id: 'review',
    title: 'Launch',
    description: 'Confirm details and run the SmartScan.',
    icon: Target,
  },
];

const DELIVERABLE_OPTIONS = [
  {
    id: 'roof_intelligence',
    label: 'Roof imagery + scoring',
    blurb: 'Satellite capture, segmentation, heatmaps, and AI condition scoring.',
  },
  {
    id: 'homeowner_brief',
    label: 'Homeowner brief',
    blurb: 'Plain-language summary and talking points for the homeowner.',
  },
  {
    id: 'sales_kit',
    label: 'Sales kit assets',
    blurb: 'Slides, before/after imagery, and insurer-ready evidence snippets.',
  },
  {
    id: 'follow_up_sequence',
    label: 'Follow-up sequence draft',
    blurb: 'AI-crafted call, SMS, and email cadence tailored to this roof.',
  },
];

const CONTENT_TIERS = [
  {
    value: 'standard',
    label: 'Standard',
    blurb: 'Fast turn, core imagery, and lead scoring for quick validation.',
  },
  {
    value: 'premium',
    label: 'Premium',
    blurb: 'Balanced depth with street view context and AI homeowner brief.',
  },
  {
    value: 'maximal',
    label: 'Maximal',
    blurb: 'Full dossier, sales kit assets, and outreach playbook in one pass.',
  },
];

const buildInputClass = (isDark) =>
  isDark
    ? 'w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-900/80 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
    : 'w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

const ManualAddressWizard = ({ isDark = false, theme = {}, onLeadCreated }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState({
    address1: '',
    address2: '',
    city: '',
    state: '',
    postalCode: '',
  });
  const [preferences, setPreferences] = useState({
    includeStreetView: true,
    includeAIBrief: true,
    includeSalesAssets: true,
    contentTier: 'premium',
  });
  const [deliverables, setDeliverables] = useState({
    roof_intelligence: true,
    homeowner_brief: true,
    sales_kit: true,
    follow_up_sequence: false,
  });
  const [notes, setNotes] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const panelClass =
    theme.panel ||
    (isDark
      ? 'bg-slate-900/80 backdrop-blur rounded-3xl border border-slate-800 shadow-xl'
      : 'bg-white rounded-3xl border border-gray-200 shadow-sm');
  const headingClass = theme.heading || (isDark ? 'text-white' : 'text-gray-900');
  const mutedClass = theme.muted || (isDark ? 'text-slate-400' : 'text-gray-500');
  const badgeClass = isDark
    ? 'bg-blue-500/15 text-blue-200 border border-blue-500/20'
    : 'bg-blue-50 text-blue-600 border border-blue-100';
  const toggleActiveClass = isDark
    ? 'bg-blue-500/15 border border-blue-500/30 text-blue-200'
    : 'bg-blue-50 border border-blue-200 text-blue-700';
  const toggleInactiveClass = isDark
    ? 'bg-slate-900/60 border border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
    : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300';
  const inputClass = buildInputClass(isDark);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }),
    []
  );

  const canAdvanceLocation = useMemo(() => {
    if (!form.address1 || form.address1.trim().length < 4) {
      return false;
    }
    const hasCityState = Boolean(form.city.trim()) && Boolean(form.state.trim());
    const hasPostal = Boolean(form.postalCode.trim());
    return hasCityState || hasPostal;
  }, [form.address1, form.city, form.state, form.postalCode]);

  const addressPreview = useMemo(() => {
    return [form.address1, form.address2, form.city, form.state, form.postalCode]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(', ');
  }, [form.address1, form.address2, form.city, form.state, form.postalCode]);

  const handleFormChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleDeliverable = (id) => {
    setDeliverables((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const parsedTags = tagInput
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean);

    const payload = {
      address_line1: form.address1.trim(),
      address_line2: form.address2.trim() || undefined,
      city: form.city.trim() || undefined,
      state: form.state.trim() || undefined,
      postal_code: form.postalCode.trim() || undefined,
      preferences: {
        include_street_view: preferences.includeStreetView,
        include_ai_brief: preferences.includeAIBrief,
        include_sales_assets: preferences.includeSalesAssets,
        content_tier: preferences.contentTier,
      },
      deliverables,
      tags: parsedTags,
      notes: notes.trim() || undefined,
    };

    try {
      const response = await leadAPI.createManualLead(payload);
      setResult(response);
      onLeadCreated?.(response);
      setActiveStep(STEP_FLOW.length - 1);
    } catch (err) {
      console.error('manual lead creation failed', err);
      const detail =
        err?.response?.data?.detail ||
        err?.message ||
        'Unable to generate the manual SmartScan right now.';
      setError(detail);
      toast.error(detail);
    } finally {
      setSubmitting(false);
    }
  };

  const resetWizard = () => {
    setResult(null);
    setError(null);
    setActiveStep(0);
    setSubmitting(false);
  };

  const renderStepHeader = () => (
    <div className="flex items-start justify-between gap-4">
      <div>
        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${badgeClass}`}>
          <Sparkles className="h-3.5 w-3.5" />
          Instant Manual SmartScan
        </span>
        <h2 className={`mt-4 text-2xl font-bold tracking-tight ${headingClass}`}>
          Address Lookup & Lead Generation
        </h2>
        <p className={`mt-2 text-sm ${mutedClass}`}>
          Drop in a target property and we will run the same AI stack that powers area scans—scoring,
          imagery, human-ready briefs, and follow-up orchestration.
        </p>
      </div>
      <div
        className={`hidden md:flex h-14 w-14 items-center justify-center rounded-2xl ${badgeClass} text-blue-500 dark:text-blue-200`}
      >
        <Compass className="h-6 w-6" />
      </div>
    </div>
  );

  const renderStepper = () => (
    <ol className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {STEP_FLOW.map((step, index) => {
        const Icon = step.icon;
        const isActive = index === activeStep;
        const isComplete = index < activeStep || (result && index === STEP_FLOW.length - 1);
        return (
          <li
            key={step.id}
            className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${
              isActive || isComplete
                ? toggleActiveClass
                : isDark
                ? 'border-slate-800 bg-slate-900/60 text-slate-300'
                : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            <div
              className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border ${
                isActive || isComplete
                  ? 'border-blue-500 bg-blue-500/10 text-blue-500 dark:text-blue-200'
                  : isDark
                  ? 'border-slate-700 bg-slate-900 text-slate-500'
                  : 'border-slate-200 bg-slate-50 text-slate-400'
              }`}
            >
              {isComplete ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </div>
            <div>
              <p className={`text-sm font-semibold ${headingClass}`}>{step.title}</p>
              <p className={`text-xs ${mutedClass}`}>{step.description}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );

  const renderLocationStep = () => (
    <div className="mt-6 space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <label className={`text-xs font-semibold uppercase tracking-wide ${mutedClass}`}>
            Address line 1
          </label>
          <input
            type="text"
            value={form.address1}
            onChange={(event) => handleFormChange('address1', event.target.value)}
            placeholder="123 Main Street"
            className={inputClass}
            autoComplete="address-line1"
          />
        </div>
        <div className="space-y-1.5">
          <label className={`text-xs font-semibold uppercase tracking-wide ${mutedClass}`}>
            Address line 2 (optional)
          </label>
          <input
            type="text"
            value={form.address2}
            onChange={(event) => handleFormChange('address2', event.target.value)}
            placeholder="Suite or unit"
            className={inputClass}
            autoComplete="address-line2"
          />
        </div>
        <div className="space-y-1.5">
          <label className={`text-xs font-semibold uppercase tracking-wide ${mutedClass}`}>City</label>
          <input
            type="text"
            value={form.city}
            onChange={(event) => handleFormChange('city', event.target.value)}
            placeholder="City"
            className={inputClass}
            autoComplete="address-level2"
          />
        </div>
        <div className="space-y-1.5">
          <label className={`text-xs font-semibold uppercase tracking-wide ${mutedClass}`}>State</label>
          <input
            type="text"
            value={form.state}
            onChange={(event) => handleFormChange('state', event.target.value.toUpperCase())}
            placeholder="State"
            className={inputClass}
            autoComplete="address-level1"
            maxLength={2}
          />
        </div>
        <div className="space-y-1.5">
          <label className={`text-xs font-semibold uppercase tracking-wide ${mutedClass}`}>
            ZIP / Postal code
          </label>
          <input
            type="text"
            value={form.postalCode}
            onChange={(event) => handleFormChange('postalCode', event.target.value)}
            placeholder="ZIP"
            className={inputClass}
            autoComplete="postal-code"
          />
        </div>
      </div>

      <div className={`rounded-2xl border px-4 py-3 text-sm ${badgeClass}`}>
        <p className="font-semibold">
          <MapPin className="mr-2 inline h-4 w-4" />
          We will auto-geocode and align imagery to{' '}
          <span className="font-semibold">{addressPreview || 'your target address'}</span>.
        </p>
        <p className={`mt-1 text-xs ${mutedClass}`}>
          If coordinates are ambiguous we will pick the highest-confidence match based on city/state.
        </p>
      </div>
    </div>
  );

  const renderDeliverablesStep = () => (
    <div className="mt-6 space-y-5">
      <div>
        <p className={`text-sm font-semibold ${headingClass}`}>What should we generate?</p>
        <p className={`text-xs ${mutedClass}`}>Toggle on the assets you want in this manual run.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {DELIVERABLE_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => toggleDeliverable(option.id)}
            className={`flex h-full flex-col items-start gap-2 rounded-2xl p-4 text-left transition border ${
              deliverables[option.id] ? toggleActiveClass : toggleInactiveClass
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-semibold">{option.label}</span>
            </div>
            <p className={`text-xs leading-relaxed ${mutedClass}`}>{option.blurb}</p>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <p className={`text-sm font-semibold ${headingClass}`}>Content depth</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {CONTENT_TIERS.map((tier) => (
            <button
              key={tier.value}
              type="button"
              onClick={() =>
                setPreferences((prev) => ({
                  ...prev,
                  contentTier: tier.value,
                }))
              }
              className={`flex h-full flex-col items-start gap-2 rounded-2xl border p-4 text-left transition ${
                preferences.contentTier === tier.value ? toggleActiveClass : toggleInactiveClass
              }`}
            >
              <span className="text-sm font-semibold">{tier.label}</span>
              <p className={`text-xs leading-relaxed ${mutedClass}`}>{tier.blurb}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={preferences.includeStreetView}
            onChange={(event) =>
              setPreferences((prev) => ({
                ...prev,
                includeStreetView: event.target.checked,
              }))
            }
            className="h-4 w-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
          />
          <span className={`text-sm ${mutedClass}`}>Include street-view capture and curbside quality check</span>
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={preferences.includeAIBrief}
            onChange={(event) =>
              setPreferences((prev) => ({
                ...prev,
                includeAIBrief: event.target.checked,
              }))
            }
            className="h-4 w-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
          />
          <span className={`text-sm ${mutedClass}`}>Generate a homeowner-ready AI brief</span>
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={preferences.includeSalesAssets}
            onChange={(event) =>
              setPreferences((prev) => ({
                ...prev,
                includeSalesAssets: event.target.checked,
              }))
            }
            className="h-4 w-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
          />
          <span className={`text-sm ${mutedClass}`}>Bundle report assets for proposals and adjusters</span>
        </label>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="mt-6 space-y-5">
      <div className={`rounded-2xl border px-4 py-4 ${isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-50'}`}>
        <p className={`text-sm font-semibold ${headingClass}`}>Manual SmartScan summary</p>
        <dl className={`mt-3 grid grid-cols-1 gap-3 text-sm ${mutedClass} sm:grid-cols-2`}>
          <div>
            <dt className="text-xs uppercase tracking-wide">Property</dt>
            <dd className={`mt-1 font-semibold ${headingClass}`}>{addressPreview || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide">Content tier</dt>
            <dd className="mt-1 capitalize">{preferences.contentTier}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide">Deliverables</dt>
            <dd className="mt-1">
              {Object.entries(deliverables)
                .filter(([, enabled]) => enabled)
                .map(([key]) => key.replace(/_/g, ' '))
                .join(', ') || 'None selected'}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide">Enhancements</dt>
            <dd className="mt-1">
              {[
                preferences.includeStreetView ? 'Street view capture' : null,
                preferences.includeAIBrief ? 'AI homeowner brief' : null,
                preferences.includeSalesAssets ? 'Sales assets' : null,
              ]
                .filter(Boolean)
                .join(', ') || 'Baseline imagery + scoring'}
            </dd>
          </div>
        </dl>
      </div>

      <div className="space-y-1.5">
        <label className={`text-xs font-semibold uppercase tracking-wide ${mutedClass}`}>
          Internal notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Anything you want the team to know (claim context, homeowner preferences, etc.)"
          rows={3}
          className={`${inputClass} min-h-[120px]`}
        />
      </div>

      <div className="space-y-1.5">
        <label className={`text-xs font-semibold uppercase tracking-wide ${mutedClass}`}>
          Tags (comma separated, optional)
        </label>
        <input
          type="text"
          value={tagInput}
          onChange={(event) => setTagInput(event.target.value)}
          placeholder="hail-claim, priority-neighbour, referral"
          className={inputClass}
        />
      </div>

      {error && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            isDark ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {error}
        </div>
      )}
    </div>
  );

  const renderResult = () => {
    if (!result) return null;
    const { summary, next_actions: nextActions = [] } = result;
    const metrics = [
      {
        label: 'Lead score',
        value: summary?.lead_score != null ? Math.round(summary.lead_score) : '—',
      },
      {
        label: 'Priority',
        value: (summary?.priority || '').toUpperCase() || '—',
      },
      {
        label: 'Roof age',
        value: summary?.roof_age_years != null ? `${summary.roof_age_years} yrs` : '—',
      },
      {
        label: 'Property value',
        value:
          summary?.property_value != null
            ? currencyFormatter.format(summary.property_value)
            : '—',
      },
    ];

    return (
      <div className={`mt-8 rounded-3xl border p-6 ${isDark ? 'border-blue-500/30 bg-blue-500/5' : 'border-blue-100 bg-blue-50'}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                isDark ? 'bg-blue-500/20 text-blue-200' : 'bg-blue-500/10 text-blue-600'
              }`}
            >
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <p className={`text-lg font-semibold ${headingClass}`}>Manual SmartScan completed</p>
              <p className={`text-sm ${mutedClass}`}>
                {summary?.analysis_summary ||
                  'AI analysis ready. The lead, imagery, and scoring have been added to your pipeline.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={resetWizard}
              className="inline-flex items-center gap-2 rounded-xl border border-transparent bg-transparent px-4 py-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              <RefreshCw className="h-4 w-4" />
              Run another address
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className={`rounded-2xl border px-4 py-3 ${
                isDark ? 'border-slate-800 bg-slate-900/70' : 'border-slate-200 bg-white'
              }`}
            >
              <p className={`text-xs uppercase tracking-wide ${mutedClass}`}>{metric.label}</p>
              <p className={`mt-1 text-lg font-semibold ${headingClass}`}>{metric.value}</p>
            </div>
          ))}
        </div>

        {Array.isArray(summary?.damage_indicators) && summary.damage_indicators.length > 0 && (
          <div className="mt-5">
            <p className={`text-xs uppercase tracking-wide ${mutedClass}`}>Damage indicators</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {summary.damage_indicators.map((indicator) => (
                <span
                  key={indicator}
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    isDark ? 'bg-red-500/15 text-red-200' : 'bg-red-100 text-red-600'
                  }`}
                >
                  {indicator.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}

        {nextActions.length > 0 && (
          <div className="mt-6">
            <p className={`text-sm font-semibold ${headingClass}`}>Next best actions</p>
            <ul className="mt-2 space-y-2 text-sm">
              {nextActions.map((action, index) => (
                <li key={action} className={`flex gap-2 ${mutedClass}`}>
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
                  <span>
                    {index === 0 ? <strong className="font-semibold text-blue-600 dark:text-blue-200">Priority • </strong> : null}
                    {action}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`${panelClass} p-6`}>
      {renderStepHeader()}
      {renderStepper()}

      {activeStep === 0 && renderLocationStep()}
      {activeStep === 1 && renderDeliverablesStep()}
      {activeStep === 2 && renderReviewStep()}

      <div className="mt-6 flex flex-col-reverse items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-xs">
          {addressPreview ? (
            <>
              <MapPin className="h-3.5 w-3.5 text-blue-500" />
              <span className={mutedClass}>{addressPreview}</span>
            </>
          ) : (
            <>
              <FileText className="h-3.5 w-3.5 text-slate-400" />
              <span className={mutedClass}>Complete each step to unlock the manual SmartScan button.</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {activeStep > 0 && (
            <button
              type="button"
              onClick={() => setActiveStep((prev) => Math.max(prev - 1, 0))}
              className="inline-flex items-center gap-2 rounded-xl border border-transparent px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700"
            >
              Back
            </button>
          )}
          {activeStep < STEP_FLOW.length - 1 && (
            <button
              type="button"
              onClick={() => {
                if (activeStep === 0 && !canAdvanceLocation) {
                  toast.error('Provide the property address and either city/state or ZIP code.');
                  return;
                }
                setActiveStep((prev) => Math.min(prev + 1, STEP_FLOW.length - 1));
                setError(null);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            >
              Continue
              <Sparkles className="h-4 w-4" />
            </button>
          )}
          {activeStep === STEP_FLOW.length - 1 && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-blue-500/70"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running SmartScan…
                </>
              ) : (
                <>
                  Launch SmartScan
                  <Sparkles className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {renderResult()}
    </div>
  );
};

export default ManualAddressWizard;
