import { describe, it, expect } from 'vitest';
import { isValidTransition, getAllowedNextStatuses, parseStatusFromAuditField, statusToAuditField, getStatusBadgeClass, getStatusStats } from '../lib/statusService';

describe('statusService', () => {
  describe('isValidTransition', () => {
    it('should allow draft to pending_review', () => {
      expect(isValidTransition('draft', 'pending_review')).toBe(true);
    });

    it('should allow pending_review to approved', () => {
      expect(isValidTransition('pending_review', 'approved')).toBe(true);
    });

    it('should allow pending_review to rejected', () => {
      expect(isValidTransition('pending_review', 'rejected')).toBe(true);
    });

    it('should allow rejected to draft', () => {
      expect(isValidTransition('rejected', 'draft')).toBe(true);
    });

    it('should not allow approved to any state', () => {
      expect(isValidTransition('approved', 'draft')).toBe(false);
      expect(isValidTransition('approved', 'pending_review')).toBe(false);
    });
  });

  describe('getAllowedNextStatuses', () => {
    it('should return allowed transitions for draft', () => {
      expect(getAllowedNextStatuses('draft')).toEqual(['pending_review']);
    });

    it('should return allowed transitions for pending_review', () => {
      expect(getAllowedNextStatuses('pending_review')).toEqual(['approved', 'rejected']);
    });

    it('should return empty array for approved', () => {
      expect(getAllowedNextStatuses('approved')).toEqual([]);
    });
  });

  describe('parseStatusFromAuditField', () => {
    it('should return approved when reviewed is true', () => {
      expect(parseStatusFromAuditField('anything', true, false)).toBe('approved');
    });

    it('should return pending_review when has files but not reviewed', () => {
      expect(parseStatusFromAuditField('Pending Review', false, true)).toBe('pending_review');
    });

    it('should parse rejected from text', () => {
      expect(parseStatusFromAuditField('Rejected', false, false)).toBe('rejected');
      expect(parseStatusFromAuditField('NC ❌', false, false)).toBe('rejected');
    });
  });

  describe('statusToAuditField', () => {
    it('should convert status to audit string', () => {
      expect(statusToAuditField('approved')).toBe('Approved');
      expect(statusToAuditField('rejected')).toBe('Rejected');
      expect(statusToAuditField('pending_review')).toBe('Pending Review');
      expect(statusToAuditField('draft')).toBe('Draft');
    });
  });

  describe('getStatusBadgeClass', () => {
    it('should return correct color classes', () => {
      expect(getStatusBadgeClass('draft')).toContain('gray');
      expect(getStatusBadgeClass('pending_review')).toContain('yellow');
      expect(getStatusBadgeClass('approved')).toContain('green');
      expect(getStatusBadgeClass('rejected')).toContain('red');
    });
  });

  describe('getStatusStats', () => {
    it('should calculate stats from records', () => {
      const records = [
        { auditStatus: 'Approved', reviewed: true, actualRecordCount: 1 },
        { auditStatus: 'Pending', reviewed: false, actualRecordCount: 2 },
        { auditStatus: 'Draft', reviewed: false, actualRecordCount: 0 },
      ];
      const stats = getStatusStats(records);
      expect(stats.total).toBe(3);
      expect(stats.approved).toBe(1);
    });
  });
});