import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto text-center">
        <div className="text-2xl sm:text-3xl font-bold mb-4">🐟 Fish Mouth</div>
        <p className="text-gray-400 mb-6">AI-Powered Roofing Lead Generation</p>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-gray-400">
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
          <Link to="/case-studies" className="hover:text-white transition-colors">Case Studies</Link>
          <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
          <Link to="/signup" className="hover:text-white transition-colors">Get Started</Link>
          <span className="text-gray-700">|</span>
          <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
          <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
          <Link to="/cookies" className="hover:text-white transition-colors">Cookies</Link>
          <Link to="/gdpr" className="hover:text-white transition-colors">GDPR</Link>
          <Link to="/billing-terms" className="hover:text-white transition-colors">Billing Terms</Link>
        </div>
        <div className="mt-8 text-sm text-gray-500">
          © 2025 Fish Mouth. All rights reserved.
        </div>
      </div>
    </footer>
  );
}





