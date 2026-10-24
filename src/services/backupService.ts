// =============================================================================
// QBase — Backup & Restore Service (ISO 9001 compliant)
// Provides encrypted export / import of the entire records database.
// Uses Web Crypto API (AES-GCM-256 + PBKDF2) for client-side encryption.
// =============================================================================

import { supabase } from "@/integrations/supabase/client";
import { bulkCreateRecords, chunkRows, type BulkRow } from "@/services/bulkRecordOps";
import { toast } from "sonner";

const BACKUP_VERSION = "qbase-backup-v1";
const PBKDF2_ITERATIONS = 100_000;

/* -------------------------------------------------------------------------- */
// Types
/* -------------------------------------------------------------------------- */

export interface BackupMetadata {
  version: string;
  exportedAt: string;
  recordCount: number;
  tables: string[];
  checksum: string; // simple hash for integrity
}

export interface EncryptedBackup {
  meta: BackupMetadata;
  salt: string;       // Base64
  iv: string;         // Base64
  ciphertext: string; // Base64
}

/* -------------------------------------------------------------------------- */
// Crypto primitives
/* -------------------------------------------------------------------------- */

// `Uint8Array<ArrayBuffer>` is required by the WebCrypto BufferSource overloads
// under TS 5.7+ typed-array generics; the bare `Uint8Array` alias defaults to
// ArrayBufferLike (which admits SharedArrayBuffer) and is rejected.
async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", encoder.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encrypt(plaintext: string, password: string): Promise<{ salt: string; iv: string; ciphertext: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const encoder = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv }, key, encoder.encode(plaintext)
  );
  return {
    salt: arrayBufferToBase64(salt),
    iv: arrayBufferToBase64(iv),
    ciphertext: arrayBufferToBase64(encrypted),
  };
}

async function decrypt(payload: { salt: string; iv: string; ciphertext: string }, password: string): Promise<string> {
  const salt = base64ToArrayBuffer(payload.salt);
  const iv = base64ToArrayBuffer(payload.iv);
  const ciphertext = base64ToArrayBuffer(payload.ciphertext);
  const key = await deriveKey(password, salt);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv }, key, ciphertext
  );
  return new TextDecoder().decode(decrypted);
}

  // Accepts both raw ArrayBuffers and the ArrayBuffer-backed Uint8Arrays that
  // crypto.getRandomValues / base64ToArrayBuffer produce here.
  function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array<ArrayBuffer>): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// Returns an ArrayBuffer-backed view so the result satisfies WebCrypto's
// BufferSource overloads (see deriveKey note above).
function base64ToArrayBuffer(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function simpleHash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(16);
}

/* -------------------------------------------------------------------------- */
// Backup (Export)
/* -------------------------------------------------------------------------- */

export async function exportBackup(password: string): Promise<EncryptedBackup> {
  const { data: records, error } = await supabase
    .from("records")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error("Failed to fetch records: " + error.message);

  const payload = JSON.stringify(records);
  const checksum = simpleHash(payload);
  const { salt, iv, ciphertext } = await encrypt(payload, password);

  return {
    meta: {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      recordCount: records?.length ?? 0,
      tables: ["records"],
      checksum,
    },
    salt,
    iv,
    ciphertext,
  };
}

