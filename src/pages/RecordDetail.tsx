import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { useQMSData, useUpdateRecord } from "@/hooks/useQMSData";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DecisionBanner } from "@/components/ui/DecisionBanner";
import { StateScreen } from "@/components/ui/StateScreen";

import { RecordHeader } from "@/components/record-detail/RecordHeader";
import { FileStats } from "@/components/record-detail/FileStats";
import { TechnicalSpec } from "@/components/record-detail/TechnicalSpec";
import { DocumentLinks } from "@/components/record-detail/DocumentLinks";
import { CompliancePanel } from "@/components/record-detail/CompliancePanel";
import { ReviewPanel } from "@/components/record-detail/ReviewPanel";
import { RecordTimeline } from "@/components/record-detail/RecordTimeline";

export default function RecordDetail() {
  const { "*": splat } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: records, isLoading } = useQMSData();
  const updateRecord = useUpdateRecord();

  const decodedCode = splat ? decodeURIComponent(splat) : "";

  const record = useMemo(() => {
    if (!records) return null;
    return records.find(r => r.code === decodedCode);
  }, [records, decodedCode]);

  // Previous/next record navigation
  const allRecords = useMemo(() => {
    if (!records) return [];
    return [...records].sort((a, b) => a.code.localeCompare(b.code));
  }, [records]);

  const currentIndex = useMemo(() => allRecords.findIndex(r => r.code === decodedCode), [allRecords, decodedCode]);
  const prevRecord = currentIndex > 0 ? allRecords[currentIndex - 1] : null;
  const nextRecord = currentIndex < allRecords.length - 1 ? allRecords[currentIndex + 1] : null;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["qms-data"] });
  };

  const handleAuditStatusChange = async (newStatus: string) => {
    if (!record) return;
    await updateRecord.mutateAsync({
      rowIndex: record.rowIndex,
      field: "auditStatus",
      value: newStatus,
    });
  };

  const handleReviewedChange = async (checked: boolean) => {
    if (!record) return;
    await updateRecord.mutateAsync({
      rowIndex: record.rowIndex,
      field: "reviewed",
      value: checked ? "TRUE" : "FALSE",
    });
  };

  const handleSaveReviewer = async (reviewedBy: string, reviewDate: string) => {
    if (!record) return;
    await updateRecord.mutateAsync({
      rowIndex: record.rowIndex,
      field: "reviewedBy",
      value: reviewedBy,
    });
    await updateRecord.mutateAsync({
      rowIndex: record.rowIndex,
      field: "reviewDate",
      value: reviewDate || new Date().toISOString().split("T")[0],
    });
    toast.success("Saved", { description: "Reviewer information updated successfully." });
  };

  // Determine compliance status for gradient
  const complianceColor = record
    ? (record.auditStatus?.toLowerCase().includes("approved") || record.auditStatus?.toLowerCase().includes("compliant"))
      ? "success"
      : (record.auditStatus?.toLowerCase().includes("rejected") || record.auditStatus?.toLowerCase().includes("nc"))
        ? "destructive"
        : "warning"
    : "warning";

  // Loading state
  if (isLoading) {
    return (
      <AppShell>
        <StateScreen state="loading" title="Loading record" />
      </AppShell>
    );
  }

  // Not found
  if (!record) {
    return (
      <AppShell>
        <div className="space-y-4">
          <StateScreen
            state="error"
            title="Record Not Found"
            message={`The record with code "${decodedCode}" was not found.`}
            action={{ label: "Go Back", onClick: () => navigate(-1) }}
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell breadcrumbs={[
          { label: "Dashboard", path: "/" },
          ...(record ? [{ label: record.category, path: `/module/${record.category.toLowerCase().replace(/\s+/g, '-')}` }] : []),
          { label: decodedCode }
        ]}>
      <div className="space-y-6">
        {/* Compliance Status Banner */}
        <div className={cn(
          "ds-card rounded-sm overflow-hidden animate-fade-in",
          complianceColor === "success" ? "border-success/20 bg-gradient-to-r from-success/5 to-transparent" :
          complianceColor === "destructive" ? "border-destructive/20 bg-gradient-to-r from-destructive/5 to-transparent" :
          "border-warning/20 bg-gradient-to-r from-warning/5 to-transparent"
        )}>
          <div className={cn(
            "h-1",
            complianceColor === "success" ? "bg-success" :
            complianceColor === "destructive" ? "bg-destructive" :
            "bg-warning"
          )} />
          <div className="p-4">
            <RecordHeader
              code={record.code}
              name={record.recordName}
              description={record.description}
              category={record.category}
              onRefresh={handleRefresh}
            />
          </div>
        </div>

        {/* Decision Banner */}
        {record.auditStatus?.toLowerCase().includes("rejected") || record.auditStatus?.toLowerCase().includes("nc") ? (
          <DecisionBanner
            priority="critical"
            title="This Record Has Issues"
            description="Audit review found nonconformities. Update and re-submit to clear this finding."
            action={{ label: "Change Status", onClick: () => handleAuditStatusChange("pending_review") }}
          />
        ) : !record.reviewed ? (
          <DecisionBanner
            priority="info"
            title="Record Not Yet Reviewed"
            description="Assign a reviewer and complete the review process."
          />
        ) : record.auditStatus?.toLowerCase().includes("approved") || record.auditStatus?.toLowerCase().includes("compliant") ? (
          <DecisionBanner
            priority="success"
            title="Record Approved"
            description="This record passed audit review. No action needed."
          />
        ) : (
          <DecisionBanner
            priority="info"
            title="Record Pending Review"
            description="Submit for review or approve to advance this record."
          />
        )}

        {/* Stats Row */}
        <div className="animate-fade-in stagger-1">
          <FileStats record={record} />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in stagger-2">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <div id="technical-spec"><TechnicalSpec record={record} /></div>
            <div id="document-links"><DocumentLinks
              templateLink={record.templateLink}
              folderLink={record.folderLink}
            /></div>
            <div id="record-timeline"><RecordTimeline record={record} /></div>
          </div>

          {/* Right Column - Sticky */}
          <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">
            {/* Quick Jump */}
            <div className="bg-card rounded-sm border border-border/50 p-4 space-y-2">
              <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest mb-2">On This Page</p>
              <nav className="space-y-1">
                {[
                  { id: "technical-spec", label: "Technical Spec" },
                  { id: "document-links", label: "Documents" },
                  { id: "record-timeline", label: "Timeline" },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="w-full text-left text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 px-2 py-1.5 rounded-sm transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>

            <CompliancePanel
              auditStatus={record.auditStatus}
              onStatusChange={handleAuditStatusChange}
            />
            <ReviewPanel
              reviewed={record.reviewed}
              reviewedBy={record.reviewedBy || ""}
              reviewDate={record.reviewDate || ""}
              onReviewedChange={handleReviewedChange}
              onSave={handleSaveReviewer}
            />
          </div>
        </div>

        {/* Previous/Next Record Navigation */}
        {(prevRecord || nextRecord) && (
          <div className="flex items-center justify-between pt-6 border-t border-border/40 animate-fade-in stagger-3">
            {prevRecord ? (
              <button
                onClick={() => navigate(`/record/${encodeURIComponent(prevRecord.code)}`)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
              >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                <div className="text-left">
                  <p className="text-[10px] font-mono text-muted-foreground/60">Previous</p>
                  <p className="font-semibold truncate max-w-[200px]">{prevRecord.code}</p>
                </div>
              </button>
            ) : <div />}
            {nextRecord ? (
              <button
                onClick={() => navigate(`/record/${encodeURIComponent(nextRecord.code)}`)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group text-right"
              >
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground/60">Next</p>
                  <p className="font-semibold truncate max-w-[200px]">{nextRecord.code}</p>
                </div>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ) : <div />}
          </div>
        )}
      </div>
    </AppShell>
  );
}
