import React from 'react';
export default function ScanWizard(){
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold">New Scan</h2>
      <ol className="list-decimal ml-5 text-sm space-y-2">
        <li>Choose Area: Search ZIP/City/County or draw a polygon on map.</li>
        <li>Provider & Budget: set imagery provider priority and daily cap.</li>
        <li>Filters: min roof age, property value, building type, include permits.</li>
        <li>Contacts: enable phone/email enrichment & verification.</li>
        <li>Review & Run: preview heatmap; queue the scan; see progress.</li>
      </ol>
      <div className="rounded border p-3 text-xs text-gray-600">
        <b>Note:</b> We use cached tiles first and free imagery where possible to minimize cost.
      </div>
    </div>
  )
}
