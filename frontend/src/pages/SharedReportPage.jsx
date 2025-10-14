import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader, ExternalLink, Download, Phone } from 'lucide-react';
import ReportCanvas from '../components/ReportCanvas';
import { resolveReportTokens } from '../utils/reportTokens';

const SharedReportPage = () => {
  const { token } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadReport = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/v1/reports/shared/${token}`);
        if (!response.ok) {
          throw new Error('Report not available');
        }
        const data = await response.json();
        setReport(data);
      } catch (err) {
        setError(err.message || 'Unable to load report');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      loadReport();
    }
  }, [token]);

  const resolvedContent = useMemo(() => {
    if (!report) return {};
    return resolveReportTokens({
      content: report.content,
      config: report.config,
      lead: report.lead,
      businessProfile: report.business_profile,
    });
  }, [report]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center text-white gap-3">
          <Loader className="w-6 h-6 animate-spin text-blue-400" />
          <p className="text-sm text-slate-300">Preparing your report…</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-center px-4">
        <div className="max-w-md space-y-3">
          <h1 className="text-2xl font-semibold text-white">This shared report is unavailable</h1>
          <p className="text-slate-400 text-sm">
            The sharing link may have expired or been revoked. Reach out to your contractor for the latest version.
          </p>
        </div>
      </div>
    );
  }

  const company = report.business_profile?.company || {};
  const accentColor =
    report.config?.customizations?.accentColor ||
    report.config?.branding?.primaryColor ||
    '#1d4ed8';

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-blue-300">
              Shared Roofing Report
            </p>
            <h1 className="text-3xl font-bold text-white mt-2">
              {report.config?.type?.replace('-', ' ').toUpperCase() || 'Roof Assessment'}
            </h1>
            {report.lead?.address && (
              <p className="text-slate-300 text-sm mt-1">{report.lead.address}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {report.pdf_url && (
              <a
                href={report.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-blue-400 px-4 py-2 text-sm font-semibold text-blue-100 hover:bg-blue-500/10"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </a>
            )}
            {company.phone && (
              <a
                href={`tel:${company.phone}`}
                className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400"
              >
                <Phone className="w-4 h-4" />
                Call {company.name || 'Contractor'}
              </a>
            )}
            {company.website && (
              <a
                href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
              >
                <ExternalLink className="w-4 h-4" />
                Visit Website
              </a>
            )}
          </div>
        </header>

        <div className="bg-white rounded-3xl shadow-2xl ring-1 ring-slate-200 overflow-hidden">
          <ReportCanvas
            config={report.config}
            content={report.content}
            businessProfile={report.business_profile}
            lead={report.lead}
            resolvedContentOverride={resolvedContent}
            hideShadow
          />
        </div>

        <footer className="text-center text-sm text-slate-400">
          <p>
            Report prepared by <span style={{ color: accentColor }}>{company.name || 'Your Roofing Partner'}</span>.
            Shared securely via Fish Mouth.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default SharedReportPage;
