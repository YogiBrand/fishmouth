import React from 'react';
export default function LeadCard({lead}){
  return (
    <div className="rounded border p-3">
      <div className="font-medium">{lead.address}</div>
      <div className="text-xs text-gray-600">{lead.owner}</div>
      <div className="text-xs mt-1">Priority: <b>{lead.priority}</b> • Confidence: {lead.confidence}</div>
      <div className="text-xs">Reasons: {(lead.reasons||[]).join(', ')}</div>
      <div className="mt-2 space-x-2">
        <button className="btn-sm">Call</button>
        <button className="btn-sm">SMS</button>
        <button className="btn-sm">Report</button>
      </div>
    </div>
  )
}
