import axios from 'axios';
import { mockLeads, mockDashboardStats, mockRecentScans, mockActivities, mockSequences, mockAnalyticsData } from '../data/mockLeads';

const ENABLE_MOCK_DATA = process.env.REACT_APP_ENABLE_MOCKS === 'true' || process.env.NODE_ENV !== 'production';

const assertMocksEnabled = (error) => {
  if (!ENABLE_MOCK_DATA) {
    throw error;
  }
};

const normalizeMockLead = (lead) => {
  if (!lead) return null;

  const roofConditionMap = {
    excellent: 92,
    good: 82,
    fair: 68,
    poor: 48,
    critical: 32,
  };

  const baseRoofIntelligence = lead.roof_intelligence || {
    imagery: {
      public_url: lead.aerial_image_url || `https://images.fishmouth.ai/demo/satellite-${(lead.id % 8) + 1}.jpg`,
      source: 'synthetic',
    },
    roof_view: {
      image_url: lead.aerial_image_url || `https://images.fishmouth.ai/demo/normalized-${(lead.id % 8) + 1}.jpg`,
      mask_url: `https://images.fishmouth.ai/demo/mask-${(lead.id % 6) + 1}.png`,
      coverage_ratio: 0.74,
    },
    heatmap: {
      url: `https://images.fishmouth.ai/demo/heatmap-${(lead.id % 6) + 1}.png`,
    },
    analysis: {
      summary: 'Detected thermal signatures suggesting impact damage across multiple slopes.',
      condition_score: lead.roof_condition_score || 0,
      replacement_urgency: lead.replacement_urgency || 'plan_ahead',
    },
    anomalies: (lead.damage_indicators || []).map((indicator, idx) => ({
      type: indicator,
      severity: 0.55 + idx * 0.1,
      probability: 0.75 + idx * 0.08,
      description: `${indicator.replace(/_/g, ' ')} highlighted by AI analysis`,
    })),
    street_view: (lead.street_view_gallery || []).map((view, idx) => ({
      heading: view.heading || idx * 90,
      public_url: view.public_url,
      quality_score: view.quality_score || 0.78,
      occlusion_score: view.occlusion_score || 0.22,
      anomalies: view.anomalies || [],
    })),
  };

  const normalizedViewUrl =
    baseRoofIntelligence.roof_view?.image_url ||
    baseRoofIntelligence.imagery?.public_url ||
    lead.aerial_image_url ||
    `https://images.fishmouth.ai/demo/normalized-${(lead.id % 8) + 1}.jpg`;

  const heatmapUrl = baseRoofIntelligence.heatmap?.url || `https://images.fishmouth.ai/demo/heatmap-${(lead.id % 6) + 1}.png`;
  const overlayUrl = lead.overlay_url || heatmapUrl;

  const imageQualityScore = lead.image_quality_score ?? lead.imagery?.quality_score ?? 78;
  const imageQualityIssues = lead.image_quality_issues || lead.imagery?.issues || [];
  const qualityStatus = (lead.quality_validation_status || lead.imagery?.status || (imageQualityScore >= 70 ? 'passed' : 'review')).toLowerCase();

  const streetViewQuality = lead.street_view_quality || {
    angles_captured: (baseRoofIntelligence.street_view || []).length,
    average_quality: 0.82,
    average_occlusion: 0.21,
    headings: (baseRoofIntelligence.street_view || []).map((view) => view.heading || 0),
  };

  const dealProbability = lead.ai_insights?.deal_probability ?? 72;
  const urgencyScore = lead.ai_insights?.urgency_score ?? 65;
  let replacementUrgency = lead.replacement_urgency;
  if (!replacementUrgency) {
    if (urgencyScore >= 85) replacementUrgency = 'immediate';
    else if (urgencyScore >= 70) replacementUrgency = 'urgent';
    else if (urgencyScore >= 55) replacementUrgency = 'plan_ahead';
    else replacementUrgency = 'good_condition';
  }

  const priority = lead.priority || (lead.status && ['hot', 'warm', 'cold'].includes(lead.status) ? lead.status : undefined);
  const derivedPriority = priority || (lead.lead_score >= 85 ? 'hot' : lead.lead_score >= 70 ? 'warm' : 'cold');

  const homeownerName = lead.homeowner_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim();
  const estimatedValue = lead.estimated_value || (lead.property_value ? Math.round(lead.property_value * 0.08) : null);
  const confidenceScore = lead.analysis_confidence ?? lead.ai_analysis?.confidence ?? null;
  const scoreVersion = lead.score_version ?? lead.ai_analysis?.score_version ?? null;

  const aiAnalysis = {
    summary:
      lead.ai_analysis?.summary ||
      lead.ai_insights?.recommended_approach ||
      'Emphasize insurance expertise and expedited scheduling to convert this homeowner.',
    deal_probability: dealProbability,
    urgency_score: urgencyScore,
    key_motivators: lead.ai_insights?.key_motivators || lead.damage_indicators || [],
    damage_indicators: lead.damage_indicators || [],
    imagery: {
      normalized_view_url: normalizedViewUrl,
      heatmap_url: overlayUrl,
      overlay_url: overlayUrl,
      quality_status: qualityStatus,
      quality: {
        score: imageQualityScore,
        issues: imageQualityIssues,
      },
    },
    street_view: baseRoofIntelligence.street_view || [],
    enhanced_roof_intelligence: baseRoofIntelligence,
    confidence: confidenceScore,
    score_version: scoreVersion,
  };

  return {
    id: lead.id,
    address: lead.address,
    city: lead.city,
    state: lead.state,
    zip_code: lead.zip_code,
    roof_age_years: lead.roof_age_years ?? lead.roof_age ?? null,
    roof_condition_score: lead.roof_condition_score ?? roofConditionMap[(lead.roof_condition || '').toLowerCase()] ?? null,
    roof_material: lead.roof_material,
    roof_size_sqft: lead.roof_size_sqft ?? lead.square_footage ?? null,
    aerial_image_url: lead.aerial_image_url || normalizedViewUrl,
    lead_score: lead.lead_score,
    priority: derivedPriority,
    replacement_urgency: replacementUrgency,
    damage_indicators: lead.damage_indicators || aiAnalysis.key_motivators || [],
    homeowner_name: homeownerName || lead.address,
    homeowner_phone: lead.homeowner_phone || lead.phone || null,
    homeowner_email: lead.homeowner_email || lead.email || null,
    property_value: lead.property_value ?? null,
    estimated_value: estimatedValue,
    conversion_probability: lead.conversion_probability ?? dealProbability,
    ai_analysis: { ...aiAnalysis },
    image_quality_score: imageQualityScore,
    image_quality_issues: imageQualityIssues,
    quality_validation_status: qualityStatus,
    analysis_confidence: confidenceScore,
    score_version: scoreVersion,
    overlay_url: overlayUrl,
    street_view_quality: streetViewQuality,
    roof_intelligence: baseRoofIntelligence,
    area_scan_id: lead.area_scan_id || lead.scan_id || null,
    status: lead.status || 'new',
    created_at: lead.created_at || new Date().toISOString(),
    notes: lead.notes,
    last_contacted: lead.last_contacted,
    activities: (lead.activities || []).map((activity, idx) => ({
      id: activity.id || Number(`${lead.id}${idx}`),
      lead_id: lead.id,
      activity_type: activity.type || activity.activity_type || 'activity',
      title: activity.title || activity.description || (activity.type ? activity.type.replace(/_/g, ' ') : 'Activity'),
      description: activity.description || activity.title || '',
      occurred_at: activity.date || activity.occurred_at || activity.created_at || new Date().toISOString(),
      metadata: activity.metadata || {},
    })),
  };
};

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (error.config?.fmAllowUnauthorized) {
        return Promise.reject(error);
      }
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Lead Generation API
export const leadAPI = {
  // Area Scanning
  startAreaScan: async ({
    areaName,
    scanType = 'city',
    latitude,
    longitude,
    radiusMiles,
    estimatedCost,
    propertyCap,
  }) => {
    try {
      const response = await api.post('/api/scan/area', {
        area_name: areaName,
        scan_type: scanType,
        latitude,
        longitude,
        radius_miles: radiusMiles,
        estimated_cost: estimatedCost,
        property_cap: propertyCap,
      });
      return response.data;
    } catch (error) {
      assertMocksEnabled(error);
      console.log('Using mock area scan for development');
      // Generate a mock scan ID and return scan details
      const scanId = `scan_${Date.now()}`;
      return {
        id: scanId,
        area_name: areaName,
        scan_type: scanType,
        status: 'in_progress',
        qualified_leads: 0,
        total_properties: 0,
        processed_properties: 0,
        progress_percentage: 0,
        created_at: new Date().toISOString(),
        estimated_completion: new Date(Date.now() + 180000).toISOString(), // 3 minutes from now
        scan_parameters: {
          latitude,
          longitude,
          radius_miles: radiusMiles,
          estimated_cost: estimatedCost,
          property_cap: propertyCap,
        },
        results_summary: null,
      };
    }
  },

  estimateScan: async ({
    areaName,
    scanType = 'city',
    latitude,
    longitude,
    radiusMiles = 1,
    propertyCap,
  }) => {
    try {
      const response = await api.post('/api/scan/estimate', {
        area_name: areaName,
        scan_type: scanType,
        latitude,
        longitude,
        radius_miles: radiusMiles,
        property_cap: propertyCap,
      });
      return response.data;
    } catch (error) {
      assertMocksEnabled(error);
      console.log('Using mock scan estimate for development');
      const baseProperties = Math.round(160 * Math.max(radiusMiles, 0.25) ** 2);
      const capped = Math.min(baseProperties, propertyCap || 400);
      const imagery = +(capped * 0.45).toFixed(2);
      const street = +(capped * 0.28).toFixed(2);
      const enrichment = +(capped * 0.22).toFixed(2);
      const processing = +(capped * 0.12).toFixed(2);
      const estimate = +(imagery + street + enrichment + processing).toFixed(2);
      return {
        estimated_properties: capped,
        estimated_properties_before_cap: baseProperties,
        estimated_cost: estimate,
        cost_breakdown: {
          imagery,
          street_view: street,
          data_enrichment: enrichment,
          processing,
        },
        warnings: estimate > 400 ? ['Projected spend exceeds $400. Consider narrowing the target.'] : [],
        suggested_radius: estimate > 400 ? +(radiusMiles * Math.sqrt(400 / estimate)).toFixed(2) : null,
      };
    }
  },

  getScanStatus: async (scanId) => {
    try {
      const response = await api.get(`/api/scan/${scanId}/status`);
      return response.data;
    } catch (error) {
      assertMocksEnabled(error);
      console.log('Using mock scan status for development');
      // Return realistic mock scan status based on scanId or create a new one
      const mockScan = mockRecentScans.find(scan => scan.id === scanId);
      if (mockScan) {
        return {
          id: scanId,
          status: mockScan.status,
          area_name: mockScan.area_name,
          qualified_leads: mockScan.qualified_leads,
          total_properties: mockScan.total_properties,
          processed_properties: mockScan.status === 'completed' ? mockScan.total_properties : Math.floor(mockScan.total_properties * 0.85),
          progress_percentage: mockScan.status === 'completed' ? 100 : 85,
          created_at: mockScan.created_at,
          estimated_completion: mockScan.estimated_completion || mockScan.completed_at,
          scan_parameters: mockScan.scan_parameters || {
            latitude: 30.2672,
            longitude: -97.7431,
            radius_miles: 1.0,
            estimated_cost: 89.5,
            property_cap: 250,
          },
          results_summary: mockScan.status === 'completed' ? {
            qualified_leads: mockScan.qualified_leads,
            average_lead_score: 84,
            average_roof_age: 18,
            score_threshold: 70,
            damage_distribution: {
              'hail_damage': 5,
              'missing_shingles': 8,
              'granule_loss': 12,
              'aging_wear': 15
            }
          } : null
        };
      }
      
      // Generate a realistic mock scan for any scanId
      return {
        id: scanId,
        status: 'completed',
        area_name: 'Austin Metro Area',
        qualified_leads: 15,
        total_properties: 324,
        processed_properties: 324,
        progress_percentage: 100,
        created_at: '2024-01-27T09:30:00Z',
        completed_at: '2024-01-27T11:45:00Z',
        scan_parameters: {
          latitude: 30.2672,
          longitude: -97.7431,
          radius_miles: 2.5,
          estimated_cost: 249.75,
          property_cap: 600,
        },
        results_summary: {
          qualified_leads: 15,
          average_lead_score: 84,
          average_roof_age: 18,
          score_threshold: 70,
          damage_distribution: {
            'hail_damage': 8,
            'missing_shingles': 12,
            'granule_loss': 15,
            'wind_damage': 6,
            'aging_wear': 18
          }
        }
      };
    }
  },

  getScanResults: async (scanId) => {
    try {
      const response = await api.get(`/api/scan/${scanId}/results`);
      return response.data;
    } catch (error) {
      assertMocksEnabled(error);
      console.log('Using mock scan results for development');
      // Return comprehensive mock scan results that match ScanResults page expectations
      const scanLeads = mockLeads.filter(lead => lead.scan_id === scanId || scanId.includes('scan')).slice(0, 15);
      
      // If no specific leads found, use a subset of all leads with realistic data
      const leadsToUse = scanLeads.length > 0 ? scanLeads : mockLeads.slice(0, 15);
      
      return {
        id: scanId,
        area_name: 'Austin Metro Area',
        status: 'completed',
        created_at: '2024-01-27T09:30:00Z',
        completed_at: '2024-01-27T11:45:00Z',
        total_properties: 324,
        processed_properties: 324,
        qualified_leads: leadsToUse.length,
        scan_summary: {
          average_lead_score: Math.round(leadsToUse.reduce((sum, l) => sum + l.lead_score, 0) / leadsToUse.length),
          average_roof_age: Math.round(leadsToUse.reduce((sum, l) => sum + l.roof_age, 0) / leadsToUse.length),
          score_threshold: 70,
          damage_distribution: {
            'hail_damage': 8,
            'missing_shingles': 12,
            'granule_loss': 15,
            'wind_damage': 6,
            'aging_wear': 18,
            'gutter_issues': 4,
            'flashing_problems': 3
          },
          total_estimated_value: leadsToUse.reduce((sum, l) => sum + (l.property_value * 0.085), 0),
          high_priority_leads: leadsToUse.filter(l => l.status === 'hot').length,
          medium_priority_leads: leadsToUse.filter(l => l.status === 'warm').length,
          conversion_probability: 78.5,
          geographic_coverage: '15.2 sq miles',
          weather_conditions: 'Clear, optimal for scanning'
        },
        results_summary: {
          qualified_leads: leadsToUse.length,
          average_lead_score: Math.round(leadsToUse.reduce((sum, l) => sum + l.lead_score, 0) / leadsToUse.length),
          average_roof_age: Math.round(leadsToUse.reduce((sum, l) => sum + l.roof_age, 0) / leadsToUse.length),
          score_threshold: 70,
          damage_distribution: {
            'hail_damage': 8,
            'missing_shingles': 12,
            'granule_loss': 15,
            'wind_damage': 6,
            'aging_wear': 18,
            'gutter_issues': 4,
            'flashing_problems': 3
          }
        },
        leads: leadsToUse,
        performance_metrics: {
          scan_efficiency: 94.2,
          ai_accuracy_rate: 91.7,
          false_positive_rate: 4.1,
          processing_time_per_property: '2.3 seconds',
          total_scan_duration: '2 hours 15 minutes'
        }
      };
    }
  },

  createScanJob: async (payload) => {
    const response = await api.post('/api/v1/scan-jobs', payload);
    return response.data;
  },

  listScanJobs: async (limit = 20) => {
    const response = await api.get('/api/v1/scan-jobs', { params: { limit } });
    return response.data;
  },

  getScanJob: async (jobId) => {
    const response = await api.get(`/api/v1/scan-jobs/${jobId}`);
    return response.data;
  },

  getScanJobResults: async (jobId) => {
    const response = await api.get(`/api/v1/scan-jobs/${jobId}/results`);
    return response.data;
  },

  // Lead Management
  getLeads: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });
      
      const response = await api.get(`/api/leads?${params.toString()}`);
      return response.data;
    } catch (error) {
      assertMocksEnabled(error);
      console.log('Using mock lead data for development');
      // Apply filters to mock data
      let filteredLeads = [...mockLeads];

      if (filters.min_score) {
        filteredLeads = filteredLeads.filter((lead) => lead.lead_score >= parseInt(filters.min_score, 10));
      }
      if (filters.status) {
        filteredLeads = filteredLeads.filter((lead) => (lead.status || '').toLowerCase() === filters.status.toLowerCase());
      }
      if (filters.priority) {
        filteredLeads = filteredLeads.filter((lead) => (lead.priority || lead.status || '').toLowerCase() === filters.priority.toLowerCase());
      }
      if (filters.area_scan_id) {
        filteredLeads = filteredLeads.filter((lead) => lead.scan_id === filters.area_scan_id || `${lead.scan_id}`.includes('scan'));
      }

      if (filters.limit) {
        filteredLeads = filteredLeads.slice(0, parseInt(filters.limit, 10));
      }

      if (filteredLeads.length === 0 && !filters.min_score) {
        filteredLeads = mockLeads.slice(0, filters.limit || 50);
      }

      const normalized = filteredLeads
        .map((lead, index) => normalizeMockLead({ id: lead.id ?? index + 1, ...lead }))
        .filter(Boolean);

      console.log(`Returning ${normalized.length} mock leads with filters:`, filters);
      return normalized;
    }
  },

  getLead: async (leadId) => {
    try {
      const response = await api.get(`/api/leads/${leadId}`);
      return response.data;
    } catch (error) {
      assertMocksEnabled(error);
      console.log('Using mock lead data for development');
      const lead = mockLeads.find((l) => Number(l.id) === Number(leadId));
      if (!lead) throw new Error('Lead not found');
      const normalized = normalizeMockLead(lead);
      if (!normalized) throw new Error('Lead normalization failed');
      return normalized;
    }
  },

  getLeadSequences: async (leadId) => {
    try {
      const response = await api.get(`/api/leads/${leadId}/sequences`);
      return response.data;
    } catch (error) {
      assertMocksEnabled(error);
      console.log('Using mock lead sequence enrollments for development');
      return [];
    }
  },

  updateLead: async (leadId, updates) => {
    const response = await api.put(`/api/leads/${leadId}`, updates);
    return response.data;
  },

  // Scans
  getScans: async () => {
    try {
      const response = await api.get('/api/scans');
      return response.data;
    } catch (error) {
      assertMocksEnabled(error);
      console.log('Using mock scan data for development');
      return mockRecentScans;
    }
  },

  // Dashboard
  getDashboardStats: async () => {
    try {
      const response = await api.get('/api/dashboard/stats');
      return response.data;
    } catch (error) {
      assertMocksEnabled(error);
      console.log('Using mock dashboard stats for development');
      return mockDashboardStats;
    }
  },

  // Sequences
  getSequences: async () => {
    try {
      const response = await api.get('/api/sequences');
      return response.data;
    } catch (error) {
      assertMocksEnabled(error);
      console.log('Using mock sequence data for development');
      return mockSequences;
    }
  },

  getSequence: async (sequenceId) => {
    const response = await api.get(`/api/sequences/${sequenceId}`);
    return response.data;
  },

  createSequence: async (sequenceData) => {
    const response = await api.post('/api/sequences', sequenceData);
    return response.data;
  },

  updateSequence: async (sequenceId, updates) => {
    const response = await api.put(`/api/sequences/${sequenceId}`, updates);
    return response.data;
  },

  deleteSequence: async (sequenceId) => {
    const response = await api.delete(`/api/sequences/${sequenceId}`);
    return response.data;
  },

  enrollLeadsInSequence: async (sequenceId, leadIds) => {
    try {
      const response = await api.post(`/api/sequences/${sequenceId}/enroll`, {
        lead_ids: leadIds
      });
      return response.data;
    } catch (error) {
      assertMocksEnabled(error);
      console.log('Using mock sequence enrollment for development');
      // Mock successful enrollment
      return {
        success: true,
        enrolled_count: leadIds.length,
        sequence_id: sequenceId,
        message: `Successfully enrolled ${leadIds.length} leads in sequence`
      };
    }
  },

  getSequencePerformance: async (sequenceId) => {
    const response = await api.get(`/api/sequences/${sequenceId}/performance`);
    return response.data;
  },

  getSequenceTemplates: async () => {
    const response = await api.get('/api/sequences/templates');
    return response.data;
  },

  exportLeads: async (filters = {}) => {
    try {
      const response = await api.get('/api/leads/export', {
        params: filters,
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      assertMocksEnabled(error);
      console.log('Using mock CSV export for development');
      // Generate realistic CSV export data
      let leadsToExport = [...mockLeads];
      
      // Apply filters
      if (filters.area_scan_id) {
        leadsToExport = leadsToExport.filter(lead => 
          lead.scan_id === filters.area_scan_id || 
          filters.area_scan_id.includes('scan')
        );
      }
      if (filters.min_score) {
        leadsToExport = leadsToExport.filter(lead => lead.lead_score >= filters.min_score);
      }
      if (filters.status) {
        leadsToExport = leadsToExport.filter(lead => lead.status === filters.status);
      }
      
      // If no leads match filter, use a subset anyway for demo
      if (leadsToExport.length === 0) {
        leadsToExport = mockLeads.slice(0, 15);
      }
      
      // Generate CSV content
      const csvHeaders = [
        'ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Address', 'City', 'State', 'ZIP',
        'Property Value', 'Roof Age', 'Roof Material', 'Roof Condition', 'Square Footage',
        'Lead Score', 'Status', 'Income Bracket', 'Contact Preference', 'Best Time to Call',
        'Created Date', 'Last Contacted', 'Notes', 'Source', 'Deal Probability', 'Urgency Score'
      ].join(',');
      
      const csvRows = leadsToExport.map(lead => [
        lead.id,
        `"${lead.first_name}"`,
        `"${lead.last_name}"`,
        `"${lead.email}"`,
        `"${lead.phone}"`,
        `"${lead.address}"`,
        `"${lead.city}"`,
        `"${lead.state}"`,
        `"${lead.zip_code}"`,
        lead.property_value,
        lead.roof_age,
        `"${lead.roof_material}"`,
        `"${lead.roof_condition}"`,
        lead.square_footage,
        lead.lead_score,
        `"${lead.status}"`,
        `"${lead.income_bracket}"`,
        `"${lead.contact_preference}"`,
        `"${lead.best_time_to_call}"`,
        `"${lead.created_at}"`,
        `"${lead.last_contacted || ''}"`,
        `"${lead.notes || ''}"`,
        `"${lead.source}"`,
        lead.ai_insights?.deal_probability || '',
        lead.ai_insights?.urgency_score || ''
      ].join(','));
      
      const csvContent = [csvHeaders, ...csvRows].join('\n');
      return csvContent;
    }
  },
}; 

export const sequenceAPI = {
  processPending: async () => {
    const response = await api.post('/api/sequences/process');
    return response.data;
  },
  updateEnrollment: async (enrollmentId, action, notes = '') => {
    const response = await api.put(`/api/sequences/enrollments/${enrollmentId}`, {
      action,
      notes,
    });
    return response.data;
  },
};

export const activityAPI = {
  getActivities: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });

      const response = await api.get(`/api/activities?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.log('Using mock activity data for development');
      let filteredActivities = [...mockActivities];
      
      if (filters.lead_id) {
        filteredActivities = filteredActivities.filter((activity) =>
          Number(activity.lead_id) === Number(filters.lead_id)
        );
      }
      if (filters.limit) {
        filteredActivities = filteredActivities.slice(0, parseInt(filters.limit));
      }
      
      return filteredActivities;
    }
  },
};

// Voice Call API
const fallbackVoiceCalls = [
  {
    id: 'call_demo_001',
    lead_id: 101,
    lead_name: 'Maria Thompson',
    lead_email: 'maria.thompson@example.com',
    to_number: '+15125550101',
    status: 'completed',
    outcome: 'scheduled',
    interest_level: 'high',
    appointment_scheduled: true,
    conversation_state: 'appointment',
    duration_seconds: 534,
    total_cost: 4.82,
    ai_cost: 1.27,
    call_cost: 3.55,
    carrier: 'telnyx',
    retry_attempts: 0,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    ended_at: new Date(Date.now() - 1000 * 60 * 60 * 6 + 534 * 1000).toISOString(),
    ai_summary: 'Booked an onsite inspection after validating hail impact and insurance readiness.',
    next_steps: 'Email inspection checklist and assign estimator.',
    transcript_json: {
      turns: [
        {
          role: 'assistant',
          text: 'Good morning Maria, this is the Fish Mouth AI scheduling team. We saw last week’s hail near Anderson Mill and wanted to see how your roof is holding up.',
        },
        {
          role: 'user',
          text: 'We did notice some granules in the gutters after the storm.',
        },
        {
          role: 'assistant',
          text: 'Thanks for sharing that. Based on the aerial scan, there are impact clusters on the north slope. I have a field estimator nearby Wednesday at 2pm—does that slot work?',
        },
        {
          role: 'user',
          text: 'Yes, let’s do Wednesday.',
        },
        {
          role: 'assistant',
          text: 'Great. I’ll send over the confirmation and a photo checklist so you know what to expect.',
        },
      ],
    },
  },
  {
    id: 'call_demo_002',
    lead_id: 102,
    lead_name: 'David Carter',
    lead_email: 'david.carter@example.com',
    to_number: '+15125550144',
    status: 'completed',
    outcome: 'follow_up',
    interest_level: 'medium',
    appointment_scheduled: false,
    conversation_state: 'qualification',
    duration_seconds: 418,
    total_cost: 3.94,
    ai_cost: 1.08,
    call_cost: 2.86,
    carrier: 'telnyx',
    retry_attempts: 1,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
    ended_at: new Date(Date.now() - 1000 * 60 * 60 * 28 + 418 * 1000).toISOString(),
    ai_summary: 'Qualified interest, homeowner wants insurance paperwork ready before onsite visit.',
    next_steps: 'Send insurance FAQ pack and call back Friday morning.',
    transcript_json: {
      turns: [
        {
          role: 'assistant',
          text: 'Hi David, following up about the ridge cap lifting we flagged on your scan. How are things looking today?',
        },
        {
          role: 'user',
          text: 'We patched a tarp but haven’t heard back from our insurance yet.',
        },
        {
          role: 'assistant',
          text: 'Understood. I can email an insurance guide and circle back once you’ve got the claim number. Would Friday morning work?',
        },
        {
          role: 'user',
          text: 'Yes, please call then.',
        },
      ],
    },
  },
  {
    id: 'call_demo_003',
    lead_id: 103,
    lead_name: 'Angela Hunt',
    lead_email: 'angela.hunt@example.com',
    to_number: '+15125550977',
    status: 'completed',
    outcome: 'no_answer',
    interest_level: 'low',
    appointment_scheduled: false,
    conversation_state: 'greeting',
    duration_seconds: 62,
    total_cost: 0.74,
    ai_cost: 0.18,
    call_cost: 0.56,
    carrier: 'telnyx',
    retry_attempts: 0,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 50).toISOString(),
    ended_at: new Date(Date.now() - 1000 * 60 * 60 * 50 + 62 * 1000).toISOString(),
    ai_summary: 'Voicemail left introducing storm damage support and offering same-day inspection.',
    next_steps: 'Send voicemail follow-up email with booking link.',
    transcript_json: {
      turns: [
        {
          role: 'assistant',
          text: 'Hi Angela, this is Fish Mouth Roofing. We saw your address in the hail corridor near Mesa Drive. I’ll send over a calendar link—book whenever it’s convenient.',
        },
      ],
    },
  },
];

const buildMockVoiceAnalytics = (days = 30) => {
  const cappedDays = Math.min(30, Math.max(7, days));
  const today = new Date();
  const daily_breakdown = Array.from({ length: cappedDays }).map((_, index) => {
    const day = new Date(today);
    day.setDate(day.getDate() - (cappedDays - index - 1));
    const calls = 6 + (index % 4);
    const connects = Math.max(2, calls - (index % 3));
    return {
      day: day.toISOString(),
      calls,
      connects,
    };
  });

  const sentiment_trends = daily_breakdown.map((entry, index) => ({
    day: entry.day,
    avg_sentiment: 68 + ((index * 7) % 12),
  }));

  const outcome_breakdown = [
    { outcome: 'scheduled', count: 9, sentiment: 82.4 },
    { outcome: 'follow_up', count: 6, sentiment: 74.2 },
    { outcome: 'no_answer', count: 4, sentiment: 55.1 },
    { outcome: 'voicemail', count: 3, sentiment: 60.3 },
  ];

  const insights = {
    strengths: [
      'Booking rate spiked 14% on sequences with insurance scripting.',
      'Average first response latency stayed under 2.2s during peak hours.',
      'AI handled objections about deductible costs with 71% positive sentiment.',
    ],
    risks: [
      'North Austin zip codes show rising no-answer rates after 6pm.',
      'Follow-up steps are missing for 3 voicemail-only engagements.',
    ],
    recommendations: [
      'Shift high-value call attempts to 9–11am where connect rates are highest.',
      'Enable bilingual agent handoff for Pflugerville cluster calls.',
      'Pair area-scan hot leads with same-day SMS reminder to reduce no-answers.',
    ],
  };

  const totalCalls = daily_breakdown.reduce((sum, entry) => sum + entry.calls, 0);
  const totalConnects = daily_breakdown.reduce((sum, entry) => sum + entry.connects, 0);

  return {
    total_calls: totalCalls,
    total_bookings: outcome_breakdown.find((item) => item.outcome === 'scheduled')?.count || 0,
    avg_booking_rate: totalConnects ? (100 * (outcome_breakdown.find((item) => item.outcome === 'scheduled')?.count || 0)) / totalConnects : 0,
    avg_duration_seconds: Math.round(
      fallbackVoiceCalls.reduce((sum, call) => sum + (call.duration_seconds || 0), 0) / fallbackVoiceCalls.length
    ),
    total_call_cost_usd: fallbackVoiceCalls.reduce((sum, call) => sum + (call.total_cost || 0), 0),
    total_ai_cost_usd: fallbackVoiceCalls.reduce((sum, call) => sum + (call.ai_cost || 0), 0),
    avg_latency_ms: 1850,
    daily_breakdown,
    sentiment_trends,
    outcome_breakdown,
    insights,
  };
};

export const voiceAPI = {
  // Start a voice call
  startCall: async (leadId, config = {}) => {
    try {
      const response = await api.post('/api/voice/calls/start', {
        lead_id: leadId,
        config
      });
      return response.data;
    } catch (error) {
      assertMocksEnabled(error);
      console.log('Using mock voice call for development');
      // Generate mock call data
      const callId = `call_${Date.now()}_${leadId}`;
      return {
        call_id: callId,
        lead_id: leadId,
        status: 'initiated',
        to_number: config.to_number || '+1234567890',
        call_type: config.call_type || 'qualification',
        started_at: new Date().toISOString(),
        estimated_duration: '5-8 minutes',
        ai_agent: 'FishMouth AI Assistant v2.1'
      };
    }
  },

  // End a voice call
  endCall: async (callId, outcome = 'completed') => {
    const response = await api.post(`/api/voice/calls/${callId}/end?outcome=${outcome}`);
    return response.data;
  },

  // Get voice call details
  getCall: async (callId) => {
    try {
      const response = await api.get(`/api/voice/calls/${callId}` , { fmAllowUnauthorized: true });
      return response.data;
    } catch (error) {
      assertMocksEnabled(error);
      console.log('Using mock voice call detail for development');
      const fallback =
        fallbackVoiceCalls.find((call) => String(call.id) === String(callId)) || fallbackVoiceCalls[0];
      if (!fallback) {
        throw error;
      }
      return {
        id: fallback.id,
        lead_id: fallback.lead_id,
        lead_email: fallback.lead_email,
        status: fallback.status,
        duration_seconds: fallback.duration_seconds,
        outcome: fallback.outcome,
        interest_level: fallback.interest_level,
        appointment_scheduled: Boolean(fallback.appointment_scheduled),
        recording_url: fallback.recording_url || null,
        transcript_json: fallback.transcript_json,
        conversation_state: fallback.conversation_state || 'follow_up',
        first_audio_latency_ms: 1450,
        ai_summary: fallback.ai_summary,
        next_steps: fallback.next_steps,
        total_cost: fallback.total_cost,
        ai_cost: fallback.ai_cost,
        carrier: fallback.carrier || 'telnyx',
        call_control_id: fallback.call_control_id || null,
        created_at: fallback.created_at,
        ended_at: fallback.ended_at,
      };
    }
  },

  // Get voice calls list
  getCalls: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });
      const response = await api.get(`/api/voice/calls?${params.toString()}`, { fmAllowUnauthorized: true });
      return response.data;
    } catch (error) {
      assertMocksEnabled(error);
      console.log('Using mock voice calls data for development');
      const normalized = fallbackVoiceCalls.map((call, index) => {
        const createdAt = call.created_at
          ? new Date(call.created_at)
          : new Date(Date.now() - index * 1000 * 60 * 45);
        const endedAt =
          call.ended_at ||
          new Date(createdAt.getTime() + (call.duration_seconds || 0) * 1000).toISOString();

        return {
          id: call.id,
          lead_id: filters.lead_id ? Number(filters.lead_id) : call.lead_id,
          lead_name: call.lead_name,
          lead_email: call.lead_email,
          status: call.status,
          duration_seconds: call.duration_seconds,
          outcome: call.outcome,
          interest_level: call.interest_level,
          appointment_scheduled: Boolean(call.appointment_scheduled),
          conversation_state: call.conversation_state,
          to_number: call.to_number,
          ai_summary: call.ai_summary,
          next_steps: call.next_steps,
          total_cost: call.total_cost,
          ai_cost: call.ai_cost,
          carrier: call.carrier,
          call_control_id: call.call_control_id || null,
          retry_attempts: call.retry_attempts || 0,
          created_at: createdAt.toISOString(),
          ended_at: endedAt,
        };
      });

      let filtered = normalized;
      if (filters.lead_id) {
        filtered = filtered.filter(
          (call) => Number(call.lead_id) === Number(filters.lead_id)
        );
      }
      if (filters.status) {
        filtered = filtered.filter(
          (call) => (call.status || '').toLowerCase() === String(filters.status).toLowerCase()
        );
      }
      if (filters.outcome) {
        filtered = filtered.filter(
          (call) => (call.outcome || '').toLowerCase() === String(filters.outcome).toLowerCase()
        );
      }
      if (filters.interest_level || filters.interest) {
        const interestFilter = (filters.interest_level || filters.interest || '').toLowerCase();
        filtered = filtered.filter(
          (call) => (call.interest_level || '').toLowerCase() === interestFilter
        );
      }
      if (filters.search) {
        const query = String(filters.search).toLowerCase();
        filtered = filtered.filter((call) => {
          return (
            call.id.toLowerCase().includes(query) ||
            (call.to_number || '').toLowerCase().includes(query) ||
            (call.lead_name || '').toLowerCase().includes(query)
          );
        });
      }

      const limit = filters.limit ? parseInt(filters.limit, 10) : 25;
      return filtered.slice(0, limit);
    }
  },

  // Voice bookings
  createBooking: async (bookingData) => {
    const response = await api.post('/api/voice/bookings', bookingData);
    return response.data;
  },

  getBookings: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    
    const response = await api.get(`/api/voice/bookings?${params.toString()}`);
    return response.data;
  },

  // Voice analytics
  getAnalytics: async (days = 30) => {
    try {
      const response = await api.get(`/api/voice/analytics/daily?days=${days}`);
      return response.data;
    } catch (error) {
      assertMocksEnabled(error);
      console.log('Using mock voice analytics data for development');
      return buildMockVoiceAnalytics(days);
    }
  },

  // Voice configuration
  getConfig: async () => {
    const response = await api.get('/api/voice/config');
    return response.data;
  },

  updateConfig: async (configData) => {
    const response = await api.put('/api/voice/config', configData);
    return response.data;
  },

  // Legacy method for compatibility
  makeCall: async (leadId) => {
    const response = await api.post('/api/voice/calls/start', {
      lead_id: leadId
    });
    return response.data;
  },
};

// Analytics API
export const analyticsAPI = {
  getPerformanceData: async () => {
    try {
      const response = await api.get('/api/analytics/performance');
      return response.data;
    } catch (error) {
      assertMocksEnabled(error);
      console.log('Using mock analytics data for development');
      return mockAnalyticsData;
    }
  },
  
  getComprehensiveAnalytics: async () => {
    try {
      const response = await api.get('/api/analytics/comprehensive');
      return response.data;
    } catch (error) {
      assertMocksEnabled(error);
      console.log('Using mock comprehensive analytics data for development');
      return mockAnalyticsData;
    }
  },
};

export default api;
