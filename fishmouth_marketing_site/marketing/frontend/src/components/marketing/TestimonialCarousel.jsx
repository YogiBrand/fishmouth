import React from 'react';
import items from '../../data/marketing/testimonials.json' assert { type: 'json' };

export default function TestimonialCarousel() {
  return (
    <section className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">What roofers say</h2>
          <span className="text-xs opacity-60">*Sample placeholders — replace with real customers</span>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {items.map((t, i) => (
            <div key={i} className="border rounded p-4 bg-white">
              <div className="flex items-center gap-3 mb-2">
                <img src={t.logo} alt="logo" className="h-6 w-6" />
                <div className="text-sm opacity-80">{t.company} • {t.location}</div>
              </div>
              <div className="text-sm">“{t.quote}”</div>
              <div className="text-xs opacity-70 mt-2">— {t.name}, {t.role}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
