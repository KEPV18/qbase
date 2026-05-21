// ============================================================================
// QMS Forms Registry — ISO 9001:2015
// Complete catalogue of all 35 QMS forms organized by section
// ============================================================================

export type FormFrequency =
  | "Monthly"
  | "Quarterly"
  | "Semi-annual"
  | "Annual"
  | "On event"
  | "Per project"
  | "Per session"
  | "Per employee"
  | "Per person"
  | "Per role"
  | "Per new hire"
  | "After design"
  | "During testing"
  | "Monthly during dev"
  | "Before review"
  | "After review"
  | "When record added"
  | "When document created";

export type FormImportance = "Critical" | "High" | "Medium" | "Low";

export interface FormEntry {
  code: string;
  name: string;
  section: number;
  sectionName: string;
  isoClause: string;
  frequency: FormFrequency;
  importance: FormImportance;
  lastRecordCount?: number;
  lastRecordDate?: string;
  notes: string;
}

export const FORMS_REGISTRY: FormEntry[] = [
  // ── Section 01 — Sales & Customer Service ──────────────────────────────────
  {
    code: "F/08",
    name: "Order Form",
    section: 1,
    sectionName: "Sales & Customer Service",
    isoClause: "Clause 8.2",
    frequency: "On event",
    importance: "Critical",
    lastRecordCount: 3,
    lastRecordDate: "Jan-Feb 2026",
    notes: "Created for BatFast, ETH, ETH-Cedric projects",
  },
  {
    code: "F/09",
    name: "Customer Complaint",
    section: 1,
    sectionName: "Sales & Customer Service",
    isoClause: "Clause 8.2",
    frequency: "On event",
    importance: "High",
    lastRecordCount: 0,
    lastRecordDate: "N/A",
    notes: "No complaints filed in 2026",
  },
  {
    code: "F/10",
    name: "Customer Feedback",
    section: 1,
    sectionName: "Sales & Customer Service",
    isoClause: "Clause 8.2",
    frequency: "On event",
    importance: "High",
    lastRecordCount: 2,
    lastRecordDate: "Feb 2026",
    notes: "Created for BatFast and ETH-Cedric",
  },
  {
    code: "F/50",
    name: "Customer Property Register",
    section: 1,
    sectionName: "Sales & Customer Service",
    isoClause: "Clause 8.2",
    frequency: "On event",
    importance: "Medium",
    lastRecordCount: 0,
    lastRecordDate: "N/A",
    notes: "Not applicable — no customer property tracked",
  },

  // ── Section 02 — Operations & Production ───────────────────────────────────
  {
    code: "F/11",
    name: "Production Plan",
    section: 2,
    sectionName: "Operations & Production",
    isoClause: "Clause 8.1",
    frequency: "Monthly",
    importance: "Critical",
    lastRecordCount: 7,
    lastRecordDate: "Apr 2026",
    notes: "Comprehensive monthly plans covering all active projects. F/11-001 to F/11-007",
  },
  {
    code: "F/19",
    name: "Product Description",
    section: 2,
    sectionName: "Operations & Production",
    isoClause: "Clause 8.1",
    frequency: "Per project",
    importance: "High",
    lastRecordCount: 3,
    lastRecordDate: "Feb 2026",
    notes: "One per project: BatFast, ETH, ETH-Cedric",
  },

  // ── Section 03 — Quality & Audit ───────────────────────────────────────────
  {
    code: "F/12",
    name: "Non-Conforming",
    section: 3,
    sectionName: "Quality & Audit",
    isoClause: "Clause 8.7",
    frequency: "On event",
    importance: "Critical",
    lastRecordCount: 0,
    lastRecordDate: "N/A",
    notes: "No nonconformities in 2026",
  },
  {
    code: "F/17",
    name: "QA Test Request",
    section: 3,
    sectionName: "Quality & Audit",
    isoClause: "Clause 8.6",
    frequency: "On event",
    importance: "High",
    lastRecordCount: 0,
    lastRecordDate: "N/A",
    notes: "No QA test requests in 2026",
  },
  {
    code: "F/18",
    name: "Product Re-Call",
    section: 3,
    sectionName: "Quality & Audit",
    isoClause: "Clause 8.7",
    frequency: "On event",
    importance: "Critical",
    lastRecordCount: 0,
    lastRecordDate: "N/A",
    notes: "No product recalls in 2026",
  },
  {
    code: "F/22",
    name: "Corrective Action",
    section: 3,
    sectionName: "Quality & Audit",
    isoClause: "Clause 10.2",
    frequency: "On event",
    importance: "Critical",
    lastRecordCount: 2,
    lastRecordDate: "Feb 2026",
    notes: "F/22-001 and F/22-002 (ETH-Cedric)",
  },
  {
    code: "F/25",
    name: "Audit Plan",
    section: 3,
    sectionName: "Quality & Audit",
    isoClause: "Clause 9.2",
    frequency: "Semi-annual",
    importance: "Critical",
    lastRecordCount: 1,
    lastRecordDate: "H1 2026",
    notes: "Semi-annual audit schedule",
  },
  {
    code: "F/47",
    name: "Audit Checklist",
    section: 3,
    sectionName: "Quality & Audit",
    isoClause: "Clause 9.2",
    frequency: "On event",
    importance: "High",
    lastRecordCount: 0,
    lastRecordDate: "N/A",
    notes: "No audit checklists in 2026",
  },
  {
    code: "F/48",
    name: "Internal Audit Report",
    section: 3,
    sectionName: "Quality & Audit",
    isoClause: "Clause 9.2",
    frequency: "Monthly",
    importance: "Critical",
    lastRecordCount: 4,
    lastRecordDate: "Apr 2026",
    notes: "F/48-001 to F/48-004 (Jan-Apr)",
  },

  // ── Section 04 — Procurement & Vendors ─────────────────────────────────────
  {
    code: "F/13",
    name: "Purchase Order",
    section: 4,
    sectionName: "Procurement & Vendors",
    isoClause: "Clause 8.4",
    frequency: "On event",
    importance: "High",
    lastRecordCount: 0,
    lastRecordDate: "N/A",
    notes: "No purchase orders in 2026",
  },
  {
    code: "F/14",
    name: "Incoming Inspection",
    section: 4,
    sectionName: "Procurement & Vendors",
    isoClause: "Clause 8.4",
    frequency: "On event",
    importance: "Medium",
    lastRecordCount: 0,
    lastRecordDate: "N/A",
    notes: "No incoming inspections in 2026",
  },
  {
    code: "F/15",
    name: "Approved Vendor List",
    section: 4,
    sectionName: "Procurement & Vendors",
    isoClause: "Clause 8.4",
    frequency: "Annual",
    importance: "High",
    lastRecordCount: 1,
    lastRecordDate: "2026",
    notes: "Annual vendor qualification list",
  },
  {
    code: "F/16",
    name: "Supplier Registration Form",
    section: 4,
    sectionName: "Procurement & Vendors",
    isoClause: "Clause 8.4",
    frequency: "Annual",
    importance: "High",
    lastRecordCount: 1,
    lastRecordDate: "2026",
    notes: "F/16-001 — supplier onboarding",
  },

  // ── Section 05 — HR & Training ─────────────────────────────────────────────
  {
    code: "F/28",
    name: "Training Attendance",
    section: 5,
    sectionName: "HR & Training",
    isoClause: "Clause 7.2",
    frequency: "Per session",
    importance: "Critical",
    lastRecordCount: 8,
    lastRecordDate: "Feb 2026",
    notes: "Training attendance for all 3 projects",
  },
  {
    code: "F/29",
    name: "Training Record",
    section: 5,
    sectionName: "HR & Training",
    isoClause: "Clause 7.2",
    frequency: "Per employee",
    importance: "Critical",
    lastRecordCount: 5,
    lastRecordDate: "2026",
    notes: "Only 5 exist — many more needed for 63 employees",
  },
  {
    code: "F/30",
    name: "Performance Appraisal",
    section: 5,
    sectionName: "HR & Training",
    isoClause: "Clause 7.2",
    frequency: "Per person",
    importance: "High",
    lastRecordCount: 19,
    lastRecordDate: "2026",
    notes: "F/30-038 to F/30-056 (19 unique agents)",
  },
  {
    code: "F/40",
    name: "Competence Matrix",
    section: 5,
    sectionName: "HR & Training",
    isoClause: "Clause 7.2",
    frequency: "Semi-annual",
    importance: "High",
    lastRecordCount: 4,
    lastRecordDate: "2026",
    notes: "F/40-001 to F/40-004",
  },
  {
    code: "F/41",
    name: "Gap Analysis",
    section: 5,
    sectionName: "HR & Training",
    isoClause: "Clause 7.2",
    frequency: "On event",
    importance: "Medium",
    lastRecordCount: 0,
    lastRecordDate: "N/A",
    notes: "No gap analyses in 2026",
  },
  {
    code: "F/42",
    name: "Annual Training Plan",
    section: 5,
    sectionName: "HR & Training",
    isoClause: "Clause 7.2",
    frequency: "Annual",
    importance: "High",
    lastRecordCount: 1,
    lastRecordDate: "2026",
    notes: "Annual training strategy document",
  },
  {
    code: "F/43",
    name: "Induction Training Record",
    section: 5,
    sectionName: "HR & Training",
    isoClause: "Clause 7.2",
    frequency: "Per new hire",
    importance: "Critical",
    lastRecordCount: 64,
    lastRecordDate: "Feb 2026",
    notes: "All 3 projects: BatFast (5), ETH (15), ETH-Cedric (6 duplicates counted once)",
  },
  {
    code: "F/44",
    name: "Job Description",
    section: 5,
    sectionName: "HR & Training",
    isoClause: "Clause 7.2",
    frequency: "Per role",
    importance: "Medium",
    lastRecordCount: 0,
    lastRecordDate: "N/A",
    notes: "No job descriptions in 2026",
  },

  // ── Section 06 — R&D & Design ─────────────────────────────────────────────
  {
    code: "F/32",
    name: "R&D Request",
    section: 6,
    sectionName: "R&D & Design",
    isoClause: "Clause 8.3",
    frequency: "On event",
    importance: "Medium",
    lastRecordCount: 0,
    lastRecordDate: "N/A",
    notes: "No R&D requests in 2026",
  },
  {
    code: "F/34",
    name: "Design Verification",
    section: 6,
    sectionName: "R&D & Design",
    isoClause: "Clause 8.3",
    frequency: "After design",
    importance: "High",
    lastRecordCount: 0,
    lastRecordDate: "N/A",
    notes: "No design verifications in 2026",
  },
  {
    code: "F/35",
    name: "Design Monitoring",
    section: 6,
    sectionName: "R&D & Design",
    isoClause: "Clause 8.3",
    frequency: "Monthly during dev",
    importance: "Medium",
    lastRecordCount: 4,
    lastRecordDate: "Apr 2026",
    notes: "F/35-001 to F/35-004 (Jan-Apr)",
  },
  {
    code: "F/37",
    name: "Experiment Data",
    section: 6,
    sectionName: "R&D & Design",
    isoClause: "Clause 8.3",
    frequency: "During testing",
    importance: "Low",
    lastRecordCount: 0,
    lastRecordDate: "N/A",
    notes: "No experiments in 2026",
  },

  // ── Section 07 — Management & Documentation ────────────────────────────────
  {
    code: "F/20",
    name: "Review Agenda",
    section: 7,
    sectionName: "Management & Documentation",
    isoClause: "Clause 9.3",
    frequency: "Before review",
    importance: "High",
    lastRecordCount: 4,
    lastRecordDate: "Apr 2026",
    notes: "F/20-001 to F/20-004 (Jan-Apr)",
  },
  {
    code: "F/21",
    name: "Review Minutes",
    section: 7,
    sectionName: "Management & Documentation",
    isoClause: "Clause 9.3",
    frequency: "After review",
    importance: "Critical",
    lastRecordCount: 4,
    lastRecordDate: "Apr 2026",
    notes: "F/21-001 to F/21-004 (Jan-Apr)",
  },
  {
    code: "F/23",
    name: "Master List of Records",
    section: 7,
    sectionName: "Management & Documentation",
    isoClause: "Clause 7.5",
    frequency: "When record added",
    importance: "Critical",
    lastRecordCount: 2,
    lastRecordDate: "2026",
    notes: "F/23-001, F/23-002",
  },
  {
    code: "F/24",
    name: "Objectives & Targets",
    section: 7,
    sectionName: "Management & Documentation",
    isoClause: "Clause 6.2",
    frequency: "Quarterly",
    importance: "High",
    lastRecordCount: 4,
    lastRecordDate: "Q2 2026",
    notes: "F/24-001 to F/24-004",
  },
  {
    code: "F/45",
    name: "Master List of Documents",
    section: 7,
    sectionName: "Management & Documentation",
    isoClause: "Clause 7.5",
    frequency: "When document created",
    importance: "Critical",
    lastRecordCount: 2,
    lastRecordDate: "2026",
    notes: "F/45-001, F/45-002",
  },
  {
    code: "F/46",
    name: "Change Management",
    section: 7,
    sectionName: "Management & Documentation",
    isoClause: "Clause 7.5",
    frequency: "On event",
    importance: "Medium",
    lastRecordCount: 0,
    lastRecordDate: "N/A",
    notes: "No change requests in 2026",
  },
];

