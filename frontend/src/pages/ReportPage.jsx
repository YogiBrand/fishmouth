import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit3, Save, Download, Send,
  Loader, Copy, FileText, Sparkles, MessageSquare,
  CheckCircle, AlertCircle, DollarSign, Home,
  Camera, Award, Target, Printer
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import ReportCanvas from '../components/ReportCanvas';
import { resolveReportTokens } from '../utils/reportTokens';

const ReportPage = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [lead, setLead] = useState(null);
  const [businessProfile, setBusinessProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [regenerating, setRegenerating] = useState(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const reportRef = useRef(null);

  const effectiveBusinessProfile = useMemo(() => {
    if (report?.business_profile && Object.keys(report.business_profile || {}).length > 0) {
      return report.business_profile;
    }
    return businessProfile;
  }, [report?.business_profile, businessProfile]);

  const resolvedReportContent = useMemo(() => {
    if (!report) return {};
    return resolveReportTokens({
      content: report.content || {},
      config: report.config || {},
      businessProfile: effectiveBusinessProfile,
      lead,
    });
  }, [report, effectiveBusinessProfile, lead]);

  const sectionOrder = useMemo(() => {
    if (report?.config?.sections) {
      return Object.keys(report.config.sections);
    }
    if (report?.content) {
      return Object.keys(report.content);
    }
    return [];
  }, [report?.config?.sections, report?.content]);

  useEffect(() => {
    if (editing && !editingSection && sectionOrder.length > 0) {
      setEditingSection(sectionOrder[0]);
    }
    if (!editing && editingSection) {
      setEditingSection(null);
    }
  }, [editing, editingSection, sectionOrder]);

  // Load report data
  useEffect(() => {
    if (reportId) {
      loadReport();
    }
  }, [reportId]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const [reportResponse, businessResponse] = await Promise.all([
        fetch(`/api/v1/reports/${reportId}`),
        fetch('/api/business/profile')
      ]);

      if (reportResponse.ok && businessResponse.ok) {
        const reportData = await reportResponse.json();
        const businessData = await businessResponse.json();
        
        setReport(reportData);
        setBusinessProfile(businessData);
        
        // Load associated lead data
        if (reportData.lead_id) {
          const leadResponse = await fetch(`/api/leads/${reportData.lead_id}`);
          if (leadResponse.ok) {
            const leadData = await leadResponse.json();
            setLead(leadData);
          }
        }
      } else {
        throw new Error('Failed to load report');
      }
    } catch (error) {
      console.error('Error loading report:', error);
      toast.error('Failed to load report');
      navigate('/dashboard/reports');
    } finally {
      setLoading(false);
    }
  };

  // Save report changes
  const saveReport = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/reports/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      });

      if (response.ok) {
        const updatedReport = await response.json();
        setReport(updatedReport);
        toast.success('Report saved successfully');
        setEditing(false);
        setEditingSection(null);
      } else {
        throw new Error('Save failed');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save report');
    } finally {
      setLoading(false);
    }
  };

  // Regenerate AI content for section
  const regenerateSection = async (sectionId) => {
    setRegenerating(sectionId);
    try {
      const response = await fetch('/api/v1/reports/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt || `Regenerate the ${sectionId.replace('_', ' ')} section for this report with improved content`,
          section: sectionId,
          lead_id: report.lead_id,
          report_id: reportId,
          context: {
            existing_content: report.content[sectionId],
            property_data: lead,
            business_profile: businessProfile,
            report_type: report.config.type
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setReport(prev => ({
          ...prev,
          content: {
            ...prev.content,
            [sectionId]: data.content
          }
        }));
        setAiPrompt('');
        setEditingSection(null);
        toast.success('Section regenerated successfully');
      } else {
        throw new Error('Regeneration failed');
      }
    } catch (error) {
      console.error('Regeneration error:', error);
      toast.error('Failed to regenerate content');
    } finally {
      setRegenerating(null);
    }
  };

  // Generate PDF
  const generatePDF = async () => {
    if (!report || !reportRef.current) return;

    setLoading(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF();
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${report.config.type}-${lead?.homeowner_name || lead?.name || 'report'}.pdf`);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setLoading(false);
    }
  };

  // Print
  const printReport = () => {
    window.print();
  };

  // Send report to lead
  const sendReport = async () => {
    if (!report) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/reports/${reportId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: report.lead_id,
          method: 'email' // Could be expanded to include SMS, etc.
        })
      });

      if (response.ok) {
        toast.success('Report sent successfully');
        
        // Create activity entry
        await fetch('/api/v1/activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'report_sent',
            title: 'Report Sent to Lead',
            message: `${report.config.type.replace('-', ' ')} report sent to ${lead?.homeowner_name || lead?.name || 'lead'}`,
            lead_id: report.lead_id,
            report_id: reportId
          })
        });
      } else {
        throw new Error('Send failed');
      }
    } catch (error) {
      console.error('Send error:', error);
      toast.error('Failed to send report');
    } finally {
      setLoading(false);
    }
  };

  // Copy shareable link
  const copyShareableLink = async () => {
    try {
      let sharePath = report?.share_url;

      if (!sharePath) {
        const response = await fetch(`/api/v1/reports/${reportId}/share`, { method: 'POST' });
        if (response.ok) {
          const data = await response.json();
          sharePath = data.share_url;
          setReport((prev) => ({ ...prev, share_url: data.share_url }));
        }
      }

      const effectivePath = sharePath || `/reports/view/${reportId}`;
      const shareUrl = `${window.location.origin}${effectivePath}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Shareable link copied to clipboard');
    } catch (error) {
      console.error('Failed to copy share link', error);
      toast.error('Unable to copy share link');
    }
  };

  if (loading && !report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading report...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Report Not Found</h1>
          <p className="text-gray-600 mb-4">The report you're looking for doesn't exist or has been deleted.</p>
          <button
            onClick={() => navigate('/dashboard/reports')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Reports
          </button>
        </div>
      </div>
    );
  }

  const sectionIcons = {
    executive_summary: FileText,
    property_overview: Home,
    damage_analysis: AlertCircle,
    recommendations: CheckCircle,
    cost_estimates: DollarSign,
    before_after_gallery: Camera,
    customer_story: MessageSquare,
    company_profile: Award,
    next_steps: Target
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard/reports')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {report.config.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} Report
                </h1>
                <p className="text-sm text-gray-600">
                  {lead?.name && `For ${lead.name}`} • Created {new Date(report.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {editing ? (
                <>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setEditingSection(null);
                    }}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveReport}
                    disabled={loading}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Save Changes</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={copyShareableLink}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Copy shareable link"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                  <button
                    onClick={printReport}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print</span>
                  </button>
                  <button
                    onClick={generatePDF}
                    disabled={loading}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    <span>Download PDF</span>
                  </button>
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={sendReport}
                    disabled={loading}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>Send to Lead</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:max-w-none">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Section Navigation (when editing) */}
          {editing && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border p-4 sticky top-24">
                <h3 className="font-semibold text-gray-900 mb-4">Report Sections</h3>
                <div className="space-y-2">
                  {sectionOrder
                    .filter((sectionId) => report?.config?.sections?.[sectionId]?.enabled !== false)
                    .map(sectionId => {
                    const Icon = sectionIcons[sectionId] || FileText;
                    const isEditing = editingSection === sectionId;
                    
                    return (
                      <button
                        key={sectionId}
                        onClick={() => setEditingSection(isEditing ? null : sectionId)}
                        className={`w-full flex items-center space-x-3 px-3 py-2 text-left rounded-lg transition-colors ${
                          isEditing
                            ? 'bg-blue-100 text-blue-700'
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {sectionId.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {editingSection && (
                <div className="mt-6 bg-white rounded-lg shadow-sm border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">
                        {editingSection.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </h4>
                      <p className="text-xs text-gray-500">Update the copy for this section.</p>
                    </div>
                    {report.config.sections[editingSection]?.aiGenerated && (
                      <button
                        onClick={() => regenerateSection(editingSection)}
                        disabled={regenerating === editingSection}
                        className="inline-flex items-center gap-1 rounded-lg border border-purple-200 px-3 py-1 text-xs font-medium text-purple-600 hover:bg-purple-50 disabled:opacity-50"
                      >
                        {regenerating === editingSection ? (
                          <Loader className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        Regenerate
                      </button>
                    )}
                  </div>
                  <textarea
                    value={report.content?.[editingSection] || ''}
                    onChange={(event) =>
                      setReport((prev) => ({
                        ...prev,
                        content: {
                          ...prev.content,
                          [editingSection]: event.target.value,
                        },
                      }))
                    }
                    rows={10}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                  {report.config.sections[editingSection]?.aiGenerated && (
                    <div className="mt-4 space-y-2">
                      <label className="text-xs font-medium text-purple-900" htmlFor="ai-prompt">
                        AI regeneration prompt
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="ai-prompt"
                          type="text"
                          value={aiPrompt}
                          onChange={(event) => setAiPrompt(event.target.value)}
                          placeholder="Tell the AI how to improve this section"
                          className="flex-1 rounded-lg border border-purple-200 px-3 py-2 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                        />
                        <button
                          onClick={() => regenerateSection(editingSection)}
                          disabled={regenerating === editingSection}
                          className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
                        >
                          {regenerating === editingSection ? (
                            <Loader className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                          Refresh copy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Report Content */}
          <div className={editing ? "lg:col-span-3" : "lg:col-span-4"}>
            <div
              ref={reportRef}
              className="bg-white rounded-lg shadow-lg border overflow-hidden print:shadow-none print:border-0"
            >
              <ReportCanvas
                config={report.config}
                content={report.content}
                businessProfile={effectiveBusinessProfile}
                lead={lead}
                resolvedContentOverride={resolvedReportContent}
                hideShadow
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportPage;
