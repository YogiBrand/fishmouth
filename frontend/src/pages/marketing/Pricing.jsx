import React from 'react';
import { useSEO } from '../../utils/seo';
import Navbar from '../../components/marketing/Navbar';
import Footer from '../../components/marketing/Footer';
import '../../marketing/brand/brand_tokens.css';
import { useMarketingTheme } from '../../marketing/hooks/useMarketingTheme';
import testimonials from '../../marketing/data/testimonials.json';

const plans = [
  {
    name: 'Starter',
    price: '$0',
    blurb: 'Jump in with 25 HOT leads and the full dashboard to prove value before you pay a cent.',
    perks: ['25 gifted leads', 'Photo reports & overlays', 'Email + SMS sending (fair use)', '1 seat'],
    cta: 'Claim my free leads',
    href: '/signup',
    highlight: true,
  },
  {
    name: 'Pro',
    price: '$149/mo',
    blurb: 'Unlock automation at scale with expanded lead volumes, workflows, and voice assist.',
    perks: ['Up to 500 leads/month', 'Sequences + voice agent', 'Deliverability guardrails', '3 seats included'],
    cta: 'Start Pro',
    href: '/signup',
  },
  {
    name: 'Scale',
    price: 'Let’s tailor it',
    blurb: 'When you are working multiple crews across states, we align pricing with installs.',
    perks: ['Unlimited territories', 'Advanced routing & CRM hooks', 'Dedicated success partner', 'Priority support'],
    cta: 'Talk to sales',
    href: '/contact',
  },
];

export default function Pricing() {
  useMarketingTheme();

  useSEO({
    title: 'Fish Mouth AI Pricing | Start With 25 Free Roofing Leads',
    description: 'Choose the plan that fits your crew—starter freebies, Pro automation, and Scale packages with custom integrations.',
    canonical: 'https://fishmouth.io/pricing',
  });

  return (
    <>
      <Navbar />
      <main>
        <section className="fm-container" style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 'clamp(36px,4.8vw,60px)', marginBottom: 12 }}>Simple pricing, zero risk</h1>
          <p style={{ color: 'var(--fm-muted)', maxWidth: 560, margin: '0 auto' }}>
            Get 25 gifted leads to feel the momentum. Upgrade only when you are ready to scale outreach, voice, and installs.
          </p>
        </section>

        <section className="fm-container" style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          {plans.map((plan) => (
            <article
              key={plan.name}
              className="feature-card"
              style={{
                borderColor: plan.highlight ? 'rgba(35,200,255,0.45)' : undefined,
                boxShadow: plan.highlight ? 'var(--fm-shadow-md)' : 'var(--fm-shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>{plan.name}</h3>
                <div style={{ fontWeight: 700 }}>{plan.price}</div>
              </div>
              <p style={{ color: 'var(--fm-muted)', minHeight: 60 }}>{plan.blurb}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0', display: 'grid', gap: 10 }}>
                {plan.perks.map((perk) => (
                  <li key={perk} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ color: 'var(--fm-accent-2)' }}>•</span>
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
              <a href={plan.href} className="fm-cta" style={{ width: '100%', textAlign: 'center' }}>{plan.cta}</a>
            </article>
          ))}
        </section>

        <section className="fm-container feature-card" style={{ maxWidth: 960 }}>
          <h3 style={{ marginTop: 0 }}>How billing works</h3>
          <p style={{ color: 'var(--fm-muted)', marginBottom: 12 }}>
            Usage-based lead credits keep costs predictable. When an area is hot, you can top up instantly without waiting on sales. Need to pause? Downgrades take effect immediately.
          </p>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
            <div className="feature-card" style={{ background: 'rgba(15,25,45,0.8)' }}>
              <strong>No surprise fees</strong>
              <p>Every lead includes imagery, contact data, and follow-up automations. Credits only trigger on new HOT opportunities.</p>
            </div>
            <div className="feature-card" style={{ background: 'rgba(15,25,45,0.8)' }}>
              <strong>ROI dashboard</strong>
              <p>Track booked revenue vs. spend to show owners exactly what Fish Mouth is producing.</p>
            </div>
            <div className="feature-card" style={{ background: 'rgba(15,25,45,0.8)' }}>
              <strong>Fair pause button</strong>
              <p>Pause targeting or automations during weather events or seasonality with one click.</p>
            </div>
          </div>
        </section>

        <section className="fm-container" style={{ display: 'grid', gap: '14px' }}>
          {testimonials.map((item) => (
            <article key={item.name} className="feature-card" style={{ display: 'grid', gap: 10 }}>
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
      </main>
      <Footer />
    </>
  );
}
