// ============================================================================
// QBase — the bulk write path
//
// The register was written ONE ROW AT A TIME: the import looped over the
// rows and called the single create for each one, and approving N records
// cost 2N round trips.  These tests pin the bulk path that replaced it:
//
//   * an import of N rows is ONE round trip, not N;
//   * a batch lands WHOLE or NOT AT ALL — a refused batch writes nothing,
//     the offending row is dropped and the rest are re-sent;
//   * a serial that is already live is SKIPPED, never overwritten;
//   * a row with no serial gets one from the server;
//   * a row's `form_data` travels exactly as the file carries it — no key
//     added, no key taken away;
//   * a RESTORE writes back a record that already existed, so it asks the
//     server for the completeness exemption (`p_allow_incomplete`) and the
//     register's own incomplete records come back instead of being dropped.
//
// Every assertion here is about the Zero Data Loss rule: nothing that
// exists is overwritten, and nothing that is written is silently altered.
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// The Supabase client is the only thing that touches the network in these
// tests, so it is the only thing that is mocked.
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

import { importFromJson } from '@/services/importService';
import { bulkCreateRecords, bulkTransitionRecords, chunkRows, type BulkRow } from '@/services/bulkRecordOps';
import { importBackup } from '@/services/backupService';

// ---------------------------------------------------------------------------
// The mocked server
// ---------------------------------------------------------------------------

/** The payload the client sends to `bulk_create_records`. */
interface RpcArgs {
  p_rows?: BulkRow[];
  p_ids?: string[];
  p_target_status?: string;
  p_reason?: string | null;
  p_skip_existing?: boolean;
  p_allow_incomplete?: boolean;
}

/** A call to `bulk_create_records` that accepts the whole batch. */
function serverAcceptsAll() {
  rpc.mockImplementation(async (_fn: string, args: RpcArgs) => {
    const rows = args.p_rows ?? [];
    return {
      data: {
        committed: true,
        created: rows.length,
        skipped: 0,
        failed: 0,
        rows: rows.map((r, i) => ({ index: i + 1, id: `id-${i + 1}`, serial: r.serial, status: 'created' })),
        failures: [],
      },
      error: null,
    };
  });
}

/** A call to `bulk_create_records` that refuses the rows at `badIndexes`. */
function serverRefuses(badIndexes: number[], message = 'Missing required fields: client_name') {
  rpc.mockImplementation(async (_fn: string, args: RpcArgs) => {
    const rows = args.p_rows ?? [];
    const failures = badIndexes.map(i => ({
      index: i,
      serial: rows[i - 1]?.serial ?? '',
      error: message,
    }));
    return {
      data: {
        committed: false,
        created: 0,
        skipped: 0,
        failed: failures.length,
        rows: [],
        failures,
      },
      error: null,
    };
  });
}

/** The payload of the nth `bulk_create_records` call. */
function callArgs(n = 0): RpcArgs {
  return rpc.mock.calls[n][1] as RpcArgs;
}

/** The rows of the nth `bulk_create_records` call. */
function callRows(n = 0): BulkRow[] {
  return callArgs(n).p_rows ?? [];
}

beforeEach(() => {
  rpc.mockReset();
  serverAcceptsAll();
});

// ---------------------------------------------------------------------------
// The import — one call, one transaction
// ---------------------------------------------------------------------------

/** A row the catalogue accepts: F/08 needs its client name. */
const validRow = (i: number) => ({
  form_type: 'F/08',
  form_data: { client_name: `Client ${i}` },
});

