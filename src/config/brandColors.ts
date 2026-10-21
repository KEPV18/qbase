// ============================================================================
// QBase — Tenant brand colours
//
// The tenant's `theme_color` is written into `--primary` / `--ring` at
// runtime (see `useTenantIdentity`), so the brand colour is used as a FILL
// with white text on it — a "Primary Action" button, a selected tab, a
// focus ring.
//
// The old preset lists in `Settings.tsx` and `AdminPanel.tsx` were raw
// Tailwind-500 hexes.  Most of them could not carry white text:
// `#06b6d4` measured 2.43:1, `#eab308` 1.92:1, `#22c55e` 2.28:1,
// `#f59e0b` 2.15:1, `#84cc16` 1.98:1 — every one of them a hard WCAG
// failure the moment a tenant picked it.  The two lists also disagreed
// with each other (Settings offered 8 colours, Admin offered 10, and
// only 4 were shared).
//
// Every value below is a -600/-700 step of the same family, chosen so
// white on it clears AA (4.5:1) in BOTH the light and the dark theme.
// Each is measured; the number in the comment is the white-on-fill ratio.
//
// This module is the single source of truth for both surfaces.
// ============================================================================

export interface BrandColor {
  /** Human label shown under the swatch. */
  name: string;
  /** The hex written to `tenant_settings.theme_color`. */
  value: string;
  /** White-on-fill contrast ratio, for reference. */
  contrast: number;
}

export const BRAND_COLORS: BrandColor[] = [
  { name: 'Blue', value: '#0066cc', contrast: 5.57 },   // Apple blue, on tint
  { name: 'Teal', value: '#0e7490', contrast: 5.36 },
  { name: 'Green', value: '#157f3d', contrast: 5.08 },
  { name: 'Purple', value: '#6d28d9', contrast: 7.10 },
  { name: 'Red', value: '#b91c1c', contrast: 6.47 },
  { name: 'Orange', value: '#b45309', contrast: 5.02 },
  { name: 'Pink', value: '#be185d', contrast: 6.04 },
  { name: 'Gold', value: '#946200', contrast: 5.24 },
  { name: 'Slate', value: '#475569', contrast: 7.58 },
];

/** The colour used when no brand colour has been chosen. */
export const DEFAULT_BRAND_COLOR = '#0066cc';

/**
 * Whether a fill is dark enough for white text.
 *
 * Used by the branding preview, which renders the tenant's colour as a
 * filled "Primary Action" chip with a label on it.  A tenant can type an
 * arbitrary hex, so the preview has to decide the label colour rather
 * than assume white.
 */
export function pickReadableForeground(hex: string): '#ffffff' | '#1d1d1f' {
  const m = hex.replace('#', '');
  if (m.length !== 6) return '#ffffff';
  const toLin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const r = toLin(parseInt(m.slice(0, 2), 16));
  const g = toLin(parseInt(m.slice(2, 4), 16));
  const b = toLin(parseInt(m.slice(4, 6), 16));
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // Contrast of white vs black against this luminance; pick the larger.
  return 1.05 / (lum + 0.05) >= (lum + 0.05) / 0.05 ? '#ffffff' : '#1d1d1f';
}

/**
 * A brand colour that is safe to use as TEXT on a white surface.
 *
 * The tenant can type any hex, and the branding preview renders the colour
 * as a label on the white preview panel.  A light brand colour (`#f59e0b`
 * on white is 2.15:1) would be unreadable there, so the hue is darkened
 * until it clears AA (4.5:1).  The returned hex keeps the tenant's hue —
 * it is a darker step of the same colour, not a different one.
 */
export function readableAccentOnWhite(hex: string): string {
  const m = hex.replace('#', '');
  if (m.length !== 6) return DEFAULT_BRAND_COLOR;
  const toLin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const lumOf = (rgb: number[]) =>
    0.2126 * toLin(rgb[0]) + 0.7152 * toLin(rgb[1]) + 0.0722 * toLin(rgb[2]);
  const rgb = [
    parseInt(m.slice(0, 2), 16),
    parseInt(m.slice(2, 4), 16),
    parseInt(m.slice(4, 6), 16),
  ];
  // Contrast against white (luminance 1.0).
  const contrastOnWhite = 1.05 / (lumOf(rgb) + 0.05);
  if (contrastOnWhite >= 4.5) return hex;

  // Darken toward black until it clears AA, keeping the hue ratio.
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    const scaled = rgb.map(c => Math.round(c * mid));
    if (1.05 / (lumOf(scaled) + 0.05) >= 4.5) hi = mid;
    else lo = mid;
  }
  const final = rgb.map(c => Math.round(c * hi));
  return '#' + final.map(c => c.toString(16).padStart(2, '0')).join('');
}
