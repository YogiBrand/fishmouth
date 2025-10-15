import React from 'react';
import Navbar from '../../components/marketing/Navbar';
import Footer from '../../components/marketing/Footer';
import Hero from '../../components/marketing/Hero';
import PainPoints from '../../components/marketing/PainPoints';
import FeatureGrid from '../../components/marketing/FeatureGrid';
import Objections from '../../components/marketing/Objections';
import PricingTable from '../../components/marketing/PricingTable';
import CaseStudyGrid from '../../components/marketing/CaseStudyGrid';
import TestimonialCarousel from '../../components/marketing/TestimonialCarousel';
import ScrollWizard from '../../components/marketing/ScrollWizard';
import DemoDashboard from '../../components/marketing/DemoDashboard';
import CTA from '../../components/marketing/CTA';

export default function Home() {
  return (
    <div>
      <Navbar />
      <Hero />
      <PainPoints />
      <FeatureGrid />
      <ScrollWizard />
      <DemoDashboard />
      <CaseStudyGrid limit={2} />
      <TestimonialCarousel />
      <Objections />
      <PricingTable />
      <CTA />
      <Footer />
    </div>
  );
}
