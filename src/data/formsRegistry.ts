// ============================================================================
// QBase Forms Registry — ISO 9001:2015
// Complete catalogue of all 36 QBase forms organized by section.
//
// This catalogue is the identity source for every form: its names and its
// section numbers are the ones the production records carry (F/11 is
// "Production Plan" in section 2 — the unified schema in
// src/schemas/unifiedSchema.ts re-numbered and re-named a subset of the
// forms and never carried the change here). See src/data/formCatalog.ts for
// the merged catalogue every surface reads.
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
    lastRecordCount: 6,
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
    lastRecordCount: 1,
    lastRecordDate: "Jan 2026",
    notes: "F/09-001 — ETH-Cedric project",
  },
  {
    code: "F/10",
    name: "Customer Feedback",
    section: 1,
    sectionName: "Sales & Customer Service",
    isoClause: "Clause 8.2",
    // Monthly, not "On event": the form template (src/schemas/unifiedSchema.ts)
    // declares a monthly cadence, and the restored production records file it
    // in Jan, Jul and Aug 2026. The "On event" entry here was documentation
    // drift — and because the compliance engine read this catalogue, it hid
    // six missed monthly filings behind the wrong cadence.
    frequency: "Monthly",
    importance: "High",
    lastRecordCount: 4,
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
    lastRecordCount: 1,
    lastRecordDate: "Jan 2026",
    notes: "F/50-001 — ETH-Cedric project",
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
    lastRecordCount: 9,
    lastRecordDate: "Apr 2026",
    notes: "F/11-001 to F/11-009 covering all active projects",
  },
  {
    code: "F/19",
    name: "Product Description",
    section: 2,
    sectionName: "Operations & Production",
    isoClause: "Clause 8.1",
    frequency: "Per project",
    importance: "High",
    lastRecordCount: 8,
    lastRecordDate: "Feb 2026",
    notes: "F/19-001 to F/19-008 — one per product",
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
    lastRecordCount: 1,
    lastRecordDate: "Jan 2026",
    notes: "F/12-001 — 5 non-conforming items",
  },
  {
    code: "F/17",
    name: "QA Test Request",
    section: 3,
    sectionName: "Quality & Audit",
    isoClause: "Clause 8.6",
    frequency: "On event",
    importance: "High",
    lastRecordCount: 1,
    lastRecordDate: "Jan 2026",
    notes: "F/17-001 — QA test request for ETH-Cedric",
  },
  {
    code: "F/18",
    name: "Product Re-Call",
    section: 3,
    sectionName: "Quality & Audit",
    isoClause: "Clause 8.7",
    frequency: "On event",
    importance: "Critical",
    lastRecordCount: 1,
    lastRecordDate: "Jan 2026",
    notes: "F/18-001 — product re-call report",
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
    lastRecordCount: 1,
    lastRecordDate: "Jan 2026",
    notes: "F/47-001 — internal audit checklist",
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
    lastRecordCount: 1,
    lastRecordDate: "Jan 2026",
    notes: "F/13-001 — purchase order for ETH-Cedric",
  },
  {
    code: "F/14",
    name: "Incoming Inspection",
    section: 4,
    sectionName: "Procurement & Vendors",
    isoClause: "Clause 8.4",
    frequency: "On event",
    importance: "Medium",
    lastRecordCount: 1,
    lastRecordDate: "Jan 2026",
    notes: "F/14-001 — incoming inspection",
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
    lastRecordCount: 15,
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
    lastRecordCount: 19,
    lastRecordDate: "2026",
    notes: "F/29-001 to F/29-019 — training records for all employees",
  },
  {
    code: "F/30",
    name: "Performance Appraisal",
    section: 5,
    sectionName: "HR & Training",
    isoClause: "Clause 7.2",
    frequency: "Per person",
    importance: "High",
    lastRecordCount: 56,
    lastRecordDate: "2026",
    notes: "F/30-001 to F/30-056 (56 unique agents)",
  },
  {
    code: "F/40",
    name: "Competence Matrix",
    section: 5,
    sectionName: "HR & Training",
    isoClause: "Clause 7.2",
    frequency: "Semi-annual",
    importance: "High",
    lastRecordCount: 3,
    lastRecordDate: "2026",
    notes: "F/40-001 to F/40-003",
  },
  {
    code: "F/41",
    name: "Gap Analysis",
    section: 5,
    sectionName: "HR & Training",
    isoClause: "Clause 7.2",
    frequency: "On event",
    importance: "Medium",
    lastRecordCount: 4,
    lastRecordDate: "2026",
    notes: "F/41-001 to F/41-004 — gap analyses",
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
    lastRecordCount: 68,
    lastRecordDate: "Feb 2026",
    notes: "F/43-001 to F/43-068 — induction records for all hires",
  },
  {
    code: "F/44",
    name: "Job Description",
    section: 5,
    sectionName: "HR & Training",
    isoClause: "Clause 7.2",
    frequency: "Per role",
    importance: "Medium",
    lastRecordCount: 22,
    lastRecordDate: "2026",
    notes: "F/44-001 to F/44-022 — job descriptions for all roles",
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
    lastRecordCount: 1,
    lastRecordDate: "Jan 2026",
    notes: "F/32-001 — R&D request for ETH-Cedric",
  },
  {
    code: "F/34",
    name: "Design Verification",
    section: 6,
    sectionName: "R&D & Design",
    isoClause: "Clause 8.3",
    frequency: "After design",
    importance: "High",
    lastRecordCount: 1,
    lastRecordDate: "Jan 2026",
    notes: "F/34-001 — design verification for ETH-Cedric",
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
    lastRecordCount: 1,
    lastRecordDate: "Jan 2026",
    notes: "F/37-001 — experiment data for ETH-Cedric",
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
    lastRecordCount: 1,
    lastRecordDate: "2026",
    notes: "F/23-001 — master list of records",
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
    lastRecordCount: 1,
    lastRecordDate: "2026",
    notes: "F/45-001 — master list of documents",
  },
  {
    code: "F/46",
    name: "Change Management",
    section: 7,
    sectionName: "Management & Documentation",
    isoClause: "Clause 7.5",
    frequency: "On event",
    importance: "Medium",
    lastRecordCount: 1,
    lastRecordDate: "Jan 2026",
    notes: "F/46-001 — change management request",
  },
  {
    code: "F/49",
    name: "Document Master List",
    section: 7,
    sectionName: "Management & Documentation",
    isoClause: "Clause 7.5",
    // Monthly, per src/schemas/unifiedSchema.ts. The registry never listed
    // this form, so the compliance surfaces had no way to report it — it is
    // the one form in the catalogue with no filing at all.
    frequency: "Monthly",
    importance: "High",
    notes: "Master list of all controlled documents — never filed",
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
      return "bg-destructive/15 text-destructive-tint border-destructive/20";
    case "High":
      return "bg-warning/15 text-warning-tint border-warning/20";
    case "Medium":
      return "bg-warning/15 text-warning-tint border-warning/20";
    case "Low":
      return "bg-muted/30 text-muted-foreground border-border/50";
  }
}

