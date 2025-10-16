import React from 'react';

const QUICK = [
  { key: 'getting_started', label: 'Getting Started', text: 'Help me get started with Fish Mouth features.' },
  { key: 'lead_generation', label: 'Lead Generation', text: 'How do I find and qualify roofing leads?' },
  { key: 'billing', label: 'Billing & Payments', text: 'Questions about billing, credits, or refunds.' },
  { key: 'technical', label: 'Technical Support', text: 'I am encountering an error or broken behavior.' },
  { key: 'account', label: 'Account Settings', text: 'Where can I update my settings and preferences?' },
];

export default function QuickActions({ onSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      {QUICK.map((q) => (
        <button
          key={q.key}
          type="button"
          onClick={() => onSelect?.(q.key, q.text)}
          className="px-2.5 py-1.5 rounded-xl text-xs border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800"
        >
          {q.label}
        </button>
      ))}
    </div>
  );
}


