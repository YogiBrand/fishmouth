import React, { useState } from 'react';
import Navbar from '../../components/marketing/Navbar';
import Footer from '../../components/marketing/Footer';

export default function Contact() {
  const [status, setStatus] = useState(null);

  async function submit(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const res = await fetch('/api/v1/marketing/claim_free_leads', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
      });
      const j = await res.json();
      if (res.ok) setStatus({ ok: true, msg: "Thanks! We’ll send your 25 leads shortly." });
      else setStatus({ ok: false, msg: j.detail || "Something went wrong." });
    } catch (e) {
      setStatus({ ok: false, msg: "Network error." });
    }
  }

  return (
    <div>
      <Navbar />
      <section className="py-12 text-center">
        <h1 className="text-3xl font-semibold">Get 25 free HOT leads</h1>
        <p className="opacity-80 mt-2">Tell us where to send them.</p>
      </section>
      <section className="py-8">
        <form onSubmit={submit} className="max-w-xl mx-auto px-4 grid gap-3">
          <input name="name" placeholder="Your name" className="border rounded p-2" required />
          <input name="email" type="email" placeholder="Work email" className="border rounded p-2" required />
          <input name="phone" placeholder="Mobile phone" className="border rounded p-2" />
          <input name="company" placeholder="Company" className="border rounded p-2" required />
          <div className="grid grid-cols-2 gap-2">
            <input name="city" placeholder="City" className="border rounded p-2" />
            <input name="state" placeholder="State" className="border rounded p-2" />
          </div>
          <input name="country" placeholder="Country (US default)" className="border rounded p-2" />
          <input name="source" placeholder="utm_source (optional)" className="border rounded p-2" />
          <input name="medium" placeholder="utm_medium (optional)" className="border rounded p-2" />
          <input name="campaign" placeholder="utm_campaign (optional)" className="border rounded p-2" />
          {/* Honeypot */}
          <input name="website" className="hidden" tabIndex="-1" autoComplete="off" />
          <button className="px-4 py-2 bg-black text-white rounded">Send my free leads</button>
          {status && <div className={"text-sm mt-2 " + (status.ok ? "text-green-600" : "text-red-600")}>{status.msg}</div>}
        </form>
      </section>
      <Footer />
    </div>
  );
}
