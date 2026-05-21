import type { LucideIcon } from "lucide-react";
import {
  Users,
  Settings,
  ClipboardCheck,
  ShoppingCart,
  GraduationCap,
  Lightbulb,
  Building2,
  FileCheck,
  BookOpen,
  AlertTriangle,
  Activity,
  Archive,
  Layers,
  Target,
  GitBranch,
  BarChart3,
} from "lucide-react";
import type { RecordStatus } from "@/lib/googleSheets";

// ============================================================================
// Module Configuration (single source of truth)
// ============================================================================

export interface ModuleConfig {
  id: string;
  name: string;
  icon: LucideIcon;
  description: string;
  isoClause: string;
  categoryPatterns: string[];
  moduleClass: string;
  path: string;
}

/** Canonical module definitions — used by Dashboard, ModulePage, TopNav, Sidebar */
export const MODULE_CONFIG: Record<string, ModuleConfig> = {
  sales: {
    id: "sales",
    name: "Sales & Customer Service",
    icon: Users,
    description: "Manage customer lifecycle from requirements capture to post-delivery feedback.",
    isoClause: "Clause 8.2, 9.1.2",
    categoryPatterns: ["sales", "01"],
    moduleClass: "module-sales",
    path: "/module/sales",
  },
  operations: {
    id: "operations",
    name: "Operations & Production",
    icon: Settings,
    description: "Plan, control, and execute operational activities with project timelines.",
    isoClause: "Clause 8.1, 8.5",
    categoryPatterns: ["operations", "02"],
    moduleClass: "module-operations",
    path: "/module/operations",
  },
  quality: {
    id: "quality",
    name: "Quality & Audit",
    icon: ClipboardCheck,
    description: "Core module for quality control, nonconformity handling, and corrective actions.",
    isoClause: "Clause 9, 10",
    categoryPatterns: ["quality", "03"],
    moduleClass: "module-quality",
    path: "/module/quality",
  },
  procurement: {
    id: "procurement",
    name: "Procurement & Vendors",
    icon: ShoppingCart,
    description: "Ensure all purchased items and vendors meet quality requirements.",
    isoClause: "Clause 8.4",
    categoryPatterns: ["procurement", "04"],
    moduleClass: "module-procurement",
    path: "/module/procurement",
  },
  hr: {
    id: "hr",
    name: "HR & Training",
    icon: GraduationCap,
    description: "Track personnel competence, training records, and performance appraisals.",
    isoClause: "Clause 7.2, 7.3",
    categoryPatterns: ["hr", "05", "training"],
    moduleClass: "module-hr",
    path: "/module/hr",
  },
  rnd: {
    id: "rnd",
    name: "R&D & Design",
    icon: Lightbulb,
    description: "Manage innovation, development requests, and technical validation.",
    isoClause: "Clause 8.3",
    categoryPatterns: ["r&d", "rnd", "06", "design"],
    moduleClass: "module-rnd",
    path: "/module/rnd",
  },
  management: {
    id: "management",
    name: "Management & Documentation",
    icon: Building2,
    description: "Control governance, documentation, KPI tracking, and leadership decisions.",
    isoClause: "Clause 5, 6, 7.5",
    categoryPatterns: ["management", "07", "documentation"],
    moduleClass: "module-management",
    path: "/module/management",
  },
};

// ============================================================================
// Navigation Items
// ============================================================================

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  moduleClass?: string;
}

/** Module navigation items — used by TopNav and Sidebar */
export const MODULE_NAV_ITEMS: NavItem[] = Object.values(MODULE_CONFIG).map(
  ({ id, name, icon, path, moduleClass }) => ({
    id,
    label: name.replace(/&.*/, "").trim() || name, // Short label: "Sales & Customer Service" → "Sales & Customer"
    icon,
    path,
    moduleClass,
  })
);

// Override labels for shorter nav display
MODULE_NAV_ITEMS[0].label = "Sales & Customer";
MODULE_NAV_ITEMS[2].label = "Quality & Audit";

/** Documentation/reference items — read-only resources */
export const DOCS_NAV_ITEMS: NavItem[] = [
  { id: "iso-manual", label: "ISO 9001 Manual", icon: FileCheck, path: "/iso-manual" },
  { id: "procedures", label: "Procedures", icon: BookOpen, path: "/procedures" },
  { id: "forms", label: "Forms Registry", icon: Layers, path: "/forms" },
];

