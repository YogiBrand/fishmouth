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

export const NODE_LIBRARY: Record<NodeType, {label: string, fields: string[]}> = {
  'email.send': {label: 'Send Email', fields: ['template_id','subject','html','text','attachments']},
  'sms.send': {label: 'Send SMS', fields: ['template_id','text']},
  'voice.call': {label: 'Voice Call', fields: ['agent_profile_id','objective','time_window']},
  'wait.for': {label: 'Wait', fields: ['duration_sec','until_event']},
  'condition.if': {label: 'Condition', fields: ['expr']},
  'ab.split': {label: 'A/B Split', fields: ['ratio_a']},
  'human.task': {label: 'Human Task', fields: ['assignee_id','due_in_min','notes']},
  'webhook.http': {label: 'Webhook', fields: ['url','method','headers','body']},
  'crm.sync': {label: 'CRM Sync', fields: ['target','mapping']},
  'field.update': {label: 'Update Field', fields: ['path','value']},
  'throttle': {label: 'Throttle', fields: ['max_per_hour']},
  'office.hours': {label: 'Office Hours', fields: ['tz','from','to','days']},
};
