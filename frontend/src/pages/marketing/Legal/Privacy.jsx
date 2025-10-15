import React from 'react';
import { useSEO } from '../../../utils/seo';
import Navbar from '../../../components/marketing/Navbar';
import Footer from '../../../components/marketing/Footer';
import '../../../marketing/brand/brand_tokens.css';
import { useMarketingTheme } from '../../../marketing/hooks/useMarketingTheme';

export default function Privacy() {
  useMarketingTheme();
  useSEO({
    title: 'Privacy Policy | Fish Mouth AI',
    description: 'Learn how Fish Mouth AI protects roofer and homeowner data across the platform.',
    canonical: 'https://fishmouth.io/privacy',
    ogTitle: 'Privacy Policy | Fish Mouth AI',
    ogDescription: 'Details on data usage, retention, and security for Fish Mouth AI services.',
    ogImage: 'https://fishmouth.io/marketing/hero/hero-dashboard.png',
    url: 'https://fishmouth.io/privacy'
  });

  return (
    <>
      <Navbar />
      <main>
        <section className="fm-container" style={{ maxWidth: 840 }}>
          <h1 style={{ fontSize: 'clamp(32px,4vw,52px)', marginBottom: 18 }}>Privacy Policy</h1>
          <p style={{ color: 'var(--fm-muted)' }}>
            Share how Fish Mouth AI collects, stores, and processes data. Replace this scaffold with your full policy before going live.
          </p>
          <div className="feature-card" style={{ marginTop: 24 }}>
            <h3>1. Data collected</h3>
            <p>Explain what information you capture from contractors, homeowners, and site visitors.</p>
            <h3>2. Use of data</h3>
            <p>Outline how data powers lead scoring, outreach, analytics, and product improvements.</p>
            <h3>3. Sharing & third parties</h3>
            <p>Note integrations, processors, and how you protect data when it moves between systems.</p>
            <h3>4. Rights & contact</h3>
            <p>Detail how users can access, correct, or delete data and who to contact with privacy questions.</p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