/** Tool/navigation items — interactive tools */
export const TOOL_NAV_ITEMS: NavItem[] = [
  { id: "forms", label: "Forms Registry", icon: Layers, path: "/forms" },
  { id: "risk", label: "Risk & Process", icon: AlertTriangle, path: "/risk-management" },
  { id: "kpi", label: "KPI Dashboard", icon: Target, path: "/kpi" },
  // { id: "kpi-review", label: "KPI Review", icon: Activity, path: "/kpi/review" },
  { id: "swot", label: "SWOT Analysis", icon: BarChart3, path: "/swot-analysis" },
  { id: "traceability", label: "Traceability", icon: GitBranch, path: "/traceability" },
  { id: "activity", label: "Activity Log", icon: Activity, path: "/activity" },
  { id: "archive", label: "Record Archive", icon: Archive, path: "/archive" },
];

// ============================================================================
// Module Mappings (category string → module id)
// ============================================================================

export const MODULE_MAPPINGS: Record<string, { id: string; name: string; order: number }> = {
  "sales": { id: "sales", name: "Sales & Customer Service", order: 1 },
  "01": { id: "sales", name: "Sales & Customer Service", order: 1 },
  "01-": { id: "sales", name: "Sales & Customer Service", order: 1 },
  "operations": { id: "operations", name: "Operations & Production", order: 2 },
  "02": { id: "operations", name: "Operations & Production", order: 2 },
  "02-": { id: "operations", name: "Operations & Production", order: 2 },
  "quality": { id: "quality", name: "Quality & Audit", order: 3 },
  "03": { id: "quality", name: "Quality & Audit", order: 3 },
  "03-": { id: "quality", name: "Quality & Audit", order: 3 },
  "procurement": { id: "procurement", name: "Procurement & Vendors", order: 4 },
  "04": { id: "procurement", name: "Procurement & Vendors", order: 4 },
  "04-": { id: "procurement", name: "Procurement & Vendors", order: 4 },
  "hr": { id: "hr", name: "HR & Training", order: 5 },
  "05": { id: "hr", name: "HR & Training", order: 5 },
  "05-": { id: "hr", name: "HR & Training", order: 5 },
  "r&d": { id: "rnd", name: "R&D & Design", order: 6 },
  "rnd": { id: "rnd", name: "R&D & Design", order: 6 },
  "06": { id: "rnd", name: "R&D & Design", order: 6 },
  "06-": { id: "rnd", name: "R&D & Design", order: 6 },
  "management": { id: "management", name: "Management & Documentation", order: 7 },
  "07": { id: "management", name: "Management & Documentation", order: 7 },
  "07-": { id: "management", name: "Management & Documentation", order: 7 },
};

// ============================================================================
// Status Configuration
// ============================================================================

export const STATUS_TRANSITIONS: Record<RecordStatus, RecordStatus[]> = {
  draft: ["pending_review"],
  pending_review: ["approved", "rejected"],
  approved: [],
  rejected: ["draft"],
};

export const STATUS_LABELS: Record<RecordStatus, { en: string; color: string }> = {
  draft: { en: "Draft", color: "gray" },
  pending_review: { en: "Pending Review", color: "yellow" },
  approved: { en: "Approved", color: "green" },
  rejected: { en: "Rejected", color: "red" },
};

/** Normalize a category string to a module id and name */
export function normalizeCategory(category: string): { id: string; name: string } | null {
  if (!category) return null;

  const lower = category.toLowerCase().trim();

  for (const [key, value] of Object.entries(MODULE_MAPPINGS)) {
    if (lower.includes(key)) {
      return value;
    }
  }

  return null;
}

/** Normalize an audit status string */
export function normalizeAuditStatus(status: string): "compliant" | "pending" | "issue" {
  const lower = (status || "").toLowerCase().trim();

  if (lower.includes("approved") || lower.includes("compliant") || lower.includes("\u2705")) {
    return "compliant";
  }
  if (lower.includes("nc") || lower.includes("issue") || lower.includes("invalid") || lower.includes("\u274c")) {
    return "issue";
  }
  return "pending";
}