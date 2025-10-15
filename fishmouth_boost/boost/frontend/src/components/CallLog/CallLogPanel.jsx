import React from 'react';

export default function CallLogPanel({ call }) {
  if (!call) return null;
  return (
    <div className="border rounded p-3">
      <div className="text-sm opacity-60">Call #{call.id}</div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
        <div>Disposition: <b>{call.outcome}</b></div>
        <div>Talk/Listen: <b>{call.talk_ratio}</b></div>
        <div>Silence %: <b>{call.silence_pct}</b></div>
        <div>Sentiment: <b>{call.sentiment}</b></div>
      </div>
      <div className="mt-2">
        <div className="font-semibold">Highlights</div>
        <ul className="list-disc ml-5 text-sm">
          {call.highlights?.map((h, i) => <li key={i}>{h}</li>)}
        </ul>
      </div>
    </div>
  );
}
