// =============================================================================
// QBase — Bulk record operations
//
// The register was written ONE ROW AT A TIME: the import looped over the
// rows and called `createRecord` for each one, the restore wrote with a
// direct table upsert, and approving N records cost 2N round trips.
//
// These are the two server-side functions that do it properly, both in ONE
// transaction:
//
//   * `bulk_create_records(p_rows, p_reason, p_skip_existing, p_allow_incomplete)`
//       validates EVERY row first and writes only when every row has
//       passed, so a batch lands WHOLE or NOT AT ALL.  It allocates the
//       serials server-side (the same `get_next_serial` the single create
//       uses), writes the audit row, and NEVER overwrites a live record: a
//       serial that already exists is skipped and reported.
//
//       `p_allow_incomplete` is the RESTORE's exemption: a restore writes
//       back a record that already existed, so the CREATE-time completeness
//       rule does not apply to it.
//
//   * `bulk_transition_records(p_ids, p_target_status, p_reason)`
//       moves a queue in one round trip, through the SAME transition graph
//       and the SAME role rules the single transition enforces, with a
//       per-id result: a refused id is reported, the others still move.
//
// Zero Data Loss: neither function can modify an existing record.  A
// duplicate serial is SKIPPED, never replaced, and a batch that fails
// validation writes nothing at all.
// =============================================================================

import { supabase } from "@/integrations/supabase/client";

/**
 * How many rows go into one call.
 *
 * The server's own limit is 500 (`bulk_create_records` refuses a larger
 * batch), so 500 is the client's limit too: an import of up to 500 rows is
 * ONE transaction, and it lands whole or not at all.
 */
export const BULK_BATCH_SIZE = 500;

/**
 * How many bytes of row payload go into one call.
 *
 * The row count is not the only limit: every row carries its whole
 * `form_data`, and the forms with a matrix in them (F/30's 20-row
 * evaluation matrix, F/47's checklist) are big.  A batch is cut on the
 * measured size as well as the count, so one huge row cannot make the
 * request exceed what the network accepts — and the cut never breaks a
 * batch apart: the parts are still whole transactions.
 */
export const BULK_BATCH_BYTES = 1_500_000;

/** A row as the bulk create wants it. */
export interface BulkRow {
  form_code: string;
  form_name?: string;
  form_data: Record<string, unknown>;
  /** The serial to keep.  Empty or absent means "the server allocates one". */
  serial?: string;
  status?: string;
  section?: number | null;
  section_name?: string | null;
  frequency?: string | null;
  /**
   * The author the row had where it came from — a restore only.
   *
   * It is NOT written into `records.created_by`: the author of a new
   * record is decided by the server, from the session, so a client cannot
   * forge one.  The server keeps it in the audit row instead, so the
   * provenance of a restored record is not lost.
   */
  original_created_by?: string;
}

export interface BulkCreateRowResult {
  /** 1-based position in the batch, as the server counted it. */
  index: number;
  id?: string;
  serial?: string;
  status: 'created' | 'skipped' | string;
  detail?: string;
}

export interface BulkCreateFailure {
  index: number;
  serial: string;
  error: string;
}

export interface BulkCreateOutcome {
  /** False when the batch was refused as a whole — nothing was written. */
  committed: boolean;
  created: number;
  skipped: number;
  failed: number;
  rows: BulkCreateRowResult[];
  failures: BulkCreateFailure[];
  /**
   * True when the server did not know the four-argument function and the
   * call had to be made in the old three-argument shape.
   *
   * A RESTORE on such a server cannot carry the completeness exemption, so
   * the register's own incomplete records may be refused.  The caller is
   * told, because a record that is quietly left out is a record that is
   * quietly lost.
   */
  legacyServer?: boolean;
}

export interface BulkTransitionRowResult {
  id: string;
  status: 'transitioned' | 'refused' | string;
  error?: string;
}

export interface BulkTransitionOutcome {
  committed: boolean;
  moved: number;
  refused: number;
  rows: BulkTransitionRowResult[];
}

/**
 * Create a batch of records in one transaction.
 *
 * The batch lands whole or not at all: when the server refuses a row, the
 * whole batch is refused and NOTHING is written.  The caller decides what
 * to do with the refusal — `importService` drops the offending rows and
 * re-sends the rest when the user asked to skip invalid rows.
 */
