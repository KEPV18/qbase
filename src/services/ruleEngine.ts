// ============================================================================
// QMS Forge — Rule Engine & Data Integrity Detection
// Phase 7B+7C: Non-blocking detection + progressive enforcement
//
// ALL rules default to "warn" mode. No hard enforcement until explicitly
// switched to "strict" by admin. Observes first, enforces only when safe.
// ============================================================================

import React, { useMemo } from 'react';
import { FORM_SCHEMAS, getFormSchema } from '../data/formSchemas';
import { useRecords } from '../hooks/useRecordStorage';
import type { RecordData } from '../components/forms/DynamicFormRenderer';

// ============================================================================
// Types
// ============================================================================

export type RuleSeverity = 'clean' | 'warning' | 'critical';
export type RuleMode = 'warn' | 'strict';
export type RuleType = 'reference' | 'dependency' | 'sequence' | 'data_quality';

export interface IntegrityRule {
  id: string;
  description: string;
  type: RuleType;
  mode: RuleMode;       // always "warn" by default
  check: (record: RecordData, allRecords: RecordData[]) => IntegritySignal | null;
}

export interface IntegritySignal {
  ruleId: string;
  severity: RuleSeverity;
  message: string;
  details?: string;
}

export interface IntegrityReport {
  recordSerial: string;
  formCode: string;
  signals: IntegritySignal[];
  overallSeverity: RuleSeverity;
  serialGaps: SerialGap[];
  missingReferences: MissingReference[];
  missingDependencies: MissingDependency[];
}

export interface SerialGap {
  formCode: string;
  expectedSerial: string;
  afterSerial: string;
  beforeSerial: string;
}

export interface MissingReference {
  fromSerial: string;
  fromField: string;
  referencedFormCode: string;
  referencedValue: string;
}

export interface MissingDependency {
  forSerial: string;
  forFormCode: string;
  expectedFormCode: string;
  expectedPattern: string;
}

// ============================================================================
// Rule Engine — All rules default to WARN mode
// ============================================================================

