// ============================================================================
// QBase — Department Chromatic Identity
// Each department gets a unique color for visual recognition.
// Form codes map to departments via FORM_SCHEMAS sectionName.
// ============================================================================

import { FORM_SCHEMAS } from "@/data/formSchemas";

export interface DeptTheme {
  hex: string;
  hslVar: string;
  label: string;
}

const DEPT_THEMES: Record<string, DeptTheme> = {
  "Sales & Customer Service": {
    hex: "#3b82f6",
    hslVar: "var(--dept-sales)",
    label: "Sales",
  },
  "Operations & Production": {
    hex: "#f97316",
    hslVar: "var(--dept-operations)",
    label: "Operations",
  },
  "Quality & Audit": {
    hex: "#2563eb",
    hslVar: "var(--dept-quality)",
    label: "Quality",
  },
  "Procurement & Vendors": {
    hex: "#14b8a6",
    hslVar: "var(--dept-procurement)",
    label: "Procurement",
  },
  "HR & Training": {
    hex: "#a855f7",
    hslVar: "var(--dept-hr)",
    label: "HR",
  },
  "R&D & Design": {
    hex: "#06b6d4",
    hslVar: "var(--dept-rnd)",
    label: "R&D",
  },
  "Management & Documentation": {
    hex: "#6366f1",
    hslVar: "var(--dept-management)",
    label: "Management",
  },
};

const FALLBACK_THEME = DEPT_THEMES["Management & Documentation"];

export function getDeptName(formCodeOrSection: string): string {
  if (DEPT_THEMES[formCodeOrSection]) return formCodeOrSection;
  const schema = FORM_SCHEMAS.find(f => f.code === formCodeOrSection);
  return schema?.sectionName || "Management & Documentation";
}

export function getDeptTheme(formCodeOrSection: string): DeptTheme {
  return DEPT_THEMES[getDeptName(formCodeOrSection)] || FALLBACK_THEME;
}

export function deptBorderStyle(deptName: string): React.CSSProperties {
  const t = getDeptTheme(deptName);
  return {
    borderLeft: `3px solid ${t.hex}`,
    boxShadow: `inset 3px 0 10px -4px ${t.hex}4D`,
  };
}

export function deptAccentBg(deptName: string): React.CSSProperties {
  const t = getDeptTheme(deptName);
  return { backgroundColor: `${t.hex}1A` };
}

export function deptAccentStyle(deptName: string): React.CSSProperties {
  const t = getDeptTheme(deptName);
  return {
    backgroundColor: `${t.hex}1A`,
    color: t.hex,
    borderColor: `${t.hex}4D`,
  };
}
