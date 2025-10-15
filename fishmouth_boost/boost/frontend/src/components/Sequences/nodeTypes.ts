export type NodeType =
  | 'email.send'
  | 'sms.send'
  | 'voice.call'
  | 'wait.for'
  | 'condition.if'
  | 'ab.split'
  | 'human.task'
  | 'webhook.http'
  | 'crm.sync'
  | 'field.update'
  | 'throttle'
  | 'office.hours';

export const NODE_LIBRARY: Record<NodeType, { label: string; description: string }> = {
  'email.send': { label: 'Email', description: 'Send an email via provider with template tokens.' },
  'sms.send': { label: 'SMS', description: 'Send an SMS with optional shortlink to report.' },
  'voice.call': { label: 'Voice call', description: 'Place a call (AI/handoff).' },
  'wait.for': { label: 'Wait', description: 'Wait for a duration or until an event happens.' },
  'condition.if': { label: 'Condition', description: 'Branch on lead fields or prior events.' },
  'ab.split': { label: 'A/B split', description: 'Randomized split for experiments.' },
  'human.task': { label: 'Human task', description: 'Create a task for a rep to complete.' },
  'webhook.http': { label: 'Webhook', description: 'Call external HTTP endpoint.' },
  'crm.sync': { label: 'CRM sync', description: 'Sync to JobNimbus/AccuLynx/HubSpot.' },
  'field.update': { label: 'Update field', description: 'Update a field on the lead.' },
  'throttle': { label: 'Throttle', description: 'Control send rates.' },
  'office.hours': { label: 'Office hours', description: 'Respect local business hours.' },
};
