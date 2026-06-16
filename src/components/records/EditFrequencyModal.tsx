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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { QMSRecord, updateSheetCell } from "@/lib/googleSheets";
import { Loader2, Calendar, Save } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface EditFrequencyModalProps {
    record: QMSRecord | null;
    isOpen: boolean;
    onClose: () => void;
}

const FREQUENCY_OPTIONS = [
    { label: "Daily", value: "Daily" },
    { label: "Weekly", value: "Weekly" },
    { label: "Bi-Weekly", value: "Bi-Weekly" },
    { label: "Monthly", value: "Monthly" },
    { label: "Quarterly", value: "Quarterly" },
    { label: "Semi-Annually", value: "Semi-Annually" },
    { label: "Annually", value: "Annually" },
    { label: "Event-based (When needed)", value: "When needed" },
];

export function EditFrequencyModal({ record, isOpen, onClose }: EditFrequencyModalProps) {
    const [frequency, setFrequency] = useState<string>(record?.whenToFill || "");
    const [isSaving, setIsSaving] = useState(false);
    const queryClient = useQueryClient();

    // Reset local state when record changes
    useState(() => {
        if (record) setFrequency(record.whenToFill || "");
    });

    const handleSave = async () => {
        if (!record) return;

        setIsSaving(true);
        try {
            // Column E is "When to Fill" (Frequency)
            await updateSheetCell(record.rowIndex, "E", frequency);

            toast.success("Frequency Updated", { description: `Successfully changed frequency for ${record.code} to ${frequency}.` });

            queryClient.invalidateQueries({ queryKey: ["qms-data"] });
            onClose();
        } catch (error: unknown) {
            toast.error("Update Failed", { description: (error as Error)?.message || "Could not update frequency in Google Sheets." });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        Edit Fill Frequency
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="p-3 bg-muted/30 rounded-sm border border-border/50">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Form Code</p>
                        <p className="text-sm font-semibold">{record?.code} - {record?.recordName}</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="frequency">Select Frequency</Label>
                        <Select value={frequency} onValueChange={setFrequency}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Choose a frequency..." />
                            </SelectTrigger>
                            <SelectContent>
                                {FREQUENCY_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground mt-2 italic">
                            * This will update the compliance logic for this form and recalculate the "Days Remaining" badge.
                        </p>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || folderIncluded(record?.whenToFill, frequency)}
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
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function folderIncluded(val1, val2) {
    return val1 === val2;
}