export function getImportanceDotColor(importance: FormImportance): string {
  switch (importance) {
    case "Critical":
      return "bg-destructive";
    case "High":
      return "bg-warning";
    case "Medium":
      return "bg-warning";
    case "Low":
      return "bg-muted-foreground/50";
  }
}

export function getFrequencyBadgeColor(frequency: FormFrequency): string {
  if (frequency === "On event") return "bg-primary/10 text-primary-tint border-primary/20";
  if (frequency.includes("Monthly") || frequency.includes("Semi")) return "bg-primary/10 text-primary-tint border-primary/20";
  if (frequency === "Annual" || frequency === "Quarterly") return "bg-success/10 text-success-tint border-success/20";
  return "bg-muted/20 text-muted-foreground border-border/50";
}

export function getSectionColor(section: number): string {
  const colors: Record<number, string> = {
    1: "bg-primary/10 text-primary-tint border-primary/20",
    2: "bg-primary/10 text-primary-tint border-primary/20",
    3: "bg-success/10 text-success-tint border-success/20",
    4: "bg-warning/10 text-warning-tint border-warning/20",
    5: "bg-primary/10 text-primary-tint border-primary/20",
    6: "bg-primary/10 text-primary-tint border-primary/20",
    7: "bg-destructive/10 text-destructive-tint border-destructive/20",
  };
  return colors[section] || "bg-muted/20 text-muted-foreground border-border/50";
}