export function downloadBackupFile(backup: EncryptedBackup, filename?: string) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `qbase-backup-${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success(`Backup downloaded: ${backup.meta.recordCount} records`);
}

/* -------------------------------------------------------------------------- */
// Restore (Import)
/* -------------------------------------------------------------------------- */

export interface RestoreResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  /**
   * Why each row was skipped.
   *
   * A skip is NOT a failure: it is the restore refusing to overwrite a live
   * record, which is the correct outcome and the one the Zero Data Loss
   * rule requires.  The two are reported separately so that restoring the
   * register's own backup onto itself does not read as a wall of errors.
   */
  skippedDetails: string[];
}

export async function importBackup(file: File, password: string): Promise<RestoreResult> {
  const text = await file.text();
  let backup: EncryptedBackup;

  try {
    backup = JSON.parse(text);
  } catch {
    throw new Error("Invalid backup file: not valid JSON");
  }

  if (backup.meta?.version !== BACKUP_VERSION) {
    throw new Error(`Unsupported backup version: ${backup.meta?.version || "unknown"}. Expected ${BACKUP_VERSION}.`);
  }

  let payload: string;
  try {
    payload = await decrypt(backup, password);
  } catch {
    throw new Error("Decryption failed — incorrect password or corrupted file");
  }

  const checksum = simpleHash(payload);
  if (checksum !== backup.meta.checksum) {
    throw new Error("Integrity check failed — backup may be corrupted");
  }

  let records: unknown[];
  try {
    records = JSON.parse(payload);
  } catch {
    throw new Error("Decrypted payload is not valid JSON");
  }

  if (!Array.isArray(records)) {
    throw new Error("Backup payload must be an array of records");
  }

  const result: RestoreResult = { success: true, imported: 0, skipped: 0, errors: [], skippedDetails: [] };

  // A restore must never OVERWRITE a live record.
  //
  // The old implementation upserted straight into the table on `serial`,
  // so restoring a backup could replace a record that had been edited
  // since the backup was taken — and it bypassed the engine, so a restored
  // record had no version history, no edit count and NO audit row.  The
  // bulk create SKIPS a serial that is already live and reports it, and it
  // writes the audit row the engine writes.
  const rows: BulkRow[] = records.map((raw) => {
    const r = (raw ?? {}) as Record<string, unknown>;
    const status = String(r.status ?? 'draft');
    return {
      form_code: String(r.form_code ?? ''),
      form_name: String(r.form_name ?? ''),
      form_data: (r.form_data ?? {}) as Record<string, unknown>,
      serial: r.serial ? String(r.serial) : undefined,
      // Only a real workflow state may be restored; anything else would be
      // refused by the enum.
      status: ['draft', 'pending_review', 'approved', 'rejected'].includes(status) ? status : 'draft',
      section: typeof r.section === 'number' ? r.section : null,
      section_name: r.section_name ? String(r.section_name) : null,
      frequency: r.frequency ? String(r.frequency) : null,
      // The author the record had where the backup came from.  The server
      // does not let a client choose the author of a record — it is taken
      // from the session — so this is kept in the audit row instead, and
      // the provenance of the restored record is not lost.
      original_created_by: r.created_by ? String(r.created_by) : undefined,
    };
  });

  // A RESTORE is not a CREATE.
  //
  // The completeness rule — "the form's required fields must be present" —
  // is a CREATE rule: it stops a half-filled record from being filed.  A
  // restore writes back a record that ALREADY EXISTED.  Whether it was
  // complete is a fact about the past, not a mistake the restore is making,
  // and refusing it would DROP the register's own records (measured on the
  // production copy: 7 of the 316 live records are incomplete, and the
  // server's old stale lists refused 216 of them).
  //
  // So the restore asks for the exemption.  Everything else still holds:
  // the role gate, the serial uniqueness (a live record is never
  // overwritten), the audit row, and the transaction.
  const RESTORE_OPTIONS = {
    reason: 'restored_from_backup',
    skipExisting: true,
    allowIncomplete: true,
  } as const;

  // Whether the server had to be called in the old three-argument shape —
  // reported once, not once per batch.
  let legacyServerWarned = false;

  for (const batch of chunkRows(rows)) {
    let entries = batch;
    let outcome = await bulkCreateRecords(entries, RESTORE_OPTIONS);

    if (outcome.legacyServer && !legacyServerWarned) {
      legacyServerWarned = true;
      result.errors.push(
        'The server does not have the restore-safe bulk create yet, so the records that were incomplete may have been refused. Apply the prime migrations and restore again.',
      );
    }

    if (!outcome.committed) {
      // The batch was refused and NOTHING was written.  Report the rows the
      // server refused, drop them and send the rest — a restore should
      // bring back everything it can and say what it could not.
      const bad = new Set(outcome.failures.map(f => f.index));
      for (const failure of outcome.failures) {
        result.errors.push(`Row ${failure.index}: ${failure.error}`);
      }
      const rest = entries.filter((_, i) => !bad.has(i + 1));
      if (!rest.length) {
        result.skipped += entries.length;
        continue;
      }
      entries = rest;
      outcome = await bulkCreateRecords(entries, RESTORE_OPTIONS);
      if (!outcome.committed) {
        result.errors.push(`Batch of ${entries.length} records was refused: ${outcome.failures.map(f => f.error).join('; ')}`);
        result.skipped += entries.length;
        continue;
      }
    }

    result.imported += outcome.created;
    result.skipped += outcome.skipped;
    for (const row of outcome.rows) {
      if (row.status !== 'skipped') continue;
      // A skip is the restore protecting a live record — a CORRECT outcome,
      // not an error.  It is reported apart from the errors so the summary
      // says what really happened.
      result.skippedDetails.push(`Row ${row.index}: ${row.detail || 'a live record already carries this serial'}`);
    }
  }

  result.success = result.errors.length === 0;

  if (result.success) {
    if (result.imported === 0 && result.skipped > 0) {
      // Nothing was written because every row was already live — the
      // register was already up to date.  That is the restore working.
      toast.success(`Nothing to restore — all ${result.skipped} record(s) are already in the register`);
    } else {
      toast.success(
        result.skipped > 0
          ? `Restored ${result.imported} records (${result.skipped} already in the register)`
          : `Restored ${result.imported} records successfully`,
      );
    }
  } else {
    toast.error(`Restore completed with ${result.errors.length} errors (${result.imported} imported)`);
  }

  return result;
}
