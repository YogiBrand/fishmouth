import React from 'react';
import { useSEO } from '../../utils/seo';
import Navbar from '../../components/marketing/Navbar';
import Footer from '../../components/marketing/Footer';
import '../../marketing/brand/brand_tokens.css';
import { useMarketingTheme } from '../../marketing/hooks/useMarketingTheme';
import { FeatureSections } from '../../marketing/components/FeatureSections';

const featureGroups = [
  { title: 'Heat-mapped lead feed', desc: 'Ranked roof opportunities with signals for age, hail, slope, and estimated install value.' },
  { title: 'Proof-first report builder', desc: 'Generate branded roof reports with overlays, homeowner-friendly notes, and recommended fixes.' },
  { title: 'Outreach autopilot', desc: 'Email and SMS journeys (with STOP/HELP & List-Unsubscribe) keep you compliant while you scale.' },
  { title: 'AI voice agent', desc: 'Let AI handle first-touch calls, schedule checks, and capture notes so your team only steps in when needed.' },
  { title: 'Production-ready handoff', desc: 'Crew-ready packets include measurements, material callouts, and homeowner preferences in one place.' },
  { title: 'Analytics & ROI', desc: 'Track installs, revenue, and source performance to reinvest in the markets that deliver.' },
];

const deepDive = [
  {
    heading: 'Proof before pitch',
    copy: 'Homeowners trust what they can see. Reports highlight roof risks in plain language and offer next steps—no aggressive sales required.',
  },
  {
    heading: 'Compliance built in',
    copy: 'Every outreach channel respects opt-outs automatically. TCPA-safe SMS, email headers, and call recording rules are handled for you.',
  },
  {
    heading: 'Team alignment',
    copy: 'Assign leads, leave context, and see which step is next. Sales, production, and owners all view the same source of truth.',
  },
];

export default function Features() {
  useMarketingTheme();

  useSEO({
    title: 'Fish Mouth AI Features | Roofing Lead Engine & Automations',
    description: 'Explore imaging, lead scoring, proof-rich reports, and automated follow-up workflows purpose-built for roofing teams.',
    canonical: 'https://fishmouth.io/features',
  });

  return (
    <>
      <Navbar />
      <main>
        <section className="fm-container" style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 'clamp(36px,4.8vw,60px)', marginBottom: 12 }}>Purpose-built for modern roofing teams</h1>
          <p style={{ color: 'var(--fm-muted)', maxWidth: 620, margin: '0 auto' }}>
            Fish Mouth covers the entire journey—from finding roofs at the perfect moment to signing the contract and handing crews a ready-to-run plan.
          </p>
        </section>

        <FeatureSections items={featureGroups} />

        <section className="fm-container" style={{ display: 'grid', gap: '18px' }}>
          {deepDive.map((item) => (
            <article key={item.heading} className="feature-card">
              <h3 style={{ marginTop: 0 }}>{item.heading}</h3>
              <p>{item.copy}</p>
            </article>
          ))}
        </section>

        <section className="fm-container feature-card" style={{ maxWidth: 1040 }}>
          <h3 style={{ marginTop: 0 }}>Connect to your existing stack</h3>
          <p style={{ color: 'var(--fm-muted)' }}>
            JobNimbus, AccuLynx, HubSpot, Google Calendar, Slack, Zapier, Telnyx, and SendGrid are ready out of the box. Prefer a custom integration? Our webhooks and APIs keep data flowing both ways.
          </p>
          <a href="/integrations" className="fm-cta" style={{ marginTop: 12, alignSelf: 'flex-start' }}>Explore integrations</a>
        </section>
      </main>
      <Footer />
    </>
  );
}