describe('the bulk import — one call, not one call per row', () => {
  it('writes 50 rows in ONE round trip', async () => {
    const rows = Array.from({ length: 50 }, (_, i) => validRow(i));
    const result = await importFromJson(JSON.stringify(rows));

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(callRows()).toHaveLength(50);
    expect(result.imported).toBe(50);
    expect(result.failed).toBe(0);
  });

  it('writes 500 rows in ONE round trip — the server limit, and one transaction', async () => {
    const rows = Array.from({ length: 500 }, (_, i) => validRow(i));
    const result = await importFromJson(JSON.stringify(rows));

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(result.imported).toBe(500);
  });

  it('cuts a bigger file into whole batches, never into loose rows', async () => {
    const rows = Array.from({ length: 1200 }, (_, i) => validRow(i));
    const result = await importFromJson(JSON.stringify(rows));

    // 1200 rows / 500 per batch = 3 batches, not 1200 calls.
    expect(rpc).toHaveBeenCalledTimes(3);
    expect(callRows(0)).toHaveLength(500);
    expect(callRows(1)).toHaveLength(500);
    expect(callRows(2)).toHaveLength(200);
    expect(result.imported).toBe(1200);
  });

  it('keeps the order of the file', async () => {
    const rows = [
      { form_type: 'F/08', form_data: { client_name: 'First' } },
      { form_type: 'F/08', form_data: { client_name: 'Second' } },
      { form_type: 'F/08', form_data: { client_name: 'Third' } },
    ];
    await importFromJson(JSON.stringify(rows));
    expect(callRows().map((r) => r.form_data.client_name)).toEqual(['First', 'Second', 'Third']);
  });
});

// ---------------------------------------------------------------------------
// The import — a batch lands whole or not at all
// ---------------------------------------------------------------------------

describe('the bulk import — a refused batch writes nothing', () => {
  it('drops the offending row and re-sends the rest', async () => {
    rpc.mockReset();
    // First call: the server refuses row 2.  Second call: it accepts what
    // is left.
    rpc
      .mockImplementationOnce(async () => ({
        data: {
          committed: false, created: 0, skipped: 0, failed: 1, rows: [],
          failures: [{ index: 2, serial: '', error: 'Missing required fields: client_name' }],
        },
        error: null,
      }))
      .mockImplementationOnce(async (_fn: string, args: RpcArgs) => {
        const rows = args.p_rows ?? [];
        return {
          data: {
            committed: true, created: rows.length, skipped: 0, failed: 0,
            rows: rows.map((_r, i) => ({ index: i + 1, status: 'created' })),
            failures: [],
          },
          error: null,
        };
      });

    const result = await importFromJson(JSON.stringify([validRow(1), validRow(2), validRow(3)]));

    expect(rpc).toHaveBeenCalledTimes(2);
    // The retry carries the two good rows only.
    expect(callRows(1)).toHaveLength(2);
    expect(callRows(1).map((r) => r.form_data.client_name)).toEqual(['Client 1', 'Client 3']);
    expect(result.imported).toBe(2);
    expect(result.failed).toBe(1);
  });

  it('stops at the refusal when the operator asked not to skip invalid rows', async () => {
    rpc.mockReset();
    serverRefuses([1]);

    const result = await importFromJson(JSON.stringify([validRow(1), validRow(2)]), {
      skipInvalidRows: false,
    });

    // One call: the import stopped, and nothing was written.
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(false);
    expect(result.imported).toBe(0);
    expect(result.failed).toBeGreaterThan(0);
  });

  it('reports a server error without pretending anything was written', async () => {
    rpc.mockReset();
    rpc.mockResolvedValue({ data: null, error: { message: 'permission denied' } });

    const result = await importFromJson(JSON.stringify([validRow(1)]));

    expect(result.imported).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors[0].error).toContain('permission denied');
  });
});

// ---------------------------------------------------------------------------
// The import — a live record is never overwritten
// ---------------------------------------------------------------------------

