import React from 'react';
import { Link } from 'react-router-dom';
import { useSEO } from '../utils/seo';
import Footer from '../components/Footer';

export default function Privacy() {
  useSEO({
    title: 'Privacy Policy — Fish Mouth',
    description: 'How Fish Mouth collects, uses, and protects your personal data.',
    canonical: 'https://fishmouth.io/privacy',
    ogTitle: 'Fish Mouth Privacy Policy',
    ogDescription: 'Learn how we handle personal data and your rights.',
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
          <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">Privacy Policy</h1>
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
            <p className="text-sm text-blue-900"><strong>Summary:</strong> This Privacy Policy explains what information we collect, how we use it, how we share it, and your choices. We respect privacy by design and honor applicable regulations (e.g., GDPR).</p>
          </div>

          <h2 id="contents">Contents</h2>
          <ul>
            <li><a href="#scope">Scope</a></li>
            <li><a href="#collection">Information We Collect</a></li>
            <li><a href="#use">How We Use Information</a></li>
            <li><a href="#sharing">How We Share Information</a></li>
            <li><a href="#ads">Marketing & Communications</a></li>
            <li><a href="#cookies">Cookies & Similar Technologies</a></li>
            <li><a href="#security">Security</a></li>
            <li><a href="#retention">Data Retention</a></li>
            <li><a href="#rights">Your Rights</a></li>
            <li><a href="#international">International Transfers</a></li>
            <li><a href="#children">Children’s Privacy</a></li>
            <li><a href="#changes">Changes to this Policy</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>

          <h2 id="scope">1. Scope</h2>
          <p>This Policy applies to the Fish Mouth platform, websites, and related services (the “Service”).</p>

          <h2 id="collection">2. Information We Collect</h2>
          <ul>
            <li><strong>Account Information</strong>: email, password (hashed), company name, phone, optional profile fields (e.g., full name, address).</li>
            <li><strong>Lead & Business Data</strong>: property addresses, imagery references, AI analysis/insights, communication preferences, and activity logs related to your use of the Service.</li>
            <li><strong>Usage & Device Data</strong>: pages viewed, features used, performance metrics; device type, browser, IP address (processed for security and fraud prevention).</li>
            <li><strong>Communications</strong>: emails, messages, and support interactions.</li>
          </ul>

          <h2 id="use">3. How We Use Information</h2>
          <ul>
            <li>Provide, maintain, and improve the Service, including AI‑assisted features.</li>
            <li>Personalize experiences, analyze usage, and improve performance.</li>
            <li>Communicate with you about updates, security, and support.</li>
            <li>Protect the Service against abuse, fraud, and misuse.</li>
            <li>Comply with legal obligations and enforce terms.</li>
          </ul>

          <h2 id="sharing">4. How We Share Information</h2>
          <ul>
            <li><strong>Service Providers</strong>: we share limited data with vendors who process it on our behalf under appropriate agreements (e.g., cloud hosting, analytics, customer support, telephony for AI calls/SMS).</li>
            <li><strong>Legal & Safety</strong>: to comply with law, protect rights and safety, or respond to lawful requests.</li>
            <li><strong>Business Transfers</strong>: in connection with a merger, acquisition, or sale of assets.</li>
          </ul>

          <h2 id="ads">5. Marketing & Communications</h2>
          <p>Where required, we obtain consent for marketing communications. You can opt out by using unsubscribe links or contacting us. We honor your cookie preferences for analytics/marketing set via the cookie banner or browser settings. See our <Link to="/cookies">Cookie Policy</Link>.</p>

          <h2 id="cookies">6. Cookies & Similar Technologies</h2>
          <p>We use necessary cookies to operate the Service. With consent, we may use analytics and marketing cookies. Manage your preferences at any time from the <Link to="/cookies">Cookie Policy</Link> page or via the banner.</p>

          <h2 id="security">7. Security</h2>
          <p>We employ reasonable administrative, technical, and organizational safeguards appropriate to the nature of the data processed. No system is 100% secure; please use strong passwords and keep credentials confidential.</p>

          <h2 id="retention">8. Data Retention</h2>
          <p>We retain information as long as necessary for the purposes described or as required by law, then either delete or anonymize it.</p>

          <h2 id="rights">9. Your Rights</h2>
          <p>Depending on your location, you may have rights to access, correct, delete, restrict, or object to processing, and to data portability. To exercise rights, contact privacy@fishmouth.io. For EU/EEA data subjects, see our <Link to="/gdpr">GDPR Notice</Link>.</p>

          <h2 id="international">10. International Transfers</h2>
          <p>Where data is transferred internationally, we use appropriate safeguards (e.g., Standard Contractual Clauses).</p>

          <h2 id="children">11. Children’s Privacy</h2>
          <p>The Service is not directed to children under 13 (or as defined by local law). We do not knowingly collect personal data from children.</p>

          <h2 id="changes">12. Changes to this Policy</h2>
          <p>We may update this Policy from time to time. Material changes will be posted with an updated “Last updated” date.</p>

          <h3 id="contact">Contact</h3>
          <p>privacy@fishmouth.io</p>
        </div>
      </main>

      <Footer />
    </div>
  );
}


