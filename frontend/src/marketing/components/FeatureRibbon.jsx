import React, { useEffect, useRef } from 'react';
import '../brand/brand_tokens.css';
import { getGSAP } from '../utils/gsapSetup';

const { gsap } = getGSAP();

const defaultFeatures = [
  {
    icon: '🤖',
    title: 'AI voice + SMS',
    body: 'Booking calls happen automatically with compliant scripts tailored to your market tone.',
  },
  {
    icon: '🛰️',
    title: 'Proof-first reports',
    body: 'Before any pitch, homeowners see roof imagery, overlays, and next steps in plain language.',
  },
  {
    icon: '📊',
    title: 'Live ROI dashboard',
    body: 'Track inspections, installs, and revenue generated so you know exactly what Fish Mouth delivers.',
  },
];

export function FeatureRibbon({ items = defaultFeatures }) {
  const ref = useRef(null);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray('.fm-feature-ribbon__card');
      cards.forEach((card, index) => {
        gsap.fromTo(
          card,
          { y: 24, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            ease: 'power2.out',
            delay: index * 0.08,
            scrollTrigger: {
              trigger: card,
              start: 'top 85%',
            },
          }
        );
      });
    }, ref);

    return () => ctx.revert();
  }, [items]);

  return (
    <section className="fm-container" ref={ref}>
      <div className="fm-feature-ribbon">
        {items.map((item, index) => (
          <article key={index} className="fm-feature-ribbon__card">
            <div className="fm-feature-ribbon__badge" aria-hidden="true">
              <span style={{ fontSize: 18 }}>{item.icon}</span>
            </div>
            <h3 style={{ margin: '4px 0 8px' }}>{item.title}</h3>
            <p style={{ color: 'var(--fm-muted)' }}>{item.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
