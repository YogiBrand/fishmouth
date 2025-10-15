import React from 'react';
import Navbar from '../../components/marketing/Navbar';
import Footer from '../../components/marketing/Footer';
import TestimonialCarousel from '../../components/marketing/TestimonialCarousel';

export default function TestimonialsPage() {
  return (
    <div>
      <Navbar />
      <section className="py-12 text-center">
        <h1 className="text-3xl font-semibold">Roofers who switched to Fish Mouth</h1>
      </section>
      <TestimonialCarousel />
      <Footer />
    </div>
  );
}
