// ============================================================================
// QMS Forge — Data Integrity Dashboard (Phase 9 Refined)
// Consistent design system classes, improved hierarchy, better interactions.
// Phase 7B+7C: Non-blocking detection + progressive enforcement
// ============================================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, AlertTriangle, CheckCircle, XCircle,
  ChevronRight, ChevronDown, RefreshCw, Loader2, FileText,
  ArrowRight, Link2, Hash, ExternalLink,
} from 'lucide-react';
import {
  useDataIntegrityReport,
  detectSerialGaps,
  getAllRules,
  getSeverityColor,
  getSeverityBg,
  getSeverityIcon,
  getRuleModeColor,
  type RuleSeverity,
  type IntegritySignal,
  type SerialGap,
  type MissingReference,
  type MissingDependency,
} from '../services/ruleEngine';
import { isoToDisplay } from '../schemas';
import { AppShell } from '@/components/layout/AppShell';

// ============================================================================
// Severity Badge
// ============================================================================

const SEVERITY_STYLES: Record<RuleSeverity, { bg: string; text: string; border: string }> = {
  clean:    { bg: 'bg-success/10',     text: 'text-success',     border: 'border-success/20' },
  warning:  { bg: 'bg-warning/10',     text: 'text-warning',     border: 'border-warning/20' },
  critical: { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/20' },
};

const SEVERITY_LABELS: Record<RuleSeverity, string> = {
  clean: 'Clean',
  warning: 'Warning',
  critical: 'Critical',
};

const SEVERITY_ICONS: Record<RuleSeverity, React.ReactNode> = {
  clean: <CheckCircle className="w-3 h-3" />,
  warning: <AlertTriangle className="w-3 h-3" />,
  critical: <XCircle className="w-3 h-3" />,
};

const SeverityBadge: React.FC<{ severity: RuleSeverity }> = ({ severity }) => {
  const s = SEVERITY_STYLES[severity];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-medium border ${s.bg} ${s.text} ${s.border}`}>
      {SEVERITY_ICONS[severity]}
      {SEVERITY_LABELS[severity]}
    </span>
  );
};

// ============================================================================
// Collapsible Section
// ============================================================================

const CollapsibleSection: React.FC<{
  title: string;
  count?: number;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  severity?: RuleSeverity;
  children: React.ReactNode;
}> = ({ title, count, icon, defaultOpen = true, severity, children }) => {
  const [open, setOpen] = useState(defaultOpen);

  const borderColor: Record<RuleSeverity, string> = {
    clean: 'border-success/20',
    warning: 'border-warning/20',
    critical: 'border-destructive/20',
  };

  return (
    <div className={`ds-card overflow-hidden ${severity ? borderColor[severity] : ''}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {count !== undefined && (
            <span className="px-2 py-0.5 text-xs bg-secondary text-secondary-foreground rounded-full font-medium">
              {count}
            </span>
          )}
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
};

// ============================================================================
// Data Integrity Dashboard Page
// ============================================================================

const DataIntegrityPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    recordsWithIssues,
    serialGaps,
    missingReferences,
    missingDependencies,
    totalRecords,
    cleanRecords,
    warningRecords,
    criticalRecords,
    summary,
    isLoading,
    error,
    refetch,
  } = useDataIntegrityReport();

  const rules = getAllRules();
  const cleanPct = summary.total > 0 ? Math.round((summary.clean / summary.total) * 100) : 0;

  const breadcrumbs = [{ label: "Dashboard", path: "/" }, { label: "Data Integrity" }];

  // ─── Loading ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <AppShell breadcrumbs={breadcrumbs}>
      <div className="max-w-6xl mx-auto flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Scanning data integrity...</p>
      </div>
      </AppShell>
    );
  }

  // ─── Error ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <AppShell breadcrumbs={breadcrumbs}>
      <div className="max-w-6xl mx-auto flex flex-col items-center justify-center py-20 ds-fade-enter">
        <XCircle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-xl text-foreground mb-2">Failed to Load Integrity Data</h2>
        <p className="text-muted-foreground mb-4">{(error as Error).message}</p>
        <button onClick={() => refetch()} className="ds-press ds-focus-ring px-4 py-2 bg-primary text-primary-foreground rounded-sm flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
      </AppShell>
    );
  }

  return (
    <AppShell breadcrumbs={breadcrumbs}>
    <div className="max-w-6xl mx-auto page-transition">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Data Integrity</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Detection layer · All rules in WARN mode · No blocking enforcement
            </p>
          </div>
        </div>
        <button onClick={() => refetch()} className="ds-press ds-focus-ring px-3 py-2 text-sm bg-secondary text-secondary-foreground rounded-sm flex items-center gap-2 hover:bg-accent transition-colors">
          <RefreshCw className="w-4 h-4" /> Rescan
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="ds-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Records</p>
          <p className="text-2xl font-bold text-foreground">{summary.total}</p>
        </div>
        <div className="ds-success-card p-4">
          <p className="text-xs text-success/70 mb-1">Clean</p>
          <p className="text-2xl font-bold text-success">{summary.clean}</p>
        </div>
        <div className="ds-warning-card p-4">
          <p className="text-xs text-warning/70 mb-1">Warnings</p>
          <p className="text-2xl font-bold text-warning">{summary.warning}</p>
        </div>
        <div className="ds-critical-card p-4">
          <p className="text-xs text-destructive/70 mb-1">Critical</p>
          <p className="text-2xl font-bold text-destructive">{summary.critical}</p>
        </div>
      </div>

      {/* Integrity Bar */}
      {summary.total > 0 && (
        <div className="ds-card p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Integrity Score</p>
            <p className="text-sm font-medium text-foreground">{cleanPct}% clean</p>
          </div>
          <div className="w-full h-3 bg-secondary rounded-full overflow-hidden flex">
            <div className="bg-success transition-all" style={{ width: `${(summary.clean / summary.total) * 100}%` }} />
            <div className="bg-warning transition-all" style={{ width: `${(summary.warning / summary.total) * 100}%` }} />
            <div className="bg-destructive transition-all" style={{ width: `${(summary.critical / summary.total) * 100}%` }} />
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            {serialGaps.length === 0 && missingReferences.length === 0 && missingDependencies.length === 0 ? (
              <span className="text-success flex items-center gap-1"><CheckCircle className="w-3 h-3" /> No gaps · No missing refs · No missing deps</span>
            ) : (
              <>
                {serialGaps.length > 0 && <span className="text-warning flex items-center gap-1"><Hash className="w-3 h-3" /> {serialGaps.length} gap(s)</span>}
                {missingReferences.length > 0 && <span className="text-warning flex items-center gap-1"><Link2 className="w-3 h-3" /> {missingReferences.length} missing ref(s)</span>}
                {missingDependencies.length > 0 && <span className="text-warning flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {missingDependencies.length} missing dep(s)</span>}
              </>
            )}
          </div>
        </div>
      )}

      {/* Serial Gaps */}
      {serialGaps.length > 0 && (
        <CollapsibleSection
          title="Serial Gaps"
          count={serialGaps.length}
          icon={<Hash className="w-4 h-4 text-warning" />}
          severity="warning"
          defaultOpen={serialGaps.length > 0 && totalRecords < 50}
        >
          <div className="space-y-2">
            {serialGaps.map((gap, i) => (
              <div key={i} className="flex items-center gap-2 text-xs px-3 py-2 bg-warning/5 border border-warning/20 rounded-sm">
                <span className="font-mono text-primary">{gap.beforeSerial}</span>
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                <span className="font-mono text-primary">{gap.afterSerial}</span>
                <span className="text-warning ml-auto">{gap.missingCount} missing</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Missing References */}
      {missingReferences.length > 0 && (
        <CollapsibleSection
          title="Missing References"
          count={missingReferences.length}
          icon={<Link2 className="w-4 h-4 text-warning" />}
          severity="warning"
          defaultOpen={missingReferences.length <= 5}
        >
          <div className="space-y-2">
            {missingReferences.map((ref, i) => (
              <div key={i} className="flex items-center gap-2 text-xs px-3 py-2 bg-warning/5 border border-warning/20 rounded-sm">
                <button
                  onClick={() => navigate(`/records/${encodeURIComponent(ref.forSerial)}`)}
                  className="font-mono text-primary hover:underline flex items-center gap-1"
                >
                  {ref.forSerial}
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </button>
                <span className="text-muted-foreground">({ref.forFormCode})</span>
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                <span className="text-foreground">needs {ref.referencedFormCode}</span>
                <span className="text-muted-foreground">(field: {ref.fromField})</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Missing Dependencies */}
      {missingDependencies.length > 0 && (
        <CollapsibleSection
          title="Dependency Issues"
          count={missingDependencies.length}
          icon={<AlertTriangle className="w-4 h-4 text-warning" />}
          severity="warning"
          defaultOpen={missingDependencies.length <= 5}
        >
          <div className="space-y-2">
            {missingDependencies.map((dep, i) => (
              <div key={i} className="flex items-center gap-2 text-xs px-3 py-2 bg-warning/5 border border-warning/20 rounded-sm">
                <button
                  onClick={() => navigate(`/records/${encodeURIComponent(dep.forSerial)}`)}
                  className="font-mono text-primary hover:underline flex items-center gap-1"
                >
                  {dep.forSerial}
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </button>
                <span className="text-muted-foreground">({dep.forFormCode})</span>
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                <span className="text-warning">missing {dep.expectedPattern}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Records with Issues */}
      {recordsWithIssues.length > 0 && (
        <CollapsibleSection
          title="Records with Issues"
          count={recordsWithIssues.length}
          icon={<FileText className="w-4 h-4 text-warning" />}
          severity={recordsWithIssues.some(r => r.overallSeverity === 'critical') ? 'critical' : 'warning'}
          defaultOpen={recordsWithIssues.length <= 10}
        >
          <div className="space-y-3">
            {recordsWithIssues.map((report) => (
              <div key={report.recordSerial} className={`border rounded-sm p-3 ${getSeverityBg(report.overallSeverity)}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/records/${encodeURIComponent(report.recordSerial)}`)}
                      className="flex items-center gap-1.5 group"
                    >
                      <span className="font-mono text-primary text-sm group-hover:underline">
                        {report.recordSerial}
                      </span>
                      <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                    </button>
                    <span className="text-xs text-muted-foreground">{report.formCode}</span>
                  </div>
                  <SeverityBadge severity={report.overallSeverity} />
                </div>
                <div className="space-y-1.5 ml-4">
                  {report.signals.map((signal, j) => (
                    <div key={j} className="flex items-start gap-2 text-xs">
                      <span className={getSeverityColor(signal.severity)}>
                        {getSeverityIcon(signal.severity)}
                      </span>
                      <div>
                        <span className="text-foreground">{signal.message}</span>
                        {signal.details && (
                          <span className="text-muted-foreground ml-1">— {signal.details}</span>
                        )}
                        <span className="text-muted-foreground/60 ml-1">({signal.ruleId})</span>
                      </div>
                    </div>
                  ))}
                  {report.missingReferences.map((ref, j) => (
                    <div key={`ref-${j}`} className="flex items-center gap-2 text-xs text-warning">
                      <Link2 className="w-3 h-3" />
                      <span>Missing {ref.referencedFormCode} reference (field: {ref.fromField})</span>
                    </div>
                  ))}
                  {report.missingDependencies.map((dep, j) => (
                    <div key={`dep-${j}`} className="flex items-center gap-2 text-xs text-warning">
                      <ArrowRight className="w-3 h-3" />
                      <span>Missing dependency: {dep.expectedPattern}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* No Issues */}
      {recordsWithIssues.length === 0 && serialGaps.length === 0 && (
        <div className="flex flex-col items-center py-16 ds-fade-enter">
          <CheckCircle className="w-12 h-12 text-success/50 mb-3" />
          <h3 className="text-lg text-foreground mb-2">All Clear</h3>
          <p className="text-sm text-muted-foreground">No integrity issues detected across {summary.total} records.</p>
        </div>
      )}

      {/* Rules Registry */}
      <CollapsibleSection
        title="Active Rules"
        count={rules.length}
        icon={<Shield className="w-4 h-4 text-primary" />}
        defaultOpen={false}
      >
        <div className="space-y-2">
          {rules.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between px-3 py-2 bg-secondary/50 rounded-sm text-xs">
              <div className="flex items-center gap-2">
                <span className={`font-mono ${getRuleModeColor(rule.mode)}`}>[{rule.mode.toUpperCase()}]</span>
                <span className="text-foreground">{rule.description}</span>
              </div>
              <span className="text-muted-foreground font-mono">{rule.id}</span>
            </div>
          ))}
          <p className="text-xs text-muted-foreground mt-2 italic">All rules in WARN mode — no blocking enforcement</p>
        </div>
      </CollapsibleSection>
    </div>
    </AppShell>
  );
};

export default DataIntegrityPage;