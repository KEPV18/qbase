/**
 * Risk Register Service
 * 
 * Handles all CRUD operations for the Risk Register module.
 * Connects to Google Sheets "Risk Register" tab as the single source of truth.
 * 
 * @module riskRegisterService
 * @version 1.0.0
 * @iso ISO 9001:2015 Clause 6.1 - Actions to address risks and opportunities
 */

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || "";
const SPREADSHEET_ID = import.meta.env.VITE_RISK_CAPA_SPREADSHEET_ID || import.meta.env.VITE_SPREADSHEET_ID || "";
const SHEET_NAME = "Risk Register";
const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

/**
 * Risk status values following ISO 9001 risk management lifecycle
 */
export type RiskStatus = "Open" | "Under Review" | "Controlled" | "Closed";

/**
 * Risk object representing a single risk entry
 */
export interface Risk {
  /** Row index in the sheet (1-indexed, used for updates) */
  rowIndex: number;
  /** Unique risk identifier (e.g., RISK-25-001) */
  riskId: string;
  /** Process or department where risk is identified */
  processDepartment: string;
  /** Description of the identified risk */
  riskDescription: string;
  /** Root cause or source of the risk */
  cause: string;
  /** Likelihood rating (1-5) */
  likelihood: number;
  /** Impact rating (1-5) */
  impact: number;
  /** Calculated risk score (Likelihood × Impact) */
  riskScore: number;
  /** Control measures or actions to mitigate risk */
  actionControl: string;
  /** Person responsible for managing this risk */
  owner: string;
  /** Current status of the risk */
  status: RiskStatus;
  /** Date of last review */
  reviewDate: string;
  /** Linked CAPA ID if risk has materialized */
  linkedCAPA: string;
}

/**
 * Input data for creating a new risk (excludes auto-calculated fields)
 */
export interface RiskInput {
  processDepartment: string;
  riskDescription: string;
  cause: string;
  likelihood: number;
  impact: number;
  actionControl: string;
  owner: string;
  reviewDate?: string;
  linkedCAPA?: string;
}

/**
 * Input data for updating an existing risk
 */
export interface RiskUpdate {
  processDepartment?: string;
  riskDescription?: string;
  cause?: string;
  likelihood?: number;
  impact?: number;
  actionControl?: string;
  owner?: string;
  status?: RiskStatus;
  reviewDate?: string;
  linkedCAPA?: string;
}

/**
 * Valid risk statuses for validation
 */
const VALID_STATUSES: RiskStatus[] = ["Open", "Under Review", "Controlled", "Closed"];

/**
 * Validates likelihood and impact values
 * @param value - The value to validate
 * @returns True if value is between 1 and 5
 */
function isValidRating(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

/**
 * Validates a risk status value
 * @param status - The status to validate
 * @returns True if status is valid
 */
function isValidStatus(status: string): status is RiskStatus {
  return VALID_STATUSES.includes(status as RiskStatus);
}

/**
 * Generates a unique Risk ID based on current year and next sequence
 * @param existingIds - Array of existing risk IDs
 * @returns New unique risk ID
 */
function generateRiskId(existingIds: string[]): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const prefix = `RISK-${year}-`;
  
  const existingNumbers = existingIds
    .filter(id => id.startsWith(prefix))
    .map(id => parseInt(id.replace(prefix, ""), 10))
    .filter(num => !isNaN(num));
  
  const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
  return `${prefix}${nextNumber.toString().padStart(3, "0")}`;
}

/**
 * Parses a row from the sheet into a Risk object
 * @param row - Array of cell values
 * @param rowIndex - 1-indexed row number
 * @returns Risk object or null if invalid
 */
function parseRiskRow(row: string[], rowIndex: number): Risk | null {
  const riskId = row[0]?.trim();
  if (!riskId || riskId === "Risk ID") return null;
  
  const likelihood = parseInt(row[4], 10) || 1;
  const impact = parseInt(row[5], 10) || 1;
  
  return {
    rowIndex,
    riskId,
    processDepartment: row[1] || "",
    riskDescription: row[2] || "",
    cause: row[3] || "",
    likelihood,
    impact,
    riskScore: likelihood * impact,
    actionControl: row[7] || "",
    owner: row[8] || "",
    status: isValidStatus(row[9]) ? row[9] : "Open",
    reviewDate: row[10] || "",
    linkedCAPA: row[11] || "",
  };
}

/**
 * Fetches all risks from the Risk Register sheet
 * @returns Promise resolving to array of Risk objects
 * @throws Error if API request fails
 */
export async function getAllRisks(): Promise<Risk[]> {
  const url = `${SHEETS_API_BASE}/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}?key=${API_KEY}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to fetch risks: ${error.error?.message || response.statusText}`);
  }
  
  const data = await response.json();
  const rows: string[][] = data.values || [];
  
  const risks: Risk[] = [];
  
  // Skip header row (index 0)
  for (let i = 1; i < rows.length; i++) {
    const risk = parseRiskRow(rows[i], i + 1);
    if (risk) {
      risks.push(risk);
    }
  }
  
  return risks;
}

/**
 * Adds a new risk to the Risk Register
 * @param input - Risk data to add
 * @returns Promise resolving to the created Risk
 * @throws Error if validation fails or API request fails
 */
