/**
 * Process Interaction Service
 * 
 * Handles all CRUD operations for the Process Interaction Sheet (Process Map).
 * Connects to Google Sheets "Process Interaction Sheet" tab as the single source of truth.
 * 
 * @module processInteractionService
 * @version 1.0.0
 * @iso ISO 9001:2015 Clause 4.4 - Quality management system and its processes
 */

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || "";
const SPREADSHEET_ID = import.meta.env.VITE_SPREADSHEET_ID || "";
const SHEET_NAME = "Process Interaction Sheet";
const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

/**
 * Process Interaction object representing a single process entry
 */
export interface ProcessInteraction {
  /** Row index in the sheet (1-indexed, used for updates) */
  rowIndex: number;
  /** Unique process name */
  processName: string;
  /** Person responsible for this process */
  processOwner: string;
  /** Inputs required for this process */
  inputs: string;
  /** Main activities performed in this process */
  mainActivities: string;
  /** Outputs/records produced by this process */
  outputs: string;
  /** Process or department receiving the outputs */
  receiver: string;
  /** Key Performance Indicator for this process */
  kpi: string;
}

/**
 * Input data for creating a new process
 */
export interface ProcessInput {
  processName: string;
  processOwner: string;
  inputs: string;
  mainActivities: string;
  outputs: string;
  receiver: string;
  kpi: string;
}

/**
 * Input data for updating an existing process
 */
export interface ProcessUpdate {
  processOwner?: string;
  inputs?: string;
  mainActivities?: string;
  outputs?: string;
  receiver?: string;
  kpi?: string;
}

/**
 * Parses a row from the sheet into a ProcessInteraction object
 * @param row - Array of cell values
 * @param rowIndex - 1-indexed row number
 * @returns ProcessInteraction object or null if invalid
 */
function parseProcessRow(row: string[], rowIndex: number): ProcessInteraction | null {
  const processName = row[0]?.trim();
  if (!processName || processName === "Process Name") return null;
  
  return {
    rowIndex,
    processName,
    processOwner: row[1] || "",
    inputs: row[2] || "",
    mainActivities: row[3] || "",
    outputs: row[4] || "",
    receiver: row[5] || "",
    kpi: row[6] || "",
  };
}

/**
 * Fetches all processes from the Process Interaction Sheet
 * @returns Promise resolving to array of ProcessInteraction objects
 * @throws Error if API request fails
 */
export async function getAllProcesses(): Promise<ProcessInteraction[]> {
  const url = `${SHEETS_API_BASE}/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}?key=${API_KEY}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to fetch processes: ${error.error?.message || response.statusText}`);
  }
  
  const data = await response.json();
  const rows: string[][] = data.values || [];
  
  const processes: ProcessInteraction[] = [];
  
  // Skip header row (index 0)
  for (let i = 1; i < rows.length; i++) {
    const process = parseProcessRow(rows[i], i + 1);
    if (process) {
      processes.push(process);
    }
  }
  
  return processes;
}

/**
 * Adds a new process to the Process Interaction Sheet
 * @param input - Process data to add
 * @returns Promise resolving to the created ProcessInteraction
 * @throws Error if validation fails or API request fails
 */
export async function addProcess(input: ProcessInput): Promise<ProcessInteraction> {
  // Validate required fields
  if (!input.processName || input.processName.trim() === "") {
    throw new Error("Process Name is required");
  }
  if (!input.processOwner || input.processOwner.trim() === "") {
    throw new Error("Process Owner is required");
  }
  if (!input.outputs || input.outputs.trim() === "") {
    throw new Error("Outputs (Records) is required");
  }
  if (!input.receiver || input.receiver.trim() === "") {
    throw new Error("Receiver is required");
  }
  if (!input.kpi || input.kpi.trim() === "") {
    throw new Error("KPI is mandatory and must be measurable");
  }
  
  // Check for duplicate process names
  const existingProcesses = await getAllProcesses();
  const isDuplicate = existingProcesses.some(
    p => p.processName.toLowerCase() === input.processName.toLowerCase()
  );
  
  if (isDuplicate) {
    throw new Error(`Process with name "${input.processName}" already exists`);
  }
  
  // Prepare row data
  const rowData = [
    input.processName,
    input.processOwner,
    input.inputs,
    input.mainActivities,
    input.outputs,
    input.receiver,
    input.kpi,
  ];
  
  const url = `${SHEETS_API_BASE}/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS&key=${API_KEY}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values: [rowData] }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to add process: ${error.error?.message || response.statusText}`);
  }
  
  return {
    rowIndex: existingProcesses.length + 2,
    ...input,
  };
}

