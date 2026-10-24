// ============================================================================
// QBase — Rule Engine & Data Integrity Detection
// Phase 7B+7C: Non-blocking detection + progressive enforcement
//
// Every rule reports in "warn" mode: the engine OBSERVES, it never blocks a
// write.  There is deliberately no way to switch a rule to "strict" from
// code — the old `setRuleMode` mutated this module's in-memory RULES array,
// the server never saw the change, and no caller existed, so a rule set that
// could be "switched" in one browser tab and not in another was a rule set
// nobody could reason about.  Enforcement is a server-side decision, and it
// lives there.
// ============================================================================
import { log } from "@/services/logger";

import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { FORM_SCHEMAS, getFormSchema } from '../data/formSchemas';
import { useRecords } from '../hooks/useRecordStorage';
import type { RecordData } from '../components/forms/DynamicFormRenderer';
export type { RecordData };

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
  check: (record: RecordData, ctx: RuleContext) => IntegritySignal | null;
}

/**
 * The register, indexed once.
 *
 * Every cross-form rule used to scan the whole record array inside its own
 * body (`allRecords.filter(r => r.formCode === 'F/28')`), so evaluating the
 * register cost O(n²): the record list called `evaluateRulesForRecord` for
 * every record, and each of those calls re-scanned the whole table for every
 * scanning rule.  With the production copy's 318 records that is hundreds of
 * thousands of comparisons, in the browser, on the records list.
 *
 * The index turns each of those scans into a map lookup, and the evaluation
 * of the whole register into O(n).  It is derived from the records in memory:
 * nothing is read, written or cached across calls.
 */
export interface RuleContext {
  /** Every record of one form code, in register order. */
  byFormCode: Map<string, RecordData[]>;
  /** The serials of one form code. */
  serialsByFormCode: Map<string, Set<string>>;
  /** Every serial in the register. */
  serials: Set<string>;
}

/** Build the rule context once for a set of records. */
export function buildRuleContext(allRecords: RecordData[]): RuleContext {
  const byFormCode = new Map<string, RecordData[]>();
  const serialsByFormCode = new Map<string, Set<string>>();
  const serials = new Set<string>();

  for (const record of allRecords) {
    const formCode = (record.formCode as string) || '';
    const serial = (record.serial as string) || '';

    if (formCode) {
      const list = byFormCode.get(formCode);
      if (list) list.push(record);
      else byFormCode.set(formCode, [record]);
    }

    if (serial) {
      serials.add(serial);
      if (formCode) {
        const set = serialsByFormCode.get(formCode);
        if (set) set.add(serial);
        else serialsByFormCode.set(formCode, new Set([serial]));
      }
    }
  }

  return { byFormCode, serialsByFormCode, serials };
}

