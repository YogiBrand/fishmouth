import React from 'react';
import items from '../../data/marketing/case_studies.json' assert { type: 'json' };

export default function CaseStudyGrid({ limit }) {
  const list = (limit ? items.slice(0, limit) : items);
  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Case studies</h2>
          <a href="/case-studies" className="text-sm underline">See all</a>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {list.map((cs, i) => (
            <a key={i} href={"/case-studies#" + cs.slug} className="group border rounded overflow-hidden bg-white">
              <div className="aspect-video bg-gray-100">
                <img src={cs.image} alt={cs.title} className="w-full h-full object-cover" />
              </div>
              <div className="p-4">
                <div className="text-sm opacity-70">{cs.market}</div>
                <div className="font-semibold">{cs.title}</div>
                <div className="opacity-80 text-sm mt-1">{cs.summary}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
