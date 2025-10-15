/**
 * DemoDashboardStepper.jsx
 * Scroll-friendly stepper that also allows manual next/prev.
 * As you scroll into view, it auto-advances per section height; progress bar fills; images slide in.
 */
import React, { useEffect, useRef, useState } from 'react';
import '../brand/brand_tokens.css';
import { gsap, ScrollTrigger } from '../utils/gsapSetup';

export function DemoDashboardStepper({ steps = [] }) {
  const [idx, setIdx] = useState(0);
  const hostRef = useRef(null);

  function next(){ setIdx(i => Math.min(i+1, steps.length-1)); }
  function prev(){ setIdx(i => Math.max(i-1, 0)); }

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top 60%',
      end: 'bottom top',
      onEnter: () => {},
      onUpdate: (self) => {
        const p = self.progress; // 0..1
        const which = Math.floor(p * steps.length);
        setIdx(Math.max(0, Math.min(which, steps.length-1)));
      }
    });
    return () => st.kill();
  }, [steps.length]);

  useEffect(() => {
    const media = document.querySelector('.step-media');
    if (media) {
      gsap.fromTo(media, { x: 40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, ease: 'power2.out' });
    }
  }, [idx]);

  const step = steps[idx] || {};
  return (
    <section className="stepper" ref={hostRef} aria-label="Demo dashboard walkthrough">
      <div className="stepper-head">
        <div style={{fontWeight:700}}>Live Dashboard Demo</div>
        <div className="progress" aria-label="Progress"><i style={{'--step': (idx/(steps.length-1) * 6) } as any}></i></div>
        <div style={{fontSize:12, color:'var(--fm-muted)'}}>{idx+1} / {steps.length}</div>
      </div>
      <div className="step-slide">
        <div className="step-media">
          <img src={step.image} alt={step.title} style={{width:'100%', height:'100%', objectFit:'cover'}} />
        </div>
        <div className="step-text">
          <h3>{step.title}</h3>
          <p>{step.copy}</p>
          <div className="step-nav">
            <button className="step-btn" onClick={prev} aria-label="Previous">Previous</button>
            <button className="step-btn" onClick={next} aria-label="Next">Next</button>
          </div>
        </div>
      </div>
    </section>
  );
}
