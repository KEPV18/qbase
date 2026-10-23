// ============================================================================
// QBase — Compliance Report
//
// The big page behind the Compliance Radar.
//
// The radar on the dashboard answers "which forms are behind?" in one line
// each.  Pressing one of those forms opens THIS page: the same form, in
// full — every period of its year (filed, missed, still open), the deadline
// and the lateness of each period it missed, when it was last filed, and
// what it owes next.
//
// It reads the one engine (`@/lib/compliance` → `@/lib/compliancePeriods`)
// through `@/lib/complianceReport`, so the number on this page and the
// number on the radar are the same number, computed once.
// ============================================================================

import { useCallback, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Radar, RefreshCw, AlertTriangle, CheckCircle, ChevronRight, FileText, Plus,
} from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { AsyncBoundary } from "@/components/ui/AsyncBoundary";
import { Button } from "@/components/ui/button";
import {
  PanelCell, PanelCells, PanelFigure, PanelHeader, PanelRow, PanelRows, UnifiedPanel,
} from "@/components/ui/UnifiedPanel";
import { useRecords } from "@/hooks/useRecordStorage";
import { CANONICAL_FORMS } from "@/data/formCatalog";
import { buildComplianceMap } from "@/lib/compliance";
import {
  buildComplianceReport, formatDueDate, reportAnchorId,
  type ReportForm, type ReportPeriod,
} from "@/lib/complianceReport";
import { getRecordMonth } from "@/lib/temporalUtils";
import { cn } from "@/lib/utils";

/** '2026-03-05' → '5 Mar' — the compact form used inside the year grid. */
function shortDue(dueDate: string): string {
  return formatDueDate(dueDate).replace(/ \d{4}$/, "");
}

/* ─── One period of the year grid ────────────────────────────────────── */
function PeriodCell({ period }: { period: ReportPeriod }) {
  const missing = period.state === "missing";
  const text = missing
    ? `${period.daysLate} days late`
    : period.state === "covered"
      ? "Filed"
      : period.state === "open"
        ? `Due ${shortDue(period.dueDate)}`
        : "Not due yet";

  return (
    <PanelCell className="px-3 py-2.5">
      <p className="truncate text-[11px] font-semibold tabular-nums text-foreground">
        {period.label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-[10px]",
          missing ? "font-semibold text-warning-tint" : "text-muted-foreground",
        )}
      >
        {text}
      </p>
    </PanelCell>
  );
}

/* ─── One form, in full ──────────────────────────────────────────────── */
function FormGapPanel({
  form,
  focused,
  onCreate,
  onOpenForm,
}: {
  form: ReportForm;
  focused: boolean;
  onCreate: (code: string) => void;
  onOpenForm: (code: string) => void;
}) {
  // A monthly form has 12 periods, a quarterly one 4, a semi-annual one 2
  // and an annual one 1.  The grid follows the count, and a short year
  // sits in two columns rather than one lonely cell of four.
  const columns = form.periodCount >= 4 ? 4 : 2;

  return (
    <UnifiedPanel
      id={reportAnchorId(form.code)}
      className={cn(focused && "ring-1 ring-primary/40")}
    >
      {/* The header stacks on a phone.  In one row the two action buttons
          left the title block about 150px, and its second line — the
          section — was then wider than the space it had, so the two lines
          were drawn on top of each other. */}
      <PanelHeader
        className="flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between"
        title={
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate">
              <span className="font-semibold text-warning-tint">{form.code}</span>
              <span>{" · "}{form.name}</span>
            </span>
            <span className="truncate text-[11px] font-normal text-muted-foreground">
              {[form.cadence, form.section].filter(Boolean).join(" · ")}
            </span>
          </span>
        }
        actions={
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onOpenForm(form.code)}
              className="gap-1.5 text-muted-foreground"
            >
              <FileText className="h-3.5 w-3.5" /> Form
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onCreate(form.code)}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Create record
            </Button>
          </>
        }
      />

      {/* Four facts.  The colour goes on the NUMBER, never on the cell. */}
      <PanelCells columns={4}>
        <PanelCell>
          <PanelFigure
            label="Missed"
            value={form.countLabel}
            tone="warning"
            dot
          />
        </PanelCell>
        <PanelCell>
          <PanelFigure
            label="Overdue by"
            value={`${form.overdueDays} days`}
            tone="destructive"
            dot
          />
        </PanelCell>
        <PanelCell>
          <PanelFigure label="Last filed" value={form.lastFiledText} />
        </PanelCell>
        <PanelCell>
          <PanelFigure
            label={`Filed in ${form.year}`}
            value={`${form.coveredCount} / ${form.periodCount}`}
          />
        </PanelCell>
      </PanelCells>

      {/* The whole year, period by period. */}
      <div className="px-5 pb-2 pt-4">
        <p className="text-xs font-semibold text-foreground">
          Coverage — {form.year}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Every {form.unit} of the year: filed, missed, or not yet due.
        </p>
      </div>
      <PanelCells columns={columns}>
        {form.periods.map(period => (
          <PeriodCell key={period.key} period={period} />
        ))}
      </PanelCells>

      {/* The gaps, one by one, with the deadline and the lateness. */}
      <div className="px-5 pb-2 pt-4">
        <p className="text-xs font-semibold text-foreground">
          Missed periods ({form.missingCount})
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Select a period to open the form and file it.
        </p>
      </div>
      <PanelRows>
        {form.missing.map(period => (
          <PanelRow
            key={period.key}
            as="button"
            type="button"
            onClick={() => onCreate(form.code)}
            className="items-start"
          >
            <AlertTriangle
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning-tint"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground">
                <span className="font-semibold text-warning-tint">{period.label}</span>
                <span className="text-muted-foreground">
                  {" · was due "}{formatDueDate(period.dueDate)}
                </span>
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Not filed — {period.daysLate} days late
              </p>
            </div>
            <ChevronRight
              className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          </PanelRow>
        ))}
      </PanelRows>
    </UnifiedPanel>
  );
}

