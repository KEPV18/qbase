import { useState } from "react";
import {
  FileText, ExternalLink, Trash2, Edit, ChevronDown, ChevronRight,
  Building2, Calendar, User, MessageSquare, Clock, CheckCircle, AlertTriangle, FolderOpen, Folder, ThumbsUp, Loader2
} from "lucide-react";
import { QMSRecord, RecordStatus, FileReview } from "@/lib/googleSheets";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface RecordCardProps {
  record: QMSRecord;
  onViewDetails: (record: QMSRecord) => void;
  onDeleteFile?: (fileId: string, rowIndex: number) => Promise<void>;
  onDeleteRecord?: (rowIndex: number) => void;
  onUpdateStatus: (record: QMSRecord, status: RecordStatus) => void;
  onApproveRecord?: (record: QMSRecord) => Promise<void>;
  isUpdating?: boolean;
  variant?: "default" | "compact";
}

export function RecordCard({ record, onViewDetails, onDeleteFile, onDeleteRecord, onUpdateStatus, onApproveRecord, isUpdating, variant = "default" }: RecordCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusConfig = (status: string) => {
    const s = status?.toLowerCase() || "";
    if (s.includes("approved") || s.includes("compliant") || s.includes("✅")) {
      return { color: "text-success", bg: "bg-success/10", border: "border-success/20", icon: CheckCircle };
    }
    if (s.includes("rejected") || s.includes("nc") || s.includes("❌")) {
      return { color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20", icon: AlertTriangle };
    }
    return { color: "text-warning", bg: "bg-warning/10", border: "border-warning/20", icon: Clock };
  };

  const isAtomic = record.isAtomic;
  const displayStatus = isAtomic ? (record.fileStatus || "Pending") : (record.auditStatus || "Pending");
  const statusCfg = getStatusConfig(displayStatus);

  // Resolve metadata: atomic fields take priority, then file review, then fallbacks
  const reviewFileId = isAtomic
    ? record.fileId
    : (record.files && record.files.length > 0 ? record.files[0].id : null);
  const review: Partial<FileReview> = (record.fileReviews && reviewFileId && record.fileReviews[reviewFileId]) || {};

  const metaProject = record.fileProject || review.project || "General / All Company";
  const metaTargetYear = record.fileTargetYear || review.targetYear || "2026";
  const metaTargetMonth = review.targetMonth || "M3";
  const metaReviewedBy = record.fileReviewedBy || review.reviewedBy || record.reviewedBy || "—";
  const metaComment = record.fileComment || review.comment || "—";

  // Time ago — defensive against invalid date strings
  const timeAgo = (() => {
    if (!record.reviewDate) return "—";
    try {
      const d = new Date(record.reviewDate);
      if (isNaN(d.getTime())) return "—";
      return formatDistanceToNow(d) + " ago";
    } catch {
      return "—";
    }
  })();

  // ─── COMPACT VARIANT ──────────────────────────────
  if (variant === "compact") {
    return (
      <div className="group relative glass-card rounded-sm p-4 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 card-hover">
        <div className="flex items-center gap-4 flex-1 overflow-hidden">
          <div className={cn("w-10 h-10 rounded-sm flex items-center justify-center shrink-0", statusCfg.bg, statusCfg.color)}>
            <statusCfg.icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-nowrap">
              <span className="text-xs font-mono font-bold text-primary shrink-0">{record.code}</span>
              <h4 className="text-base font-extrabold text-foreground truncate whitespace-nowrap" title={isAtomic && record.fileName ? record.fileName : record.recordName}>
                {isAtomic && record.fileName ? record.fileName : record.recordName}
              </h4>
              {isAtomic && record.fileName && record.recordName !== record.fileName && (
                <span className="text-xs text-muted-foreground shrink-0" title={record.recordName}>({record.recordName})</span>
              )}
              <Badge variant="outline" className={cn("status-badge", statusCfg.color, statusCfg.border)}>
                {displayStatus}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground flex-wrap">
              {!isAtomic && (
                <>
                  <span className="flex items-center gap-1 font-medium bg-muted px-1.5 py-0.5 rounded-sm text-muted-foreground">
                    <FileText className="w-3 h-3" /> {record.files?.length || 0} Files
                  </span>
                  <span>•</span>
                </>
              )}
              <span className="truncate max-w-[150px] text-muted-foreground">{metaProject}</span>
              <span>•</span>
              <span className="font-mono text-muted-foreground">{metaTargetYear}</span>
              <span>•</span>
              <span>By {metaReviewedBy}</span>
            </div>

            {record.fileComment && displayStatus?.toLowerCase().includes("rejected") && (
              <p className="text-xs text-destructive/80 mt-1.5 truncate" title={record.fileComment}>
                <MessageSquare className="w-3 h-3 inline mr-1" />
                {record.fileComment}
              </p>
            )}

            {record.files && record.files.length > 0 && !isAtomic && (
              <div className="mt-2.5 flex flex-wrap gap-1.5 pt-2 border-t border-border">
                {record.files.map((file, idx) => (
                  <a
                    key={idx}
                    href={file.webViewLink || record.folderLink || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[9px] font-mono hover:bg-primary hover:text-primary-foreground transition-colors bg-muted border border-border text-muted-foreground px-2 py-0.5 rounded-md truncate max-w-[180px] flex items-center gap-1"
                    title="Open in Drive"
                  >
                    <FileText className="w-2.5 h-2.5 shrink-0" />
                    {file.name}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {(record.fileStatus === 'pending_review' || record.fileStatus === 'rejected' || displayStatus?.toLowerCase() === 'pending' || displayStatus?.toLowerCase() === 'rejected') && onApproveRecord && (
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs bg-success hover:bg-success/90 text-success-foreground border-0 shrink-0"
              disabled={isUpdating}
              onClick={() => onApproveRecord(record)}
              title="Approve this record"
            >
              {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ThumbsUp className="w-3.5 h-3.5" />}
              Approve
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs bg-background"
            onClick={() => {
              const link = record.fileLink || record.folderLink || record.templateLink;
              if (link) window.open(link, '_blank', 'noopener,noreferrer');
            }}
          >
            <FolderOpen className="w-3.5 h-3.5" /> Open
          </Button>
          {record.folderLink && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs bg-background"
              aria-label="Open folder"
              onClick={() => window.open(record.folderLink, '_blank', 'noopener,noreferrer')}
            >
              <Folder className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            aria-label="Delete record"
            onClick={() => onDeleteRecord?.(record.rowIndex)}
            disabled={isUpdating}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary"
            aria-label="View details"
            onClick={() => onViewDetails(record)}
            disabled={isUpdating}
          >
            <Edit className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className={cn("absolute top-0 left-0 w-1.5 h-full rounded-l-sm", statusCfg.bg.replace('/10', ''))} />
      </div>
    );
  }

  // ─── DEFAULT (LARGE) VARIANT ──────────────────────
  // Atomic records: show file-centric card with prominent name, status, metadata
  if (isAtomic) {
    return (
      <div className="group relative glass-card rounded-sm overflow-hidden transition-all duration-300 card-hover">
        <div className="p-5 space-y-4">
          {/* Header: Code + File Name + Status */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono font-bold text-primary shrink-0">{record.code}</span>
                <Badge variant="outline" className={cn("text-[10px] h-5 font-bold uppercase shrink-0", statusCfg.color, statusCfg.border)}>
                  {displayStatus}
                </Badge>
              </div>
              <h3 className="text-base font-bold text-foreground truncate" title={record.fileName || record.recordName}>
                {record.fileName || record.recordName}
              </h3>
              {record.fileName && record.recordName !== record.fileName && (
                <p className="text-xs text-muted-foreground truncate mt-0.5" title={record.recordName}>
                  {record.recordName}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground mt-1">{record.category}</p>
            </div>
            <div className={cn("w-10 h-10 rounded-sm flex items-center justify-center shrink-0", statusCfg.bg, statusCfg.color)}>
              <statusCfg.icon className="w-5 h-5" />
            </div>
          </div>

          {/* Rejection Comment */}
          {record.fileComment && displayStatus?.toLowerCase().includes("rejected") && (
            <div className="bg-destructive/5 border border-destructive/15 rounded-sm p-3">
              <p className="text-xs text-destructive font-semibold mb-0.5 flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3" /> Rejection Reason
              </p>
              <p className="text-xs text-destructive/80 leading-relaxed">{record.fileComment}</p>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Project</p>
              <p className="text-xs font-medium text-foreground">{metaProject}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Target Period</p>
              <p className="text-xs font-medium text-foreground font-mono">{metaTargetMonth} / {metaTargetYear}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Reviewed By</p>
              <p className="text-xs font-medium text-foreground">{metaReviewedBy}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Review Date</p>
              <p className="text-xs font-medium text-foreground">{record.reviewDate || "—"}</p>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex gap-2 flex-wrap pt-2 border-t border-border/40">
            {(record.fileStatus === 'pending_review' || record.fileStatus === 'rejected' || displayStatus?.toLowerCase() === 'pending' || displayStatus?.toLowerCase() === 'rejected') && onApproveRecord && (
              <Button
                className="flex-1 h-9 rounded-sm bg-success hover:bg-success/90 text-success-foreground gap-2 font-bold text-xs border-0"
                disabled={isUpdating}
                onClick={() => onApproveRecord(record)}
              >
                {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ThumbsUp className="w-3.5 h-3.5" />}
                Approve
              </Button>
            )}
            <Button
              className="flex-1 h-9 rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground gap-2 font-bold text-xs"
              onClick={() => {
                const link = record.fileLink || record.folderLink || record.templateLink;
                if (link) window.open(link, '_blank', 'noopener,noreferrer');
              }}
              disabled={isUpdating}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open File
            </Button>
            {record.folderLink && (
              <Button
                variant="outline"
                className="h-9 px-4 rounded-sm border border-border/40 gap-2 font-bold text-xs"
                onClick={() => window.open(record.folderLink, '_blank', 'noopener,noreferrer')}
                disabled={isUpdating}
              >
                <Folder className="w-3.5 h-3.5" />
                Folder
              </Button>
            )}
            <Button
              variant="ghost"
              className="h-9 px-3 rounded-sm text-destructive hover:bg-destructive/5 gap-2 font-bold text-xs"
              aria-label="Delete file"
              onClick={() => onDeleteFile?.(record.fileId || '', record.rowIndex)}
              disabled={!record.fileId || isUpdating}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Edit Metadata */}
          <button
            onClick={() => onViewDetails(record)}
            disabled={isUpdating}
            className="w-full text-center text-[10px] font-bold text-primary hover:underline flex items-center justify-center gap-1 opacity-70 hover:opacity-100 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Edit className="w-2.5 h-2.5" />
            Edit Metadata
          </button>
        </div>

        <div className={cn("absolute top-0 left-0 w-1.5 h-full", statusCfg.bg.replace('/10', ''))} />
      </div>
    );
  }

  // ─── DEFAULT (LARGE) VARIANT — Non-atomic (parent) records ──
  return (
    <div className="group relative glass-card backdrop-blur-xl rounded-sm overflow-hidden transition-all duration-300 card-hover">
      <div className="p-6 space-y-4">
        {/* 1. Category & Code */}
        <div>
          <h3 className="text-xl font-bold text-foreground font-heading tracking-tight">{record.category}</h3>
          <p className="text-sm font-mono text-muted-foreground mt-0.5">
            <span className="font-bold text-primary">{record.code}</span>
            {` • ${record.recordName}`}
          </p>
        </div>

        {/* 2. View Collected Evidence Button */}
        <Button
          variant="outline"
          className="w-full h-12 rounded-sm justify-between px-4 bg-background/40 border-border/40 hover:bg-background/60 group/btn"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            View Collected Evidence
          </span>
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </Button>

        {/* 3. Evidence Details (Expandable) */}
        {isExpanded && (
          <div className="space-y-4 pt-2 pb-2 pl-2 border-l-2 border-primary/10 ml-2 animate-in slide-in-from-top-2 duration-300">
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground">
                {record.files?.length || 0} File{record.files?.length !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-muted-foreground">
                {record.files?.length || 0} file found
              </p>
            </div>

            {record.files?.filter(f => !f.name.toLowerCase().endsWith('.pdf') && f.mimeType !== 'application/pdf').map((file, idx) => (
              <div key={idx} className="bg-background/40 p-3 rounded-sm border border-border/40 space-y-2">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={cn("text-[10px] h-5 font-bold uppercase", statusCfg.bg, statusCfg.color, statusCfg.border)}>
                    {displayStatus}
                  </Badge>
                  <span className="text-[10px] font-mono text-muted-foreground">{record.code}-{String(idx + 1).padStart(3, '0')}</span>
                </div>
              </div>
            ))}

            {record.files?.filter(f => f.name.toLowerCase().endsWith('.pdf') || f.mimeType === 'application/pdf').length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 px-1 mb-2">
                   <div className="h-px flex-1 bg-border/30" />
                   <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">PDF Documents</span>
                   <div className="h-px flex-1 bg-border/30" />
                </div>
                {record.files?.filter(f => f.name.toLowerCase().endsWith('.pdf') || f.mimeType === 'application/pdf').map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-muted/30 border border-border/20 rounded-sm group/pdf hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-primary/60" />
                      <span className="text-xs font-medium truncate max-w-[200px]">{file.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={cn("text-[8px] h-4 px-1 uppercase opacity-70", statusCfg.color, statusCfg.border)}>
                        {displayStatus}
                      </Badge>
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Open file"
                        className="p-1 hover:bg-primary/10 rounded transition-colors"
                      >
                        <ExternalLink className="w-3 h-3 text-primary" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. Quick Bullets */}
        <div className="space-y-1 py-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-primary">•</span>
            <span>{metaProject}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-primary">•</span>
            <span>{metaTargetMonth} / {metaTargetYear}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-primary">•</span>
            <span>{timeAgo}</span>
          </div>
        </div>

        {/* 5. Action Row */}
        <div className="flex gap-2 flex-wrap">
          {(record.fileStatus === 'pending_review' || record.fileStatus === 'rejected' || displayStatus?.toLowerCase() === 'pending' || displayStatus?.toLowerCase() === 'rejected') && onApproveRecord && (
            <Button
              className="flex-1 h-10 rounded-sm bg-success hover:bg-success/90 text-success-foreground gap-2 font-bold text-xs border-0"
              disabled={isUpdating}
              onClick={() => onApproveRecord(record)}
            >
              {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ThumbsUp className="w-3.5 h-3.5" />}
              Approve Record
            </Button>
          )}
          <Button
            className="flex-1 h-10 rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground gap-2 font-bold text-xs"
            onClick={() => {
              const link = record.fileLink || record.folderLink || record.templateLink;
              if (link) window.open(link, '_blank', 'noopener,noreferrer');
            }}
            disabled={isUpdating}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open File
          </Button>
          {record.folderLink && (
            <Button
              variant="outline"
              className="h-10 px-4 rounded-sm border border-border/40 gap-2 font-bold text-xs"
              onClick={() => window.open(record.folderLink, '_blank', 'noopener,noreferrer')}
              disabled={isUpdating}
            >
              <Folder className="w-3.5 h-3.5" />
              Folder
            </Button>
          )}
          <Button
            variant="ghost"
            className="h-10 px-4 rounded-sm border border-border/40 text-destructive hover:bg-destructive/5 gap-2 font-bold text-xs"
            aria-label="Delete file"
            onClick={() => onDeleteFile?.(record.fileId || '', record.rowIndex)}
            disabled={!record.fileId || isUpdating}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* 6. Form Metadata Section */}
        <div className="grid grid-cols-1 gap-4 pt-4 border-t border-border/40">
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Project</p>
            <p className="text-sm font-medium text-foreground">{metaProject}</p>
          </div>
          <div className="space-y-1 border-t border-border/10 pt-3">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Target Period</p>
            <p className="text-sm font-medium text-foreground">{metaTargetMonth} / {metaTargetYear}</p>
          </div>
          <div className="space-y-1 border-t border-border/10 pt-3">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Reviewed By</p>
            <p className="text-sm font-medium text-foreground">{metaReviewedBy}</p>
          </div>
          <div className="space-y-1 border-t border-border/10 pt-3">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Review Date</p>
            <p className="text-sm font-medium text-foreground">{record.reviewDate || "—"}</p>
          </div>
          <div className="space-y-1 border-t border-border/10 pt-3 pb-2">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Audit Notes</p>
            <p className="text-sm text-muted-foreground italic">{metaComment}</p>
          </div>
        </div>

        {/* 7. Edit Metadata */}
        <button
          onClick={() => onViewDetails(record)}
          disabled={isUpdating}
          className="w-full pt-4 text-center text-xs font-bold text-primary hover:underline flex items-center justify-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity border-t border-border/40 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Edit className="w-3 h-3" />
          Edit Metadata
        </button>
      </div>

      <div className={cn("absolute top-0 left-0 w-1.5 h-full", statusCfg.bg.replace('/10', ''))} />
    </div>
  );
}