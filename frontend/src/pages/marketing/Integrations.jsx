import React from 'react';
import Navbar from '../../components/marketing/Navbar';
import Footer from '../../components/marketing/Footer';
import { useSEO } from '../../utils/seo';
import '../../marketing/brand/brand_tokens.css';
import { useMarketingTheme } from '../../marketing/hooks/useMarketingTheme';

const integrations = [
  'JobNimbus',
  'AccuLynx',
  'HubSpot',
  'Salesforce',
  'Google Calendar',
  'Slack',
  'Zapier',
  'SendGrid',
  'Telnyx',
  'Twilio',
];

export default function Integrations() {
  useMarketingTheme();

  useSEO({
    title: 'Fish Mouth AI Integrations | Roofing Stack Ready',
    description: 'Connect Fish Mouth AI with CRMs, calendars, messaging, and quoting tools your roofing crew already uses.',
    canonical: 'https://fishmouth.io/integrations',
  });

  return (
    <>
      <Navbar />
      <main>
        <section className="fm-container" style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 'clamp(36px,4.8vw,60px)', marginBottom: 12 }}>Works with the tools you trust</h1>
          <p style={{ color: 'var(--fm-muted)', maxWidth: 560, margin: '0 auto' }}>
            Fish Mouth plugs into your CRM, comms stack, and calendars so leads, follow-ups, and installs stay perfectly in sync.
          </p>
        </section>

        <section className="fm-container" style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))' }}>
          {integrations.map((name) => (
            <div key={name} className="feature-card" style={{ textAlign: 'center', padding: '20px 16px' }}>
              <span style={{ fontWeight: 600 }}>{name}</span>
            </div>
          ))}
        </section>

        <section className="fm-container feature-card" style={{ maxWidth: 920 }}>
          <h3 style={{ marginTop: 0 }}>Need something custom?</h3>
          <p style={{ color: 'var(--fm-muted)' }}>
            Webhooks and our API let you push lead updates into estimating tools, dialers, ERPs, or data warehouses. We also support Zapier and Make for quick automations.
          </p>
          <a href="/contact" className="fm-cta" style={{ alignSelf: 'flex-start' }}>Talk integrations</a>
        </section>
      </main>
      <Footer />
    </>
  );
}