/** The records of one form code, or an empty list. */
function recordsOf(ctx: RuleContext, formCode: string): RecordData[] {
  return ctx.byFormCode.get(formCode) ?? [];
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
    check: (record, ctx) => {
      if (record.formCode !== 'F/43') return null;
      const trainingDate = record.training_date || record.date;
      if (!trainingDate) return null;

      // Check if any F/28 exists for the same project
      const f28s = recordsOf(ctx, 'F/28');
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
    check: (record, ctx) => {
      if (record.formCode !== 'F/30') return null;
      const f43s = recordsOf(ctx, 'F/43');
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
    check: (record, ctx) => {
      if (record.formCode !== 'F/22') return null;
      const ncRef = String(record.nc_reference || record.related_nc || '');
      if (!ncRef) return null;
      // A set lookup, not a scan of the F/12 records.
      const exists = ctx.serialsByFormCode.get('F/12')?.has(ncRef) ?? false;
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
    check: (record, ctx) => {
      if (record.formCode !== 'F/08') return null;
      const f19s = recordsOf(ctx, 'F/19');
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
    check: (record) => {
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

/**
 * The F/43 → F/28 and F/22 → F/12 reference gaps.
 *
 * The F/43 → F/28 check used to filter the whole record array for EVERY
 * F/43 record — a scan inside a loop, i.e. O(n²).  The project names of the
 * F/28 records are now collected once into a set, and every F/43 record asks
 * the set a single question.
 *
 * `context` may be passed in when the caller already has one, so the index
 * is built once per evaluation rather than once per call.
 */
export function detectMissingReferences(
  allRecords: RecordData[],
  context?: RuleContext
): MissingReference[] {
  const ctx = context ?? buildRuleContext(allRecords);
  const refs: MissingReference[] = [];

  // The project names the F/28 records carry, collected once.
  const f28Projects = new Set<string>();
  for (const r of recordsOf(ctx, 'F/28')) {
    const project = (r.project as string) || (r.project_name as string);
    if (project) f28Projects.add(project);
  }

  // F/43 → F/28 connection
  for (const record of recordsOf(ctx, 'F/43')) {
    const projectName = (record.project as string) || (record.project_name as string);
    if (!projectName) continue;

    if (!f28Projects.has(projectName)) {
      refs.push({
        fromSerial: record.serial as string,
        fromField: 'project',
        referencedFormCode: 'F/28',
        referencedValue: projectName,
      });
    }
  }

  // F/22 → F/12 reference check (if nc_reference field exists)
  for (const record of recordsOf(ctx, 'F/22')) {
    const ncRef = (record.nc_reference as string) || (record.related_nc as string);
    if (!ncRef || !ncRef.startsWith('F/12')) continue;

    if (!ctx.serials.has(ncRef)) {
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

export function detectMissingDependencies(
  allRecords: RecordData[],
  context?: RuleContext
): MissingDependency[] {
  const ctx = context ?? buildRuleContext(allRecords);
  const deps: MissingDependency[] = [];
  const formCodesPresent = new Set(ctx.byFormCode.keys());

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
      const triggerRecords = recordsOf(ctx, trigger);
      if (triggerRecords.length >= 3) {
        // EVERY record of the trigger form is affected.
        //
        // The rule is a form-level one: the expected form does not exist at
        // all, so every record that should have had a companion has lost it.
        // The old `break` attached the signal to the FIRST trigger record
        // only, and because the summary counts "clean" records as those
        // without a signal, the other 54 records of that form were reported
        // as CLEAN while the one flagged record was reported as having a
        // missing dependency.  The count and the per-record report
        // disagreed, and the count was the wrong one.
        for (const record of triggerRecords) {
          deps.push({
            forSerial: record.serial as string,
            forFormCode: trigger,
            expectedFormCode: expected,
            expectedPattern: `${expected} ${expectedName}`,
          });
        }
      }
    }
  }

  return deps;
}

// ============================================================================
// Main Evaluation Function
// ============================================================================

/**
 * The signals one record raises.
 *
 * The second argument is the indexed register, NOT the raw array: every rule
 * that looks at another form looks it up in the index, and the whole
 * evaluation of the register costs O(n) instead of O(n²).  Passing the raw
 * array here is no longer possible — the type is the context — so the slow
 * shape cannot come back.
 */
export function evaluateRulesForRecord(
  record: RecordData,
  ctx: RuleContext
): IntegritySignal[] {
  const signals: IntegritySignal[] = [];

  for (const rule of RULES) {
    try {
      const signal = rule.check(record, ctx);
      if (signal) {
        signals.push({
          ...signal,
          ruleId: rule.id,
          severity: signal.severity || 'warning',
        });
      }
    } catch (err) {
      log.system.error("ruleEngine:rule_failed", `Rule ${rule.id}: ${(err as Error)?.message || String(err)}`);
    }
  }

  return signals;
}

/** Everything the data-integrity page needs, computed in one pass. */
export interface RegisterEvaluation {
  reports: IntegrityReport[];
  serialGaps: SerialGap[];
  missingReferences: MissingReference[];
  missingDependencies: MissingDependency[];
}

/**
 * Evaluate the whole register in O(n).
 *
 * The index is built once, the two global detectors run once, and every
 * record is then evaluated against that shared context.
 */
export function evaluateRegister(allRecords: RecordData[]): RegisterEvaluation {
  const reports: IntegrityReport[] = [];
  const ctx = buildRuleContext(allRecords);

  // The two global detectors are computed ONCE, not once per record.
  //
  // `detectMissingReferences` walks the whole record set and filters it again
  // inside its own loop; `detectMissingDependencies` does the same.  Calling
  // them inside the per-record loop made the Data Integrity page do O(n²)
  // work on every recompute — with the production copy's 318 records that is
  // hundreds of thousands of comparisons, recomputed for every record.
  const missingReferences = detectMissingReferences(allRecords, ctx);
  const missingDependencies = detectMissingDependencies(allRecords, ctx);

  const refsBySerial = new Map<string, MissingReference[]>();
  for (const ref of missingReferences) {
    const list = refsBySerial.get(ref.fromSerial);
    if (list) list.push(ref);
    else refsBySerial.set(ref.fromSerial, [ref]);
  }

  const depsBySerial = new Map<string, MissingDependency[]>();
  for (const dep of missingDependencies) {
    const list = depsBySerial.get(dep.forSerial);
    if (list) list.push(dep);
    else depsBySerial.set(dep.forSerial, [dep]);
  }

  for (const record of allRecords) {
    const signals = evaluateRulesForRecord(record, ctx);
    const missingRefs = refsBySerial.get(record.serial as string) ?? [];
    const missingDeps = depsBySerial.get(record.serial as string) ?? [];

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

  return {
    reports,
    serialGaps: detectSerialGaps(allRecords),
    missingReferences,
    missingDependencies,
  };
}

/**
 * The per-record reports of the whole register.
 *
 * Kept as its own export for the callers that only want the reports; the
 * page that needs the flat lists as well uses `evaluateRegister`, so nothing
 * is computed twice.
 */
export function evaluateAllRecords(allRecords: RecordData[]): IntegrityReport[] {
  return evaluateRegister(allRecords).reports;
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
    // ONE evaluation pass.  The page used to call `evaluateAllRecords` and
    // then run the two global detectors a second time on its own, so the
    // reference and dependency detectors walked the whole register twice for
    // every recompute.
    const { reports: recordsWithIssues, serialGaps, missingReferences, missingDependencies } =
      evaluateRegister(allRecordsList);

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
    case 'clean': return 'text-success-tint';
    case 'warning': return 'text-warning-tint';
    case 'critical': return 'text-destructive-tint';
  }
}

export function getSeverityBg(severity: RuleSeverity): string {
  switch (severity) {
    case 'clean': return 'bg-success/10 border-success/30';
    case 'warning': return 'bg-warning/10 border-warning/30';
    case 'critical': return 'bg-destructive/10 border-destructive/30';
  }
}

/**
 * The line icon that marks a severity level.
 *
 * Returned as a component reference rather than a glyph: the design system
 * uses real line icons, not text dingbats, and a glyph string could not be
 * sized or coloured consistently with the surrounding text.
 */
export function getSeverityIcon(severity: RuleSeverity): React.ElementType {
  switch (severity) {
    case 'clean': return CheckCircle2;
    case 'warning': return AlertTriangle;
    case 'critical': return XCircle;
  }
}

export function getRuleModeColor(mode: RuleMode): string {
  return mode === 'strict' ? 'text-destructive-tint' : 'text-warning-tint';
}

// ============================================================================
// Rules Registry (for admin display)
// ============================================================================

export function getAllRules(): IntegrityRule[] {
  return [...RULES];
}