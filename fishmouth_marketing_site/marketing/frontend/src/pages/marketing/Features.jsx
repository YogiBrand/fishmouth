import React from 'react';
import Navbar from '../../components/marketing/Navbar';
import Footer from '../../components/marketing/Footer';
import FeatureGrid from '../../components/marketing/FeatureGrid';
import CaseStudyGrid from '../../components/marketing/CaseStudyGrid';

export default function Features() {
  return (
    <div>
      <Navbar />
      <section className="py-12 text-center">
        <h1 className="text-3xl font-semibold">Features built for roofers</h1>
        <p className="opacity-80 mt-2">Lead engine • Proof‑rich reports • Auto follow‑ups • Low‑cost imagery policy</p>
      </section>
      <FeatureGrid />
      <CaseStudyGrid />
      <Footer />
    </div>
  );
}
