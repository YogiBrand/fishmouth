import React from 'react';
import { Link } from 'react-router-dom';
import { useSEO } from '../utils/seo';
import Footer from '../components/Footer';

export default function GDPR() {
  useSEO({
    title: 'GDPR Compliance — Fish Mouth',
    description: 'Information about our GDPR compliance and your data subject rights.',
    canonical: 'https://fishmouth.io/gdpr',
    ogTitle: 'Fish Mouth GDPR Notice',
    ogDescription: 'Read about rights of access, deletion, and portability.',
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
          <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">GDPR Compliance</h1>
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
            <p className="text-sm text-blue-900"><strong>Summary:</strong> This GDPR Notice supplements our Privacy Policy for individuals in the EEA/UK, describing our roles and your data subject rights.</p>
          </div>

          <h2 id="controller">1. Controller</h2>
          <p>Fish Mouth acts as the data controller for personal data processed via our Service.</p>

          <h2 id="basis">2. Legal Bases</h2>
          <p>We process personal data on the following bases: consent, contract performance, legitimate interests (e.g., improving and securing the Service), and compliance with legal obligations.</p>

          <h2 id="rights">3. Your Rights</h2>
          <ul>
            <li>Access your personal data</li>
            <li>Rectify inaccurate or incomplete data</li>
            <li>Erase personal data (“right to be forgotten”)</li>
            <li>Restrict or object to processing</li>
            <li>Data portability</li>
            <li>Withdraw consent (where processing is based on consent)</li>
            <li>Lodge a complaint with a supervisory authority</li>
          </ul>

          <h2 id="requests">4. Requests</h2>
          <p>To exercise rights, contact privacy@fishmouth.io. We may request additional information to verify your identity and will respond within required timeframes.</p>

          <h2 id="transfers">5. International Transfers</h2>
          <p>When transferring personal data outside the EEA/UK, we implement appropriate safeguards such as Standard Contractual Clauses.</p>
        </div>
      </main>

      <Footer />
    </div>
  );
}