/**
 * Updates an existing process in the Process Interaction Sheet
 * @param processName - Name of the process to update
 * @param updates - Fields to update
 * @returns Promise resolving to the updated ProcessInteraction
 * @throws Error if process not found, validation fails, or API request fails
 */
export async function updateProcess(processName: string, updates: ProcessUpdate): Promise<ProcessInteraction> {
  const processes = await getAllProcesses();
  const process = processes.find(p => p.processName === processName);
  
  if (!process) {
    throw new Error(`Process "${processName}" not found`);
  }
  
  // Merge updates
  const updatedProcess: ProcessInteraction = {
    ...process,
    ...updates,
  };
  
  // Validate required fields after merge
  if (!updatedProcess.processOwner || updatedProcess.processOwner.trim() === "") {
    throw new Error("Process Owner is required");
  }
  if (!updatedProcess.receiver || updatedProcess.receiver.trim() === "") {
    throw new Error("Receiver is required");
  }
  if (!updatedProcess.kpi || updatedProcess.kpi.trim() === "") {
    throw new Error("KPI is mandatory and must be measurable");
  }
  
  // Prepare row data
  const rowData = [
    updatedProcess.processName,
    updatedProcess.processOwner,
    updatedProcess.inputs,
    updatedProcess.mainActivities,
    updatedProcess.outputs,
    updatedProcess.receiver,
    updatedProcess.kpi,
  ];
  
  const range = `${SHEET_NAME}!A${process.rowIndex}:G${process.rowIndex}`;
  const url = `${SHEETS_API_BASE}/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED&key=${API_KEY}`;
  
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values: [rowData] }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to update process: ${error.error?.message || response.statusText}`);
  }
  
  return updatedProcess;
}

/**
 * Calculates process statistics for dashboard display
 * @param processes - Array of processes
 * @returns Object with process statistics
 */
export function calculateProcessStats(processes: ProcessInteraction[]) {
  const total = processes.length;
  
  // Count unique owners
  const uniqueOwners = new Set(processes.map(p => p.processOwner)).size;
  
  // Count processes with KPIs defined
  const withKPI = processes.filter(p => p.kpi && p.kpi.trim() !== "").length;
  
  // Extract record references (F/xx format) from outputs
  const recordReferences = processes
    .flatMap(p => p.outputs.match(/F\/\d+/g) || [])
    .filter((v, i, a) => a.indexOf(v) === i);
  
  // Count unique receivers
  const uniqueReceivers = new Set(processes.map(p => p.receiver)).size;
  
  return {
    total,
    uniqueOwners,
    withKPI,
    kpiCoverage: total > 0 ? Math.round((withKPI / total) * 100) : 0,
    recordReferences: recordReferences.length,
    uniqueReceivers,
  };
}

/**
 * Gets process flow data for visualization
 * @param processes - Array of processes
 * @returns Array of flow connections
 */
export function getProcessFlow(processes: ProcessInteraction[]): { from: string; to: string }[] {
  return processes
    .filter(p => p.receiver && p.receiver.trim() !== "")
    .map(p => ({
      from: p.processName,
      to: p.receiver,
    }));
}

/**
 * Finds processes that depend on a specific process
 * @param processName - Name of the process
 * @param processes - Array of all processes
 * @returns Array of dependent process names
 */
export function findDependentProcesses(processName: string, processes: ProcessInteraction[]): string[] {
  return processes
    .filter(p => 
      p.inputs.toLowerCase().includes(processName.toLowerCase()) ||
      p.receiver === processName
    )
    .map(p => p.processName);
}

/**
 * Extracts record codes from process outputs
 * @param outputs - Outputs string containing record references
 * @returns Array of record codes
 */
export function extractRecordCodes(outputs: string): string[] {
  const matches = outputs.match(/F\/\d+/g);
  return matches ? [...new Set(matches)] : [];
}
