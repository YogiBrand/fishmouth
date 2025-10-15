import React from 'react';
import { useSEO } from '../../../utils/seo';
import Navbar from '../../../components/marketing/Navbar';
import Footer from '../../../components/marketing/Footer';
import '../../../marketing/brand/brand_tokens.css';
import { useMarketingTheme } from '../../../marketing/hooks/useMarketingTheme';

export default function Terms() {
  useMarketingTheme();
  useSEO({
    title: 'Terms of Service | Fish Mouth AI',
    description: 'Review the Fish Mouth AI terms that govern use of the roofing lead platform.',
    canonical: 'https://fishmouth.io/terms',
    ogTitle: 'Terms of Service | Fish Mouth AI',
    ogDescription: 'Understand acceptable use, service commitments, and legal terms for Fish Mouth AI.',
    ogImage: 'https://fishmouth.io/marketing/hero/hero-dashboard.png',
    url: 'https://fishmouth.io/terms'
  });

  return (
    <>
      <Navbar />
      <main>
        <section className="fm-container" style={{ maxWidth: 840 }}>
          <h1 style={{ fontSize: 'clamp(32px,4vw,52px)', marginBottom: 18 }}>Terms of Service</h1>
          <p style={{ color: 'var(--fm-muted)' }}>
            These terms outline how Fish Mouth AI provides marketing automation, lead generation, and related services for roofing contractors. Replace this section with your full legal text before launch.
          </p>
          <div className="feature-card" style={{ marginTop: 24 }}>
            <h3>1. Service scope</h3>
            <p>Describe what Fish Mouth AI delivers, how leads are generated, and what responsibilities you and the customer have.</p>
            <h3>2. Acceptable use</h3>
            <p>Outline approved outreach, prohibited actions, and compliance expectations for SMS, email, and voice.</p>
            <h3>3. Billing & cancellations</h3>
            <p>Explain pricing, credit consumption, refunds, renewals, and how customers can cancel.</p>
            <h3>4. Data privacy</h3>
            <p>Reference how customer and homeowner data is handled, stored, and protected.</p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
