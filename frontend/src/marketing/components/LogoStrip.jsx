import React, { useEffect, useRef } from 'react';
import '../brand/brand_tokens.css';
import { getGSAP } from '../utils/gsapSetup';

const { gsap } = getGSAP();

const roofingLogos = [
  'Blue Ridge Roofing',
  'Skyline Restoration',
  'Prairie Peak',
  'Atlantic Shingle Co.',
  'Copper Crown',
  'Evergreen Exteriors',
  'Summit Ridge Roofing',
  'Sunbelt Roof Pros',
];

export function LogoStrip() {
  const wrapRef = useRef(null);

  useEffect(() => {
    const prefersReduced = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.fm-logos__item',
        { y: 12, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out', stagger: 0.05 }
      );
    }, wrapRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className="fm-container" ref={wrapRef} aria-label="Roofing companies using Fish Mouth">
      <div className="fm-logos">
        <div className="fm-logos__headline">Trusted by roofing teams across the U.S.</div>
        {roofingLogos.map((name) => (
          <span key={name} className="fm-logos__item">{name}</span>
        ))}
      </div>
    </section>
  );
}
