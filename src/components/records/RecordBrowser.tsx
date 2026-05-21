import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { listFolderFiles, parseSerialFromFilename, extractFolderId, moveFileToArchive } from "@/lib/driveService";
import { parseStatusFromAuditField } from "@/lib/statusService";
import type { DriveFile } from "@/lib/driveService";
import type { QMSRecord } from "@/lib/googleSheets";
import { ExternalLink, FileText, Loader2, FolderOpen, Settings, Trash2, Briefcase, CalendarClock, UserCheck, CalendarDays } from "lucide-react";
import { formatTimeAgo } from "@/lib/googleSheets";
import { EditMetadataModal } from "./EditMetadataModal";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useNotifications, getAdminUserIds } from "@/hooks/useNotifications";

interface RecordBrowserProps {
    record: QMSRecord;
    isFlat?: boolean;
}

export function RecordBrowser({ record, isFlat = false }: RecordBrowserProps) {
    const [files, setFiles] = useState<DriveFile[]>(record.files || []);
    const [isLoading, setIsLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(isFlat || false);
    const [error, setError] = useState<string | null>(null);
    const [editingFile, setEditingFile] = useState<{ id: string; name: string } | null>(null);
    const queryClient = useQueryClient();
    const { addNotification } = useNotifications();

    const loadFiles = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const driveFiles = await listFolderFiles(record.folderLink);
            setFiles(driveFiles);
        } catch (err) {
            setError("Failed to load files from Drive");
            console.error("Error");
        } finally {
            setIsLoading(false);
        }
    }, [record.folderLink]);

    const handleArchive = async (fileId: string, fileName: string) => {
        if (!window.confirm(`Are you sure you want to archive "${fileName}"? It will be moved to the archive folder for 30 days.`)) return;

        setIsLoading(true);
        try {
            const folderId = extractFolderId(record.folderLink);
            if (!folderId) throw new Error("Could not find folder ID");

            await moveFileToArchive(fileId, folderId);

            // Notify all admins
            const adminIds = await getAdminUserIds();
            if (adminIds.length > 0) {
                await addNotification({
                    type: 'archive',
                    title: 'File Deleted',
                    message: `"${fileName}" from ${record.recordName} (${record.code}) was deleted.`,
                    link: '/archive',
                    data: { fileId, originalParentId: folderId, recordCode: record.code },
                    targetUserIds: adminIds,
                });
            }

            toast.success("Record Archived", { description: `Moved ${fileName} to the archive folder.` });
            await loadFiles();
            queryClient.invalidateQueries({ queryKey: ["qms-data"] });
        } catch (err: unknown) {
            toast.error("Archive Failed", { description: err.message || "Failed to archive record" });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Auto-expand if there are pending files or in flat mode
        const hasPending = record.files?.some(file => {
            const review = record.fileReviews?.[file.id];
            return !review || (review.status !== 'approved' && review.status !== 'rejected');
        });

        if (hasPending || isFlat) {
            setIsExpanded(true);
        }

        if (isExpanded && files.length === 0 && !record.files) {
            loadFiles();
        }
    }, [isExpanded, files.length, record.files, record.fileReviews, isFlat, loadFiles]);

    const recordStatus = parseStatusFromAuditField(record.auditStatus);

    return (
        <div className={cn(
            isFlat ? "" : "bg-card rounded-sm border border-border p-4 space-y-3"
        )}>
            {!isFlat && (
                <>
                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-lg">{record.recordName}</h3>
                                <span className="text-sm text-muted-foreground">({record.code})</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{record.description}</p>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 p-3 bg-muted/30 rounded-sm">
                        <div>
                            <div className="text-xs text-muted-foreground">Total Records</div>
                            <div className="text-2xl font-bold">{record.actualRecordCount || 0}</div>
                        </div>
                        <div>
                            <div className="text-xs text-muted-foreground">Last Serial</div>
                            <div className="text-lg font-semibold">{record.lastSerial || "N/A"}</div>
                        </div>
                        <div>
                            <div className="text-xs text-muted-foreground">Last Updated</div>
                            <div className="text-sm font-medium">
                                {record.lastFileDate ? formatTimeAgo(record.lastFileDate) : "Never"}
                            </div>
                        </div>
                    </div>

                    {/* View Records Button */}
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsExpanded(!isExpanded)}
                            disabled={!record.folderLink || record.folderLink.includes("No Files Yet")}
                            className="flex-1"
                        >
                            <FolderOpen className="w-4 h-4 mr-2" />
                            {isExpanded ? "Hide Records" : `View ${record.actualRecordCount || 0} Records`}
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            aria-label="Open folder"
                            onClick={() => window.open(record.folderLink, '_blank', 'noopener,noreferrer')}
                            disabled={!record.folderLink || record.folderLink.includes("No Files Yet")}
                        >
                            <ExternalLink className="w-4 h-4" />
                        </Button>
                    </div>
                </>
            )}

            {/* Records List */}
            {isExpanded && (
                <div className={isFlat ? "space-y-2" : "border-t pt-3 space-y-2"}>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            <span className="ml-2 text-sm text-muted-foreground">Loading files...</span>
                        </div>
                    ) : error ? (
                        <div className="text-center py-8 text-sm text-destructive">
                            {error}
                        </div>
                    ) : files.length === 0 ? (
                        <div className="text-center py-8 text-sm text-muted-foreground">
                            No files found in this folder
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="text-xs font-medium text-muted-foreground mb-2">
                                {files.length} file{files.length !== 1 ? 's' : ''} found
                            </div>
                            
                            {/* Other Files (Cards) */}
                            {files.filter(f => !f.name.toLowerCase().endsWith('.pdf') && f.mimeType !== 'application/pdf').map((file) => {
                                const serial = parseSerialFromFilename(file.name);

                                return (
                                    <div
                                        key={file.id}
                                        className="group relative bg-card/40 backdrop-blur-xl border border-border/40 hover:border-primary/40 rounded-sm p-5 md:p-6 transition-all duration-500 shadow-sm hover:shadow-2xl hover:-translate-y-1 overflow-hidden"
                                    >
                                        {/* Subtle Background Glow */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                                        
                                        <div className="relative z-10">
                                            {/* Header */}
                                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-5 mb-6">
                                                <div className="flex items-start gap-4 flex-1 min-w-0">
                                                    <div className="w-12 h-12 rounded-sm bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 shadow-inner border border-primary/10 group-hover:scale-105 transition-transform duration-500">
                                                        <FileText className="w-6 h-6 text-primary" />
                                                    </div>
                                                    <div className="flex-1 min-w-0 pt-0.5">
                                                        <h4 className="text-base font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors duration-300">{file.name}</h4>
                                                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                            {serial && <span className="text-[10px] font-mono font-bold bg-background/80 shadow-sm px-2 py-0.5 rounded-md border border-border/50">{serial}</span>}
                                                            {(() => {
                                                                const review = record.fileReviews?.[file.id] || { status: 'pending_review' };
                                                                return <StatusBadge status={review.status} size="sm" />;
                                                            })()}
                                                            <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                                                <CalendarDays className="w-3 h-3" />
                                                                {formatTimeAgo(file.createdTime)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Actions */}
                                                <div className="flex items-center gap-2 shrink-0 self-start bg-background/50 rounded-sm p-1 border border-border/40 shadow-sm transition-opacity opacity-80 group-hover:opacity-100">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 gap-1.5 text-xs font-semibold hover:bg-primary/10 hover:text-primary rounded-sm transition-colors"
                                                        onClick={() => window.open(file.webViewLink, '_blank', 'noopener,noreferrer')}
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                        Open
                                                    </Button>
                                                    <div className="w-px h-4 bg-border/50 mx-0.5" />
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-sm transition-colors"
                                                        onClick={() => handleArchive(file.id, file.name)}
                                                        disabled={isLoading}
                                                        aria-label="Delete file"
                                                        title="Delete File"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Metadata Grid (Premium Style) */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-muted/20 rounded-sm p-4 border border-border/40 relative overflow-hidden">
                                                <div className="absolute inset-0 bg-background/20 backdrop-blur-3xl pointer-events-none" />
                                                <div className="flex items-start gap-3 p-3 rounded-sm hover:bg-background/80 transition-colors relative z-10 border border-transparent hover:border-border/50 shadow-sm hover:shadow">
                                                    <div className="w-8 h-8 rounded-sm bg-primary/10 flex items-center justify-center shrink-0">
                                                        <Briefcase className="w-4 h-4 text-primary" />
                                                    </div>
                                                    <div className="min-w-0 pt-0.5">
                                                        <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest mb-0.5">Project</p>
                                                        <p className="text-xs font-bold text-foreground truncate">
                                                            {record.fileReviews?.[file.id]?.project || "General"}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-3 p-3 rounded-sm hover:bg-background/80 transition-colors relative z-10 border border-transparent hover:border-border/50 shadow-sm hover:shadow">
                                                    <div className="w-8 h-8 rounded-sm bg-info/10 flex items-center justify-center shrink-0">
                                                        <CalendarClock className="w-4 h-4 text-info" />
                                                    </div>
                                                    <div className="min-w-0 pt-0.5">
                                                        <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest mb-0.5">Target Period</p>
                                                        <p className="text-xs font-bold text-foreground">
                                                            M{record.fileReviews?.[file.id]?.targetMonth || "—"} / {record.fileReviews?.[file.id]?.targetYear || "—"}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-3 p-3 rounded-sm hover:bg-background/80 transition-colors relative z-10 border border-transparent hover:border-border/50 shadow-sm hover:shadow">
                                                    <div className="w-8 h-8 rounded-sm bg-success/10 flex items-center justify-center shrink-0">
                                                        <UserCheck className="w-4 h-4 text-success" />
                                                    </div>
                                                    <div className="min-w-0 pt-0.5">
                                                        <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest mb-0.5">Reviewed By</p>
                                                        <p className="text-xs font-bold text-foreground truncate">
                                                            {record.fileReviews?.[file.id]?.reviewedBy || record.reviewedBy || "—"}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-3 p-3 rounded-sm hover:bg-background/80 transition-colors relative z-10 border border-transparent hover:border-border/50 shadow-sm hover:shadow">
                                                    <div className="w-8 h-8 rounded-sm bg-warning/10 flex items-center justify-center shrink-0">
                                                        <CalendarDays className="w-4 h-4 text-warning" />
                                                    </div>
                                                    <div className="min-w-0 pt-0.5">
                                                        <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest mb-0.5">Review Date</p>
                                                        <p className="text-xs font-bold text-foreground">
                                                            {(() => {
                                                                const review = record.fileReviews?.[file.id];
                                                                const rawDate = review?.reviewDate || review?.date || record.reviewDate;
                                                                if (!rawDate) return "—";
                                                                const d = new Date(rawDate);
                                                                if (isNaN(d.getTime())) return rawDate;
                                                                return d.toLocaleDateString();
                                                            })()}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Audit Notes & Settings */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-5 mt-5 border-t border-border/40">
                                                <div className="flex-1 min-w-0 relative">
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/50 to-primary/10 rounded-full" />
                                                    <div className="pl-4">
                                                        <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest mb-1.5 flex items-center gap-1.5">
                                                            <FileText className="w-3 h-3 text-primary/70" />
                                                            Audit Notes
                                                        </p>
                                                        <p className="text-sm text-foreground/90 leading-relaxed font-medium line-clamp-2">
                                                            {record.fileReviews?.[file.id]?.comment?.trim() || <span className="text-muted-foreground italic font-normal">No additional notes provided.</span>}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-10 px-4 gap-2 text-xs shrink-0 font-bold bg-background shadow-sm hover:shadow-md text-primary border-primary/20 hover:border-primary/50 hover:bg-primary/5 self-start sm:self-center transition-all rounded-sm"
                                                    onClick={() => setEditingFile({ id: file.id, name: file.name })}
                                                >
                                                    <Settings className="w-4 h-4" />
                                                    Edit Metadata
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* PDF Section */}
                            {files.filter(f => f.name.toLowerCase().endsWith('.pdf') || f.mimeType === 'application/pdf').length > 0 && (
                                <div className="mt-8 space-y-4">
                                    <div className="flex items-center gap-3 px-2">
                                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                                        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                            <FileText className="w-4 h-4 text-primary/60" />
                                            PDF Records
                                        </div>
                                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                                    </div>

                                    <div className="grid gap-2">
                                        {files.filter(f => f.name.toLowerCase().endsWith('.pdf') || f.mimeType === 'application/pdf').map((file) => {
                                            const serial = parseSerialFromFilename(file.name);
                                            const review = record.fileReviews?.[file.id] || { status: 'pending_review' };
                                            
                                            return (
                                                <div 
                                                    key={file.id}
                                                    className="group flex flex-col md:flex-row md:items-center justify-between p-4 bg-card/30 backdrop-blur-md border border-border/40 hover:border-primary/30 rounded-sm transition-all duration-300 hover:shadow-lg gap-4"
                                                >
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                                                            <FileText className="w-5 h-5 text-primary" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h4 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{file.name}</h4>
                                                                {serial && <span className="text-[9px] font-mono font-bold bg-muted px-1.5 py-0.5 rounded border border-border/50 shrink-0">{serial}</span>}
                                                            </div>
                                                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                                                <StatusBadge status={review.status} size="sm" />
                                                                <span className="flex items-center gap-1">
                                                                    <CalendarDays className="w-3 h-3" />
                                                                    {formatTimeAgo(file.createdTime)}
                                                                </span>
                                                                <span className="hidden md:inline font-medium text-foreground/60">• {review.project || "General"}</span>
                                                                <span className="hidden md:inline font-mono text-foreground/50">• M{review.targetMonth || "—"}/{review.targetYear || "—"}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 gap-1.5 text-[11px] font-bold hover:bg-primary/10 hover:text-primary rounded-sm transition-all"
                                                            onClick={() => window.open(file.webViewLink, '_blank', 'noopener,noreferrer')}
                                                        >
                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                            Open
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:bg-primary/10 hover:text-primary rounded-sm"
                                                            onClick={() => setEditingFile({ id: file.id, name: file.name })}
                                                            aria-label="Edit file metadata"
                                                        >
                                                            <Settings className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-sm"
                                                            onClick={() => handleArchive(file.id, file.name)}
                                                            disabled={isLoading}
                                                            aria-label="Delete file"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
            {editingFile && (
                <EditMetadataModal
                    isOpen={!!editingFile}
                    onClose={() => setEditingFile(null)}
                    record={record}
                    fileId={editingFile.id}
                    fileName={editingFile.name}
                    onSuccess={() => {
                        loadFiles();
                    }}
                />
            )}
        </div>
    );
}
