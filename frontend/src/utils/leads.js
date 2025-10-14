export const resolveLeadCreatedAt = (lead) => {
  if (!lead) return null;
  return (
    lead.created_at ||
    lead.createdAt ||
    lead.created ||
    lead.submitted_at ||
    lead.submittedAt ||
    lead.timestamp ||
    lead.lead_created_at ||
    null
  );
};

const resolveTimestamp = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
};

export const getLeadAgeHours = (createdAt) => {
  const timestamp = resolveTimestamp(createdAt);
  if (timestamp == null) return null;
  const diffMs = Date.now() - timestamp;
  if (!Number.isFinite(diffMs) || diffMs < 0) {
    return 0;
  }
  return diffMs / (1000 * 60 * 60);
};

export const formatLeadAgeLabel = (hoursOld) => {
  if (hoursOld == null) return '—';
  if (hoursOld < 2) return 'New';
  if (hoursOld < 24) return `${Math.max(1, Math.floor(hoursOld))}h old`;
  const days = hoursOld / 24;
  return `${Math.max(1, Math.floor(days))}d old`;
};

export const getLeadUrgency = (createdAt) => {
  const hoursOld = getLeadAgeHours(createdAt);
  if (hoursOld == null) {
    return {
      level: 'unknown',
      color: 'slate',
      message: 'Lead age unavailable',
      hoursOld: null,
    };
  }

  if (hoursOld > 48) {
    return {
      level: 'critical',
      color: 'red',
      message: 'URGENT: Lead getting cold',
      hoursOld,
    };
  }
  if (hoursOld > 24) {
    return {
      level: 'high',
      color: 'orange',
      message: 'High priority response needed',
      hoursOld,
    };
  }
  if (hoursOld > 2) {
    return {
      level: 'medium',
      color: 'yellow',
      message: 'Respond within the next 12 hours',
      hoursOld,
    };
  }
  return {
    level: 'normal',
    color: 'green',
    message: 'Fresh lead - respond soon',
    hoursOld,
  };
};
