import React, { useMemo } from 'react';

const VARIABLE_GROUPS = [
  {
    label: 'Company',
    items: [
      { key: 'company.name', label: 'Company name' },
      { key: 'company.phone', label: 'Company phone' },
      { key: 'company.email', label: 'Company email' },
      { key: 'company.website', label: 'Company website' },
      { key: 'company.address', label: 'Company address' },
    ],
  },
  {
    label: 'Branding',
    items: [
      { key: 'branding.primaryColor', label: 'Primary color' },
      { key: 'branding.secondaryColor', label: 'Secondary color' },
      { key: 'branding.accentColor', label: 'Accent color' },
    ],
  },
  {
    label: 'Lead',
    items: [
      { key: 'lead.name', label: 'Homeowner name' },
      { key: 'lead.address', label: 'Lead address' },
      { key: 'lead.city', label: 'Lead city' },
      { key: 'lead.state', label: 'Lead state' },
      { key: 'lead.roof_age_years', label: 'Roof age (years)' },
    ],
  },
];

export default function VariablePicker({ onSelect, businessProfile, lead, className = '' }) {
  const available = useMemo(() => VARIABLE_GROUPS, []);

  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-3 shadow-sm ${className}`}>
      <div className="text-xs font-semibold text-gray-600 mb-2">Insert variable</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {available.map((group) => (
          <div key={group.label}>
            <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">{group.label}</div>
            <div className="space-y-1">
              {group.items.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onSelect && onSelect(`{{${item.key}}}`)}
                  className="w-full text-left px-2 py-1.5 rounded-md text-sm hover:bg-gray-50 border border-gray-200"
                  title={item.key}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}





