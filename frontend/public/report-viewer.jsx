const { useState } = React;

function PropertyReportViewer() {
  const reportData = window.REPORT_DATA || {};
  const reportId = window.REPORT_ID;

  const [emailAddress, setEmailAddress] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const urgencyScore = reportData.total_urgency_score || 0;
  const urgencyColor = urgencyScore >= 90
    ? 'bg-red-600'
    : urgencyScore >= 70
    ? 'bg-orange-500'
    : urgencyScore >= 50
    ? 'bg-yellow-500'
    : 'bg-green-500';

  const aerialImages = (reportData.aerial_images && Array.isArray(reportData.aerial_images)) ? reportData.aerial_images : [];
  const aerialImage = reportData.aerial_image_with_overlay || (aerialImages.length > 0 ? aerialImages[0].url : '');
  const roofAge = reportData.roof_age_years ?? (new Date().getFullYear() - (reportData.year_built || new Date().getFullYear()));

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/v1/reports/report/${reportId}/download`, { method: 'POST' });
      if (!response.ok) throw new Error('Download failed');
      const data = await response.json();
      if (data.pdf_url) {
        window.open(data.pdf_url, '_blank');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const handleEmailPDF = async (event) => {
    event.preventDefault();
    const response = await fetch(`/api/v1/reports/report/${reportId}/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email_address: emailAddress }),
    });
    if (response.ok) {
      setEmailSent(true);
    }
  };

  const callContractor = () => {
    if (reportData.phone) {
      window.location.href = `tel:${reportData.phone}`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">Professional Roof Assessment</h1>
            <p className="text-xl">{reportData.address}</p>
            <p className="text-lg opacity-90">{reportData.city}, {reportData.state} {reportData.zip_code}</p>
          </div>
          <div className="flex justify-center mb-8">
            <div className={`${urgencyColor} text-white px-8 py-4 rounded-lg shadow-lg`}>
              <div className="text-center">
                <div className="text-5xl font-bold">{urgencyScore}</div>
                <div className="text-sm uppercase tracking-wide">Urgency Score (out of 100)</div>
                <div className="text-xs mt-2">
                  {urgencyScore >= 90
                    ? 'CRITICAL - Act Immediately'
                    : urgencyScore >= 70
                    ? 'HIGH - Schedule Within 2 Weeks'
                    : urgencyScore >= 50
                    ? 'MODERATE - Plan for Near Future'
                    : 'LOW - Monitor Condition'}
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={callContractor}
              className="bg-white text-blue-900 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition shadow-lg"
            >
              📞 Call {reportData.company_name || 'Contractor'}
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="bg-blue-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-600 transition"
            >
              {isDownloading ? 'Generating…' : '📄 Download PDF Report'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <section className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Executive Summary</h2>
          <p className="text-lg text-gray-700 leading-relaxed">
            {reportData.executive_summary || 'Our analysis compiles neighbourhood momentum, roof age signals, and financial readiness to prioritise your next roofing conversation.'}
          </p>
        </section>

        {aerialImage && (
          <section className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Aerial Analysis</h2>
            <img
              src={aerialImage}
              alt="Aerial view"
              className="w-full rounded-lg shadow-md"
            />
            <div className="bg-gray-50 p-6 rounded-lg mt-4">
              <h3 className="font-bold text-lg mb-4">Damage Severity Legend</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { color: 'bg-red-500', label: 'Critical', desc: 'Immediate action required' },
                  { color: 'bg-orange-500', label: 'Severe', desc: 'Address within 1-3 months' },
                  { color: 'bg-yellow-400', label: 'Moderate', desc: 'Monitor and plan replacement' },
                  { color: 'bg-green-500', label: 'Minor', desc: 'Normal wear, not urgent' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className={`w-8 h-8 ${item.color} rounded`}></div>
                    <div>
                      <div className="font-semibold">{item.label}</div>
                      <div className="text-sm text-gray-600">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">Key Findings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Overall Condition</div>
              <div className="text-4xl font-bold text-blue-900">
                {(reportData.overall_condition_score ?? 6).toFixed(1)}/10
              </div>
            </div>
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Estimated Remaining Life</div>
              <div className="text-4xl font-bold text-blue-900">
                {reportData.estimated_remaining_life_years ?? Math.max(0, 30 - roofAge)} <span className="text-2xl">years</span>
              </div>
            </div>
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Roof Age</div>
              <div className="text-4xl font-bold text-blue-900">~{roofAge} <span className="text-2xl">years</span></div>
            </div>
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Action Timeline</div>
              <div className="text-lg font-semibold text-blue-900">
                {reportData.recommended_action || 'Schedule inspection in neighbourhood window'}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Neighborhood Activity</h2>
          <p className="text-lg text-gray-700 mb-6">
            {(reportData.neighborhood_context && reportData.neighborhood_context.summary) || 'Recent permits in your area signal active replacements and preferred pricing windows.'}
          </p>
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded">
            <div className="flex items-start gap-4">
              <div className="text-4xl">🏘️</div>
              <div className="space-y-2 text-gray-700">
                <div>✓ <strong>{reportData.permits_within_quarter_mile || 0}</strong> permits within 0.25 miles (90 days)</div>
                <div>✓ <strong>{reportData.permits_within_500ft || 0}</strong> permits within 500 feet</div>
                {reportData.nearest_permit_address && (
                  <div>✓ Nearest permit: <strong>{reportData.nearest_permit_address}</strong></div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Our Recommendations</h2>
          <div className="space-y-3">
            {(reportData.recommendations && reportData.recommendations.action ? [reportData.recommendations.action] : [
              'Schedule your on-site inspection to validate aerial findings.',
              'Lock in neighbourhood pricing while crews are in the area.',
            ]).map((rec, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="text-blue-600 font-bold text-xl">→</div>
                <div className="text-lg text-gray-700">{rec}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">📧 Email This Report</h2>
          {!emailSent ? (
            <form onSubmit={handleEmailPDF} className="flex flex-col sm:flex-row gap-4">
              <input
                type="email"
                value={emailAddress}
                onChange={(event) => setEmailAddress(event.target.value)}
                placeholder="your.email@example.com"
                required
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Send PDF
              </button>
            </form>
          ) : (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-green-800">
              ✓ Report sent to {emailAddress}! Check your inbox.
            </div>
          )}
        </section>

        <section className="bg-gradient-to-r from-blue-900 to-blue-700 text-white rounded-lg shadow-xl p-12 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8 opacity-90">
            Schedule your free detailed inspection with {reportData.company_name || 'our team'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={callContractor}
              className="bg-white text-blue-900 px-10 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition shadow-lg"
            >
              📞 Call Now: {reportData.phone || 'N/A'}
            </button>
            <a
              href={`mailto:${reportData.email || 'info@fishmouth.io'}`}
              className="bg-blue-500 text-white px-10 py-4 rounded-lg font-bold text-lg hover:bg-blue-600 transition"
            >
              ✉️ Email Us
            </a>
          </div>
          <div className="mt-8 text-sm opacity-75">
            <div className="font-semibold mb-1">{reportData.company_name || 'Fish Mouth Contractor'}</div>
            {reportData.license_number && <div>License #{reportData.license_number}</div>}
            <div>{reportData.email || 'info@fishmouth.io'}</div>
          </div>
        </section>
      </div>

      <footer className="bg-gray-800 text-white py-8 mt-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-sm opacity-75">
            Report generated by Fish Mouth • Professional Roof Analysis Platform
          </p>
          <p className="text-xs opacity-50 mt-2">
            This report is for informational purposes. Final inspection required for binding quote.
          </p>
        </div>
      </footer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<PropertyReportViewer />);
