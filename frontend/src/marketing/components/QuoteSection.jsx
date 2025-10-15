import React, { useEffect, useRef } from 'react';
import '../brand/brand_tokens.css';
import { getGSAP } from '../utils/gsapSetup';

const { gsap } = getGSAP();

export function QuoteSection({
  quote = '“Fish Mouth turned our backlog into booked installs. The proof-first reports mean homeowners call us before competitors even reply.”',
  author = 'Casey Marshall',
  title = 'Owner, Blue Ridge Roofing',
}) {
  const ref = useRef(null);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.fm-quote',
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
      );
    }, ref);

    return () => ctx.revert();
  }, []);

  return (
    <section className="fm-container" ref={ref}>
      <div className="fm-quote">
        <div className="fm-quote__mark" aria-hidden="true">“</div>
        <p className="fm-quote__text">{quote}</p>
        <div className="fm-quote__author">{author} • {title}</div>
      </div>
    </section>
  );
}
