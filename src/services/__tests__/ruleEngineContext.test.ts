// ============================================================================
// QBase — The rule engine's index, and the parity it must keep
//
// Every scanning rule used to look for the records of another form with
// `allRecords.filter(r => r.formCode === 'F/28')` INSIDE its own check, so
// evaluating the register cost O(n²): one full scan of the record array, per
// record, per rule.  The engine now builds ONE index (`buildRuleContext`)
// and hands it to every rule, and the second parameter of
// `evaluateRulesForRecord` is that index — so the slow shape cannot be
// typed back in.
//
// Three things are pinned here:
//   1. the index answers what a scan answered (parity of the signals),
//   2. the register evaluation no longer scans the record array, and
//   3. the register evaluation and the per-record evaluation agree.
// ============================================================================

import { describe, it, expect } from 'vitest';
import * as ruleEngine from '@/services/ruleEngine';
import {
  buildRuleContext,
  evaluateAllRecords,
  evaluateRegister,
  evaluateRulesForRecord,
  getAllRules,
} from '@/services/ruleEngine';
import type { RecordData } from '@/components/forms/DynamicFormRenderer';

function rec(formCode: string, serial: string, extra: Record<string, unknown> = {}): RecordData {
  return { formCode, serial, ...extra } as unknown as RecordData;
}

const F43 = rec('F/43', 'F/43-001', { project: 'Aluminium Line', training_date: '2026-01-15' });
const F28 = rec('F/28', 'F/28-001', { project: 'Aluminium Line' });
const F22_MISSING = rec('F/22', 'F/22-001', { nc_reference: 'F/12-099' });
const F22_PRESENT = rec('F/22', 'F/22-002', { nc_reference: 'F/12-001' });
const F12 = rec('F/12', 'F/12-001');
const F08 = rec('F/08', 'F/08-001');

function ruleIds(signals: { ruleId: string }[]): string[] {
  return signals.map((s) => s.ruleId);
}

/** An array that counts how often the rules scan it. */
function countedRecords(records: RecordData[]): { records: RecordData[]; scans: () => number } {
  let scans = 0;
  const wrapped = records.slice() as RecordData[];
  const original = wrapped.filter;
  wrapped.filter = function (this: unknown, ...args: unknown[]) {
    scans += 1;
    return (original as unknown as (...a: unknown[]) => unknown[]).apply(this, args);
  } as unknown as typeof wrapped.filter;
  return { records: wrapped, scans: () => scans };
}

describe('buildRuleContext — the index the rules read', () => {
  it('groups the records by form code, in register order', () => {
    const ctx = buildRuleContext([F43, F28, F22_MISSING, F12]);
    expect(ctx.byFormCode.get('F/43')).toEqual([F43]);
    expect(ctx.byFormCode.get('F/28')).toEqual([F28]);
    expect(ctx.byFormCode.get('F/12')).toEqual([F12]);
    expect(ctx.byFormCode.get('F/99')).toBeUndefined();
  });

  it('collects the serials of every form and of the whole register', () => {
    const ctx = buildRuleContext([F43, F28, F22_MISSING, F22_PRESENT, F12]);
    expect(ctx.serialsByFormCode.get('F/12')?.has('F/12-001')).toBe(true);
    expect(ctx.serialsByFormCode.get('F/12')?.has('F/12-099')).toBe(false);
    expect(ctx.serials.has('F/22-002')).toBe(true);
  });

  it('ignores a record with no form code or no serial', () => {
    const ctx = buildRuleContext([rec('', ''), F43]);
    expect(ctx.byFormCode.get('')).toBeUndefined();
    expect(ctx.serials.has('')).toBe(false);
    expect(ctx.byFormCode.get('F/43')).toHaveLength(1);
  });
});

describe('the scanning rules read the index, and reach the same verdict', () => {
  it('REF-F43-F28 fires when the register holds no F/28', () => {
    const ctx = buildRuleContext([F43]);
    const signals = evaluateRulesForRecord(F43, ctx);
    expect(ruleIds(signals)).toContain('REF-F43-F28');
  });

  it('REF-F43-F28 stays quiet when an F/28 exists', () => {
    const ctx = buildRuleContext([F43, F28]);
    const signals = evaluateRulesForRecord(F43, ctx);
    expect(ruleIds(signals)).not.toContain('REF-F43-F28');
  });

  it('REF-F22-F12 fires only for a reference that is not in the register', () => {
    const ctx = buildRuleContext([F22_MISSING, F22_PRESENT, F12]);
    expect(ruleIds(evaluateRulesForRecord(F22_MISSING, ctx))).toContain('REF-F22-F12');
    expect(ruleIds(evaluateRulesForRecord(F22_PRESENT, ctx))).not.toContain('REF-F22-F12');
  });

  it('DEP-F08-F19 fires when the register holds no F/19', () => {
    const ctx = buildRuleContext([F08]);
    expect(ruleIds(evaluateRulesForRecord(F08, ctx))).toContain('DEP-F08-F19');
  });
});

describe('the register evaluation is linear, not quadratic', () => {
  it('never scans the record array while evaluating the register', () => {
    const { records, scans } = countedRecords([F43, F28, F22_MISSING, F22_PRESENT, F12, F08]);
    evaluateRegister(records);
    // The old engine filtered the whole array once per record, per rule.
    expect(scans()).toBe(0);
  });
});

describe('the register evaluation and the per-record evaluation agree', () => {
  const records = [F43, F28, F22_MISSING, F22_PRESENT, F12, F08];

  it('reports the same signals for every record', () => {
    const ctx = buildRuleContext(records);
    const evaluation = evaluateRegister(records);

    for (const record of records) {
      const report = evaluation.reports.find((r) => r.recordSerial === record.serial);
      const direct = evaluateRulesForRecord(record, ctx);
      expect(report ? ruleIds(report.signals) : []).toEqual(ruleIds(direct));
    }
  });

  it('keeps `evaluateAllRecords` equal to the reports of `evaluateRegister`', () => {
    expect(evaluateAllRecords(records).map((r) => r.recordSerial))
      .toEqual(evaluateRegister(records).reports.map((r) => r.recordSerial));
  });

  it('lists the missing references and the missing dependencies once', () => {
    const evaluation = evaluateRegister(records);
    // The F/22 record points at an F/12 that is not in the register.
    expect(evaluation.missingReferences.map((r) => r.fromSerial)).toEqual(['F/22-001']);
    // F/08 exists and F/19 does not — but a single record is not enough to
    // call it a missing dependency (the rule needs three).
    expect(evaluation.missingDependencies).toEqual([]);
  });
});

describe('every rule is a warning, and the mode cannot be switched from code', () => {
  it('reports every rule in "warn" mode', () => {
    for (const rule of getAllRules()) {
      expect(rule.mode).toBe('warn');
    }
  });

  it('no longer exports a way to switch a rule to "strict"', () => {
    // The old `setRuleMode` mutated this module's in-memory RULES array; the
    // server never saw the change and no caller existed, so a rule set that
    // could be switched in one tab and not in another was a rule set nobody
    // could reason about.
    const exported = ruleEngine as unknown as Record<string, unknown>;
    expect(exported.setRuleMode).toBeUndefined();
  });
});
