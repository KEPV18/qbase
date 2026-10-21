// ============================================================================
// QBase — Department Chromatic Identity
//
// Each department carries a quiet colour so a reader can tell the sections
// apart at a glance.  The colours come from the design system's own module
// ramp (`--module-*`), not from a second private palette.
//
// Two rules the design system asks for, and that this file used to break:
//
//   1. A department label is TEXT, not a fill.  The old raw hexes
//      (#f97316, #14b8a6, #06b8d4 …) were painted as the text colour on a
//      10% wash of themselves and measured 2.22–2.53:1 — three hard WCAG
//      failures and four AA-large-only results.  The `-tint` step of each
//      family measures 5.63:1 in light and 5.77:1 in dark, worst case.
//
//   2. A coloured LEFT BAR is decoration, and the skill names it as
//      anti-slop ("each item with its own border + tint + colored
//      left-bar → one panel + hairlines").  `deptBorderStyle` used to paint
//      exactly that.  It now returns an empty style and the department
//      reads through its badge instead, with a hairline doing the
//      separating.
//
// Nothing here writes to a table or changes behaviour; this is presentation
// only.
// ============================================================================

import { FORM_SCHEMAS } from "@/data/formSchemas";

export interface DeptTheme {
  /** The text colour of the department — a token reference, not a raw hex. */
  textVar: string;
  /** The wash the badge sits on — a /10 tint of the department's own hue. */
  washVar: string;
  /** Short label used where the full department name will not fit. */
  label: string;
}

const DEPT_THEMES: Record<string, DeptTheme> = {
  "Sales & Customer Service": {
    textVar: "var(--module-sales)",
    washVar: "var(--primary)",
    label: "Sales",
  },
  "Operations & Production": {
    textVar: "var(--module-operations)",
    washVar: "var(--warning)",
    label: "Operations",
  },
  "Quality & Audit": {
    textVar: "var(--module-quality)",
    washVar: "var(--success)",
    label: "Quality",
  },
  "Procurement & Vendors": {
    textVar: "var(--module-procurement)",
    washVar: "var(--warning)",
    label: "Procurement",
  },
  "HR & Training": {
    textVar: "var(--module-hr)",
    washVar: "var(--accent-support)",
    label: "HR",
  },
  "R&D & Design": {
    textVar: "var(--module-rnd)",
    washVar: "var(--primary)",
    label: "R&D",
  },
  "Management & Documentation": {
    textVar: "var(--module-management)",
    washVar: "var(--foreground)",
    label: "Management",
  },
};

const FALLBACK_THEME = DEPT_THEMES["Management & Documentation"];

export function getDeptName(formCodeOrSection: string): string {
  if (DEPT_THEMES[formCodeOrSection]) return formCodeOrSection;
  const schema = FORM_SCHEMAS.find((f) => f.code === formCodeOrSection);
  return schema?.sectionName || "Management & Documentation";
}

export function getDeptTheme(formCodeOrSection: string): DeptTheme {
  return DEPT_THEMES[getDeptName(formCodeOrSection)] || FALLBACK_THEME;
}

/**
 * Department edge.
 *
 * Previously a 3px coloured left bar plus an inset coloured glow.  Both are
 * the fragmentation the design system rejects, and the colour was the only
 * thing separating one row from the next.  It is now an empty style: the
 * hairline border does the separating, and the department badge carries the
 * identity.  Callers keep their `style={...}` sites, so nothing downstream
 * has to change shape.
 */
export function deptBorderStyle(_deptName: string): React.CSSProperties {
  return {};
}

/**
 * Department badge — the text colour of the department, on a 10% wash of
 * its own hue.  Both values are CSS custom properties, so the badge follows
 * the light/dark mode automatically and never carries a raw hex.
 */
export function deptAccentStyle(deptName: string): React.CSSProperties {
  const t = getDeptTheme(deptName);
  return {
    backgroundColor: `hsl(${t.washVar} / 0.10)`,
    color: `hsl(${t.textVar})`,
    borderColor: `hsl(${t.washVar} / 0.30)`,
  };
}