/* ─── The page ───────────────────────────────────────────────────────── */
export default function ComplianceReportPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // `?form=F%2F49` — the form that was pressed in the radar.
  const focusCode = searchParams.get("form");
  const { data: records, isLoading, error, refetch } = useRecords();

  const report = useMemo(() => {
    const filings = (records || []).map(r => ({
      formCode: String(r.formCode),
      createdAt: String(r._createdAt || ""),
      month: getRecordMonth(r),
    }));
    const map = buildComplianceMap(
      filings,
      CANONICAL_FORMS.map(f => ({
        code: f.code,
        name: f.name,
        frequency: f.frequency,
      })),
    );
    return buildComplianceReport(
      map,
      CANONICAL_FORMS.map(f => ({ code: f.code, section: f.sectionName })),
    );
  }, [records]);

  const scrollToForm = useCallback((code: string) => {
    const el = document.getElementById(reportAnchorId(code));
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Jump to the form that was pressed in the radar.  The delay lets the
  // shell's own "scroll to top on mount" settle first — otherwise the page
  // would land on the top and the jump would be lost.
  useEffect(() => {
    if (!focusCode || isLoading) return;
    const t = setTimeout(() => scrollToForm(focusCode), 80);
    return () => clearTimeout(t);
  }, [focusCode, isLoading, scrollToForm, report.forms.length]);

  const onCreate = useCallback(
    (code: string) => navigate(`/create?formCode=${encodeURIComponent(code)}`),
    [navigate],
  );
  const onOpenForm = useCallback(
    (code: string) => navigate(`/form/${encodeURIComponent(code)}`),
    [navigate],
  );

  const asOfLabel = useMemo(
    () => new Date().toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    }),
    [],
  );

  if (isLoading || error) {
    return (
      <AppShell breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "Compliance Report" }]}>
        <AsyncBoundary
          isLoading={isLoading}
          error={error as Error | null}
          onRetry={() => refetch()}
        />
      </AppShell>
    );
  }

  return (
    <AppShell breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "Compliance Report" }]}>
      <div className="space-y-5">
        <PageHeader
          icon={Radar}
          title="Compliance Report"
          description="Every recurring form with a filing gap — which periods it missed, when each was due, and how late it is."
          onBack="/"
          actions={[
            { label: "Refresh", icon: RefreshCw, onClick: () => refetch() },
          ]}
        />

        {report.forms.length === 0 ? (
          <UnifiedPanel>
            <div className="flex items-center gap-2 px-5 py-4">
              <CheckCircle className="h-4 w-4 shrink-0 text-success-tint" />
              <span className="text-sm font-semibold text-foreground">
                No compliance gaps — every recurring form is up to date
              </span>
            </div>
            <div className="-mt-2 px-5 pb-4">
              <p className="ml-6 text-xs text-muted-foreground">
                Nothing is overdue across the monthly, quarterly, semi-annual and annual forms.
              </p>
            </div>
          </UnifiedPanel>
        ) : (
          <>
            {/* The summary, and the list of forms it is about. */}
            <UnifiedPanel>
              <PanelHeader
                title="Summary"
                meta={`as of ${asOfLabel}`}
              />
              <PanelCells columns={4}>
                <PanelCell>
                  <PanelFigure
                    label="Forms with gaps"
                    value={report.formCount}
                    tone="warning"
                    dot
                  />
                </PanelCell>
                <PanelCell>
                  <PanelFigure
                    label="Missed filings"
                    value={report.missingCount}
                    tone="destructive"
                    dot
                  />
                </PanelCell>
                <PanelCell>
                  <PanelFigure
                    label="Never filed"
                    value={report.neverFiledCount}
                    tone="warning"
                    dot
                  />
                </PanelCell>
                <PanelCell>
                  <PanelFigure
                    label="Longest overdue"
                    value={`${report.worstOverdueDays} days`}
                    tone="destructive"
                    dot
                  />
                </PanelCell>
              </PanelCells>
              <div className="px-5 pb-2 pt-4">
                <p className="text-xs font-semibold text-foreground">
                  Jump to a form
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Each form is broken down below, period by period.
                </p>
              </div>
              <PanelRows>
                {report.forms.map(form => (
                  <PanelRow
                    key={form.code}
                    as="button"
                    type="button"
                    onClick={() => scrollToForm(form.code)}
                    className="items-start"
                  >
                    <AlertTriangle
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning-tint"
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground">
                        <span className="font-semibold text-warning-tint">{form.code}</span>
                        {" · "}{form.name}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {form.cadence}
                        {form.section ? ` · ${form.section}` : ""} —{" "}
                        {form.neverFiled
                          ? `never filed, ${form.countLabel} owed`
                          : `${form.countLabel} missing`}
                        {" · "}{form.overdueDays} days late
                      </p>
                    </div>
                    <ChevronRight
                      className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </PanelRow>
                ))}
              </PanelRows>
            </UnifiedPanel>

            {/* One panel per form, in full. */}
            {report.forms.map(form => (
              <FormGapPanel
                key={form.code}
                form={form}
                focused={focusCode === form.code}
                onCreate={onCreate}
                onOpenForm={onOpenForm}
              />
            ))}
          </>
        )}
      </div>
    </AppShell>
  );
}
