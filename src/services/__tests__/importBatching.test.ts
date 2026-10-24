// ============================================================================
// QBase — the import writes in batches, and a refused row is findable
//
// The import used to write one row per round trip.  It now writes in
// BATCHES: one batch = one transaction = the batch lands whole or not at
// all, and a big file is cut on the row count and on the measured size of
// the rows.
//
// Two things have to hold for that to be safe:
//
//   1. a batch is a run of WHOLE rows — the row number of the file has to
//      travel with the row, or a refusal cannot be reported against the
//      line the user can see in their own file;
//   2. the batch is cut on the size of what actually goes on the wire.
//
// The first one is what this file is about.  A batch that dropped the
// envelope would report "row 2" for a refusal that happened on row 401,
// and the user would go looking in the wrong place.
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { bulkCreateRecords } = vi.hoisted(() => ({ bulkCreateRecords: vi.fn() }));

// The batching helper is the code under test's own dependency, so it stays
// real; only the network call is mocked.
vi.mock('@/services/bulkRecordOps', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/bulkRecordOps')>();
  return { ...actual, bulkCreateRecords: (...args: unknown[]) => bulkCreateRecords(...args) };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: vi.fn(), from: vi.fn(), auth: { getUser: vi.fn() } },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

import { importFromJson } from '@/services/importService';
import { getFormSchema } from '@/data/formSchemas';
import { BULK_BATCH_SIZE } from '@/services/bulkRecordOps';

// ── the rows ────────────────────────────────────────────────────────────────

const CODE = 'F/08';

/** A row that carries every field the catalogue demands for this form. */
function rowData(): Record<string, unknown> {
  const schema = getFormSchema(CODE);
  const data: Record<string, unknown> = {};
  for (const field of schema?.fields ?? []) {
    if (field.required && field.key !== 'serial') data[field.key] = 'x';
  }
  return data;
}

function file(count: number): string {
  const rows = Array.from({ length: count }, (_, i) => ({
    serial: `${CODE}-${String(i + 1).padStart(3, '0')}`,
    form_type: CODE,
    form_data: rowData(),
  }));
  return JSON.stringify(rows);
}

/** What the server answers when everything in the batch is written. */
function committed(count: number) {
  return {
    committed: true,
    created: count,
    skipped: 0,
    failed: 0,
    rows: [],
    failures: [],
  };
}

beforeEach(() => {
  bulkCreateRecords.mockReset();
});

// ---------------------------------------------------------------------------

