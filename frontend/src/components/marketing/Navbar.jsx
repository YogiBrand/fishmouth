import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import '../../marketing/brand/brand_tokens.css';

export default function Navbar() {
  const linkCls = ({ isActive }) =>
    'fm-nav-link' + (isActive ? ' fm-nav-link--active' : '');

  return (
    <header className="fm-nav" role="banner">
      <div className="fm-nav__inner">
        <Link to="/" className="fm-nav__brand">
          <span className="fm-nav__logo">🐟</span>
          <span>Fish Mouth</span>
        </Link>
        <nav className="fm-nav-links" aria-label="Marketing primary">
          <NavLink to="/features" className={linkCls}>Features</NavLink>
          <NavLink to="/pricing" className={linkCls}>Pricing</NavLink>
          <NavLink to="/case-studies" className={linkCls}>Case Studies</NavLink>
          <NavLink to="/testimonials" className={linkCls}>Testimonials</NavLink>
          <NavLink to="/faq" className={linkCls}>FAQ</NavLink>
          <NavLink to="/integrations" className={linkCls}>Integrations</NavLink>
        </nav>
        <div className="fm-nav-cta">
          <Link to="/contact" className="fm-nav-button fm-nav-button--ghost">Talk to us</Link>
          <a href="/signup" className="fm-nav-button fm-nav-button--solid">Get 25 free leads</a>
        </div>
      </div>
    </header>
  );
}
