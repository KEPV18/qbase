/**
 * Form Record Service
 * 
 * Handles CRUD operations for QMS form records (F/09, F/22, F/28, etc.)
 * Integrates with Google Sheets and localStorage for offline support
 * ISO 9001:2015 Clause 4.2.4 - Control of records
 */

import { getAccessToken } from "@/lib/auth";
import { type RelatedRecord } from "@/lib/traceability";

// Google Sheets Configuration
const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";
const SPREADSHEET_ID = import.meta.env.VITE_SPREADSHEET_ID || "";

/**
 * Form Record interface - represents actual filled form instances
 */
export interface FormRecord {
  /** Unique record ID (e.g., "F/09-001") */
  recordId: string;
  /** Form code (e.g., "F/09") */
  formCode: string;
  /** Sequential number (e.g., "001") */
  number: string;
  /** Record title/name */
  title: string;
  /** Creation date (ISO 8601) */
  date: string;
  /** Current status */
  status: "Open" | "In Progress" | "Closed" | "Draft";
  /** Record details/metadata */
  details: {
    title?: string;
    description?: string;
    /** ISO 9001:2015 clauses addressed by this record */
    isoClauses?: string[];
    /** Related records for traceability */
    relatedRecords?: RelatedRecord[];
    /** Audit trail */
    createdBy?: string;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: unknown;
  };
}

/**
 * Input for creating a new form record
 */
export interface FormRecordInput {
  formCode: string;
  title: string;
  details: FormRecord["details"];
}

/**
 * Update for existing form record
 */
export interface FormRecordUpdate {
  title?: string;
  status?: FormRecord["status"];
  details?: Partial<FormRecord["details"]>;
}

// ============================================================================
// A. LOCALSTORAGE BACKUP (Offline Support)
// ============================================================================

const STORAGE_KEY = "qms_form_records";

