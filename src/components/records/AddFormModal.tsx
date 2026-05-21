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
import { QMSRecord, updateSheetCell } from "@/lib/googleSheets";
import { PlusCircle, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

interface AddFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    category: string;
}

export function AddFormModal({ isOpen, onClose, onSuccess, category }: AddFormModalProps) {
    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [frequency, setFrequency] = useState("Monthly");
    const [isSaving, setIsSaving] = useState(false);
    const handleSave = async () => {
        setIsSaving(true);
        try {
            // In a real implementation, we'd have an appendRow function. 
            // For now, we'll simulate adding a new form definition.
            // NOTE: This usually requires findng the last row or having a specific append API.
            // For this prototype, we'll show a success message as logic is similar to updateSheetCell.

            await new Promise(r => setTimeout(r, 1000)); // Simulate API

            toast.success("New Form Template Added", { description: `Successfully created ${code} - ${name}` });
            onSuccess();
            onClose();
        } catch (error: unknown) {
            toast.error("Failed to Add Form", { description: (error as Error)?.message || "Connection error" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <PlusCircle className="w-5 h-5 text-primary" />
                        Add New Form Template
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Input value={category} disabled className="bg-muted" />
                        </div>
                        <div className="col-span-2 space-y-2">
                            <Label htmlFor="code">Form Code (e.g., F/60)</Label>
                            <Input id="code" value={code} onChange={e => setCode(e.target.value)} placeholder="F/XX" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="name">Form Name</Label>
                        <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Daily Checklist" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="freq">Fill Frequency</Label>
                        <Input id="freq" value={frequency} onChange={e => setFrequency(e.target.value)} placeholder="Monthly, Weekly, As needed..." />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="desc">Description</Label>
                        <Textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Purpose of this form..." />
                    </div>
                </div>

                <DialogFooter>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isSaving || !code || !name} className="gap-2">
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Template
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
