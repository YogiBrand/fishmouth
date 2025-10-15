import React from 'react';
import Navbar from '../../components/marketing/Navbar';
import Footer from '../../components/marketing/Footer';

export default function Integrations() {
  return (
    <div>
      <Navbar />
      <section className="py-12 text-center">
        <h1 className="text-3xl font-semibold">Integrations</h1>
        <p className="opacity-80 mt-2">JobNimbus, AccuLynx, HubSpot, Google Calendar, and more.</p>
      </section>
      <section className="py-12">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-4 px-4">
          {["JobNimbus","AccuLynx","HubSpot","Google Calendar","SendGrid","Telnyx"].map((name) => (
            <div key={name} className="border rounded p-4 bg-white flex items-center justify-center">{name}</div>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}