function loadFromLocalStorage(): FormRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveToLocalStorage(records: FormRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// ============================================================================
// B. GOOGLE SHEETS INTEGRATION
// ============================================================================

/**
 * Get sheet name for a form code
 */
function getSheetName(formCode: string): string {
  const sheetMap: Record<string, string> = {
    "F/09": "CustomerComplaints",
    "F/10": "InternalNonconformity",
    "F/22": "CAPARegister",
    "F/28": "TrainingRecords",
    "F/21": "ManagementReview",
    "F/11": "ProductionPlans",
    "F/19": "ProjectRequests",
  };
  return sheetMap[formCode] || formCode.replace("/", "_");
}

/**
 * List all records for a specific form type
 * Falls back to localStorage if API fails
 */
export async function listFormRecords(formCode: string): Promise<FormRecord[]> {
  try {
    const token = await getAccessToken();
    if (!token || !SPREADSHEET_ID) {
      // Return from localStorage
      const all = loadFromLocalStorage();
      return all.filter(r => r.formCode === formCode);
    }

    const sheetName = getSheetName(formCode);
    const response = await fetch(
      `${SHEETS_API_BASE}/${SPREADSHEET_ID}/values/${sheetName}!A:L`,
      {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Sheets API error: ${response.status}`);
    }

    const data = await response.json();
    const values = data.values || [];

    // Skip header row
    const records: FormRecord[] = values.slice(1).map((row: string[]) => ({
      recordId: `${formCode}-${row[0]?.padStart(3, "0") || "000"}`,
      formCode,
      number: row[0]?.padStart(3, "0") || "000",
      title: row[1] || `${formCode} Record`,
      date: row[2] || new Date().toISOString().split("T")[0],
      status: (row[3] as FormRecord["status"]) || "Open",
      details: {
        title: row[1],
        description: row[4],
        isoClauses: row[5]?.split(",").map(s => s.trim()) || ["10.2"],
        relatedRecords: row[6] ? JSON.parse(row[6]) : [],
        createdBy: row[7],
        createdAt: row[8],
      },
    }));

    // Update localStorage cache
    const existing = loadFromLocalStorage();
    const filtered = existing.filter(r => r.formCode !== formCode);
    filtered.push(...records);
    saveToLocalStorage(filtered);

    return records;
  } catch (error) {
    console.warn("Failed to fetch from Sheets, using localStorage:", error);
    const all = loadFromLocalStorage();
    return all.filter(r => r.formCode === formCode);
  }
}

/**
 * Get a single form record by ID
 */
export async function getFormRecord(recordId: string): Promise<FormRecord | null> {
  const [formCode, number] = recordId.split("-");
  if (!formCode || !number) return null;
  
  const records = await listFormRecords(formCode);
  return records.find(r => r.recordId === recordId) || null;
}

/**
 * Create a new form record
 */
export async function createFormRecord(
  input: FormRecordInput
): Promise<FormRecord> {
  const records = loadFromLocalStorage();
  const existing = records.filter(r => r.formCode === input.formCode);
  const nextNumber = (existing.length + 1).toString().padStart(3, "0");

  const newRecord: FormRecord = {
    recordId: `${input.formCode}-${nextNumber}`,
    formCode: input.formCode,
    number: nextNumber,
    title: input.title,
    date: new Date().toISOString().split("T")[0],
    status: "Open",
    details: {
      ...input.details,
      createdBy: localStorage.getItem("auth_user") || "Unknown",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };

  // Save to localStorage
  records.push(newRecord);
  saveToLocalStorage(records);

  // Try to sync to Sheets
  try {
    await syncToSheets(input.formCode);
  } catch (e) {
    console.warn("Failed to sync to Sheets:", e);
  }

  return newRecord;
}

/**
 * Update an existing form record
 */
export async function updateFormRecord(
  recordId: string,
  updates: FormRecordUpdate
): Promise<FormRecord> {
  const records = loadFromLocalStorage();
  const index = records.findIndex(r => r.recordId === recordId);

  if (index === -1) {
    throw new Error(`Record ${recordId} not found`);
  }

  const updated: FormRecord = {
    ...records[index],
    title: updates.title || records[index].title,
    status: updates.status || records[index].status,
    details: {
      ...records[index].details,
      ...updates.details,
      updatedAt: new Date().toISOString(),
    },
  };

  records[index] = updated;
  saveToLocalStorage(records);

  // Try to sync to Sheets
  try {
    await syncToSheets(updated.formCode);
  } catch (e) {
    console.warn("Failed to sync to Sheets:", e);
  }

  return updated;
}

/**
 * Add related record to a form record
 */
export async function addRelatedRecord(
  sourceId: string,
  relatedRecord: RelatedRecord
): Promise<FormRecord> {
  const record = await getFormRecord(sourceId);
  if (!record) {
    throw new Error(`Record ${sourceId} not found`);
  }

  const existing = record.details.relatedRecords || [];
  
  // Avoid duplicates
  const key = `${relatedRecord.form}-${relatedRecord.number}`;
  const exists = existing.some(r => `${r.form}-${r.number}` === key);
  
  if (exists) {
    throw new Error(`Relationship ${key} already exists`);
  }

  return updateFormRecord(sourceId, {
    details: {
      relatedRecords: [...existing, relatedRecord],
    },
  });
}

/**
 * Remove related record from a form record
 */
export async function removeRelatedRecord(
  sourceId: string,
  targetForm: string,
  targetNumber: string
): Promise<FormRecord> {
  const record = await getFormRecord(sourceId);
  if (!record) {
    throw new Error(`Record ${sourceId} not found`);
  }

  const existing = record.details.relatedRecords || [];
  const key = `${targetForm}-${targetNumber}`;
  const filtered = existing.filter(r => `${r.form}-${r.number}` !== key);

  return updateFormRecord(sourceId, {
    details: {
      relatedRecords: filtered,
    },
  });
}

/**
 * Sync local records to Google Sheets
 */
async function syncToSheets(formCode: string): Promise<void> {
  const token = await getAccessToken();
  if (!token || !SPREADSHEET_ID) return;

  const records = loadFromLocalStorage().filter(r => r.formCode === formCode);
  const sheetName = getSheetName(formCode);

  const values = [
    ["Number", "Title", "Date", "Status", "Description", "ISO Clauses", "Related Records", "Created By", "Created At"],
    ...records.map(r => [
      r.number,
      r.title,
      r.date,
      r.status,
      r.details.description || "",
      r.details.isoClauses?.join(",") || "",
      JSON.stringify(r.details.relatedRecords || []),
      r.details.createdBy || "",
      r.details.createdAt || "",
    ]),
  ];

  await fetch(
    `${SHEETS_API_BASE}/${SPREADSHEET_ID}/values/${sheetName}!A1:I${values.length}:clear`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  await fetch(
    `${SHEETS_API_BASE}/${SPREADSHEET_ID}/values/${sheetName}!A1:I${values.length}:append?valueInputOption=RAW`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values }),
    }
  );
}

/**
 * Search form records by query
 */
export function searchFormRecords(query: string): FormRecord[] {
  const records = loadFromLocalStorage();
  const q = query.toLowerCase();
  return records.filter(r =>
    r.recordId.toLowerCase().includes(q) ||
    r.title.toLowerCase().includes(q) ||
    r.formCode.toLowerCase().includes(q) ||
    r.details.description?.toLowerCase().includes(q)
  );
}

/**
 * Get next serial number for a form
 */
export function getNextSerial(formCode: string): string {
  const records = loadFromLocalStorage();
  const existing = records.filter(r => r.formCode === formCode);
  return (existing.length + 1).toString().padStart(3, "0");
}

/**
 * Clear all local records (for testing)
 */
export function clearLocalRecords(): void {
  localStorage.removeItem(STORAGE_KEY);
}
