import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="mt-20 border-t">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <img src="/marketing/brand/fishmouth-logo.svg" alt="Fish Mouth" className="h-6" />
            <span className="font-semibold">Fish Mouth</span>
          </div>
          <p className="opacity-70">Leads that pick up. Proof homeowners can see. Appointments that stick.</p>
        </div>
        <div>
          <div className="font-semibold mb-2">Product</div>
          <ul className="space-y-1 opacity-80">
            <li><Link to="/features">Features</Link></li>
            <li><Link to="/pricing">Pricing</Link></li>
            <li><Link to="/integrations">Integrations</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold mb-2">Company</div>
          <ul className="space-y-1 opacity-80">
            <li><Link to="/case-studies">Case Studies</Link></li>
            <li><Link to="/testimonials">Testimonials</Link></li>
            <li><Link to="/contact">Contact</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold mb-2">Legal</div>
          <ul className="space-y-1 opacity-80">
            <li><Link to="/privacy">Privacy</Link></li>
            <li><Link to="/terms">Terms</Link></li>
          </ul>
        </div>
      </div>
      <div className="text-xs text-center opacity-60 pb-8">© {new Date().getFullYear()} Fish Mouth. All rights reserved.</div>
    </footer>
  );
}
