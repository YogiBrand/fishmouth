import React from 'react';
export default function CallLogPanel({call}){
  return (
    <div className="space-y-3">
      <div className="rounded border p-3">
        <div className="flex justify-between">
          <div>
            <div className="font-semibold">Outcome: {call.outcome || '—'}</div>
            <div className="text-xs text-gray-600">Duration: {call.duration}s • Talk/Listen: {call.talkRatio}</div>
          </div>
          <div className="text-xs text-gray-500">Sentiment: {call.sentiment}</div>
        </div>
        <div className="mt-2">
          <div className="font-medium text-sm">Key moments</div>
          <ul className="list-disc ml-5 text-xs">
            {(call.keyMoments||[]).map((m,i)=>(<li key={i}>{m.time}s — {m.label}</li>))}
          </ul>
        </div>
        <div className="mt-2">
          <div className="font-medium text-sm">Next actions</div>
          <div className="space-x-2">
            <button className="btn-sm">Book Follow-up</button>
            <button className="btn-sm">Send SMS Summary</button>
          </div>
        </div>
      </div>
      <div className="rounded border p-3">
        <div className="font-medium text-sm mb-1">Transcript</div>
        <pre className="text-xs whitespace-pre-wrap">{call.transcript || '—'}</pre>
      </div>
    </div>
  )
}
