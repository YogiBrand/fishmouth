import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Mail, Palette, PenTool, Sparkles, UploadCloud } from 'lucide-react';

const contractorId = window.localStorage.getItem('contractor_id') || 'demo-contractor';

export default function AdminDashboard() {
  const [profile, setProfile] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [leadPool, setLeadPool] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mailStatus, setMailStatus] = useState(null);
  const [showcaseStatus, setShowcaseStatus] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [profileRes, templateRes, leadsRes] = await Promise.all([
          fetch(`/api/v1/branding/profile/${contractorId}`),
          fetch('/api/v1/mailers/templates'),
          fetch('/api/v1/contagion/hot-leads?min_score=70&limit=50'),
        ]);
        setProfile(await profileRes.json());
        const templateData = await templateRes.json();
        setTemplates(templateData.templates || []);
        const leadData = await leadsRes.json();
        setLeadPool(leadData.leads || []);
      } catch (error) {
        console.error('Failed to load admin dashboard', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleGenerateShowcase = async () => {
    setShowcaseStatus('Generating showcase…');
    try {
      const res = await fetch(`/api/v1/branding/showcase/${contractorId}`, { method: 'POST' });
      const data = await res.json();
      setShowcaseStatus(`Showcase generated: ${data.share_url}`);
    } catch (error) {
      console.error(error);
      setShowcaseStatus('Failed to generate showcase');
    }
  };

  const handleLaunchMailer = async (templateKey) => {
    setMailStatus('Scheduling mail campaign…');
    try {
      const targetLeads = JSON.parse(window.localStorage.getItem('selected_leads') || '[]');
      const seeded = targetLeads.length ? targetLeads : leadPool.slice(0, 25).map((lead) => lead.id);

      const res = await fetch('/api/v1/mailers/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractor_id: contractorId,
          name: `${templateKey} outreach ${new Date().toLocaleDateString()}`,
          template_key: templateKey,
          lead_ids: seeded,
        }),
      });
      const data = await res.json();
      setMailStatus(`Mail campaign queued with ${data.lead_count} leads.`);
    } catch (error) {
      setMailStatus('Failed to queue mail campaign');
    }
  };

  const brandingSummary = useMemo(() => {
    if (!profile) return [];
    const palette = profile.brand_palette || {};
    return [
      { label: 'Primary Color', value: palette.primary || '#1d4ed8' },
      { label: 'Accent Color', value: palette.accent || '#22d3ee' },
      { label: 'Direct Mail Enabled', value: profile.direct_mail_enabled ? 'Yes' : 'No' },
      { label: 'Preferred Templates', value: (profile.preferred_mail_templates || []).join(', ') || '—' },
    ];
  }, [profile]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex items-center gap-3 text-xl">
          <Sparkles className="w-6 h-6 animate-spin" />
          Loading branding control center…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      <header className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <span className="uppercase text-xs tracking-[0.3em] text-blue-400">Branding & Outreach</span>
            <h1 className="text-4xl font-bold mt-2">Contractor Experience Hub</h1>
            <p className="text-slate-400 mt-2">Upload assets, generate digital brochures, and orchestrate direct mail campaigns that align with your roof outreach playbook.</p>
          </div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600"
          >
            <FileText className="w-4 h-4" /> View Live Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 flex flex-col gap-10">
        <section className="bg-slate-900/80 backdrop-blur rounded-3xl border border-slate-800 shadow-xl p-6">
          <header className="flex items-center gap-3 mb-4">
            <Palette className="w-5 h-5 text-sky-400" />
            <h2 className="text-2xl font-semibold text-white">Branding Overview</h2>
          </header>
          {profile ? (
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-400">Business Name</p>
                <p className="text-lg font-semibold">{profile.company_name}</p>
                <p className="text-sm text-slate-400 mt-4">Tagline</p>
                <p className="text-base text-slate-200">{profile.contractor_branding?.tagline || 'Add a headline to your business profile.'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {brandingSummary.map((item) => (
                  <div key={item.label} className="rounded-2xl bg-slate-900/70 border border-slate-800 p-4">
                    <p className="text-xs uppercase tracking-wider text-slate-500">{item.label}</p>
                    <p className="text-sm mt-1 text-slate-100">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p>No contractor profile found.</p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={handleGenerateShowcase}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
            >
              <PenTool className="w-4 h-4" /> Generate Showcase Landing Page
            </button>
            <label className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-4 py-2 text-sm text-slate-200 cursor-pointer">
              <UploadCloud className="w-4 h-4" /> Upload Branding Assets
              <input type="file" className="hidden" multiple />
            </label>
          </div>
          {showcaseStatus && <p className="text-sm text-slate-400 mt-3">{showcaseStatus}</p>}
        </section>

        <section className="bg-slate-900/80 backdrop-blur rounded-3xl border border-slate-800 shadow-xl p-6">
          <header className="flex items-center gap-3 mb-6">
            <Mail className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-2xl font-semibold text-white">Direct Mail Pamphlets</h2>
              <p className="text-sm text-slate-400">Choose a template and we’ll auto-personalize messaging using contagion scores and roof condition insights.</p>
            </div>
          </header>
          <div className="grid md:grid-cols-3 gap-6">
            {templates.map((template) => (
              <article key={template.key} className="rounded-2xl bg-slate-900/70 border border-slate-800 p-5 flex flex-col gap-3">
                <h3 className="text-lg font-semibold text-white">{template.name}</h3>
                <p className="text-sm text-slate-400">{template.headline}</p>
                <p className="text-sm text-slate-500">{template.body}</p>
                <button
                  onClick={() => handleLaunchMailer(template.key)}
                  className="mt-auto inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-400"
                >
                  Launch Mailer
                </button>
              </article>
            ))}
          </div>
          {mailStatus && <p className="text-sm text-slate-400 mt-4">{mailStatus}</p>}
        </section>
      </main>
    </div>
  );
}
