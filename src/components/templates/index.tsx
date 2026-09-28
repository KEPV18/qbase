// ============================================================================
// QMS TEMPLATE REGISTRY — Lazy-Loaded Template Hub
// Each template is a separate chunk loaded on demand.
// ============================================================================

import React, { Suspense, lazy } from "react";

export interface TemplateComponentProps {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string) => void;
  className?: string;
}

// ── Lazy-loaded templates — each becomes its own chunk ────────────────────
const F08Template = lazy(() => import("@/components/forms/templates/F08Template").then(m => ({ default: m.F08Template })));
const F09Template = lazy(() => import("@/components/forms/templates/F09Template").then(m => ({ default: m.F09Template })));
const F10Template = lazy(() => import("@/components/forms/templates/F10Template").then(m => ({ default: m.F10Template })));
const F11Template = lazy(() => import("@/components/forms/templates/F11Template").then(m => ({ default: m.F11Template })));
const F12Template = lazy(() => import("@/components/forms/templates/F12Template").then(m => ({ default: m.F12Template })));
const F13Template = lazy(() => import("@/components/forms/templates/F13Template").then(m => ({ default: m.F13Template })));
const F14Template = lazy(() => import("@/components/forms/templates/F14Template").then(m => ({ default: m.F14Template })));
const F15Template = lazy(() => import("@/components/forms/templates/F15Template").then(m => ({ default: m.F15Template })));
const F16Template = lazy(() => import("@/components/forms/templates/F16Template").then(m => ({ default: m.F16Template })));
const F17Template = lazy(() => import("@/components/forms/templates/F17Template").then(m => ({ default: m.F17Template })));
const F18Template = lazy(() => import("@/components/forms/templates/F18Template").then(m => ({ default: m.F18Template })));
const F19Template = lazy(() => import("@/components/forms/templates/F19Template").then(m => ({ default: m.F19Template })));
const F20Template = lazy(() => import("@/components/forms/templates/F20Template").then(m => ({ default: m.F20Template })));
const F21Template = lazy(() => import("@/components/forms/templates/F21Template").then(m => ({ default: m.F21Template })));
const F22Template = lazy(() => import("@/components/forms/templates/F22Template").then(m => ({ default: m.F22Template })));
const F23Template = lazy(() => import("@/components/forms/templates/F23Template").then(m => ({ default: m.F23Template })));
const F24Template = lazy(() => import("@/components/forms/templates/F24Template").then(m => ({ default: m.F24Template })));
const F25Template = lazy(() => import("@/components/forms/templates/F25Template").then(m => ({ default: m.F25Template })));
const F28Template = lazy(() => import("@/components/forms/templates/F28Template").then(m => ({ default: m.F28Template })));
const F29Template = lazy(() => import("@/components/forms/templates/F29Template").then(m => ({ default: m.F29Template })));
const F30Template = lazy(() => import("@/components/forms/templates/F30Template").then(m => ({ default: m.F30Template })));
const F32Template = lazy(() => import("@/components/forms/templates/F32Template").then(m => ({ default: m.F32Template })));
const F34Template = lazy(() => import("@/components/forms/templates/F34Template").then(m => ({ default: m.F34Template })));
const F35Template = lazy(() => import("@/components/forms/templates/F35Template").then(m => ({ default: m.F35Template })));
const F37Template = lazy(() => import("@/components/forms/templates/F37Template").then(m => ({ default: m.F37Template })));
const F40Template = lazy(() => import("@/components/forms/templates/F40Template").then(m => ({ default: m.F40Template })));
const F41Template = lazy(() => import("@/components/forms/templates/F41Template").then(m => ({ default: m.F41Template })));
const F42Template = lazy(() => import("@/components/forms/templates/F42Template").then(m => ({ default: m.F42Template })));
const F43Template = lazy(() => import("@/components/forms/templates/F43Template").then(m => ({ default: m.F43Template })));
const F44Template = lazy(() => import("@/components/forms/templates/F44Template").then(m => ({ default: m.F44Template })));
const F45Template = lazy(() => import("@/components/forms/templates/F45Template").then(m => ({ default: m.F45Template })));
const F46Template = lazy(() => import("@/components/forms/templates/F46Template").then(m => ({ default: m.F46Template })));
const F47Template = lazy(() => import("@/components/forms/templates/F47Template").then(m => ({ default: m.F47Template })));
const F48Template = lazy(() => import("@/components/forms/templates/F48Template").then(m => ({ default: m.F48Template })));
const F49Template = lazy(() => import("@/components/forms/templates/F49Template").then(m => ({ default: m.F49Template })));
const F50Template = lazy(() => import("@/components/forms/templates/F50Template").then(m => ({ default: m.F50Template })));

// ── Template registry map ────────────────────────────────────────────────
export const QMS_TEMPLATE_REGISTRY: Record<string, React.LazyExoticComponent<React.ComponentType<TemplateComponentProps>>> = {
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
  "F/49": F49Template,
  "F/50": F50Template,
};

/**
 * Resolve a template component by form code.
 * Returns a lazy component or null if not found (fallback to schema-driven view).
 */
export function getTemplateComponent(formCode: string): React.LazyExoticComponent<React.ComponentType<TemplateComponentProps>> | null {
  return QMS_TEMPLATE_REGISTRY[formCode] ?? null;
}

// ── Loading fallback component ────────────────────────────────────────────
export function TemplateLoadingFallback(): React.ReactElement {
  return (
    <div className="flex items-center justify-center p-8 text-muted-foreground">
      <div className="flex flex-col items-center gap-2">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        <span className="text-sm">Loading template...</span>
      </div>
    </div>
  );
}

export function TemplateWrapper({ formCode, ...props }: { formCode: string } & TemplateComponentProps): React.ReactElement {
  const Template = getTemplateComponent(formCode);
  if (!Template) {
    return (
      <div className="p-4 text-destructive">
        Template not found for form code: {formCode}
      </div>
    );
  }
  return (
    <Suspense fallback={<TemplateLoadingFallback />}>
      <Template {...props} />
    </Suspense>
  );
}