describe('the bulk import — a live serial is skipped, not failed', () => {
  it('counts a duplicate serial as skipped', async () => {
    rpc.mockReset();
    rpc.mockResolvedValue({
      data: {
        committed: true, created: 1, skipped: 1, failed: 0,
        rows: [
          { index: 1, serial: 'F/08-001', status: 'created' },
          { index: 2, serial: 'F/08-001', status: 'skipped', detail: 'a live record already carries this serial' },
        ],
        failures: [],
      },
      error: null,
    });

    const result = await importFromJson(JSON.stringify([
      { serial: 'F/08-001', form_type: 'F/08', form_data: { client_name: 'A' } },
      { serial: 'F/08-001', form_type: 'F/08', form_data: { client_name: 'B' } },
    ]));

    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.skippedRows[0].serial).toBe('F/08-001');
  });

  it('asks the server to skip an existing serial rather than to replace it', async () => {
    await importFromJson(JSON.stringify([validRow(1)]));
    expect(callArgs().p_skip_existing).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The import — the serial
// ---------------------------------------------------------------------------

describe('the bulk import — the serial', () => {
  it('keeps the serial the file carries', async () => {
    await importFromJson(JSON.stringify([
      { serial: 'F/08-001', form_type: 'F/08', form_data: { client_name: 'A' } },
    ]));
    expect(callRows()[0].serial).toBe('F/08-001');
  });

  it('takes the serial out of the source form_data, and leaves the source untouched', async () => {
    await importFromJson(JSON.stringify([
      { form_type: 'F/08', form_data: { client_name: 'A', serial: 'F/08-002' } },
    ]));
    const row = callRows()[0];
    expect(row.serial).toBe('F/08-002');
    // The form_data travels whole — the serial key is still in it.
    expect(row.form_data.serial).toBe('F/08-002');
    expect(row.form_data.client_name).toBe('A');
  });

  it('asks the server for a serial when the row carries none', async () => {
    await importFromJson(JSON.stringify([validRow(1)]));
    expect(callRows()[0].serial).toBeUndefined();
  });

  it('never files a record under a value that is not a serial', async () => {
    // The live register holds F/19 rows whose `form_data.serial` is a
    // sentence.  A record filed under a sentence is a record nobody finds.
    await importFromJson(JSON.stringify([
      { form_type: 'F/19', form_data: { product_name: 'P', serial: 'a sentence about the product' } },
    ]));
    expect(callRows()[0].serial).toBeUndefined();
  });

  it('accepts a legacy serial', async () => {
    await importFromJson(JSON.stringify([
      { serial: 'CAPA-25-001', form_type: 'CAPA REGISTER', form_data: { note: 'a live CAPA row' } },
    ]));
    expect(callRows()[0].serial).toBe('CAPA-25-001');
    expect(callRows()[0].form_code).toBe('CAPA REGISTER');
  });
});

// ---------------------------------------------------------------------------
// The import — the form
// ---------------------------------------------------------------------------

describe('the bulk import — the form is resolved, never guessed', () => {
  it('takes the code as it is', async () => {
    await importFromJson(JSON.stringify([validRow(1)]));
    expect(callRows()[0].form_code).toBe('F/08');
  });

  it('resolves the catalogue name', async () => {
    await importFromJson(JSON.stringify([
      { form_type: 'Order Form', form_data: { client_name: 'A' } },
    ]));
    expect(callRows()[0].form_code).toBe('F/08');
  });

  it('resolves the name the document itself prints', async () => {
    await importFromJson(JSON.stringify([
      { form_type: 'Disposal of Non-Conforming Products', form_data: { date: '2026-10-24' } },
    ]));
    expect(callRows()[0].form_code).toBe('F/12');
  });

  it('resolves a name the records were filed under in the past', async () => {
    await importFromJson(JSON.stringify([
      { form_type: 'Monthly Production Plan', form_data: { month: '2026-10', date: '2026-10-24', prepared_by: 'A', signature: 'A' } },
    ]));
    expect(callRows()[0].form_code).toBe('F/11');
  });

  it('refuses a form the catalogue does not know', async () => {
    const result = await importFromJson(JSON.stringify([
      { form_type: 'A Form From Nowhere', form_data: { x: 1 } },
    ]));
    expect(result.failed).toBe(1);
    expect(result.errors[0].error).toContain('Unknown form type');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('files the record under the catalogue name and the catalogue department', async () => {
    await importFromJson(JSON.stringify([validRow(1)]));
    const row = callRows()[0];
    expect(row.form_name).toBe('Order Form');
    // F/08 is filed in section 1 — the same place every live F/08 record is.
    expect(row.section).toBe(1);
    expect(row.section_name).toBe('Sales & Customer Service');
  });
});

// ---------------------------------------------------------------------------
// The import — the data is carried as it is
// ---------------------------------------------------------------------------

describe('the bulk import — the data is carried as it is', () => {
  it('refuses a row with no form data at all', async () => {
    const result = await importFromJson(JSON.stringify([
      { form_type: 'F/08', form_data: {} },
    ]));
    expect(result.failed).toBe(1);
    expect(result.errors[0].error).toContain('no form data');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('refuses a row that misses a required field', async () => {
    const result = await importFromJson(JSON.stringify([
      { form_type: 'F/08', form_data: { something_else: 'x' } },
    ]));
    expect(result.failed).toBe(1);
    expect(result.errors[0].error).toContain('Missing required fields: client_name');
  });

  it('keeps a key the schema does not declare', async () => {
    await importFromJson(JSON.stringify([
      { form_type: 'F/08', form_data: { client_name: 'A', a_field_the_schema_never_heard_of: 'kept' } },
    ]));
    expect(callRows()[0].form_data.a_field_the_schema_never_heard_of).toBe('kept');
  });

  it('carries a row the schema does not quite accept, and says so', async () => {
    // The live register holds F/48 records whose `audit_type` the option
    // list never had.  Refusing them would lose a record people can read.
    const result = await importFromJson(JSON.stringify([
      {
        form_type: 'F/48',
        form_data: { date: '2026-10-24', audit_type: 'Internal Quality Audit', auditor_signature: 'Signed' },
      },
    ]));

    expect(result.failed).toBe(0);
    expect(result.imported).toBe(1);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].message).toContain('Carried as it is');
    // And the value travelled unchanged.
    expect(callRows()[0].form_data.audit_type).toBe('Internal Quality Audit');
  });

  it('a dry run writes nothing', async () => {
    const result = await importFromJson(JSON.stringify([validRow(1), validRow(2)]), { dryRun: true });
    expect(rpc).not.toHaveBeenCalled();
    expect(result.imported).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// The restore
// ---------------------------------------------------------------------------

/** Encrypt a payload the way `backupService` does, so the test reads a
 *  real backup file rather than a stand-in for one. */
async function encryptBackup(payload: unknown, password: string) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  );
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(JSON.stringify(payload)));
  const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
  return {
    meta: { version: 'qbase-backup-v1', exportedAt: new Date().toISOString(), recordCount: 1, tables: ['records'], checksum: '' },
    salt: b64(salt),
    iv: b64(iv),
    ciphertext: b64(new Uint8Array(ciphertext)),
  };
}

/** The checksum `backupService` writes. */
function simpleHash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h).toString(16);
}

/** A backup file holding the given records. */
async function backupFile(records: unknown[], password = 'the-password') {
  const backup = await encryptBackup(records, password);
  backup.meta.checksum = simpleHash(JSON.stringify(records));
  return new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' });
}

describe('the restore — a record that already existed comes back as it is', () => {
  it('asks the server for the completeness exemption', async () => {
    const record = {
      form_code: 'F/21',
      form_name: 'Review Minutes',
      // The live register holds F/21 rows without an `item` and F/22 rows
      // without a `date`.  A restore must bring THOSE back, not drop them.
      form_data: { meeting_date: '2026-10-24', discussion_points: 'a discussion' },
      serial: 'F/21-001',
      status: 'approved',
      section: 2,
      section_name: 'Management Review',
      frequency: 'On event',
      created_by: 'someone@qbase.test',
    };

    const result = await importBackup(await backupFile([record]), 'the-password');

    expect(result.imported).toBe(1);
    expect(callArgs().p_allow_incomplete).toBe(true);
    expect(callArgs().p_reason).toBe('restored_from_backup');
    // The data travelled whole.
    expect(callRows()[0].form_data).toEqual(record.form_data);
  });

  it('never asks to overwrite a live record', async () => {
    const record = { form_code: 'F/08', form_data: { client_name: 'A' }, serial: 'F/08-001', status: 'draft' };

    await importBackup(await backupFile([record]), 'the-password');

    expect(callArgs().p_skip_existing).toBe(true);
  });

  it('reports a skipped row as skipped, not as an error', async () => {
    rpc.mockReset();
    rpc.mockResolvedValue({
      data: {
        committed: true, created: 0, skipped: 1, failed: 0,
        rows: [{ index: 1, serial: 'F/08-001', status: 'skipped', detail: 'a live record already carries this serial' }],
        failures: [],
      },
      error: null,
    });

    const record = { form_code: 'F/08', form_data: { client_name: 'A' }, serial: 'F/08-001', status: 'draft' };
    const result = await importBackup(await backupFile([record]), 'the-password');

    expect(result.skipped).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(result.success).toBe(true);
  });

  it('refuses a file whose password is wrong', async () => {
    const record = { form_code: 'F/08', form_data: { client_name: 'A' }, serial: 'F/08-001', status: 'draft' };
    const file = await backupFile([record], 'the-right-password');

    await expect(importBackup(file, 'the-wrong-password')).rejects.toThrow(/Decryption failed/);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('falls back to the old call shape on a server that has not been migrated, and says so', async () => {
    // The server does not know the fourth argument yet: PostgREST answers
    // "does not exist".  The import must still work — and the RESTORE must
    // say that the incomplete records may have been refused, because a
    // record that is quietly left out is a record that is quietly lost.
    rpc.mockReset();
    rpc.mockImplementation(async (_fn: string, args: RpcArgs) => {
      if ('p_allow_incomplete' in args) {
        return {
          data: null,
          error: { code: 'PGRST202', message: 'Could not find the function public.bulk_create_records(p_rows, p_reason, p_skip_existing, p_allow_incomplete) in the schema cache' },
        };
      }
      const rows = args.p_rows ?? [];
      return {
        data: { committed: true, created: rows.length, skipped: 0, failed: 0, rows: [], failures: [] },
        error: null,
      };
    });

    const record = { form_code: 'F/21', form_data: { meeting_date: '2026-10-24' }, serial: 'F/21-001', status: 'draft' };
    const result = await importBackup(await backupFile([record]), 'the-password');

    expect(rpc).toHaveBeenCalledTimes(2);
    expect('p_allow_incomplete' in callArgs(0)).toBe(true);
    expect('p_allow_incomplete' in callArgs(1)).toBe(false);
    expect(result.imported).toBe(1);
    expect(result.errors.join(' ')).toContain('does not have the restore-safe bulk create');
  });
});

// ---------------------------------------------------------------------------
// The bulk transition
// ---------------------------------------------------------------------------

describe('the bulk transition — one call moves the whole queue', () => {
  it('moves N records in ONE call', async () => {
    rpc.mockResolvedValue({
      data: { committed: true, moved: 3, refused: 0, rows: [] },
      error: null,
    });

    const ids = ['a', 'b', 'c'];
    const outcome = await bulkTransitionRecords(ids, 'approved', 'a reason');

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(callArgs().p_ids).toEqual(ids);
    expect(callArgs().p_target_status).toBe('approved');
    expect(outcome.moved).toBe(3);
  });

  it('reports the ids the server refused, and says the others still moved', async () => {
    rpc.mockResolvedValue({
      data: {
        committed: true, moved: 2, refused: 1,
        rows: [
          { id: 'a', status: 'transitioned' },
          { id: 'b', status: 'refused', error: 'not allowed' },
          { id: 'c', status: 'transitioned' },
        ],
      },
      error: null,
    });

    const outcome = await bulkTransitionRecords(['a', 'b', 'c'], 'approved');

    expect(outcome.moved).toBe(2);
    expect(outcome.refused).toBe(1);
    expect(outcome.rows.find(r => r.id === 'b')?.error).toBe('not allowed');
  });

  it('writes nothing for an empty queue', async () => {
    const outcome = await bulkTransitionRecords([], 'approved');
    expect(rpc).not.toHaveBeenCalled();
    expect(outcome.moved).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// The batching itself
// ---------------------------------------------------------------------------

describe('the batching — the limits are the server’s limits', () => {
  it('sends nothing for an empty list', () => {
    expect(chunkRows([])).toEqual([]);
  });

  it('keeps a small list in one batch', () => {
    const rows = Array.from({ length: 10 }, () => ({ form_code: 'F/08', form_data: { client_name: 'x' } }));
    expect(chunkRows(rows)).toHaveLength(1);
  });

  it('cuts a long list on the row count', () => {
    const rows = Array.from({ length: 1200 }, () => ({ form_code: 'F/08', form_data: { client_name: 'x' } }));
    const batches = chunkRows(rows);
    expect(batches).toHaveLength(3);
    expect(batches[0]).toHaveLength(500);
    // Nothing is lost and nothing is duplicated.
    expect(batches.flat()).toHaveLength(1200);
  });

  it('cuts a list of enormous rows on the measured size, and keeps every row', () => {
    const big = 'x'.repeat(400_000);
    const rows = Array.from({ length: 10 }, () => ({ form_code: 'F/08', form_data: { client_name: big } }));
    const batches = chunkRows(rows);
    expect(batches.length).toBeGreaterThan(1);
    expect(batches.flat()).toHaveLength(10);
  });
});
