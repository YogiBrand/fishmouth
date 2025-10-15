import React from 'react';
import Navbar from '../../components/marketing/Navbar';
import Footer from '../../components/marketing/Footer';
import { useSEO } from '../../utils/seo';
import '../../marketing/brand/brand_tokens.css';
import { useMarketingTheme } from '../../marketing/hooks/useMarketingTheme';
import caseStudies from '../../data/marketing/case_studies.json';

const playbook = [
  {
    step: '01',
    title: 'Target the right roofs',
    body: 'We scan the markets you care about and highlight neighborhoods with weather, age, and value signals worth pursuing first.'
  },
  {
    step: '02',
    title: 'Deliver proof before pitch',
    body: 'Homeowners get a photo-rich report outlining what we saw and why it matters, with an invite to book a quick roof check.'
  },
  {
    step: '03',
    title: 'Book and close faster',
    body: 'AI voice, SMS, and email follow-ups keep the momentum going while your team focuses on estimates, installs, and referrals.'
  }
];

export default function CaseStudies() {
  useMarketingTheme();

  useSEO({
    title: 'Roofing Case Studies | Fish Mouth AI',
    description: 'See how roofers increase inspections, approvals, and installs with Fish Mouth AI’s proof-first outreach.',
    canonical: 'https://fishmouth.io/case-studies',
  });

  return (
    <>
      <Navbar />
      <main>
        <section className="fm-container" style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 'clamp(36px,4.8vw,60px)', marginBottom: 12 }}>Proof-first wins in the field</h1>
          <p style={{ color: 'var(--fm-muted)', maxWidth: 640, margin: '0 auto' }}>
            Every market is different—but the pattern holds. Lead with proof, automate respectful follow-ups, and keep crews busy with warm homeowners who already saw the value.
          </p>
        </section>

        <section className="fm-container" style={{ display: 'grid', gap: '24px' }}>
          {caseStudies.map((study) => (
            <article key={study.slug} className="feature-card" style={{ display: 'grid', gap: '18px' }}>
              <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', alignItems: 'center' }}>
                <div>
                  <div style={{ color: 'var(--fm-muted)', fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{study.market}</div>
                  <h3 style={{ margin: '6px 0 12px' }}>{study.title}</h3>
                  <p style={{ color: 'var(--fm-muted)' }}>{study.summary}</p>
                </div>
                <div className="step-media" style={{ minHeight: 220, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <img src={study.image} alt={study.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              </div>
              {study.metrics && (
                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                  {Object.entries(study.metrics).map(([label, value]) => (
                    <div key={label} className="feature-card" style={{ background: 'rgba(15,25,45,0.85)' }}>
                      <div style={{ fontSize: 26, fontWeight: 700 }}>{formatMetric(label, value)}</div>
                      <div style={{ color: 'var(--fm-muted)', textTransform: 'capitalize' }}>{label.replace(/_/g, ' ')}</div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </section>

        <section className="fm-container" style={{ display: 'grid', gap: '18px', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
          {playbook.map((step) => (
            <div key={step.step} className="feature-card">
              <div style={{ fontSize: 12, color: 'var(--fm-muted)', letterSpacing: '0.12em' }}>{step.step}</div>
              <h3 style={{ marginTop: 6 }}>{step.title}</h3>
              <p>{step.body}</p>
            </div>
          ))}
        </section>

        <section className="fm-container feature-card" style={{ maxWidth: 900 }}>
          <h3 style={{ marginTop: 0 }}>Ready to run this playbook in your city?</h3>
          <p style={{ color: 'var(--fm-muted)' }}>
            We’ll scan your territory, send 25 HOT leads, and set up the automation that books the first wave of roof checks. If you love it, keep the installs rolling. If not, you keep the leads on us.
          </p>
          <a href="/signup" className="fm-cta" style={{ alignSelf: 'flex-start' }}>Launch my market</a>
        </section>
      </main>
      <Footer />
    </>
  );
}

function formatMetric(label, value) {
  if (typeof value === 'number') {
    if (label.includes('revenue') || label.includes('ticket')) {
      return `$${value.toLocaleString()}`;
    }
    return value.toLocaleString();
  }
  return value;
}
