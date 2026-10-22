// ============================================================================
// QBase — Department Identity
//
// A department label is TEXT, never a fill.
//
// The old implementation gave each of the seven departments its own hue
// from a `--module-*` ramp, and painted that hue as the badge's text on a
// 10% wash of itself.  Three separate problems with that:
//
//   1. THE COLOUR CARRIED NO INFORMATION.  `--module-sales`,
//      `--module-operations` and `--module-rnd` were all the same blue
//      (#0059b3), so three of the seven departments were
//      indistinguishable from each other.  The badge always renders the
//      department NAME right beside it, so the name was doing all the
//      identifying work and the colour was decoration.
//
//   2. SEVEN HUES COMPETED WITH THE APP'S ONE ACCENT.  The design system
//      allows a single accent (Apple blue) plus heat/live/brand.  A
//      seven-hue categorical ramp is exactly the "multi-colour" the
//      checklist rejects.
//
//   3. THE OLD RAW HEXES FAILED CONTRAST.  The original palette
//      (#f97316, #14b8a6, #06b8d4 …) measured 2.22–4.49:1 on a 10% wash
//      of itself — three hard WCAG failures and four AA-large-only
//      results.
//
// So the badge is now GRAYSCALE: the department's own name in the
// secondary-ink tone, on a 4% wash of the primary ink.  Measured, that
// pairing is 4.69:1 in light mode — clears AA for the 12–13.5px badge
// text it is used at.
//
// A coloured LEFT BAR is decoration of the same kind, and the design
// system names it as anti-slop ("each item with its own border + tint +
// colored left-bar → one panel + hairlines").  `deptBorderStyle` used to
// paint exactly that; it now returns an empty style and the hairline does
// the separating.
//
// Nothing here writes to a table or changes behaviour; this is presentation
// only.
// ============================================================================

import { FORM_SCHEMAS } from "@/data/formSchemas";

export interface DeptTheme {
  /** Short label used where the full department name will not fit. */
  label: string;
}

const DEPT_THEMES: Record<string, DeptTheme> = {
  "Sales & Customer Service": { label: "Sales" },
  "Operations & Production": { label: "Operations" },
  "Quality & Audit": { label: "Quality" },
  "Procurement & Vendors": { label: "Procurement" },
  "HR & Training": { label: "HR" },
  "R&D & Design": { label: "R&D" },
  "Management & Documentation": { label: "Management" },
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
 * Department badge — grayscale by design (see the file header).
 *
 * A 4% wash of the primary ink as the ground, the secondary-ink tone as
 * the text, and a hairline border at 12%.  All three are CSS custom
 * properties, so the badge follows the light/dark mode automatically and
 * never carries a raw hex.
 */
export function deptAccentStyle(_deptName: string): React.CSSProperties {
  return {
    backgroundColor: "hsl(var(--foreground) / 0.04)",
    color: "hsl(var(--text-2))",
    borderColor: "hsl(var(--foreground) / 0.12)",
  };
}
