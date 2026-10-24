// ============================================================================
// QBase — The browser's RBAC, checked against the server's
//
// The client used to answer three questions on its own terms, and all three
// answers were NARROWER than the database's:
//
//   - who may read the whole register?  The server says
//     `prime_is_manager_or_admin()` — `admin`, `dept_head` AND `manager`.
//     The client said "admin only".
//   - who may edit a record that is not a draft?  The server says
//     `update_record_versioned` — `admin`, `manager`, `dept_head`.
//     The client said "not an employee", and a `manager` had been collapsed
//     into an employee by the auth layer.
//   - who may see THIS record?  The server's row policy
//     `records_read_dept_or_owner` grants the register to those three roles,
//     the record to its author (by id OR by e-mail), and the rest of the
//     department to the record's department.  The client had no owner branch
//     in `getRecord`, and it treated a record with no department as
//     unrestricted, while the server's `NULL = NULL` comparison is false.
//
// The client filter can only ever REMOVE a row the server has already
// allowed, so the rule "never wider than the server" holds by construction.
// These tests are the parity table between the two.
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  canEditNonDraft,
  canReadWholeRegister,
  canViewRecord,
  type CurrentUserSnapshot,
} from '@/services/recordStorage';

function user(over: Partial<CurrentUserSnapshot> = {}): CurrentUserSnapshot {
  return {
    userId: 'u-1',
    email: 'person@vezloo.ai',
    role: 'employee',
    serverRole: 'employee',
    department: 'Quality',
    ...over,
  };
}

describe('canReadWholeRegister — the mirror of prime_is_manager_or_admin()', () => {
  it('grants the whole register to admin, dept_head and manager', () => {
    expect(canReadWholeRegister(user({ role: 'admin', serverRole: 'admin' }))).toBe(true);
    expect(canReadWholeRegister(user({ role: 'dept_head', serverRole: 'dept_head' }))).toBe(true);
    expect(canReadWholeRegister(user({ role: 'employee', serverRole: 'manager' }))).toBe(true);
  });

  it('grants it to nobody else', () => {
    expect(canReadWholeRegister(user({ role: 'employee', serverRole: 'employee' }))).toBe(false);
    expect(canReadWholeRegister(user({ role: 'employee', serverRole: 'auditor' }))).toBe(false);
    expect(canReadWholeRegister(user({ role: 'employee', serverRole: 'moderator' }))).toBe(false);
    expect(canReadWholeRegister(user({ role: 'employee', serverRole: 'user' }))).toBe(false);
    expect(canReadWholeRegister(null)).toBe(false);
  });

  it('falls back to the approval role when the snapshot has no server role', () => {
    const legacy = user();
    delete legacy.serverRole;
    expect(canReadWholeRegister({ ...legacy, role: 'dept_head' })).toBe(true);
    expect(canReadWholeRegister({ ...legacy, role: 'admin' })).toBe(true);
    expect(canReadWholeRegister({ ...legacy, role: 'employee' })).toBe(false);
  });
});

describe('canEditNonDraft — the mirror of update_record_versioned', () => {
  it('lets admin, manager and dept_head edit a record that is not a draft', () => {
    expect(canEditNonDraft(user({ role: 'admin', serverRole: 'admin' }))).toBe(true);
    expect(canEditNonDraft(user({ role: 'employee', serverRole: 'manager' }))).toBe(true);
    expect(canEditNonDraft(user({ role: 'dept_head', serverRole: 'dept_head' }))).toBe(true);
  });

  it('lets an employee edit a draft only', () => {
    expect(canEditNonDraft(user({ role: 'employee', serverRole: 'employee' }))).toBe(false);
    expect(canEditNonDraft(user({ role: 'employee', serverRole: 'auditor' }))).toBe(false);
  });
});

describe('canViewRecord — the mirror of records_read_dept_or_owner', () => {
  const otherDepartment = { _createdBy: 'someone.else@vezloo.ai', _department: 'Sales' };
  const sameDepartment = { _createdBy: 'someone.else@vezloo.ai', _department: 'Quality' };
  const ownRecord = { _createdBy: 'person@vezloo.ai', _department: 'Sales' };
  const legacyOwnRecord = { _createdBy: 'u-1', _department: 'Sales' };
  const noDepartment = { _createdBy: 'someone.else@vezloo.ai', _department: null };

  it('lets a manager, a dept_head and an admin see every record', () => {
    for (const serverRole of ['admin', 'dept_head', 'manager'] as const) {
      const viewer = user({ role: 'employee', serverRole });
      expect(canViewRecord(viewer, otherDepartment)).toBe(true);
      expect(canViewRecord(viewer, noDepartment)).toBe(true);
    }
  });

  it('lets an employee see the record they created, by e-mail or by id', () => {
    const viewer = user();
    expect(canViewRecord(viewer, ownRecord)).toBe(true);
    expect(canViewRecord(viewer, legacyOwnRecord)).toBe(true);
  });

  it('lets an employee see a record of their own department', () => {
    expect(canViewRecord(user(), sameDepartment)).toBe(true);
  });

  it('refuses an employee a record of another department', () => {
    expect(canViewRecord(user(), otherDepartment)).toBe(false);
  });

  it('refuses an employee a record with no department', () => {
    // The server compares `prime_record_department(form_code) =
    // current_user_department()`, and a form with no department yields NULL:
    // the comparison is false, so such a record is its author's alone.
    expect(canViewRecord(user(), noDepartment)).toBe(false);
  });

  it('leaves the decision to the server when there is no snapshot', () => {
    // The rows that reach this function are the ones the server's own policy
    // allowed; without a snapshot the client knows nothing about the caller.
    expect(canViewRecord(null, otherDepartment)).toBe(true);
  });
});
