/**
 * GalleryScroller.jsx
 * Horizontal gallery inspired by jitter.video's large horizontal scroll.
 * Uses GSAP ScrollTrigger to pin the viewport and update a CSS variable --progress (0..N-1 translated into 0..100% track move).
 * Each card can show an image (dashboard screen) and an overlay describing the feature.
 */
import React, { useRef, useEffect } from 'react';
import '../brand/brand_tokens.css';
import { getGSAP } from '../utils/gsapSetup';

const { gsap, ScrollTrigger } = getGSAP();

export function GalleryScroller({ slides = [] }) {
  const wrapRef = useRef(null);
  const trackRef = useRef(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    if (!wrap || !track) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const panels = slides.length;
    const totalShift = panels > 1 ? (panels - 1) * 100 : 0;

    gsap.set(track, { xPercent: 0 });
    const trigger = ScrollTrigger.create({
      trigger: wrap,
      start: 'top top',
      end: () => '+=' + window.innerHeight * panels * 0.9,
      scrub: true,
      pin: true,
      snap: panels > 1 ? { snapTo: 1 / (panels - 1), duration: 0.4, ease: 'power1.inOut' } : false,
      onUpdate(self) {
        const progress = self.progress;
        const x = -progress * totalShift;
        track.style.setProperty('--progress', progress.toString());
        gsap.set(track, { xPercent: x });
      },
    });

    return () => trigger.kill();
  }, [slides.length]);

  return (
    <section className="gallery-wrap" ref={wrapRef}>
      <div className="gallery-sticky">
        <div className="gallery-track" ref={trackRef}>
          {slides.map((s, i) => (
            <article className="gallery-card" key={i} aria-label={s.title}>
              <img className="gallery-media" src={s.image} alt={s.title} loading="lazy" />
              <div className="gallery-overlay">
                <span className="badge">{s.badge || 'Feature'}</span>
                <div>
                  <div style={{fontWeight:600}}>{s.title}</div>
                  <div style={{fontSize:14, color:'var(--fm-muted)'}}>{s.subtitle}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