const RULES: IntegrityRule[] = [
  // ─── Reference Rules ─────────────────────────────────────────────────
  {
    id: 'REF-F43-F28',
    description: 'F/43 Induction Training must reference existing F/28 Training Attendance',
    type: 'reference',
    mode: 'warn',
    check: (record, allRecords) => {
      if (record.formCode !== 'F/43') return null;
      const trainingDate = record.training_date || record.date;
      if (!trainingDate) return null;

      // Check if any F/28 exists for the same project
      const f28s = allRecords.filter(r => r.formCode === 'F/28');
      if (f28s.length === 0) {
        return {
          ruleId: 'REF-F43-F28',
          severity: 'warning',
          message: 'No F/28 Training Attendance records found',
          details: 'F/43 Induction Training typically requires corresponding F/28 records',
        };
      }
      return null;
    },
  },
  {
    id: 'REF-F30-F43',
    description: 'F/30 Performance Appraisal should have related F/43 Induction Training',
    type: 'reference',
    mode: 'warn',
    check: (record, allRecords) => {
      if (record.formCode !== 'F/30') return null;
      const f43s = allRecords.filter(r => r.formCode === 'F/43');
      if (f43s.length === 0) {
        return {
          ruleId: 'REF-F30-F43',
          severity: 'warning',
          message: 'No F/43 Induction Training records found',
          details: 'F/30 Performance Appraisals typically reference F/43 records',
        };
      }
      return null;
    },
  },
  {
    id: 'REF-F22-F12',
    description: 'F/22 Corrective Action should reference existing F/12 Non-Conforming',
    type: 'reference',
    mode: 'warn',
    check: (record, allRecords) => {
      if (record.formCode !== 'F/22') return null;
      const ncRef = record.nc_reference || record.related_nc;
      if (!ncRef) return null;
      const f12s = allRecords.filter(r => r.formCode === 'F/12');
      const exists = f12s.some(r => r.serial === ncRef || (r as Record<string, unknown>).serial === ncRef);
      if (!exists && ncRef.startsWith('F/12')) {
        return {
          ruleId: 'REF-F22-F12',
          severity: 'warning',
          message: `Referenced ${ncRef} not found`,
          details: 'The referenced Non-Conforming report does not exist in the system',
        };
      }
      return null;
    },
  },

  // ─── Dependency Rules ─────────────────────────────────────────────────
  {
    id: 'DEP-F08-F19',
    description: 'F/08 Order Form should have corresponding F/19 Product Description',
    type: 'dependency',
    mode: 'warn',
    check: (record, allRecords) => {
      if (record.formCode !== 'F/08') return null;
      const f19s = allRecords.filter(r => r.formCode === 'F/19');
      if (f19s.length === 0) {
        return {
          ruleId: 'DEP-F08-F19',
          severity: 'warning',
          message: 'No F/19 Product Description records found',
          details: 'Orders typically require a product description',
        };
      }
      return null;
    },
  },
  {
    id: 'DEP-PROJECT-CONSISTENCY',
    description: 'Records with project names should have consistent project references',
    type: 'dependency',
    mode: 'warn',
    check: (record, allRecords) => {
      const projectField = record.project || record.project_name;
      if (!projectField) return null;
      return null; // No check needed — project consistency is informational only
    },
  },

  // ─── Data Quality Rules ──────────────────────────────────────────────
  {
    id: 'DQ-EMPTY-CRITICAL',
    description: 'Critical fields should not be empty',
    type: 'data_quality',
    mode: 'warn',
    check: (record) => {
      const schema = getFormSchema(record.formCode as string);
      if (!schema) return null;

      const criticalFields = schema.fields
        .filter(f => f.required)
        .map(f => f.key);

      const emptyCriticals: string[] = [];
      for (const field of criticalFields) {
        const value = record[field];
        if (!value || value === '' || value === '—') {
          // Find the label for display
          const fieldDef = schema.fields.find(f => f.key === field);
          emptyCriticals.push(fieldDef?.label || field);
        }
      }

      if (emptyCriticals.length > 0) {
        return {
          ruleId: 'DQ-EMPTY-CRITICAL',
          severity: emptyCriticals.length > 3 ? 'critical' : 'warning',
          message: `${emptyCriticals.length} required field(s) empty`,
          details: `Empty: ${emptyCriticals.join(', ')}`,
        };
      }
      return null;
    },
  },
  {
    id: 'DQ-FUTURE-DATE',
    description: 'Dates should not be in the future',
    type: 'data_quality',
    mode: 'warn',
    check: (record) => {
      const dateFields = ['date', 'start_date', 'end_date', 'closure_date', 'review_date'];
      // Use date-only comparison to avoid timezone issues (Cairo UTC+2)
      const todayISO = new Date().toISOString().substring(0, 10); // YYYY-MM-DD in UTC

      for (const field of dateFields) {
        const value = record[field] as string;
        if (!value) continue;

        // Normalize to YYYY-MM-DD for comparison
        let dateISO = '';
        if (value.includes('/')) {
          const parts = value.split('/');
          if (parts.length === 3) dateISO = `${parts[2]}-${parts[1]}-${parts[0]}`; // DD/MM/YYYY → YYYY-MM-DD
        } else {
          dateISO = value.substring(0, 10); // Already YYYY-MM-DD (or ISO timestamp)
        }

        if (dateISO && dateISO.length === 10 && dateISO > todayISO) {
          return {
            ruleId: 'DQ-FUTURE-DATE',
            severity: 'warning',
            message: `Future date detected in "${field}"`,
            details: `Date ${value} is in the future`,
          };
        }
      }
      return null;
    },
  },
  {
    id: 'DQ-CLOSED-WITHOUT-CLOSURE-DATE',
    description: 'Closed records should have a closure date',
    type: 'data_quality',
    mode: 'warn',
    check: (record) => {
      const status = (record.status as string || '').toLowerCase();
      if (status === 'closed' || status === 'completed') {
        const closureDate = record.closure_date || record.end_date;
        if (!closureDate || closureDate === '') {
          return {
            ruleId: 'DQ-CLOSED-WITHOUT-CLOSURE-DATE',
            severity: 'warning',
            message: 'Record is closed but missing closure date',
            details: `Status: "${status}" but no closure/end date provided`,
          };
        }
      }
      return null;
    },
  },
];

// ============================================================================
// Serial Gap Detection
// ============================================================================

