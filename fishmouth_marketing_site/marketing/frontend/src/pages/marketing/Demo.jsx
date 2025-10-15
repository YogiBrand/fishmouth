import React from 'react';
import Navbar from '../../components/marketing/Navbar';
import Footer from '../../components/marketing/Footer';
import DemoDashboard from '../../components/marketing/DemoDashboard';

export default function Demo() {
  return (
    <div>
      <Navbar />
      <section className="py-12 text-center">
        <h1 className="text-3xl font-semibold">Interactive Demo</h1>
        <p className="opacity-80 mt-2">This pulls live data if your API is running, otherwise shows realistic samples.</p>
      </section>
      <DemoDashboard />
      <Footer />
    </div>
  );
}
