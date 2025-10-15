import React from 'react';
import Navbar from '../../components/marketing/Navbar';
import Footer from '../../components/marketing/Footer';

const QA = [
  {q: "How are leads generated?", a: "Aerial + street imagery, permits, assessor data, and verified contact enrichment, scored for intent."},
  {q: "Do you provide exclusive leads?", a: "You pick your territories. We gate quality and never resell the same HOT lead to multiple contractors."},
  {q: "What if I need help setting up?", a: "We’ll import your logo/colors, templates, and give you scripts that fit your team’s style."}
];

export default function FAQ() {
  return (
    <div>
      <Navbar />
      <section className="py-12 text-center">
        <h1 className="text-3xl font-semibold">FAQ</h1>
      </section>
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 grid gap-4">
          {QA.map((x, i) => (
            <div key={i} className="border rounded p-4">
              <div className="font-semibold">{x.q}</div>
              <div className="opacity-80 text-sm mt-1">{x.a}</div>
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}