export async function addRisk(input: RiskInput): Promise<Risk> {
  // Validate ratings
  if (!isValidRating(input.likelihood)) {
    throw new Error("Likelihood must be an integer between 1 and 5");
  }
  if (!isValidRating(input.impact)) {
    throw new Error("Impact must be an integer between 1 and 5");
  }
  
  // Get existing risks to generate unique ID
  const existingRisks = await getAllRisks();
  const riskId = generateRiskId(existingRisks.map(r => r.riskId));
  
  // Calculate risk score
  const riskScore = input.likelihood * input.impact;
  
  // Prepare row data
  const rowData = [
    riskId,
    input.processDepartment,
    input.riskDescription,
    input.cause,
    input.likelihood.toString(),
    input.impact.toString(),
    riskScore.toString(),
    input.actionControl,
    input.owner,
    "Open", // Default status
    input.reviewDate || "",
    input.linkedCAPA || "",
  ];
  
  const url = `${SHEETS_API_BASE}/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS&key=${API_KEY}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values: [rowData] }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to add risk: ${error.error?.message || response.statusText}`);
  }
  
  return {
    rowIndex: existingRisks.length + 2,
    riskId,
    processDepartment: input.processDepartment,
    riskDescription: input.riskDescription,
    cause: input.cause,
    likelihood: input.likelihood,
    impact: input.impact,
    riskScore,
    actionControl: input.actionControl,
    owner: input.owner,
    status: "Open",
    reviewDate: input.reviewDate || "",
    linkedCAPA: input.linkedCAPA || "",
  };
}

/**
 * Updates an existing risk in the Risk Register
 * @param riskId - ID of the risk to update
 * @param updates - Fields to update
 * @returns Promise resolving to the updated Risk
 * @throws Error if risk not found, validation fails, or API request fails
 */
export async function updateRisk(riskId: string, updates: RiskUpdate): Promise<Risk> {
  const risks = await getAllRisks();
  const risk = risks.find(r => r.riskId === riskId);
  
  if (!risk) {
    throw new Error(`Risk with ID ${riskId} not found`);
  }
  
  // Validate ratings if provided
  if (updates.likelihood !== undefined && !isValidRating(updates.likelihood)) {
    throw new Error("Likelihood must be an integer between 1 and 5");
  }
  if (updates.impact !== undefined && !isValidRating(updates.impact)) {
    throw new Error("Impact must be an integer between 1 and 5");
  }
  if (updates.status !== undefined && !isValidStatus(updates.status)) {
    throw new Error(`Status must be one of: ${VALID_STATUSES.join(", ")}`);
  }
  
  // Merge updates
  const updatedRisk: Risk = {
    ...risk,
    ...updates,
    riskScore: (updates.likelihood ?? risk.likelihood) * (updates.impact ?? risk.impact),
  };
  
  // Prepare row data
  const rowData = [
    updatedRisk.riskId,
    updatedRisk.processDepartment,
    updatedRisk.riskDescription,
    updatedRisk.cause,
    updatedRisk.likelihood.toString(),
    updatedRisk.impact.toString(),
    updatedRisk.riskScore.toString(),
    updatedRisk.actionControl,
    updatedRisk.owner,
    updatedRisk.status,
    updatedRisk.reviewDate,
    updatedRisk.linkedCAPA,
  ];
  
  const range = `${SHEET_NAME}!A${risk.rowIndex}:L${risk.rowIndex}`;
  const url = `${SHEETS_API_BASE}/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED&key=${API_KEY}`;
  
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values: [rowData] }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to update risk: ${error.error?.message || response.statusText}`);
  }
  
  return updatedRisk;
}

/**
 * Calculates risk statistics for dashboard display
 * @param risks - Array of risks
 * @returns Object with risk statistics
 */
export function calculateRiskStats(risks: Risk[]) {
  const total = risks.length;
  const open = risks.filter(r => r.status === "Open").length;
  const underReview = risks.filter(r => r.status === "Under Review").length;
  const controlled = risks.filter(r => r.status === "Controlled").length;
  const closed = risks.filter(r => r.status === "Closed").length;
  
  const highRisks = risks.filter(r => r.riskScore >= 15).length;
  const mediumRisks = risks.filter(r => r.riskScore >= 8 && r.riskScore < 15).length;
  const lowRisks = risks.filter(r => r.riskScore < 8).length;
  
  const avgRiskScore = total > 0 
    ? Math.round(risks.reduce((sum, r) => sum + r.riskScore, 0) / total * 10) / 10 
    : 0;
  
  return {
    total,
    open,
    underReview,
    controlled,
    closed,
    highRisks,
    mediumRisks,
    lowRisks,
    avgRiskScore,
  };
}

/**
 * Gets the risk level label based on score
 * @param score - Risk score (1-25)
 * @returns Risk level label
 */
export function getRiskLevel(score: number): "Low" | "Medium" | "High" | "Critical" {
  if (score >= 20) return "Critical";
  if (score >= 15) return "High";
  if (score >= 8) return "Medium";
  return "Low";
}

/**
 * Gets the color class for risk level display
 * @param score - Risk score (1-25)
 * @returns Tailwind color class
 */
export function getRiskLevelColor(score: number): string {
  if (score >= 20) return "text-red-600 bg-red-100";
  if (score >= 15) return "text-orange-600 bg-orange-100";
  if (score >= 8) return "text-yellow-600 bg-yellow-100";
  return "text-green-600 bg-green-100";
}
