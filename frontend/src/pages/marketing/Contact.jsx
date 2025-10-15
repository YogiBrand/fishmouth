import React, { useEffect, useState } from 'react';
import Navbar from '../../components/marketing/Navbar';
import Footer from '../../components/marketing/Footer';
import { useSEO } from '../../utils/seo';
import { resolveGeo } from '../../lib/marketing/geo';
import '../../marketing/brand/brand_tokens.css';
import { useMarketingTheme } from '../../marketing/hooks/useMarketingTheme';

const initialDefaults = { city: '', state: '', country: '', source: '', medium: '', campaign: '' };

export default function Contact() {
  useMarketingTheme();

  const [status, setStatus] = useState(null);
  const [defaults, setDefaults] = useState(initialDefaults);
  const [submitting, setSubmitting] = useState(false);

  useSEO({
    title: 'Claim 25 Free Roofing Leads | Fish Mouth AI',
    description: 'Submit the quick form to receive 25 proof-backed roofing leads with automated follow-up from Fish Mouth AI.',
    canonical: 'https://fishmouth.io/contact',
  });

  useEffect(() => {
    let mounted = true;
    let params = null;
    if (typeof window !== 'undefined') {
      try {
        params = new URLSearchParams(window.location.search);
      } catch (error) {
        params = null;
      }
    }

    resolveGeo()
      .then((geo) => {
        if (!mounted) return;
        setDefaults({
          city: geo?.city || '',
          state: geo?.state && geo.state !== 'United States' ? geo.state : '',
          country: geo?.country || 'US',
          source: params?.get('utm_source') || '',
          medium: params?.get('utm_medium') || '',
          campaign: params?.get('utm_campaign') || '',
        });
      })
      .catch(() => {
        if (!mounted) return;
        setDefaults({
          city: '',
          state: '',
          country: 'US',
          source: params?.get('utm_source') || '',
          medium: params?.get('utm_medium') || '',
          campaign: params?.get('utm_campaign') || '',
        });
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function submit(event) {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      setStatus(null);
      setSubmitting(true);
      const response = await fetch('/api/v1/marketing/claim_free_leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (response.ok) {
        setStatus({ ok: true, msg: 'Thanks! We’ll send your 25 leads shortly.' });
      } else {
        setStatus({ ok: false, msg: json.detail || 'Something went wrong.' });
      }
    } catch (error) {
      setStatus({ ok: false, msg: 'Network error.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Navbar />
      <main>
        <section className="fm-container" style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 'clamp(36px,4.8vw,60px)', marginBottom: 12 }}>Get 25 HOT leads on us</h1>
          <p style={{ color: 'var(--fm-muted)', maxWidth: 540, margin: '0 auto' }}>
            Tell us where to send your gifted leads. We’ll preload them with imagery, homeowner insights, and the follow-ups that book appointments.
          </p>
        </section>

        <section className="fm-container feature-card" style={{ maxWidth: 720 }}>
          <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
              <Input name="name" placeholder="Your name" required />
              <Input name="company" placeholder="Company" required />
            </div>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
              <Input name="email" type="email" placeholder="Work email" required />
              <Input name="phone" placeholder="Mobile phone" />
            </div>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
              <Input name="city" placeholder="City" defaultValue={defaults.city} />
              <Input name="state" placeholder="State" defaultValue={defaults.state} />
              <Input name="country" placeholder="Country" defaultValue={defaults.country} />
            </div>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
              <Input name="source" placeholder="utm_source (optional)" defaultValue={defaults.source} />
              <Input name="medium" placeholder="utm_medium (optional)" defaultValue={defaults.medium} />
              <Input name="campaign" placeholder="utm_campaign (optional)" defaultValue={defaults.campaign} />
            </div>
            <textarea name="notes" placeholder="Anything we should know?" rows={3} style={textAreaStyle} />
            <input name="website" tabIndex="-1" autoComplete="off" style={{ display: 'none' }} />
            <button type="submit" className="fm-cta" disabled={submitting} style={{ justifyContent: 'center' }}>
              {submitting ? 'Sending…' : 'Send my free leads'}
            </button>
            {status && (
              <div style={{ color: status.ok ? '#34d399' : '#fca5a5', fontSize: 14 }}>{status.msg}</div>
            )}
          </form>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Input(props) {
  return <input {...props} style={{ ...inputStyle, ...props.style }} />;
}

const inputStyle = {
  background: 'rgba(12,20,36,0.8)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  padding: '12px 14px',
  color: 'var(--fm-text)',
};

const textAreaStyle = {
  ...inputStyle,
  resize: 'vertical',
};
