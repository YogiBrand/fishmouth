import React, { useState, useEffect } from 'react';
import {
  Zap, Play, Pause, Settings, Activity, Clock, Target,
  CheckCircle, AlertTriangle, TrendingUp, BarChart3,
  Users, MessageSquare, Phone, Mail, Calendar, Star,
  RefreshCw, Eye, Edit, Plus, Trash2, ArrowRight,
  Bot, Lightbulb, Award, Shield, Heart, ThumbsUp,
  Send, Video, FileText, Download, Share, Filter,
  Building2, MapPin, DollarSign, Timer, Flame
} from 'lucide-react';
import toast from 'react-hot-toast';

const WorkflowAutomation = ({ businessProfile, leads = [], onExecuteAction }) => {
  const [workflows, setWorkflows] = useState([]);
  const [automationStats, setAutomationStats] = useState({});
  const [activeWorkflows, setActiveWorkflows] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkflowData();
    generateAutomationInsights();
  }, [leads, businessProfile]);

  const loadWorkflowData = async () => {
    try {
      // Mock workflow data - in real app this would come from API
      const mockWorkflows = [
        {
          id: 1,
          name: 'New Lead Welcome Sequence',
          description: 'Automated welcome sequence for new leads within first 5 minutes',
          trigger: 'lead_created',
          steps: 5,
          active: true,
          conversionRate: 23.5,
          leadsProcessed: 147,
          avgResponseTime: '4.2 minutes',
          lastExecuted: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          template: 'welcome-sequence'
        },
        {
          id: 2,
          name: 'Storm Season Urgency Campaign',
          description: 'Seasonal urgency-driven outreach for storm-related inquiries',
          trigger: 'seasonal_weather',
          steps: 7,
          active: true,
          conversionRate: 34.2,
          leadsProcessed: 89,
          avgResponseTime: '1.8 minutes',
          lastExecuted: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          template: 'urgency-campaign'
        },
        {
          id: 3,
          name: 'High-Value Property VIP Treatment',
          description: 'Premium service approach for properties over $500K',
          trigger: 'high_value_property',
          steps: 4,
          active: true,
          conversionRate: 48.7,
          leadsProcessed: 23,
          avgResponseTime: '2.1 minutes',
          lastExecuted: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          template: 'vip-treatment'
        },
        {
          id: 4,
          name: 'Re-engagement Recovery Sequence',
          description: 'Win back leads who haven\'t responded in 7+ days',
          trigger: 'lead_dormant',
          steps: 6,
          active: false,
          conversionRate: 12.3,
          leadsProcessed: 156,
          avgResponseTime: '24 hours',
          lastExecuted: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          template: 're-engagement'
        }
      ];

      setWorkflows(mockWorkflows);
      
      // Set active workflows status
      const activeStatus = {};
      mockWorkflows.forEach(workflow => {
        activeStatus[workflow.id] = workflow.active;
      });
      setActiveWorkflows(activeStatus);

    } catch (error) {
      toast.error('Failed to load workflow data');
    } finally {
      setLoading(false);
    }
  };

  const generateAutomationInsights = () => {
    const stats = {
      totalAutomations: workflows.length,
      activeAutomations: workflows.filter(w => w.active).length,
      totalLeadsProcessed: workflows.reduce((sum, w) => sum + w.leadsProcessed, 0),
      avgConversionRate: workflows.length > 0 ? 
        workflows.reduce((sum, w) => sum + w.conversionRate, 0) / workflows.length : 0,
      timesSaved: '12.5 hours/week',
      revenueGenerated: '$47,350',
      responseImprovement: '+215%',
      customerSatisfaction: '94%'
    };

    setAutomationStats(stats);
  };

  const toggleWorkflow = async (workflowId, enabled) => {
    try {
      setActiveWorkflows(prev => ({ ...prev, [workflowId]: enabled }));
      
      // Update workflow in state
      setWorkflows(prev => prev.map(workflow => 
        workflow.id === workflowId ? { ...workflow, active: enabled } : workflow
      ));

      toast.success(`Workflow ${enabled ? 'activated' : 'deactivated'} successfully!`);
      
      // Trigger immediate execution if activating
      if (enabled) {
        executeWorkflowImmediate(workflowId);
      }
      
    } catch (error) {
      toast.error('Failed to update workflow');
      // Revert on error
      setActiveWorkflows(prev => ({ ...prev, [workflowId]: !enabled }));
    }
  };

  const executeWorkflowImmediate = async (workflowId) => {
    const workflow = workflows.find(w => w.id === workflowId);
    if (!workflow) return;

    toast.loading(`Executing ${workflow.name}...`);
    
    try {
      // Simulate workflow execution
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.dismiss();
      toast.success(`${workflow.name} executed successfully!`);
      
      // Update last executed time
      setWorkflows(prev => prev.map(w => 
        w.id === workflowId 
          ? { ...w, lastExecuted: new Date().toISOString() }
          : w
      ));

      // Call parent callback if provided
      if (onExecuteAction) {
        onExecuteAction('workflow_executed', { workflow });
      }

    } catch (error) {
      toast.dismiss();
      toast.error('Workflow execution failed');
    }
  };

  const createNewWorkflow = () => {
    // In real app, this would open a workflow builder
    toast.info('Workflow builder coming soon!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw size={48} className="animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-600">Loading automation workflows...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Workflow Automation</h2>
          <p className="text-slate-600 mt-1">Intelligent automation that works around the clock</p>
        </div>
        <button
          onClick={createNewWorkflow}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-lg"
        >
          <Plus size={20} />
          <span>Create Workflow</span>
        </button>
      </div>

      {/* Automation Stats Overview */}
      <AutomationStatsOverview stats={automationStats} />

      {/* Active Workflows Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {workflows.map((workflow) => (
          <WorkflowCard
            key={workflow.id}
            workflow={workflow}
            isActive={activeWorkflows[workflow.id]}
            onToggle={(enabled) => toggleWorkflow(workflow.id, enabled)}
            onExecute={() => executeWorkflowImmediate(workflow.id)}
            businessProfile={businessProfile}
          />
        ))}
      </div>

      {/* Real-time Activity Feed */}
      <WorkflowActivityFeed workflows={workflows} />
    </div>
  );
};

