import React from 'react';
import { Link } from 'react-router-dom';
import { useSEO } from '../utils/seo';
import Footer from '../components/Footer';

export default function Terms() {
  useSEO({
    title: 'Terms of Service — Fish Mouth',
    description: 'Read Fish Mouth\'s Terms of Service covering use, subscriptions, and limitations.',
    canonical: 'https://fishmouth.io/terms',
    ogTitle: 'Fish Mouth Terms of Service',
    ogDescription: 'Terms governing use of Fish Mouth services',
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
          <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">Terms of Service</h1>
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
            <p className="text-sm text-blue-900"><strong>Summary:</strong> These Terms govern your use of the Fish Mouth platform. They include important provisions such as automatic subscription renewals, acceptable use, intellectual property, limitations of liability, and a binding arbitration clause with a class action waiver.</p>
          </div>

          <h2 id="contents">Contents</h2>
          <ul>
            <li><a href="#acceptance">Acceptance of Terms</a></li>
            <li><a href="#definitions">Definitions</a></li>
            <li><a href="#accounts">Eligibility; Accounts & Security</a></li>
            <li><a href="#subscriptions">Subscriptions, Trials & Auto‑Renewals</a></li>
            <li><a href="#fees">Fees, Taxes & Refunds</a></li>
            <li><a href="#acceptable-use">Acceptable Use</a></li>
            <li><a href="#ai">AI Features & Output</a></li>
            <li><a href="#privacy">Customer Data & Privacy</a></li>
            <li><a href="#ip">Intellectual Property</a></li>
            <li><a href="#confidentiality">Confidentiality</a></li>
            <li><a href="#third-party">Third‑Party Services</a></li>
            <li><a href="#beta">Beta/Preview Features</a></li>
            <li><a href="#warranties">Disclaimers</a></li>
            <li><a href="#indemnification">Indemnification</a></li>
            <li><a href="#liability">Limitation of Liability</a></li>
            <li><a href="#termination">Term & Termination</a></li>
            <li><a href="#export">Export & Sanctions Compliance</a></li>
            <li><a href="#law">Governing Law; Venue</a></li>
            <li><a href="#arbitration">Dispute Resolution; Arbitration</a></li>
            <li><a href="#class-waiver">Class Action & Jury Trial Waiver</a></li>
            <li><a href="#changes">Changes to the Service & Terms</a></li>
            <li><a href="#notices">Notices</a></li>
            <li><a href="#misc">Miscellaneous</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>

          <h2 id="acceptance">1. Acceptance of Terms</h2>
          <p>By accessing or using Fish Mouth (the “Service”), you agree to be bound by these Terms and our <Link to="/privacy">Privacy Policy</Link> and <Link to="/cookies">Cookie Policy</Link>. If you are using the Service on behalf of an entity, you represent that you have authority to bind that entity. If you do not agree, do not use the Service.</p>

          <h2 id="definitions">2. Definitions</h2>
          <ul>
            <li><strong>“Customer”</strong> or <strong>“you”</strong> means the person or entity using the Service.</li>
            <li><strong>“Customer Data”</strong> means data submitted to or collected by the Service from or about Customer and its users.</li>
            <li><strong>“Order”</strong> means an online purchase, plan selection, or other ordering process specifying subscription tier, term, and fees.</li>
            <li><strong>“Service”</strong> means the Fish Mouth platform, websites, and related services.</li>
            <li><strong>“Content”</strong> means text, images, data, and other materials generated, posted, or otherwise made available via the Service.</li>
          </ul>

          <h2 id="accounts">3. Eligibility; Accounts & Security</h2>
          <ul>
            <li>You must be at least 18 years old and capable of forming a binding contract.</li>
            <li>Provide accurate information and keep credentials confidential. You are responsible for activities under your account.</li>
            <li>Notify us immediately of any unauthorized use or security incident.</li>
          </ul>

          <h2 id="subscriptions">4. Subscriptions, Trials & Auto‑Renewals</h2>
          <p>Access to the Service is provided on a subscription basis. Subscriptions renew automatically for successive periods unless canceled in accordance with our <Link to="/billing-terms">Billing Terms</Link>. Trials, promotional credits, and usage limits are described at sign‑up and may change at renewal.</p>

          <h2 id="fees">5. Fees, Taxes & Refunds</h2>
          <ul>
            <li>Fees are due in advance and are non‑refundable except as required by law or expressly stated in the <Link to="/billing-terms">Billing Terms</Link>.</li>
            <li>Fees exclude taxes; you are responsible for applicable taxes, duties, and charges.</li>
            <li>We may suspend or downgrade the Service for late or failed payments after notice.</li>
          </ul>

          <h2 id="acceptable-use">6. Acceptable Use</h2>
          <p>You will not: (a) reverse engineer, scrape, or misuse APIs; (b) upload or transmit malware; (c) infringe third‑party rights; (d) send spam or unlawful communications; (e) attempt to bypass security or rate limits; or (f) use the Service in violation of law (including TCPA/telemarketing rules, privacy, or export laws).</p>

          <h2 id="ai">7. AI Features & Output</h2>
          <p>AI‑assisted features may generate content or recommendations based on your settings, prompts, datasets, and choices. You control the configurations and inputs; we provide guardrails to protect brand image and professionalism, but you remain solely responsible for all uses and outcomes.</p>
          <ul>
            <li><strong>Review Required</strong>: You must review and approve AI outputs before use, and you must not rely on outputs as legal, medical, or professional advice.</li>
            <li><strong>Prompt & Configuration Ownership</strong>: You are responsible for the prompts, scripts, and agent behaviors you configure, including compliance with laws and third‑party rights.</li>
            <li><strong>No Warranty</strong>: We do not guarantee accuracy, completeness, or fitness for a particular purpose of any AI output.</li>
          </ul>

          <h2 id="communications">8. Telemarketing, Messaging & Consent</h2>
          <p>If you use voice, SMS, or email features, you represent and warrant that you will comply with all applicable laws (e.g., TCPA, Do‑Not‑Call, CAN‑SPAM, CASL, state telemarketing rules) and industry guidelines, and that you have obtained all necessary consents from recipients.</p>
          <ul>
            <li><strong>Your Responsibility</strong>: You are the initiator of communications; you decide recipients, timing, and content. You must maintain evidence of consent and honor opt‑out requests.</li>
            <li><strong>Safeguards</strong>: We may provide opt‑out handling, rate limits, or content filters for brand safety, but these are not a substitute for your compliance obligations.</li>
            <li><strong>Indemnity</strong>: You agree to defend and indemnify us against claims arising from your communications, lack of consent, or regulatory violations.</li>
          </ul>

          <h2 id="privacy">8. Customer Data & Privacy</h2>
          <p>We process personal data as described in our <Link to="/privacy">Privacy Policy</Link> and support data subject rights described in our <Link to="/gdpr">GDPR Notice</Link>. You are responsible for obtaining any required consents from your own end users.</p>

          <h2 id="ip">9. Intellectual Property</h2>
          <p>As between you and Fish Mouth, we own the Service and all related intellectual property. You own your Customer Data and grant us a limited, non‑exclusive license to host, process, and display it to provide the Service.</p>

          <h2 id="confidentiality">10. Confidentiality</h2>
          <p>Each party will protect the other party’s non‑public information with reasonable care and use it only as necessary to perform under these Terms.</p>

          <h2 id="third-party">11. Third‑Party Services</h2>
          <p>Integrations and third‑party services are provided by the respective providers. Your use of them is governed by their terms, and we are not responsible for their acts or omissions.</p>

          <h2 id="beta">12. Beta/Preview Features</h2>
          <p>We may offer beta or preview features on an “as‑is” basis, without support and with reduced or different availability and security commitments.</p>

          <h2 id="warranties">13. Disclaimers</h2>
          <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE,” WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON‑INFRINGEMENT.</p>

          <h2 id="indemnification">14. Indemnification</h2>
          <p>You will defend and indemnify Fish Mouth and its affiliates against claims brought by third parties arising from your Content, your configurations and prompts, your use of AI features, your failure to obtain necessary consents, or your use of the Service in violation of law or these Terms (including telemarketing, privacy, or intellectual property claims).</p>

          <h2 id="liability">15. Limitation of Liability</h2>
          <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT WILL FISH MOUTH BE LIABLE FOR: (A) INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES; OR (B) IN THE AGGREGATE, AMOUNTS EXCEEDING THE FEES PAID OR PAYABLE BY YOU TO FISH MOUTH FOR THE SERVICE IN THE 12 MONTHS PRECEDING THE CLAIM.</p>

          <h2 id="termination">16. Term & Termination</h2>
          <p>These Terms remain in effect while you use the Service. We may suspend or terminate your access for non‑payment, security risk, or material breach. Upon termination, your right to use the Service ceases immediately.</p>

          <h2 id="export">17. Export & Sanctions Compliance</h2>
          <p>You represent that you are not located in, under the control of, or a national or resident of any country subject to U.S. embargo or sanctions and will not use the Service in violation of export control or sanctions laws.</p>

          <h2 id="law">18. Governing Law; Venue</h2>
          <p>These Terms are governed by the laws of the State of Delaware, USA, without regard to conflict of law rules. Subject to the arbitration provisions below, the exclusive venue for disputes will be state or federal courts located in Delaware, and you consent to their jurisdiction.</p>

          <h2 id="arbitration">19. Dispute Resolution; Arbitration</h2>
          <p>Any dispute arising out of or relating to these Terms or the Service will be resolved by binding arbitration administered by the American Arbitration Association (AAA) under its Commercial Arbitration Rules, conducted in English in Delaware. Either party may seek injunctive relief for misuse of intellectual property in any court of competent jurisdiction.</p>

          <h2 id="class-waiver">20. Class Action & Jury Trial Waiver</h2>
          <p>YOU AND FISH MOUTH AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN YOUR OR ITS INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS OR REPRESENTATIVE ACTION. YOU WAIVE ANY RIGHT TO A JURY TRIAL.</p>

          <h2 id="changes">21. Changes to the Service & Terms</h2>
          <p>We may modify the Service and these Terms from time to time. Material changes will be posted on this page or communicated through the Service with an updated “Last updated” date. Your continued use of the Service after changes become effective constitutes acceptance.</p>

          <h2 id="notices">22. Notices</h2>
          <p>We may provide notices to the email associated with your account or through in‑product notifications. You may provide notices to support@fishmouth.io.</p>

          <h2 id="misc">23. Miscellaneous</h2>
          <p>These Terms constitute the entire agreement between you and Fish Mouth regarding the Service and supersede prior agreements. If a provision is unenforceable, the remaining provisions will remain in effect. You may not assign these Terms without our consent; we may assign them in connection with a merger, acquisition, or sale of assets.</p>

          <h3 id="contact">Contact</h3>
          <p>Questions about these Terms: support@fishmouth.io</p>
        </div>
      </main>

      <Footer />
    </div>
  );
}


