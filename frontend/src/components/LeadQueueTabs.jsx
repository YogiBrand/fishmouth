import React, { useMemo, useState } from 'react';

const columnDefinitions = {
  address: {
    label: 'Address',
    render: (lead) => (
      <div>
        <div className="font-medium text-sm">{lead.address || 'Unknown address'}</div>
        <div className="text-xs text-gray-500 dark:text-slate-400">
          {[lead.city, lead.state, lead.zip].filter(Boolean).join(', ') || '—'}
        </div>
      </div>
    ),
  },
  owner: {
    label: 'Owner',
    render: (lead) => (
      <div className="text-sm font-medium text-gray-900 dark:text-white">{lead.name || '—'}</div>
    ),
  },
  verified_contacts: {
    label: 'Contacts',
    render: (lead) => (
      <div className="flex gap-1">
        {(lead.contacts || []).map((contact) => (
          <span
            key={contact}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
          >
            {contact}
          </span>
        ))}
        {!(lead.contacts || []).length ? <span className="text-xs text-gray-400">—</span> : null}
      </div>
    ),
  },
  roof_age: {
    label: 'Roof Age',
    render: (lead) => (
      <span className="text-sm text-gray-700 dark:text-slate-200">
        {lead.roof_age_years != null ? `${Math.round(lead.roof_age_years)} yrs` : '—'}
      </span>
    ),
  },
  priority: {
    label: 'Priority',
    render: (lead) => (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-500">
        {lead.lead_score?.toFixed ? Math.round(lead.lead_score) : lead.lead_score || 0}{' '}
        {lead.priority ? `(${lead.priority.toUpperCase()})` : ''}
      </span>
    ),
  },
  confidence: {
    label: 'Confidence',
    render: (lead) => {
      if (lead.confidence == null) {
        return <span className="text-sm text-gray-700 dark:text-slate-200">—</span>;
      }
      const numeric = Number(lead.confidence);
      if (Number.isNaN(numeric)) {
        return <span className="text-sm text-gray-700 dark:text-slate-200">—</span>;
      }
      const percent = numeric <= 1 ? numeric * 100 : numeric;
      return <span className="text-sm text-gray-700 dark:text-slate-200">{`${Math.round(percent)}%`}</span>;
    },
  },
  reason_codes: {
    label: 'Reason',
    render: (lead) => (
      <div className="flex flex-wrap gap-1">
        {(lead.reason_codes || []).slice(0, 2).map((reason, index) => (
          <span
            key={`${lead.id}-reason-${index}`}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200"
          >
            {String(reason).replace(/_/g, ' ')}
          </span>
        ))}
        {!(lead.reason_codes || []).length ? <span className="text-xs text-gray-400">—</span> : null}
      </div>
    ),
  },
  last_activity: {
    label: 'Last Activity',
    render: (lead) => <span className="text-sm text-gray-700 dark:text-slate-200">{formatRelativeTime(lead.last_activity)}</span>,
  },
  next_step: {
    label: 'Next Step',
    render: (lead) => <span className="text-sm font-medium text-blue-600 dark:text-blue-300">{lead.next_step || '—'}</span>,
  },
};

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '—';
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days}d ago`;
  return date.toLocaleDateString();
};

const actionButtonClass = (isDark) =>
  `px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
    isDark
      ? 'bg-slate-800 text-slate-200 hover:bg-blue-600 hover:text-white'
      : 'bg-gray-100 text-gray-700 hover:bg-blue-600 hover:text-white'
  }`;

export default function LeadQueueTabs({
  tabs = [],
  leadQueue = {},
  columns = [],
  isDark = false,
  onOpenLead,
  onCallLead,
  onAssignSequence,
  onGenerateReport,
}) {
  const activeTabs = tabs.filter((tab) => leadQueue[tab.id]);
  const [activeTabId, setActiveTabId] = useState(() => activeTabs[0]?.id || null);
  const [sortDir, setSortDir] = useState('desc');

  const activeLeads = useMemo(() => {
    const current = leadQueue[activeTabId]?.leads || [];
    const sorted = [...current].sort((a, b) => {
      const diff = (a.lead_score || 0) - (b.lead_score || 0);
      return sortDir === 'asc' ? diff : -diff;
    });
    return sorted;
  }, [leadQueue, activeTabId, sortDir]);

  if (!activeTabs.length) {
    return null;
  }

  const displayedColumns = columns.length ? columns : Object.keys(columnDefinitions);

  return (
    <section className={`${isDark ? 'bg-slate-900/60 border border-slate-800' : 'bg-white border border-gray-200'} rounded-2xl`}> 
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-800">
        <div className="flex flex-wrap gap-2">
          {activeTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTabId(tab.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                tab.id === activeTabId
                  ? 'bg-blue-600 text-white shadow-sm'
                  : isDark
                  ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
              <span className="ml-1 text-[11px] font-medium">
                {(leadQueue[tab.id]?.leads || []).length}
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'))}
          className={actionButtonClass(isDark)}
        >
          Sort by priority {sortDir === 'asc' ? '↑' : '↓'}
        </button>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className={isDark ? 'bg-slate-900 text-slate-400' : 'bg-gray-50 text-gray-500'}>
            <tr>
              {displayedColumns.map((column) => (
                <th key={column} className="px-4 py-3 text-left font-semibold whitespace-nowrap">
                  {columnDefinitions[column]?.label || column}
                </th>
              ))}
              <th className="px-4 py-3 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className={isDark ? 'divide-y divide-slate-800' : 'divide-y divide-gray-100'}>
            {activeLeads.length === 0 ? (
              <tr>
                <td colSpan={displayedColumns.length + 1} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-slate-400">
                  No leads in this bucket yet.
                </td>
              </tr>
            ) : (
              activeLeads.map((lead) => (
                <tr key={lead.id} className={isDark ? 'hover:bg-slate-900/40' : 'hover:bg-blue-50/50'}>
                  {displayedColumns.map((column) => (
                    <td key={`${lead.id}-${column}`} className="px-4 py-3 align-top">
                      {columnDefinitions[column]?.render(lead) || '—'}
                    </td>
                  ))}
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={actionButtonClass(isDark)}
                        onClick={() => onOpenLead?.(lead)}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        className={actionButtonClass(isDark)}
                        onClick={() => onCallLead?.(lead)}
                      >
                        Call
                      </button>
                      <button
                        type="button"
                        className={actionButtonClass(isDark)}
                        onClick={() => onAssignSequence?.(lead)}
                      >
                        Sequence
                      </button>
                      <button
                        type="button"
                        className={actionButtonClass(isDark)}
                        onClick={() => onGenerateReport?.(lead.id, undefined, lead)}
                      >
                        Report
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
