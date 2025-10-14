import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Play,
  Pause,
  Plus,
  Edit2,
  Trash2,
  Settings,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Save,
  X
} from 'lucide-react';

const JobSchedulingInterface = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [formData, setFormData] = useState({
    job_id: '',
    job_name: '',
    job_type: 'scraping',
    cron_expression: '0 2 * * *',
    enabled: true,
    parameters: {},
    cities: []
  });

  const orchestratorUrl = process.env.REACT_APP_ORCHESTRATOR_URL || 'http://localhost:8009';

  // Job type options
  const jobTypes = [
    { value: 'scraping', label: 'Data Scraping', description: 'Scrape permits, properties, and contractor data' },
    { value: 'enrichment', label: 'Data Enrichment', description: 'Enhance property data with email and address validation' },
    { value: 'lead_generation', label: 'Lead Generation', description: 'Score properties and generate leads' },
    { value: 'image_processing', label: 'Image Processing', description: 'Download and process property images' },
    { value: 'ml_analysis', label: 'ML Analysis', description: 'AI-powered roof analysis and damage detection' }
  ];

  // Common cron expressions
  const cronPresets = [
    { label: 'Every hour', value: '0 * * * *' },
    { label: 'Every 2 hours', value: '0 */2 * * *' },
    { label: 'Every 4 hours', value: '0 */4 * * *' },
    { label: 'Daily at 2 AM', value: '0 2 * * *' },
    { label: 'Daily at 6 AM', value: '0 6 * * *' },
    { label: 'Every weekday at 9 AM', value: '0 9 * * 1-5' },
    { label: 'Every Sunday at 1 AM', value: '0 1 * * 0' },
    { label: 'Every 15 minutes', value: '*/15 * * * *' }
  ];

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${orchestratorUrl}/scheduler/jobs`);
      if (response.ok) {
        const data = await response.json();
        setJobs(data);
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  }, [orchestratorUrl]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleCreateJob = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${orchestratorUrl}/scheduler/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowCreateForm(false);
        setFormData({
          job_id: '',
          job_name: '',
          job_type: 'scraping',
          cron_expression: '0 2 * * *',
          enabled: true,
          parameters: {},
          cities: []
        });
        fetchJobs();
      } else {
        alert('Failed to create job');
      }
    } catch (error) {
      console.error('Failed to create job:', error);
      alert('Failed to create job');
    }
  };

  const handleUpdateJob = async (jobId, updates) => {
    try {
      const response = await fetch(`${orchestratorUrl}/scheduler/jobs/${jobId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        setEditingJob(null);
        fetchJobs();
      } else {
        alert('Failed to update job');
      }
    } catch (error) {
      console.error('Failed to update job:', error);
      alert('Failed to update job');
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!confirm('Are you sure you want to delete this job?')) return;

    try {
      const response = await fetch(`${orchestratorUrl}/scheduler/jobs/${jobId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchJobs();
      } else {
        alert('Failed to delete job');
      }
    } catch (error) {
      console.error('Failed to delete job:', error);
      alert('Failed to delete job');
    }
  };

  const handleToggleJob = async (job) => {
    await handleUpdateJob(job.job_id, { enabled: !job.enabled });
  };

  const handleRunJobNow = async (jobId) => {
    try {
      const response = await fetch(`${orchestratorUrl}/scheduler/jobs/${jobId}/run`, {
        method: 'POST'
      });

      if (response.ok) {
        alert('Job started successfully');
      } else {
        alert('Failed to start job');
      }
    } catch (error) {
      console.error('Failed to run job:', error);
      alert('Failed to run job');
    }
  };

  const formatNextRunTime = (nextRunTime) => {
    if (!nextRunTime) return 'Not scheduled';
    const date = new Date(nextRunTime);
    return date.toLocaleString();
  };

  const formatCronExpression = (cron) => {
    const preset = cronPresets.find(p => p.value === cron);
    return preset ? preset.label : cron;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-lg">Loading job schedules...</span>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Job Scheduling
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Configure automated data acquisition workflows
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Job
        </button>
      </div>

      {/* Create/Edit Form */}
      {(showCreateForm || editingJob) && (
        <div className="mb-6 p-4 border rounded-lg bg-gray-50">
          <h3 className="text-lg font-medium mb-4">
            {editingJob ? 'Edit Job' : 'Create New Job'}
          </h3>
          
          <form onSubmit={handleCreateJob} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job ID
                </label>
                <input
                  type="text"
                  value={formData.job_id}
                  onChange={(e) => setFormData({...formData, job_id: e.target.value})}
                  className="w-full p-2 border rounded-lg"
                  placeholder="unique-job-id"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Name
                </label>
                <input
                  type="text"
                  value={formData.job_name}
                  onChange={(e) => setFormData({...formData, job_name: e.target.value})}
                  className="w-full p-2 border rounded-lg"
                  placeholder="Descriptive job name"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Type
              </label>
              <select
                value={formData.job_type}
                onChange={(e) => setFormData({...formData, job_type: e.target.value})}
                className="w-full p-2 border rounded-lg"
              >
                {jobTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label} - {type.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Schedule (Cron Expression)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.cron_expression}
                  onChange={(e) => setFormData({...formData, cron_expression: e.target.value})}
                  className="flex-1 p-2 border rounded-lg"
                  placeholder="0 2 * * *"
                  required
                />
                <select
                  onChange={(e) => setFormData({...formData, cron_expression: e.target.value})}
                  className="p-2 border rounded-lg"
                >
                  <option value="">Select preset...</option>
                  {cronPresets.map(preset => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Format: minute hour day month weekday (e.g., "0 2 * * *" = daily at 2 AM)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cities (comma-separated, optional)
              </label>
              <input
                type="text"
                value={formData.cities.join(', ')}
                onChange={(e) => setFormData({
                  ...formData, 
                  cities: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                })}
                className="w-full p-2 border rounded-lg"
                placeholder="Austin TX, Dallas TX, Houston TX"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="enabled"
                checked={formData.enabled}
                onChange={(e) => setFormData({...formData, enabled: e.target.checked})}
                className="mr-2"
              />
              <label htmlFor="enabled" className="text-sm font-medium text-gray-700">
                Enable job immediately
              </label>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingJob ? 'Update Job' : 'Create Job'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingJob(null);
                  setFormData({
                    job_id: '',
                    job_name: '',
                    job_type: 'scraping',
                    cron_expression: '0 2 * * *',
                    enabled: true,
                    parameters: {},
                    cities: []
                  });
                }}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Jobs List */}
      <div className="space-y-4">
        {jobs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No scheduled jobs found</p>
            <p className="text-sm">Create your first automated job to get started</p>
          </div>
        ) : (
          jobs.map((job) => (
            <div key={job.job_id} className="border rounded-lg p-4 hover:bg-gray-50 transition">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-medium text-gray-900">{job.job_name}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      job.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {job.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                      {job.job_type.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      Schedule: {formatCronExpression(job.cron_expression)}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      Next run: {formatNextRunTime(job.next_run_time)}
                    </div>
                    {job.cities && job.cities.length > 0 && (
                      <div className="flex items-center">
                        <Settings className="w-4 h-4 mr-2" />
                        Cities: {job.cities.join(', ')}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleToggleJob(job)}
                    className={`p-2 rounded-lg transition ${
                      job.enabled 
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                    title={job.enabled ? 'Disable job' : 'Enable job'}
                  >
                    {job.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  
                  <button
                    onClick={() => handleRunJobNow(job.job_id)}
                    className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
                    title="Run now"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => {
                      setEditingJob(job);
                      setFormData({
                        job_id: job.job_id,
                        job_name: job.job_name,
                        job_type: job.job_type,
                        cron_expression: job.cron_expression,
                        enabled: job.enabled,
                        parameters: job.parameters || {},
                        cities: job.cities || []
                      });
                    }}
                    className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                    title="Edit job"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => handleDeleteJob(job.job_id)}
                    className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                    title="Delete job"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Refresh Button */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={fetchJobs}
          className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Jobs
        </button>
      </div>
    </div>
  );
};

export default JobSchedulingInterface;