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
  Layers,
  FilePlus,
  Database,
  Shield,
  FolderOpen,
} from "lucide-react";

// ============================================================================
// Module Configuration
// Maps ISO 9001 sections to QMS Forge form schema sections.
// section numbers (1-7) correspond to formSchema.section field.
// ============================================================================

export interface ModuleConfig {
  id: string;
  name: string;
  icon: LucideIcon;
  description: string;
  isoClause: string;
  section: number;  // matches formSchema.section — the canonical linkage
  moduleClass: string;
  path: string;
}

/** Canonical module definitions — linked to form schemas by section number */
export const MODULE_CONFIG: Record<string, ModuleConfig> = {
  sales: {
    id: "sales",
    name: "Sales & Customer Service",
    icon: Users,
    description: "Manage customer lifecycle from requirements capture to post-delivery feedback.",
    isoClause: "Clause 8.2, 9.1.2",
    section: 1,
    moduleClass: "module-sales",
    path: "/module/sales",
  },
  operations: {
    id: "operations",
    name: "Operations & Production",
    icon: Settings,
    description: "Plan, control, and execute operational activities with project timelines.",
    isoClause: "Clause 8.1, 8.5",
    section: 2,
    moduleClass: "module-operations",
    path: "/module/operations",
  },
  quality: {
    id: "quality",
    name: "Quality & Audit",
    icon: ClipboardCheck,
    description: "Core module for quality control, nonconformity handling, and corrective actions.",
    isoClause: "Clause 9, 10",
    section: 3,
    moduleClass: "module-quality",
    path: "/module/quality",
  },
  procurement: {
    id: "procurement",
    name: "Procurement & Vendors",
    icon: ShoppingCart,
    description: "Ensure all purchased items and vendors meet quality requirements.",
    isoClause: "Clause 8.4",
    section: 4,
    moduleClass: "module-procurement",
    path: "/module/procurement",
  },
  hr: {
    id: "hr",
    name: "HR & Training",
    icon: GraduationCap,
    description: "Track personnel competence, training records, and performance appraisals.",
    isoClause: "Clause 7.2, 7.3",
    section: 5,
    moduleClass: "module-hr",
    path: "/module/hr",
  },
  rnd: {
    id: "rnd",
    name: "R&D & Design",
    icon: Lightbulb,
    description: "Manage innovation, development requests, and technical validation.",
    isoClause: "Clause 8.3",
    section: 6,
    moduleClass: "module-rnd",
    path: "/module/rnd",
  },
  management: {
    id: "management",
    name: "Management & Documentation",
    icon: Building2,
    description: "Control governance, documentation, KPI tracking, and leadership decisions.",
    isoClause: "Clause 5, 6, 7.5",
    section: 7,
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
  section?: number;  // optional link to form section for filtering
}

/** Module navigation items — used by TopNav and Sidebar */
export const MODULE_NAV_ITEMS: NavItem[] = Object.values(MODULE_CONFIG).map(
  ({ id, name, icon, path, moduleClass, section }) => ({
    id,
    label: name.replace(/&.*/, "").trim() || name,
    icon,
    path,
    section,
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

/** Tool/navigation items — interactive tools, all Supabase-connected */
export const TOOL_NAV_ITEMS: NavItem[] = [
  { id: "create", label: "Create Record", icon: FilePlus, path: "/create" },
  { id: "records", label: "Records", icon: Database, path: "/records" },
  { id: "risk", label: "Risk & Process", icon: AlertTriangle, path: "/risk-management" },
  { id: "activity", label: "Activity Log", icon: Activity, path: "/activity" },
  { id: "integrity", label: "Integrity", icon: Shield, path: "/integrity" },
  { id: "projects", label: "Projects", icon: FolderOpen, path: "/projects" },
];

// ============================================================================
// Module Mappings (section number → module)
// Used by SupabaseStorage to map record categories to modules
// ============================================================================

export const MODULE_MAPPINGS: Record<string, { id: string; name: string; order: number }> = {
  "sales": { id: "sales", name: "Sales & Customer Service", order: 1 },
  "1": { id: "sales", name: "Sales & Customer Service", order: 1 },
  "01": { id: "sales", name: "Sales & Customer Service", order: 1 },
  "operations": { id: "operations", name: "Operations & Production", order: 2 },
  "2": { id: "operations", name: "Operations & Production", order: 2 },
  "02": { id: "operations", name: "Operations & Production", order: 2 },
  "quality": { id: "quality", name: "Quality & Audit", order: 3 },
  "3": { id: "quality", name: "Quality & Audit", order: 3 },
  "03": { id: "quality", name: "Quality & Audit", order: 3 },
  "procurement": { id: "procurement", name: "Procurement & Vendors", order: 4 },
  "4": { id: "procurement", name: "Procurement & Vendors", order: 4 },
  "04": { id: "procurement", name: "Procurement & Vendors", order: 4 },
  "hr": { id: "hr", name: "HR & Training", order: 5 },
  "5": { id: "hr", name: "HR & Training", order: 5 },
  "05": { id: "hr", name: "HR & Training", order: 5 },
  "r&d": { id: "rnd", name: "R&D & Design", order: 6 },
  "rnd": { id: "rnd", name: "R&D & Design", order: 6 },
  "6": { id: "rnd", name: "R&D & Design", order: 6 },
  "06": { id: "rnd", name: "R&D & Design", order: 6 },
  "management": { id: "management", name: "Management & Documentation", order: 7 },
  "7": { id: "management", name: "Management & Documentation", order: 7 },
  "07": { id: "management", name: "Management & Documentation", order: 7 },
};

// ============================================================================
// Status Configuration
// ============================================================================

export type RecordStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

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
  if (lower.includes("approved") || lower.includes("compliant")) {
    return "compliant";
  }
  if (lower.includes("nc") || lower.includes("issue") || lower.includes("invalid")) {
    return "issue";
  }
  return "pending";
}

/** Get module config for a form schema section number */
export function getModuleForSection(section: number): ModuleConfig | undefined {
  return Object.values(MODULE_CONFIG).find(m => m.section === section);
}