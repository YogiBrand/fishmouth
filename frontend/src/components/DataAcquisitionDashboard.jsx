import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Server,
  Database,
  Search,
  MapPin,
  Users,
  Settings,
  Play,
  Pause,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Globe,
  Zap,
  Target,
  BarChart3,
  Calendar
} from 'lucide-react';
import JobSchedulingInterface from './JobSchedulingInterface';

const DataAcquisitionDashboard = () => {
  const [systemHealth, setSystemHealth] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [activeJobs, setActiveJobs] = useState([]);
  const [recentLeads, setRecentLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState('orchestrator');
  const [activeTab, setActiveTab] = useState('overview');

  // Service URLs from environment
  const serviceUrls = {
    orchestrator: process.env.REACT_APP_ORCHESTRATOR_URL || 'http://localhost:8009',
    scraper: process.env.REACT_APP_SCRAPER_URL || 'http://localhost:8011',
    imageProcessor: process.env.REACT_APP_IMAGE_PROCESSOR_URL || 'http://localhost:8012',
    mlInference: process.env.REACT_APP_ML_INFERENCE_URL || 'http://localhost:8013',
    enrichment: process.env.REACT_APP_ENRICHMENT_URL || 'http://localhost:8004',
    leadGenerator: process.env.REACT_APP_LEAD_GENERATOR_URL || 'http://localhost:8008'
  };

  // Fetch system status
  const fetchSystemStatus = useCallback(async () => {
    try {
      const response = await fetch(`${serviceUrls.orchestrator}/status`);
      if (response.ok) {
        const data = await response.json();
        setSystemHealth(data);
      }
    } catch (error) {
      console.error('Failed to fetch system status:', error);
    }
  }, [serviceUrls.orchestrator]);

  // Fetch metrics
  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch(`${serviceUrls.orchestrator}/metrics`);
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    }
  }, [serviceUrls.orchestrator]);

  // Fetch active jobs
  const fetchActiveJobs = useCallback(async () => {
    try {
      const response = await fetch(`${serviceUrls.scraper}/jobs?limit=10`);
      if (response.ok) {
        const data = await response.json();
        setActiveJobs(data.jobs || []);
      }
    } catch (error) {
      console.error('Failed to fetch active jobs:', error);
    }
  }, [serviceUrls.scraper]);

  // Fetch recent leads
  const fetchRecentLeads = useCallback(async () => {
    try {
      const response = await fetch(`${serviceUrls.leadGenerator}/leads/top?limit=5`);
      if (response.ok) {
        const data = await response.json();
        setRecentLeads(data.leads || []);
      }
    } catch (error) {
      console.error('Failed to fetch recent leads:', error);
    }
  }, [serviceUrls.leadGenerator]);

  // Load all data
  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchSystemStatus(),
      fetchMetrics(),
      fetchActiveJobs(),
      fetchRecentLeads()
    ]);
    setLoading(false);
  }, [fetchSystemStatus, fetchMetrics, fetchActiveJobs, fetchRecentLeads]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [loadData]);

  // Run workflow
  const runWorkflow = async (workflowType) => {
    try {
      const response = await fetch(`${serviceUrls.orchestrator}/workflows/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflow_type: workflowType,
          parameters: {}
        })
      });

      if (response.ok) {
        alert(`${workflowType} workflow started successfully!`);
        setTimeout(loadData, 2000); // Refresh data after 2 seconds
      } else {
        alert(`Failed to start ${workflowType} workflow`);
      }
    } catch (error) {
      console.error(`Failed to run ${workflowType} workflow:`, error);
      alert(`Error starting ${workflowType} workflow`);
    }
  };

  // Process city
  const processCity = async () => {
    const city = prompt('Enter city name:');
    const state = prompt('Enter state code (e.g., TX):');
    
    if (!city || !state) return;

    try {
      const response = await fetch(`${serviceUrls.orchestrator}/cities/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          city,
          state: state.toUpperCase(),
          priority: 1,
          scrape_types: ['permit', 'property']
        })
      });

      if (response.ok) {
        alert(`Processing started for ${city}, ${state}!`);
        setTimeout(loadData, 2000);
      } else {
        alert(`Failed to start processing for ${city}, ${state}`);
      }
    } catch (error) {
      console.error('Failed to process city:', error);
      alert('Error processing city');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'down': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getJobStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'running': return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-lg">Loading Data Acquisition Dashboard...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Database className="w-8 h-8 mr-3 text-blue-600" />
          Data Acquisition System
        </h1>
        <p className="text-gray-600 mt-2">
          Intelligent roofing lead generation through automated data scraping and analysis
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Activity className="w-4 h-4 inline mr-2" />
              System Overview
            </button>
            <button
              onClick={() => setActiveTab('scheduler')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'scheduler'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Calendar className="w-4 h-4 inline mr-2" />
              Job Scheduling
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
          {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Overall Health</p>
              <p className={`text-lg font-semibold capitalize ${getStatusColor(systemHealth?.overall_health)}`}>
                {systemHealth?.overall_health || 'Unknown'}
              </p>
            </div>
            <Activity className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Workflows</p>
              <p className="text-2xl font-semibold text-gray-900">
                {systemHealth?.active_workflows || 0}
              </p>
            </div>
            <RefreshCw className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Jobs</p>
              <p className="text-2xl font-semibold text-gray-900">
                {systemHealth?.pending_jobs || 0}
              </p>
            </div>
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Services Online</p>
              <p className="text-2xl font-semibold text-gray-900">
                {systemHealth?.services ? Object.keys(systemHealth.services).length : 0}
              </p>
            </div>
            <Server className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white p-6 rounded-xl shadow-sm border mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          System Controls
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => runWorkflow('daily_scrape')}
            className="flex items-center justify-center p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Search className="w-4 h-4 mr-2" />
            Run Scraping
          </button>
          
          <button
            onClick={() => runWorkflow('enrichment_batch')}
            className="flex items-center justify-center p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <Zap className="w-4 h-4 mr-2" />
            Run Enrichment
          </button>
          
          <button
            onClick={() => runWorkflow('lead_generation')}
            className="flex items-center justify-center p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            <Target className="w-4 h-4 mr-2" />
            Generate Leads
          </button>
          
          <button
            onClick={processCity}
            className="flex items-center justify-center p-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
          >
            <MapPin className="w-4 h-4 mr-2" />
            Process City
          </button>
        </div>
        
        <div className="mt-4">
          <button
            onClick={loadData}
            className="flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Data
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Service Health */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Server className="w-5 h-5 mr-2" />
            Service Health
          </h2>
          
          <div className="space-y-3">
            {systemHealth?.services && Object.entries(systemHealth.services).map(([service, status]) => (
              <div key={service} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${
                    status.healthy ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className="font-medium capitalize">{service.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {status.response_time && (
                    <span className="text-sm text-gray-500">
                      {Math.round(status.response_time)}ms
                    </span>
                  )}
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    status.healthy ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {status.healthy ? 'Healthy' : 'Down'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Jobs */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Recent Jobs
          </h2>
          
          <div className="space-y-3">
            {activeJobs.length > 0 ? (
              activeJobs.slice(0, 5).map((job, index) => (
                <div key={job.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    {getJobStatusIcon(job.status)}
                    <div className="ml-3">
                      <p className="font-medium">{job.job_type} - {job.city}, {job.state}</p>
                      <p className="text-sm text-gray-500">
                        {job.records_succeeded || 0} succeeded, {job.records_failed || 0} failed
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getStatusColor(job.status)}`}>
                    {job.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No recent jobs found</p>
            )}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Performance Metrics
          </h2>
          
          {metrics?.lead_generation && (
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {metrics.lead_generation.total_leads || 0}
                </p>
                <p className="text-sm text-gray-600">Total Leads (24h)</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {metrics.lead_generation.high_quality_count || 0}
                </p>
                <p className="text-sm text-gray-600">High Quality</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {Math.round(metrics.lead_generation.avg_score || 0)}
                </p>
                <p className="text-sm text-gray-600">Avg Score</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">
                  {metrics.lead_generation.premium_leads || 0}
                </p>
                <p className="text-sm text-gray-600">Premium Leads</p>
              </div>
            </div>
          )}
        </div>

        {/* Top Leads */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Top Quality Leads
          </h2>
          
          <div className="space-y-3">
            {recentLeads.length > 0 ? (
              recentLeads.map((lead, index) => (
                <div key={lead.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{lead.address}</p>
                    <p className="text-sm text-gray-500">
                      {lead.city}, {lead.state} • {lead.owner_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-blue-600">{lead.overall_score}</p>
                    <p className="text-sm text-gray-500 capitalize">{lead.pricing_tier}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No recent leads found</p>
            )}
          </div>
        </div>
      </div>
        </>
      )}

      {/* Job Scheduling Tab */}
      {activeTab === 'scheduler' && (
        <JobSchedulingInterface />
      )}
    </div>
  );
};

export default DataAcquisitionDashboard;