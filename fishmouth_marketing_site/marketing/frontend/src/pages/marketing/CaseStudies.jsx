import React from 'react';
import Navbar from '../../components/marketing/Navbar';
import Footer from '../../components/marketing/Footer';
import CaseStudyGrid from '../../components/marketing/CaseStudyGrid';

export default function CaseStudies() {
  return (
    <div>
      <Navbar />
      <section className="py-12 text-center">
        <h1 className="text-3xl font-semibold">Case Studies</h1>
      </section>
      <CaseStudyGrid />
      <Footer />
    </div>
  );
}
