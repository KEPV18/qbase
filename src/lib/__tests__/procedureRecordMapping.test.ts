import { describe, it, expect } from 'vitest';
import {
  getRecordsForProcedure,
  getProcedureFormCodes,
} from '../procedureRecordMapping';
import { PROCEDURES_CONTENT } from '../ProceduresContent';

describe('procedureRecordMapping', () => {
  describe('getProcedureFormCodes', () => {
    it('derives the CAPA form from the procedure that names it', () => {
      // P/08 "Procedure for Correction and Corrective Action" writes
      // "CAPA Register (F/22)" in its own text.
      expect(getProcedureFormCodes('p08')).toContain('F/22');
    });

    it('derives the Review Minutes form from the Management Review procedure', () => {
      expect(getProcedureFormCodes('p04')).toContain('F/21');
    });

    it('does not link a form that is only cited as a numbering example', () => {
      // P/07 "Control of Document and Record" says
      //   "Examples: M/01, P/05, WI/03, F/22"
      //   "Records: Use same number as controlling document (e.g., F/22-001)"
      // Those illustrate the numbering scheme; they do NOT make F/22 a
      // record this procedure governs. Linking it would invent a
      // relationship the procedure never claimed.
      const codes = getProcedureFormCodes('p07');
      expect(codes).not.toContain('F/22');
      // …but the retention rule it really does state is still picked up.
      expect(codes).toContain('F/21');
    });

    it('returns only form codes that exist in the canonical schema registry', () => {
      for (const procedure of PROCEDURES_CONTENT) {
        for (const code of getProcedureFormCodes(procedure.id)) {
          expect(code).toMatch(/^F\/\d{2}$/);
        }
      }
    });

    it('returns an empty list for an unknown procedure', () => {
      expect(getProcedureFormCodes('does-not-exist')).toEqual([]);
    });
  });

  describe('getRecordsForProcedure', () => {
    it('returns the forms a procedure governs, with the live record count', () => {
      const records = [
        { serial: 'F/22-001', formCode: 'F/22', formName: 'Non-Conformity Report' },
        { serial: 'F/22-002', formCode: 'F/22', formName: 'Non-Conformity Report' },
        { serial: 'F/09-001', formCode: 'F/09', formName: 'Customer Complaint' },
      ];

      const related = getRecordsForProcedure('p08', records);

      const capa = related.find((r) => r.code === 'F/22');
      expect(capa).toBeDefined();
      expect(capa!.actualRecordCount).toBe(2);
      // The name comes from the canonical schema registry, not the record.
      expect(capa!.recordName).toBe('Non-Conformity Report');
    });

    it('lists a governed form with a count of 0 when no record exists yet', () => {
      // A procedure that governs a form nobody has filed still reports it —
      // the zero is a fact, and hiding it would misrepresent compliance.
      const related = getRecordsForProcedure('p05', []);
      expect(related.length).toBeGreaterThan(0);
      for (const record of related) {
        expect(record.actualRecordCount).toBe(0);
      }
    });

    it('returns an empty list for an unknown procedure', () => {
      expect(getRecordsForProcedure('does-not-exist', [])).toEqual([]);
    });

    it('ignores records with no usable formCode rather than throwing', () => {
      const records = [
        { serial: 'F/22-001', formCode: 'F/22' },
        null,
        undefined,
        { serial: 'no-code' },
        { formCode: 42 },
        'not-a-record',
      ];

      const related = getRecordsForProcedure('p08', records);
      const capa = related.find((r) => r.code === 'F/22');
      expect(capa!.actualRecordCount).toBe(1);
    });
  });
});
