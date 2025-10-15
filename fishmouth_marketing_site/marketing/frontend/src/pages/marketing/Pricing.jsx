import React from 'react';
import Navbar from '../../components/marketing/Navbar';
import Footer from '../../components/marketing/Footer';
import PricingTable from '../../components/marketing/PricingTable';
import TestimonialCarousel from '../../components/marketing/TestimonialCarousel';

export default function Pricing() {
  return (
    <div>
      <Navbar />
      <section className="py-12 text-center">
        <h1 className="text-3xl font-semibold">Pricing</h1>
        <p className="opacity-80 mt-2">Start free with 25 HOT leads — upgrade when you’re ready.</p>
      </section>
      <PricingTable />
      <TestimonialCarousel />
      <Footer />
    </div>
  );
}
