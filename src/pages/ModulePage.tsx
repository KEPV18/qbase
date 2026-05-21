import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { useQMSData } from "@/hooks/useQMSData";
import { RecordsTable } from "@/components/records/RecordsTable";
import { RecordBrowser } from "@/components/records/RecordBrowser";
import {
  ArrowLeft,
  FileText,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  ClipboardCheck,
  Settings,
  Users,
  Inbox,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { AddRecordModal } from "@/components/records/AddRecordModal";
import { AddFormModal } from "@/components/records/AddFormModal";
import { EditFrequencyModal } from "@/components/records/EditFrequencyModal";
import { StateScreen } from "@/components/ui/StateScreen";
import { QMSRecord, formatTimeAgo } from "@/lib/googleSheets";
import type { DriveFile } from "@/lib/driveService";
import { MODULE_CONFIG } from "@/config/modules";

const moduleConfig = MODULE_CONFIG;
const GROUPS_PER_PAGE = 10;

export default function ModulePage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAddRecordModalOpen, setIsAddRecordModalOpen] = useState(false);
  const [isAddFormModalOpen, setIsAddFormModalOpen] = useState(false);
  const [editingFreqRecord, setEditingFreqRecord] = useState<QMSRecord | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [groupPage, setGroupPage] = useState(1);

  const toggleGroup = (code: string) => {
    setExpandedGroups(prev => ({ ...prev, [code]: !prev[code] }));
  };

  const { data: records, isLoading, error, dataUpdatedAt } = useQMSData();

  const module = moduleId ? moduleConfig[moduleId] : null;

  // Filter records for this module
  const filteredRecords = useMemo(() => {
    if (!records || !module) return [];

    return records.filter(record => {
      const category = record.category.toLowerCase();
      return module.categoryPatterns.some(pattern =>
        category.includes(pattern.toLowerCase())
      );
    });
  }, [records, module]);

  // Flatten all files from all records in this module for direct display
  const moduleFiles = useMemo(() => {
    if (!filteredRecords) return [];

    // Sort all files across all forms by creation date
    const allFiles: unknown[] = [];
    filteredRecords.forEach(record => {
      (record.files || []).forEach(file => {
        allFiles.push({
          ...file,
          parentRecord: record
        });
      });
    });

    return allFiles.sort((a, b) =>
      new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime()
    );
  }, [filteredRecords]);

  // Group flattened files by their parent form code
  const groupedModuleFiles = useMemo(() => {
    const groups: Record<string, { record: QMSRecord, files: unknown[] }> = {};

    moduleFiles.forEach((file: unknown) => {
      const code = file.parentRecord.code;
      if (!groups[code]) {
        groups[code] = {
          record: file.parentRecord,
          files: []
        };
      }
      groups[code].files.push(file);
    });

    return groups;
  }, [moduleFiles]);

  // Pagination
  const totalGroupPages = Math.ceil(filteredRecords.length / GROUPS_PER_PAGE);
  const pagedRecords = filteredRecords.slice((groupPage - 1) * GROUPS_PER_PAGE, groupPage * GROUPS_PER_PAGE);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["qms-data"] });
  };


  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
    : null;

  if (!module) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Module Not Found</h1>
          <p className="text-muted-foreground mb-4">The requested module does not exist.</p>
          <Button onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const Icon = module.icon;

  return (
    <AppShell breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: module.name }]}>
      <div className="space-y-5">
            {/* Page Header */}
            <div className="flex items-start justify-between animate-fade-in">
              <div className="flex items-start gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/")}
                  className="mt-1"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-12 h-12 rounded-sm glass-card flex items-center justify-center shadow-lg shadow-accent/10">
                      <Icon className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-foreground tracking-tight font-heading">{module.name}</h1>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] opacity-60">{module.isoClause}</span>
                        {lastUpdated && (
                          <span className="text-[10px] text-muted-foreground/40 font-mono tracking-tighter uppercase whitespace-nowrap">• SYNCED {lastUpdated}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-muted-foreground mt-2">{module.description}</p>
                  {lastUpdated && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Last synced: {lastUpdated}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Connection Error</AlertTitle>
                <AlertDescription>
                  Failed to fetch data from Google Sheets: {error.message}
                </AlertDescription>
              </Alert>
            )}

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="glass-card rounded-sm p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-sm bg-muted/50 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-foreground/60" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground font-heading">{filteredRecords.length}</p>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Templates</p>
                </div>
              </div>

              {(() => {
                const stats = filteredRecords.reduce((acc, record) => {
                  const files = record.files || [];
                  const reviews = record.fileReviews || {};

                  acc.totalFiles += files.length;
                  files.forEach(file => {
                    const review = reviews[file.id] || { status: 'pending_review' };
                    if (review.status === 'approved') acc.approvedCount++;
                    else acc.pendingCount++;
                  });
                  return acc;
                }, { totalFiles: 0, pendingCount: 0, approvedCount: 0 });

                return (
                  <>
                    <div className="glass-card rounded-sm p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-sm bg-success/10 flex items-center justify-center">
                        <ClipboardCheck className="w-5 h-5 text-success" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-success font-heading">{stats.totalFiles}</p>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Filled</p>
                      </div>
                    </div>
                    <div className="glass-card rounded-sm p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-sm bg-warning/10 flex items-center justify-center">
                        <Settings className="w-5 h-5 text-warning" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-warning font-heading">{stats.pendingCount}</p>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Pending</p>
                      </div>
                    </div>
                    <div className="glass-card rounded-sm p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-sm bg-info/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-info" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-info font-heading">{stats.approvedCount}</p>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Approved</p>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Paired Layout: Templates + Records synchronized in rows */}
            <div className="space-y-12">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold text-foreground">Documentation & Records Alignment</h2>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => setIsAddFormModalOpen(true)}
                  >
                    <Settings className="w-4 h-4" />
                    Add Form
                  </Button>
                  <Button
                    size="sm"
                    className="bg-success hover:bg-success/90 gap-2"
                    onClick={() => setIsAddRecordModalOpen(true)}
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    New Record
                  </Button>
                </div>
              </div>

              {isLoading ? (
                <StateScreen state="loading" title="Loading module data" />
              ) : filteredRecords.length === 0 ? (
                <StateScreen state="empty" title="No templates found" message="No templates or records found for this module." />
              ) : (
                <div className="space-y-12">
                  {pagedRecords.map((record) => {
                    const group = groupedModuleFiles[record.code] || { record, files: [] };
                    const hasFiles = group.files.length > 0;
                    const isExpanded = !!expandedGroups[record.code];

                    return (
                      <div key={record.code} className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start animate-fade-in group/row">
                        {/* Left: Form Template Card */}
                        <div className="ds-card rounded-sm p-6 group border-l-4 border-l-primary/30 hover:border-l-primary relative h-full flex flex-col ">
                          <div className="flex items-start justify-between mb-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-col gap-2 mb-2">
                                <span className="inline-flex items-center justify-center bg-primary text-primary-foreground font-mono font-black text-sm md:text-base px-3 py-1 rounded-sm shadow-sm self-start tracking-wider">
                                  {record.code}
                                </span>
                                <h3 className="font-black text-xl md:text-2xl text-foreground leading-tight line-clamp-2">{record.recordName}</h3>
                              </div>
                              <p className="text-sm text-foreground/80 leading-relaxed line-clamp-2">{record.description}</p>
                            </div>
                            {hasFiles && (
                              <div className="ml-2 px-3 py-1.5 rounded-sm bg-primary/10 text-primary text-xs font-bold border border-primary/20 shrink-0 shadow-sm mt-1">
                                {group.files.length} Records
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4 py-3 border-t border-border/50 flex-1">
                            <div>
                              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">When to Fill</p>
                              <p className="text-xs font-medium">{record.whenToFill || "As needed"}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Activity Status</p>
                              <div className="flex flex-col gap-1">
                                {record.isOverdue ? (
                                  <span className="text-xs font-bold text-destructive flex items-center gap-1 animate-pulse">
                                    <AlertCircle className="w-3 h-3" />
                                    Overdue
                                  </span>
                                ) : record.daysUntilNextFill !== undefined ? (
                                  <span className="text-xs font-bold text-success">
                                    {record.daysUntilNextFill} days remaining
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">Ready</span>
                                )}
                                <div className="flex items-center gap-1.5 pt-0.5">
                                  <div className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    hasFiles ? "bg-success animate-pulse" : "bg-muted"
                                  )} />
                                  <p className="text-[10px] text-muted-foreground font-medium">
                                    Last: <span className={cn(
                                      "font-bold",
                                      hasFiles ? "text-foreground" : "italic"
                                    )}>
                                      {record.lastFileDate ? formatTimeAgo(record.lastFileDate) : "Never"}
                                    </span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 pt-4 mt-auto border-t border-border/10">
                            <Button size="sm" className="flex-1 gap-2" onClick={() => window.open(record.templateLink, '_blank', 'noopener,noreferrer')}>
                              <FileText className="w-4 h-4" />
                              Open Template
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="gap-2"
                              onClick={() => setEditingFreqRecord(record)}
                            >
                              <RefreshCw className="w-4 h-4" />
                              Settings
                            </Button>
                          </div>
                        </div>

                        {/* Right: Corresponding Records Group */}
                        <div className="relative h-full">
                          {hasFiles ? (
                            <div className="ds-card rounded-sm overflow-hidden transition-colors h-full flex flex-col">
                              <div
                                className="flex items-center gap-3 p-5 cursor-pointer hover:bg-muted/50 transition-colors bg-muted/5 border-b border-border/50"
                                onClick={() => toggleGroup(record.code)}
                              >
                                <div className="w-10 h-10 rounded-sm bg-success/10 flex items-center justify-center">
                                  <ClipboardCheck className="w-5 h-5 text-success" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2.5 mb-1">
                                    <span className="text-xs md:text-sm font-mono font-black bg-success text-success-foreground px-2 py-0.5 rounded shadow-sm shrink-0">{record.code}</span>
                                    <h3 className="font-bold text-lg text-foreground truncate">{record.recordName}</h3>
                                  </div>
                                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">View Collected Evidence</p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-xs font-bold text-success bg-success/5 px-2 py-1 rounded-sm border border-success/10">
                                    {group.files.length} {group.files.length !== 1 ? 'Files' : 'File'}
                                  </div>
                                  {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                                </div>
                              </div>

                              {isExpanded ? (
                                <div className="p-4 space-y-3 bg-muted/5 flex-1 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="space-y-3">
                                      <RecordBrowser
                                        record={{
                                          ...record,
                                          files: group.files as DriveFile[]
                                        }}
                                        isFlat
                                      />
                                    </div>
                                </div>
                              ) : (
                                <div className="p-12 flex flex-col items-center justify-center text-center space-y-4 flex-1">
                                  <div className="w-16 h-16 rounded-sm bg-success/5 flex items-center justify-center border border-success/10">
                                    <ClipboardCheck className="w-8 h-8 text-success" />
                                  </div>
                                  <div>
                                    <p className="text-base font-bold text-foreground">{group.files.length} Records Available</p>
                                    <p className="text-xs text-muted-foreground mt-1">Ready for audit review and verification</p>
                                  </div>
                                  <Button variant="outline" size="sm" className="gap-2" onClick={() => toggleGroup(record.code)}>
                                    <FolderOpen className="w-4 h-4" />
                                    View Records
                                  </Button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="ds-card rounded-sm flex flex-col items-center justify-center p-8 text-center bg-muted/5 border-dashed">
                              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-muted/60 to-muted/30 flex items-center justify-center mb-4 animate-pulse">
                                <Inbox className="w-8 h-8 text-muted-foreground/30" />
                              </div>
                              <p className="text-sm font-semibold text-muted-foreground/80">No records filled yet</p>
                              <p className="text-[10px] text-muted-foreground/40 mt-1 uppercase tracking-wider">Awaiting first submission</p>
                              <div className="flex gap-2 mt-4">
                                {record.folderLink && !record.folderLink.includes("No Files Yet") && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-2"
                                    onClick={() => window.open(record.folderLink, '_blank', 'noopener,noreferrer')}
                                  >
                                    <FolderOpen className="w-3 h-3" />
                                    Open Folder
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-2"
                                  onClick={() => setIsAddRecordModalOpen(true)}
                                >
                                  <Settings className="w-3 h-3" />
                                  Add First Record
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Pagination */}
                  {totalGroupPages > 1 && (
                    <div className="flex items-center justify-center gap-3 pt-6 border-t border-border/40">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        disabled={groupPage === 1}
                        onClick={() => setGroupPage(p => p - 1)}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </Button>
                      <span className="text-xs text-muted-foreground font-mono px-3">
                        Page {groupPage} of {totalGroupPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        disabled={groupPage === totalGroupPages}
                        onClick={() => setGroupPage(p => p + 1)}
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <AddRecordModal
              isOpen={isAddRecordModalOpen}
              onClose={() => setIsAddRecordModalOpen(false)}
              templates={filteredRecords}
              onSuccess={handleRefresh}
            />

            <AddFormModal
              isOpen={isAddFormModalOpen}
              onClose={() => setIsAddFormModalOpen(false)}
              onSuccess={handleRefresh}
              category={module.name}
            />

            {editingFreqRecord && (
              <EditFrequencyModal
                isOpen={!!editingFreqRecord}
                onClose={() => setEditingFreqRecord(null)}
                record={editingFreqRecord}
              />
            )}
      </div>
    </AppShell>
  );
}
