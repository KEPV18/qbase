// =============================================================================
// QBase — Backup & Restore Service (ISO 9001 compliant)
// Provides encrypted export / import of the entire records database.
// Uses Web Crypto API (AES-GCM-256 + PBKDF2) for client-side encryption.
// =============================================================================

import { supabase } from "@/integrations/supabase/client";
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

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
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

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): Uint8Array {
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

  const result: RestoreResult = { success: true, imported: 0, skipped: 0, errors: [] };

  // Upsert in batches of 50 to avoid Supabase limits
  const BATCH_SIZE = 50;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error: upsertError } = await supabase.from("records").upsert(batch, { onConflict: "serial" });

    if (upsertError) {
      result.errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${upsertError.message}`);
    } else {
      result.imported += batch.length;
    }
  }

  result.success = result.errors.length === 0;
  result.skipped = records.length - result.imported;

  if (result.success) {
    toast.success(`Restored ${result.imported} records successfully`);
  } else {
    toast.error(`Restore completed with ${result.errors.length} errors (${result.imported} imported)`);
  }

  return result;
}
