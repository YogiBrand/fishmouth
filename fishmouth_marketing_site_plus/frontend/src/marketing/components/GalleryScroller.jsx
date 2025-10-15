/**
 * GalleryScroller.jsx
 * Horizontal gallery inspired by jitter.video's large horizontal scroll.
 * Uses GSAP ScrollTrigger to pin the viewport and update a CSS variable --progress (0..N-1 translated into 0..100% track move).
 * Each card can show an image (dashboard screen) and an overlay describing the feature.
 */
import React, { useRef, useEffect } from 'react';
import '../brand/brand_tokens.css';
import { gsap, ScrollTrigger } from '../utils/gsapSetup';

export function GalleryScroller({ slides = [] }) {
  const wrapRef = useRef(null);
  const trackRef = useRef(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    if (!wrap || !track) return;

    // Set width in "panels" so progress is (panels - 1)
    const panels = slides.length;
    const totalShift = (panels - 1) * 100; // percent

    gsap.set(track, { xPercent: 0 });
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: wrap,
        start: 'top top',
        end: () => '+=' + (window.innerHeight * 1.5 + panels * 200),
        scrub: true,
        pin: true,
        onUpdate(self) {
          const p = self.progress; // 0..1
          const x = -p * totalShift;
          track.style.setProperty('--progress', (p * (panels-1)).toString());
          gsap.to(track, { xPercent: x, duration: 0.1, ease: 'none' });
        }
      }
    });

    return () => tl.scrollTrigger && tl.scrollTrigger.kill();
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
