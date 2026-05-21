/**
 * CAPA Register Service
 * 
 * Handles all CRUD operations for the CAPA (Corrective and Preventive Action) Register.
 * Connects to Google Sheets "CAPA Register" tab as the single source of truth.
 * 
 * @module capaRegisterService
 * @version 1.0.0
 * @iso ISO 9001:2015 Clause 10.2 - Nonconformity and corrective action
 */

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || "";
const SPREADSHEET_ID = import.meta.env.VITE_RISK_CAPA_SPREADSHEET_ID || import.meta.env.VITE_SPREADSHEET_ID || "";
const SHEET_NAME = "CAPA Register";
const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

/**
 * CAPA type - Corrective or Preventive
 */
export type CAPAType = "Corrective" | "Preventive";

/**
 * CAPA status values following ISO 9001 corrective action lifecycle
 */
export type CAPAStatus = "Open" | "In Progress" | "Under Verification" | "Closed";

/**
 * CAPA object representing a single CAPA entry
 */
export interface CAPA {
  /** Row index in the sheet (1-indexed, used for updates) */
  rowIndex: number;
  /** Unique CAPA identifier (e.g., CAPA-25-001) */
  capaId: string;
  /** Source that triggered this CAPA */
  sourceOfCAPA: string;
  /** Type: Corrective or Preventive */
  type: CAPAType;
  /** Description of the issue or nonconformity */
  description: string;
  /** Reference to NC, Audit, Complaint, or Risk ID */
  reference: string;
  /** Root cause analysis (mandatory) */
  rootCauseAnalysis: string;
  /** Corrective action taken */
  correctiveAction: string;
  /** Preventive action taken */
  preventiveAction: string;
  /** Person responsible for this CAPA */
  responsiblePerson: string;
  /** Target completion date */
  targetCompletionDate: string;
  /** Current status */
  status: CAPAStatus;
  /** Effectiveness check results */
  effectivenessCheck: string;
  /** Date of effectiveness review */
  effectivenessReviewDate: string;
  /** Closure approval (who approved closure) */
  closureApproval: string;
  /** Related Risk ID from Risk Register */
  relatedRisk: string;
}

/**
 * Input data for creating a new CAPA
 */
export interface CAPAInput {
  sourceOfCAPA: string;
  type: CAPAType;
  description: string;
  reference?: string;
  rootCauseAnalysis: string;
  correctiveAction?: string;
  preventiveAction?: string;
  responsiblePerson: string;
  targetCompletionDate: string;
  relatedRisk?: string;
}

/**
 * Input data for updating an existing CAPA
 */
export interface CAPAUpdate {
  sourceOfCAPA?: string;
  type?: CAPAType;
  description?: string;
  reference?: string;
  rootCauseAnalysis?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  responsiblePerson?: string;
  targetCompletionDate?: string;
  status?: CAPAStatus;
  effectivenessCheck?: string;
  effectivenessReviewDate?: string;
  closureApproval?: string;
  relatedRisk?: string;
}

/**
 * Valid CAPA types
 */
const VALID_TYPES: CAPAType[] = ["Corrective", "Preventive"];

/**
 * Valid CAPA statuses
 */
const VALID_STATUSES: CAPAStatus[] = ["Open", "In Progress", "Under Verification", "Closed"];

/**
 * Status transition rules (current -> allowed next statuses)
 */
const STATUS_TRANSITIONS: Record<CAPAStatus, CAPAStatus[]> = {
  "Open": ["In Progress"],
  "In Progress": ["Under Verification", "Open"],
  "Under Verification": ["Closed", "In Progress"],
  "Closed": [], // Cannot transition from Closed
};

/**
 * Validates a CAPA type
 * @param type - The type to validate
 * @returns True if type is valid
 */
function isValidType(type: string): type is CAPAType {
  return VALID_TYPES.includes(type as CAPAType);
}

/**
 * Validates a CAPA status
 * @param status - The status to validate
 * @returns True if status is valid
 */
function isValidStatus(status: string): status is CAPAStatus {
  return VALID_STATUSES.includes(status as CAPAStatus);
}

/**
 * Validates if a status transition is allowed
 * @param currentStatus - Current status
 * @param newStatus - Desired new status
 * @returns True if transition is allowed
 */
function isValidTransition(currentStatus: CAPAStatus, newStatus: CAPAStatus): boolean {
  if (currentStatus === newStatus) return true;
  return STATUS_TRANSITIONS[currentStatus].includes(newStatus);
}

/**
 * Validates closure requirements
 * @param capa - CAPA with potential updates
 * @returns Error message or null if valid
 */
