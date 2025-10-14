import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Phone, Mail, MapPin, Calendar, Star, TrendingUp, 
  Activity, MessageSquare, Settings, AlertTriangle, CheckCircle,
  Clock, DollarSign, Home, Camera, Bot, Zap, Users, FileText,
  PlayCircle, Pause, MoreHorizontal, Edit, Trash2, Plus,
  Target, Shield, Building, Ruler, Thermometer, Eye,
  ChevronRight, ExternalLink, Timer, HeadphonesIcon,
  Mic, MicOff, Volume2, Smartphone, Globe, Brain
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { leadAPI, voiceAPI, activityAPI, sequenceAPI } from '../services/api';

const LeadDetailPage = () => {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [sequences, setSequences] = useState([]);
  const [voiceCalls, setVoiceCalls] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [aiInsights, setAIInsights] = useState(null);
  const [businessConfig, setBusinessConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showSequenceModal, setShowSequenceModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);

  const fetchEnrollmentState = async () => {
    try {
      const data = await leadAPI.getLeadSequences(leadId);
      setEnrollments(data);
    } catch (error) {
      console.error('Error loading sequence enrollments:', error);
      setEnrollments([]);
    }
  };

  const statusStyles = {
    mapbox: { label: 'Mapbox (Live)', classes: 'bg-sky-50 text-sky-700 border border-sky-200' },
    google_static: { label: 'Google Static (Live)', classes: 'bg-sky-50 text-sky-700 border border-sky-200' },
    nominatim: { label: 'OpenStreetMap', classes: 'bg-teal-50 text-teal-700 border border-teal-200' },
    remote: { label: 'Live Provider', classes: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
    synthetic: { label: 'Synthetic Mock', classes: 'bg-gray-50 text-gray-700 border border-gray-200' },
    generated: { label: 'Placeholder', classes: 'bg-gray-50 text-gray-700 border border-gray-200' },
    completed: { label: 'Complete', classes: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
    unknown: { label: 'Unknown', classes: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  };

  const interpretStatus = (value) => {
    if (!value) return statusStyles.unknown;
    return statusStyles[value] || { label: value.replace(/_/g, ' '), classes: 'bg-yellow-50 text-yellow-700 border border-yellow-200' };
  };

  const enrollmentStatusStyles = {
    active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    paused: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    completed: 'bg-blue-100 text-blue-800 border-blue-200',
    failed: 'bg-red-100 text-red-800 border-red-200',
    cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
    default: 'bg-gray-50 text-gray-700 border-gray-200',
  };

  const formatEnrollmentStatus = (status = '') => status.replace(/_/g, ' ');

  useEffect(() => {
    loadLeadData();
    loadSequences();
    loadBusinessConfig();
  }, [leadId]);

  const loadLeadData = async () => {
    try {
      // Load lead details using our API service
      const leadData = await leadAPI.getLead(leadId);
      setLead(leadData);
      await fetchEnrollmentState();

      // Load activities using our API service
      const activitiesData = await activityAPI.getActivities({ lead_id: leadId, limit: 50 });
      setActivities(activitiesData);

      // Load voice calls using our API service
      const callsData = await voiceAPI.getCalls({ lead_id: leadId });
      setVoiceCalls(callsData);

      // Generate AI insights
      generateAIInsights(leadData);
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading lead data:', error);
      // Generate mock data for development
      const mockLead = {
        id: leadId,
        first_name: 'Sarah',
        last_name: 'Johnson',
        email: 'sarah.johnson@email.com',
        phone: '(555) 123-4567',
        address: '123 Oak Street',
        city: 'Austin',
        state: 'TX',
        zip_code: '78701',
        property_value: 485000,
        roof_age: 15,
        roof_material: 'Asphalt Shingles',
        roof_condition: 'Fair',
        roof_condition_score: 72,
        square_footage: 2400,
        lead_score: 92,
        status: 'hot',
        created_at: '2024-01-15T10:30:00Z',
        last_contacted: '2024-01-20T14:22:00Z',
        notes: 'Hail damage visible, interested in full replacement'
      };
      
      setLead(mockLead);
      setActivities([
        { id: 1, type: 'scan_lead_created', description: 'Lead discovered via area scan', created_at: '2024-01-15T10:30:00Z' },
        { id: 2, type: 'voice_call', description: 'AI agent call - interested, requested quote', created_at: '2024-01-20T14:22:00Z' },
        { id: 3, type: 'email_sent', description: 'Quote and company info sent', created_at: '2024-01-21T09:15:00Z' }
      ]);
      setVoiceCalls([
        { id: 1, status: 'completed', duration: '8:34', outcome: 'interested', created_at: '2024-01-20T14:22:00Z' }
      ]);
      
      generateAIInsights(mockLead);
      setLoading(false);
    }
  };

  const loadSequences = async () => {
    try {
      const data = await leadAPI.getSequences();
      setSequences(data);
    } catch (error) {
      console.error('Error loading sequences:', error);
      // Mock sequences for development
      setSequences([
        { id: 1, name: 'Premium Client Follow-up', description: 'High-value lead nurturing sequence' },
        { id: 2, name: 'Storm Damage Response', description: 'Rapid response sequence for storm-damaged properties' },
        { id: 3, name: 'Budget-Conscious Homeowners', description: 'Financing-focused sequence for cost-sensitive leads' }
      ]);
    }
  };


  const loadBusinessConfig = async () => {
    try {
      // Mock business config for development
      const mockConfig = {
        company_name: 'FishMouth Roofing',
        phone: '(555) 123-4567',
        email: 'contact@fishmouthroofing.com',
        address: '123 Business Ave, Austin, TX 78701',
        website: 'www.fishmouthroofing.com',
        license_number: 'TX-12345',
        insurance_info: 'Fully Licensed & Insured',
        services: ['Roof Replacement', 'Roof Repair', 'Storm Damage', 'Inspections'],
        service_areas: ['Austin', 'Round Rock', 'Cedar Park', 'Georgetown']
      };
      setBusinessConfig(mockConfig);
    } catch (error) {
      console.error('Error loading business config:', error);
    }
  };

  const generateAIInsights = (leadData) => {
    // Generate AI-powered insights based on lead data
    const insights = {
      dealProbability: calculateDealProbability(leadData),
      roofConditionAnalysis: analyzeRoofCondition(leadData),
      contactStrategy: generateContactStrategy(leadData),
      pricingRecommendation: generatePricingRecommendation(leadData),
      objectionHandling: generateObjectionHandling(leadData),
      urgencyFactors: identifyUrgencyFactors(leadData),
      competitiveAdvantages: identifyCompetitiveAdvantages(leadData)
    };
    setAIInsights(insights);
  };

  const calculateDealProbability = (leadData) => {
    let score = 0;
    
    // Roof condition factors
    if (leadData.roof_condition_score < 60) score += 30;
    else if (leadData.roof_condition_score < 80) score += 20;
    else score += 10;

    // Age factors
    if (leadData.roof_age_years > 20) score += 25;
    else if (leadData.roof_age_years > 15) score += 15;
    else score += 5;

    // Property value factors
    if (leadData.property_value > 400000) score += 20;
    else if (leadData.property_value > 250000) score += 15;
    else score += 10;

    // Contact enrichment
    if (leadData.contact_enriched) score += 15;

    // Previous contact attempts
    if (leadData.last_contacted) score -= 10;

    return Math.min(100, Math.max(0, score));
  };

  const analyzeRoofCondition = (leadData) => {
    const condition = leadData.roof_condition_score;
    const age = leadData.roof_age_years;
    
    if (condition < 50 || age > 25) {
      return {
        severity: 'Critical',
        message: 'Roof shows significant signs of aging and damage. Immediate replacement recommended.',
        urgency: 'High',
        keyPoints: [
          'Extensive weathering visible',
          'Multiple damage indicators present',
          'Cost of repairs likely exceeds replacement value'
        ]
      };
    } else if (condition < 70 || age > 20) {
      return {
        severity: 'Moderate',
        message: 'Roof is approaching end of useful life. Replacement should be planned within 2-3 years.',
        urgency: 'Medium',
        keyPoints: [
          'Moderate wear patterns visible',
          'Some maintenance issues present',
          'Proactive replacement recommended'
        ]
      };
    } else {
      return {
        severity: 'Good',
        message: 'Roof is in acceptable condition but monitoring recommended.',
        urgency: 'Low',
        keyPoints: [
          'Minimal visible damage',
          'Regular maintenance sufficient',
          'Replacement not immediately needed'
        ]
      };
    }
  };

  const generateContactStrategy = (leadData) => {
    const strategy = {
      preferredMethod: 'phone',
      bestTimeToCall: '10:00 AM - 2:00 PM',
      messageTemplate: '',
      approach: ''
    };

    if (leadData.lead_score > 80) {
      strategy.approach = 'Direct and Urgent';
      strategy.messageTemplate = `Hi ${leadData.homeowner_name || 'there'}, I noticed some concerning signs on your roof at ${leadData.address}. Given the severity, I'd like to offer you a priority inspection this week.`;
    } else if (leadData.lead_score > 60) {
      strategy.approach = 'Educational and Consultative';
      strategy.messageTemplate = `Hi ${leadData.homeowner_name || 'there'}, I've been analyzing roofs in your neighborhood and noticed your ${leadData.roof_age_years}-year-old roof could benefit from an assessment. Would you like a free inspection?`;
    } else {
      strategy.approach = 'Informational and Value-Focused';
      strategy.messageTemplate = `Hi ${leadData.homeowner_name || 'there'}, as a local roofing specialist, I wanted to offer you a complimentary roof health check to ensure everything is in good condition.`;
    }

    return strategy;
  };

  const generatePricingRecommendation = (leadData) => {
    const basePrice = businessConfig?.base_roof_price || 15000;
    const sqftMultiplier = businessConfig?.price_per_sqft || 8;
    const estimated = leadData.roof_size_sqft ? leadData.roof_size_sqft * sqftMultiplier : basePrice;

    return {
      estimatedCost: estimated,
      priceRange: {
        low: estimated * 0.8,
        high: estimated * 1.2
      },
      factors: [
        'Material type: ' + (leadData.roof_material || 'Standard asphalt'),
        'Size: ' + (leadData.roof_size_sqft || 'TBD') + ' sq ft',
        'Condition score: ' + leadData.roof_condition_score + '/100',
        'Age factor: ' + leadData.roof_age_years + ' years'
      ]
    };
  };

  const generateObjectionHandling = (leadData) => {
    return [
      {
        objection: "It's too expensive",
        response: "I understand cost is a concern. Let me show you our financing options and how much you'll save on energy bills."
      },
      {
        objection: "I need to think about it",
        response: "Absolutely! While you're considering, would it help to see what other homeowners in your area have saved?"
      },
      {
        objection: "I want to get other quotes",
        response: "Smart approach! We're confident in our pricing. Can I schedule your free inspection so you have accurate numbers to compare?"
      }
    ];
  };

  const identifyUrgencyFactors = (leadData) => {
    const factors = [];
    
    if (leadData.roof_age_years > 20) {
      factors.push({ factor: 'Age', description: 'Roof is beyond typical warranty period', weight: 'high' });
    }
    
    if (leadData.roof_condition_score < 60) {
      factors.push({ factor: 'Condition', description: 'Significant damage visible from satellite', weight: 'high' });
    }

    if (leadData.damage_indicators?.length > 0) {
      factors.push({ factor: 'Damage', description: 'Multiple damage indicators detected', weight: 'medium' });
    }

    return factors;
  };

  const identifyCompetitiveAdvantages = (leadData) => {
    return businessConfig?.competitive_advantages || [
      'Local family-owned business',
      'A+ BBB Rating',
      'Lifetime warranty on workmanship',
      'Free storm damage assessments',
      'Financing available'
    ];
  };

  const enrollInSequence = async (sequenceId) => {
    try {
      const response = await fetch('/api/sequences/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: parseInt(leadId),
          sequence_id: sequenceId
        })
      });

      if (response.ok) {
        toast.success('Lead enrolled in sequence successfully');
        setShowSequenceModal(false);
        loadLeadData(); // Refresh data
      } else {
        throw new Error('Failed to enroll lead');
      }
    } catch (error) {
      console.error('Error enrolling in sequence:', error);
      toast.error('Failed to enroll lead in sequence');
    }
  };

  const handleEnrollmentAction = async (enrollmentId, action, successMessage) => {
    try {
      await sequenceAPI.updateEnrollment(enrollmentId, action, '');
      toast.success(successMessage || 'Sequence updated');
      await loadLeadData();
    } catch (error) {
      console.error('Error updating sequence enrollment:', error);
      toast.error('Failed to update sequence enrollment');
    }
  };

  const initiateVoiceCall = async (callType = 'qualification') => {
    try {
      const response = await fetch('/api/voice/calls/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: parseInt(leadId),
          to_number: lead.homeowner_phone || '+1234567890',
          call_type: callType,
          ai_instructions: aiInsights?.contactStrategy?.messageTemplate || 'Standard qualification call'
        })
      });

      if (response.ok) {
        const callData = await response.json();
        toast.success('AI voice call initiated');
        setShowCallModal(false);
        loadLeadData(); // Refresh data
      } else {
        throw new Error('Failed to initiate call');
      }
    } catch (error) {
      console.error('Error initiating call:', error);
      toast.error('Failed to initiate voice call');
    }
  };

  const updateLeadStatus = async (newStatus) => {
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        toast.success('Lead status updated');
        loadLeadData();
      }
    } catch (error) {
      console.error('Error updating lead status:', error);
      toast.error('Failed to update lead status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold text-gray-900">Lead not found</h2>
        <button 
          onClick={() => navigate('/dashboard')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-yellow-100 text-yellow-800',
      qualified: 'bg-green-100 text-green-800',
      proposal_sent: 'bg-purple-100 text-purple-800',
      appointment_scheduled: 'bg-indigo-100 text-indigo-800',
      closed_won: 'bg-green-100 text-green-800',
      closed_lost: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getUrgencyColor = (urgency) => {
    const colors = {
      High: 'text-red-600 bg-red-50',
      Medium: 'text-yellow-600 bg-yellow-50',
      Low: 'text-green-600 bg-green-50'
    };
    return colors[urgency] || 'text-gray-600 bg-gray-50';
  };

  const roofIntel = lead?.roof_intelligence 
    || lead?.ai_analysis?.enhanced_roof_intelligence 
    || lead?.ai_analysis?.roof_intelligence 
    || null;
  const imageryMeta = lead?.ai_analysis?.imagery || {};
  const qualityStatus = (lead?.quality_validation_status || imageryMeta?.quality_status || 'pending').toLowerCase();
  const qualityScore = lead?.image_quality_score ?? imageryMeta?.quality?.score ?? null;
  const qualityIssues = lead?.image_quality_issues || imageryMeta?.quality?.issues || [];
  const streetViewList = roofIntel?.street_view || lead?.ai_analysis?.street_view || [];
  const heatmapUrl = roofIntel?.heatmap?.url || imageryMeta?.heatmap_url || null;
  const normalizedRoofUrl = roofIntel?.roof_view?.image_url || null;
  const streetAverageQuality = lead?.street_view_quality?.average_quality ?? null;
  const streetAverageOcclusion = lead?.street_view_quality?.average_occlusion ?? null;

  const qualityClasses = {
    passed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    review: 'bg-amber-50 text-amber-700 border border-amber-200',
    failed: 'bg-red-50 text-red-700 border border-red-200',
    pending: 'bg-gray-50 text-gray-600 border border-gray-200'
  };

  const qualityLabels = {
    passed: 'Imagery Passed',
    review: 'Needs Review',
    failed: 'Imagery Failed',
    pending: 'Validation Pending'
  };

  const qualityBadge = (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${qualityClasses[qualityStatus] || qualityClasses.pending}`}>
      <Shield className="h-4 w-4" />
      <span>{qualityLabels[qualityStatus] || qualityLabels.pending}</span>
      {qualityScore !== null && (
        <span className="text-xs font-semibold text-gray-700 bg-white/60 px-2 py-0.5 rounded-full">
          Score {Math.round(qualityScore)}
        </span>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {lead.homeowner_name || 'Unknown Homeowner'}
              </h1>
              <p className="text-gray-600">{lead.address}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(lead.status)}`}>
              {lead.status?.replace('_', ' ').toUpperCase()}
            </span>
            <button
              onClick={() => setShowSequenceModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <Users className="h-4 w-4" />
              <span>Add to Sequence</span>
            </button>
            <button
              onClick={() => setShowCallModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
            >
              <Phone className="h-4 w-4" />
              <span>AI Call</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: Home },
            { id: 'ai-insights', name: 'AI Insights', icon: Bot },
            { id: 'activities', name: 'Activities', icon: Activity },
            { id: 'voice-calls', name: 'Voice Calls', icon: Phone },
            { id: 'analytics', name: 'Analytics', icon: TrendingUp }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Hero Section with Key Metrics */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Lead Score */}
              <div className="text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start gap-3 mb-2">
                  <Target className="h-8 w-8" />
                  <div>
                    <div className="text-5xl font-bold">{Math.round(lead.lead_score)}</div>
                    <div className="text-blue-100">Lead Score</div>
                  </div>
                </div>
                {lead.lead_score >= 90 && <Star className="text-yellow-300 mx-auto lg:mx-0" size={24} />}
              </div>

              {/* Property Value */}
              <div className="text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start gap-3 mb-2">
                  <Home className="h-8 w-8" />
                  <div>
                    <div className="text-2xl font-bold">${(lead.property_value || 0).toLocaleString()}</div>
                    <div className="text-blue-100">Property Value</div>
                  </div>
                </div>
              </div>

              {/* Project Estimate */}
              <div className="text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start gap-3 mb-2">
                  <DollarSign className="h-8 w-8" />
                  <div>
                    <div className="text-2xl font-bold">${(lead.estimated_value || 0).toLocaleString()}</div>
                    <div className="text-blue-100">Project Estimate</div>
                  </div>
                </div>
              </div>

              {/* Conversion Probability */}
              <div className="text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start gap-3 mb-2">
                  <TrendingUp className="h-8 w-8" />
                  <div>
                    <div className="text-2xl font-bold">{Math.round(lead.conversion_probability || 0)}%</div>
                    <div className="text-blue-100">Close Probability</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Property & Contact Information */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                    <Building className="h-6 w-6 text-blue-600" />
                    Property & Contact Details
                  </h3>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Address Section */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Property Address</label>
                        <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <MapPin className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                          <div>
                            <div className="font-semibold text-gray-900">{lead.address}</div>
                            <div className="text-gray-600">{lead.city}, {lead.state} {lead.zip_code}</div>
                            <button className="text-blue-600 hover:text-blue-800 text-sm mt-1 flex items-center gap-1">
                              <Globe className="h-4 w-4" />
                              View on Map
                            </button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Property Details</label>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <div className="text-sm text-gray-600">Year Built</div>
                            <div className="font-semibold text-gray-900">{lead.year_built || 'Unknown'}</div>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <div className="text-sm text-gray-600">Property Type</div>
                            <div className="font-semibold text-gray-900">{lead.property_type || 'Residential'}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contact Section */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Homeowner Information</label>
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-green-100 rounded-full">
                              <Users className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{lead.homeowner_name || 'Name not available'}</div>
                              <div className="text-sm text-gray-600">Property Owner</div>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            {lead.homeowner_phone && (
                              <a 
                                href={`tel:${lead.homeowner_phone}`} 
                                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                              >
                                <Phone className="h-4 w-4" />
                                <span>{lead.homeowner_phone}</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                            {lead.homeowner_email && (
                              <a 
                                href={`mailto:${lead.homeowner_email}`} 
                                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                              >
                                <Mail className="h-4 w-4" />
                                <span>{lead.homeowner_email}</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                            {lead.contact_preference && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <MessageSquare className="h-4 w-4" />
                                <span className="capitalize">Prefers {lead.contact_preference}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Data Quality Signals</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[
                              { key: 'discovery', label: 'Discovery', status: interpretStatus(lead.discovery_status), Icon: MapPin },
                              { key: 'imagery', label: 'Imagery', status: interpretStatus(lead.imagery_status), Icon: Camera },
                              { key: 'property', label: 'Property Data', status: interpretStatus(lead.property_enrichment_status), Icon: FileText },
                              { key: 'contact', label: 'Contact Data', status: interpretStatus(lead.contact_enrichment_status), Icon: Users },
                            ].map(({ key, label, status, Icon }) => (
                              <div key={key} className={`p-3 rounded-lg flex items-center gap-3 ${status.classes}`}>
                                <div className="p-2 bg-white/70 rounded-full">
                                  <Icon className="h-5 w-5" />
                                </div>
                                <div>
                                  <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
                                  <div className="text-sm font-semibold">{status.label}</div>
                                </div>
                              </div>
                            ))}
                            <div className={`p-3 rounded-lg flex items-center gap-3 ${lead.voice_opt_out ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'}`}>
                              <div className="p-2 bg-white/70 rounded-full">
                                <HeadphonesIcon className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="text-[11px] uppercase tracking-wide text-gray-500">Voice Consent</div>
                                <div className="text-sm font-semibold">{lead.voice_opt_out ? 'Opted Out' : 'Consent Granted'}</div>
                                {lead.last_voice_contacted && (
                                  <div className="text-xs text-gray-600">Last contacted {format(new Date(lead.last_voice_contacted), 'MMM d, yyyy h:mm a')}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
              </div>
            </div>
          </div>

          {/* Sequence Enrollments */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <PlayCircle className="h-6 w-6 text-indigo-600" />
                  Active Sequences
                </h3>
                <p className="text-sm text-gray-600">Pause, resume, or complete automations from here.</p>
              </div>
              <button
                onClick={() => setShowSequenceModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Add to Sequence
              </button>
            </div>

            <div className="p-6 space-y-4">
              {enrollments.length === 0 ? (
                <div className="text-center text-gray-500 py-6">
                  No sequence enrollments yet. Add this lead to an automation to get started.
                </div>
              ) : (
                enrollments.map((enrollment) => {
                  const statusStyle = enrollmentStatusStyles[enrollment.status] || enrollmentStatusStyles.default;
                  return (
                    <div key={enrollment.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold text-gray-900">{enrollment.sequence_name}</span>
                            <span className={`px-2.5 py-0.5 border rounded-full text-xs font-semibold uppercase tracking-wide ${statusStyle}`}>
                              {formatEnrollmentStatus(enrollment.status)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            Next step {enrollment.next_execution_at ? `scheduled for ${format(new Date(enrollment.next_execution_at), 'MMM d, h:mm a')}` : 'not scheduled'}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {enrollment.status === 'active' && (
                            <>
                              <button
                                onClick={() => handleEnrollmentAction(enrollment.id, 'pause', 'Sequence paused')}
                                className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
                              >
                                <Pause className="h-3 w-3 inline-block mr-1" /> Pause
                              </button>
                              <button
                                onClick={() => handleEnrollmentAction(enrollment.id, 'mark_converted', 'Lead marked as converted')}
                                className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                              >
                                <CheckCircle className="h-3 w-3 inline-block mr-1" /> Mark Converted
                              </button>
                              <button
                                onClick={() => handleEnrollmentAction(enrollment.id, 'mark_failed', 'Sequence marked as failed')}
                                className="px-3 py-1.5 text-sm bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100"
                              >
                                <AlertTriangle className="h-3 w-3 inline-block mr-1" /> Mark Failed
                              </button>
                              <button
                                onClick={() => handleEnrollmentAction(enrollment.id, 'cancel', 'Sequence cancelled')}
                                className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
                              >
                                <Trash2 className="h-3 w-3 inline-block mr-1" /> Cancel
                              </button>
                            </>
                          )}

                          {enrollment.status === 'paused' && (
                            <button
                              onClick={() => handleEnrollmentAction(enrollment.id, 'resume', 'Sequence resumed')}
                              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                            >
                              <PlayCircle className="h-3 w-3 inline-block mr-1" /> Resume
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Comprehensive Roof Analysis */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-red-50 to-orange-50 px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <Camera className="h-6 w-6 text-red-600" />
                    Comprehensive Roof Analysis
                  </h3>
                </div>
                
                <div className="p-6">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Timer className="h-5 w-5 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">Age</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-900">{lead.roof_age_years || 'Unknown'}</div>
                      <div className="text-sm text-blue-700">years old</div>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Thermometer className="h-5 w-5 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-900">Condition</span>
                      </div>
                      <div className="text-2xl font-bold text-yellow-900">{lead.roof_condition_score || 'N/A'}</div>
                      <div className="text-sm text-yellow-700">out of 100</div>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Ruler className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium text-green-900">Size</span>
                      </div>
                      <div className="text-2xl font-bold text-green-900">{(lead.roof_size_sqft || 0).toLocaleString()}</div>
                      <div className="text-sm text-green-700">sq ft</div>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-5 w-5 text-purple-600" />
                        <span className="text-sm font-medium text-purple-900">Material</span>
                      </div>
                      <div className="text-lg font-bold text-purple-900">{lead.roof_material || 'Unknown'}</div>
                      <div className="text-sm text-purple-700">type</div>
                    </div>
                  </div>

                  {/* Imagery Quality */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-semibold text-gray-700">Imagery Quality Control</label>
                      {qualityBadge}
                    </div>
                    {qualityIssues.length > 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                        <div className="font-semibold mb-1">Flagged Issues</div>
                        <ul className="list-disc list-inside space-y-1">
                          {qualityIssues.map((issue) => (
                            <li key={issue}>{issue.replace(/_/g, ' ')}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {lead.street_view_quality?.angles_captured && (
                      <div className="mt-3 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-3">
                        Captured {lead.street_view_quality.angles_captured} Street View angle{lead.street_view_quality.angles_captured > 1 ? 's' : ''} with average quality {streetAverageQuality !== null ? streetAverageQuality.toFixed(2) : 'N/A'} and occlusion {streetAverageOcclusion !== null ? streetAverageOcclusion.toFixed(2) : 'N/A'}.
                      </div>
                    )}
                  </div>

                  {/* Damage Indicators */}
                  {lead.damage_indicators && lead.damage_indicators.length > 0 && (
                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-700 mb-3">Damage Indicators Detected</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {lead.damage_indicators.map((indicator, index) => (
                          <div key={index} className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                            <span className="text-red-800 font-medium text-sm">{indicator.replace(/_/g, ' ')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Condition Assessment */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">AI Assessment</h4>
                    <div className="flex items-start gap-3">
                      <Brain className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-gray-700 mb-2">
                          Based on satellite imagery analysis, this {lead.roof_age_years || 'unknown age'} year old {lead.roof_material || 'roof'} 
                          shows {lead.damage_indicators?.length || 0} damage indicators with a condition score of {lead.roof_condition_score || 'unknown'}/100.
                        </p>
                        {lead.ai_analysis?.summary && (
                          <p className="text-gray-600 text-sm italic">"{lead.ai_analysis.summary}"</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Aerial Image */}
                  {lead.aerial_image_url && (
                    <div className="mt-6">
                      <label className="block text-sm font-semibold text-gray-700 mb-3">Aerial Analysis View</label>
                      <div className="relative">
                        <img 
                          src={lead.aerial_image_url} 
                          alt="Aerial view of roof"
                          className="w-full h-64 object-cover rounded-lg border-2 border-gray-200"
                        />
                        <div className="absolute top-4 right-4 bg-white rounded-lg p-2 shadow-lg">
                          <Eye className="h-4 w-4 text-gray-600" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Enhanced Imagery */}
                  {(heatmapUrl || normalizedRoofUrl) && (
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-semibold text-gray-700">AI Roof Intelligence</label>
                        {roofIntel?.analysis?.condition_score && (
                          <span className="px-3 py-1 text-xs rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            Confidence {Math.round((roofIntel.analysis.confidence || lead.ai_analysis?.confidence || 0) * 100) / 100}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {normalizedRoofUrl && (
                          <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                            <img 
                              src={normalizedRoofUrl}
                              alt="Normalized roof view"
                              className="w-full h-64 object-cover"
                            />
                            <div className="px-4 py-3 text-sm text-gray-600 border-t border-gray-200">
                              Normalized roof perspective for consistent analysis.
                            </div>
                          </div>
                        )}
                        {heatmapUrl && (
                          <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                            <img 
                              src={heatmapUrl}
                              alt="Roof anomaly heatmap"
                              className="w-full h-64 object-cover"
                            />
                            <div className="px-4 py-3 text-sm text-gray-600 border-t border-gray-200">
                              Heatmap overlay highlighting discoloration and anomalies detected.
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Street View Evidence */}
                  {streetViewList.length > 0 && (
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-semibold text-gray-700">Street View Evidence</label>
                        <span className="text-xs text-gray-500">{streetViewList.length} angles captured</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {streetViewList.map((view, index) => (
                          <div key={index} className="group border border-gray-200 rounded-xl overflow-hidden bg-white">
                            <div className="relative">
                              <img
                                src={view.public_url}
                                alt={`Street view angle ${view.heading || index}`}
                                className="w-full h-40 object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                              <div className="absolute top-2 left-2 bg-white/85 backdrop-blur px-2 py-1 rounded-md text-xs font-medium text-gray-700">
                                Heading {view.heading != null ? Math.round(view.heading) : '—'}°
                              </div>
                            </div>
                            <div className="px-4 py-3 space-y-2">
                              <div className="flex items-center justify-between text-xs text-gray-600">
                                <span>Quality {view.quality_score?.toFixed(2) || 'N/A'}</span>
                                <span>Occlusion {(view.occlusion_score ?? 0).toFixed(2)}</span>
                              </div>
                              {view.anomalies?.length > 0 ? (
                                <ul className="text-xs text-red-600 space-y-1">
                                  {view.anomalies.map((anomaly, idx) => (
                                    <li key={idx} className="flex items-center gap-1">
                                      <AlertTriangle className="h-3 w-3" />
                                      <span>{anomaly.description}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-xs text-gray-500">No curbside anomalies flagged.</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Call Notes Section */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                    <Bot className="h-6 w-6 text-green-600" />
                    AI Call Notes & Conversation History
                  </h3>
                </div>
                
                <div className="p-6">
                  {voiceCalls && voiceCalls.length > 0 ? (
                    <div className="space-y-4">
                      {voiceCalls.slice(0, 3).map((call, index) => (
                        <div key={index} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full ${
                                call.outcome === 'interested' ? 'bg-green-100' :
                                call.outcome === 'appointment_scheduled' ? 'bg-blue-100' :
                                call.outcome === 'callback_requested' ? 'bg-yellow-100' :
                                call.outcome === 'not_interested' ? 'bg-red-100' : 'bg-gray-100'
                              }`}>
                                {call.outcome === 'interested' ? <CheckCircle className="h-5 w-5 text-green-600" /> :
                                 call.outcome === 'appointment_scheduled' ? <Calendar className="h-5 w-5 text-blue-600" /> :
                                 call.outcome === 'callback_requested' ? <Phone className="h-5 w-5 text-yellow-600" /> :
                                 call.outcome === 'not_interested' ? <Phone className="h-5 w-5 text-red-600" /> :
                                 <Mic className="h-5 w-5 text-gray-600" />}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900 capitalize">
                                  {call.outcome?.replace('_', ' ') || 'Call completed'}
                                </div>
                                <div className="text-sm text-gray-600">
                                  Duration: {Math.floor(call.duration_seconds / 60)}:{(call.duration_seconds % 60).toString().padStart(2, '0')} • 
                                  {' '}{new Date(call.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Volume2 className="h-4 w-4 text-gray-400" />
                              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                                Play Recording
                              </button>
                            </div>
                          </div>
                          
                          {call.ai_summary && (
                            <div className="bg-blue-50 rounded-lg p-3">
                              <div className="flex items-start gap-2">
                                <Brain className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
                                <div>
                                  <div className="text-sm font-medium text-blue-900 mb-1">AI Summary</div>
                                  <p className="text-blue-800 text-sm">
                                    {typeof call.ai_summary === 'object' ? call.ai_summary.summary : call.ai_summary}
                                  </p>
                                  {call.ai_summary.sentiment_score && (
                                    <div className="mt-2 flex items-center gap-2">
                                      <span className="text-xs text-blue-700">Sentiment:</span>
                                      <div className="flex-1 bg-blue-200 rounded-full h-1.5 max-w-24">
                                        <div 
                                          className="bg-blue-600 h-1.5 rounded-full" 
                                          style={{ width: `${call.ai_summary.sentiment_score * 100}%` }}
                                        ></div>
                                      </div>
                                      <span className="text-xs text-blue-700">{Math.round(call.ai_summary.sentiment_score * 100)}%</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {voiceCalls.length > 3 && (
                        <button className="w-full py-2 text-blue-600 hover:text-blue-800 text-sm font-medium">
                          View All {voiceCalls.length} Call Records
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Smartphone className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <h4 className="text-lg font-semibold text-gray-600 mb-2">No Call History</h4>
                      <p className="text-gray-500 mb-4">Start an AI call to begin building conversation history</p>
                      <button
                        onClick={() => setShowCallModal(true)}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 mx-auto"
                      >
                        <Bot className="h-4 w-4" />
                        Start AI Call
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Enhanced Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900">Quick Actions</h3>
                </div>
                <div className="p-6 space-y-3">
                  <button
                    onClick={() => setShowCallModal(true)}
                    className="w-full px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 flex items-center justify-center gap-2 font-medium transition-colors"
                  >
                    <Bot className="h-5 w-5" />
                    Start AI Call
                  </button>
                  
                  <button
                    onClick={() => setShowSequenceModal(true)}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2 font-medium transition-colors"
                  >
                    <Users className="h-5 w-5" />
                    Add to Sequence
                  </button>

                  <button className="w-full px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 flex items-center justify-center gap-2 font-medium transition-colors">
                    <Mail className="h-5 w-5" />
                    Send Email
                  </button>

                  <button className="w-full px-4 py-3 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 flex items-center justify-center gap-2 font-medium transition-colors">
                    <MessageSquare className="h-5 w-5" />
                    Send SMS
                  </button>
                </div>
              </div>

              {/* Lead Score Breakdown */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900">Score Analysis</h3>
                </div>
                <div className="p-6">
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-700 font-medium">Overall Score</span>
                      <span className="text-2xl font-bold text-blue-600">{lead.lead_score}/100</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full ${lead.lead_score >= 80 ? 'bg-green-500' : lead.lead_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${lead.lead_score}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Roof Condition</span>
                      <span className="font-semibold text-red-600">{Math.round((100 - (lead.roof_condition_score || 0)) * 0.3)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Age Factor</span>
                      <span className="font-semibold text-orange-600">{Math.round((lead.roof_age_years || 0) > 20 ? 25 : (lead.roof_age_years || 0) > 15 ? 15 : 5)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Property Value</span>
                      <span className="font-semibold text-green-600">{(lead.property_value || 0) > 400000 ? 20 : (lead.property_value || 0) > 250000 ? 15 : 10}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Contact Info</span>
                      <span className="font-semibold text-blue-600">{lead.contact_enriched ? 15 : 5}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Damage Severity</span>
                      <span className="font-semibold text-red-600">{(lead.damage_indicators?.length || 0) * 5}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Update */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900">Update Status</h3>
                </div>
                <div className="p-6">
                  <select
                    value={lead.status}
                    onChange={(e) => updateLeadStatus(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                  >
                    <option value="new">🆕 New</option>
                    <option value="contacted">📞 Contacted</option>
                    <option value="qualified">✅ Qualified</option>
                    <option value="proposal_sent">📋 Proposal Sent</option>
                    <option value="appointment_scheduled">📅 Appointment Scheduled</option>
                    <option value="closed_won">🎉 Closed Won</option>
                    <option value="closed_lost">❌ Closed Lost</option>
                  </select>
                  
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">Last Updated</div>
                    <div className="font-medium text-gray-900">
                      {new Date(lead.updated_at || lead.created_at).toLocaleDateString()} at{' '}
                      {new Date(lead.updated_at || lead.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900">Lead Timeline</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 rounded-full">
                        <Target className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Lead Created</div>
                        <div className="text-sm text-gray-600">{new Date(lead.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    
                    {lead.last_contacted && (
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-green-100 rounded-full">
                          <Phone className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">Last Contact</div>
                          <div className="text-sm text-gray-600">{new Date(lead.last_contacted).toLocaleDateString()}</div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-yellow-100 rounded-full">
                        <Clock className="h-4 w-4 text-yellow-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Next Follow-up</div>
                        <div className="text-sm text-gray-600">
                          {lead.next_follow_up ? new Date(lead.next_follow_up).toLocaleDateString() : 'Not scheduled'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ai-insights' && aiInsights && (
        <div className="space-y-6">
          {/* Deal Probability */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Deal Probability</span>
            </h3>
            <div className="flex items-center space-x-4">
              <div className="flex-1 bg-gray-200 rounded-full h-4">
                <div 
                  className={`h-4 rounded-full ${aiInsights.dealProbability >= 70 ? 'bg-green-500' : aiInsights.dealProbability >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${aiInsights.dealProbability}%` }}
                ></div>
              </div>
              <span className="text-2xl font-bold">{aiInsights.dealProbability}%</span>
            </div>
          </div>

          {/* Roof Analysis */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">AI Roof Condition Analysis</h3>
            <div className={`p-4 rounded-lg ${getUrgencyColor(aiInsights.roofConditionAnalysis.urgency)}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">{aiInsights.roofConditionAnalysis.severity} Condition</span>
                <span className="text-sm">{aiInsights.roofConditionAnalysis.urgency} Urgency</span>
              </div>
              <p className="mb-3">{aiInsights.roofConditionAnalysis.message}</p>
              <ul className="space-y-1">
                {aiInsights.roofConditionAnalysis.keyPoints.map((point, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Contact Strategy */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Recommended Contact Strategy</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Approach</label>
                <p className="text-gray-900 font-semibold">{aiInsights.contactStrategy.approach}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Suggested Message</label>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-900">{aiInsights.contactStrategy.messageTemplate}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Best Time to Call</label>
                <p className="text-gray-900">{aiInsights.contactStrategy.bestTimeToCall}</p>
              </div>
            </div>
          </div>

          {/* Pricing Recommendation */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Pricing Recommendation</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Low Estimate</p>
                <p className="text-2xl font-bold text-gray-900">${aiInsights.pricingRecommendation.priceRange.low.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Target Price</p>
                <p className="text-2xl font-bold text-blue-600">${aiInsights.pricingRecommendation.estimatedCost.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">High Estimate</p>
                <p className="text-2xl font-bold text-gray-900">${aiInsights.pricingRecommendation.priceRange.high.toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Pricing Factors</label>
              <ul className="space-y-1">
                {aiInsights.pricingRecommendation.factors.map((factor, index) => (
                  <li key={index} className="text-sm text-gray-600">• {factor}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Objection Handling */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Objection Handling Guide</h3>
            <div className="space-y-4">
              {aiInsights.objectionHandling.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">"{item.objection}"</h4>
                  <p className="text-gray-700">{item.response}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Urgency Factors */}
          {aiInsights.urgencyFactors.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Urgency Factors</h3>
              <div className="space-y-3">
                {aiInsights.urgencyFactors.map((factor, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <AlertTriangle className={`h-5 w-5 mt-0.5 ${factor.weight === 'high' ? 'text-red-500' : 'text-yellow-500'}`} />
                    <div>
                      <p className="font-semibold text-gray-900">{factor.factor}</p>
                      <p className="text-gray-600">{factor.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Competitive Advantages */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Competitive Advantages to Highlight</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {aiInsights.competitiveAdvantages.map((advantage, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="text-gray-900">{advantage}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'activities' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Activity Timeline</h3>
          </div>
          <div className="p-6">
            {activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Activity className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                      <p className="text-sm text-gray-600">{activity.description}</p>
                      <p className="text-xs text-gray-500">{format(new Date(activity.created_at), 'MMM d, yyyy h:mm a')}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No activities recorded yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Sequence Enrollment Modal */}
      {showSequenceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Add to Sequence</h3>
            <div className="space-y-3">
              {sequences.map((sequence) => (
                <button
                  key={sequence.id}
                  onClick={() => enrollInSequence(sequence.id)}
                  className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <h4 className="font-semibold">{sequence.name}</h4>
                  <p className="text-sm text-gray-600">{sequence.description}</p>
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowSequenceModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voice Call Modal */}
      {showCallModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Initiate AI Voice Call</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Call Type</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option value="qualification">Qualification Call</option>
                  <option value="follow_up">Follow-up Call</option>
                  <option value="appointment">Appointment Scheduling</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={lead.homeowner_phone || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">AI Instructions</label>
                <textarea
                  rows={3}
                  defaultValue={aiInsights?.contactStrategy?.messageTemplate || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowCallModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => initiateVoiceCall()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Start Call
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadDetailPage;
