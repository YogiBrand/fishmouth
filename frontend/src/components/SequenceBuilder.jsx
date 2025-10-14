import React, { useCallback, useEffect, useState } from 'react';
import {
  Play,
  Phone,
  Mail,
  MessageSquare,
  Clock,
  GitBranch,
  StopCircle,
  ClipboardCheck,
  RefreshCw,
  MapPin,
  FileText,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  X,
  PlusCircle,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { leadAPI } from '../services/api';

const STEP_LIBRARY = [
  {
    type: 'voice_call',
    label: 'Voice Call',
    description: 'AI places a call with the configured script',
    icon: Phone,
  },
  {
    type: 'email',
    label: 'Email',
    description: 'Send an automated email follow-up',
    icon: Mail,
  },
  {
    type: 'sms',
    label: 'SMS',
    description: 'Send a personalised text message',
    icon: MessageSquare,
  },
  {
    type: 'wait',
    label: 'Wait',
    description: 'Pause the sequence before the next step',
    icon: Clock,
  },
  {
    type: 'condition',
    label: 'Condition',
    description: 'Branch based on engagement (responded, opened, booked, etc.)',
    icon: GitBranch,
  },
  {
    type: 'smartscan',
    label: 'SmartScan Request',
    description: 'Trigger a SmartScan and attach roof intelligence when results land.',
    icon: MapPin,
  },
  {
    type: 'task',
    label: 'Internal Task',
    description: 'Assign a manual follow-up, inspection, or paperwork task to your team.',
    icon: ClipboardCheck,
  },
  {
    type: 'lead_replacement',
    label: 'Lead Replacement Audit',
    description: 'Review engagement data and queue AI lead replacements automatically.',
    icon: RefreshCw,
  },
  {
    type: 'report',
    label: 'Send Report',
    description: 'Generate a branded inspection or storm report for the homeowner.',
    icon: FileText,
  },
];

const STEP_ICONS = {
  start: Play,
  voice_call: Phone,
  email: Mail,
  sms: MessageSquare,
  wait: Clock,
  condition: GitBranch,
  smartscan: MapPin,
  task: ClipboardCheck,
  lead_replacement: RefreshCw,
  report: FileText,
  end: StopCircle,
};

const createId = (prefix) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 6)}`;

const createStartStep = () => ({
  id: 'start',
  type: 'start',
  data: {
    label: 'Start',
  },
});

const createEndStep = (label = 'Sequence Complete') => ({
  id: createId('end'),
  type: 'end',
  data: {
    label,
    outcome: 'completed',
  },
});

const createStep = (type) => {
  const id = createId(type);
  switch (type) {
    case 'voice_call':
      return {
        id,
        type,
        data: {
          label: 'Voice Call',
          delay_days: 0,
          delay_hours: 0,
          send_time: '',
          ai_instructions: 'Introduce yourself professionally and discuss the roof inspection.',
          script: 'Hi {{homeowner_name}}, this is {{agent_name}} with Fish Mouth Roofing. We noticed potential issues with your roof and would love to schedule a free inspection.',
          conversation_goal: 'schedule_inspection',
          suggested_replies: [],
          require_review: false,
          manual_send: false,
        },
      };
    case 'email':
      return {
        id,
        type,
        data: {
          label: 'Email',
          delay_days: 0,
          delay_hours: 0,
          send_time: '',
          use_ai_writer: true,
          ai_prompt: 'Write a friendly but persuasive email highlighting the roof issues we detected and inviting the homeowner to schedule an inspection.',
          subject: 'Your roof inspection results',
          template: 'default_followup',
          body: 'Hi {{homeowner_name}},\n\nThanks for speaking with us! Attached are the insights from our AI roof analysis. Let us know if you want to schedule a full inspection.\n\nBest,\nFish Mouth Roofing',
          suggested_replies: [],
          require_review: false,
          manual_send: false,
        },
      };
    case 'sms':
      return {
        id,
        type,
        data: {
          label: 'SMS',
          delay_days: 0,
          delay_hours: 0,
          send_time: '',
          use_ai_writer: true,
          ai_prompt: 'Write a concise SMS inviting the homeowner to claim their free roof inspection, emphasising urgency if issues were found.',
          message: 'Hi {{homeowner_name}}, this is {{agent_name}} from Fish Mouth Roofing. We spotted a few issues with your roof and can schedule a free inspection. Interested?',
          suggested_replies: [],
          require_review: false,
          manual_send: false,
        },
      };
    case 'wait':
      return {
        id,
        type,
        data: {
          label: 'Wait',
          delay_days: 0,
          delay_hours: 24,
          send_time: '',
        },
      };
    case 'smartscan':
      return {
        id,
        type,
        data: {
          label: 'SmartScan Request',
          scan_type: 'storm_damage',
          include_heatmap: true,
          notify_team: true,
          notes: '',
          require_review: false,
          manual_send: false,
        },
      };
    case 'task':
      return {
        id,
        type,
        data: {
          label: 'Internal Task',
          assignee: 'Estimator Team',
          due_days: 2,
          instructions: 'Confirm homeowner availability and prep inspection kit.',
          require_review: false,
          manual_send: false,
        },
      };
    case 'lead_replacement':
      return {
        id,
        type,
        data: {
          label: 'Lead Quality Audit',
          quality_threshold: 65,
          auto_credit: true,
          review_window_hours: 24,
          notes: 'If engagement is low, trigger replacement credits automatically.',
          require_review: false,
          manual_send: false,
        },
      };
    case 'report':
      return {
        id,
        type,
        data: {
          label: 'Send Report',
          template: 'inspection_brief',
          attach_imagery: true,
          include_financing: true,
          delivery_channel: 'email',
          notes: 'Deliver the latest SmartScan insights with insurance-ready language.',
          require_review: true,
          manual_send: false,
        },
      };
    case 'condition':
      return {
        id,
        type,
        data: {
          label: 'Condition',
          condition: 'lead_responded',
          trueTargetId: '',
          falseTargetId: '',
        },
      };
    case 'end':
    default:
      return createEndStep();
  }
};

const parseFlowData = (flowData) => {
  if (!flowData || !Array.isArray(flowData.nodes)) {
    return [createStartStep(), createEndStep()];
  }

  const nodes = [...flowData.nodes];
  const edges = flowData.edges || [];
  const edgesBySource = new Map();

  edges.forEach((edge) => {
    if (!edgesBySource.has(edge.source)) {
      edgesBySource.set(edge.source, []);
    }
    edgesBySource.get(edge.source).push(edge);
  });

  nodes.sort((a, b) => {
    if (a.type === 'start') return -1;
    if (b.type === 'start') return 1;
    if (a.type === 'end') return 1;
    if (b.type === 'end') return -1;
    const ya = a.position?.y ?? 0;
    const yb = b.position?.y ?? 0;
    return ya - yb;
  });

  const parsed = nodes.map((node) => {
    const data = {
      label: node.data?.label || node.type.replace('_', ' ').toUpperCase(),
      ...node.data,
    };

    if (data.delay_days === undefined) {
      data.delay_days = data.wait_days ?? 0;
    }
    if (data.delay_hours === undefined) {
      data.delay_hours = data.wait_hours ?? 0;
    }
    if (data.send_time === undefined) {
      data.send_time = '';
    }
    if (data.suggested_replies && !Array.isArray(data.suggested_replies)) {
      if (typeof data.suggested_replies === 'string') {
        data.suggested_replies = data.suggested_replies
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean);
      } else {
        data.suggested_replies = [];
      }
    }
    if (!data.suggested_replies) {
      data.suggested_replies = [];
    }

    if (data.require_review === undefined) {
      data.require_review = false;
    }
    if (data.manual_send === undefined) {
      data.manual_send = false;
    }

    if (node.type === 'voice_call' && !data.conversation_goal) {
      data.conversation_goal = 'schedule_inspection';
    }

    if (node.type === 'email' || node.type === 'sms') {
      if (data.use_ai_writer === undefined) {
        data.use_ai_writer = true;
      }
      if (!data.ai_prompt) {
        data.ai_prompt = node.type === 'email'
          ? 'Write a friendly but persuasive email highlighting the roof issues we detected and inviting the homeowner to schedule an inspection.'
          : 'Write a concise SMS inviting the homeowner to claim their free roof inspection, emphasising urgency if issues were found.';
      }
      if (!data.body) {
        data.body = '';
      }
    }

    if (node.type === 'condition') {
      const sourceEdges = edgesBySource.get(node.id) || [];
      const trueEdge = sourceEdges.find((e) => e.data?.condition === 'true');
      const falseEdge = sourceEdges.find((e) => e.data?.condition === 'false');
      data.trueTargetId = trueEdge?.target || '';
      data.falseTargetId = falseEdge?.target || '';
    }

    delete data.wait_hours;
    delete data.wait_days;

    return {
      id: node.id,
      type: node.type,
      data,
    };
  });

  const hasStart = parsed.some((step) => step.type === 'start');
  const hasEnd = parsed.some((step) => step.type === 'end');

  const steps = hasStart ? parsed : [createStartStep(), ...parsed];
  if (!hasEnd) {
    steps.push(createEndStep());
  }

  return steps;
};

const buildFlowData = (steps) => {
  const normalizeStepData = (step) => {
    const data = { ...step.data };
    data.delay_days = Math.max(0, Number(data.delay_days || 0));
    data.delay_hours = Math.max(0, Number(data.delay_hours || 0));
    data.send_time = data.send_time || '';

    if (step.type === 'email') {
      data.use_ai_writer = data.use_ai_writer !== false;
      data.ai_prompt = data.ai_prompt || 'Write a friendly but persuasive email highlighting the roof issues we detected and inviting the homeowner to schedule an inspection.';
      if (!data.body) {
        data.body = '';
      }
    }

    if (step.type === 'sms') {
      data.use_ai_writer = data.use_ai_writer !== false;
      data.ai_prompt = data.ai_prompt || 'Write a concise SMS inviting the homeowner to claim their free roof inspection, emphasising urgency if issues were found.';
      if (!data.message) {
        data.message = '';
      }
    }

    data.require_review = Boolean(data.require_review);
    data.manual_send = Boolean(data.manual_send);

    if (!Array.isArray(data.suggested_replies)) {
      if (typeof data.suggested_replies === 'string') {
        data.suggested_replies = data.suggested_replies
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean);
      } else {
        data.suggested_replies = [];
      }
    }

    return data;
  };

  const spacingY = 180;
  const nodes = steps.map((step, index) => ({
    id: step.id,
    type: step.type,
    position: { x: step.type === 'condition' ? 380 : 220, y: index * spacingY },
    data: normalizeStepData(step),
  }));

  const edges = [];

  steps.forEach((step, index) => {
    if (step.type === 'end') {
      return;
    }

    if (step.type === 'condition') {
      const { trueTargetId, falseTargetId } = step.data;
      if (trueTargetId) {
        edges.push({
          id: `e-${step.id}-${trueTargetId}-true`,
          source: step.id,
          target: trueTargetId,
          data: { condition: 'true' },
          animated: true,
        });
      }
      if (falseTargetId) {
        edges.push({
          id: `e-${step.id}-${falseTargetId}-false`,
          source: step.id,
          target: falseTargetId,
          data: { condition: 'false' },
          animated: true,
        });
      }
      if (!trueTargetId && steps[index + 1]) {
        edges.push({
          id: `e-${step.id}-${steps[index + 1].id}`,
          source: step.id,
          target: steps[index + 1].id,
        });
      }
      return;
    }

    const nextStep = steps.slice(index + 1).find((candidate) => candidate.type !== 'start');
    if (nextStep) {
      edges.push({
        id: `e-${step.id}-${nextStep.id}`,
        source: step.id,
        target: nextStep.id,
      });
    }
  });

  return { nodes, edges };
};

const StepCard = ({
  step,
  index,
  isFirst,
  isLast,
  steps,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  onTriggerManualReview,
  isDark,
}) => {
  const Icon = STEP_ICONS[step.type] || Info;
  const connectorColor = step.type === 'end' ? 'bg-rose-500' : step.type === 'start' ? 'bg-emerald-500' : 'bg-blue-500';

  const renderFields = () => {
    switch (step.type) {
      case 'voice_call':
        return (
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Delay (days)</label>
                <input
                  type="number"
                  min="0"
                  value={step.data.delay_days ?? 0}
                  onChange={(e) => onChange({ delay_days: Math.max(0, Number(e.target.value) || 0) })}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Delay (hours)</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={step.data.delay_hours ?? 0}
                  onChange={(e) => onChange({ delay_hours: Math.max(0, Number(e.target.value) || 0) })}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Send at (local time)</label>
                <input
                  type="time"
                  value={step.data.send_time || ''}
                  onChange={(e) => onChange({ send_time: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">AI Instructions</label>
                <textarea
                  rows={3}
                  value={step.data.ai_instructions || ''}
                  onChange={(e) => onChange({ ai_instructions: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Voice Script</label>
                <textarea
                  rows={4}
                  value={step.data.script || ''}
                  onChange={(e) => onChange({ script: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                  Use merge tags like {'{{homeowner_name}}'} and {'{{agent_name}}'}.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Conversation Goal</label>
                <select
                  value={step.data.conversation_goal || 'schedule_inspection'}
                  onChange={(e) => onChange({ conversation_goal: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="schedule_inspection">Schedule Inspection</option>
                  <option value="qualify_lead">Qualify Lead</option>
                  <option value="offer_followup">Handle Objection & Offer Follow-up</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Suggested AI Replies</label>
                <textarea
                  rows={3}
                  value={(step.data.suggested_replies || []).join('\n')}
                  onChange={(e) =>
                    onChange({
                      suggested_replies: e.target.value
                        .split('\n')
                        .map((line) => line.trim())
                        .filter(Boolean),
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder={`E.g.\n"Schedule inspection for tomorrow at 2pm"\n"Offer to email quote"`}
                />
              </div>
          </div>
        );
      case 'email':
        return (
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Delay (days)</label>
                <input
                  type="number"
                  min="0"
                  value={step.data.delay_days ?? 0}
                  onChange={(e) => onChange({ delay_days: Math.max(0, Number(e.target.value) || 0) })}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Delay (hours)</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={step.data.delay_hours ?? 0}
                  onChange={(e) => onChange({ delay_hours: Math.max(0, Number(e.target.value) || 0) })}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Send at (local time)</label>
                <input
                  type="time"
                  value={step.data.send_time || ''}
                  onChange={(e) => onChange({ send_time: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id={`use-ai-writer-${step.id}`}
                type="checkbox"
                checked={step.data.use_ai_writer !== false}
                onChange={(e) => onChange({ use_ai_writer: e.target.checked })}
                className="rounded border-gray-300 dark:border-slate-700 text-blue-600 dark:text-blue-300 focus:ring-blue-500"
              />
              <label htmlFor={`use-ai-writer-${step.id}`} className="text-sm text-gray-700 dark:text-slate-300">
                Use AI to generate this email
              </label>
            </div>

            {step.data.use_ai_writer !== false ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">AI Prompt</label>
                <textarea
                  rows={4}
                  value={step.data.ai_prompt || ''}
                  onChange={(e) => onChange({ ai_prompt: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Describe the tone, CTA, and key talking points for the AI email writer."
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Email Body</label>
                <textarea
                  rows={6}
                  value={step.data.body || ''}
                  onChange={(e) => onChange({ body: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Subject Line</label>
              <input
                type="text"
                value={step.data.subject || ''}
                onChange={(e) => onChange({ subject: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Template</label>
              <select
                value={step.data.template || 'default_followup'}
                onChange={(e) => onChange({ template: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="default_followup">Default Follow-up</option>
                <option value="urgent_roof_email">Urgent Roof Issue</option>
                <option value="educational_content">Educational Content</option>
                <option value="welcome_analysis">Welcome & Analysis</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Suggested AI Replies</label>
              <textarea
                rows={3}
                value={(step.data.suggested_replies || []).join('\n')}
                onChange={(e) =>
                  onChange({
                    suggested_replies: e.target.value
                      .split('\n')
                      .map((line) => line.trim())
                      .filter(Boolean),
                  })
                }
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder={`Enter one reply per line for the AI agent to choose (optional)`}
              />
            </div>
          </div>
        );
      case 'sms':
        return (
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Delay (days)</label>
                <input
                  type="number"
                  min="0"
                  value={step.data.delay_days ?? 0}
                  onChange={(e) => onChange({ delay_days: Math.max(0, Number(e.target.value) || 0) })}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Delay (hours)</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={step.data.delay_hours ?? 0}
                  onChange={(e) => onChange({ delay_hours: Math.max(0, Number(e.target.value) || 0) })}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Send at (local time)</label>
                <input
                  type="time"
                  value={step.data.send_time || ''}
                  onChange={(e) => onChange({ send_time: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id={`use-ai-writer-sms-${step.id}`}
                type="checkbox"
                checked={step.data.use_ai_writer !== false}
                onChange={(e) => onChange({ use_ai_writer: e.target.checked })}
                className="rounded border-gray-300 dark:border-slate-700 text-blue-600 dark:text-blue-300 focus:ring-blue-500"
              />
              <label htmlFor={`use-ai-writer-sms-${step.id}`} className="text-sm text-gray-700 dark:text-slate-300">
                Use AI to generate this SMS
              </label>
            </div>

            {step.data.use_ai_writer !== false ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">AI Prompt</label>
                <textarea
                  rows={3}
                  value={step.data.ai_prompt || ''}
                  onChange={(e) => onChange({ ai_prompt: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Describe what the AI should mention in the SMS."
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Message</label>
                <textarea
                  rows={3}
                  value={step.data.message || ''}
                  onChange={(e) => onChange({ message: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
              Use merge tags like {'{{homeowner_name}}'} and {'{{address}}'} for personalisation.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Suggested AI Replies</label>
              <textarea
                rows={3}
                value={(step.data.suggested_replies || []).join('\n')}
                onChange={(e) =>
                  onChange({
                    suggested_replies: e.target.value
                      .split('\n')
                      .map((line) => line.trim())
                      .filter(Boolean),
                  })
                }
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder={`Provide quick-response options for the AI agent (optional)`}
              />
            </div>
          </div>
        );
      case 'wait':
        return (
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Delay (days)</label>
              <input
                type="number"
                min="0"
                value={step.data.delay_days ?? 0}
                onChange={(e) => onChange({ delay_days: Math.max(0, Number(e.target.value) || 0) })}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Delay (hours)</label>
              <input
                type="number"
                min="0"
                value={step.data.delay_hours ?? 24}
                onChange={(e) => onChange({ delay_hours: Math.max(0, Number(e.target.value) || 0) })}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Resume at (local time)</label>
              <input
                type="time"
                value={step.data.send_time || ''}
                onChange={(e) => onChange({ send_time: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        );
      case 'condition':
        return (
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Condition Type</label>
              <select
                value={step.data.condition || 'lead_responded'}
                onChange={(e) => onChange({ condition: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="lead_responded">Lead Responded</option>
                <option value="email_opened">Email Opened</option>
                <option value="call_answered">Call Answered</option>
                <option value="appointment_scheduled">Appointment Scheduled</option>
              </select>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">If TRUE go to</label>
                <select
                  value={step.data.trueTargetId || ''}
                  onChange={(e) => onChange({ trueTargetId: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Next step</option>
                  {steps
                    .slice(index + 1)
                    .filter((candidate) => candidate.id !== step.id && candidate.type !== 'start')
                    .map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.data.label}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">If FALSE go to</label>
                <select
                  value={step.data.falseTargetId || ''}
                  onChange={(e) => onChange({ falseTargetId: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Next step</option>
                  {steps
                    .slice(index + 1)
                    .filter((candidate) => candidate.id !== step.id && candidate.type !== 'start')
                    .map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.data.label}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>
        );
      case 'smartscan':
        return (
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Scan type</label>
                <select
                  value={step.data.scan_type || 'storm_damage'}
                  onChange={(event) => onChange({ scan_type: event.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="storm_damage">Storm damage</option>
                  <option value="maintenance">Maintenance check</option>
                  <option value="hail_inspection">Hail inspection</option>
                  <option value="solar_feasibility">Solar feasibility</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id={`scan-heatmap-${step.id}`}
                  type="checkbox"
                  checked={Boolean(step.data.include_heatmap)}
                  onChange={(event) => onChange({ include_heatmap: event.target.checked })}
                  className="rounded border-gray-300 dark:border-slate-700 text-blue-600 dark:text-blue-300 focus:ring-blue-500"
                />
                <label htmlFor={`scan-heatmap-${step.id}`} className="text-sm text-gray-700 dark:text-slate-300">
                  Include AI heatmap overlay
                </label>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                id={`scan-notify-${step.id}`}
                type="checkbox"
                checked={Boolean(step.data.notify_team)}
                onChange={(event) => onChange({ notify_team: event.target.checked })}
                className="rounded border-gray-300 dark:border-slate-700 text-blue-600 dark:text-blue-300 focus:ring-blue-500"
              />
              <label htmlFor={`scan-notify-${step.id}`} className="text-sm text-gray-700 dark:text-slate-300">
                Notify estimator team when imagery lands
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Instructions / notes</label>
              <textarea
                rows={3}
                value={step.data.notes || ''}
                onChange={(event) => onChange({ notes: event.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>
          </div>
        );
      case 'task':
        return (
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Assignee</label>
                <input
                  type="text"
                  value={step.data.assignee || ''}
                  onChange={(event) => onChange({ assignee: event.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Estimator Team, Project Manager, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Due in (days)</label>
                <input
                  type="number"
                  min="0"
                  value={step.data.due_days ?? 0}
                  onChange={(event) => onChange({ due_days: Math.max(0, Number(event.target.value) || 0) })}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Task instructions</label>
              <textarea
                rows={4}
                value={step.data.instructions || ''}
                onChange={(event) => onChange({ instructions: event.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>
          </div>
        );
      case 'lead_replacement':
        return (
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Quality threshold</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={step.data.quality_threshold ?? 65}
                  onChange={(event) => onChange({ quality_threshold: Math.min(100, Math.max(0, Number(event.target.value) || 0)) })}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Review window (hrs)</label>
                <input
                  type="number"
                  min="1"
                  value={step.data.review_window_hours ?? 24}
                  onChange={(event) => onChange({ review_window_hours: Math.max(1, Number(event.target.value) || 24) })}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id={`auto-credit-${step.id}`}
                  type="checkbox"
                  checked={Boolean(step.data.auto_credit)}
                  onChange={(event) => onChange({ auto_credit: event.target.checked })}
                  className="rounded border-gray-300 dark:border-slate-700 text-blue-600 dark:text-blue-300 focus:ring-blue-500"
                />
                <label htmlFor={`auto-credit-${step.id}`} className="text-sm text-gray-700 dark:text-slate-300">
                  Auto-credit wallet when quality fails
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Notes</label>
              <textarea
                rows={3}
                value={step.data.notes || ''}
                onChange={(event) => onChange({ notes: event.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>
          </div>
        );
      case 'report':
        return (
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Report template</label>
                <select
                  value={step.data.template || 'inspection_brief'}
                  onChange={(event) => onChange({ template: event.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="inspection_brief">Inspection Brief</option>
                  <option value="storm_damage_dossier">Storm Damage Dossier</option>
                  <option value="insurance_package">Insurance Evidence Pack</option>
                  <option value="maintenance_plan">Maintenance Plan + Upsell</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Delivery channel</label>
                <select
                  value={step.data.delivery_channel || 'email'}
                  onChange={(event) => onChange({ delivery_channel: event.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="email">Email</option>
                  <option value="sms">SMS link</option>
                  <option value="portal">Customer portal</option>
                </select>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={Boolean(step.data.attach_imagery)}
                  onChange={(event) => onChange({ attach_imagery: event.target.checked })}
                  className="rounded border-gray-300 dark:border-slate-700 text-blue-600 dark:text-blue-300 focus:ring-blue-500"
                />
                Attach annotated imagery and SmartScan overlays
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={Boolean(step.data.include_financing)}
                  onChange={(event) => onChange({ include_financing: event.target.checked })}
                  className="rounded border-gray-300 dark:border-slate-700 text-blue-600 dark:text-blue-300 focus:ring-blue-500"
                />
                Include financing + warranty upsells
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Personalisation notes</label>
              <textarea
                rows={4}
                value={step.data.notes || ''}
                onChange={(event) => onChange({ notes: event.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Add homeowner-specific talking points, insurance claim status, or next steps."
              />
            </div>
          </div>
        );
      case 'end':
        return (
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Outcome Label</label>
              <input
                type="text"
                value={step.data.label || ''}
                onChange={(e) => onChange({ label: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Outcome Type</label>
              <select
                value={step.data.outcome || 'completed'}
                onChange={(e) => onChange({ outcome: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="converted">Converted</option>
                <option value="responded">Responded</option>
                <option value="no_response">No Response</option>
                <option value="unqualified">Unqualified</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const canMoveUp = !isFirst && step.type !== 'start';
  const canMoveDown = !isLast && step.type !== 'end' && step.type !== 'start';
  const canDelete = step.type !== 'start';

  return (
    <div className="relative pl-12">
      <span className="absolute left-4 top-5 w-5 h-5 rounded-full border-2 border-white shadow ring-4 ring-white flex items-center justify-center">
        <span className={`w-3 h-3 rounded-full ${connectorColor}`}></span>
      </span>
      <div className="bg-white dark:bg-slate-900/70 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Icon size={18} className="text-blue-600 dark:text-blue-300" />
              <input
                type="text"
                value={step.data.label || ''}
                readOnly={step.type === 'start'}
                onChange={(e) => onChange({ label: e.target.value })}
                className={`font-semibold text-gray-900 dark:text-slate-100 bg-transparent border-none focus:ring-0 focus:outline-none text-base ${
                  step.type === 'start' ? 'cursor-not-allowed text-gray-700 dark:text-slate-300' : ''
                }`}
              />
            </div>
            <div className="mt-4">{renderFields()}</div>
            {['voice_call', 'email', 'sms', 'report'].includes(step.type) && (
              <div
                className={`mt-6 rounded-xl border px-4 py-4 ${
                  isDark ? 'border-slate-700 bg-slate-900/50' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className={`inline-flex items-center gap-2 text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                    <input
                      type="checkbox"
                      checked={Boolean(step.data.require_review)}
                      onChange={(event) =>
                        onChange({
                          require_review: event.target.checked,
                          manual_send: event.target.checked ? step.data.manual_send : false,
                        })
                      }
                      className="rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                    />
                    Require review before sending
                  </label>
                  <label className={`inline-flex items-center gap-2 text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                    <input
                      type="checkbox"
                      checked={Boolean(step.data.manual_send)}
                      onChange={(event) =>
                        onChange({
                          manual_send: event.target.checked,
                          require_review: event.target.checked ? true : step.data.require_review,
                        })
                      }
                      className="rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                    />
                    Manual send (pause automation)
                  </label>
                </div>
                <p className={`mt-3 text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  When enabled, this step creates a dashboard notification so you can approve or edit the outreach before it leaves the platform.
                </p>
                {(step.data.require_review || step.data.manual_send) && (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onTriggerManualReview?.(step)}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                        isDark ? 'bg-blue-500 text-white hover:bg-blue-400' : 'bg-blue-600 text-white hover:bg-blue-500'
                      }`}
                    >
                      Queue review now
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange({ require_review: false, manual_send: false })}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                        isDark
                          ? 'bg-slate-800/70 text-slate-200 hover:bg-slate-800'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Disable manual controls
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {canMoveUp && (
              <button
                onClick={onMoveUp}
                className={`p-2 rounded-lg border text-sm font-medium transition ${
                  isDark
                    ? 'border-slate-700 text-slate-200 hover:bg-slate-800/60'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
                title="Move up"
              >
                <ArrowUp size={16} />
              </button>
            )}
            {canMoveDown && (
              <button
                onClick={onMoveDown}
                className={`p-2 rounded-lg border text-sm font-medium transition ${
                  isDark
                    ? 'border-slate-700 text-slate-200 hover:bg-slate-800/60'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
                title="Move down"
              >
                <ArrowDown size={16} />
              </button>
            )}
            {canDelete && (
              <button
                onClick={onDelete}
                className={`p-2 rounded-lg border text-sm font-medium transition ${
                  isDark
                    ? 'border-slate-700 text-rose-300 hover:bg-rose-500/20'
                    : 'border-gray-200 text-red-600 hover:bg-red-50'
                }`}
                title="Delete step"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const SequenceBuilder = ({ sequenceId, initialSequence, onSave, onClose, isDark = false }) => {
  const [sequence, setSequence] = useState(() => ({
    name: initialSequence?.name || 'New Sequence',
    description: initialSequence?.description || '',
    is_active: initialSequence?.is_active || false,
  }));
  const [steps, setSteps] = useState(() => parseFlowData(initialSequence?.flow_data));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialSequence?.flow_data) {
      setSteps(parseFlowData(initialSequence.flow_data));
      setSequence({
        name: initialSequence.name,
        description: initialSequence.description,
        is_active: initialSequence.is_active,
      });
    }
  }, [initialSequence]);

  const addStep = (type) => {
    const newStep = createStep(type);
    setSteps((prev) => {
      const endIndex = prev.findIndex((step) => step.type === 'end');
      if (endIndex === -1) {
        return [...prev, newStep];
      }
      return [...prev.slice(0, endIndex), newStep, ...prev.slice(endIndex)];
    });
  };

  const updateStep = (id, changes) => {
    setSteps((prev) =>
      prev.map((step) => (step.id === id ? { ...step, data: { ...step.data, ...changes } } : step))
    );
  };

  const deleteStep = (id) => {
    setSteps((prev) => {
      const target = prev.find((step) => step.id === id);
      if (!target) return prev;
      if (target.type === 'end') {
        const remainingEnds = prev.filter((step) => step.type === 'end');
        if (remainingEnds.length <= 1) {
          toast.error('At least one outcome node is required.');
          return prev;
        }
      }
      return prev.filter((step) => step.id !== id);
    });
  };

  const handleManualReviewDispatch = useCallback(
    (step) => {
      if (!(step?.data?.require_review || step?.data?.manual_send)) {
        toast.error('Enable review or manual send before queuing this step.');
        return;
      }
      if (typeof window === 'undefined') return;
      const detail = {
        id: `${sequenceId || initialSequence?.id || 'sequence'}-${step.id}-${Date.now()}`,
        sequenceId: sequenceId || initialSequence?.id || null,
        sequenceName: sequence.name,
        stepId: step.id,
        stepLabel: step.data.label || step.type,
        stepType: step.type,
        requireReview: Boolean(step.data.require_review),
        manualSend: Boolean(step.data.manual_send),
        subject: step.data.subject || '',
        body: step.data.body || step.data.message || step.data.script || (step.data.notes || ''),
        script: step.data.script || '',
        template: step.data.template || '',
        deliveryChannel: step.data.delivery_channel || '',
        notes: step.data.notes || '',
        aiPrompt: step.data.ai_prompt || '',
        attachments: {
          includeImagery: Boolean(step.data.attach_imagery),
          includeFinancing: Boolean(step.data.include_financing),
        },
        createdAt: new Date().toISOString(),
      };
      window.dispatchEvent(new CustomEvent('fm-manual-review', { detail }));
      toast.success('Manual review queued. Check notifications to approve.');
    },
    [sequenceId, initialSequence?.id, sequence.name]
  );

  const moveStep = (index, direction) => {
    setSteps((prev) => {
      const newSteps = [...prev];
      const targetIndex = index + direction;
      if (
        targetIndex <= 0 ||
        targetIndex >= newSteps.length ||
        newSteps[index].type === 'start' ||
        newSteps[targetIndex].type === 'start'
      ) {
        return prev;
      }
      const tmp = newSteps[targetIndex];
      newSteps[targetIndex] = newSteps[index];
      newSteps[index] = tmp;
      return newSteps;
    });
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const flowData = buildFlowData(steps);
      const payload = {
        ...sequence,
        flow_data: flowData,
      };

      let savedSequence;
      if (sequenceId) {
        savedSequence = await leadAPI.updateSequence(sequenceId, payload);
        toast.success('Sequence updated successfully!');
      } else {
        savedSequence = await leadAPI.createSequence(payload);
        toast.success('Sequence created successfully!');
      }
      if (onSave) {
        await onSave(savedSequence);
      }
    } catch (error) {
      console.error('Failed to save sequence', error);
      toast.error('Unable to save sequence right now.');
    } finally {
      setIsSaving(false);
    }
  };

  const primarySteps = steps.slice(1, -1);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900/70 flex flex-col">
      <header className="border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/70">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{sequenceId ? 'Edit Sequence' : 'New Sequence'}</h1>
            <p className="text-sm text-gray-600 dark:text-slate-400">Build your automation with simple, production-ready blocks.</p>
          </div>
          <div className="flex items-center gap-3">
            {onClose && (
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-800 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800/50 dark:bg-slate-800/60"
              >
                <X size={16} />
                Cancel
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
            >
              <Save size={16} />
              {isSaving ? 'Saving…' : 'Save Sequence'}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
          <section className="bg-white dark:bg-slate-900/70 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Sequence Details</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Name</label>
                <input
                  type="text"
                  value={sequence.name}
                  onChange={(e) => setSequence((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Description</label>
                <input
                  type="text"
                  value={sequence.description || ''}
                  onChange={(e) => setSequence((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-slate-900/70 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Sequence Flow</h2>
            <div className="relative pl-6">
              <span className="absolute left-4 top-4 bottom-4 w-px bg-gradient-to-b from-blue-200 via-blue-200 to-transparent pointer-events-none" />
              {steps.map((step, index) => (
                <StepCard
                  key={step.id}
                  step={step}
                  index={index}
                  isFirst={index === 0}
                  isLast={index === steps.length - 1}
                  steps={steps}
                  onChange={(changes) => updateStep(step.id, changes)}
                  onDelete={() => deleteStep(step.id)}
                  onMoveUp={() => moveStep(index, -1)}
                  onMoveDown={() => moveStep(index, 1)}
                  onTriggerManualReview={handleManualReviewDispatch}
                  isDark={isDark}
                />
              ))}
            </div>
          </section>

          <section className="bg-white dark:bg-slate-900/70 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Add Step</h2>
            {primarySteps.length === 0 && (
              <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                Start by adding your first step between the Start and End markers.
              </div>
            )}
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {STEP_LIBRARY.map((item) => (
                <button
                  key={item.type}
                  onClick={() => addStep(item.type)}
                  className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 px-4 py-3 text-left transition hover:border-blue-300 hover:shadow-sm"
                >
                  <div className="mt-1 rounded-lg bg-blue-50 p-2 text-blue-600 dark:text-blue-300">
                    <item.icon size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-slate-100">
                      {item.label}
                    </div>
                    <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">{item.description}</p>
                  </div>
                  <PlusCircle className="ml-auto text-gray-300" size={18} />
                </button>
              ))}
              <button
                onClick={() => addStep('end')}
                className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 px-4 py-3 text-left transition hover:border-blue-300 hover:shadow-sm"
              >
                <div className="mt-1 rounded-lg bg-rose-50 p-2 text-rose-600">
                  <StopCircle size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-slate-100">
                    Outcome Node
                  </div>
                  <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">Add an additional end state (e.g. Converted, Nurture).</p>
                </div>
                <PlusCircle className="ml-auto text-gray-300" size={18} />
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default SequenceBuilder;
