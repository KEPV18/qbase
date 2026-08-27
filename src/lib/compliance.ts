// ============================================================================
// QBase — ISO Compliance & SLA Engine
// Frequency rules, due-date calculation, and health scoring.
// ============================================================================

export type FrequencyType = 'Monthly' | 'Yearly' | 'Per-Project' | 'Event-Driven';

export interface FrequencyRule {
  type: FrequencyType;
  label: string;
  graceDays: number;        // days after due before marked overdue
  intervalDays: number;     // expected cycle length (0 for non-cyclic)
}

export const FREQUENCY_RULES: Record<FrequencyType, FrequencyRule> = {
  Monthly:     { type: 'Monthly',     label: 'Monthly',     graceDays: 5,  intervalDays: 30 },
  Yearly:      { type: 'Yearly',      label: 'Yearly',      graceDays: 14, intervalDays: 365 },
  'Per-Project': { type: 'Per-Project', label: 'Per Project', graceDays: 0,  intervalDays: 0 },
  'Event-Driven': { type: 'Event-Driven', label: 'Event-Driven', graceDays: 0,  intervalDays: 0 },
};

/**
 * Map legacy free-text frequency strings into strict FrequencyType enum.
 */
export function parseFrequency(raw: string): FrequencyType {
  const lower = raw.toLowerCase();
  if (lower.includes('month') || lower.includes('semi-annual') || lower.includes('quarter')) return 'Monthly';
  if (lower.includes('year') || lower.includes('annual')) return 'Yearly';
  if (lower.includes('project') || lower.includes('per project')) return 'Per-Project';
  return 'Event-Driven';
}

/**
 * Compute the number of days between two ISO dates.
 */
export function daysBetween(from: string, to: string = new Date().toISOString()): number {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

/**
 * Compute next due date for a cyclical form.
 */
export function computeNextDueDate(lastDate: string | null, freqType: FrequencyType): string | null {
  if (!lastDate || freqType === 'Event-Driven' || freqType === 'Per-Project') return null;
  const rule = FREQUENCY_RULES[freqType];
  const last = new Date(lastDate);
  const next = new Date(last);
  next.setDate(next.getDate() + rule.intervalDays);
  return next.toISOString();
}

/**
 * Compliance status for a single form.
 */
export interface FormCompliance {
  formCode: string;
  frequencyType: FrequencyType;
  lastRecordDate: string | null;
  nextDueDate: string | null;
  daysSinceLast: number | null;
  daysUntilDue: number | null;
  isOverdue: boolean;
  overdueDays: number;
  recordCount: number;
}

/**
 * Build compliance snapshot for all forms from existing records.
 */
export function buildComplianceMap(
  records: { formCode: string; createdAt: string }[]
): Map<string, FormCompliance> {
  const map = new Map<string, FormCompliance>();

  // Aggregate latest record per form
  const latestByForm = new Map<string, string>();
  records.forEach(r => {
    const prev = latestByForm.get(r.formCode);
    if (!prev || r.createdAt > prev) latestByForm.set(r.formCode, r.createdAt);
  });

  // Fill map for every known form code
  latestByForm.forEach((lastDate, code) => {
    // We don't know frequency here — caller injects from FormSchema
    map.set(code, {
      formCode: code,
      frequencyType: 'Event-Driven',
      lastRecordDate: lastDate,
      nextDueDate: null,
      daysSinceLast: daysBetween(lastDate),
      daysUntilDue: null,
      isOverdue: false,
      overdueDays: 0,
      recordCount: records.filter(r => r.formCode === code).length,
    });
  });

  return map;
}

/**
 * Inject frequency metadata into a compliance snapshot.
 */
export function applyFrequency(
  compliance: FormCompliance,
  freqType: FrequencyType
): FormCompliance {
  const nextDue = computeNextDueDate(compliance.lastRecordDate, freqType);
  const daysUntil = nextDue ? daysBetween(new Date().toISOString(), nextDue) : null;
  const rule = FREQUENCY_RULES[freqType];
  const isOverdue = daysUntil !== null && daysUntil < -rule.graceDays;
  const overdueDays = isOverdue && daysUntil !== null ? Math.abs(daysUntil) : 0;

  return {
    ...compliance,
    frequencyType: freqType,
    nextDueDate: nextDue,
    daysUntilDue: daysUntil,
    isOverdue,
    overdueDays,
  };
}

/**
 * Human-readable countdown / urgency text.
 */
export function getUrgencyText(compliance: FormCompliance): string {
  if (compliance.frequencyType === 'Event-Driven') return 'On-Demand Event';
  if (compliance.frequencyType === 'Per-Project') return 'Required per Project';
  if (compliance.isOverdue) return `🚨 Overdue by ${compliance.overdueDays} day${compliance.overdueDays === 1 ? '' : 's'}`;
  if (compliance.daysUntilDue === null) return 'Due date unknown';
  if (compliance.daysUntilDue <= 0) return `Due in ${Math.max(0, compliance.daysUntilDue)} day${compliance.daysUntilDue === 1 || compliance.daysUntilDue === -1 ? '' : 's'}`;
  if (compliance.daysUntilDue <= 7) return `Due in ${compliance.daysUntilDue} day${compliance.daysUntilDue === 1 ? '' : 's'}`;
  if (compliance.daysUntilDue <= 30) return `Due in ${Math.ceil(compliance.daysUntilDue / 7)} weeks`;
  return `Due in ${Math.ceil(compliance.daysUntilDue / 30)} months`;
}

/**
 * Human-readable "last filed" text.
 */
export function getLastFiledText(lastDate: string | null): string {
  if (!lastDate) return 'Never filed';
  const days = daysBetween(lastDate);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

/**
 * Department-level SLA health summary.
 */
export interface DeptHealth {
  totalForms: number;
  totalSubmissions: number;
  overdueCount: number;
  cyclicalForms: number;   // forms with Monthly/Yearly frequency
  healthyCyclical: number;   // cyclical forms that are NOT overdue
  status: 'healthy' | 'warning' | 'critical';
}

/**
 * Compute SLA health for a department from compliance data.
 */
export function computeDeptHealth(
  forms: { code: string; frequency: FrequencyType }[],
  complianceMap: Map<string, FormCompliance>
): DeptHealth {
  let totalSubmissions = 0;
  let overdueCount = 0;
  let cyclicalForms = 0;
  let healthyCyclical = 0;

  forms.forEach(f => {
    const c = complianceMap.get(f.code);
    if (c) {
      totalSubmissions += c.recordCount;
      if (f.frequency === 'Monthly' || f.frequency === 'Yearly') {
        cyclicalForms++;
        if (!c.isOverdue) healthyCyclical++;
        else overdueCount++;
      }
    } else {
      // No records yet
      if (f.frequency === 'Monthly' || f.frequency === 'Yearly') {
        cyclicalForms++;
        // Never filed = overdue
        overdueCount++;
      }
    }
  });

  let status: DeptHealth['status'] = 'healthy';
  if (overdueCount > 0) status = 'warning';
  if (overdueCount >= 3 || (cyclicalForms > 0 && healthyCyclical === 0)) status = 'critical';

  return {
    totalForms: forms.length,
    totalSubmissions,
    overdueCount,
    cyclicalForms,
    healthyCyclical,
    status,
  };
}
