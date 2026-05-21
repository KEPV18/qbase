import { useState, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  AlertTriangle,
  Loader2,
  ChevronRight,
  Save,
  MessageSquare,
  FileText,
  ExternalLink,
  CheckCircle,
  Clock,
  FolderOpen,
  Eye
} from "lucide-react";
import { QMSRecord, RecordStatus } from "@/lib/googleSheets";
import { useUpdateRecord, useDeleteRecord } from "@/hooks/useQMSData";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { FormDetailsModal } from "./FormDetailsModal";
import { EditMetadataModal } from "./EditMetadataModal";

interface RecordsTableProps {
  records: QMSRecord[];
  isLoading?: boolean;
  variant?: "default" | "compact";
  onApproveRecord?: (record: QMSRecord) => Promise<void>;
}

function getAuditStatusBadge(status: string) {
  const lower = status.toLowerCase();

  if (lower.includes("approved") || lower.includes("compliant") || lower.includes("✅")) {
    return { label: "Compliant", variant: "success" as const, icon: CheckCircle };
  }
  return { label: "Pending", variant: "warning" as const, icon: Clock };
}

import { RecordCard } from "./RecordCard";

export function RecordsTable({ records, isLoading = false, variant = "default", onApproveRecord }: RecordsTableProps) {
  const navigate = useNavigate();
  const updateRecord = useUpdateRecord();
  const deleteRecord = useDeleteRecord();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [updatingRows, setUpdatingRows] = useState<Record<string, boolean>>({});
  const [editingFileRecord, setEditingFileRecord] = useState<QMSRecord | null>(null);

  const handleUpdateStatus = async (record: QMSRecord, status: RecordStatus) => {
    const key = record.isAtomic ? `file-${record.fileId || record.rowIndex}` : `${record.rowIndex}-audit`;
    setUpdatingRows(prev => ({ ...prev, [key]: true }));

    try {
      const { updateRecordStatus } = await import("@/lib/statusService");
      const success = await updateRecordStatus(record, status, user?.name || "User");
      if (success) {
        toast.success("Status Updated", { description: `Record marked as ${status}.` });
        queryClient.invalidateQueries({ queryKey: ["qms-data"] });
      } else {
        throw new Error("Update failed");
      }
    } catch (err: unknown) {
      toast.error("Update Failed", { description: (err as Error)?.message || "Google Sheets rejected the write operation." });
    } finally {
      setUpdatingRows(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleDelete = async (rowIndex: number) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      await deleteRecord.mutateAsync(rowIndex);
      toast.success("Record Deleted");
      queryClient.invalidateQueries({ queryKey: ["qms-data"] });
    } catch (error: unknown) {
      toast.error("Delete Failed", { description: (error as Error)?.message });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-card rounded-sm border border-border/50 p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24 rounded-sm" />
                <Skeleton className="h-6 w-48" />
              </div>
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <Skeleton className="h-10 w-full rounded-sm" />
          </div>
        ))}
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="p-20 text-center flex flex-col items-center justify-center">
        <div className="w-20 h-20 rounded-sm bg-muted/30 flex items-center justify-center mb-6">
          <FileText className="w-10 h-10 text-muted-foreground/50" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">No Records Found</h3>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          There are no records in this category that match your current search and filters.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("container mx-auto", variant === "compact" ? "p-2 sm:p-4" : "p-6")}>
      <div className={cn(
        "grid gap-4",
        variant === "compact"
          ? "grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 w-full"
          : records[0]?.isAtomic
            ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3 w-full"
            : "grid-cols-1 max-w-4xl mx-auto gap-6"
      )}>
        {records.map((record: QMSRecord) => (
          <RecordCard
            key={record.isAtomic ? `file-${record.fileId || record.rowIndex}` : `${record.code}-${record.rowIndex}`}
            record={record}
            onViewDetails={(r) => {
              if (r.isAtomic && r.fileId) {
                setEditingFileRecord(r);
              } else {
                navigate(`/module/${r.category.toLowerCase().replace(/\s+/g, '-')}`);
              }
            }}
            onDeleteFile={async (fileId, rowIndex) => {
              if (!fileId) return;
              if (!window.confirm("Delete this file from Drive? (Will remove from folder)")) return;
              try {
                const { permanentlyDeleteDriveFile } = await import("@/lib/driveService");
                await permanentlyDeleteDriveFile(fileId);
                toast.success("File Deleted", { description: "File removed from Drive" });
                queryClient.invalidateQueries({ queryKey: ["qms-data"] });
              } catch (err: unknown) {
                toast.error("Delete Failed", { description: (err as Error)?.message });
              }
            }}
            onDeleteRecord={handleDelete}
            onUpdateStatus={handleUpdateStatus}
            onApproveRecord={onApproveRecord}
            isUpdating={updatingRows[record.isAtomic ? `file-${record.fileId || record.rowIndex}` : `${record.rowIndex}-audit`]}
            variant={variant}
          />
        ))}
      </div>

      {editingFileRecord && (
        <EditMetadataModal
          isOpen={!!editingFileRecord}
          onClose={() => setEditingFileRecord(null)}
          record={editingFileRecord}
          fileId={editingFileRecord.fileId}
          fileName={editingFileRecord.fileName}
          onSuccess={() => {
            setEditingFileRecord(null);
            queryClient.invalidateQueries({ queryKey: ["qms-data"] });
          }}
        />
      )}
    </div>
  );
}
