/**
 * FeatureSections.jsx
 * Simple grid features with subtle hover lift and scroll reveal.
 */
import React, { useEffect, useRef } from 'react';
import '../brand/brand_tokens.css';
import { gsap, ScrollTrigger } from '../utils/gsapSetup';

export function FeatureSections({ items = [] }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const cards = el.querySelectorAll('.feature-card');
    cards.forEach((c, i) => {
      gsap.fromTo(c, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'power2.out', delay: i*0.05,
        scrollTrigger: { trigger: c, start: 'top 90%' }
      });
    });
  }, [items.length]);
  return (
    <section className="fm-container">
      <div ref={ref} className="features">
        {items.map((x, i) => (
          <article key={i} className="feature-card">
            <h4>{x.title}</h4>
            <p>{x.desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