// Automation Stats Overview Component
const AutomationStatsOverview = ({ stats }) => (
  <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl p-6 text-white">
    <div className="flex items-center justify-between mb-6">
      <div>
        <h3 className="text-2xl font-bold">Automation Impact</h3>
        <p className="text-blue-100">Your workflows are driving real results</p>
      </div>
      <Zap size={48} className="text-yellow-300" />
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        icon={Activity}
        value={stats.activeAutomations}
        label="Active Workflows"
        subtext={`${stats.totalAutomations} total`}
      />
      <StatCard
        icon={Users}
        value={stats.totalLeadsProcessed}
        label="Leads Processed"
        subtext="This month"
      />
      <StatCard
        icon={TrendingUp}
        value={`${stats.avgConversionRate?.toFixed(1)}%`}
        label="Avg Conversion"
        subtext={stats.responseImprovement}
      />
      <StatCard
        icon={DollarSign}
        value={stats.revenueGenerated}
        label="Revenue Generated"
        subtext={stats.timesSaved}
      />
    </div>
  </div>
);

const StatCard = ({ icon: Icon, value, label, subtext }) => (
  <div className="text-center">
    <Icon size={32} className="mx-auto mb-2 text-blue-200" />
    <div className="text-2xl font-bold mb-1">{value}</div>
    <div className="text-sm font-medium mb-1">{label}</div>
    <div className="text-xs text-blue-200">{subtext}</div>
  </div>
);

