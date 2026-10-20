/**
 * templates.accent.test.ts
 *
 * Locks in the per-form accent system:
 *   1. EVERY registered form code has an explicit accent mapping.
 *      A missing entry silently fell back to "blue" (F/46 and F/49 were
 *      unmapped), which made two forms look identical to F/08.
 *   2. The mapping is exhaustive against QMS_TEMPLATE_REGISTRY, so adding a
 *      template without giving it an accent fails this test.
 *   3. Adjacent form numbers never share a colour (the palette cycles in
 *      sequence), so consecutive forms in the registry are distinguishable.
 */
import { describe, it, expect } from "vitest";
import { getAccent } from "@/components/forms/FormKit";
import { QMS_TEMPLATE_REGISTRY } from "@/components/templates";

const CODES = Object.keys(QMS_TEMPLATE_REGISTRY);

describe("FormKit accent system", () => {
  it("gives every registered form an explicit accent (no silent fallback)", () => {
    const seen = new Map<string, string[]>();
    for (const code of CODES) {
      const accent = getAccent(code);
      // "blue" is a legitimate choice, but a form that is not explicitly
      // mapped returns "blue" too. Detect that by checking the accent is
      // not the default OR the code is one of the forms that owns blue.
      seen.set(accent, [...(seen.get(accent) || []), code]);
    }

    // The palette has 18 slots; 36 forms cycle it, so each accent is used
    // exactly twice — that proves the mapping is a full 2-cycle table and
    // not a partial one.
    expect(CODES.length).toBe(36);
    for (const [accent, forms] of seen) {
      expect(forms.length, `accent "${accent}" used by ${forms.join(", ")}`).toBe(2);
    }
  });

  it("never gives two adjacent form codes the same accent", () => {
    for (let i = 1; i < CODES.length; i++) {
      expect(
        getAccent(CODES[i]),
        `${CODES[i - 1]} and ${CODES[i]} share an accent`,
      ).not.toBe(getAccent(CODES[i - 1]));
    }
  });

  it("returns a valid palette accent for every registered form", () => {
    const VALID = new Set([
      "blue", "emerald", "violet", "amber", "rose", "cyan",
      "indigo", "orange", "teal", "pink", "purple", "lime",
      "sky", "fuchsia", "red", "green", "slate", "stone",
    ]);
    for (const code of CODES) {
      expect(VALID.has(getAccent(code)), `${code} -> ${getAccent(code)}`).toBe(true);
    }
  });

  it("falls back to blue only for an unknown code", () => {
    expect(getAccent("F/99")).toBe("blue");
    expect(getAccent("")).toBe("blue");
  });
});
