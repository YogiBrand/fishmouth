import React from 'react';

export default function PricingTable() {
  return (
    <section className="py-14 bg-white" id="pricing">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold mb-6">Simple pricing that scales with you</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Plan
            name="Starter"
            price="$0"
            cta="Get 25 Free Leads"
            features={[
              "25 HOT leads included",
              "Report templates & overlays",
              "Email/SMS sending (limits apply)",
              "1 user"
            ]}
            highlight
          />
          <Plan
            name="Pro"
            price="$149/mo"
            cta="Start Pro"
            features={[
              "Up to 500 leads/mo",
              "Sequences & webhooks",
              "Deliverability guardrails",
              "3 users"
            ]}
          />
          <Plan
            name="Scale"
            price="Contact us"
            cta="Talk to Sales"
            features={[
              "Unlimited markets",
              "Team routing & call tracking",
              "CRM integrations",
              "Priority support"
            ]}
          />
        </div>
      </div>
    </section>
  );
}

function Plan({ name, price, features, cta, highlight }) {
  return (
    <div className={"border rounded p-6 " + (highlight ? "ring-2 ring-black" : "")}>
      <div className="text-sm uppercase opacity-80">{name}</div>
      <div className="text-3xl font-semibold my-2">{price}</div>
      <ul className="text-sm opacity-80 space-y-1 mb-4">
        {features.map((f, i) => <li key={i}>• {f}</li>)}
      </ul>
      <a href="/signup" className={"px-4 py-2 rounded " + (highlight ? "bg-black text-white" : "border")}>{cta}</a>
    </div>
  );
}
