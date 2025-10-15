import React from 'react';
import { Link, NavLink } from 'react-router-dom';

export default function Navbar() {
  const linkCls = ({ isActive }) => "px-3 py-2 rounded hover:bg-gray-100 " + (isActive ? "font-semibold" : "");
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src="/marketing/brand/fishmouth-logo.svg" alt="Fish Mouth" className="h-6" />
          <span className="font-semibold">Fish Mouth</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          <NavLink to="/features" className={linkCls}>Features</NavLink>
          <NavLink to="/pricing" className={linkCls}>Pricing</NavLink>
          <NavLink to="/case-studies" className={linkCls}>Case Studies</NavLink>
          <NavLink to="/testimonials" className={linkCls}>Testimonials</NavLink>
          <NavLink to="/faq" className={linkCls}>FAQ</NavLink>
          <NavLink to="/integrations" className={linkCls}>Integrations</NavLink>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/contact" className="px-3 py-1.5 border rounded hidden sm:inline">Contact</Link>
          <a href="/signup" className="px-3 py-1.5 bg-black text-white rounded">Get 25 Free Leads</a>
        </div>
      </div>
    </header>
  );
}
