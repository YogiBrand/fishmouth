import React from 'react';
import { Link } from 'react-router-dom';
import { useSEO } from '../utils/seo';
import Footer from '../components/Footer';

export default function BillingTerms() {
  useSEO({
    title: 'Billing Terms — Fish Mouth',
    description: 'Payment, renewals, refunds, and cancellations for Fish Mouth subscriptions.',
    canonical: 'https://fishmouth.io/billing-terms',
    ogTitle: 'Fish Mouth Billing Terms',
    ogDescription: 'Details on payment, renewals, and refunds.',
  });

  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">🐟 Fish Mouth</Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-gray-700 hover:text-blue-600 font-medium">Sign In</Link>
            <Link to="/signup" className="px-4 py-2 rounded-xl text-white font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow">Get Started</Link>
          </div>
        </div>
      </nav>

      <header className="bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">Billing Terms</h1>
          <p className="mt-3 text-gray-600 text-lg max-w-2xl">Effective date: January 1, 2025 • Last updated: October 14, 2025</p>
        </div>
      </header>

      <div className="px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="h-1.5 w-24 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full"></div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="prose prose-lg prose-slate max-w-none prose-h2:font-extrabold prose-h2:text-gray-900 prose-h3:font-bold prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-p:leading-relaxed">
          <div className="not-prose mb-8 p-4 rounded-2xl bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-900"><strong>Summary:</strong> These Billing Terms explain pricing, renewals, cancellations, refunds, the 30-day money-back guarantee, taxes, and payment methods for Fish Mouth subscriptions.</p>
          </div>

          <h2 id="plans">1. Plans & Pricing</h2>
          <p>Subscription tiers, usage limits, and prices are shown during sign‑up or in your account. Promotional credits or trials may apply as stated at the time of purchase.</p>

          <h2 id="payment">2. Payment & Authorization</h2>
          <p>You authorize us (and our payment processors) to charge your selected payment method for all fees due for the subscription term. You agree to keep payment information current and accurate.</p>

          <h2 id="renewal">3. Auto‑Renewals & Cancellations</h2>
          <p>Subscriptions renew automatically unless canceled before the next renewal date. You can cancel at any time via account settings; access continues through the end of the current term.</p>

          <h2 id="refunds">4. Refunds</h2>
          <p>Except where required by law or outlined in our 30-day money-back guarantee, fees are non‑refundable and non‑creditable once charged.</p>
          <div className="not-prose mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-1">Pass‑Through Costs and Operational Cost Recovery</h3>
            <p className="text-slate-700 text-[15px] leading-relaxed">
              Some features rely on third‑party services (e.g., imagery APIs, telecom, email). Those direct provider charges are pass‑through and non‑refundable. We apply a
              modest Operational Cost Recovery Charge (OCRC) of <strong>1.70×</strong> the provider’s unit rate to cover platform operations (orchestration, observability,
              infrastructure, security/compliance, and payment processing).
            </p>
            <ul className="list-disc list-inside mt-2 text-slate-700 text-[15px] leading-relaxed">
              <li>SMS send: provider $0.005 → total $0.0085 per send (~0.85¢)</li>
              <li>Email send: provider $0.0008 → total $0.00136 per send (~0.136¢)</li>
            </ul>
            <p className="text-slate-700 text-[15px] leading-relaxed mt-2">Actual rates vary by provider and destination.</p>
          </div>

          <h2 id="guarantee">5. 30-Day Money-Back Guarantee</h2>
          <p>
            New subscription plans include a 30-day money-back guarantee on Fish Mouth platform fees. To qualify, submit your cancellation request
            and refund claim to billing@fishmouth.io within 30 calendar days of your initial charge. Upon approval, we refund all subscription fees
            you paid for that period.
          </p>
          <p>
            The guarantee does not cover direct pass‑through usage or the OCRC (1.70× of the provider unit rate), which reflect the real cost of fulfilling your usage.
            We will itemize provider, quantity, and unit rates on the refund confirmation.
          </p>
          <p>
            After the 30-day window, standard refund terms in Section 4 apply. This guarantee is in addition to any rights you may have under applicable law.
          </p>

          <h2 id="changes">6. Changes to Prices & Plans</h2>
          <p>We may change pricing or plan features prospectively with reasonable notice. Changes take effect at the next renewal unless otherwise agreed.</p>

          <h2 id="taxes">7. Taxes</h2>
          <p>Fees exclude taxes unless specified. You are responsible for applicable taxes, duties, and government charges.</p>

          <h2 id="failed">8. Failed Payments</h2>
          <p>If a charge fails, we may attempt to re‑process and may suspend or downgrade the Service until payment is made. You remain responsible for amounts due for the then‑current term.</p>

          <h2 id="third">9. Third‑Party Fees</h2>
          <p>Your carrier or other providers may charge fees (e.g., for calls/SMS) that are separate from our subscription fees.</p>

          <h2 id="contact">Contact</h2>
          <p>billing@fishmouth.io</p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
