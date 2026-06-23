// ============================================================================
// QBase — Bulk Create for Monthly Forms
// Creates placeholder records for missing months.
// ============================================================================

import { createRecord } from '@/services/recordStorage';
import type { RecordData } from '@/components/forms/DynamicFormRenderer';
import { getFormSchema } from '@/data/formSchemas';
import { getMissingMonths } from './temporalUtils';

export interface BulkCreateResult {
  formCode: string;
  created: number;
  failed: { month: string; error: string }[];
}

/**
 * Create placeholder records for all missing months of a monthly form.
 * Each record is tagged with coverage_period in form_data.
 */
export async function bulkCreateMissingMonths(
  records: RecordData[],
  formCode: string,
  userId: string,
  userName: string,
): Promise<BulkCreateResult> {
  const missing = getMissingMonths(records, formCode);
  const created: string[] = [];
  const failed: { month: string; error: string }[] = [];

  const schema = getFormSchema(formCode);

  for (const month of missing) {
    try {
      const record: RecordData = {
        formCode,
        formName: schema?.name || '',
        form_data: {
          coverage_period: month,
          record_month: month,
        },
        _section: schema?.section ?? null,
        _sectionName: schema?.sectionName || null,
        _frequency: schema?.frequency || null,
        _status: 'pending_review',
        _createdAt: new Date().toISOString(),
        _createdBy: userId,
        serial: 'auto',
      };
      const result = await createRecord(record);
      if (result.success) {
        created.push(month);
      } else {
        failed.push({ month, error: result.error || 'Unknown error' });
      }
    } catch (err) {
      failed.push({ month, error: (err as Error).message });
    }
  }

  return { formCode, created: created.length, failed };
}
