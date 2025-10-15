import React from 'react';
import items from '../../data/marketing/objections.json';

export default function Objections() {
  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold mb-4">Common questions—answered</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {items.map((it, i) => (
            <div key={i} className="border rounded p-4">
              <div className="font-semibold">{it.q}</div>
              <div className="opacity-80 text-sm mt-1">{it.a}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
