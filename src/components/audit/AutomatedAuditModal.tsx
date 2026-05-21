import { useState, useEffect, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle, CheckCircle, Loader2, AlertTriangle,
  PlayCircle, Save, Download, ChevronDown, ChevronRight, Timer,
  Zap, Shield, Info, CheckCheck, XCircle,
} from "lucide-react";
import { QMSRecord, updateSheetCell } from "@/lib/googleSheets";
import { renameDriveFile } from "@/lib/driveService";
import { runAutomatedAudit, AuditRecordResult, AuditFullResult, AuditIssue, IssueSeverity } from "@/lib/auditCheckService";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface AutomatedAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: QMSRecord[];
}

type FilterTab = 'all' | 'critical' | 'warning' | 'info';

export function AutomatedAuditModal({ isOpen, onClose, records }: AutomatedAuditModalProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, currentCode: "" });
  const [auditResult, setAuditResult] = useState<AuditFullResult | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [selectedFixes, setSelectedFixes] = useState<Set<string>>(new Set());
  const [isFixing, setIsFixing] = useState(false);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [showCompliant, setShowCompliant] = useState(false);
  const [collapsedCards, setCollapsedCards] = useState<Set<string>>(new Set());
  const [liveIssueCount, setLiveIssueCount] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTimestamp, setStartTimestamp] = useState<number | null>(null);
  const [fixProgress, setFixProgress] = useState<{ current: number; total: number; name: string } | null>(null);
  const queryClient = useQueryClient();
  // Timer for elapsed time during scan
  useEffect(() => {
    if (!isRunning || !startTimestamp) return;
    const interval = setInterval(() => {
      setElapsedTime(Math.round((Date.now() - startTimestamp) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, startTimestamp]);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setIsRunning(false);
        setProgress({ current: 0, total: 0, currentCode: "" });
        setAuditResult(null);
        setFilterTab('all');
        setShowCompliant(false);
        setCollapsedCards(new Set());
        setLiveIssueCount(0);
        setElapsedTime(0);
        setStartTimestamp(null);
        setFixProgress(null);
      }, 300);
    }
  }, [isOpen]);

  const results = auditResult?.records ?? null;
  const summary = auditResult?.summary ?? null;

  const handleStartAudit = async () => {
    setIsRunning(true);
    setAuditResult(null);
    setLiveIssueCount(0);
    setStartTimestamp(Date.now());
    setElapsedTime(0);
    try {
      let issueAccumulator = 0;
      const fullResult = await runAutomatedAudit(records, (current, total, recordCode, liveIssues) => {
        setProgress({ current, total, currentCode: recordCode });
        if (liveIssues && liveIssues.length > 0) {
          issueAccumulator += liveIssues.filter(i => i.severity !== 'info').length;
          setLiveIssueCount(issueAccumulator);
        }
      });
      setAuditResult(fullResult);

      // Auto-collapse records with more than 3 issues
      const autoCollapsed = new Set<string>();
      fullResult.records.forEach(r => {
        if (r.issues.length > 3) autoCollapsed.add(r.recordCode);
      });
      setCollapsedCards(autoCollapsed);
    } catch (error) {
      console.error("Error");
      toast.error("Audit Failed", { description: (error as Error).message });
    } finally {
      setIsRunning(false);
      setStartTimestamp(null);
    }
  };

  const handleApplyResults = async () => {
    if (!results) return;
    setIsApplying(true);

    try {
      const recordsWithIssues = results.filter(r => r.suggestedStatus === 'rejected');
      const cleanRecords = results.filter(r => r.suggestedStatus === 'approved');
      let updatedCount = 0;

      const recordsToClear = cleanRecords.filter(cr => {
        const original = records.find(r => r.code === cr.recordCode);
        const reviews = original?.fileReviews;
        return reviews?.recordStatus === 'rejected';
      });

      if (recordsWithIssues.length === 0 && recordsToClear.length === 0) {
        toast.success("Audit Status Synchronized", { description: "No new issues to apply, and no old issues need clearing." });
        setIsApplying(false);
        return;
      }

      for (const res of recordsWithIssues) {
        const original = records.find(r => r.code === res.recordCode);
        if (!original) continue;
        const currentReviews = original.fileReviews || {};
        const updatedMetadata = {
          ...currentReviews,
          recordStatus: 'rejected',
          lastAuditDate: new Date().toISOString(),
          auditIssues: res.issues.map(i => i.message),
        };
        await updateSheetCell(original.rowIndex, 'P', JSON.stringify(updatedMetadata));
        updatedCount++;
      }

      for (const res of recordsToClear) {
        const original = records.find(r => r.code === res.recordCode);
        if (!original) continue;
        const currentReviews = { ...(original.fileReviews) };
        delete currentReviews.recordStatus;
        delete currentReviews.auditIssues;
        currentReviews.lastAuditDate = new Date().toISOString();
        await updateSheetCell(original.rowIndex, 'P', JSON.stringify(currentReviews));
        updatedCount++;
      }

      toast.success("Dashboard Synchronized", { description: `Updated ${updatedCount} forms with latest audit findings.` });
      queryClient.invalidateQueries({ queryKey: ["qms-data"] });
      onClose();
    } catch (error: unknown) {
      console.error("Error");
      toast.error("Sync Failed", { description: (error as Error)?.message });
    } finally {
      setIsApplying(false);
    }
  };

  const handleFixNames = async () => {
    if (selectedFixes.size === 0 || !results) return;
    setIsFixing(true);
    let successCount = 0;
    const totalToFix = selectedFixes.size;

    try {
      const fixesToApply = results.flatMap(r => r.suggestedFixes || [])
        .filter(f => selectedFixes.has(f.id));

      for (let i = 0; i < fixesToApply.length; i++) {
        const fix = fixesToApply[i];
        setFixProgress({ current: i + 1, total: totalToFix, name: fix.currentName });
        
        const success = await renameDriveFile(fix.id, fix.suggestedName);
        if (success) successCount++;
      }

      toast.success("Renaming Complete", { description: `Successfully renamed ${successCount} of ${totalToFix} items. Syncing with Drive...` });

      setFixProgress(null);
      queryClient.invalidateQueries({ queryKey: ["qms-data"] });
      // Wait for Drive propagation
      await new Promise(resolve => setTimeout(resolve, 3000));
      setSelectedFixes(new Set());
      await handleStartAudit();
    } catch (error: unknown) {
      console.error("Error");
      toast.error("Fix Failed", { description: (error as Error)?.message });
    } finally {
      setIsFixing(false);
      setFixProgress(null);
    }
  };

  // ─── Export Report ───
  const handleExportReport = useCallback(() => {
    if (!auditResult) return;
    const report = {
      generatedAt: new Date().toISOString(),
      summary: auditResult.summary,
      records: auditResult.records.map(r => ({
        code: r.recordCode,
        name: r.recordName,
        category: r.category,
        templateStatus: r.templateStatus,
        folderStatus: r.folderStatus,
        sequenceStatus: r.sequenceStatus,
        namingStatus: r.namingStatus,
        status: r.suggestedStatus,
        filesChecked: r.filesChecked,
        missingSerials: r.missingSerials,
        issues: r.issues.map(i => ({ message: i.message, severity: i.severity, phase: i.phase })),
        suggestedFixes: r.suggestedFixes || [],
      })),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-report-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report Exported");
  }, [auditResult]);

  // ─── Select All / Deselect All ───
  const allFixIds = useMemo(() => {
    if (!results) return [];
    return results.flatMap(r => r.suggestedFixes || []).map(f => f.id);
  }, [results]);

  const handleSelectAllFixes = () => {
    if (selectedFixes.size === allFixIds.length) {
      setSelectedFixes(new Set());
    } else {
      setSelectedFixes(new Set(allFixIds));
    }
  };

  const toggleFixSelection = (id: string) => {
    const next = new Set(selectedFixes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedFixes(next);
  };

  const toggleCollapse = (code: string) => {
    const next = new Set(collapsedCards);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    setCollapsedCards(next);
  };

  // ─── Computed Stats ───
  const getPercentage = () => {
    if (progress.total === 0) return 0;
    return Math.round((progress.current / progress.total) * 100);
  };

  const eta = useMemo(() => {
    if (!isRunning || progress.current === 0 || elapsedTime === 0) return null;
    const perRecord = elapsedTime / progress.current;
    const remaining = (progress.total - progress.current) * perRecord;
    return Math.max(1, Math.round(remaining));
  }, [isRunning, progress, elapsedTime]);

  const compliantCount = results ? results.filter(r => r.issues.length === 0).length : 0;
  const brokenSequenceCount = results ? results.filter(r => r.sequenceStatus === 'broken').length : 0;

  // Filtered results by severity
  const filteredResults = useMemo(() => {
    if (!results) return [];

    let filtered = showCompliant ? results : results.filter(r => r.issues.length > 0);

    if (filterTab !== 'all') {
      filtered = filtered.filter(r =>
        r.issues.some(i => i.severity === filterTab) || (showCompliant && r.issues.length === 0)
      );
    }

    return filtered;
  }, [results, filterTab, showCompliant]);

  // Severity counts
  const severityCounts = useMemo(() => {
    if (!results) return { critical: 0, warning: 0, info: 0 };
    const all = results.flatMap(r => r.issues);
    return {
      critical: all.filter(i => i.severity === 'critical').length,
      warning: all.filter(i => i.severity === 'warning').length,
      info: all.filter(i => i.severity === 'info').length,
    };
  }, [results]);

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  const severityIcon = (severity: IssueSeverity) => {
    switch (severity) {
      case 'critical': return <XCircle className="w-4 h-4 mt-0.5 text-destructive shrink-0" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 mt-0.5 text-warning shrink-0" />;
      case 'info': return <Info className="w-4 h-4 mt-0.5 text-info shrink-0" />;
    }
  };

  const severityBadge = (severity: IssueSeverity) => {
    const styles = {
      critical: "bg-red-100 text-red-700 border-red-200",
      warning: "bg-warning/10 text-warning border-warning/30",
      info: "bg-blue-100 text-info border-blue-200",
    };
    return <Badge variant="secondary" className={cn("h-4 text-[7px] ml-1", styles[severity])}>{severity.toUpperCase()}</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isRunning && onClose()}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden bg-background">
        <div className="p-6 border-b border-border bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Shield className="w-5 h-5 text-primary" />
              Automated System Audit
            </DialogTitle>
            <DialogDescription>
              Validate template links, record folders, file naming, and sequential formatting across all {records.length} QMS Forms and their underlying records & files.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col relative min-h-0">
          {/* ═══ START SCREEN ═══ */}
          {!isRunning && !results && (
            <div className="flex-1 p-12 flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-20 h-20 rounded-sm bg-primary/10 flex items-center justify-center">
                <PlayCircle className="w-10 h-10 text-primary" />
              </div>
              <div className="max-w-md">
                <h3 className="text-lg font-bold">Ready to Start Audit</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  This process runs 3 phases: <strong>Link Integrity</strong>, <strong>Sequence Validation</strong>, and <strong>Naming Convention & Format</strong> checks on all {records.length} Forms and their extracted files/records.
                </p>
              </div>
              <Button onClick={handleStartAudit} className="h-12 px-8 text-base bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                <Zap className="w-5 h-5" /> Start Automated Audit
              </Button>
            </div>
          )}

          {/* ═══ RUNNING SCREEN ═══ */}
          {isRunning && (
            <div className="flex-1 p-12 flex flex-col items-center justify-center text-center space-y-8">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <Loader2 className="w-16 h-16 text-primary animate-spin opacity-20" />
                <div className="absolute inset-0 flex items-center justify-center font-bold text-xl">
                  {getPercentage()}%
                </div>
              </div>

              <div className="w-full max-w-md space-y-3">
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-muted-foreground">Scanning Google Drive...</span>
                  <span className="font-mono text-primary">{progress.currentCode}</span>
                </div>
                <div className="h-3 bg-muted/50 rounded-sm overflow-hidden w-full border border-border">
                  <div
                    className="h-full bg-primary transition-all duration-300 rounded-sm"
                    style={{ width: `${getPercentage()}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground font-mono">
                  <span>Processed {progress.current} of {progress.total} Forms & Records</span>
                  <span className="flex items-center gap-1">
                    <Timer className="w-3 h-3" />
                    {formatTime(elapsedTime)}
                    {eta && <span className="text-muted-foreground/60"> · ~{formatTime(eta)} left</span>}
                  </span>
                </div>

                {/* Live issue counter */}
                {liveIssueCount > 0 && (
                  <div className="mt-4 p-3 bg-destructive/5 border border-destructive/20 rounded-sm flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-destructive" />
                    <span className="text-destructive font-semibold">{liveIssueCount}</span>
                    <span className="text-muted-foreground">issues found so far</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ RESULTS SCREEN ═══ */}
          {results && (
            <div className="flex-1 flex flex-col min-h-0 bg-muted/10 overflow-hidden">
              {/* Summary Banner */}
              {summary && (
                <div className="px-6 py-3 bg-card border-b border-border flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-12 h-12 rounded-sm flex items-center justify-center text-lg font-bold",
                      summary.healthScore >= 80 ? "bg-green-500/10 text-green-600" :
                        summary.healthScore >= 50 ? "bg-warning/10 text-warning" :
                          "bg-red-500/10 text-red-600"
                    )}>
                      {summary.healthScore}%
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">
                        {summary.healthScore >= 80 ? "System Health: Good" :
                          summary.healthScore >= 50 ? "System Health: Needs Attention" :
                            "System Health: Critical"}
                      </h4>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-2">
                        <span className="flex items-center gap-1"><Timer className="w-3 h-3" /> {formatTime(summary.duration)}</span>
                        <span>·</span>
                        <span>{summary.apiCallsMade} API calls</span>
                        <span>·</span>
                        <span>{summary.totalFiles} files checked</span>
                      </p>
                    </div>
                  </div>

                  {/* Export & Select All */}
                  <div className="flex items-center gap-2">
                    {allFixIds.length > 0 && (
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleSelectAllFixes}>
                        <CheckCheck className="w-3 h-3" />
                        {selectedFixes.size === allFixIds.length ? "Deselect All" : `Select All (${allFixIds.length})`}
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleExportReport}>
                      <Download className="w-3 h-3" /> Export
                    </Button>
                  </div>
                </div>
              )}

              {/* Stats Cards */}
              <div className="p-4 grid grid-cols-5 gap-2 bg-card border-b border-border">
                <div className="p-2.5 rounded-sm border border-border bg-background flex items-center gap-2">
                  <div className="w-7 h-7 rounded-sm bg-green-500/10 flex items-center justify-center">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold font-heading">{compliantCount}</h4>
                    <p className="text-[7px] uppercase font-bold text-muted-foreground">Compliant</p>
                  </div>
                </div>
                <div className="p-2.5 rounded-sm border border-border bg-background flex items-center gap-2">
                  <div className="w-7 h-7 rounded-sm bg-red-500/10 flex items-center justify-center">
                    <XCircle className="w-3.5 h-3.5 text-red-500" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold font-heading">{severityCounts.critical}</h4>
                    <p className="text-[7px] uppercase font-bold text-muted-foreground">Critical</p>
                  </div>
                </div>
                <div className="p-2.5 rounded-sm border border-border bg-background flex items-center gap-2">
                  <div className="w-7 h-7 rounded-sm bg-warning/10 flex items-center justify-center">
                    <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold font-heading">{severityCounts.warning}</h4>
                    <p className="text-[7px] uppercase font-bold text-muted-foreground">Warnings</p>
                  </div>
                </div>
                <div className="p-2.5 rounded-sm border border-border bg-background flex items-center gap-2">
                  <div className="w-7 h-7 rounded-sm bg-blue-500/10 flex items-center justify-center">
                    <Info className="w-3.5 h-3.5 text-info" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold font-heading">{severityCounts.info}</h4>
                    <p className="text-[7px] uppercase font-bold text-muted-foreground">Info</p>
                  </div>
                </div>
                <div className="p-2.5 rounded-sm border border-border bg-background flex items-center gap-2">
                  <div className="w-7 h-7 rounded-sm bg-warning/10 flex items-center justify-center">
                    <AlertCircle className="w-3.5 h-3.5 text-warning" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold font-heading">{brokenSequenceCount}</h4>
                    <p className="text-[7px] uppercase font-bold text-muted-foreground">Seq Gaps</p>
                  </div>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="px-6 py-2 border-b border-border bg-card flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {([
                    { key: 'all' as FilterTab, label: 'All Issues', count: results.filter(r => r.issues.length > 0).length },
                    { key: 'critical' as FilterTab, label: 'Critical', count: new Set(results.filter(r => r.issues.some(i => i.severity === 'critical')).map(r => r.recordCode)).size },
                    { key: 'warning' as FilterTab, label: 'Warnings', count: new Set(results.filter(r => r.issues.some(i => i.severity === 'warning')).map(r => r.recordCode)).size },
                    { key: 'info' as FilterTab, label: 'Info', count: new Set(results.filter(r => r.issues.some(i => i.severity === 'info')).map(r => r.recordCode)).size },
                  ]).map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setFilterTab(tab.key)}
                      className={cn(
                        "px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all",
                        filterTab === tab.key
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "text-muted-foreground hover:bg-muted/50"
                      )}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showCompliant}
                    onChange={e => setShowCompliant(e.target.checked)}
                    className="w-3 h-3 accent-primary"
                  />
                  Show Compliant
                </label>
              </div>

              {/* Results List */}
              <div className="flex-1 min-h-[400px] overflow-hidden relative">
                <ScrollArea className="absolute inset-0 w-full h-full">
                  <div className="p-6 space-y-3 pb-12">
                  {filteredResults.length === 0 ? (
                    <div className="text-center p-12 bg-background rounded-sm border border-border">
                      <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
                      <h3 className="text-xl font-bold">
                        {filterTab === 'all' ? "Audit Completed Successfully" : `No ${filterTab} issues found`}
                      </h3>
                      <p className="text-muted-foreground mt-2">All checks passed for this filter.</p>
                    </div>
                  ) : (
                    filteredResults.map(result => {
                      const originalRecord = records.find(r => r.code === result.recordCode);
                      const isAlreadyLogged = originalRecord?.auditStatus === "Rejected";
                      const isCollapsed = collapsedCards.has(result.recordCode);
                      const isCompliant = result.issues.length === 0;

                      // Filter issues by current severity tab
                      const visibleIssues = filterTab === 'all'
                        ? result.issues
                        : result.issues.filter(i => i.severity === filterTab);

                      return (
                        <div key={result.recordCode} className={cn(
                          "rounded-sm border bg-card shadow-sm overflow-hidden transition-all",
                          isCompliant ? "border-green-200/50 bg-green-50/30" : "border-border"
                        )}>
                          {/* Card Header */}
                          <div
                            className="flex items-center justify-between gap-3 px-5 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() => toggleCollapse(result.recordCode)}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {isCompliant ? (
                                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                              ) : isCollapsed ? (
                                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                              )}
                              <span className="text-xs font-mono font-bold bg-muted border border-border px-2 py-0.5 rounded">{result.recordCode}</span>
                              <h4 className="font-bold text-sm text-foreground truncate">{result.recordName}</h4>
                              {isAlreadyLogged && (
                                <Badge variant="secondary" className="ml-1 h-4 text-[8px] bg-muted/80 text-muted-foreground border-transparent">
                                  ✅ Logged
                                </Badge>
                              )}
                              {result.error && (
                                <Badge variant="destructive" className="ml-1 h-4 text-[8px]">API ERROR</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {result.filesChecked > 0 && (
                                <span className="text-[9px] text-muted-foreground font-mono">{result.filesChecked} files</span>
                              )}
                              {!isCompliant && (
                                <Badge variant="outline" className="h-5 text-[9px] font-bold">
                                  {result.issues.length} issue{result.issues.length !== 1 ? 's' : ''}
                                </Badge>
                              )}
                              {result.templateStatus !== 'valid' && result.templateStatus !== 'missing_link' && (
                                <Badge variant="destructive" className="h-4 text-[7px]">LINK</Badge>
                              )}
                              {result.folderStatus === 'wrong_name' && (
                                <Badge variant="secondary" className="h-4 text-[7px] bg-warning/10 text-warning border-warning/30">NAME</Badge>
                              )}
                              {result.sequenceStatus === 'broken' && (
                                <Badge variant="outline" className="h-4 text-[7px] border-warning text-warning">SEQ</Badge>
                              )}
                              {result.namingStatus === 'invalid' && (
                                <Badge variant="secondary" className="h-4 text-[7px] bg-blue-100 text-blue-600 border-blue-200">P3</Badge>
                              )}
                            </div>
                          </div>

                          {/* Card Body (collapsible) */}
                          {!isCollapsed && !isCompliant && (
                            <div className="px-5 pb-4 pt-1 border-t border-border/50">
                              <ul className="space-y-3">
                                {visibleIssues.map((issue, idx) => {
                                  const matchedFix = result.suggestedFixes?.find(f => issue.message.includes(f.currentName));
                                  return (
                                  <li key={idx} className="flex items-start gap-2 text-sm text-foreground/80">
                                    {severityIcon(issue.severity)}
                                    <div className="flex-1">
                                      <span>{issue.message}</span>
                                      {severityBadge(issue.severity)}
                                      <Badge variant="outline" className="h-4 text-[7px] ml-1 opacity-50">P{issue.phase}</Badge>

                                      {/* Suggested fix UI (inline) */}
                                      {matchedFix && (
                                        <div className="mt-2 p-2 bg-background border border-border rounded flex items-center justify-between gap-3 shadow-sm">
                                          <div className="flex items-center gap-2">
                                            <input
                                              type="checkbox"
                                              checked={selectedFixes.has(matchedFix.id)}
                                              onChange={() => toggleFixSelection(matchedFix.id)}
                                              className="w-4 h-4 accent-primary"
                                            />
                                            <div className="text-[10px]">
                                              <span className="text-muted-foreground line-through block italic">{matchedFix.currentName}</span>
                                              <span className="text-primary font-bold block mt-0.5 whitespace-pre-wrap">➜ {matchedFix.suggestedName}</span>
                                            </div>
                                          </div>
                                          <Badge variant="outline" className="text-[8px] h-3.5 uppercase shrink-0">{matchedFix.type}</Badge>
                                        </div>
                                      )}
                                    </div>
                                  </li>
                                  );
                                })}
                              </ul>

                              {/* Orphaned Fixes (e.g., bulk naming) */}
                              {(() => {
                                const displayedFixIds = new Set(
                                  visibleIssues
                                    .map(issue => result.suggestedFixes?.find(f => issue.message.includes(f.currentName))?.id)
                                    .filter(Boolean)
                                );
                                const orphanedFixes = result.suggestedFixes?.filter(f => !displayedFixIds.has(f.id)) || [];

                                if (orphanedFixes.length > 0) {
                                  return (
                                    <div className="mt-4 pt-3 border-t border-dashed border-border/50">
                                      <h5 className="text-[10px] font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
                                        <Zap className="w-3 h-3" /> Additional Recommended Actions
                                      </h5>
                                      <div className="space-y-2">
                                        {orphanedFixes.map(fix => (
                                          <div key={fix.id} className="p-2 bg-muted/30 border border-border rounded flex items-center justify-between gap-3">
                                             <div className="flex items-center gap-2">
                                              <input
                                                type="checkbox"
                                                checked={selectedFixes.has(fix.id)}
                                                onChange={() => toggleFixSelection(fix.id)}
                                                className="w-4 h-4 accent-primary"
                                              />
                                              <div className="text-[10px]">
                                                <span className="text-muted-foreground line-through block italic truncate max-w-[200px]">{fix.currentName}</span>
                                                <span className="text-primary font-bold block mt-0.5 whitespace-pre-wrap">➜ {fix.suggestedName}</span>
                                              </div>
                                            </div>
                                            <Badge variant="outline" className="text-[8px] h-3.5 uppercase shrink-0">{fix.type}</Badge>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              })()}

                              {/* Show audited files */}
                              {result.checkedFileNames && result.checkedFileNames.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-border/50">
                                  <h5 className="text-[10px] font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
                                    <CheckCheck className="w-3 h-3" /> Audited Files ({result.filesChecked})
                                  </h5>
                                  <div className="flex flex-wrap gap-1.5">
                                    {result.checkedFileNames.map((fname, i) => (
                                      <Badge key={i} variant="outline" className="text-[9px] font-mono bg-muted/30 border-muted-foreground/20 text-muted-foreground hover:bg-muted/60 transition-colors">
                                        {fname}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                  </div>
                </ScrollArea>
              </div>

              {/* Fix Progress Overlay */}
              {isFixing && fixProgress && (
                <div className="absolute inset-0 z-50 bg-background/60 backdrop-blur-sm flex items-center justify-center p-8">
                  <div className="bg-card border border-border shadow-2xl rounded-sm p-6 w-full max-w-md text-center space-y-4">
                    <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
                    <div className="space-y-1">
                      <h4 className="font-bold">Applying Fixes...</h4>
                      <p className="text-xs text-muted-foreground">Please do not close the window</p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="h-2 bg-muted rounded-sm overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-300" 
                          style={{ width: `${(fixProgress.current / fixProgress.total) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono font-bold">
                        <span>{fixProgress.current} OF {fixProgress.total}</span>
                        <span>{Math.round((fixProgress.current / fixProgress.total) * 100)}%</span>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-muted/50 rounded-sm text-xs font-mono truncate">
                      Renaming: {fixProgress.name}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══ FOOTER ═══ */}
        <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center">
          <div className="text-[10px] text-muted-foreground max-w-sm">
            {results && results.filter(r => r.suggestedStatus === 'rejected').length > 0 && (
              <p>Found discrepancies. "Apply" will mark these in your dashboard.</p>
            )}
          </div>
          <div className="flex gap-2">
            {selectedFixes.size > 0 && (
              <Button
                variant="default"
                className="bg-primary hover:bg-primary/90 text-white gap-2"
                onClick={handleFixNames}
                disabled={isFixing}
              >
                {isFixing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Fix Selected ({selectedFixes.size})
              </Button>
            )}
            {results && results.length > 0 && (results.some(r => r.suggestedStatus === 'rejected') || results.some(r => {
              const original = records.find(rec => rec.code === r.recordCode);
              const reviews = original?.fileReviews;
              return reviews?.recordStatus === 'rejected' && r.suggestedStatus === 'approved';
            })) && (
                <Button
                  variant="default"
                  className="bg-orange-600 hover:bg-orange-700 text-white gap-2"
                  onClick={handleApplyResults}
                  disabled={isApplying || isFixing}
                >
                  {isApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Apply Results
                </Button>
              )}
            {results && results.length > 0 && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  setAuditResult(null);
                  handleStartAudit();
                }}
                disabled={isRunning || isApplying}
              >
                <PlayCircle className="w-4 h-4" />
                Re-run
              </Button>
            )}
            <Button variant="outline" onClick={onClose} disabled={isRunning || isApplying}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
