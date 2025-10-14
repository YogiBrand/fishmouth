import React from 'react';
import { Link } from 'react-router-dom';
import { useSEO } from '../utils/seo';

export default function NotFound() {
  useSEO({
    title: 'Page Not Found — Fish Mouth',
    description: 'The page you are looking for does not exist.',
    canonical: 'https://fishmouth.io/404',
    ogTitle: 'Page Not Found',
    ogDescription: 'The page you are looking for does not exist.',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <nav className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur border-b border-gray-200 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">🐟 Fish Mouth</Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-gray-700 hover:text-blue-600 font-medium">Sign In</Link>
            <Link to="/signup" className="px-4 py-2 rounded-xl text-white font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow">Get Started</Link>
          </div>
        </div>
      </nav>

      <main className="pt-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-2xl mb-6">404</div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">Page not found</h1>
          <p className="text-gray-600 text-lg mb-8">The page you’re looking for may have moved or no longer exists.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/" className="px-6 py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow">
              Go Home
            </Link>
            <Link to="/case-studies" className="px-6 py-3 rounded-xl font-semibold bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 shadow-sm">
              See Case Studies
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}





