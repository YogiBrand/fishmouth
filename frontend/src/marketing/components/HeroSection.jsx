import React, { useEffect, useRef } from 'react';
import '../brand/brand_tokens.css';
import { getGSAP } from '../utils/gsapSetup';

const { gsap } = getGSAP();

const stats = [
  { value: '25', suffix: ' gifted', label: 'HOT leads to start' },
  { value: '87%', label: 'average close rate on proof-first leads' },
  { value: '12 min', label: 'from report sent to inspection booked' },
];

export function HeroSection({ city = 'your area' }) {
  const heroRef = useRef(null);

  useEffect(() => {
    const prefersReduced = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.fm-hero__copy > *',
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', stagger: 0.08 }
      );
      gsap.fromTo(
        '.fm-hero__preview',
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: 'power3.out', delay: 0.2 }
      );
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className="fm-container fm-hero" ref={heroRef}>
      <div className="fm-hero__grid">
        <div className="fm-hero__copy">
          <span className="fm-pill">Localized for {city}</span>
          <h1>Roof leads in {city} that actually pick up.</h1>
          <p>
            Fish Mouth surfaces the roofs most likely to need work, sends a proof-first report homeowners
            trust, and follows up with AI voice, SMS, and email so you spend time installing—not chasing.
          </p>
          <div className="fm-hero__actions">
            <a className="fm-cta" href="/signup">Get 3 free HOT leads</a>
            <a className="fm-nav-button fm-nav-button--ghost" href="#demo">See how it works</a>
          </div>
          <div className="fm-hero__stats" aria-label="Key metrics">
            {stats.map((item) => (
              <div key={item.label} className="fm-stat">
                <div className="fm-stat__value">
                  {item.value}
                  {item.suffix ? <span style={{ fontSize: 16, marginLeft: 4 }}>{item.suffix}</span> : null}
                </div>
                <div className="fm-stat__label">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="fm-hero__media">
          <div className="fm-hero__preview">
            <div>
              <strong>Live dashboard preview</strong>
              <p style={{ color: 'var(--fm-muted)', margin: '6px 0 0' }}>
                Scroll down for the interactive walkthrough. Replace this placeholder with your actual dashboard capture.
              </p>
            </div>
            <img
              src="https://images.unsplash.com/photo-1523419409543-0c1df022bdd1?auto=format&fit=crop&w=1200&q=80"
              alt="Placeholder dashboard preview"
              loading="lazy"
            />
            <div className="fm-hero__preview-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--fm-muted)', fontSize: 13 }}>Demo mode • real metrics when you sign in</span>
              <span className="fm-pill">AI-assisted follow-up</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
