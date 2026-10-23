// ============================================================================
// QBase — Tenant brand colours
//
// The tenant's `theme_color` is written into the app's accent family at
// runtime (see `useTenantIdentity`), so the brand colour is used as a FILL
// with a label on it — a "Primary Action" button, a selected tab, a focus
// ring.
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
//
// ── The runtime override ──────────────────────────────────────────────────
//
// The preset list can guarantee white-on-fill, but a tenant can also TYPE a
// colour, and the live tenant's `theme_color` is `#21c45d` — a light green
// that is not in the list.  The override used to write it straight into
// `--primary`, which produced two defects at once:
//
//   1. the "New Record" button became white-on-#21c45d — measured 2.33:1,
//      a hard AA failure on the app's most prominent control; and
//   2. the accent TEXT stayed the hardcoded blue `--primary-tint`
//      (#0059b3), so the app showed a green button and blue links: two
//      accents in one view, which the design system forbids.
//
// So the override derives the whole accent family from the tenant's hue —
// the same hue, at the lightnesses the design system requires — and the
// stylesheet reads it through `--brand-*` variables.  See `brandTokens`.
//
// ── Why the maths is this careful ─────────────────────────────────────────
//
// The stylesheet's tokens are HSL TRIPLES with a whole-number hue,
// saturation and lightness, so every value that leaves this module is
// quantised.  A search that measures an un-rounded colour and then emits
// the rounded one can miss its own target: 4.5:1 becomes 4.49:1, which is
// a failure.  Every search below therefore measures the value AS EMITTED,
// and the test suite re-derives the same maths independently to check it.
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

// ════════════════════════════════════════════════════════════════════════
// Colour maths
//
// Every helper here works on 0-255 RGB.  The stylesheet's tokens are HSL
// triples ("H S% L%"), because `--primary` is read as `hsl(var(--primary))`.
// ════════════════════════════════════════════════════════════════════════

/** The dark card — the ground the dark-mode accent text sits on. */
const DARK_CARD: number[] = [28, 28, 30];
/** The dark-mode foreground ink (`--card-foreground` at full strength). */
const DARK_INK: number[] = [18, 18, 19];
const WHITE: number[] = [255, 255, 255];
const BLACK: number[] = [0, 0, 0];

const toLinear = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};

const luminanceOf = (rgb: number[]) =>
  0.2126 * toLinear(rgb[0]) + 0.7152 * toLinear(rgb[1]) + 0.0722 * toLinear(rgb[2]);

