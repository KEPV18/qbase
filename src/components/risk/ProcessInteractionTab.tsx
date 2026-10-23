import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Loader2, RefreshCw } from "lucide-react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProcessData } from "@/hooks/useProcessData";
import type { ProcessInteraction, ProcessUpdate } from "@/lib/processInteractionService";
import { StateScreen } from "@/components/ui/StateScreen";

export function ProcessInteractionTab() {
    const { processes, isLoading, isError, error, refetch, updateProcess, isUpdating } = useProcessData();
    const [editingProcess, setEditingProcess] = useState<ProcessInteraction | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);

    const handleEditClick = (process: ProcessInteraction) => {
        setEditingProcess({ ...process });
        setIsEditOpen(true);
    };

    const handleSave = () => {
        if (!editingProcess) return;
        const updates: ProcessUpdate = {
            processOwner: editingProcess.processOwner,
            inputs: editingProcess.inputs,
            mainActivities: editingProcess.mainActivities,
            outputs: editingProcess.outputs,
            receiver: editingProcess.receiver,
            kpi: editingProcess.kpi,
        };
        updateProcess({ processName: editingProcess.processName, updates });
        setIsEditOpen(false);
        setEditingProcess(null);
    };

    if (isLoading) {
        return <StateScreen state="loading" title="Loading Process Map…" />;
    }

    if (isError) {
        return (
            <StateScreen
                state="error"
                title="Failed to load Process Map"
                message={(error as Error)?.message}
                action={{ label: "Retry", onClick: () => refetch() }}
            />
        );
    }

    return (
        <div>
            {/* The band is the panel's header.  It used to carry its own
                `rounded-sm` frame, a `bg-muted/20` fill, and a blurred
                blue blob in the corner — decoration doing the work a
                title and a hairline should do. */}
            <div className="flex justify-between items-center gap-3 px-5 py-4 border-b border-border">
                <div>
                    <h3 className="font-bold text-base font-display tracking-[-0.01em] text-foreground">Process Interaction Sheet</h3>
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-0.5">
                        Live data from Supabase • <span className="tabular-nums">{processes.length}</span> processes
                    </p>
                </div>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()}>
                    <RefreshCw className="w-4 h-4" /> Refresh
                </Button>
            </div>

            {/* Table — the panel surface.  The old `rounded-sm border
                border-border/50 bg-card` frame was a second border drawn
                inside the tab's panel, so the surface read as a card
                nested in a card. */}
            <div>
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30 border-b border-border/50">
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4 w-[180px]">Process Name</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4">Owner</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4">Inputs</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4">Activities</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4">Outputs (Records)</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4">Receiver</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4">KPI</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4 w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {processes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-16 text-muted-foreground text-sm">
                                    No processes found in the Process Interaction Sheet.
                                </TableCell>
                            </TableRow>
                        ) : processes.map((proc) => (
                            <TableRow key={proc.processName} className="align-top hover:bg-primary/5 transition-colors border-b border-border/10">
                                <TableCell className="font-bold font-display align-top text-sm">{proc.processName}</TableCell>
                                <TableCell className="align-top text-xs font-medium">{proc.processOwner}</TableCell>
                                <TableCell className="whitespace-pre-wrap text-[11px] align-top text-muted-foreground leading-[1.85]">{proc.inputs}</TableCell>
                                <TableCell className="whitespace-pre-wrap text-[11px] align-top text-muted-foreground leading-[1.85]">{proc.mainActivities}</TableCell>
                                <TableCell className="whitespace-pre-wrap text-[11px] align-top text-primary-tint font-mono leading-[1.85]">{proc.outputs}</TableCell>
                                <TableCell className="whitespace-pre-wrap text-[11px] align-top text-muted-foreground leading-[1.85]">{proc.receiver}</TableCell>
                                <TableCell className="whitespace-pre-wrap text-[11px] align-top font-bold text-ink-2 leading-[1.85] italic">{proc.kpi}</TableCell>
                                <TableCell className="align-top p-2">
                                    <Button variant="ghost" className="ds-box-44 hover:text-primary-tint transition-colors" onClick={() => handleEditClick(proc)} title="Edit process">
                                        <Pencil className="w-3.5 h-3.5" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="font-display font-bold text-2xl">Edit Process: {editingProcess?.processName}</DialogTitle>
                    </DialogHeader>
                    {editingProcess && (
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Process Name</Label>
                                    <Input value={editingProcess.processName} disabled className="bg-muted/30" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Owner</Label>
                                    <Input value={editingProcess.processOwner} onChange={(e) => setEditingProcess({ ...editingProcess, processOwner: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Inputs</Label>
                                    <Textarea value={editingProcess.inputs} onChange={(e) => setEditingProcess({ ...editingProcess, inputs: e.target.value })} className="min-h-[100px]" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Activities</Label>
                                    <Textarea value={editingProcess.mainActivities} onChange={(e) => setEditingProcess({ ...editingProcess, mainActivities: e.target.value })} className="min-h-[100px]" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Outputs (Records)</Label>
                                    <Textarea value={editingProcess.outputs} onChange={(e) => setEditingProcess({ ...editingProcess, outputs: e.target.value })} className="min-h-[100px]" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Receiver</Label>
                                    <Textarea value={editingProcess.receiver} onChange={(e) => setEditingProcess({ ...editingProcess, receiver: e.target.value })} className="min-h-[100px]" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">KPIs</Label>
                                <Textarea value={editingProcess.kpi} onChange={(e) => setEditingProcess({ ...editingProcess, kpi: e.target.value })} className="min-h-[80px]" />
                            </div>
                        </div>
                    )}
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isUpdating} className="gap-2">
                            {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