function validateClosureRequirements(capa: CAPA): string | null {
  if (capa.status !== "Closed") return null;
  
  if (!capa.effectivenessCheck || capa.effectivenessCheck.trim() === "") {
    return "Effectiveness Check is required before closing a CAPA";
  }
  if (!capa.effectivenessReviewDate || capa.effectivenessReviewDate.trim() === "") {
    return "Effectiveness Review Date is required before closing a CAPA";
  }
  if (!capa.closureApproval || capa.closureApproval.trim() === "") {
    return "Closure Approval is required before closing a CAPA";
  }
  
  return null;
}

/**
 * Generates a unique CAPA ID based on current year and next sequence
 * @param existingIds - Array of existing CAPA IDs
 * @returns New unique CAPA ID
 */
function generateCAPAId(existingIds: string[]): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const prefix = `CAPA-${year}-`;
  
  const existingNumbers = existingIds
    .filter(id => id.startsWith(prefix))
    .map(id => parseInt(id.replace(prefix, ""), 10))
    .filter(num => !isNaN(num));
  
  const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
  return `${prefix}${nextNumber.toString().padStart(3, "0")}`;
}

/**
 * Parses a row from the sheet into a CAPA object
 * @param row - Array of cell values
 * @param rowIndex - 1-indexed row number
 * @returns CAPA object or null if invalid
 */
function parseCAPARow(row: string[], rowIndex: number): CAPA | null {
  const capaId = row[0]?.trim();
  if (!capaId || capaId === "CAPA ID") return null;
  
  return {
    rowIndex,
    capaId,
    sourceOfCAPA: row[1] || "",
    type: isValidType(row[2]) ? row[2] : "Corrective",
    description: row[3] || "",
    reference: row[4] || "",
    rootCauseAnalysis: row[5] || "",
    correctiveAction: row[6] || "",
    preventiveAction: row[7] || "",
    responsiblePerson: row[8] || "",
    targetCompletionDate: row[9] || "",
    status: isValidStatus(row[10]) ? row[10] : "Open",
    effectivenessCheck: row[11] || "",
    effectivenessReviewDate: row[12] || "",
    closureApproval: row[13] || "",
    relatedRisk: row[14] || "",
  };
}

/**
 * Fetches all CAPAs from the CAPA Register sheet
 * @returns Promise resolving to array of CAPA objects
 * @throws Error if API request fails
 */
export async function getAllCAPAs(): Promise<CAPA[]> {
  const url = `${SHEETS_API_BASE}/${SPREADSHEET_ID}/values/${encodeURIComponent("'" + SHEET_NAME + "'")}?key=${API_KEY}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to fetch CAPAs: ${error.error?.message || response.statusText}`);
  }
  
  const data = await response.json();
  const rows: string[][] = data.values || [];
  
  const capas: CAPA[] = [];
  
  // Skip header row (index 0)
  for (let i = 1; i < rows.length; i++) {
    const capa = parseCAPARow(rows[i], i + 1);
    if (capa) {
      capas.push(capa);
    }
  }
  
  return capas;
}

/**
 * Adds a new CAPA to the CAPA Register
 * @param input - CAPA data to add
 * @returns Promise resolving to the created CAPA
 * @throws Error if validation fails or API request fails
 */
export async function addCAPA(input: CAPAInput): Promise<CAPA> {
  // Validate type
  if (!isValidType(input.type)) {
    throw new Error(`Type must be one of: ${VALID_TYPES.join(", ")}`);
  }
  
  // Validate root cause analysis (mandatory)
  if (!input.rootCauseAnalysis || input.rootCauseAnalysis.trim() === "") {
    throw new Error("Root Cause Analysis is mandatory for all CAPAs");
  }
  
  // Validate target date
  const targetDate = new Date(input.targetCompletionDate);
  if (isNaN(targetDate.getTime())) {
    throw new Error("Target Completion Date must be a valid date");
  }
  
  // Get existing CAPAs to generate unique ID
  const existingCAPAs = await getAllCAPAs();
  const capaId = generateCAPAId(existingCAPAs.map(c => c.capaId));
  
  // Prepare row data
  const rowData = [
    capaId,
    input.sourceOfCAPA,
    input.type,
    input.description,
    input.reference || "",
    input.rootCauseAnalysis,
    input.correctiveAction || "",
    input.preventiveAction || "",
    input.responsiblePerson,
    input.targetCompletionDate,
    "Open", // Default status
    "", // Effectiveness Check
    "", // Effectiveness Review Date
    "", // Closure Approval
    input.relatedRisk || "",
  ];
  
  const url = `${SHEETS_API_BASE}/${SPREADSHEET_ID}/values/${encodeURIComponent("'" + SHEET_NAME + "'")}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS&key=${API_KEY}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values: [rowData] }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to add CAPA: ${error.error?.message || response.statusText}`);
  }
  
  return {
    rowIndex: existingCAPAs.length + 2,
    capaId,
    sourceOfCAPA: input.sourceOfCAPA,
    type: input.type,
    description: input.description,
    reference: input.reference || "",
    rootCauseAnalysis: input.rootCauseAnalysis,
    correctiveAction: input.correctiveAction || "",
    preventiveAction: input.preventiveAction || "",
    responsiblePerson: input.responsiblePerson,
    targetCompletionDate: input.targetCompletionDate,
    status: "Open",
    effectivenessCheck: "",
    effectivenessReviewDate: "",
    closureApproval: "",
    relatedRisk: input.relatedRisk || "",
  };
}

