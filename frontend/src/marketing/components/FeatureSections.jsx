/**
 * FeatureSections.jsx — multi-column feature grid with gentle scroll animation.
 */
import React, { useEffect, useRef } from 'react';
import '../brand/brand_tokens.css';
import { getGSAP } from '../utils/gsapSetup';

const { gsap } = getGSAP();

export function FeatureSections({ items = [] }) {
  const wrapRef = useRef(null);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray('.feature-card');
      cards.forEach((card, index) => {
        gsap.fromTo(
          card,
          { y: 24, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.7,
            ease: 'power2.out',
            delay: index * 0.05,
            scrollTrigger: {
              trigger: card,
              start: 'top 90%',
            },
          }
        );
      });
    }, wrapRef);

    return () => ctx.revert();
  }, [items.length]);

  return (
    <section className="fm-container" ref={wrapRef}>
      <div className="features">
        {items.map((item, index) => (
          <article key={index} className="feature-card">
            {item.icon && (
              <div className="fm-feature-ribbon__badge" aria-hidden="true">
                <span style={{ fontSize: 18 }}>{item.icon}</span>
              </div>
            )}
            <h4 style={{ marginTop: item.icon ? 0 : undefined }}>{item.title}</h4>
            <p>{item.desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
