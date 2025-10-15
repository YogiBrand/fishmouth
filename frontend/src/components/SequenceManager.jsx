import React, { useState, useEffect } from 'react';
import {
  Plus, Edit, Trash2, Play, Pause,
  Clock, Target, Copy,
  Zap, Search, Sparkles, BarChart3
} from 'lucide-react';
import { leadAPI, sequenceAPI } from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import SequenceBuilder from './SequenceBuilder';
import SequenceAnalyticsPanel from './SequenceAnalyticsPanel';

const uniqueNodeId = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 8)}`;

const buildAISequenceFlow = () => {
  const startNode = {
    id: 'start',
    type: 'start',
    position: { x: 160, y: 20 },
    data: {
      label: 'Campaign starts',
    },
  };

  const voiceId = uniqueNodeId('voice');
  const voiceNode = {
    id: voiceId,
    type: 'voice_call',
    position: { x: 160, y: 140 },
    data: {
      label: 'AI voice call',
      delay_days: 0,
      delay_hours: 0,
      send_time: '09:00',
      ai_instructions: 'Confirm homeowner details, reference imagery insights, and offer a 30-minute inspection slot.',
      conversation_goal: 'schedule_inspection',
      script:
        'Hi {{homeowner_name}}, this is {{agent_name}} with Fish Mouth Roofing. Our AI scan spotted areas we should inspect. We have an estimator nearby this week—does Tuesday or Wednesday work better? ',
      suggested_replies: ['Schedule Tuesday afternoon', 'Need to check calendar', 'Not interested right now'],
    },
  };

  const waitOneId = uniqueNodeId('wait');
  const waitOneNode = {
    id: waitOneId,
    type: 'wait',
    position: { x: 160, y: 270 },
    data: {
      label: 'Wait 1 day',
      delay_days: 1,
      delay_hours: 0,
      send_time: '',
    },
  };

  const emailId = uniqueNodeId('email');
  const emailNode = {
    id: emailId,
    type: 'email',
    position: { x: 160, y: 380 },
    data: {
      label: 'Email follow-up',
      delay_days: 0,
      delay_hours: 0,
      send_time: '08:30',
      use_ai_writer: true,
      ai_prompt:
        'Write a compelling email summarising the AI roof findings, attach imagery, and include a call-to-action to claim an inspection slot.',
      subject: 'Your roof insights and recommended next steps',
      template: 'ai_roof_followup',
      body:
        'Hi {{homeowner_name}},\n\nOur AI analysis flagged a few areas we should inspect together. I attached the annotated imagery for your review. We can dispatch an estimator this week—use the link below to pick a time.\n\nThanks,\n{{agent_name}}',
      suggested_replies: ['Book inspection', 'Request more details', 'No longer interested'],
    },
  };

  const waitTwoId = uniqueNodeId('wait');
  const waitTwoNode = {
    id: waitTwoId,
    type: 'wait',
    position: { x: 160, y: 500 },
    data: {
      label: 'Wait 6 hours',
      delay_days: 0,
      delay_hours: 6,
      send_time: '',
    },
  };

  const smsId = uniqueNodeId('sms');
  const smsNode = {
    id: smsId,
    type: 'sms',
    position: { x: 160, y: 600 },
    data: {
      label: 'SMS reminder',
      delay_days: 0,
      delay_hours: 0,
      send_time: '',
      use_ai_writer: true,
      ai_prompt:
        'Write a friendly SMS reminding the homeowner to confirm their inspection slot, reference weather risk to add urgency.',
      message:
        'Hi {{homeowner_name}}, quick reminder from {{agent_name}} at Fish Mouth Roofing—storms are trending again this week. Lock in your inspection here: {{booking_link}}',
      suggested_replies: ['Confirm appointment', 'Need different time', 'Stop messages'],
    },
  };

  const smartScanId = uniqueNodeId('smartscan');
  const smartScanNode = {
    id: smartScanId,
    type: 'smartscan',
    position: { x: 380, y: 320 },
    data: {
      label: 'Run SmartScan',
      scan_type: 'storm_damage',
      include_heatmap: true,
      notify_team: true,
      notes: 'Auto attach the latest aerial intel to upcoming outreach.',
    },
  };

  const reportId = uniqueNodeId('report');
  const reportNode = {
    id: reportId,
    type: 'report',
    position: { x: 160, y: 710 },
    data: {
      label: 'Send inspection brief',
      template: 'inspection_brief',
      delivery_channel: 'email',
      attach_imagery: true,
      include_financing: true,
      notes: 'Share inspection recap and financing options.',
      require_review: true,
      manual_send: false,
    },
  };

  const taskId = uniqueNodeId('task');
  const taskNode = {
    id: taskId,
    type: 'task',
    position: { x: 160, y: 820 },
    data: {
      label: 'Assign Estimator Follow-up',
      assignee: 'Estimator Team',
      due_days: 1,
      instructions: 'Confirm inspection date with homeowner and prep insurance packet.',
    },
  };

  const replacementId = uniqueNodeId('lead_replacement');
  const replacementNode = {
    id: replacementId,
    type: 'lead_replacement',
    position: { x: 160, y: 930 },
    data: {
      label: 'Audit lead quality',
      quality_threshold: 60,
      auto_credit: true,
      review_window_hours: 24,
      notes: 'Auto-replace if voicemail + email + SMS show no engagement.',
    },
  };

  const endId = uniqueNodeId('end');
  const endNode = {
    id: endId,
    type: 'end',
    position: { x: 160, y: 1040 },
    data: {
      label: 'Sequence complete',
      outcome: 'completed',
    },
  };

  return {
    nodes: [
      startNode,
      voiceNode,
      waitOneNode,
      emailNode,
      waitTwoNode,
      smsNode,
      smartScanNode,
      reportNode,
      taskNode,
      replacementNode,
      endNode,
    ],
    edges: [
      { id: `e-${startNode.id}-${voiceId}`, source: startNode.id, target: voiceId },
      { id: `e-${voiceId}-${waitOneId}`, source: voiceId, target: waitOneId },
      { id: `e-${waitOneId}-${emailId}`, source: waitOneId, target: emailId },
      { id: `e-${emailId}-${smartScanId}`, source: emailId, target: smartScanId },
      { id: `e-${smartScanId}-${waitTwoId}`, source: smartScanId, target: waitTwoId },
      { id: `e-${waitTwoId}-${smsId}`, source: waitTwoId, target: smsId },
      { id: `e-${smsId}-${reportId}`, source: smsId, target: reportId },
      { id: `e-${reportId}-${taskId}`, source: reportId, target: taskId },
      { id: `e-${taskId}-${replacementId}`, source: taskId, target: replacementId },
      { id: `e-${replacementId}-${endId}`, source: replacementId, target: endId },
    ],
  };
};

const DEFAULT_TEMPLATES = [
  {
    id: 'ai_multi_channel_launch',
    display_name: 'AI Multi-Channel Launch',
    description: 'Kick off SmartScans, AI calls, and compliance-safe SMS/email cadences for fresh storm neighborhoods.',
    category: 'Outbound Automation',
    node_count: 9,
    estimated_duration_days: '4',
    highlights: [
      'Leverages SmartScan intel before every outreach touch',
      'Auto-pauses when wallet thresholds are hit',
      'Routes manual reviews when AI drafts need human polish',
    ],
  },
  {
    id: 'storm_response_recovery',
    display_name: 'Storm Response & Recovery',
    description: 'Coordinate emergency SmartScans, estimator scheduling, and insurance-ready updates after storm alerts.',
    category: 'Storm Response',
    node_count: 8,
    estimated_duration_days: '3',
    highlights: [
      'Prioritises hot roofs within declared disaster polygons',
      'Bundles inspection briefs with FEMA + Insurance talking points',
      'Notifies crews for tarping or mitigation follow-ups',
    ],
  },
  {
    id: 'customer_success_nurture',
    display_name: 'Customer Success Nurture',
    description: 'Blend AI check-ins, internal tasks, and case-study follow-ups to drive referrals and upsells.',
    category: 'Retention',
    node_count: 7,
    estimated_duration_days: '14',
    highlights: [
      'Delivers before/after gallery pulled from business profile',
      'Schedules referral calls for top homeowners',
      'Escalates warranty or punch-list issues instantly',
    ],
  },
];

const ANALYTICS_PAGE_SIZE = 50;
const DEFAULT_ANALYTICS_FILTERS = {
  timeframe: '30d',
  status: '',
  channel: '',
  step: '',
  search: '',
};

const SequenceManager = ({ isDark = false }) => {
  const [sequences, setSequences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedSequence, setSelectedSequence] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [view, setView] = useState('list'); // 'list', 'templates', 'performance'
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [analyticsSequence, setAnalyticsSequence] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsFilters, setAnalyticsFilters] = useState(DEFAULT_ANALYTICS_FILTERS);
  const [analyticsPagination, setAnalyticsPagination] = useState({
    limit: ANALYTICS_PAGE_SIZE,
    offset: 0,
    total: 0,
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(null);

  useEffect(() => {
    loadSequences();
    loadTemplates();
  }, []);

  const loadSequences = async () => {
    setLoading(true);
    try {
      const data = await leadAPI.getSequences();
      setSequences(data);
    } catch (error) {
      console.error('Error loading sequences:', error);
      toast.error('Failed to load sequences');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const data = await leadAPI.getSequenceTemplates();
      if (Array.isArray(data) && data.length > 0) {
        setTemplates(data);
      } else {
        setTemplates(DEFAULT_TEMPLATES);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      setTemplates(DEFAULT_TEMPLATES);
    }
  };

  const handleCreateSequence = async (template = null) => {
    if (template) {
      try {
        setLoading(true);
        const created = await leadAPI.createSequence({
          name: template.display_name || template.name,
          description: template.description,
          template_name: template.name,
        });
        setSelectedSequence({ ...created, __isNew: true });
        setShowBuilder(true);
      } catch (error) {
        console.error('Error creating sequence from template:', error);
        toast.error('Unable to load template. Please try again.');
      } finally {
        setLoading(false);
      }
    } else {
      setSelectedSequence(null);
      setShowBuilder(true);
    }
  };

  const handleCreateAISequence = async () => {
    try {
      setLoading(true);
      const flowData = buildAISequenceFlow();
      const created = await leadAPI.createSequence({
        name: 'AI Nurture Playbook',
        description: 'Voice, email, and SMS touchpoints crafted by AI best practices.',
        flow_data: flowData,
      });
      setSelectedSequence({ ...created, flow_data: flowData, __isNew: true });
      setShowBuilder(true);
      toast.success('AI-crafted sequence ready to review');
    } catch (error) {
      console.error('Error generating AI sequence:', error);
      toast.error('Unable to generate AI sequence right now');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSequence = (sequence) => {
    setSelectedSequence(sequence);
    setShowBuilder(true);
  };

  const handleDeleteSequence = async (sequenceId) => {
    if (!window.confirm('Are you sure you want to delete this sequence?')) {
      return;
    }

    try {
      await leadAPI.deleteSequence(sequenceId);
      toast.success('Sequence deleted successfully');
      loadSequences();
    } catch (error) {
      console.error('Error deleting sequence:', error);
      toast.error('Failed to delete sequence');
    }
  };

  const handleToggleActive = async (sequence) => {
    try {
      await leadAPI.updateSequence(sequence.id, {
        is_active: !sequence.is_active
      });
      toast.success(`Sequence ${!sequence.is_active ? 'activated' : 'deactivated'}`);
      loadSequences();
    } catch (error) {
      console.error('Error updating sequence:', error);
      toast.error('Failed to update sequence');
    }
  };

  const handleDuplicateSequence = async (sequence) => {
    try {
      const newSequence = {
        name: `${sequence.name} (Copy)`,
        description: sequence.description,
        flow_data: sequence.flow_data
      };
      
      await leadAPI.createSequence(newSequence);
      toast.success('Sequence duplicated successfully');
      loadSequences();
    } catch (error) {
      console.error('Error duplicating sequence:', error);
      toast.error('Failed to duplicate sequence');
    }
  };

  const handleProcessSequences = async () => {
    try {
      setIsProcessing(true);
      await sequenceAPI.processPending();
      toast.success('Queued sequence automation run');
    } catch (error) {
      console.error('Error processing sequences:', error);
      toast.error('Failed to trigger automation run');
    } finally {
      setIsProcessing(false);
    }
  };

  const fetchSequenceAnalytics = async (
    sequenceId,
    { filters: overrideFilters, offset: overrideOffset } = {}
  ) => {
    if (!sequenceId) return;
    const mergedFilters = overrideFilters
      ? { ...DEFAULT_ANALYTICS_FILTERS, ...overrideFilters }
      : { ...analyticsFilters };
    const resolvedOffset =
      typeof overrideOffset === 'number'
        ? overrideOffset
        : overrideFilters
          ? 0
          : analyticsPagination.offset;

    setAnalyticsLoading(true);
    try {
      const response = await sequenceAPI.getAnalytics(sequenceId, {
        timeframe: mergedFilters.timeframe,
        status: mergedFilters.status,
        channel: mergedFilters.channel,
        step: mergedFilters.step,
        search: mergedFilters.search,
        limit: ANALYTICS_PAGE_SIZE,
        offset: resolvedOffset,
      });
      setAnalyticsData(response);
      setAnalyticsFilters(mergedFilters);
      setAnalyticsPagination({
        limit: response.engagements?.limit ?? ANALYTICS_PAGE_SIZE,
        offset: response.engagements?.offset ?? resolvedOffset,
        total: response.engagements?.total ?? 0,
      });
      setAnalyticsError(null);
    } catch (error) {
      console.error('Error loading sequence analytics:', error);
      setAnalyticsError('Unable to load analytics right now.');
      toast.error('Failed to load analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleViewAnalytics = (sequence) => {
    if (!sequence) return;
    setAnalyticsSequence(sequence);
    const baseFilters = { ...DEFAULT_ANALYTICS_FILTERS };
    setAnalyticsFilters(baseFilters);
    setAnalyticsPagination({
      limit: ANALYTICS_PAGE_SIZE,
      offset: 0,
      total: 0,
    });
    fetchSequenceAnalytics(sequence.id, { filters: baseFilters, offset: 0 });
  };

  const handleAnalyticsRefresh = () => {
    if (!analyticsSequence) return;
    fetchSequenceAnalytics(analyticsSequence.id);
  };

  const handleAnalyticsFilterChange = (changes = {}) => {
    if (!analyticsSequence) return;
    const updatedFilters = { ...analyticsFilters, ...changes };
    fetchSequenceAnalytics(analyticsSequence.id, { filters: updatedFilters, offset: 0 });
  };

  const handleAnalyticsReset = () => {
    if (!analyticsSequence) return;
    fetchSequenceAnalytics(analyticsSequence.id, { filters: DEFAULT_ANALYTICS_FILTERS, offset: 0 });
  };

  const handleAnalyticsPaginate = (nextOffset) => {
    if (!analyticsSequence) return;
    fetchSequenceAnalytics(analyticsSequence.id, { filters: analyticsFilters, offset: nextOffset });
  };

  const handleCloseAnalytics = () => {
    setAnalyticsSequence(null);
    setAnalyticsData(null);
    setAnalyticsError(null);
  };

  const closeBuilder = async ({ deleteDraft = false, reload = false } = {}) => {
    if (deleteDraft && selectedSequence?.__isNew && selectedSequence?.id) {
      try {
        await leadAPI.deleteSequence(selectedSequence.id);
      } catch (error) {
        console.error('Error deleting draft sequence:', error);
      }
    }
    setShowBuilder(false);
    setSelectedSequence(null);
    if (reload) {
      await loadSequences();
    }
  };

  const filteredSequences = sequences.filter(sequence => {
    if (searchTerm && !sequence.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (statusFilter === 'active' && !sequence.is_active) return false;
    if (statusFilter === 'inactive' && sequence.is_active) return false;
    return true;
  });

  const getStatusColor = (isActive) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 dark:bg-slate-800/60 text-gray-800';
  };

  const getPerformanceColor = (rate) => {
    if (rate >= 20) return 'text-green-600 dark:text-emerald-300';
    if (rate >= 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  const SequenceCard = ({ sequence }) => (
    <div className="bg-white dark:bg-slate-900/70 rounded-xl border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-slate-100 p-6 hover:shadow-lg dark:hover:shadow-slate-900/40 transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">{sequence.name}</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(sequence.is_active)}`}>
              {sequence.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="text-gray-600 dark:text-slate-400 text-sm mb-3">
            {sequence.description || 'No description provided'}
          </p>
          <div className="text-xs text-gray-500 dark:text-slate-400">
            Created {formatDistanceToNow(new Date(sequence.created_at), { addSuffix: true })}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleToggleActive(sequence)}
            className={`p-2 rounded-lg transition-colors ${
              sequence.is_active 
                ? 'text-orange-600 dark:text-amber-300 hover:bg-orange-50 dark:bg-amber-500/20' 
                : 'text-green-600 dark:text-emerald-300 hover:bg-green-50 dark:bg-emerald-500/20'
            }`}
            title={sequence.is_active ? 'Deactivate' : 'Activate'}
          >
            {sequence.is_active ? <Pause size={16} /> : <Play size={16} />}
          </button>
          
          <button
            onClick={() => handleEditSequence(sequence)}
            className="p-2 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:bg-blue-500/20 rounded-lg transition-colors"
            title="Edit Sequence"
          >
            <Edit size={16} />
          </button>
          
          <button
            onClick={() => handleViewAnalytics(sequence)}
            className="p-2 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 rounded-lg transition-colors"
            title="View Analytics"
          >
            <BarChart3 size={16} />
          </button>
          
          <button
            onClick={() => handleDuplicateSequence(sequence)}
            className="p-2 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors"
            title="Duplicate Sequence"
          >
            <Copy size={16} />
          </button>
          
          <button
            onClick={() => handleDeleteSequence(sequence.id)}
            className="p-2 text-red-600 hover:bg-red-50 dark:bg-rose-500/20 rounded-lg transition-colors"
            title="Delete Sequence"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <div className="text-xl font-bold text-gray-900 dark:text-slate-100">{sequence.total_enrolled}</div>
          <div className="text-xs text-gray-600 dark:text-slate-400">Enrolled</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-blue-600 dark:text-blue-300">{sequence.total_completed}</div>
          <div className="text-xs text-gray-600 dark:text-slate-400">Completed</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-green-600 dark:text-emerald-300">{sequence.total_converted}</div>
          <div className="text-xs text-gray-600 dark:text-slate-400">Converted</div>
        </div>
        <div className="text-center">
          <div className={`text-xl font-bold ${getPerformanceColor(sequence.conversion_rate)}`}>
            {sequence.conversion_rate.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-600 dark:text-slate-400">Conversion</div>
        </div>
      </div>
      
      {sequence.flow_data && (
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-slate-400">
          <div className="flex items-center gap-1">
            <Target size={14} />
            <span>{sequence.flow_data.nodes?.length || 0} steps</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={14} />
            <span>Est. 3-5 days</span>
          </div>
        </div>
      )}
    </div>
  );

  const TemplateCard = ({ template }) => (
    <div className="bg-white dark:bg-slate-900/70 rounded-xl border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-slate-100 p-6 hover:shadow-lg dark:hover:shadow-slate-900/40 transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">{template.display_name}</h3>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:text-blue-300 rounded-full text-xs font-semibold">
              {template.category}
            </span>
          </div>
          <p className="text-gray-600 dark:text-slate-400 text-sm mb-3">{template.description}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-xl font-bold text-gray-900 dark:text-slate-100">{template.node_count}</div>
          <div className="text-xs text-gray-600 dark:text-slate-400">Steps</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-blue-600 dark:text-blue-300">{template.estimated_duration_days}</div>
          <div className="text-xs text-gray-600 dark:text-slate-400">Days</div>
        </div>
      </div>

      {Array.isArray(template.highlights) && template.highlights.length > 0 && (
        <ul className="mb-4 space-y-2 text-sm text-left text-gray-600 dark:text-slate-400">
          {template.highlights.map((item, index) => (
            <li key={`${template.id}-highlight-${index}`} className="flex items-start gap-2">
              <Sparkles className="mt-0.5 w-4 h-4 text-blue-500 dark:text-blue-300" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => handleCreateSequence(template)}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={16} />
        Use Template
      </button>
    </div>
  );

  if (showBuilder) {
    return (
      <SequenceBuilder
        sequenceId={selectedSequence?.id}
        initialSequence={selectedSequence}
        onSave={async () => {
          await closeBuilder({ reload: true });
        }}
        onClose={async () => {
          await closeBuilder({ deleteDraft: true, reload: true });
        }}
        isDark={isDark}
      />
    );
  }

  return (
    <div className="space-y-6 text-gray-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Sequence Management</h2>
          <p className="text-gray-600 dark:text-slate-400">Create and manage automated lead nurturing sequences</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('list')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              view === 'list' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 dark:bg-slate-800/60 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
            }`}
          >
            My Sequences
          </button>
          <button
            onClick={() => setView('templates')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              view === 'templates' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 dark:bg-slate-800/60 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
            }`}
          >
            Templates
          </button>
          <button
            onClick={handleProcessSequences}
            disabled={isProcessing}
            className="px-4 py-2 rounded-lg border border-blue-200 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:bg-blue-500/20 transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            <Zap size={16} />
            {isProcessing ? 'Processing…' : 'Run Automations'}
          </button>
          <button
            onClick={handleCreateAISequence}
            className="px-4 py-2 rounded-lg border border-purple-200 text-purple-600 dark:text-purple-300 hover:bg-purple-50 dark:bg-purple-500/20 transition-colors flex items-center gap-2"
          >
            <Sparkles size={16} />
            AI Generate
          </button>
          <button
            onClick={() => handleCreateSequence()}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-2 px-4 rounded-lg transition-all flex items-center gap-2"
          >
            <Plus size={16} />
            Create Sequence
          </button>
        </div>
      </div>

      {/* Filters */}
      {view === 'list' && (
        <div className="bg-white dark:bg-slate-900/70 rounded-xl border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-slate-100 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search sequences..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900/70 rounded-xl border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-slate-100 p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {view === 'list' ? (
            filteredSequences.length === 0 ? (
              <div className="col-span-full bg-white dark:bg-slate-900/70 rounded-xl border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-slate-100 p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <Zap size={48} className="mx-auto" />
                </div>
                <h3 className="text-lg font-semibold text-gray-600 dark:text-slate-400 mb-2">No sequences found</h3>
                <p className="text-gray-500 dark:text-slate-400 mb-4">
                  {searchTerm ? 'Try adjusting your search terms' : 'Create your first automated sequence to start nurturing leads'}
                </p>
                <button
                  onClick={() => handleCreateSequence()}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors inline-flex items-center gap-2"
                >
                  <Plus size={16} />
                  Create First Sequence
                </button>
              </div>
            ) : (
              filteredSequences.map((sequence) => (
                <SequenceCard key={sequence.id} sequence={sequence} />
              ))
            )
          ) : (
            templates.map((template) => (
              <TemplateCard key={template.name} template={template} />
            ))
          )}
        </div>
      )}

      {/* Quick Stats */}
      {view === 'list' && sequences.length > 0 && (
        <div className="bg-white dark:bg-slate-900/70 rounded-xl border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-slate-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Quick Stats</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-300">
                {sequences.filter(s => s.is_active).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Active Sequences</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-emerald-300">
                {sequences.reduce((sum, s) => sum + s.total_enrolled, 0)}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Total Enrolled</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-300">
                {sequences.reduce((sum, s) => sum + s.total_converted, 0)}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Total Converted</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-amber-300">
                {sequences.length > 0 
                  ? (sequences.reduce((sum, s) => sum + s.conversion_rate, 0) / sequences.length).toFixed(1)
                  : '0.0'
                }%
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Avg Conversion</div>
            </div>
          </div>
        </div>
      )}

      {analyticsSequence && (
        <SequenceAnalyticsPanel
          sequence={analyticsSequence}
          analytics={analyticsData}
          filters={analyticsFilters}
          loading={analyticsLoading}
          error={analyticsError}
          onClose={handleCloseAnalytics}
          onRefresh={handleAnalyticsRefresh}
          onFilterChange={handleAnalyticsFilterChange}
          onResetFilters={handleAnalyticsReset}
          onPaginate={handleAnalyticsPaginate}
        />
      )}
    </div>
  );
};

export default SequenceManager;
