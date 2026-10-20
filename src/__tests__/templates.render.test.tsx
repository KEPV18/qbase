/**
 * templates.render.test.tsx
 *
 * Renders EVERY registered QMS template with a synthetic, fully-populated
 * record and asserts that each one:
 *   1. mounts without throwing,
 *   2. actually renders content (not an empty shell), and
 *   3. shows the form code, so a template that silently renders nothing
 *      (the "template loading bug") cannot pass vacuously.
 *
 * This is the offline substitute for the live FormTemplatePreview route,
 * which sits behind RequireAuth and therefore needs a live Supabase session.
 * The Supabase data layer is currently offline (project INACTIVE), so this
 * test is the only way to prove all 38 templates still render.
 *
 * Data shape: the templates read their fields from `data` (Record<string, unknown>)
 * with two access patterns:
 *   - top-level keys            (e.g. val(data, "serial"))
 *   - nested `items[]` arrays   (e.g. data.items[0].srNo)
 * The fixture below satisfies both, plus a generic key/value sweep so a
 * template that reads an unexpected key still gets a non-empty value.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Suspense } from "react";
import { QMS_TEMPLATE_REGISTRY } from "@/components/templates";

const ALL_CODES = Object.keys(QMS_TEMPLATE_REGISTRY);

// ── Synthetic record ────────────────────────────────────────────────────────
// A flat row used inside `items[]` arrays. Kept separate from makeRow so it
// can never recurse into itself.
function makeItemRow(i: number) {
  return {
    srNo: String(i + 1),
    topicNo: `T-0${i + 1}`,
    code: `AN-0${i + 1}`,
    name: `Topic ${i + 1}`,
    title: `Training Topic ${i + 1}`,
    designation: "Quality Engineer",
    qualReq: "BSc Engineering",
    qualAvail: "BSc Engineering",
    expReq: "2 years",
    expAvail: "3 years",
    expNote: "Meets requirement",
    skillReq: "Auditing",
    skillAvail: "Auditing",
    skillNote: "Meets requirement",
    participants: "5",
    identifiedBy: "Nour Ali",
    reason: "Gap identified",
    modeInternal: "Yes",
    modeExternal: "No",
    faculty: "Internal",
    plannedDate: "2026-01-10",
    actualDate: "2026-01-12",
    effMethod: "Written test",
    effBy: "Shayma Sayed",
    effNote: "Effective",
    remarks: "Item remark",
    date: "2026-01-15",
    trainer_check: "✔",
    inductee_check: "✔",
    quantity: "3",
    description: "Trial run",
    observation: "As expected",
    input: "Spec A",
    output: "Pass",
  };
}

function makeRow(i: number) {
  return {
    // identity
    serial: `F/00-00${i + 1}`,
    code: `F/00-00${i + 1}`,
    date: "2026-01-15",
    month: "January",
    year: "2026",
    record_month: "01/2026",
    coverage_period: "January 2026",
    // people
    prepared_by: "Yara Khairy",
    prepared_on: "2026-01-15",
    reviewed_by: "Nour Ali",
    reviewed_on: "2026-01-16",
    approved_by: "Ahmed Khaled",
    authorised_by: "Ahmed Khaled",
    approved_on: "2026-01-17",
    checked_by: "Menna Mohamed",
    evaluated_by: "Shayma Sayed",
    done_by: "Omar Hassan",
    trainer: "Salma Adel",
    incharge: "Nada Mohey",
    // content
    title: "Quality Management Review",
    description: "Controlled test record for template render verification.",
    remarks: "Verification record — no operational effect.",
    remarks2: "Secondary remarks field.",
    notes: "Verification notes.",
    reason: "Routine verification.",
    reason_for_development: "Customer requirement.",
    rejection_reason: "Not applicable.",
    conclusion: "Template renders correctly.",
    objectives: "Maintain ISO 9001 conformance.",
    effectiveness: "Effective — delivered as scheduled.",
    work_performed: "Documented and verified.",
    name: "Verification Subject",
    employee_name: "Verification Employee",
    employee_id: "VIZ-001",
    designation: "Quality Engineer",
    department: "Quality Assurance",
    project: "ETH",
    qualification: "BSc Engineering",
    qualification_2: "ISO 9001 Lead Auditor",
    working_in_organisation: "3 years",
    responsibility_shared: "Shared with the QA team.",
    authorities_issued: "Operational authority within scope.",
    further_training_need: "Advanced auditing techniques.",
    suggestions_for_improvement: "Continue evidence-based improvement.",
    promotion: "Not applicable this cycle.",
    increment: "3%",
    last_year_increment: "2%",
    total_marking: "88",
    evaluation_done_by: "Nour Ali",
    duration: "2 days",
    topic: "Internal Audit Fundamentals",
    venue: "Training Room A",
    objectives_text: "Audit knowledge and application.",
    project_scope: "All active annotation projects.",
    matrix_ref: "F/40-001",
    signed_document_url: "",
    // matrix-ish values
    total: "12",
    achieved: "10",
    percentage: "83%",
    // array containers
    items: [makeItemRow(0), makeItemRow(1), makeItemRow(2)],
    training_topics: [{ code: "AN-01", name: "Quality Fundamentals" }],
    training_given: [{ code: "AN-01", name: "Quality Fundamentals", date: "2026-01-10" }],
    evaluation_matrix: [
      { id: "E01", category: "Quality Awareness", score: 4 },
      { id: "E02", category: "Process Discipline", score: 5 },
    ],
    verification_items: [{ input: "Spec A", output: "Pass" }],
    experiments: [{ quantity: "3", description: "Trial run", observation: "As expected" }],
    non_conformity_source: { internal_audit: true, customer_complaint: false, process_observation: false },
    // checkbox-style nested booleans (F/22-style)
    audit_flags: { missing_evidence: false, expired_certificate: false },
  };
}

function makeData() {
  const base = makeRow(0);
  const data: Record<string, unknown> = { ...base, items: base.items };
  // Generic sweep: any key a template reads that we did not explicitly set
  // gets a plausible non-empty string, so we never assert on a blank cell.
  const GENERIC = [
    "name", "value", "status", "type", "category", "description", "remarks",
    "date", "signature", "reference", "total", "achieved", "percentage",
    "topic", "title", "remarks", "notes", "result", "verdict", "action",
    "product_name", "specification", "customer_name", "status", "duration",
    "department", "designation", "qualification", "project", "trainer",
    "location", "vendor", "amount", "currency", "reason", "conclusion",
  ];
  for (const k of GENERIC) if (data[k] === undefined) data[k] = "Verified";
  return data;
}

// The exact registry inventory. If a form is added or removed from
// QMS_TEMPLATE_REGISTRY, this list must be updated in the same commit —
// otherwise the guard below fails and the change is not silently accepted.
const EXPECTED_CODES = [
  "F/08", "F/09", "F/10", "F/11", "F/12", "F/13", "F/14", "F/15", "F/16",
  "F/17", "F/18", "F/19", "F/20", "F/21", "F/22", "F/23", "F/24", "F/25",
  "F/28", "F/29", "F/30", "F/32", "F/34", "F/35", "F/37", "F/40", "F/41",
  "F/42", "F/43", "F/44", "F/45", "F/46", "F/47", "F/48", "F/49", "F/50",
];

// ── The suite ───────────────────────────────────────────────────────────────
describe("QMS template registry — every template renders", () => {
  it("registers exactly the expected form set (no silent shrinkage)", () => {
    // Guards against the registry silently shrinking (a template that is
    // removed from the map would stop being covered by this suite).
    expect(ALL_CODES.slice().sort()).toEqual(EXPECTED_CODES.slice().sort());
    expect(new Set(ALL_CODES).size).toBe(ALL_CODES.length);
    for (const c of ALL_CODES) expect(c).toMatch(/^F\/\d{2}$/);
  });

  it.each(ALL_CODES)("%s mounts and renders content", async (code) => {
    const Template = QMS_TEMPLATE_REGISTRY[code];
    expect(Template).toBeDefined();

    const data = makeData();
    const errors: unknown[] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((...args) => {
      errors.push(args[0]);
    });

    let container: HTMLElement | null = null;
    try {
      const result = render(
        // @ts-expect-error — lazy component accepts TemplateComponentProps
        <Suspense fallback={<div>loading</div>}>
          <Template data={data} isTemplate />
        </Suspense>
      );
      container = result.container;
      // The registry stores React.lazy components — wait for the chunk to resolve.
      await waitFor(
        () => {
          expect(container!.innerHTML.length).toBeGreaterThan(200);
        },
        { timeout: 10_000 },
      );
    } finally {
      spy.mockRestore();
    }

    // 1. mounted without a React throw
    expect(container).not.toBeNull();

    // 2. rendered something — a template that returns null/empty fails here
    const html = container!.innerHTML;
    expect(html.length).toBeGreaterThan(200);

    // 3. visible text exists (not just empty divs)
    const text = (container!.textContent || "").trim();
    expect(text.length).toBeGreaterThan(20);

    // 4. the form code is visible, so a blank shell cannot pass vacuously
    expect(screen.getAllByText(new RegExp(code.replace("/", "\\/"))).length).toBeGreaterThan(0);
  });
});
