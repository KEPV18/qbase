// ============================================================================
// QBase — Tenant brand colour derivation tests
//
// The tenant's `theme_color` is a hex a human can TYPE, so nothing about it
// can be assumed: it can be too light for white text, too dark for the dark
// theme, or a mid-luminance grey-blue that neither white nor near-black can
// carry.  These tests hold the derivation to the contract the stylesheet
// relies on:
//
//   1. the fill keeps the tenant's exact colour;
//   2. the foreground ON the fill always clears WCAG AA (4.5:1);
//   3. the accent as TEXT always clears AA on the /25 wash it is painted on;
//   4. the whole family is ONE hue — a tenant's colour cannot leave a
//      hardcoded blue behind it.
//
// The colours under test are the ones that actually exist: the nine presets
// the Settings panel offers, the live tenant's `#21c45d`, and the awkward
// mid-luminance band that broke the first implementation.
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  BRAND_COLORS,
  DEFAULT_BRAND_COLOR,
  brandTokens,
  pickReadableForeground,
  readableAccentOnDark,
  readableAccentOnWhite,
} from '@/config/brandColors';

// ── Colour maths (re-derived here, not imported: the test must not trust
//    the module's own arithmetic to check the module's own arithmetic) ──────

const toLinear = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};

const luminanceOf = (rgb: number[]) =>
  0.2126 * toLinear(rgb[0]) + 0.7152 * toLinear(rgb[1]) + 0.0722 * toLinear(rgb[2]);