// Workflow Card Component
const WorkflowCard = ({ workflow, isActive, onToggle, onExecute, businessProfile }) => {
  const getWorkflowIcon = (template) => {
    const icons = {
      'welcome-sequence': Users,
      'urgency-campaign': Flame,
      'vip-treatment': Award,
      're-engagement': RefreshCw
    };
    return icons[template] || Bot;
  };

  const WorkflowIcon = getWorkflowIcon(workflow.template);

  const getStatusColor = () => {
    if (!isActive) return 'text-slate-400';
    if (workflow.conversionRate > 40) return 'text-emerald-600';
    if (workflow.conversionRate > 25) return 'text-blue-600';
    return 'text-amber-600';
  };

  return (
    <div className={`bg-white/70 backdrop-blur-sm rounded-2xl border shadow-xl transition-all duration-300 ${
      isActive ? 'border-blue-200 shadow-blue-100' : 'border-slate-200'
    }`}>
      {/* Card Header */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
            }`}>
              <WorkflowIcon size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{workflow.name}</h3>
              <p className="text-sm text-slate-600 mt-1">{workflow.description}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onToggle(!isActive)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                isActive ? 'bg-blue-600' : 'bg-slate-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isActive ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className={`text-2xl font-bold ${getStatusColor()}`}>
              {workflow.conversionRate}%
            </div>
            <div className="text-xs text-slate-500">Conversion Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">
              {workflow.leadsProcessed}
            </div>
            <div className="text-xs text-slate-500">Leads Processed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">
              {workflow.steps}
            </div>
            <div className="text-xs text-slate-500">Steps</div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Avg Response Time:</span>
            <span className="font-medium text-slate-900">{workflow.avgResponseTime}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Last Executed:</span>
            <span className="font-medium text-slate-900">
              {new Date(workflow.lastExecuted).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3 mt-6">
          <button
            onClick={onExecute}
            disabled={!isActive}
            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 text-white rounded-lg transition-colors"
          >
            <Play size={16} />
            <span>Execute Now</span>
          </button>
          <button className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors">
            <Eye size={16} />
          </button>
          <button className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors">
            <Edit size={16} />
          </button>
        </div>
      </div>

      {/* Active Indicator */}
      {isActive && (
        <div className="px-6 pb-4">
          <div className="flex items-center space-x-2 text-sm text-emerald-600">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="font-medium">Active & Monitoring</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Workflow Activity Feed Component
const WorkflowActivityFeed = ({ workflows }) => {
  const [activities] = useState([
    {
      id: 1,
      workflow: 'New Lead Welcome Sequence',
      action: 'Sent welcome text to lead #247',
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      status: 'success',
      leadInfo: 'John Smith - 123 Oak St'
    },
    {
      id: 2,
      workflow: 'Storm Season Urgency Campaign',
      action: 'Triggered urgency email sequence',
      timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      status: 'success',
      leadInfo: 'Sarah Johnson - 456 Pine Ave'
    },
    {
      id: 3,
      workflow: 'High-Value Property VIP Treatment',
      action: 'Scheduled premium consultation call',
      timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
      status: 'success',
      leadInfo: 'Mike Davis - $750K Property'
    },
    {
      id: 4,
      workflow: 'Re-engagement Recovery Sequence',
      action: 'Attempted call - no answer',
      timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
      status: 'warning',
      leadInfo: 'Lisa Chen - Dormant 8 days'
    }
  ]);

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Live Activity Feed</h3>
          <p className="text-slate-600">Real-time workflow executions and results</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-slate-500">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span>Live Updates</span>
        </div>
      </div>

      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-4 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              activity.status === 'success' ? 'bg-emerald-100 text-emerald-600' :
              activity.status === 'warning' ? 'bg-amber-100 text-amber-600' :
              'bg-slate-100 text-slate-600'
            }`}>
              {activity.status === 'success' ? <CheckCircle size={16} /> :
               activity.status === 'warning' ? <AlertTriangle size={16} /> :
               <Activity size={16} />}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-900">{activity.action}</p>
                <span className="text-xs text-slate-500">
                  {new Date(activity.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm text-slate-600 mt-1">{activity.workflow}</p>
              <p className="text-xs text-slate-500 mt-1">{activity.leadInfo}</p>
            </div>
            
            <ArrowRight size={16} className="text-slate-400 flex-shrink-0" />
          </div>
        ))}
      </div>

      <div className="mt-6 text-center">
        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          View All Activity →
        </button>
      </div>
    </div>
  );
};

export default WorkflowAutomation;