import React from 'react';

export default function LeadCard({ lead, onCall, onSms, onReport, onEnroll }) {
  return (
    <div className="border rounded p-3">
      <div className="font-semibold">{lead.address}</div>
      <div className="text-sm opacity-70">{lead.owner}</div>
      <div className="mt-2 flex gap-3 text-sm">
        <span>Priority: <b>{lead.priority}</b></span>
        <span>Confidence: <b>{lead.confidence}</b></span>
        <span>Roof age: <b>{lead.roof_age || '—'}</b></span>
      </div>
      <div className="mt-3 flex gap-2">
        <button className="px-2 py-1 border rounded" onClick={() => onCall?.(lead)}>Call</button>
        <button className="px-2 py-1 border rounded" onClick={() => onSms?.(lead)}>SMS</button>
        <button className="px-2 py-1 border rounded" onClick={() => onReport?.(lead)}>Report</button>
        <button className="px-2 py-1 border rounded" onClick={() => onEnroll?.(lead)}>Enroll</button>
      </div>
    </div>
  );
}
