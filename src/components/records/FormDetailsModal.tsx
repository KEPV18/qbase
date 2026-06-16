import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, FileText, User, Folder, ExternalLink } from "lucide-react";
import { QMSRecord, getModuleForCategory } from "@/lib/googleSheets";
import { formatDistanceToNow } from "date-fns";

interface FormDetailsModalProps {
  record: QMSRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewInDrive?: () => void;
}

export function FormDetailsModal({ record, open, onOpenChange, onViewInDrive }: FormDetailsModalProps) {
  if (!record) return null;

  const getStatusColor = () => {
    if (record.isOverdue) return "destructive";
    if (record.daysUntilNextFill && record.daysUntilNextFill <= 7) return "secondary"; // was warning
    return "outline"; // was success
  };

  const getStatusText = () => {
    if (record.isOverdue) return "Overdue";
    if (record.daysUntilNextFill && record.daysUntilNextFill <= 7) return "Due Soon";
    return "On Track";
  };

  const formatLastFilled = () => {
    if (!record.lastFileDate || record.lastFileDate === "No records") return "Never filled";
    try {
      return formatDistanceToNow(new Date(record.lastFileDate), { addSuffix: true });
    } catch {
      return record.lastFileDate;
    }
  };

  const getDepartment = () => {
    return getModuleForCategory(record.category);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Form Details
          </DialogTitle>
          <DialogDescription>
            Complete information about this form and its usage
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Form Code</label>
              <div className="text-lg font-semibold">{record.code}</div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <Badge variant={getStatusColor()}>{getStatusText()}</Badge>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Form Name</label>
            <div className="text-lg font-semibold">{record.recordName}</div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Description</label>
            <div className="text-sm">{record.description}</div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                When to Fill
              </label>
              <div className="text-sm">{record.whenToFill}</div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <User className="w-4 h-4" />
                Department
              </label>
              <div className="text-sm">{getDepartment()}</div>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <FileText className="w-4 h-4" />
                Total Records
              </label>
              <div className="text-2xl font-bold text-success">
                {record.actualRecordCount || 0}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Last Filled
              </label>
              <div className="text-sm">
                {formatLastFilled()}
              </div>
            </div>
          </div>

          {/* Next Serial Info */}
          {record.nextSerial && record.nextSerial !== "N/A" && (
            <div className="bg-muted/50 rounded-sm p-4">
              <label className="text-sm font-medium text-muted-foreground">Next Serial Number</label>
              <div className="text-lg font-mono font-semibold">{record.nextSerial}</div>
            </div>
          )}

          {/* Review Info */}
          {(record.isAtomic
            ? (record.fileStatus === 'approved' || record.fileStatus === 'rejected')
            : record.reviewed) && (
              <div className="bg-success/10 rounded-sm p-4">
                <label className="text-sm font-medium text-success">Review Status</label>
                <div className="text-sm text-success">
                  Reviewed by {record.isAtomic ? record.fileReviewedBy : record.reviewedBy}
                  {record.reviewDate ? ` on ${record.reviewDate}` : ''}
                </div>
              </div>
            )}

          {/* No Records Message */}
          {(!record.actualRecordCount || record.actualRecordCount === 0) && (
            <div className="bg-warning/10 rounded-sm p-4 text-center">
              <Folder className="w-8 h-8 text-warning mx-auto mb-2" />
              <div className="text-sm text-warning">No records found for this form yet</div>
              <div className="text-xs text-warning/70 mt-1">
                This form hasn't been filled yet. Click "View in Drive" to access the template.
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={onViewInDrive} className="gap-2 bg-accent hover:bg-accent/90 text-white">
            <ExternalLink className="w-4 h-4" />
            (Open Record)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}