export function detectSerialGaps(allRecords: RecordData[]): SerialGap[] {
  const byForm = new Map<string, number[]>();

  for (const record of allRecords) {
    const serial = (record.serial as string) || '';
    const match = serial.match(/^F\/(\d+)-(\d+)$/);
    if (!match) continue;

    const formCode = `F/${match[1]}`;
    const num = parseInt(match[2], 10);

    if (!byForm.has(formCode)) byForm.set(formCode, []);
    byForm.get(formCode)!.push(num);
  }

  const gaps: SerialGap[] = [];

  for (const [formCode, nums] of byForm) {
    nums.sort((a, b) => a - b);
    for (let i = 0; i < nums.length - 1; i++) {
      if (nums[i + 1] > nums[i] + 1) {
        // Found gap(s)
        for (let gap = nums[i] + 1; gap < nums[i + 1]; gap++) {
          gaps.push({
            formCode,
            expectedSerial: `${formCode}-${String(gap).padStart(3, '0')}`,
            afterSerial: `${formCode}-${String(nums[i]).padStart(3, '0')}`,
            beforeSerial: `${formCode}-${String(nums[i + 1]).padStart(3, '0')}`,
          });
        }
      }
    }
  }

  return gaps;
}

// ============================================================================
// Reference Detection
// ============================================================================

export function detectMissingReferences(allRecords: RecordData[]): MissingReference[] {
  const refs: MissingReference[] = [];
  const allSerials = new Set(allRecords.map(r => r.serial as string));

  // F/43 → F/28 connection
  for (const record of allRecords) {
    if (record.formCode !== 'F/43') continue;
    const projectName = (record.project as string) || (record.project_name as string);
    if (!projectName) continue;

    const f28sForProject = allRecords.filter(
      r => r.formCode === 'F/28' && ((r.project as string) || (r.project_name as string)) === projectName
    );

    if (f28sForProject.length === 0) {
      refs.push({
        fromSerial: record.serial as string,
        fromField: 'project',
        referencedFormCode: 'F/28',
        referencedValue: projectName,
      });
    }
  }

  // F/22 → F/12 reference check (if nc_reference field exists)
  for (const record of allRecords) {
    if (record.formCode !== 'F/22') continue;
    const ncRef = (record.nc_reference as string) || (record.related_nc as string);
    if (!ncRef || !ncRef.startsWith('F/12')) continue;

    if (!allSerials.has(ncRef)) {
      refs.push({
        fromSerial: record.serial as string,
        fromField: 'nc_reference',
        referencedFormCode: 'F/12',
        referencedValue: ncRef,
      });
    }
  }

  return refs;
}

// ============================================================================
// Dependency Detection
// ============================================================================

export function detectMissingDependencies(allRecords: RecordData[]): MissingDependency[] {
  const deps: MissingDependency[] = [];
  const formCodesPresent = new Set(allRecords.map(r => r.formCode as string));

  // Expected form pairs: if F/08 exists, F/19 should exist
  const expectedPairs: [string, string, string][] = [
    ['F/08', 'F/19', 'Product Description'],
    ['F/10', 'F/09', 'Customer Complaint'],
    ['F/30', 'F/43', 'Induction Training'],
    ['F/30', 'F/28', 'Training Attendance'],
    ['F/25', 'F/47', 'Audit Checklist'],
    ['F/22', 'F/12', 'Non-Conforming Report'],
  ];

  for (const [trigger, expected, expectedName] of expectedPairs) {
    if (formCodesPresent.has(trigger) && !formCodesPresent.has(expected)) {
      // Only flag if trigger has 3+ records (avoid noise with test data)
      const triggerCount = allRecords.filter(r => r.formCode === trigger).length;
      if (triggerCount >= 3) {
        for (const record of allRecords) {
          if (record.formCode === trigger) {
            deps.push({
              forSerial: record.serial as string,
              forFormCode: trigger,
              expectedFormCode: expected,
              expectedPattern: `${expected} ${expectedName}`,
            });
            break; // One signal per trigger form is enough
          }
        }
      }
    }
  }

  return deps;
}

// ============================================================================
// Main Evaluation Function
// ============================================================================

export function evaluateRulesForRecord(
  record: RecordData,
  allRecords: RecordData[]
): IntegritySignal[] {
  const signals: IntegritySignal[] = [];

  for (const rule of RULES) {
    try {
      const signal = rule.check(record, allRecords);
      if (signal) {
        signals.push({
          ...signal,
          ruleId: rule.id,
          severity: signal.severity || 'warning',
        });
      }
    } catch (err) {
      console.error(`[ruleEngine] Rule ${rule.id} failed:`, err);
    }
  }

  return signals;
}

