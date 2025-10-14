import React from 'react';
import { Link } from 'react-router-dom';
import { useSEO } from '../utils/seo';
import Footer from '../components/Footer';

export default function Cookies() {
  useSEO({
    title: 'Cookie Policy — Fish Mouth',
    description: 'How Fish Mouth uses cookies and similar technologies.',
    canonical: 'https://fishmouth.io/cookies',
    ogTitle: 'Fish Mouth Cookie Policy',
    ogDescription: 'Details on cookie categories and preferences.',
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
          <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">Cookie Policy</h1>
          <p className="mt-3 text-gray-600 text-lg max-w-2xl">Effective date: January 1, 2025</p>
        </div>
      </header>

      <div className="px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="h-1.5 w-24 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full"></div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="prose prose-lg prose-slate max-w-none prose-h2:font-extrabold prose-h2:text-gray-900 prose-h3:font-bold prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-p:leading-relaxed">
          <div className="not-prose mb-6 flex flex-wrap gap-3">
            <button
              onClick={() => window.fm_open_cookie_prefs && window.fm_open_cookie_prefs()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow"
            >
              Manage Cookie Preferences
            </button>
          </div>
          <h2>What Are Cookies?</h2>
          <p>Cookies are small text files stored on your device to help websites operate efficiently and provide insights for improvement.</p>

          <h2>Categories</h2>
          <ul>
            <li><strong>Necessary</strong>: Required for core functionality and security.</li>
            <li><strong>Analytics</strong>: Help us understand usage to improve the Service.</li>
            <li><strong>Marketing</strong>: Personalize communications and measure campaigns.</li>
          </ul>

          <h2>Manage Your Preferences</h2>
          <p>You can manage your cookie preferences using the banner or your browser settings. Click “Manage Cookie Preferences” above to adjust optional categories at any time.</p>

          <h2>Contact</h2>
          <p>privacy@fishmouth.io</p>
        </div>
      </main>

      <Footer />
    </div>
  );
}


