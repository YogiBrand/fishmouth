import React from 'react';
import Navbar from '../../components/marketing/Navbar';
import Footer from '../../components/marketing/Footer';
import { useSEO } from '../../utils/seo';
import '../../marketing/brand/brand_tokens.css';
import { useMarketingTheme } from '../../marketing/hooks/useMarketingTheme';

const questions = [
  {
    q: 'How are leads generated?',
    a: 'Fish Mouth combines aerial and street imagery, assessor data, and weather events to rank roofs likely at end-of-life. Every lead includes contact enrichment and confidence scoring.',
  },
  {
    q: 'Do you provide exclusive leads?',
    a: 'You pick your territories. HOT leads are reserved for your team with built-in contact caps so quality stays high.',
  },
  {
    q: 'What if I need help setting up?',
    a: 'We import your logo, colors, and scripts, then stand up automations tailored to your team’s lead flow. You’ll be live in days, not weeks.',
  },
  {
    q: 'Can I stay compliant on SMS and email?',
    a: 'Yes. Every template includes TCPA-safe language, STOP/HELP handling, and List-Unsubscribe headers. Opt-outs sync across channels instantly.',
  },
  {
    q: 'How do we measure ROI?',
    a: 'The dashboard tracks scans, booked appointments, installs, and revenue so you can see exactly what Fish Mouth contributes each month.',
  },
];

export default function FAQ() {
  useMarketingTheme();

  useSEO({
    title: 'Fish Mouth AI FAQ | Roofing Lead Engine Support',
    description: 'Answers to common questions about imaging, exclusivity, onboarding, and automation for roofing teams.',
    canonical: 'https://fishmouth.io/faq',
  });

  return (
    <>
      <Navbar />
      <main>
        <section className="fm-container" style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 'clamp(36px,4.8vw,60px)', marginBottom: 12 }}>Questions from roofing teams</h1>
          <p style={{ color: 'var(--fm-muted)', maxWidth: 600, margin: '0 auto' }}>
            If you are switching from generic lead lists or manual canvassing, here is what teams ask before they launch Fish Mouth.
          </p>
        </section>

        <section className="fm-container" style={{ display: 'grid', gap: '16px' }}>
          {questions.map((item) => (
            <article key={item.q} className="feature-card">
              <h3 style={{ marginTop: 0 }}>{item.q}</h3>
              <p style={{ color: 'var(--fm-muted)', marginBottom: 0 }}>{item.a}</p>
            </article>
          ))}
        </section>

        <section className="fm-container feature-card" style={{ maxWidth: 860 }}>
          <h3 style={{ marginTop: 0 }}>Still wondering about something specific?</h3>
          <p style={{ color: 'var(--fm-muted)' }}>
            Chat with our team—we’ll walk you through the dashboard, share example campaigns, and outline exactly how Fish Mouth fits your current sales process.
          </p>
          <a href="/contact" className="fm-cta" style={{ alignSelf: 'flex-start' }}>Talk to a specialist</a>
        </section>
      </main>
      <Footer />
    </>
  );
}
