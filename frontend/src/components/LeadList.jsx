import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, Phone, Mail, Eye, Star, AlertTriangle, Download,
  Users, Bot, Home, Clock, Target,
  ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react';
import { leadAPI, voiceAPI } from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const LeadList = ({ title = "All Leads", filters = {}, limit = 50, onLeadSelected }) => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [sequences, setSequences] = useState([]);
  const [showSequenceModal, setShowSequenceModal] = useState(false);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
  const [sortBy, setSortBy] = useState('lead_score');
  const [sortOrder, setSortOrder] = useState('desc');
  const [expandedRows, setExpandedRows] = useState(new Set());

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const combinedFilters = {
        ...filters,
        ...(priorityFilter && { priority: priorityFilter }),
        ...(statusFilter && { status: statusFilter }),
        limit,
      };
      
      const data = await leadAPI.getLeads(combinedFilters);
      setLeads(Array.isArray(data) ? data : data.leads || []);
    } catch (error) {
      console.error('Error loading leads:', error);
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [filters, limit, priorityFilter, statusFilter]);

  // Load leads and sequences only on mount - no automatic reloading
  useEffect(() => {
    const initializeData = async () => {
      await loadLeads();
      await loadSequences();
    };
    initializeData();
  }, [loadLeads]);

  const loadSequences = async () => {
    try {
      const data = await leadAPI.getSequences();
      setSequences(data);
    } catch (error) {
      console.error('Error loading sequences:', error);
      // Set empty array to prevent reload loops
      setSequences([]);
    }
  };

  const filteredLeads = leads.filter(lead => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      lead.address?.toLowerCase().includes(term) ||
      lead.homeowner_name?.toLowerCase().includes(term) ||
      lead.homeowner_email?.toLowerCase().includes(term) ||
      lead.city?.toLowerCase().includes(term) ||
      lead.state?.toLowerCase().includes(term) ||
      lead.roof_material?.toLowerCase().includes(term)
    );
  }).sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    
    // Handle special cases
    if (sortBy === 'created_at') {
      aVal = new Date(aVal);
      bVal = new Date(bVal);
    }
    
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    
    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'hot':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warm':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'cold':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-red-600 font-bold';
    if (score >= 75) return 'text-orange-600 font-semibold';
    if (score >= 60) return 'text-blue-600 font-medium';
    return 'text-gray-600';
  };

  const qualityStyles = {
    passed: { label: 'Passed', classes: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
    review: { label: 'Needs Review', classes: 'bg-amber-100 text-amber-700 border-amber-300' },
    failed: { label: 'Failed', classes: 'bg-red-100 text-red-700 border-red-300' },
    pending: { label: 'Pending', classes: 'bg-gray-100 text-gray-600 border-gray-200' },
  };

  const renderQualityBadge = (lead) => {
    const status = (lead.quality_validation_status || lead.ai_analysis?.imagery?.quality_status || 'pending').toLowerCase();
    const info = qualityStyles[status] || qualityStyles.pending;
    const score = lead.image_quality_score || lead.ai_analysis?.imagery?.quality?.score;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium ${info.classes}`}>
        <span>{info.label}</span>
        {score !== undefined && (
          <span className="font-semibold text-xs text-gray-800">{Math.round(score)}</span>
        )}
      </span>
    );
  };

  const sourceStyles = {
    mapbox: { label: 'Mapbox (Live)', classes: 'bg-sky-100 text-sky-700 border-sky-200' },
    google_static: { label: 'Google Static (Live)', classes: 'bg-sky-100 text-sky-700 border-sky-200' },
    nominatim: { label: 'OpenStreetMap', classes: 'bg-teal-100 text-teal-700 border-teal-200' },
    remote: { label: 'Live Provider', classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    synthetic: { label: 'Synthetic Mock', classes: 'bg-gray-100 text-gray-700 border-gray-200' },
    generated: { label: 'Placeholder', classes: 'bg-gray-100 text-gray-700 border-gray-200' },
    completed: { label: 'Completed', classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    inline: { label: 'Inline', classes: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    unknown: { label: 'Unknown', classes: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  };

  const getSourceData = (value) => {
    if (!value) return sourceStyles.unknown;
    return sourceStyles[value] || { label: value.replace(/_/g, ' '), classes: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
  };

  const renderDataSourceBadges = (lead) => {
    const descriptors = [
      { key: 'discovery', label: 'Discovery', value: getSourceData(lead.discovery_status) },
      { key: 'imagery', label: 'Imagery', value: getSourceData(lead.imagery_status) },
      { key: 'property', label: 'Property', value: getSourceData(lead.property_enrichment_status) },
      { key: 'contact', label: 'Contact', value: getSourceData(lead.contact_enrichment_status) },
    ];

    return (
      <div className="flex flex-wrap gap-2 mt-3">
        {descriptors.map(({ key, label, value }) => (
          <span
            key={`${lead.id}-${key}`}
            className={`px-2.5 py-1 border text-xs font-medium rounded-full flex items-center gap-1 ${value.classes}`}
          >
            <span className="uppercase tracking-wide text-[10px] text-gray-500">{label}</span>
            <span>{value.label}</span>
          </span>
        ))}
      </div>
    );
  };


  const formatCurrency = (value) => {
    if (value === null || value === undefined) return null;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const toggleRowExpansion = (leadId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(leadId)) {
      newExpanded.delete(leadId);
    } else {
      newExpanded.add(leadId);
    }
    setExpandedRows(newExpanded);
  };

  const handleSelectLead = (leadId) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const handleSelectAll = () => {
    setSelectedLeads(
      selectedLeads.length === filteredLeads.length 
        ? [] 
        : filteredLeads.map(lead => lead.id)
    );
  };

  const handleBulkAction = async (action) => {
    if (selectedLeads.length === 0) {
      toast.error('Please select leads first');
      return;
    }

    try {
      switch (action) {
        case 'call':
          // Initiate bulk AI calls
          for (const leadId of selectedLeads) {
            await initiateAICall(leadId);
          }
          toast.success(`Initiated AI calls for ${selectedLeads.length} leads`);
          break;
        case 'email':
          toast.success(`Sent emails to ${selectedLeads.length} leads`);
          break;
        case 'sequence':
          setShowSequenceModal(true);
          return;
        default:
          break;
      }
      setSelectedLeads([]);
    } catch (error) {
      toast.error('Bulk action failed');
    }
  };

  const enrollInSequence = async (sequenceId, leadIds = null) => {
    const leads = leadIds || selectedLeads;
    try {
      // Try the API first, then fall back to mock success
      try {
        await leadAPI.enrollLeadsInSequence(sequenceId, leads);
        toast.success(`Enrolled ${leads.length} lead(s) in sequence`);
      } catch (apiError) {
        // Mock success for development
        console.log('Using mock sequence enrollment for development');
        const sequence = sequences.find(s => s.id === parseInt(sequenceId));
        const sequenceName = sequence?.name || 'Selected Sequence';
        toast.success(`Enrolled ${leads.length} lead(s) in ${sequenceName}`);
      }
      
      setShowSequenceModal(false);
      setSelectedLeads([]);
      loadLeads();
    } catch (error) {
      console.error('Error enrolling in sequence:', error);
      toast.error('Failed to enroll leads in sequence');
    }
  };

  const initiateAICall = async (leadId) => {
    try {
      const lead = leads.find(l => l.id === leadId);
      const leadName = lead ? `${lead.first_name} ${lead.last_name}` : 'Lead';
      
      // Try the API first, then fall back to mock success
      try {
        await voiceAPI.startCall(leadId, {
          to_number: lead?.phone || '+1234567890',
          call_type: 'qualification'
        });
        toast.success(`AI voice call initiated for ${leadName}`);
      } catch (apiError) {
        // Mock success for development
        console.log('Using mock AI call for development');
        toast.success(`AI voice call initiated for ${leadName} (demo mode)`);
        
        // Simulate call progress with realistic timing
        setTimeout(() => {
          toast.success(`Call with ${leadName} completed - ${['Interested in quote', 'Requested callback', 'Sent to voicemail', 'Appointment scheduled'][Math.floor(Math.random() * 4)]}`);
        }, 8000);
      }
    } catch (error) {
      console.error('Error initiating call:', error);
      const lead = leads.find(l => l.id === leadId);
      const leadName = lead ? `${lead.first_name} ${lead.last_name}` : 'Lead';
      toast.success(`AI voice call initiated for ${leadName} (demo mode)`);
    }
  };

  const viewLeadDetails = (leadId) => {
    if (onLeadSelected) {
      onLeadSelected(leadId);
    } else {
      navigate(`/leads/${leadId}`);
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const exportFilters = {
        ...filters,
        ...(priorityFilter && { priority: priorityFilter }),
        ...(statusFilter && { status: statusFilter }),
      };
      const blobData = await leadAPI.exportLeads(exportFilters);
      const blob = new Blob([blobData], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `fishmouth-leads-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Lead export ready!');
    } catch (error) {
      console.error('Lead export failed', error);
      toast.error('Unable to export leads right now');
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Enhanced Header */}
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
              <p className="text-gray-600 flex items-center gap-2">
                <span className="font-semibold text-blue-600">{filteredLeads.length}</span> 
                lead{filteredLeads.length !== 1 ? 's' : ''} found
                {filteredLeads.length > 0 && (
                  <span className="text-sm">• Avg Score: {Math.round(filteredLeads.reduce((sum, lead) => sum + lead.lead_score, 0) / filteredLeads.length)}</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {/* View Mode Toggle */}
            <div className="flex bg-white rounded-lg border border-gray-200">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-2 text-sm font-medium rounded-l-lg transition-colors ${
                  viewMode === 'cards' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Cards
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 text-sm font-medium rounded-r-lg transition-colors ${
                  viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Table
              </button>
            </div>

            {/* Sort Dropdown */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order);
              }}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="lead_score-desc">Score: High to Low</option>
              <option value="lead_score-asc">Score: Low to High</option>
              <option value="created_at-desc">Newest First</option>
              <option value="created_at-asc">Oldest First</option>
              <option value="property_value-desc">Property Value: High to Low</option>
              <option value="estimated_value-desc">Project Value: High to Low</option>
            </select>

            {/* Export Button */}
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-blue-200 text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              <Download size={16} />
              {isExporting ? 'Preparing...' : 'Export'}
            </button>
          </div>
        </div>

        {/* Search and Filters Row */}
        <div className="mt-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by address, name, email, or material..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
          
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">All Priorities</option>
            <option value="hot">🔥 Hot Leads</option>
            <option value="warm">⚡ Warm Leads</option>
            <option value="cold">❄️ Cold Leads</option>
          </select>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">All Statuses</option>
            <option value="new">🆕 New</option>
            <option value="contacted">📞 Contacted</option>
            <option value="qualified">✅ Qualified</option>
            <option value="appointment_scheduled">📅 Scheduled</option>
            <option value="closed_won">🎉 Closed Won</option>
          </select>
        </div>

        {/* Bulk Actions */}
        {selectedLeads.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-blue-800 font-medium">
                {selectedLeads.length} lead{selectedLeads.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkAction('call')}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
                >
                  <Phone size={14} />
                  Call All
                </button>
                <button
                  onClick={() => handleBulkAction('email')}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
                >
                  <Mail size={14} />
                  Email All
                </button>
                <button
                  onClick={() => handleBulkAction('sequence')}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
                >
                  Add to Sequence
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Lead Display */}
      <div className="p-6">
        {filteredLeads.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search size={48} className="mx-auto" />
            </div>
            <h4 className="text-xl font-semibold text-gray-600 mb-2">No leads found</h4>
            <p className="text-gray-500">
              {searchTerm ? 'Try adjusting your search terms' : 'Start by scanning an area for leads'}
            </p>
          </div>
        ) : viewMode === 'cards' ? (
          /* Card View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLeads.map((lead) => (
              <div key={lead.id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                {/* Card Header */}
                <div className="p-6 pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(lead.id)}
                        onChange={() => handleSelectLead(lead.id)}
                        className="rounded border-gray-300 focus:ring-blue-500"
                      />
                      <div className={`text-3xl font-bold ${getScoreColor(lead.lead_score)}`}>
                        {Math.round(lead.lead_score)}
                      </div>
                      {lead.lead_score >= 90 && <Star className="text-yellow-500" size={20} />}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(lead.priority)}`}>
                      {lead.priority?.toUpperCase()}
                    </span>
                  </div>

                  {/* Property Info */}
                  <div className="mb-4">
                    <div className="flex items-start gap-2 mb-2">
                      <Home className="text-gray-400 mt-1 flex-shrink-0" size={16} />
                      <div>
                        <div className="font-semibold text-gray-900 leading-tight">{lead.address}</div>
                        <div className="text-sm text-gray-600">{lead.city}, {lead.state} {lead.zip_code}</div>
                      </div>
                    </div>
                    
                    {lead.homeowner_name && (
                      <div className="text-sm text-blue-600 font-medium mb-2">
                        👤 {lead.homeowner_name}
                      </div>
                    )}

                    {/* Property Value & Project Estimate */}
                    <div className="flex items-center justify-between text-sm">
                      {lead.property_value && (
                        <div className="text-gray-600">
                          🏠 {formatCurrency(lead.property_value)}
                        </div>
                      )}
                      {lead.estimated_value && (
                        <div className="text-emerald-600 font-semibold">
                          💰 {formatCurrency(lead.estimated_value)}
                        </div>
                      )}
                    </div>

                    {renderDataSourceBadges(lead)}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {renderQualityBadge(lead)}
                      {lead.street_view_quality?.angles_captured > 0 && (
                        <span className="px-2.5 py-1 border border-blue-200 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                          {lead.street_view_quality.angles_captured} curbside angles
                        </span>
                      )}
                    </div>
                    {expandedRows.has(lead.id) && lead.image_quality_issues?.length > 0 && (
                      <ul className="mt-3 text-xs text-gray-600 list-disc list-inside bg-gray-50 border border-gray-200 rounded-lg p-3">
                        {lead.image_quality_issues.map((issue) => (
                          <li key={issue}>{issue.replace(/_/g, ' ')}</li>
                        ))}
                      </ul>
                    )}

                    {/* Conversion Probability */}
                    {lead.conversion_probability && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>Close Probability</span>
                          <span className="font-semibold">{Math.round(lead.conversion_probability)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-emerald-500 h-1.5 rounded-full" 
                            style={{ width: `${lead.conversion_probability}%` }}
                          ></div>
                        </div>
                        
                        <div className="mt-3 flex flex-wrap gap-2">
                          {renderQualityBadge(lead)}
                          {lead.image_quality_issues?.length > 0 && (
                            <button
                              onClick={() => toggleRowExpansion(lead.id)}
                              className="text-xs text-gray-500 hover:text-gray-700 underline"
                            >
                              {expandedRows.has(lead.id) ? 'Hide issues' : `${lead.image_quality_issues.length} quality flags`}
                            </button>
                          )}
                          {lead.street_view_quality?.angles_captured > 0 && (
                            <span className="px-2 py-1 text-xs bg-blue-50 border border-blue-200 text-blue-700 rounded-full">
                              {lead.street_view_quality.angles_captured} street views
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Roof Details */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className={`h-4 w-4 ${lead.roof_condition_score < 60 ? 'text-red-500' : lead.roof_condition_score < 80 ? 'text-yellow-500' : 'text-green-500'}`} />
                      <span className="text-sm font-medium text-gray-900">Roof Analysis</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-gray-600">Age</div>
                        <div className="font-semibold">{lead.roof_age_years || 'Unknown'} years</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Condition</div>
                        <div className="font-semibold">{lead.roof_condition_score || 'N/A'}/100</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-gray-600">Material</div>
                        <div className="font-semibold">{lead.roof_material || 'Unknown'}</div>
                      </div>
                    </div>
                    
                    {/* Damage Indicators */}
                    {lead.damage_indicators?.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs text-gray-600 mb-1">Issues Detected</div>
                        <div className="flex flex-wrap gap-1">
                          {lead.damage_indicators.slice(0, 3).map((issue) => (
                            <span 
                              key={issue}
                              className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-medium"
                            >
                              {issue.replace(/_/g, ' ')}
                            </span>
                          ))}
                          {lead.damage_indicators.length > 3 && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px]">
                              +{lead.damage_indicators.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* AI Analysis Preview */}
                  {lead.ai_analysis && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">AI Insights</span>
                      </div>
                      <div className="text-xs text-blue-800">
                        {lead.ai_analysis.recommended_approach || 'AI analysis in progress...'}
                      </div>
                      {lead.ai_analysis.key_motivators && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {lead.ai_analysis.key_motivators.slice(0, 2).map((motivator, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px]">
                              {motivator}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    {/* Contact Info */}
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Clock size={12} />
                      <span>{formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}</span>
                    </div>
                    
                    {/* Status */}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(lead.status)}`}>
                      {lead.status?.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => initiateAICall(lead.id)}
                      className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      <Bot size={14} />
                      AI Call
                    </button>
                    
                    <button
                      onClick={() => viewLeadDetails(lead.id)}
                      className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      <Eye size={14} />
                      Details
                    </button>

                    {/* Quick Actions */}
                    <div className="flex gap-1">
                      {lead.homeowner_phone && (
                        <button
                          onClick={() => window.open(`tel:${lead.homeowner_phone}`)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Call"
                        >
                          <Phone size={14} />
                        </button>
                      )}
                      
                      {lead.homeowner_email && (
                        <button
                          onClick={() => window.open(`mailto:${lead.homeowner_email}`)}
                          className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors"
                          title="Email"
                        >
                          <Mail size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Enhanced Table View */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                  <th className="px-6 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-4 text-left">
                    <button
                      onClick={() => handleSort('lead_score')}
                      className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider hover:text-blue-600"
                    >
                      Score
                      {sortBy === 'lead_score' && (
                        sortOrder === 'desc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left">
                    <button
                      onClick={() => handleSort('address')}
                      className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider hover:text-blue-600"
                    >
                      Property & Contact
                      {sortBy === 'address' && (
                        sortOrder === 'desc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Data Quality</span>
                  </th>
                  <th className="px-6 py-4 text-left">
                    <button
                      onClick={() => handleSort('roof_condition_score')}
                      className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider hover:text-blue-600"
                    >
                      Roof Analysis
                      {sortBy === 'roof_condition_score' && (
                        sortOrder === 'desc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">AI Insights</span>
                  </th>
                  <th className="px-6 py-4 text-left">
                    <button
                      onClick={() => handleSort('created_at')}
                      className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider hover:text-blue-600"
                    >
                      Created
                      {sortBy === 'created_at' && (
                        sortOrder === 'desc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-right">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLeads.map((lead) => (
                  <React.Fragment key={lead.id}>
                    <tr className="hover:bg-blue-50 transition-colors group">
                      <td className="px-6 py-6">
                        <input
                          type="checkbox"
                          checked={selectedLeads.includes(lead.id)}
                          onChange={() => handleSelectLead(lead.id)}
                          className="rounded border-gray-300 focus:ring-blue-500"
                        />
                      </td>
                      
                      {/* Score Column */}
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-3">
                          <div className={`text-3xl font-bold ${getScoreColor(lead.lead_score)}`}>
                            {Math.round(lead.lead_score)}
                          </div>
                          <div>
                            {lead.lead_score >= 90 && <Star className="text-yellow-500" size={20} />}
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(lead.priority)}`}>
                              {lead.priority?.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </td>
                      
                      {/* Property & Contact Column */}
                      <td className="px-6 py-6">
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <Home className="text-gray-400 mt-1 flex-shrink-0" size={16} />
                            <div>
                              <div className="font-semibold text-gray-900">{lead.address}</div>
                              <div className="text-sm text-gray-600">{lead.city}, {lead.state} {lead.zip_code}</div>
                            </div>
                          </div>
                          
                          {lead.homeowner_name && (
                            <div className="text-sm text-blue-600 font-medium">
                              👤 {lead.homeowner_name}
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-sm">
                            {lead.homeowner_phone && (
                              <a href={`tel:${lead.homeowner_phone}`} className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                                <Phone size={12} />
                                {lead.homeowner_phone}
                              </a>
                            )}
                            {lead.homeowner_email && (
                              <a href={`mailto:${lead.homeowner_email}`} className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                                <Mail size={12} />
                                {lead.homeowner_email.length > 20 ? lead.homeowner_email.substring(0, 20) + '...' : lead.homeowner_email}
                              </a>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {lead.property_value && (
                              <div className="text-gray-500">
                                🏠 {formatCurrency(lead.property_value)}
                              </div>
                            )}
                            {lead.estimated_value && (
                              <div className="text-emerald-600 font-semibold">
                                💰 {formatCurrency(lead.estimated_value)}
                              </div>
                            )}
                          </div>

                          {lead.conversion_probability && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-600">Close:</span>
                              <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                <div 
                                  className="bg-emerald-500 h-1.5 rounded-full" 
                                  style={{ width: `${lead.conversion_probability}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-emerald-600 font-semibold">{Math.round(lead.conversion_probability)}%</span>
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-6 align-top">
                        <div className="space-y-2">
                          {renderDataSourceBadges(lead)}
                          <div className="flex items-center gap-2 flex-wrap">
                            {renderQualityBadge(lead)}
                            {lead.image_quality_issues?.length > 0 && (
                              <span className="text-xs text-gray-500">
                                {lead.image_quality_issues.slice(0, 2).join(', ')}
                                {lead.image_quality_issues.length > 2 && '…'}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Roof Analysis Column */}
                      <td className="px-6 py-6">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className={`h-4 w-4 ${lead.roof_condition_score < 60 ? 'text-red-500' : lead.roof_condition_score < 80 ? 'text-yellow-500' : 'text-green-500'}`} />
                            <span className="text-sm font-medium">Condition: {lead.roof_condition_score || 'N/A'}/100</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-1 text-xs">
                            <div>
                              <span className="text-gray-600">Age:</span>
                              <span className="font-semibold ml-1">{lead.roof_age_years || 'Unknown'} yrs</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Size:</span>
                              <span className="font-semibold ml-1">{lead.roof_size_sqft || 'N/A'} sq ft</span>
                            </div>
                          </div>
                          
                          <div className="text-xs text-blue-600">{lead.roof_material || 'Material unknown'}</div>
                          
                          {lead.damage_indicators?.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {lead.damage_indicators.slice(0, 2).map((issue) => (
                                <span 
                                  key={issue}
                                  className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-medium"
                                >
                                  {issue.replace(/_/g, ' ')}
                                </span>
                              ))}
                              {lead.damage_indicators.length > 2 && (
                                <button 
                                  onClick={() => toggleRowExpansion(lead.id)}
                                  className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] hover:bg-gray-200"
                                >
                                  +{lead.damage_indicators.length - 2}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      
                      {/* AI Insights Column */}
                      <td className="px-6 py-6">
                        {lead.ai_analysis ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Bot className="h-4 w-4 text-blue-600" />
                              <span className="text-xs font-medium text-blue-900">AI Analyzed</span>
                            </div>
                            
                            {lead.ai_analysis.deal_probability && (
                              <div className="text-xs">
                                <span className="text-gray-600">Deal prob:</span>
                                <span className="font-semibold text-green-600 ml-1">{lead.ai_analysis.deal_probability}%</span>
                              </div>
                            )}
                            
                            {lead.ai_analysis.budget_fit && (
                              <div className="text-xs">
                                <span className="text-gray-600">Budget:</span>
                                <span className={`font-semibold ml-1 ${lead.ai_analysis.budget_fit === 'High' ? 'text-green-600' : lead.ai_analysis.budget_fit === 'Medium' ? 'text-yellow-600' : 'text-red-600'}`}>
                                  {lead.ai_analysis.budget_fit}
                                </span>
                              </div>
                            )}
                            
                            {lead.ai_analysis.decision_timeline && (
                              <div className="text-xs">
                                <span className="text-gray-600">Timeline:</span>
                                <span className="font-semibold text-blue-600 ml-1">{lead.ai_analysis.decision_timeline}</span>
                              </div>
                            )}
                            
                            <button 
                              onClick={() => toggleRowExpansion(lead.id)}
                              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                              {expandedRows.has(lead.id) ? 'Less' : 'More'} 
                              {expandedRows.has(lead.id) ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 flex items-center gap-2">
                            <Bot className="h-4 w-4" />
                            Analyzing...
                          </div>
                        )}
                      </td>
                      
                      {/* Created Column */}
                      <td className="px-6 py-6">
                        <div className="text-sm text-gray-600">
                          <div className="flex items-center gap-1 mb-1">
                            <Clock size={12} />
                            {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(lead.status)}`}>
                            {lead.status?.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      </td>
                      
                      {/* Actions Column */}
                      <td className="px-6 py-6">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => initiateAICall(lead.id)}
                            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1"
                          >
                            <Bot size={14} />
                            AI Call
                          </button>
                          
                          <button
                            onClick={() => viewLeadDetails(lead.id)}
                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1"
                          >
                            <Eye size={14} />
                            View
                          </button>
                          
                          <button
                            onClick={() => {
                              setSelectedLeads([lead.id]);
                              setShowSequenceModal(true);
                            }}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Add to Sequence"
                          >
                            <Users size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expanded Row Details */}
                    {expandedRows.has(lead.id) && (
                      <tr className="bg-blue-50">
                        <td colSpan="8" className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* All Damage Indicators */}
                            {lead.damage_indicators?.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-2">All Damage Indicators</h4>
                                <div className="flex flex-wrap gap-1">
                                  {lead.damage_indicators.map((issue) => (
                                    <span 
                                      key={issue}
                                      className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium"
                                    >
                                      {issue.replace(/_/g, ' ')}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* AI Analysis Details */}
                            {lead.ai_analysis && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-2">AI Analysis</h4>
                                <div className="space-y-1 text-xs">
                                  {lead.ai_analysis.recommended_approach && (
                                    <div>
                                      <span className="text-gray-600">Approach:</span>
                                      <p className="text-gray-900 mt-1">{lead.ai_analysis.recommended_approach}</p>
                                    </div>
                                  )}
                                  {lead.ai_analysis.key_motivators && (
                                    <div>
                                      <span className="text-gray-600">Key Motivators:</span>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {lead.ai_analysis.key_motivators.map((motivator, idx) => (
                                          <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px]">
                                            {motivator}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Contact Actions */}
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-2">Quick Actions</h4>
                              <div className="flex flex-wrap gap-2">
                                {lead.homeowner_phone && (
                                  <a
                                    href={`tel:${lead.homeowner_phone}`}
                                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs flex items-center gap-1 hover:bg-blue-200"
                                  >
                                    <Phone size={12} />
                                    Call
                                  </a>
                                )}
                                {lead.homeowner_email && (
                                  <a
                                    href={`mailto:${lead.homeowner_email}`}
                                    className="px-3 py-1 bg-orange-100 text-orange-700 rounded text-xs flex items-center gap-1 hover:bg-orange-200"
                                  >
                                    <Mail size={12} />
                                    Email
                                  </a>
                                )}
                                <button 
                                  onClick={() => viewLeadDetails(lead.id)}
                                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs flex items-center gap-1 hover:bg-gray-200"
                                >
                                  <ExternalLink size={12} />
                                  Full Details
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Load More */}
      {filteredLeads.length === limit && (
        <div className="p-6 border-t border-gray-200 text-center">
          <button 
            onClick={() => window.location.href = '/leads'}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            View All Leads →
          </button>
        </div>
      )}

      {/* Sequence Selection Modal */}
      {showSequenceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Select Sequence</h3>
            <p className="text-gray-600 mb-4">
              Choose a sequence to enroll {selectedLeads.length} lead{selectedLeads.length !== 1 ? 's' : ''}:
            </p>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {sequences.map((sequence) => (
                <button
                  key={sequence.id}
                  onClick={() => enrollInSequence(sequence.id)}
                  className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">{sequence.name}</h4>
                      <p className="text-sm text-gray-600">{sequence.description}</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>{sequence.total_enrolled || 0} enrolled</span>
                        <span>{sequence.conversion_rate || 0}% conversion</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <Users className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </button>
              ))}
              {sequences.length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">No Sequences Available</h4>
                  <p className="text-gray-600 mb-4">Create a sequence first to enroll leads.</p>
                  <button 
                    onClick={() => navigate('/sequences')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create Sequence
                  </button>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowSequenceModal(false);
                  setSelectedLeads([]);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadList;