/** The WCAG contrast ratio between two colours. */
const contrastOf = (a: number[], b: number[]) => {
  const la = luminanceOf(a);
  const lb = luminanceOf(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

/** A 6-digit hex to RGB, or null when it is not one. */
const rgbOf = (hex: string): number[] | null => {
  const m = hex.replace('#', '').trim();
  if (!/^[0-9a-f]{6}$/i.test(m)) return null;
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
};

const toHex = (rgb: number[]) =>
  '#' + rgb.map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('');

/** Mix a colour toward another one, keeping it in the same family. */
const mix = (rgb: number[], toward: number[], amount: number) =>
  rgb.map((c, i) => c + (toward[i] - c) * amount);

/**
 * The colour as the stylesheet's HSL triple.
 *
 * The hue is NORMALISED to [0, 360): the green and blue branches of the
 * standard formula need the same `/6` as the red branch, or the hue comes
 * out six times too large (a blue would be written as 1260° instead of
 * 210°) and every derived token lands on the wrong colour entirely.
 */
const hslOf = (rgb: number[]): string => {
  const rn = rgb[0] / 255, gn = rgb[1] / 255, bn = rgb[2] / 255;
  const mx = Math.max(rn, gn, bn), mn = Math.min(rn, gn, bn);
  const l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    else if (mx === gn) h = ((bn - rn) / d + 2) / 6;
    else h = ((rn - gn) / d + 4) / 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

/**
 * A triple back to RGB.
 *
 * The round-trip is lossy by a rounding step, which is exactly why the
 * searches below measure the value AS EMITTED: a token is only safe if the
 * colour the browser paints from it is safe.
 */
const rgbOfHsl = (triple: string): number[] => {
  const [h, s, l] = triple.split(/\s+/).map(part => parseFloat(part));
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1] =
    hp < 1 ? [c, x, 0]
    : hp < 2 ? [x, c, 0]
    : hp < 3 ? [0, c, x]
    : hp < 4 ? [0, x, c]
    : hp < 5 ? [x, 0, c]
    : [c, 0, x];
  const m = ln - c / 2;
  return [(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255];
};

/** How many steps the searches take toward their target. */
const STEPS = 48;

/**
 * The contrast every derived token has to clear.
 *
 * WCAG AA for body text is 4.5:1.  The searches aim a little above it, so
 * the quantised token — the whole-number hue, saturation and lightness the
 * stylesheet actually reads — cannot land a hair under the line.
 */
const AA_TARGET = 4.55;

// ════════════════════════════════════════════════════════════════════════
// The public helpers
// ════════════════════════════════════════════════════════════════════════

/**
 * Whether a fill is dark enough for white text.
 *
 * Used by the branding preview, which renders the tenant's colour as a
 * filled "Primary Action" chip with a label on it.  A tenant can type an
 * arbitrary hex, so the preview has to decide the label colour rather
 * than assume white.
 *
 * White and the near-black ink are the two obvious choices, but for a MID
 * luminance fill neither of them clears AA: their two ratios multiply to
 * ~16.6, which is below 4.5², so a band of mid greys fails both.  Pure
 * black is the third option and it always clears — white against black
 * multiply to 21 > 4.5², so the better of the two is always at least
 * √21 ≈ 4.58:1.  Ties go to white, then to the near-black ink, so the
 * common cases keep the system's own colours.
 */
export function pickReadableForeground(hex: string): '#ffffff' | '#1d1d1f' | '#000000' {
  const rgb = rgbOf(hex);
  if (!rgb) return '#ffffff';
  const lum = luminanceOf(rgb);
  const onWhite = 1.05 / (lum + 0.05);
  const onInk = (lum + 0.05) / 0.0631;
  if (onWhite >= onInk) return onWhite >= 4.5 ? '#ffffff' : '#000000';
  return onInk >= 4.5 ? '#1d1d1f' : '#000000';
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
  const rgb = rgbOf(hex);
  if (!rgb) return DEFAULT_BRAND_COLOR;
  if (contrastOf(rgb, WHITE) >= 4.5) return hex;

  // Darken toward black until it clears AA, keeping the hue ratio.  The
  // hex is rounded to whole channels, so each candidate is measured AFTER
  // the rounding — otherwise the emitted colour can miss the target.
  for (let i = 1; i <= STEPS; i++) {
    const candidate = mix(rgb, BLACK, i / STEPS);
    if (contrastOf(rgbOf(toHex(candidate))!, WHITE) >= 4.5) return toHex(candidate);
  }
  return '#000000';
}

/**
 * The same hue, lightened until it is safe to READ on the dark card.
 *
 * The mirror of `readableAccentOnWhite`: a dark brand colour (`#475569`
 * slate measures 2.27:1 on the dark card) has to climb toward white before
 * it can be accent text in the dark theme.  The hue ratio is kept, so it
 * stays the tenant's colour.
 */
export function readableAccentOnDark(hex: string): string {
  const rgb = rgbOf(hex);
  if (!rgb) return DEFAULT_BRAND_COLOR;
  if (contrastOf(rgb, DARK_CARD) >= 4.5) return hex;

  for (let i = 1; i <= STEPS; i++) {
    const candidate = mix(rgb, WHITE, i / STEPS);
    if (contrastOf(rgbOf(toHex(candidate))!, DARK_CARD) >= 4.5) return toHex(candidate);
  }
  return '#ffffff';
}

// ════════════════════════════════════════════════════════════════════════
// Deriving the accent family from one tenant colour
// ════════════════════════════════════════════════════════════════════════

/**
 * The whole accent family, derived from one tenant colour.
 *
 * Every value is an HSL triple ("H S% L%"), because that is the shape the
 * stylesheet's tokens use — `--primary` is read as `hsl(var(--primary))`.
 *
 *   fill           the tenant's colour, unchanged — it is the brand
 *   fillForeground white or the dark ink, whichever the fill can carry
 *   tint           the accent as TEXT on a light surface
 *   tintDark       the accent as TEXT on the dark card
 *   hover          one step of the fill, moved AWAY from its foreground
 *   accent         a pale wash of the hue (the light-mode `--accent`)
 *   accentDark     a quiet wash of the hue (the dark-mode `--accent`)
 *
 * The three rules that make this a system rather than a palette:
 *
 *   1. ONE accent.  The fill, the text, the focus ring and the wash are
 *      all the same hue, so a tenant's brand colour cannot leave a blue
 *      `text-primary-tint` behind it.
 *   2. The fill keeps the tenant's exact colour — the brand is not ours to
 *      re-grade — but the FOREGROUND on it is chosen by measurement, so
 *      the most prominent control in the app is always legible.
 *   3. The hover step moves the fill away from its own foreground, which
 *      is the same rule the stylesheet's own families follow ("a hover
 *      step that darkens in light mode and brightens in dark mode").
 */
export interface BrandTokens {
  fill: string;
  fillForeground: string;
  tint: string;
  tintDark: string;
  hover: string;
  accent: string;
  accentDark: string;
}

export function brandTokens(hex: string): BrandTokens | null {
  const rgb = rgbOf(hex);
  if (!rgb) return null;

  // A grey brand colour carries no accent identity, so the stylesheet's own
  // tokens are left alone rather than being flattened to a monochrome app.
  const max = Math.max(rgb[0], rgb[1], rgb[2]);
  const min = Math.min(rgb[0], rgb[1], rgb[2]);
  if (max - min < 12) return null;

  // The colour as it will actually be painted: the triple is quantised, and
  // every measurement below has to be made against the quantised value.
  const fillTriple = hslOf(rgb);
  const fill = rgbOfHsl(fillTriple);

  // The foreground the fill can actually carry.
  //
  // White and the dark ink are the two obvious choices, but for a MID
  // luminance fill neither of them clears AA: their two ratios multiply to
  // ~18.5, below 4.5², so a band of colours fails both (a tenant typing a
  // `#787878`-ish grey lands right in it).  Pure black is the third option
  // and it always clears — white against black multiply to 21 > 4.5², so
  // the better of the two is always at least √21 ≈ 4.58:1.  Ties go to
  // white, then to the near-black ink, so the common cases keep the
  // system's own colours.
  const foregroundOptions = [
    { hsl: '0 0% 100%', rgb: WHITE, white: true },
    { hsl: '240 3% 7.25%', rgb: DARK_INK, white: false },
    { hsl: '0 0% 0%', rgb: BLACK, white: false },
  ];
  const best = foregroundOptions.reduce((a, b) =>
    contrastOf(fill, b.rgb) > contrastOf(fill, a.rgb) ? b : a
  );
  const chosen = contrastOf(fill, best.rgb) >= AA_TARGET ? best : foregroundOptions[2];
  const usesWhite = chosen.white;
  const foreground = chosen.hsl;

  // The hover step moves the fill AWAY from its own foreground: darker
  // under white text, brighter under the dark ink.
  const hover = usesWhite ? mix(fill, BLACK, 0.12) : mix(fill, WHITE, 0.12);

  /**
   * The accent as TEXT, measured against the ground it actually sits on.
   *
   * The stylesheet's contract for a tint is "text on a /25 wash of its own
   * family", and that wash — not white — is the harder ground: a tint
   * that clears 4.5:1 on white can still fall to 3.6:1 on the wash the
   * app actually paints behind it.  (The wash is DARKER than white, and
   * dark text on a darker ground has LESS contrast, not more.)
   *
   * A `/25` wash is 25% of the fill OVER the ground — `mix(ground, fill,
   * 0.25)`, not 25% of the ground under the fill.  The search runs over
   * the quantised token, so the value that is measured is the value that
   * is emitted.
   */
  const stepUntil = (ground: number[], toward: number[]): string => {
    for (let i = 0; i <= STEPS; i++) {
      const triple = hslOf(mix(fill, toward, i / STEPS));
      if (contrastOf(rgbOfHsl(triple), ground) >= AA_TARGET) return triple;
    }
    return hslOf(mix(fill, toward, 1));
  };

  return {
    fill: fillTriple,
    fillForeground: foreground,
    tint: stepUntil(mix(WHITE, fill, 0.25), BLACK),
    tintDark: stepUntil(mix(DARK_CARD, fill, 0.25), WHITE),
    hover: hslOf(hover),
    accent: hslOf(mix(WHITE, fill, 0.08)),
    accentDark: hslOf(mix(DARK_CARD, fill, 0.22)),
  };
}