// ============================================================================
// Section definitions for navigation / filtering
// ============================================================================

export interface SectionDef {
  id: number;
  name: string;
  moduleKey: string;
}

export const FORMS_SECTIONS: SectionDef[] = [
  { id: 1, name: "Sales & Customer Service", moduleKey: "sales" },
  { id: 2, name: "Operations & Production", moduleKey: "operations" },
  { id: 3, name: "Quality & Audit", moduleKey: "quality" },
  { id: 4, name: "Procurement & Vendors", moduleKey: "procurement" },
  { id: 5, name: "HR & Training", moduleKey: "hr" },
  { id: 6, name: "R&D & Design", moduleKey: "rnd" },
  { id: 7, name: "Management & Documentation", moduleKey: "management" },
];

// ============================================================================
// Utility helpers
// ============================================================================

export function getImportanceColor(importance: FormImportance): string {
  switch (importance) {
    case "Critical":
      return "bg-destructive/15 text-destructive border-destructive/20";
    case "High":
      return "bg-orange-500/15 text-orange-400 border-orange-500/20";
    case "Medium":
      return "bg-yellow-500/15 text-yellow-400 border-yellow-500/20";
    case "Low":
      return "bg-muted/30 text-muted-foreground border-border/50";
  }
}

export function getImportanceDotColor(importance: FormImportance): string {
  switch (importance) {
    case "Critical":
      return "bg-destructive";
    case "High":
      return "bg-orange-500";
    case "Medium":
      return "bg-yellow-500";
    case "Low":
      return "bg-muted-foreground/50";
  }
}

export function getFrequencyBadgeColor(frequency: FormFrequency): string {
  if (frequency === "On event") return "bg-primary/10 text-primary border-primary/20";
  if (frequency.includes("Monthly") || frequency.includes("Semi")) return "bg-accent/10 text-accent border-accent/20";
  if (frequency === "Annual" || frequency === "Quarterly") return "bg-success/10 text-success border-success/20";
  return "bg-muted/20 text-muted-foreground border-border/50";
}

export function getSectionColor(section: number): string {
  const colors: Record<number, string> = {
    1: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    2: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    3: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    4: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    5: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    6: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    7: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  };
  return colors[section] || "bg-muted/20 text-muted-foreground border-border/50";
}