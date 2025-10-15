import React from 'react';
import Navbar from '../../components/marketing/Navbar';
import Footer from '../../components/marketing/Footer';
import { useSEO } from '../../utils/seo';
import '../../marketing/brand/brand_tokens.css';
import { useMarketingTheme } from '../../marketing/hooks/useMarketingTheme';
import testimonials from '../../marketing/data/testimonials.json';

const proofPoints = [
  {
    metric: '11 roof checks',
    detail: 'booked in the first week for Blue Ridge Roofing in Charlotte',
  },
  {
    metric: '87% close rate',
    detail: 'after sending proof-first reports in Dallas / Fort Worth',
  },
  {
    metric: '4.6x ROI',
    detail: 'measured over 45 days by a three-crew operation in Seattle',
  },
];

export default function TestimonialsPage() {
  useMarketingTheme();

  useSEO({
    title: 'Fish Mouth AI Testimonials | Roofing Contractors Winning With Proof',
    description: 'Hear how roofing companies boost close rates with localized leads, proof overlays, and automated follow-up.',
    canonical: 'https://fishmouth.io/testimonials',
  });

  return (
    <>
      <Navbar />
      <main>
        <section className="fm-container" style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 'clamp(36px,4.8vw,60px)', marginBottom: 12 }}>Roofers sharing real wins</h1>
          <p style={{ color: 'var(--fm-muted)', maxWidth: 600, margin: '0 auto' }}>
            Fish Mouth pairs high-intent leads with proof-first outreach so crews stay booked. Here’s what contractors report after switching from generic lead lists.
          </p>
        </section>

        <section className="fm-container" style={{ display: 'grid', gap: '18px', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          {proofPoints.map((point) => (
            <article key={point.metric} className="feature-card" style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{point.metric}</div>
              <p style={{ color: 'var(--fm-muted)', marginBottom: 0 }}>{point.detail}</p>
            </article>
          ))}
        </section>

        <section className="fm-container" style={{ display: 'grid', gap: '16px' }}>
          {testimonials.map((item) => (
            <article key={item.name} className="feature-card" style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '12px', padding: '10px 14px', fontWeight: 600 }}>{item.logoText}</div>
                <div>
                  <div style={{ fontWeight: 600 }}>{item.name}</div>
                  <div style={{ color: 'var(--fm-muted)', fontSize: 13 }}>{item.person}</div>
                </div>
              </div>
              <p style={{ margin: 0 }}>&ldquo;{item.quote}&rdquo;</p>
            </article>
          ))}
        </section>

        <section className="fm-container feature-card" style={{ maxWidth: 900 }}>
          <h3 style={{ marginTop: 0 }}>Want to be the next success story?</h3>
          <p style={{ color: 'var(--fm-muted)' }}>
            Run Fish Mouth alongside your current process. We’ll stack-rank your market, deliver 25 leads with imagery, and show the automations booking appointments in real time.
          </p>
          <a href="/signup" className="fm-cta" style={{ alignSelf: 'flex-start' }}>Get 25 free HOT leads</a>
        </section>
      </main>
      <Footer />
    </>
  );
}
