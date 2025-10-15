import React, { useEffect, useState } from 'react';
import { resolveGeo, humanizeLocation } from '../../lib/marketing/geo';

export default function Hero({ onCTAClick }) {
  const [geo, setGeo] = useState(null);

  useEffect(() => {
    resolveGeo().then(setGeo).catch(() => setGeo(null));
  }, []);

  const loc = humanizeLocation(geo);

  return (
    <section className="relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="inline-flex items-center text-xs uppercase tracking-wide px-2 py-1 rounded-full border mb-3">
              Built for roofers • Personalized for {loc}
            </div>
            <h1 className="text-3xl md:text-5xl font-semibold leading-tight">
              Roof leads in {loc} that <span className="underline underline-offset-4">actually pick up</span>.
            </h1>
            <p className="mt-4 text-lg opacity-80">
              Get <b>25 free HOT leads</b> today. Each comes with proof—satellite/street imagery overlays, verified contacts,
              and auto follow-ups so you spend time installing, not chasing.
            </p>
            <div className="mt-6 flex gap-3">
              <a href="/signup" onClick={onCTAClick} className="px-4 py-2 bg-black text-white rounded">Get 25 Free Leads</a>
              <a href="#demo" className="px-4 py-2 border rounded">See Demo</a>
            </div>
            <p className="mt-2 text-xs opacity-60">No credit card required • Cancel anytime</p>
          </div>
          <div className="relative">
            <div className="rounded-xl border shadow-sm overflow-hidden bg-white">
              <img src="/marketing/hero/hero-dashboard.png" alt="Fish Mouth demo" className="w-full" />
            </div>
            <div className="absolute -bottom-6 -left-6 hidden md:block">
              <img src="/marketing/hero/overlay.png" alt="Overlay" className="w-40 opacity-90" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
