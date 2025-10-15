import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  FileText, Download, Share, Eye, Palette, Settings, 
  Image, BarChart3, Star, Award, CheckCircle, Calendar,
  MapPin, DollarSign, Users, TrendingUp, Target, Zap,
  Phone, Mail, Globe, Printer, Copy, ExternalLink,
  Loader, RefreshCw, Maximize2, Home, Camera, Edit3,
  Save, Send, ArrowLeft, Plus, Trash2, AlertCircle,
  Sparkles, BookOpen, MessageSquare, ChevronDown,
  ChevronUp, PaintBucket, Type, Layout, X
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import ReportCardPreview from './ReportCardPreview';
import VariablePicker from './VariablePicker';
import ReportCanvas from './ReportCanvas';
import businessProfileService from '../services/businessProfileService';
import { leadAPI } from '../services/api';
import { resolveReportTokens } from '../utils/reportTokens';
import { getLeadUrgency, formatLeadAgeLabel, resolveLeadCreatedAt } from '../utils/leads';

const STEP_SEQUENCE = ['lead-selection', 'type-selection', 'customization', 'preview'];

const EnhancedReportGenerator = ({ lead: initialLead, businessProfile, onClose, visible = false }) => {
  const navigate = useNavigate();
  const { reportId } = useParams();
  const [step, setStep] = useState(initialLead?.id ? 'type-selection' : 'lead-selection'); // lead-selection, type-selection, customization, preview
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [imageQualityResults, setImageQualityResults] = useState({});
  const [validatedImages, setValidatedImages] = useState([]);
  const [businessServices, setBusinessServices] = useState(null);
  const [selectedLead, setSelectedLead] = useState(initialLead || null);
  const [availableLeads, setAvailableLeads] = useState([]);
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadSearch, setLeadSearch] = useState('');
  const [leadError, setLeadError] = useState(null);
  const previewRef = useRef(null);

  const lead = selectedLead || initialLead || null;

  useEffect(() => {
    if (initialLead?.id) {
      setSelectedLead(initialLead);
      setAvailableLeads((prev) => {
        const exists = prev.some((item) => String(item.id) === String(initialLead.id));
        if (exists) return prev;
        return [initialLead, ...prev];
      });
    }
  }, [initialLead?.id]);

  const computeLeadScore = useCallback((candidate) => {
    if (!candidate) return 0;

    const urgency = getLeadUrgency(resolveLeadCreatedAt(candidate));
    const priority = (candidate.priority || candidate.status || '').toLowerCase();

    let score = 0;

    if (priority === 'hot') score += 5;
    else if (priority === 'warm') score += 3;
    else if (priority === 'cold') score += 1;

    if (urgency.level === 'critical') score += 4;
    else if (urgency.level === 'high') score += 3;
    else if (urgency.level === 'medium') score += 2;

    if (typeof candidate.lead_score === 'number') {
      score += candidate.lead_score / 25;
    }

    if (typeof candidate.intent_score === 'number') {
      score += candidate.intent_score / 30;
    }

    if (candidate.last_contacted) {
      score += 1;
    }

    return score;
  }, []);

  const loadWizardLeads = useCallback(async () => {
    setLeadLoading(true);
    setLeadError(null);
    try {
      const data = await leadAPI.getLeads({ limit: 150 });
      const rawList = Array.isArray(data)
        ? data
        : Array.isArray(data?.leads)
          ? data.leads
          : [];

      const dedupedMap = new Map();
      rawList.forEach((candidate) => {
        const key = candidate.id || candidate.lead_id || candidate.uuid;
        if (!key) return;
        if (!dedupedMap.has(key)) {
          dedupedMap.set(key, candidate);
        }
      });

      const sorted = Array.from(dedupedMap.values()).sort(
        (a, b) => computeLeadScore(b) - computeLeadScore(a),
      );

      setAvailableLeads(sorted);

      if (!lead && sorted.length > 0 && !selectedLead) {
        setSelectedLead(sorted[0]);
      }
    } catch (error) {
      console.error('Failed to load leads for report wizard', error);
      setLeadError('Unable to load leads. Please refresh and try again.');
    } finally {
      setLeadLoading(false);
    }
  }, [computeLeadScore, lead, selectedLead]);

  useEffect(() => {
    if (visible) {
      loadWizardLeads();
    }
  }, [visible, loadWizardLeads]);

  // Report Configuration
  const [reportConfig, setReportConfig] = useState({
    type: 'damage-assessment',
    template: 'professional',
    sections: {
      executive_summary: { enabled: true, aiGenerated: true },
      property_overview: { enabled: true, aiGenerated: false },
      damage_analysis: { enabled: true, aiGenerated: true },
      recommendations: { enabled: true, aiGenerated: true },
      cost_estimates: { enabled: true, aiGenerated: true },
      before_after_gallery: { enabled: true, aiGenerated: false },
      customer_story: { enabled: false, aiGenerated: true },
      testimonials: { enabled: false, aiGenerated: false },
      company_profile: { enabled: true, aiGenerated: false },
      next_steps: { enabled: true, aiGenerated: true }
    },
    branding: {
      useCompanyColors: true,
      includeLogo: true,
      includeContactInfo: true,
      fontStyle: businessProfile?.branding?.fontFamily || 'Inter',
      layoutStyle: 'modern'
    },
    customizations: {
      headerStyle: 'full-width',
      accentColor: businessProfile?.branding?.primaryColor || '#2563eb',
      secondaryColor: businessProfile?.branding?.secondaryColor || '#64748b'
    }
  });

  // AI Content for each section
  const [aiContent, setAiContent] = useState({});
  const [editingSection, setEditingSection] = useState(null);
  const [aiPrompts, setAiPrompts] = useState({});
  const resolvedReportContent = useMemo(() => {
    return resolveReportTokens({
      content: aiContent,
      config: reportConfig,
      businessProfile,
      lead,
    });
  }, [aiContent, reportConfig, businessProfile, lead]);

  const captureThumbnail = useCallback(async () => {
    if (!previewRef.current) {
      return null;
    }
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      return canvas.toDataURL('image/png', 0.9);
    } catch (error) {
      console.error('Failed to capture report preview thumbnail', error);
      return null;
    }
  }, []);

  // Load business services and validate lead imagery
  useEffect(() => {
    const loadBusinessData = async () => {
      try {
        const services = await businessProfileService.getServices();
        setBusinessServices(services);
        
        // Validate lead imagery if available
        if (lead?.imagery?.length > 0) {
          const validationResults = {};
          const validImages = [];
          
          for (const image of lead.imagery) {
            const validation = businessProfileService.validateImageQuality(image);
            validationResults[image.id] = validation;
            
            if (validation.passed) {
              validImages.push(image);
            }
          }
          
          setImageQualityResults(validationResults);
          setValidatedImages(validImages);
        }
      } catch (error) {
        console.error('Failed to load business data:', error);
        toast.error('Failed to load business configuration');
      }
    };

    if (visible) {
      loadBusinessData();
    }
  }, [visible, lead?.id]);

  const reportTypes = [
    {
      id: 'damage-assessment',
      title: 'Roof Damage Assessment',
      description: 'Comprehensive damage analysis with repair recommendations',
      icon: AlertCircle,
      color: 'red',
      sections: ['executive_summary', 'property_overview', 'damage_analysis', 'recommendations', 'cost_estimates', 'before_after_gallery', 'company_profile', 'next_steps']
    },
    {
      id: 'inspection-report',
      title: 'Property Inspection Report',
      description: 'Detailed inspection findings and maintenance recommendations',
      icon: Eye,
      color: 'blue',
      sections: ['executive_summary', 'property_overview', 'inspection_findings', 'recommendations', 'maintenance_schedule', 'company_profile']
    },
    {
      id: 'project-proposal',
      title: 'Project Proposal',
      description: 'Professional proposal with timeline and pricing',
      icon: Target,
      color: 'green',
      sections: ['executive_summary', 'scope_of_work', 'timeline', 'cost_estimates', 'materials_overview', 'company_profile', 'testimonials']
    },
    {
      id: 'case-study',
      title: 'Project Case Study',
      description: 'Before/after showcase with customer success story',
      icon: Star,
      color: 'purple',
      sections: ['executive_summary', 'project_overview', 'challenges', 'solutions', 'before_after_gallery', 'customer_story', 'results', 'company_profile']
    }
  ];

  const sectionTemplates = {
    executive_summary: {
      title: 'Executive Summary',
      description: 'AI-generated overview of findings and recommendations',
      aiPrompt: 'Create a professional executive summary for a roofing assessment report for {property_address}. Include key findings, severity level, and main recommendations. Keep it concise but compelling for homeowners.',
      placeholder: 'Our comprehensive assessment of your property has identified several key areas requiring attention...'
    },
    damage_analysis: {
      title: 'Damage Analysis',
      description: 'Detailed breakdown of identified issues',
      aiPrompt: 'Generate a detailed damage analysis section for a roof inspection report. Include specific damage types found, their causes, and potential implications if left unaddressed. Use professional yet accessible language.',
      placeholder: 'Through our thorough inspection, we have identified the following areas of concern...'
    },
    recommendations: {
      title: 'Recommendations',
      description: 'Prioritized action items and solutions',
      aiPrompt: 'Create prioritized recommendations for roof repairs based on the damage assessment. Include immediate actions, medium-term maintenance, and preventive measures. Format as a clear action plan.',
      placeholder: 'Based on our assessment, we recommend the following prioritized actions...'
    },
    cost_estimates: {
      title: 'Cost Estimates',
      description: 'Transparent pricing breakdown with business profile integration',
      aiPrompt: 'Generate a professional cost estimates section using the business service data. Include pricing factors, ranges, and value proposition. Integrate actual business pricing when available.',
      placeholder: 'Investment ranges based on your business profile pricing will be detailed below...'
    },
    before_after_gallery: {
      title: 'Before & After Gallery',
      description: 'Quality-checked imagery showcase',
      aiPrompt: null,
      placeholder: 'High-quality images will be automatically selected and formatted...'
    },
    customer_story: {
      title: 'Customer Success Story',
      description: 'Relatable before/after experience narrative',
      aiPrompt: 'Write an engaging customer success story about a similar roofing project. Focus on the customer\'s initial concerns, the solution process, and their satisfaction with results. Make it relatable to {property_type} homeowners.',
      placeholder: 'Here\'s how we helped the Johnson family transform their home...'
    },
    next_steps: {
      title: 'Next Steps',
      description: 'Clear path forward for the customer',
      aiPrompt: 'Create a clear "next steps" section that guides the homeowner through the process of moving forward. Include consultation booking, timeline expectations, and what to expect.',
      placeholder: 'Ready to move forward? Here\'s what happens next...'
    }
  };

  // Generate AI content for a specific section
  const generateAIContent = useCallback(async (sectionId, customPrompt = null) => {
    if (!sectionTemplates[sectionId]) return;
    
    setAiGenerating(true);
    try {
      const pricingContext = businessServices ? await businessProfileService.getPricingContext(reportConfig.type) : null;
      
      const prompt = customPrompt || sectionTemplates[sectionId].aiPrompt
        .replace('{property_address}', lead?.address || 'the property')
        .replace('{property_type}', lead?.property_type || 'residential');

      const response = await fetch('/api/v1/reports/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          section: sectionId,
          lead_id: lead?.id,
          context: {
            property_data: lead,
            business_profile: businessProfile,
            business_services: businessServices,
            pricing_context: pricingContext,
            validated_images: validatedImages,
            report_type: reportConfig.type
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAiContent(prev => ({
          ...prev,
          [sectionId]: data.content
        }));
        toast.success(`Generated ${sectionTemplates[sectionId].title} content`);
      } else {
        throw new Error('AI generation failed');
      }
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error('Failed to generate AI content. Please try again.');
    } finally {
      setAiGenerating(false);
    }
  }, [lead, businessProfile, reportConfig.type]);

  // Initialize report if editing existing
  useEffect(() => {
    if (reportId && reportId !== 'new') {
      loadExistingReport(reportId);
    }
  }, [reportId]);

  const loadExistingReport = async (id) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/reports/${id}`);
      if (response.ok) {
        const data = await response.json();
        setReportData(data);
        setReportConfig(data.config);
        setAiContent(data.content || {});

        if (data.lead_id) {
          try {
            const leadResponse = await fetch(`/api/leads/${data.lead_id}`);
            if (leadResponse.ok) {
              const leadData = await leadResponse.json();
              setSelectedLead(leadData);
              setAvailableLeads((prev) => {
                const exists = prev.find(
                  (item) => String(item.id) === String(leadData.id),
                );
                if (exists) {
                  return prev;
                }
                return [leadData, ...prev];
              });
            }
          } catch (fetchError) {
            console.error('Failed to load lead for report', fetchError);
          }
        }

        setStep('preview');
      }
    } catch (error) {
      console.error('Error loading report:', error);
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const persistReport = useCallback(
    async ({ silent = false } = {}) => {
      if (!lead?.id) {
        toast.error('Select a lead before saving this report');
        return null;
      }

      setLoading(true);
      try {
        const thumbnailData = await captureThumbnail();
        const reportPayload = {
          lead_id: lead.id,
          config: reportConfig,
          content: resolvedReportContent,
          business_profile: businessProfile,
          thumbnail_data: thumbnailData
        };

        const isEditing = reportId && reportId !== 'new';
        const targetUrl = isEditing ? `/api/v1/reports/${reportId}` : '/api/v1/reports';
        const method = isEditing ? 'PUT' : 'POST';

        const response = await fetch(targetUrl, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reportPayload)
        });

        if (!response.ok) {
          throw new Error(`Save failed with status ${response.status}`);
        }

        const data = await response.json();
        setReportData(data);
        setAiContent(data.content || resolvedReportContent);

        if (!isEditing && data?.id) {
          navigate(`/reports/view/${data.id}`);
        }

        if (!silent) {
          toast.success('Report saved successfully');
        }

        return data;
      } catch (error) {
        console.error('Save error:', error);
        if (!silent) {
          toast.error('Failed to save report');
        }
        return null;
      } finally {
        setLoading(false);
      }
    },
    [lead?.id, reportConfig, resolvedReportContent, businessProfile, reportId, navigate, captureThumbnail]
  );

  const saveReport = useCallback(async () => {
    return persistReport({ silent: false });
  }, [persistReport]);

  // Generate and send report
  const generateAndSendReport = async () => {
    if (!lead?.id) {
      toast.error('Select a lead before generating this report');
      return;
    }
    setLoading(true);
    try {
      const savedReport = await persistReport({ silent: true });
      if (savedReport) {
        // Generate PDF and create shareable link
        const response = await fetch(`/api/v1/reports/${savedReport.id}/generate-pdf`, {
          method: 'POST'
        });
        
        if (response.ok) {
          const data = await response.json();
          
          try {
            await fetch(`/api/v1/reports/${savedReport.id}/share`, {
              method: 'POST'
            });
          } catch (shareError) {
            console.warn('Share link creation failed', shareError);
          }

          const sendResponse = await fetch(`/api/v1/reports/${savedReport.id}/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lead_id: lead.id,
              method: 'email'
            })
          });

          if (!sendResponse.ok) {
            throw new Error('Failed to send report');
          }

          toast.success('Report generated and sent!');
          navigate(`/dashboard/reports/${savedReport.id}`);
        }
      }
    } catch (error) {
      console.error('Generate error:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  // Handle report type selection
  const handleReportTypeSelect = (reportType) => {
    setReportConfig(prev => ({ ...prev, type: reportType }));
    setStep('customization');
  };

  const leadOptions = useMemo(() => {
    const sorted = [...availableLeads].sort(
      (a, b) => computeLeadScore(b) - computeLeadScore(a),
    );
    const query = leadSearch.trim().toLowerCase();
    if (!query) {
      return sorted;
    }
    return sorted.filter((candidate) => {
      const haystack = [
        candidate.homeowner_name,
        candidate.name,
        candidate.address,
        candidate.city,
        candidate.state,
        candidate.email,
        candidate.phone,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [availableLeads, leadSearch, computeLeadScore]);

  const renderLeadSelection = () => {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-gray-900">Choose Your Target Lead</h2>
          <p className="text-gray-600">
            Hot and high-intent properties show up first. Pair the right home with your report template.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={leadSearch}
              onChange={(event) => setLeadSearch(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Search by homeowner, address, city, or phone"
            />
          </div>
          <button
            type="button"
            onClick={loadWizardLeads}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
            disabled={leadLoading}
          >
            {leadLoading ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </button>
        </div>

        {leadError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {leadError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-1">
          {leadLoading && (
            <div className="sm:col-span-2 flex items-center justify-center py-16 text-gray-500">
              <Loader className="mr-2 h-5 w-5 animate-spin" />
              Loading leads…
            </div>
          )}
          {!leadLoading && leadOptions.length === 0 && (
            <div className="sm:col-span-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
              No leads match that search. Try clearing filters or refreshing your list.
            </div>
          )}
          {leadOptions.map((candidate) => {
            const urgency = getLeadUrgency(resolveLeadCreatedAt(candidate));
            const isSelected = lead && String(lead.id) === String(candidate.id);
            return (
              <button
                key={candidate.id}
                type="button"
                onClick={() => setSelectedLead(candidate)}
                className={[
                  'w-full text-left rounded-2xl border px-4 py-4 transition shadow-sm',
                  isSelected
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                    : 'border-gray-200 bg-white hover:border-blue-200 hover:shadow-md'
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {candidate.homeowner_name || candidate.name || 'Unnamed homeowner'}
                    </p>
                    <p className="text-xs text-gray-600">
                      {[candidate.address, candidate.city, candidate.state]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                  <span
                    className={[
                      'rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide',
                      urgency.level === 'critical'
                        ? 'bg-red-100 text-red-700'
                        : urgency.level === 'high'
                          ? 'bg-orange-100 text-orange-700'
                          : urgency.level === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {urgency.message}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                  <span>Lead score: {candidate.lead_score ?? '—'}</span>
                  <span>{formatLeadAgeLabel(urgency.hoursOld)}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (!lead?.id) {
                toast.error('Select a lead to continue');
                return;
              }
              setStep('type-selection');
            }}
            disabled={!lead?.id}
            className={[
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white',
              lead?.id ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-300'
            ]
              .filter(Boolean)
              .join(' ')}
          >
            Continue to templates
          </button>
        </div>
      </div>
    );
  };

  // Render type selection step with beautiful card previews
  const goToPreviousStep = useCallback(() => {
    const currentIndex = STEP_SEQUENCE.indexOf(step);
    if (currentIndex <= 0) return;
    setStep(STEP_SEQUENCE[currentIndex - 1]);
  }, [step]);

  const renderTypeSelection = () => (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Create Professional Report</h2>
        <p className="text-lg text-gray-600 mb-2">
          Choose the type of report you'd like to create for{' '}
          {lead?.homeowner_name || lead?.name || lead?.address || 'your lead'}
        </p>
        <p className="text-sm text-gray-500">
          Each template includes mockup branding to show you exactly what your report will look like.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <ReportCardPreview
          reportType="damage-assessment"
          onSelect={handleReportTypeSelect}
          selected={reportConfig.type === 'damage-assessment'}
        />
        <ReportCardPreview
          reportType="inspection-report"
          onSelect={handleReportTypeSelect}
          selected={reportConfig.type === 'inspection-report'}
        />
        <ReportCardPreview
          reportType="project-proposal"
          onSelect={handleReportTypeSelect}
          selected={reportConfig.type === 'project-proposal'}
        />
        <ReportCardPreview
          reportType="case-study"
          onSelect={handleReportTypeSelect}
          selected={reportConfig.type === 'case-study'}
        />
      </div>

      {/* Additional Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start space-x-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Sparkles className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">AI-Powered Content Generation</h3>
            <p className="text-blue-800 mb-3">
              Each report template includes AI-generated content tailored to your business profile, 
              lead data, and inspection findings. You can customize or regenerate any section.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <span className="text-blue-800">Branded with your company colors & logo</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <span className="text-blue-800">Integrated with your service pricing</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <span className="text-blue-800">Quality-checked imagery inclusion</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render customization step
  const renderCustomization = () => {
    const selectedType = reportTypes.find(t => t.id === reportConfig.type);
    
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Customize Your {selectedType?.title}</h2>
            <p className="text-gray-600">Configure sections and AI-generated content</p>
          </div>
          <button
            onClick={() => setStep('preview')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Preview Report
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sections Configuration */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Report Sections</h3>
            {selectedType?.sections.map(sectionId => {
              const template = sectionTemplates[sectionId];
              if (!template) return null;

              return (
                <div key={sectionId} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={reportConfig.sections[sectionId]?.enabled}
                        onChange={(e) => setReportConfig(prev => ({
                          ...prev,
                          sections: {
                            ...prev.sections,
                            [sectionId]: { ...prev.sections[sectionId], enabled: e.target.checked }
                          }
                        }))}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <h4 className="font-medium text-gray-900">{template.title}</h4>
                    </div>
                    {reportConfig.sections[sectionId]?.aiGenerated && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => generateAIContent(sectionId)}
                          disabled={aiGenerating}
                          className="flex items-center space-x-1 px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50"
                        >
                          {aiGenerating ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4" />
                          )}
                          <span>Generate AI</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                  
                  {reportConfig.sections[sectionId]?.enabled && (
                    <div className="space-y-3">
                      {reportConfig.sections[sectionId]?.aiGenerated && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            AI Prompt (optional customization)
                          </label>
                          <textarea
                            value={aiPrompts[sectionId] || ''}
                            onChange={(e) => setAiPrompts(prev => ({ ...prev, [sectionId]: e.target.value }))}
                            onFocus={() => setEditingSection(sectionId)}
                            placeholder={template.aiPrompt}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                            rows={2}
                          />
                        </div>
                      )}
                      
                      {aiContent[sectionId] && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-green-800">AI Generated Content</span>
                            <button
                              onClick={() => generateAIContent(sectionId, aiPrompts[sectionId])}
                              className="text-sm text-green-600 hover:text-green-800"
                            >
                              Regenerate
                            </button>
                          </div>
                          <p className="text-sm text-green-700 line-clamp-3">{aiContent[sectionId]}</p>
                        </div>
                      )}

                      {/* Special handling for image gallery section */}
                      {sectionId === 'before_after_gallery' && (
                        <div className="mt-4 space-y-3">
                          <h5 className="text-sm font-medium text-gray-900">Image Quality Analysis</h5>
                          {validatedImages.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {validatedImages.slice(0, 4).map((image, index) => (
                                <div key={index} className="relative group">
                                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                                    <img
                                      src={image.url || '/api/placeholder/100/100'}
                                      alt={`Validated image ${index + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="absolute top-1 right-1">
                                    <div className="bg-green-500 text-white p-1 rounded-full">
                                      <CheckCircle className="w-3 h-3" />
                                    </div>
                                  </div>
                                  {imageQualityResults[image.id] && (
                                    <div className="absolute inset-0 bg-black bg-opacity-75 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <div className="text-white text-xs text-center p-2">
                                        <div>Quality: {Math.round(imageQualityResults[image.id].score * 100)}%</div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <div className="flex items-start space-x-3">
                                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium text-yellow-800">No High-Quality Images Found</p>
                                  <p className="text-xs text-yellow-700 mt-1">
                                    Upload high-resolution images (min 800x600) with good lighting for best results.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {lead?.imagery?.length > validatedImages.length && (
                            <div className="text-xs text-gray-600">
                              {lead.imagery.length - validatedImages.length} images did not meet quality standards
                            </div>
                          )}
                        </div>
                      )}

                      {/* Special handling for cost estimates with business profile integration */}
                      {sectionId === 'cost_estimates' && businessServices && (
                        <div className="mt-4 space-y-3">
                          <h5 className="text-sm font-medium text-gray-900">Pricing Integration</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="font-medium text-blue-900">Inspection Services</div>
                              <div className="text-blue-700 mt-1">
                                Basic: ${businessServices.inspections?.basic?.price || 150}
                              </div>
                              <div className="text-blue-700">
                                Comprehensive: ${businessServices.inspections?.comprehensive?.price || 295}
                              </div>
                            </div>
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                              <div className="font-medium text-green-900">Repair Ranges</div>
                              <div className="text-green-700 mt-1">
                                Minor: ${businessServices.repairs?.minor?.priceRange?.[0] || 200} - ${businessServices.repairs?.minor?.priceRange?.[1] || 800}
                              </div>
                              <div className="text-green-700">
                                Major: ${businessServices.repairs?.major?.priceRange?.[0] || 3500} - ${businessServices.repairs?.major?.priceRange?.[1] || 15000}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Branding & Style Configuration */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Branding & Style</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={reportConfig.branding.useCompanyColors}
                      onChange={(e) => setReportConfig(prev => ({
                        ...prev,
                        branding: { ...prev.branding, useCompanyColors: e.target.checked }
                      }))}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm font-medium">Use company colors</span>
                  </label>
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={reportConfig.branding.includeLogo}
                      onChange={(e) => setReportConfig(prev => ({
                        ...prev,
                        branding: { ...prev.branding, includeLogo: e.target.checked }
                      }))}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm font-medium">Include company logo</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template Style</label>
                  <select
                    value={reportConfig.branding.layoutStyle}
                    onChange={(e) => setReportConfig(prev => ({
                      ...prev,
                      branding: { ...prev.branding, layoutStyle: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="modern">Modern Clean</option>
                    <option value="professional">Professional</option>
                    <option value="branded">Heavily Branded</option>
                    <option value="minimal">Minimal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Accent Color</label>
                  <input
                    type="color"
                    value={reportConfig.customizations.accentColor}
                    onChange={(e) => setReportConfig(prev => ({
                      ...prev,
                      customizations: { ...prev.customizations, accentColor: e.target.value }
                    }))}
                    className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Preview Card */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-3">Style Preview</h4>
              <div 
                className="aspect-[8.5/11] bg-white rounded shadow-sm border p-3 text-xs"
                style={{ 
                  borderTop: `4px solid ${reportConfig.customizations.accentColor}`,
                  fontFamily: reportConfig.branding.fontStyle 
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  {reportConfig.branding.includeLogo && businessProfile?.branding?.logo && (
                    <img src={businessProfile.branding.logo} alt="Logo" className="h-6" />
                  )}
                  <div className="text-right">
                    <div className="font-semibold">{businessProfile?.company?.name || 'Your Company'}</div>
                    <div className="text-gray-600">{businessProfile?.company?.phone || '(555) 123-4567'}</div>
                  </div>
                </div>
                <div 
                  className="h-6 rounded mb-2"
                  style={{ backgroundColor: reportConfig.customizations.accentColor + '20' }}
                />
                <div className="space-y-1">
                  <div className="h-2 bg-gray-200 rounded w-3/4" />
                  <div className="h-2 bg-gray-200 rounded w-full" />
                  <div className="h-2 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-4">
            {step !== 'lead-selection' && (
              <button
                onClick={goToPreviousStep}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Report Generator</h1>
              <p className="text-sm text-gray-600">
                {lead
                  ? `Creating report for ${lead.homeowner_name || lead.name || lead.address || 'selected lead'}`
                  : 'Select a lead to personalize your report'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {step === 'preview' && (
              <>
                <button
                  onClick={saveReport}
                  disabled={loading || !lead?.id}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Draft</span>
                </button>
                <button
                  onClick={generateAndSendReport}
                  disabled={loading || !lead?.id}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Generate & Send</span>
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
        </div>
      </div>

      {!lead?.id && (
        <div className="px-6 pt-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Select a lead from Customer Reports to personalize this document. You can still explore templates and branding while you pick a property.
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {step === 'lead-selection' && renderLeadSelection()}
        {step === 'type-selection' && renderTypeSelection()}
        {step === 'customization' && (
          <div className="space-y-6">
            {renderCustomization()}
            <VariablePicker
              businessProfile={businessProfile}
              lead={lead}
              onSelect={(token) => {
                if (!editingSection) {
                  toast.error('Select a section prompt to insert this variable');
                  return;
                }
                setAiPrompts((prev) => {
                  const current = prev[editingSection] || '';
                  const separator = current ? ' ' : '';
                  return {
                    ...prev,
                    [editingSection]: `${current}${separator}${token}`,
                  };
                });
              }}
            />
          </div>
        )}
        {step === 'preview' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Report Preview</h2>
              <p className="text-gray-600">Review and edit your report before generating</p>
            </div>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="bg-gray-100 p-6 rounded-2xl">
                <div className="mx-auto max-w-3xl">
                  <div ref={previewRef} className="mx-auto max-w-2xl">
                    <ReportCanvas
                      config={reportConfig}
                      content={aiContent}
                      businessProfile={businessProfile}
                      lead={lead}
                      resolvedContentOverride={resolvedReportContent}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Active Sections</h3>
                  <ul className="space-y-1 text-xs text-gray-600">
                    {Object.entries(reportConfig.sections || {})
                      .filter(([, config]) => config?.enabled !== false)
                      .map(([key]) => (
                        <li key={key} className="flex items-center gap-2">
                          <CheckCircle className="h-3.5 w-3.5 text-blue-500" />
                          <span>{sectionTemplates[key]?.title || key.replace(/_/g, ' ')}</span>
                        </li>
                      ))}
                  </ul>
                </div>
                {lead && (
                  <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700 space-y-1">
                    <h3 className="text-sm font-semibold text-gray-900">Lead Snapshot</h3>
                    <p>{lead.homeowner_name || lead.name}</p>
                    <p className="text-xs text-gray-500">
                      {[lead.address, lead.city, lead.state].filter(Boolean).join(', ')}
                    </p>
                    {lead.phone && <p className="text-xs">Phone: {lead.phone}</p>}
                    {lead.email && <p className="text-xs">Email: {lead.email}</p>}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedReportGenerator;
