import React from 'react';
import Navbar from '../../components/marketing/Navbar';
import Footer from '../../components/marketing/Footer';
import { useSEO } from '../../utils/seo';
import '../../marketing/brand/brand_tokens.css';
import { useMarketingTheme } from '../../marketing/hooks/useMarketingTheme';
import { GalleryScroller } from '../../marketing/components/GalleryScroller';
import { DemoDashboardStepper } from '../../marketing/components/DemoDashboardStepper';

const slides = [
  { image: '/assets/demo/step1.svg', title: 'Lead Map & Heat', subtitle: 'See the neighborhoods lighting up this week.', badge: 'Leads' },
  { image: '/assets/demo/step2.svg', title: 'Photo Reports', subtitle: 'Share proof with overlays that make decisions easy.', badge: 'Reports' },
  { image: '/assets/demo/step3.svg', title: 'AI Voice + SMS', subtitle: 'Book the inspection while everyone’s still excited.', badge: 'Outreach' },
  { image: '/assets/demo/step4.svg', title: 'Estimate & Close', subtitle: 'Line-item clarity with material suggestions.', badge: 'Estimate' },
];

const steps = [
  { image: '/assets/demo/step1.svg', title: 'Find HOT leads', copy: 'Fish Mouth scores and prioritizes roofs so you know where to start.' },
  { image: '/assets/demo/step2.svg', title: 'Send proof-first', copy: 'Homeowners see exactly what you saw: imagery, notes, and the easiest next action.' },
  { image: '/assets/demo/step3.svg', title: 'Follow up automatically', copy: 'Voice, SMS, and email journeys keep conversations alive until the inspection is booked.' },
  { image: '/assets/demo/step4.svg', title: 'Confirm and remind', copy: 'Automated confirmations and reminders reduce no-shows and keep crews busy.' },
  { image: '/assets/demo/step5.svg', title: 'Estimate fast', copy: 'Good-Better-Best proposals, financing hooks, and integrations into your CRM.' },
  { image: '/assets/demo/step6.svg', title: 'Celebrate the install', copy: 'Post-job reviews and referrals trigger automatically to keep demand high.' },
];

export default function Demo() {
  useMarketingTheme();

  useSEO({
    title: 'Fish Mouth AI Demo | Live Roofing Dashboard Walkthrough',
    description: 'Scroll through the Fish Mouth AI dashboard and see how HOT roofing leads, automations, and reporting come together.',
    canonical: 'https://fishmouth.io/demo',
  });

  return (
    <>
      <Navbar />
      <main>
        <section className="fm-container" style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 'clamp(36px,4.8vw,60px)', marginBottom: 12 }}>Experience the Fish Mouth dashboard</h1>
          <p style={{ color: 'var(--fm-muted)', maxWidth: 600, margin: '0 auto' }}>
            Scroll through the gallery or use the stepper to see exactly how leads arrive, reports send, and installs get booked.
          </p>
        </section>

        <GalleryScroller slides={slides} />

        <section className="fm-container" style={{ textAlign: 'center' }}>
          <h2 style={{ marginBottom: 8 }}>Step-by-step onboarding preview</h2>
          <p style={{ color: 'var(--fm-muted)' }}>Scroll the section or click Next/Previous to explore each stage.</p>
        </section>

        <DemoDashboardStepper steps={steps} />

        <section className="fm-container feature-card" style={{ maxWidth: 880 }}>
          <h3 style={{ marginTop: 0 }}>Ready for your hands-on demo?</h3>
          <p style={{ color: 'var(--fm-muted)' }}>
            We’ll scan your territory, preload sample leads, and walk you through outreach, automation, and reporting in a live session.
          </p>
          <a href="/contact" className="fm-cta" style={{ alignSelf: 'flex-start' }}>Schedule a walkthrough</a>
        </section>
      </main>
      <Footer />
    </>
  );
}
