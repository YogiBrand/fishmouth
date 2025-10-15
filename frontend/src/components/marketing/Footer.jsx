import React from 'react';
import { Link } from 'react-router-dom';
import '../../marketing/brand/brand_tokens.css';

const sections = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '/features' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Integrations', href: '/integrations' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Case Studies', href: '/case-studies' },
      { label: 'Testimonials', href: '/testimonials' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="fm-footer" role="contentinfo">
      <div className="fm-footer__inner">
        <div className="fm-footer__brand">
          <div className="fm-nav__logo">🐟</div>
          <div>
            <strong>Fish Mouth</strong>
            <p>Leads that pick up. Proof homeowners can see. Appointments that stick.</p>
          </div>
        </div>
        {sections.map((section) => (
          <div key={section.title} className="fm-footer__section">
            <div className="fm-footer__title">{section.title}</div>
            <ul>
              {section.links.map((item) => (
                <li key={item.href}>
                  <Link to={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="fm-footer__bottom">© {new Date().getFullYear()} Fish Mouth. All rights reserved.</div>
    </footer>
  );
}