describe('the import', () => {
  it('writes a small file in ONE batch', async () => {
    bulkCreateRecords.mockResolvedValue(committed(3));

    const result = await importFromJson(file(3));

    expect(bulkCreateRecords).toHaveBeenCalledTimes(1);
    const [rows] = bulkCreateRecords.mock.calls[0] as [Array<{ form_code: string; serial: string }>];
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.form_code)).toEqual([CODE, CODE, CODE]);
    expect(result.imported).toBe(3);
    expect(result.failed).toBe(0);
    expect(result.success).toBe(true);
  });

  it('keeps the file\'s order inside the batch', async () => {
    bulkCreateRecords.mockResolvedValue(committed(3));

    await importFromJson(file(3));

    const [rows] = bulkCreateRecords.mock.calls[0] as [Array<{ serial: string }>];
    expect(rows.map((r) => r.serial)).toEqual([`${CODE}-001`, `${CODE}-002`, `${CODE}-003`]);
  });

  it('cuts a big file into whole batches', async () => {
    bulkCreateRecords.mockImplementation(async (rows: unknown[]) => committed(rows.length));

    const total = BULK_BATCH_SIZE + 1;
    const result = await importFromJson(file(total));

    expect(bulkCreateRecords).toHaveBeenCalledTimes(2);
    const first = bulkCreateRecords.mock.calls[0][0] as unknown[];
    const second = bulkCreateRecords.mock.calls[1][0] as unknown[];
    expect(first).toHaveLength(BULK_BATCH_SIZE);
    expect(second).toHaveLength(1);
    expect(result.imported).toBe(total);
  });

  it('reports a refused row against the row of the FILE', async () => {
    // The server refuses the SECOND row of the batch — which is the second
    // row of the file here, but would be the second row of a LATER batch
    // if the file were bigger.  The number the user is told has to be the
    // file's, not the batch's.
    let call = 0;
    bulkCreateRecords.mockImplementation(async (rows: Array<{ serial: string }>) => {
      call += 1;
      if (call > 1) return committed(rows.length); // the retry of the good rows
      const failing = rows.findIndex((r) => r.serial === `${CODE}-002`);
      return {
        committed: false,
        created: 0,
        skipped: 0,
        failed: 1,
        rows: [],
        failures: [{ index: failing + 1, serial: rows[failing]?.serial, error: 'refused by the server' }],
      };
    });

    const result = await importFromJson(file(3));

    expect(result.failed).toBe(1);
    expect(result.errors[0].row).toBe(2);
    expect(result.errors[0].serial).toBe(`${CODE}-002`);
  });

  it('keeps the file\'s row number when the refusal is in a LATER batch', async () => {
    // 500 rows in the first batch, and the refusal in the second one: the
    // failure's index inside its batch is 1, but the row of the file is
    // 501.  Reporting "row 1" would send the user to the wrong line.
    bulkCreateRecords.mockImplementation(async (rows: Array<{ serial: string }>) => {
      if (rows[0]?.serial !== `${CODE}-501`) return committed(rows.length);
      return {
        committed: false,
        created: 0,
        skipped: 0,
        failed: 1,
        rows: [],
        failures: [{ index: 1, serial: rows[0].serial, error: 'refused by the server' }],
      };
    });

    const result = await importFromJson(file(BULK_BATCH_SIZE + 1));

    expect(result.failed).toBe(1);
    expect(result.errors[0].row).toBe(BULK_BATCH_SIZE + 1);
    expect(result.errors[0].serial).toBe(`${CODE}-501`);
  });

  it('sends the good rows again when the invalid ones are skipped', async () => {
    // "Skip the invalid rows" means exactly that: the bad row is reported
    // and dropped, and the good ones are written.  The retry is atomic
    // too — it writes ALL of the good rows or none of them.
    let call = 0;
    bulkCreateRecords.mockImplementation(async (rows: Array<{ serial: string }>) => {
      call += 1;
      if (call === 1) {
        return {
          committed: false,
          created: 0,
          skipped: 0,
          failed: 1,
          rows: [],
          failures: [{ index: 2, serial: rows[1]?.serial, error: 'refused by the server' }],
        };
      }
      return committed(rows.length);
    });

    const result = await importFromJson(file(3), { skipInvalidRows: true });

    expect(bulkCreateRecords).toHaveBeenCalledTimes(2);
    const retry = bulkCreateRecords.mock.calls[1][0] as Array<{ serial: string }>;
    // The refused row is NOT in the retry; the other two are.
    expect(retry.map((r) => r.serial)).toEqual([`${CODE}-001`, `${CODE}-003`]);
    expect(result.imported).toBe(2);
    expect(result.failed).toBe(1);
  });

  it('writes NOTHING when the invalid rows are not to be skipped', async () => {
    bulkCreateRecords.mockResolvedValue({
      committed: false,
      created: 0,
      skipped: 0,
      failed: 1,
      rows: [],
      failures: [{ index: 2, serial: `${CODE}-002`, error: 'refused by the server' }],
    });

    const result = await importFromJson(file(3), { skipInvalidRows: false });

    // The batch is not retried, and the import is not a success.
    expect(bulkCreateRecords).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(false);
    expect(result.imported).toBe(0);
    expect(result.failed).toBe(1);
  });

  it('writes nothing at all on a dry run', async () => {
    const result = await importFromJson(file(3), { dryRun: true });

    expect(bulkCreateRecords).not.toHaveBeenCalled();
    expect(result.imported).toBe(3);
  });
});
