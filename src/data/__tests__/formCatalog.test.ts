// ============================================================================
// QBase — Canonical form catalogue tests
//
// The app carried two catalogues that disagreed: the Forms Registry
// (documentation) and the unified schema (form templates). They named 15
// forms differently, sectioned 9 of them differently, and the registry never
// listed F/49 at all. The restored production records follow the registry, so
// the registry is the identity source and this module merges the two.
//
// These tests pin the merge: the catalogue must cover every form, name them
// the way the records do, and give each one a department and a cadence.
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  CANONICAL_FORMS,
  CANONICAL_SECTIONS,
  getCanonicalForm,
  getCanonicalFormName,
  getCanonicalFrequency,
  getCanonicalSectionLabel,
} from '../formCatalog';
import { FORMS_REGISTRY } from '../formsRegistry';
import { FORM_SCHEMAS } from '../formSchemas';
import { toPeriodicFrequency } from '@/lib/compliancePeriods';

describe('canonical form catalogue', () => {
  it('covers every form exactly once', () => {
    const codes = CANONICAL_FORMS.map(f => f.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.length).toBe(36);
  });

  it('covers every form the schema knows', () => {
    for (const schema of FORM_SCHEMAS) {
      expect(getCanonicalForm(schema.code), `${schema.code} missing from the catalogue`).toBeDefined();
    }
  });

  it('includes F/49, the form the registry used to omit', () => {
    const f49 = getCanonicalForm('F/49');
    expect(f49).toBeDefined();
    expect(f49!.name).toBe('Document Master List');
    expect(f49!.frequency).toBe('Monthly');
    expect(f49!.section).toBe(7);
  });

  it('names the forms the way the production records do', () => {
    // The records in the restored database carry these names; the unified
    // schema re-named 15 forms and never carried the change back.
    expect(getCanonicalFormName('F/11')).toBe('Production Plan');
    expect(getCanonicalFormName('F/12')).toBe('Non-Conforming');
    expect(getCanonicalFormName('F/18')).toBe('Product Re-Call');
    expect(getCanonicalFormName('F/24')).toBe('Objectives & Targets');
    expect(getCanonicalFormName('F/45')).toBe('Master List of Documents');
  });

  it('sections the forms the way the production records do', () => {
    expect(getCanonicalForm('F/11')!.section).toBe(2);   // Operations & Production
    expect(getCanonicalForm('F/13')!.section).toBe(4);   // Procurement & Vendors
    expect(getCanonicalForm('F/48')!.section).toBe(3);   // Quality & Audit
    expect(getCanonicalForm('F/35')!.section).toBe(6);   // R&D & Design
  });

  it('gives F/10 a monthly cadence, not "On event"', () => {
    // The registry entry said "On event" while the schema said "Monthly" and
    // the records file F/10 in January, July and August. Reading the wrong
    // cadence hid six missed monthly filings.
    expect(getCanonicalFrequency('F/10')).toBe('Monthly');
    expect(toPeriodicFrequency(getCanonicalFrequency('F/10'))).toBe('monthly');
  });

  it('gives every form a department that exists', () => {
    const names = new Set(CANONICAL_SECTIONS.map(s => s.name));
    for (const form of CANONICAL_FORMS) {
      expect(names.has(form.sectionName), `${form.code} → "${form.sectionName}"`).toBe(true);
    }
  });

  it('has exactly one department name per section number', () => {
    const bySection = new Map<number, Set<string>>();
    for (const form of CANONICAL_FORMS) {
      if (!bySection.has(form.section)) bySection.set(form.section, new Set());
      bySection.get(form.section)!.add(form.sectionName);
    }
    for (const [section, names] of bySection) {
      expect(names.size, `section ${section} has ${names.size} names`).toBe(1);
    }
  });

  it('schedules exactly the eleven forms that owe a periodic filing', () => {
    const periodic = CANONICAL_FORMS
      .filter(f => toPeriodicFrequency(f.frequency) !== null)
      .map(f => f.code)
      .sort();
    expect(periodic).toEqual([
      'F/10', 'F/11', 'F/15', 'F/16', 'F/24', 'F/25', 'F/35', 'F/40', 'F/42', 'F/48', 'F/49',
    ]);
  });

  it('agrees with the registry on every form it lists', () => {
    for (const entry of FORMS_REGISTRY) {
      const canonical = getCanonicalForm(entry.code)!;
      expect(canonical.name).toBe(entry.name);
      expect(canonical.frequency).toBe(entry.frequency);
      expect(canonical.section).toBe(entry.section);
    }
  });

  it('labels a section number with its department name', () => {
    expect(getCanonicalSectionLabel(3)).toBe('Quality & Audit');
    expect(getCanonicalSectionLabel(7)).toBe('Management & Documentation');
    expect(getCanonicalSectionLabel(99)).toBe('Section 99');
  });
});
