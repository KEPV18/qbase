import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { QMSRecord, RecordStatus, updateSheetCell } from "@/lib/googleSheets";
import { getAllProjects } from "@/data/projectsData";
import { Settings, Loader2, Save, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface EditMetadataModalProps {
    isOpen: boolean;
    onClose: () => void;
    record: QMSRecord;
    fileId: string;
    fileName: string;
    onSuccess: () => void;
}

export function EditMetadataModal({ isOpen, onClose, record, fileId, fileName, onSuccess }: EditMetadataModalProps) {
    const currentReview = record.fileReviews?.[fileId] || {
        status: 'pending_review',
        comment: '',
        reviewedBy: '',
        reviewDate: new Date().toISOString().split('T')[0]
    };

    const [status, setStatus] = useState<RecordStatus>(currentReview.status as RecordStatus);
    const [comment, setComment] = useState(currentReview.comment || "");
    const [reviewedBy, setReviewedBy] = useState(currentReview.reviewedBy || "");
    const [reviewDate, setReviewDate] = useState(currentReview.reviewDate || new Date().toISOString().split('T')[0]);
    
    // New Metadata state
    const [identifiedErrors, setIdentifiedErrors] = useState(currentReview.identifiedErrors || "");
    const [errorsFixed, setErrorsFixed] = useState(currentReview.errorsFixed || false);
    const [project, setProject] = useState(currentReview.project || "");
    const [targetMonth, setTargetMonth] = useState(currentReview.targetMonth || "");
    const [targetYear, setTargetYear] = useState(currentReview.targetYear || "");

    const [isSaving, setIsSaving] = useState(false);
    const PROJECTS = [
        "General / All Company",
        ...getAllProjects().map(p => p.name)
    ];
    
    const MONTHS = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
    const currentYearNum = new Date().getFullYear();
    const YEARS = Array.from({ length: 6 }, (_, i) => (currentYearNum - 1 + i).toString());

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updatedReviews = { ...record.fileReviews };
            updatedReviews[fileId] = {
                ...currentReview,
                status,
                comment,
                reviewedBy,
                reviewDate,
                project,
                targetMonth,
                targetYear,
                identifiedErrors,
                errorsFixed
            };

            // Column P is index 15, which is 'P'
            const success = await updateSheetCell(
                record.rowIndex,
                'P',
                JSON.stringify(updatedReviews)
            );

            if (success) {
                toast.success("Metadata Updated", { description: `Successfully updated audit details for ${fileName}` });
                onSuccess();
                onClose();
            }
        } catch (error: unknown) {
            toast.error("Update Failed", { description: (error as Error).message || "Could not save changes to Google Sheets" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5 text-primary" />
                        Edit Record Metadata
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground mt-1 truncate font-mono bg-muted px-2 py-1 rounded">
                        {fileName}
                    </p>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="status">Audit Status</Label>
                            <Select value={status} onValueChange={(val) => setStatus(val as RecordStatus)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending_review">Pending Review</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="rejected">Issue Found</SelectItem>
                                    <SelectItem value="draft">Draft</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="date">Review Date</Label>
                            <Input
                                type="date"
                                value={reviewDate}
                                onChange={(e) => setReviewDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="reviewer">Reviewed By</Label>
                        <Input
                            placeholder="Enter name..."
                            value={reviewedBy}
                            onChange={(e) => setReviewedBy(e.target.value)}
                        />
                    </div>

                    {/* New Metadata Fields */}
                    <div className="pt-2 border-t border-border mt-4 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Project Assignment</Label>
                            <Select value={project} onValueChange={setProject}>
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PROJECTS.map(p => (
                                        <SelectItem key={p} value={p}>{p}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Target Month</Label>
                                <Select value={targetMonth} onValueChange={setTargetMonth}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {MONTHS.map(m => (
                                            <SelectItem key={m} value={m}>Month {m}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Target Year</Label>
                                <Select value={targetYear} onValueChange={setTargetYear}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {YEARS.map(y => (
                                            <SelectItem key={y} value={y}>{y}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="comment">Audit Notes / Comments</Label>
                        <Textarea
                            placeholder="Optional notes about the review..."
                            className="resize-none h-24"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                        />
                    </div>

                    {(status === 'rejected' || identifiedErrors) && (
                        <div className="space-y-4 pt-4 border-t border-border mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="identifiedErrors" className="text-destructive font-bold flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    Identified Errors
                                </Label>
                                <Textarea 
                                    id="identifiedErrors"
                                    placeholder="List specific errors found in the file..."
                                    className="resize-none h-20 bg-destructive/5 border-destructive/20"
                                    value={identifiedErrors}
                                    onChange={(e) => setIdentifiedErrors(e.target.value)}
                                />
                            </div>
                            {identifiedErrors && (
                                <div className="flex items-center space-x-2 bg-muted/30 p-3 rounded-sm border border-border">
                                    <Checkbox 
                                        id="errorsFixed" 
                                        checked={errorsFixed}
                                        onCheckedChange={(checked) => setErrorsFixed(checked as boolean)}
                                    />
                                    <div className="grid gap-1.5 leading-none">
                                        <label
                                            htmlFor="errorsFixed"
                                            className="text-sm font-medium leading-none cursor-pointer"
                                        >
                                            Errors have been fixed
                                        </label>
                                        <p className="text-[10px] text-muted-foreground leading-snug">
                                            Check this when the errors have been resolved. Remember to update the Audit Status above to Approved or Pending.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0 sm:justify-between items-center w-full">
                    <div className="text-xs text-destructive font-semibold flex-1">
                        {(status === 'approved' || status === 'rejected') && (!project || !targetMonth || !targetYear || !reviewedBy.trim()) && (
                            "Please complete all metadata fields (Project, Month, Year, Reviewer) before approval."
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button 
                            onClick={handleSave} 
                            disabled={isSaving || ((status === 'approved' || status === 'rejected') && (!project || !targetMonth || !targetYear || !reviewedBy.trim()))} 
                            className="gap-2"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