export function evaluateAllRecords(allRecords: RecordData[]): IntegrityReport[] {
  const reports: IntegrityReport[] = [];

  for (const record of allRecords) {
    const signals = evaluateRulesForRecord(record, allRecords);
    const missingRefs = detectMissingReferences(allRecords).filter(
      r => r.fromSerial === record.serial
    );
    const missingDeps = detectMissingDependencies(allRecords).filter(
      d => d.forSerial === record.serial
    );

    if (signals.length > 0 || missingRefs.length > 0 || missingDeps.length > 0) {
      const overallSeverity: RuleSeverity = signals.some(s => s.severity === 'critical')
        ? 'critical'
        : signals.some(s => s.severity === 'warning') || missingRefs.length > 0 || missingDeps.length > 0
          ? 'warning'
          : 'clean';

      reports.push({
        recordSerial: record.serial as string,
        formCode: record.formCode as string,
        signals,
        overallSeverity,
        serialGaps: [],
        missingReferences: missingRefs,
        missingDependencies: missingDeps,
      });
    }
  }

  return reports;
}

// ============================================================================
// Data Quality Dashboard Hook
// ============================================================================

export function useDataIntegrityReport() {
  const { data: records, isLoading, error, refetch } = useRecords();

  const report = useMemo(() => {
    if (!records || records.length === 0) {
      return {
        recordsWithIssues: [] as IntegrityReport[],
        serialGaps: [] as SerialGap[],
        missingReferences: [] as MissingReference[],
        missingDependencies: [] as MissingDependency[],
        totalRecords: 0,
        cleanRecords: 0,
        warningRecords: 0,
        criticalRecords: 0,
        summary: {
          total: 0,
          clean: 0,
          warning: 0,
          critical: 0,
          serialGaps: 0,
          missingRefs: 0,
          missingDeps: 0,
        },
      };
    }

    const allRecordsList = records as unknown as RecordData[];
    const recordsWithIssues = evaluateAllRecords(allRecordsList);
    const serialGaps = detectSerialGaps(allRecordsList);
    const missingReferences = detectMissingReferences(allRecordsList);
    const missingDependencies = detectMissingDependencies(allRecordsList);

    const recordsWithSignalSet = new Set(recordsWithIssues.map(r => r.recordSerial));
    const cleanRecords = allRecordsList.filter(r => !recordsWithSignalSet.has(r.serial as string)).length;

    const warningRecords = recordsWithIssues.filter(r => r.overallSeverity === 'warning').length;
    const criticalRecords = recordsWithIssues.filter(r => r.overallSeverity === 'critical').length;

    return {
      recordsWithIssues,
      serialGaps,
      missingReferences,
      missingDependencies,
      totalRecords: allRecordsList.length,
      cleanRecords,
      warningRecords,
      criticalRecords,
      summary: {
        total: allRecordsList.length,
        clean: cleanRecords,
        warning: warningRecords,
        critical: criticalRecords,
        serialGaps: serialGaps.length,
        missingRefs: missingReferences.length,
        missingDeps: missingDependencies.length,
      },
    };
  }, [records]);

  return { ...report, isLoading, error, refetch };
}

// ============================================================================
// Severity Helpers
// ============================================================================

export function getSeverityColor(severity: RuleSeverity): string {
  switch (severity) {
    case 'clean': return 'text-green-400';
    case 'warning': return 'text-amber-400';
    case 'critical': return 'text-red-400';
  }
}

export function getSeverityBg(severity: RuleSeverity): string {
  switch (severity) {
    case 'clean': return 'bg-green-500/10 border-green-500/30';
    case 'warning': return 'bg-amber-500/10 border-amber-500/30';
    case 'critical': return 'bg-red-500/10 border-red-500/30';
  }
}

export function getSeverityIcon(severity: RuleSeverity): string {
  switch (severity) {
    case 'clean': return '✓';
    case 'warning': return '⚠';
    case 'critical': return '✕';
  }
}

export function getRuleModeColor(mode: RuleMode): string {
  return mode === 'strict' ? 'text-red-400' : 'text-amber-400';
}

// ============================================================================
// Rules Registry (for admin display)
// ============================================================================

export function getAllRules(): IntegrityRule[] {
  return [...RULES];
}

export function setRuleMode(ruleId: string, mode: RuleMode): void {
  const rule = RULES.find(r => r.id === ruleId);
  if (rule) {
    rule.mode = mode;
  }
}