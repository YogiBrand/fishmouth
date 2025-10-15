/**
 * Home.jsx — marketing homepage inspired by jitter.video (horizontal gallery + demo stepper + features)
 * Drop under your router at `/` (or /marketing) and ensure GSAP is installed.
 * npm i gsap lottie-react (optional) lenis (optional)
 */
import React from 'react';
import './brand/brand_tokens.css';
import { useGeo } from './hooks/useGeo';
import { GalleryScroller } from './components/GalleryScroller';
import { DemoDashboardStepper } from './components/DemoDashboardStepper';
import { FeatureSections } from './components/FeatureSections';

export default function Home() {
  const geo = useGeo();
  const city = geo.city || 'your area';
  const slides = [
    { image: '/assets/demo/step1.svg', title: 'Lead Map & Heat', subtitle: 'See roof opportunities near ' + city, badge: 'Leads' },
    { image: '/assets/demo/step2.svg', title: 'Photo Report', subtitle: 'Send a proof‑first link homeowners trust', badge: 'Reports' },
    { image: '/assets/demo/step3.svg', title: 'AI Voice + SMS', subtitle: 'Book 10‑minute roof checks, no ladder', badge: 'Outreach' },
    { image: '/assets/demo/step4.svg', title: 'Estimate & Close', subtitle: 'Good‑Better‑Best with cleanup plan', badge: 'Estimate' },
  ];

  const steps = [
    { image: '/assets/demo/step1.svg', title: 'Find HOT leads', copy: 'Your feed prioritizes roofs likely at end‑of‑life with clear reason codes (age, granule loss, flashing).' },
    { image: '/assets/demo/step2.svg', title: 'Send a photo report', copy: 'Proof first. Homeowners can skim in 30 seconds. We track views and auto‑follow up.' },
    { image: '/assets/demo/step3.svg', title: 'Call or SMS with AI assist', copy: 'Respectful scripts that get to “Would 4pm or 6pm tomorrow work for a quick check?”' },
    { image: '/assets/demo/step4.svg', title: 'Book & remind', copy: 'Email + SMS confirmations and reminders keep no‑shows low and crews busy.' },
    { image: '/assets/demo/step5.svg', title: 'Estimate fast', copy: 'Good‑Better‑Best options with materials and timelines. Financing hooks optional.' },
    { image: '/assets/demo/step6.svg', title: 'Win more roofs', copy: 'Reviews and referrals kick in automatically post‑install.' },
  ];

  const features = [
    { title: 'Localized copy', desc: 'Headlines and benefits auto‑adapt to ' + city + ' so your offer feels like it was written for your market.' },
    { title: 'Fast scroll interactions', desc: 'Pinned galleries and step‑by‑step walkthroughs keep attention high without feeling heavy.' },
    { title: 'Deliverability‑safe', desc: 'Email footer & SMS STOP/HELP are baked‑in to keep your outreach compliant.' },
    { title: 'Proof before pitch', desc: 'Short photo reports build trust. If all looks great, we say so. If not, we explain clearly.' },
    { title: 'Easy handoff', desc: 'Everything you see on this page is powered by the same components in your dashboard.' },
    { title: 'Performance first', desc: 'Animations use CSS transforms and GPU‑friendly effects; respects prefers‑reduced‑motion.' },
  ];

  return (
    <main>
      <header className="fm-hero">
        <h1>Roof leads in {city} that actually pick up.</h1>
        <p>Fish Mouth finds high‑intent homes, sends a proof‑first roof report, and follows up with AI voice, SMS, and email so you book more checks with zero extra effort.</p>
        <a className="fm-cta" href="/signup">Get 3 free HOT leads</a>
      </header>

      <GalleryScroller slides={slides} />

      <div className="fm-container">
        <h2 style={{margin:'12px 0 8px 0'}}>See the dashboard in action</h2>
        <p style={{color:'var(--fm-muted)'}}>Scroll or use Next/Previous to preview the 6 core steps.</p>
      </div>

      <DemoDashboardStepper steps={steps} />

      <div className="fm-container">
        <h2 style={{margin:'24px 0 8px 0'}}>Why roofers stick with Fish Mouth</h2>
      </div>
      <FeatureSections items={features} />

      <section className="fm-container" aria-label="CTA">
        <div className="feature-card" style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <div>
            <h3 style={{margin:0}}>Get 25 leads free in {city}</h3>
            <p style={{color:'var(--fm-muted)'}}>Sign up today and we’ll gift your account. No strings. Keep what you close.</p>
          </div>
          <a className="fm-cta" href="/signup">Claim my free leads</a>
        </div>
      </section>
    </main>
  );
}