/**
 * Updates an existing CAPA in the CAPA Register
 * @param capaId - ID of the CAPA to update
 * @param updates - Fields to update
 * @returns Promise resolving to the updated CAPA
 * @throws Error if CAPA not found, validation fails, or API request fails
 */
export async function updateCAPA(capaId: string, updates: CAPAUpdate): Promise<CAPA> {
  const capas = await getAllCAPAs();
  const capa = capas.find(c => c.capaId === capaId);
  
  if (!capa) {
    throw new Error(`CAPA with ID ${capaId} not found`);
  }
  
  // Validate type if provided
  if (updates.type !== undefined && !isValidType(updates.type)) {
    throw new Error(`Type must be one of: ${VALID_TYPES.join(", ")}`);
  }
  
  // Validate status transition if provided
  if (updates.status !== undefined) {
    if (!isValidStatus(updates.status)) {
      throw new Error(`Status must be one of: ${VALID_STATUSES.join(", ")}`);
    }
    if (!isValidTransition(capa.status, updates.status)) {
      throw new Error(`Cannot transition from ${capa.status} to ${updates.status}`);
    }
  }
  
  // Merge updates
  const updatedCAPA: CAPA = {
    ...capa,
    ...updates,
  };
  
  // Validate closure requirements if trying to close
  if (updatedCAPA.status === "Closed") {
    const closureError = validateClosureRequirements(updatedCAPA);
    if (closureError) {
      throw new Error(closureError);
    }
  }
  
  // Prepare row data
  const rowData = [
    updatedCAPA.capaId,
    updatedCAPA.sourceOfCAPA,
    updatedCAPA.type,
    updatedCAPA.description,
    updatedCAPA.reference,
    updatedCAPA.rootCauseAnalysis,
    updatedCAPA.correctiveAction,
    updatedCAPA.preventiveAction,
    updatedCAPA.responsiblePerson,
    updatedCAPA.targetCompletionDate,
    updatedCAPA.status,
    updatedCAPA.effectivenessCheck,
    updatedCAPA.effectivenessReviewDate,
    updatedCAPA.closureApproval,
    updatedCAPA.relatedRisk,
  ];
  
  const range = `'${SHEET_NAME}'!A${capa.rowIndex}:O${capa.rowIndex}`;
  const url = `${SHEETS_API_BASE}/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED&key=${API_KEY}`;
  
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values: [rowData] }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to update CAPA: ${error.error?.message || response.statusText}`);
  }
  
  return updatedCAPA;
}

/**
 * Calculates CAPA statistics for dashboard display
 * @param capas - Array of CAPAs
 * @returns Object with CAPA statistics
 */
export function calculateCAPAStats(capas: CAPA[]) {
  const total = capas.length;
  const open = capas.filter(c => c.status === "Open").length;
  const inProgress = capas.filter(c => c.status === "In Progress").length;
  const underVerification = capas.filter(c => c.status === "Under Verification").length;
  const closed = capas.filter(c => c.status === "Closed").length;
  
  const corrective = capas.filter(c => c.type === "Corrective").length;
  const preventive = capas.filter(c => c.type === "Preventive").length;
  
  // CAPAs overdue (past target date and not closed)
  const overdue = capas.filter(c => {
    if (c.status === "Closed") return false;
    const targetDate = new Date(c.targetCompletionDate);
    return !isNaN(targetDate.getTime()) && targetDate < new Date();
  }).length;
  
  const closureRate = total > 0 ? Math.round((closed / total) * 100) : 0;
  
  return {
    total,
    open,
    inProgress,
    underVerification,
    closed,
    corrective,
    preventive,
    overdue,
    closureRate,
  };
}

/**
 * Gets the status color class for display
 * @param status - CAPA status
 * @returns Tailwind color class
 */
export function getCAPAStatusColor(status: CAPAStatus): string {
  switch (status) {
    case "Open": return "text-red-600 bg-red-100";
    case "In Progress": return "text-blue-600 bg-blue-100";
    case "Under Verification": return "text-yellow-600 bg-yellow-100";
    case "Closed": return "text-green-600 bg-green-100";
    default: return "text-gray-600 bg-gray-100";
  }
}
