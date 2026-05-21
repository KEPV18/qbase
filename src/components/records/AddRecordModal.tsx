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
import { copyDriveFile } from "@/lib/driveService";
import { Loader2, FilePlus, ExternalLink, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface AddRecordModalProps {
    isOpen: boolean;
    onClose: () => void;
    templates: QMSRecord[];
    onSuccess: () => void;
}

export function AddRecordModal({ isOpen, onClose, templates, onSuccess }: AddRecordModalProps) {
    const [selectedCode, setSelectedCode] = useState<string>("");
    const [isCreating, setIsCreating] = useState(false);
    const [createdFile, setCreatedFile] = useState<{ name: string; link: string } | null>(null);
    // New Metadata state
    const now = new Date();
    const [selectedProject, setSelectedProject] = useState<string>("General / All Company");
    const [selectedMonth, setSelectedMonth] = useState<string>((now.getMonth() + 1).toString());
    const [selectedYear, setSelectedYear] = useState<string>(now.getFullYear().toString());

    const PROJECTS = [
        "General / All Company",
        "Omniaz Project - Mapping",
        "Omniaz Project - Annotation",
        "Video Detection Project",
        "Vocal AI Project",
        "Tennis Project",
        "ETH Project"
    ];
    
    // Generate months 1-12
    const MONTHS = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
    
    // Generate years from current year to +5 years
    const currentYear = now.getFullYear();
    const YEARS = Array.from({ length: 6 }, (_, i) => (currentYear - 1 + i).toString());

    const selectedTemplate = templates.find(t => t.code === selectedCode);

    const calculateNextSerial = (template: QMSRecord) => {
        if (template.nextSerial) return template.nextSerial;

        // Fallback logic if nextSerial isn't in sheet
        const lastSerial = template.lastSerial || `${template.code}-000`;
        const match = lastSerial.match(/(\d+)$/);
        if (!match) return `${template.code}-001`;

        const num = parseInt(match[1]) + 1;
        return `${template.code}-${num.toString().padStart(3, '0')}`;
    };

    const handleCreate = async () => {
        if (!selectedTemplate) return;

        setIsCreating(true);
        try {
            const nextSerial = calculateNextSerial(selectedTemplate);
            const newName = nextSerial;

            const result = await copyDriveFile(
                selectedTemplate.templateLink,
                selectedTemplate.folderLink,
                newName
            );

            if (result) {
                // Save the custom metadata instantly
                try {
                    const newReviews = { ...(selectedTemplate.fileReviews || {}) };
                    newReviews[result.id] = {
                        status: 'pending_review',
                        comment: '',
                        project: selectedProject,
                        targetMonth: selectedMonth,
                        targetYear: selectedYear,
                        reviewDate: new Date().toISOString()
                    };
                    await updateSheetCell(selectedTemplate.rowIndex, 'P', JSON.stringify(newReviews));
                } catch (e) {
                    console.error("Error");
                    // It's not a fatal error if metadata save fails, the file is still generated
                }

                setCreatedFile({ name: result.name, link: result.webViewLink });
                toast.success("Record Created Successfully", { description: `Generated ${newName}` });
            }
        } catch (error: unknown) {
            toast.error("Creation Failed", { description: (error as Error)?.message || "An unexpected error occurred" });
        } finally {
            setIsCreating(false);
        }
    };

    const handleReset = () => {
        setSelectedCode("");
        setCreatedFile(null);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleReset}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FilePlus className="w-5 h-5 text-primary" />
                        Create New Record
                    </DialogTitle>
                </DialogHeader>

                {!createdFile ? (
                    <div className="space-y-6 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="template">Select Form Template</Label>
                            <Select value={selectedCode} onValueChange={setSelectedCode}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Choose a form..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {templates.map((t) => (
                                        <SelectItem key={t.code} value={t.code}>
                                            <span className="font-mono text-xs mr-2 text-primary">{t.code}</span>
                                            {t.recordName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedTemplate && (
                            <div className="space-y-4">
                                <div className="p-4 bg-muted/30 rounded-sm border border-border/50">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Target Folder</p>
                                            <p className="text-xs font-semibold truncate">Module Folder</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Next Serial</p>
                                            <p className="text-xs font-bold text-primary">{calculateNextSerial(selectedTemplate)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Metadata Fields */}
                                <div className="space-y-3 pt-2">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">Assigned Project</Label>
                                        <Select value={selectedProject} onValueChange={setSelectedProject}>
                                            <SelectTrigger className="w-full h-8 text-xs">
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
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground">Target Month</Label>
                                            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                                                <SelectTrigger className="w-full h-8 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {MONTHS.map(m => (
                                                        <SelectItem key={m} value={m}>Month {m}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground">Target Year</Label>
                                            <Select value={selectedYear} onValueChange={setSelectedYear}>
                                                <SelectTrigger className="w-full h-8 text-xs">
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
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="py-8 text-center space-y-4">
                        <div className="w-16 h-16 bg-success/10 text-success rounded-sm flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-10 h-10" />
                        </div>
                        <h3 className="font-bold text-xl">System Ready</h3>
                        <p className="text-muted-foreground text-sm">
                            The record <span className="text-foreground font-semibold">{createdFile.name}</span> has been generated and is ready for data entry.
                        </p>
                        <Button
                            className="w-full gap-2"
                            onClick={() => {
                                window.open(createdFile.link, '_blank', 'noopener,noreferrer');
                                handleReset();
                                onSuccess();
                            }}
                        >
                            <ExternalLink className="w-4 h-4" />
                            Open & Fill Record
                        </Button>
                    </div>
                )}

                {!createdFile && (
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={handleReset}>Cancel</Button>
                        <Button
                            onClick={handleCreate}
                            disabled={!selectedCode || isCreating}
                            className="gap-2"
                        >
                            {isCreating ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <FilePlus className="w-4 h-4" />
                                    Generate Record
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}