export async function bulkCreateRecords(
  rows: BulkRow[],
  options: { reason?: string; skipExisting?: boolean; allowIncomplete?: boolean } = {},
): Promise<BulkCreateOutcome> {
  const { reason = 'import', skipExisting = true, allowIncomplete = false } = options;

  if (!rows.length) {
    return { committed: true, created: 0, skipped: 0, failed: 0, rows: [], failures: [] };
  }

  const payload = {
    p_rows: rows,
    p_reason: reason,
    p_skip_existing: skipExisting,
    // A restore writes back a record that ALREADY EXISTED — whether it was
    // complete is a historical fact, not a mistake the restore is making.
    // The create-time completeness rule does not apply to it; every other
    // rule (the role gate, the serial uniqueness, the audit row) does.
    p_allow_incomplete: allowIncomplete,
  };

  let { data, error } = await supabase.rpc('bulk_create_records', payload);

  // A server that has NOT been migrated to the four-argument function does
  // not know the fourth argument at all, and PostgREST refuses the call
  // with "does not exist" — the import would stop working for a reason
  // that has nothing to do with the data.
  //
  // So the call is retried in the old three-argument shape.  The retry
  // cannot carry the exemption, so `legacyServer` is set: a RESTORE on such
  // a server may refuse the register's own incomplete records, and the
  // caller is told so rather than losing them quietly.
  let legacyServer = false;
  if (error && allowIncomplete && isMissingFunction(error)) {
    legacyServer = true;
    ({ data, error } = await supabase.rpc('bulk_create_records', {
      p_rows: rows,
      p_reason: reason,
      p_skip_existing: skipExisting,
    }));
  }

  if (error) {
    return {
      committed: false,
      created: 0,
      skipped: 0,
      failed: rows.length,
      rows: [],
      failures: rows.map((row, i) => ({
        index: i + 1,
        serial: row.serial ?? '',
        error: error.message,
      })),
      legacyServer,
    };
  }

  const outcome = (data ?? {}) as Partial<BulkCreateOutcome>;
  return {
    committed: outcome.committed !== false,
    created: outcome.created ?? 0,
    skipped: outcome.skipped ?? 0,
    failed: outcome.failed ?? 0,
    rows: outcome.rows ?? [],
    failures: outcome.failures ?? [],
    legacyServer,
  };
}

/**
 * Is this the error a server that does not have the four-argument function
 * gives?
 *
 * PostgREST answers with "Could not find the function … in the schema
 * cache" (PGRST202) and Postgres answers with "function … does not exist".
 * Both mean the same thing here: the function has a different signature.
 */
function isMissingFunction(error: { message?: string; code?: string }): boolean {
  if (error.code === 'PGRST202') return true;
  const message = String(error.message ?? '');
  return /does not exist|could not find the function|no function matches|not found/i.test(message);
}

/**
 * Move a queue of records to a new status in one round trip.
 *
 * The transition rules are the server's, not this function's: it calls the
 * same `record_transition` the single-record path calls, so a bulk
 * approval can never be more permissive than a single one.  A refused id
 * is reported and the others still move.
 */
export async function bulkTransitionRecords(
  ids: string[],
  targetStatus: string,
  reason?: string,
): Promise<BulkTransitionOutcome> {
  if (!ids.length) {
    return { committed: true, moved: 0, refused: 0, rows: [] };
  }

  const { data, error } = await supabase.rpc('bulk_transition_records', {
    p_ids: ids,
    p_target_status: targetStatus,
    p_reason: reason ?? null,
  });

  if (error) {
    return {
      committed: false,
      moved: 0,
      refused: ids.length,
      rows: ids.map(id => ({ id, status: 'refused', error: error.message })),
    };
  }

  const outcome = (data ?? {}) as Partial<BulkTransitionOutcome>;
  return {
    committed: outcome.committed !== false,
    moved: outcome.moved ?? 0,
    refused: outcome.refused ?? 0,
    rows: outcome.rows ?? [],
  };
}

/** Split a list into chunks of at most `size`. */
export function chunk<T>(items: T[], size: number = BULK_BATCH_SIZE): T[][] {
  if (size <= 0) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/** How many bytes a row takes on the wire, JSON-encoded. */
export function byteSizeOf(row: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(row)).length;
  } catch {
    // A row that cannot even be serialised is counted as large, so it gets
    // a batch to itself rather than breaking a batch that works.
    return BULK_BATCH_BYTES;
  }
}

/**
 * Split rows into the batches the server will accept.
 *
 * Two limits, both of them real: the server takes at most 500 rows in one
 * call, and one call's body has to fit in one request.  A batch is cut on
 * the measured size as well as on the count, so 500 small rows travel in a
 * single transaction while 40 enormous ones travel in as many whole
 * transactions as they need.
 *
 * The order of the rows is kept: a batch is always a run of consecutive
 * rows, so the serials the server allocates still follow the file's order.
 *
 * The rows may be anything, not only a `BulkRow` — the import keeps each
 * row's number in the file beside its payload, and the batch has to keep
 * that envelope whole.  `sizeOf` then measures whatever is actually sent:
 * the import measures the payload, because the envelope is not on the wire.
 */
export function chunkRows<T>(
  rows: T[],
  maxRows: number = BULK_BATCH_SIZE,
  maxBytes: number = BULK_BATCH_BYTES,
  sizeOf: (row: T) => number = byteSizeOf,
): T[][] {
  if (!rows.length) return [];
  const out: T[][] = [];
  let current: T[] = [];
  let currentBytes = 0;

  for (const row of rows) {
    const bytes = sizeOf(row);
    const overCount = current.length >= maxRows;
    const overBytes = current.length > 0 && currentBytes + bytes > maxBytes;
    if (overCount || overBytes) {
      out.push(current);
      current = [];
      currentBytes = 0;
    }
    current.push(row);
    currentBytes += bytes;
  }
  if (current.length) out.push(current);
  return out;
}
