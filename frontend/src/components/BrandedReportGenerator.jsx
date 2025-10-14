import React, { useState, useEffect } from 'react';
import {
  FileText, Download, Share, Eye, Palette, Settings, 
  Image, BarChart3, Star, Award, CheckCircle, Calendar,
  MapPin, DollarSign, Users, TrendingUp, Target, Zap,
  Phone, Mail, Globe, Printer, Copy, ExternalLink,
  Loader, RefreshCw, Maximize2, Home, Camera
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';

const BrandedReportGenerator = ({ caseStudy, businessProfile, onClose, visible = false }) => {
  const [reportType, setReportType] = useState('case-study');
  const [generating, setGenerating] = useState(false);
  const [reportPreview, setReportPreview] = useState(null);
  const [customizations, setCustomizations] = useState({
    includeBeforeAfter: true,
    includeTestimonial: true,
    includeCompanyInfo: true,
    includeProjectDetails: true,
    includePricing: false,
    template: 'professional',
    colorScheme: 'primary'
  });

  const reportTypes = [
    { 
      id: 'case-study', 
      label: 'Case Study Report', 
      description: 'Detailed project showcase with before/after photos',
      icon: FileText 
    },
    { 
      id: 'proposal', 
      label: 'Project Proposal', 
      description: 'Professional proposal for potential clients',
      icon: Target 
    },
    { 
      id: 'portfolio', 
      label: 'Portfolio Summary', 
      description: 'Collection of your best work',
      icon: Award 
    }
  ];

  const templates = [
    { id: 'professional', label: 'Professional', preview: '/templates/professional.jpg' },
    { id: 'modern', label: 'Modern Minimal', preview: '/templates/modern.jpg' },
    { id: 'classic', label: 'Classic Elegant', preview: '/templates/classic.jpg' }
  ];

  useEffect(() => {
    if (visible && caseStudy && businessProfile) {
      generateReportPreview();
    }
  }, [visible, caseStudy, businessProfile, customizations]);

  const generateReportPreview = async () => {
    try {
      const reportData = {
        ...caseStudy,
        businessProfile,
        customizations,
        generatedAt: new Date().toISOString(),
        reportId: `RPT_${Date.now()}`
      };
      setReportPreview(reportData);
    } catch (error) {
      console.error('Error generating preview:', error);
    }
  };

  const downloadReport = async (format = 'pdf') => {
    setGenerating(true);
    try {
      const element = document.getElementById('report-content');
      if (!element) throw new Error('Report content not found');

      if (format === 'pdf') {
        // Generate PDF
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          allowTaint: true
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${caseStudy.title.replace(/\s+/g, '-').toLowerCase()}-report.pdf`);
        
      } else if (format === 'image') {
        // Generate high-res image
        const canvas = await html2canvas(element, {
          scale: 3,
          useCORS: true,
          allowTaint: true
        });
        
        const link = document.createElement('a');
        link.download = `${caseStudy.title.replace(/\s+/g, '-').toLowerCase()}-report.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
      
      toast.success(`Report downloaded as ${format.toUpperCase()}!`);
    } catch (error) {
      toast.error('Failed to generate report');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const shareReport = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${caseStudy.title} - ${businessProfile.company?.name}`,
          text: `Check out this ${reportType} report`,
          url: window.location.href
        });
      } else {
        // Fallback - copy link to clipboard
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden flex">
        
        {/* Sidebar - Report Options */}
        <div className="w-80 bg-slate-50 border-r border-slate-200 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">Report Generator</h2>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              ×
            </button>
          </div>

          {/* Report Type Selection */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Report Type</h3>
            <div className="space-y-2">
              {reportTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setReportType(type.id)}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    reportType === type.id
                      ? 'bg-blue-100 border border-blue-200 text-blue-700'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <type.icon size={18} />
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs opacity-75">{type.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Template Selection */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Template</h3>
            <div className="space-y-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setCustomizations(prev => ({ ...prev, template: template.id }))}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    customizations.template === template.id
                      ? 'bg-purple-100 border border-purple-200 text-purple-700'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-medium">{template.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Customizations */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Content Options</h3>
            <div className="space-y-3">
              {Object.entries({
                includeBeforeAfter: 'Before/After Photos',
                includeTestimonial: 'Customer Testimonial',
                includeCompanyInfo: 'Company Information',
                includeProjectDetails: 'Project Details',
                includePricing: 'Pricing Information'
              }).map(([key, label]) => (
                <label key={key} className="flex items-center space-x-3 text-sm">
                  <input
                    type="checkbox"
                    checked={customizations[key]}
                    onChange={(e) => setCustomizations(prev => ({ ...prev, [key]: e.target.checked }))}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-slate-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => downloadReport('pdf')}
              disabled={generating}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {generating ? <Loader size={18} className="animate-spin" /> : <Download size={18} />}
              <span>Download PDF</span>
            </button>
            
            <button
              onClick={() => downloadReport('image')}
              disabled={generating}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              <Image size={18} />
              <span>Download Image</span>
            </button>
            
            <button
              onClick={shareReport}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <Share size={18} />
              <span>Share Report</span>
            </button>
          </div>
        </div>

        {/* Main Content - Report Preview */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            <div className="bg-white border border-slate-200 rounded-lg shadow-lg max-w-4xl mx-auto">
              {reportPreview && (
                <ReportContent
                  id="report-content"
                  reportData={reportPreview}
                  reportType={reportType}
                  customizations={customizations}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Report Content Component
const ReportContent = ({ reportData, reportType, customizations, ...props }) => {
  const { businessProfile, customizations: options } = reportData;

  const getTemplateStyles = () => {
    const primaryColor = businessProfile.branding?.primaryColor || '#2563eb';
    const secondaryColor = businessProfile.branding?.secondaryColor || '#64748b';
    const accentColor = businessProfile.branding?.accentColor || '#f59e0b';

    const templates = {
      professional: {
        headerBg: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
        accentColor: accentColor,
        bodyFont: 'font-sans',
        headingFont: 'font-serif'
      },
      modern: {
        headerBg: primaryColor,
        accentColor: accentColor,
        bodyFont: 'font-mono',
        headingFont: 'font-sans'
      },
      classic: {
        headerBg: `linear-gradient(to right, ${primaryColor}, ${accentColor})`,
        accentColor: secondaryColor,
        bodyFont: 'font-serif',
        headingFont: 'font-serif'
      }
    };

    return templates[options?.template] || templates.professional;
  };

  const templateStyles = getTemplateStyles();

  return (
    <div {...props} className="bg-white min-h-[297mm] text-black">
      {/* Report Header */}
      <div
        className="p-8 text-white relative overflow-hidden"
        style={{ background: templateStyles.headerBg }}
      >
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center space-x-4">
              {businessProfile.branding?.logo && (
                <img
                  src={businessProfile.branding.logo}
                  alt="Company Logo"
                  className="h-16 w-auto bg-white/20 rounded-lg p-2"
                  onError={(e) => e.target.style.display = 'none'}
                />
              )}
              <div>
                <h1 className={`text-3xl font-bold ${templateStyles.headingFont}`}>
                  {businessProfile.company?.name || 'Your Company'}
                </h1>
                {businessProfile.company?.tagline && (
                  <p className="text-lg opacity-90 mt-1">
                    {businessProfile.company.tagline}
                  </p>
                )}
              </div>
            </div>
            
            <div className="text-right text-sm">
              <div className="bg-white/20 rounded-lg p-3">
                <div className="font-semibold">
                  {reportType === 'case-study' ? 'Case Study Report' : 
                   reportType === 'proposal' ? 'Project Proposal' : 
                   'Portfolio Summary'}
                </div>
                <div className="opacity-75">
                  {new Date().toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/20 pt-6">
            <h2 className={`text-4xl font-bold mb-2 ${templateStyles.headingFont}`}>
              {reportData.title}
            </h2>
            {reportData.description && (
              <p className="text-xl opacity-90 max-w-3xl">
                {reportData.description}
              </p>
            )}
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
      </div>

      {/* Report Body */}
      <div className="p-8 space-y-8">
        {/* Project Overview */}
        {options?.includeProjectDetails && (
          <section>
            <SectionHeader title="Project Overview" color={templateStyles.accentColor} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <p className={`text-gray-700 leading-relaxed ${templateStyles.bodyFont}`}>
                  {reportData.description}
                </p>
                
                {reportData.challengesFaced && (
                  <div className="mt-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Challenges Addressed</h4>
                    <p className={`text-gray-700 leading-relaxed ${templateStyles.bodyFont}`}>
                      {reportData.challengesFaced}
                    </p>
                  </div>
                )}

                {reportData.solutionsProvided && (
                  <div className="mt-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Solutions Implemented</h4>
                    <p className={`text-gray-700 leading-relaxed ${templateStyles.bodyFont}`}>
                      {reportData.solutionsProvided}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Project Details</h4>
                <div className="space-y-3">
                  {reportData.location && (
                    <DetailItem icon={MapPin} label="Location" value={reportData.location} />
                  )}
                  {reportData.duration && (
                    <DetailItem icon={Calendar} label="Duration" value={reportData.duration} />
                  )}
                  {reportData.projectValue && (
                    <DetailItem
                      icon={DollarSign}
                      label="Investment"
                      value={`$${parseInt(reportData.projectValue).toLocaleString()}`}
                    />
                  )}
                  {reportData.customerRating && (
                    <DetailItem
                      icon={Star}
                      label="Customer Rating"
                      value={`${reportData.customerRating}/5 Stars`}
                    />
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Before/After Images */}
        {options?.includeBeforeAfter && (reportData.beforeImages?.length > 0 || reportData.afterImages?.length > 0) && (
          <section>
            <SectionHeader title="Transformation Gallery" color={templateStyles.accentColor} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {reportData.beforeImages?.[0] && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Before</h4>
                  <img
                    src={reportData.beforeImages[0]}
                    alt="Before"
                    className="w-full h-64 object-cover rounded-lg shadow-md"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/400x300/e2e8f0/64748b?text=Before+Image';
                    }}
                  />
                </div>
              )}
              {reportData.afterImages?.[0] && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">After</h4>
                  <img
                    src={reportData.afterImages[0]}
                    alt="After"
                    className="w-full h-64 object-cover rounded-lg shadow-md"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/400x300/e2e8f0/64748b?text=After+Image';
                    }}
                  />
                </div>
              )}
            </div>
          </section>
        )}

        {/* Materials & Methods */}
        {reportData.materials?.length > 0 && (
          <section>
            <SectionHeader title="Materials & Methods" color={templateStyles.accentColor} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reportData.materials.map((material, index) => (
                <div key={index} className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <CheckCircle size={20} style={{ color: templateStyles.accentColor }} />
                  <span className={`text-gray-700 ${templateStyles.bodyFont}`}>{material}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Results & Outcomes */}
        {reportData.resultsAchieved && (
          <section>
            <SectionHeader title="Results & Outcomes" color={templateStyles.accentColor} />
            <div className="bg-green-50 rounded-lg p-6">
              <p className={`text-gray-700 leading-relaxed ${templateStyles.bodyFont}`}>
                {reportData.resultsAchieved}
              </p>
            </div>
          </section>
        )}

        {/* Customer Testimonial */}
        {options?.includeTestimonial && reportData.customerTestimonial && (
          <section>
            <SectionHeader title="Customer Testimonial" color={templateStyles.accentColor} />
            <div className="bg-blue-50 rounded-lg p-8 relative">
              <div className="text-6xl text-blue-200 font-serif absolute top-4 left-4">"</div>
              <blockquote className={`text-lg text-gray-700 italic leading-relaxed pl-12 ${templateStyles.bodyFont}`}>
                {reportData.customerTestimonial}
              </blockquote>
              <div className="mt-4 flex items-center">
                <div className="flex text-yellow-400">
                  {[...Array(reportData.customerRating || 5)].map((_, i) => (
                    <Star key={i} size={20} fill="currentColor" />
                  ))}
                </div>
                <span className="ml-2 text-sm text-gray-600">
                  {reportData.customerRating || 5}/5 Stars
                </span>
              </div>
            </div>
          </section>
        )}

        {/* Company Information */}
        {options?.includeCompanyInfo && businessProfile.company && (
          <section>
            <SectionHeader title="About Our Company" color={templateStyles.accentColor} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Our Expertise</h4>
                <div className="space-y-3">
                  {businessProfile.services?.primaryServices?.map((service, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <Award size={16} style={{ color: templateStyles.accentColor }} />
                      <span className={`text-gray-700 ${templateStyles.bodyFont}`}>{service}</span>
                    </div>
                  ))}
                </div>

                {businessProfile.services?.certifications?.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Certifications</h4>
                    <div className="space-y-2">
                      {businessProfile.services.certifications.map((cert, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <CheckCircle size={14} style={{ color: templateStyles.accentColor }} />
                          <span className={`text-sm text-gray-600 ${templateStyles.bodyFont}`}>{cert}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h4>
                <div className="space-y-3">
                  {businessProfile.company.phone && (
                    <div className="flex items-center space-x-3">
                      <Phone size={16} style={{ color: templateStyles.accentColor }} />
                      <span className={`text-gray-700 ${templateStyles.bodyFont}`}>
                        {businessProfile.company.phone}
                      </span>
                    </div>
                  )}
                  {businessProfile.company.email && (
                    <div className="flex items-center space-x-3">
                      <Mail size={16} style={{ color: templateStyles.accentColor }} />
                      <span className={`text-gray-700 ${templateStyles.bodyFont}`}>
                        {businessProfile.company.email}
                      </span>
                    </div>
                  )}
                  {businessProfile.company.website && (
                    <div className="flex items-center space-x-3">
                      <Globe size={16} style={{ color: templateStyles.accentColor }} />
                      <span className={`text-gray-700 ${templateStyles.bodyFont}`}>
                        {businessProfile.company.website}
                      </span>
                    </div>
                  )}
                  {businessProfile.company.address && (
                    <div className="flex items-start space-x-3">
                      <MapPin size={16} style={{ color: templateStyles.accentColor }} className="mt-1" />
                      <span className={`text-gray-700 ${templateStyles.bodyFont}`}>
                        {businessProfile.company.address}
                      </span>
                    </div>
                  )}
                </div>
                
                {businessProfile.socialProof && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h5 className="font-semibold text-gray-900 mb-3">Why Choose Us</h5>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-2xl font-bold" style={{ color: templateStyles.accentColor }}>
                          {businessProfile.company.yearsInBusiness || '15+'}
                        </div>
                        <div className="text-gray-600">Years Experience</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold" style={{ color: templateStyles.accentColor }}>
                          {businessProfile.socialProof.projectsCompleted || '2500+'}
                        </div>
                        <div className="text-gray-600">Projects Completed</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Report Footer */}
      <div
        className="p-6 text-white text-center"
        style={{ background: templateStyles.headerBg }}
      >
        <div className="flex items-center justify-center space-x-6 text-sm">
          {businessProfile.company?.phone && (
            <div className="flex items-center space-x-2">
              <Phone size={14} />
              <span>{businessProfile.company.phone}</span>
            </div>
          )}
          {businessProfile.company?.email && (
            <div className="flex items-center space-x-2">
              <Mail size={14} />
              <span>{businessProfile.company.email}</span>
            </div>
          )}
          {businessProfile.company?.website && (
            <div className="flex items-center space-x-2">
              <Globe size={14} />
              <span>{businessProfile.company.website}</span>
            </div>
          )}
        </div>
        <div className="mt-4 text-xs opacity-75">
          Report generated on {new Date().toLocaleDateString()} • 
          © {new Date().getFullYear()} {businessProfile.company?.name || 'Your Company'}
        </div>
      </div>
    </div>
  );
};

// Utility Components
const SectionHeader = ({ title, color }) => (
  <div className="mb-6">
    <h3 className="text-2xl font-bold text-gray-900 mb-2">{title}</h3>
    <div className="w-24 h-1 rounded" style={{ backgroundColor: color }}></div>
  </div>
);

const DetailItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-center space-x-3">
    <Icon size={16} className="text-gray-500" />
    <div>
      <div className="text-sm text-gray-500">{label}</div>
      <div className="font-medium text-gray-900">{value}</div>
    </div>
  </div>
);

export default BrandedReportGenerator;