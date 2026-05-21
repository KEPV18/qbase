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
        return (
            <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-medium">Loading Process Map from Google Sheets...</span>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="text-center py-20 space-y-4">
                <p className="text-destructive font-medium">Failed to load Process Map</p>
                <p className="text-xs text-muted-foreground">{(error as Error)?.message}</p>
                <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
                    <RefreshCw className="w-4 h-4" /> Retry
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center p-6 rounded-sm bg-muted/20 border-border/50 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full blur-2xl" />
                <div className="relative z-10">
                    <h3 className="font-bold text-xl font-heading text-foreground">Process Interaction Sheet</h3>
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] opacity-60">
                        Live data from Google Sheets • {processes.length} processes
                    </p>
                </div>
                <Button variant="outline" size="sm" className="gap-2 relative z-10" onClick={() => refetch()}>
                    <RefreshCw className="w-4 h-4" /> Refresh
                </Button>
            </div>

            <div className="rounded-sm border border-border/50 bg-card overflow-hidden shadow-xl">
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
                                <TableCell className="font-bold font-heading align-top text-sm">{proc.processName}</TableCell>
                                <TableCell className="align-top text-xs font-medium">{proc.processOwner}</TableCell>
                                <TableCell className="whitespace-pre-wrap text-[11px] align-top text-muted-foreground leading-relaxed">{proc.inputs}</TableCell>
                                <TableCell className="whitespace-pre-wrap text-[11px] align-top text-muted-foreground leading-relaxed">{proc.mainActivities}</TableCell>
                                <TableCell className="whitespace-pre-wrap text-[11px] align-top text-primary/80 font-mono leading-relaxed">{proc.outputs}</TableCell>
                                <TableCell className="whitespace-pre-wrap text-[11px] align-top text-muted-foreground leading-relaxed">{proc.receiver}</TableCell>
                                <TableCell className="whitespace-pre-wrap text-[11px] align-top font-bold text-foreground/70 leading-relaxed italic">{proc.kpi}</TableCell>
                                <TableCell className="align-top">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary transition-colors" onClick={() => handleEditClick(proc)}>
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
                        <DialogTitle className="font-heading font-bold text-2xl">Edit Process: {editingProcess?.processName}</DialogTitle>
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
