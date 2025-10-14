import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FileText, ArrowLeft, Settings, Users, Home, 
  AlertCircle, CheckCircle, Clock, Download,
  Share2, Plus, Edit, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import EnhancedReportGenerator from '../components/EnhancedReportGenerator';
import businessProfileService from '../services/businessProfileService';

const EnhancedReportsPage = () => {
  const navigate = useNavigate();
  const { leadId } = useParams();
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [businessProfile, setBusinessProfile] = useState(null);
  const [showReportGenerator, setShowReportGenerator] = useState(false);
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [missingProfileData, setMissingProfileData] = useState([]);

  useEffect(() => {
    loadData();
  }, [leadId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load leads
      const leadsResponse = await fetch('/api/leads');
      if (leadsResponse.ok) {
        const leadsData = await leadsResponse.json();
        setLeads(leadsData);
        
        // Set selected lead if leadId provided
        if (leadId) {
          const lead = leadsData.find(l => l.id === leadId);
          if (lead) {
            setSelectedLead(lead);
          }
        } else if (leadsData.length > 0) {
          setSelectedLead(leadsData[0]);
        }
      }

      // Load business profile
      const profile = await businessProfileService.load();
      setBusinessProfile(profile);
      
      // Check for missing profile data
      const missing = checkMissingProfileData(profile);
      setMissingProfileData(missing);

      // Load recent reports
      const reportsResponse = await fetch('/api/v1/reports');
      if (reportsResponse.ok) {
        const reportsData = await reportsResponse.json();
        setRecentReports(reportsData.slice(0, 10));
      }

    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const checkMissingProfileData = (profile) => {
    const missing = [];
    
    if (!profile.company?.name) {
      missing.push({ field: 'Company Name', section: 'company', description: 'Your company name will appear on all reports' });
    }
    if (!profile.company?.logo) {
      missing.push({ field: 'Company Logo', section: 'branding', description: 'Logo adds professional branding to reports' });
    }
    if (!profile.branding?.primaryColor) {
      missing.push({ field: 'Brand Colors', section: 'branding', description: 'Brand colors make reports match your business' });
    }
    if (!profile.services?.inspections) {
      missing.push({ field: 'Service Pricing', section: 'services', description: 'Service pricing enables accurate cost estimates' });
    }
    if (!profile.certifications?.length) {
      missing.push({ field: 'Certifications', section: 'credentials', description: 'Certifications build trust and credibility' });
    }

    return missing;
  };

  const handleCreateReport = () => {
    if (!selectedLead) {
      toast.error('Please select a lead first');
      return;
    }
    setShowReportGenerator(true);
  };

  const handleLeadSelect = (lead) => {
    setSelectedLead(lead);
    navigate(`/reports/${lead.id}`);
  };

  const handleNavigateToSettings = (section = null) => {
    const settingsPath = section ? `/settings/business#${section}` : '/settings/business';
    navigate(settingsPath);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Enhanced Reports</h1>
                <p className="text-sm text-gray-600">Create professional, branded reports with AI</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleNavigateToSettings()}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
                Business Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Missing Profile Data Warning */}
        {missingProfileData.length > 0 && (
          <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                  Complete Your Business Profile for Better Reports
                </h3>
                <p className="text-yellow-800 mb-4">
                  The following information is missing from your business profile. Adding this data will make your reports more professional and personalized:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {missingProfileData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between bg-white rounded-lg p-3 border border-yellow-200">
                      <div>
                        <div className="font-medium text-yellow-900">{item.field}</div>
                        <div className="text-sm text-yellow-700">{item.description}</div>
                      </div>
                      <button
                        onClick={() => handleNavigateToSettings(item.section)}
                        className="px-3 py-1 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                      >
                        Add Now
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {/* Lead Selection & Report Creation */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Create New Report</h2>
                  <p className="text-gray-600">Generate professional reports with AI-powered content</p>
                </div>
                <button
                  onClick={handleCreateReport}
                  disabled={!selectedLead}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-5 h-5" />
                  Create Report
                </button>
              </div>

              {/* Lead Selection */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  Select Lead for Report
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {leads.slice(0, 6).map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => handleLeadSelect(lead)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedLead?.id === lead.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Home className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {lead.homeowner_name || lead.address || 'Unknown Lead'}
                          </p>
                          <p className="text-sm text-gray-600 truncate">
                            {lead.address}
                          </p>
                          <p className="text-xs text-gray-500">
                            {lead.property_type || 'Residential'} • 
                            {lead.roof_age_years ? ` ${lead.roof_age_years}yr roof` : ' Age unknown'}
                          </p>
                        </div>
                        {selectedLead?.id === lead.id && (
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {leads.length > 6 && (
                  <div className="text-center">
                    <button
                      onClick={() => navigate('/dashboard?view=leads')}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      View all {leads.length} leads →
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Reports */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Recent Reports</h2>
                <div className="text-sm text-gray-600">
                  {recentReports.length} reports generated
                </div>
              </div>

              {recentReports.length > 0 ? (
                <div className="space-y-4">
                  {recentReports.map((report) => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <FileText className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {report.type?.replace('-', ' ') || 'Report'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {report.lead?.homeowner_name || report.lead?.address || 'Unknown Lead'}
                          </p>
                          <p className="text-xs text-gray-500">
                            Created {new Date(report.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          report.status === 'completed' 
                            ? 'bg-green-100 text-green-700'
                            : report.status === 'generating'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {report.status || 'draft'}
                        </div>
                        <button
                          onClick={() => navigate(`/reports/${report.id}`)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">No reports created yet</p>
                  <p className="text-sm text-gray-500">Create your first professional report to get started</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile Completeness */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Completeness</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Business Info</span>
                  <div className="flex items-center gap-2">
                    {businessProfile?.company?.name ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-yellow-500" />
                    )}
                    <span className="text-sm">
                      {businessProfile?.company?.name ? 'Complete' : 'Missing'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Branding</span>
                  <div className="flex items-center gap-2">
                    {businessProfile?.branding?.primaryColor ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-yellow-500" />
                    )}
                    <span className="text-sm">
                      {businessProfile?.branding?.primaryColor ? 'Complete' : 'Missing'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Service Pricing</span>
                  <div className="flex items-center gap-2">
                    {businessProfile?.services ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-yellow-500" />
                    )}
                    <span className="text-sm">
                      {businessProfile?.services ? 'Complete' : 'Missing'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleNavigateToSettings()}
                className="w-full mt-4 px-4 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-sm font-medium"
              >
                Complete Profile
              </button>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Leads</span>
                  <span className="font-semibold text-gray-900">{leads.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Reports Created</span>
                  <span className="font-semibold text-gray-900">{recentReports.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Profile Complete</span>
                  <span className="font-semibold text-gray-900">
                    {Math.round(((5 - missingProfileData.length) / 5) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Report Generator Modal */}
      {showReportGenerator && selectedLead && (
        <EnhancedReportGenerator
          lead={selectedLead}
          businessProfile={businessProfile}
          visible={showReportGenerator}
          onClose={() => setShowReportGenerator(false)}
        />
      )}
    </div>
  );
};

export default EnhancedReportsPage;