const contrastOf = (a: number[], b: number[]) => {
  const la = luminanceOf(a);
  const lb = luminanceOf(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

const rgbOf = (hex: string) => {
  const m = hex.replace('#', '');
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
};

/** The stylesheet's tokens are HSL triples ("H S% L%"); parse one back. */
const rgbOfHsl = (triple: string) => {
  const [h, s, l] = triple.split(/\s+/).map((part) => parseFloat(part));
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

const mix = (rgb: number[], toward: number[], amount: number) =>
  rgb.map((c, i) => c + (toward[i] - c) * amount);

const WHITE = [255, 255, 255];
const DARK_CARD = [28, 28, 30];

/** Every colour a tenant can actually pick, plus the awkward cases. */
const ALL_CASES = [
  ...BRAND_COLORS.map((c) => c.value),
  DEFAULT_BRAND_COLOR,
  '#21c45d', // the live tenant's green
  '#f59e0b', // amber-500: 2.15:1 under white
  '#22c55e', // green-500: 2.28:1 under white
  '#06b6d4', // cyan-500: 2.43:1 under white
  '#787878', // MID luminance: neither white nor near-black clears AA
  '#7a7a70', // the same band, barely tinted
];

describe('brandTokens', () => {
  it('rejects a colour that carries no accent identity', () => {
    // A grey brand is not a brand: the stylesheet's own palette stays.
    expect(brandTokens('#808080')).toBeNull();
    expect(brandTokens('#6b6b6b')).toBeNull();
    expect(brandTokens('#000000')).toBeNull();
  });

  it('rejects a colour that is not a hex', () => {
    expect(brandTokens('')).toBeNull();
    expect(brandTokens('#fff')).toBeNull();
    expect(brandTokens('rgb(0,0,0)')).toBeNull();
    expect(brandTokens('#gggggg')).toBeNull();
  });

  it("keeps the tenant's exact colour as the fill", () => {
    for (const hex of ALL_CASES) {
      const tokens = brandTokens(hex);
      if (!tokens) continue;
      const back = rgbOfHsl(tokens.fill).map((c) => Math.round(c));
      const original = rgbOf(hex);
      // HSL is a lossy round-trip; the channels must survive within the
      // rounding noise.
      back.forEach((c, i) => {
        expect(Math.abs(c - original[i])).toBeLessThanOrEqual(2);
      });
    }
  });

  it('always gives the fill a foreground that clears AA', () => {
    for (const hex of ALL_CASES) {
      const tokens = brandTokens(hex);
      if (!tokens) continue;
      const fill = rgbOf(hex);
      const fg = rgbOfHsl(tokens.fillForeground);
      expect(
        contrastOf(fill, fg),
        `${hex} → fill ${tokens.fill} under foreground ${tokens.fillForeground}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('gives the accent text AA on the /25 wash it is painted on', () => {
    for (const hex of ALL_CASES) {
      const tokens = brandTokens(hex);
      if (!tokens) continue;
      // The wash is 25% of the EMITTED fill over white — the same colour
      // the browser paints for `bg-primary/25`.
      const fill = rgbOfHsl(tokens.fill);
      const wash = mix(WHITE, fill, 0.25);
      const tint = rgbOfHsl(tokens.tint);
      expect(
        contrastOf(wash, tint),
        `${hex} → tint ${tokens.tint} on its own /25 wash`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('gives the dark-mode accent text AA on its own /25 wash', () => {
    for (const hex of ALL_CASES) {
      const tokens = brandTokens(hex);
      if (!tokens) continue;
      const fill = rgbOfHsl(tokens.fill);
      const wash = mix(DARK_CARD, fill, 0.25);
      const tint = rgbOfHsl(tokens.tintDark);
      expect(
        contrastOf(wash, tint),
        `${hex} → dark tint ${tokens.tintDark} on its own /25 wash`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps the whole family on one hue', () => {
    for (const hex of ALL_CASES) {
      const tokens = brandTokens(hex);
      if (!tokens) continue;
      const hueOf = (triple: string) => parseFloat(triple.split(/\s+/)[0]);
      const fillHue = hueOf(tokens.fill);
      // Scaling a colour toward black or toward white keeps its hue; the
      // rounding to whole degrees may move it by a step.
      expect(Math.abs(hueOf(tokens.tint) - fillHue)).toBeLessThanOrEqual(2);
      expect(Math.abs(hueOf(tokens.tintDark) - fillHue)).toBeLessThanOrEqual(2);
    }
  });

  it("moves the hover step AWAY from the fill's own foreground", () => {
    for (const hex of ALL_CASES) {
      const tokens = brandTokens(hex);
      if (!tokens) continue;
      const fill = rgbOf(hex);
      const hover = rgbOfHsl(tokens.hover);
      const fg = rgbOfHsl(tokens.fillForeground);
      // The hover must not reduce the contrast of the label on it.
      expect(contrastOf(hover, fg)).toBeGreaterThanOrEqual(contrastOf(fill, fg));
    }
  });

  it("drops the near-black ink only when white cannot carry the fill", () => {
    // The live tenant's green is the case that started all of this.
    const tokens = brandTokens('#21c45d');
    expect(tokens).not.toBeNull();
    expect(tokens!.fillForeground).toBe('0 0% 0%');
    // 2.33:1 under white — the defect the runtime override used to ship.
    expect(contrastOf(rgbOf('#21c45d'), WHITE)).toBeLessThan(4.5);
    expect(contrastOf(rgbOf('#21c45d'), [0, 0, 0])).toBeGreaterThanOrEqual(4.5);
  });
});

describe('pickReadableForeground', () => {
  it('matches the derivation used by the fill', () => {
    for (const hex of ALL_CASES) {
      const fg = pickReadableForeground(hex);
      const rgb = rgbOf(hex);
      const fgRgb = fg === '#ffffff' ? WHITE : rgbOf(fg);
      expect(contrastOf(rgb, fgRgb), `${hex} → ${fg}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('never returns a foreground that fails AA', () => {
    // The mid-luminance band: white is 4.4:1 and #1d1d1f is 4.2:1, so the
    // only correct answer is pure black.
    const grey = pickReadableForeground('#787878');
    expect(contrastOf(rgbOf('#787878'), rgbOf(grey))).toBeGreaterThanOrEqual(4.5);
  });
});

describe('readableAccentOnWhite / readableAccentOnDark', () => {
  it('clears AA on its own ground', () => {
    for (const hex of ALL_CASES) {
      expect(
        contrastOf(rgbOf(readableAccentOnWhite(hex)), WHITE),
        `${hex} on white`,
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastOf(rgbOf(readableAccentOnDark(hex)), DARK_CARD),
        `${hex} on the dark card`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('falls back to the default for a colour that is not a hex', () => {
    expect(readableAccentOnWhite('nope')).toBe(DEFAULT_BRAND_COLOR);
    expect(readableAccentOnDark('nope')).toBe(DEFAULT_BRAND_COLOR);
  });
});
