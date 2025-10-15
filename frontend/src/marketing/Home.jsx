/**
 * Home.jsx — marketing homepage inspired by jitter.video (horizontal gallery + demo stepper + features)
 * Drop under your router at `/` (or /marketing) and ensure GSAP is installed.
 * npm i gsap lottie-react (optional) lenis (optional)
 */
import React from 'react';
import './brand/brand_tokens.css';
import { useGeo } from './hooks/useGeo';
import { useMarketingTheme } from './hooks/useMarketingTheme';
import { HeroSection } from './components/HeroSection';
import { LogoStrip } from './components/LogoStrip';
import { GalleryScroller } from './components/GalleryScroller';
import { FeatureRibbon } from './components/FeatureRibbon';
import { DemoDashboardStepper } from './components/DemoDashboardStepper';
import { FeatureSections } from './components/FeatureSections';
import { LocalInsights } from './components/LocalInsights';
import { QuoteSection } from './components/QuoteSection';
import testimonials from './data/testimonials.json';

export default function Home() {
  useMarketingTheme();
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

  const featureRibbonItems = [
    {
      icon: '🤖',
      title: 'AI voice + SMS follow-up',
      body: 'Fish Mouth books roof checks with compliant scripts, wraps every call, and posts notes so your team stays in sync.',
    },
    {
      icon: '🛰️',
      title: 'Proof-first reports',
      body: 'Homeowners receive imagery, overlays, and what-to-do guidance in under a minute—no hard sell, just clarity.',
    },
    {
      icon: '📈',
      title: 'ROI dashboard',
      body: 'Tracking installs, revenue, and territory performance helps you double down on markets that win.',
    },
  ];

  const features = [
    { icon: '📍', title: 'Localized copy', desc: `Headlines, pain points, and CTAs adapt to ${city} so campaigns feel native.` },
    { icon: '⚡', title: 'Pinned interactions', desc: 'Horizontal galleries and smooth scroll storytelling keep attention without slowing the page.' },
    { icon: '✅', title: 'Deliverability-safe', desc: 'STOP/HELP for SMS and List-Unsubscribe for email are baked in so outreach stays compliant.' },
    { icon: '🛠️', title: 'Crew-ready handoff', desc: 'Inspection notes, measurements, and homeowner preferences push directly into production workflows.' },
    { icon: '🔁', title: 'Automation guardrails', desc: 'Sequences pause when homeowners reply or opt-out, preventing double touches.' },
    { icon: '🚀', title: 'Performance first', desc: 'GPU-friendly transforms, GSAP timelines, and respect for reduced-motion keep the experience polished.' },
  ];

  return (
    <main>
      <HeroSection city={city} />
      <LogoStrip />
      <GalleryScroller slides={slides} />
      <FeatureRibbon items={featureRibbonItems} />

      <div className="fm-container" id="demo">
        <h2 style={{margin:'12px 0 8px 0'}}>See the dashboard in action</h2>
        <p style={{color:'var(--fm-muted)'}}>Scroll or use Next/Previous to preview the core workflow.</p>
      </div>

      <DemoDashboardStepper steps={steps} />

      <LocalInsights city={city} region={geo.region} />

      <div className="fm-container">
        <h2 style={{margin:'24px 0 8px 0'}}>Why roofers stick with Fish Mouth</h2>
      </div>
      <FeatureSections items={features} />

      <QuoteSection
        quote="Fish Mouth sends leads that actually answer. The proof-first reports land, and the AI voice keeps our crews booked."
        author="Marisol Nguyen"
        title="Sales Lead, Lakeview Exteriors"
      />

      <section className="fm-container" aria-label="Testimonials">
        <div className="features" style={{gap:'14px'}}>
          {testimonials.map((item, index) => (
            <article key={index} className="feature-card" style={{display:'grid', gap:'10px'}}>
              <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                <div style={{background:'rgba(255,255,255,0.08)', borderRadius:'12px', padding:'10px 14px', fontWeight:600}}>{item.logoText}</div>
                <div>
                  <div style={{fontWeight:600}}>{item.name}</div>
                  <div style={{color:'var(--fm-muted)', fontSize:13}}>{item.person}</div>
                </div>
              </div>
              <p style={{margin:0, color:'var(--fm-text)'}}>&ldquo;{item.quote}&rdquo;</p>
            </article>
          ))}
        </div>
      </section>

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
