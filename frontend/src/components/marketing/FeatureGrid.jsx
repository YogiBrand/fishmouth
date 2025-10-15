import React from 'react';
import features from '../../data/marketing/features.json';

export default function FeatureGrid() {
  return (
    <section className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold mb-6">Everything roofers need—no fluff</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <div key={i} className="border rounded p-4 bg-white">
              <div className="text-2xl mb-2">{f.icon}</div>
              <div className="font-semibold">{f.title}</div>
              <div className="opacity-80 text-sm mt-1">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
