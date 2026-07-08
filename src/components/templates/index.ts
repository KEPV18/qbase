// ============================================================================
// QMS TEMPLATE REGISTRY — Centralized Static Template Hub
// ARCHITECTURAL MANDATE: Every single template is explicitly imported here
// so Vite's tree-shaker is FORCED to bundle ALL templates into production.
// No dynamic string-key lookups that Vite can't statically analyze.
// No more orphan chunks or vanished templates in production builds.
// ============================================================================

import React from "react";

// ── Explicit imports — ALL 35 templates ──────────────────────────────────
import { F08Template } from "@/components/forms/templates/F08Template";
import { F09Template } from "@/components/forms/templates/F09Template";
import { F10Template } from "@/components/forms/templates/F10Template";
import { F11Template } from "@/components/forms/templates/F11Template";
import { F12Template } from "@/components/forms/templates/F12Template";
import { F13Template } from "@/components/forms/templates/F13Template";
import { F14Template } from "@/components/forms/templates/F14Template";
import { F15Template } from "@/components/forms/templates/F15Template";
import { F16Template } from "@/components/forms/templates/F16Template";
import { F17Template } from "@/components/forms/templates/F17Template";
import { F18Template } from "@/components/forms/templates/F18Template";
import { F19Template } from "@/components/forms/templates/F19Template";
import { F20Template } from "@/components/forms/templates/F20Template";
import { F21Template } from "@/components/forms/templates/F21Template";
import { F22Template } from "@/components/forms/templates/F22Template";
import { F23Template } from "@/components/forms/templates/F23Template";
import { F24Template } from "@/components/forms/templates/F24Template";
import { F25Template } from "@/components/forms/templates/F25Template";
import { F28Template } from "@/components/forms/templates/F28Template";
import { F29Template } from "@/components/forms/templates/F29Template";
import { F30Template } from "@/components/forms/templates/F30Template";
import { F32Template } from "@/components/forms/templates/F32Template";
import { F34Template } from "@/components/forms/templates/F34Template";
import { F35Template } from "@/components/forms/templates/F35Template";
import { F37Template } from "@/components/forms/templates/F37Template";
import { F40Template } from "@/components/forms/templates/F40Template";
import { F41Template } from "@/components/forms/templates/F41Template";
import { F42Template } from "@/components/forms/templates/F42Template";
import { F43Template } from "@/components/forms/templates/F43Template";
import { F44Template } from "@/components/forms/templates/F44Template";
import { F45Template } from "@/components/forms/templates/F45Template";
import { F46Template } from "@/components/forms/templates/F46Template";
import { F47Template } from "@/components/forms/templates/F47Template";
import { F48Template } from "@/components/forms/templates/F48Template";
import { F50Template } from "@/components/forms/templates/F50Template";

// ── Static hardcoded map — Vite CANNOT tree-shake this ──────────────────
// Every form code maps to its React component. No dynamic keys.
export const QMS_TEMPLATE_REGISTRY: Record<string, React.ComponentType<any>> = {
  "F/08": F08Template,
  "F/09": F09Template,
  "F/10": F10Template,
  "F/11": F11Template,
  "F/12": F12Template,
  "F/13": F13Template,
  "F/14": F14Template,
  "F/15": F15Template,
  "F/16": F16Template,
  "F/17": F17Template,
  "F/18": F18Template,
  "F/19": F19Template,
  "F/20": F20Template,
  "F/21": F21Template,
  "F/22": F22Template,
  "F/23": F23Template,
  "F/24": F24Template,
  "F/25": F25Template,
  "F/28": F28Template,
  "F/29": F29Template,
  "F/30": F30Template,
  "F/32": F32Template,
  "F/34": F34Template,
  "F/35": F35Template,
  "F/37": F37Template,
  "F/40": F40Template,
  "F/41": F41Template,
  "F/42": F42Template,
  "F/43": F43Template,
  "F/44": F44Template,
  "F/45": F45Template,
  "F/46": F46Template,
  "F/47": F47Template,
  "F/48": F48Template,
  "F/50": F50Template,
};

/**
 * Resolve a template component by form code.
 * Returns the component or null if not found (fallback to schema-driven view).
 */
export function getTemplateComponent(formCode: string): React.ComponentType<any> | null {
  return QMS_TEMPLATE_REGISTRY[formCode] ?? null;
}
