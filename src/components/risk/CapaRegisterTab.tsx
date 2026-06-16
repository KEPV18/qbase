import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Loader2, RefreshCw, Search, X, Download, AlertTriangle, ExternalLink, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useCAPAData } from "@/hooks/useCAPAData";
import { useRiskData } from "@/hooks/useRiskData";
import type { CAPA, CAPAUpdate } from "@/lib/capaRegisterService";
import { getCAPAStatusColor } from "@/lib/capaRegisterService";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export function CapaRegisterTab() {
    const { capas, isLoading, isError, error, refetch, updateCAPA, isUpdating } = useCAPAData();
    const { risks, updateRisk } = useRiskData();
    const navigate = useNavigate();
    const [editingCapa, setEditingCapa] = useState<CAPA | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    // Close CAPA confirmation
    const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);
    const [closingCapa, setClosingCapa] = useState<CAPA | null>(null);

    const filteredCapas = useMemo(() => {
        let result = capas;
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(c =>
                c.capaId.toLowerCase().includes(q) ||
                c.description.toLowerCase().includes(q) ||
                c.responsiblePerson.toLowerCase().includes(q) ||
                c.relatedRisk.toLowerCase().includes(q)
            );
        }
        if (statusFilter !== "all") {
            result = result.filter(c => c.status === statusFilter);
        }
        return result;
    }, [capas, search, statusFilter]);

    const isOverdue = (capa: CAPA) => {
        if (capa.status === "Closed") return false;
        if (!capa.targetCompletionDate) return false;
        return new Date(capa.targetCompletionDate) < new Date();
    };

    const getLinkedRisk = (relatedRisk: string) => {
        if (!relatedRisk) return null;
        return risks.find(r => r.riskId === relatedRisk);
    };

    const handleEditClick = (capa: CAPA) => {
        setEditingCapa({ ...capa });
        setIsEditOpen(true);
    };

    const handleSave = () => {
        if (!editingCapa) return;

        // If closing, show confirmation dialog
        const originalCapa = capas.find(c => c.capaId === editingCapa.capaId);
        if (editingCapa.status === "Closed" && originalCapa?.status !== "Closed") {
            if (!editingCapa.rootCauseAnalysis) {
                alert("Cannot close CAPA without Root Cause Analysis.");
                return;
            }
            if (!editingCapa.effectivenessCheck) {
                alert("Cannot close CAPA without Effectiveness Check.");
                return;
            }
            if (!editingCapa.closureApproval) {
                alert("Cannot close CAPA without Closure Approval.");
                return;
            }
            // Show confirmation if there's a linked risk
            if (editingCapa.relatedRisk) {
                setClosingCapa(editingCapa);
                setIsCloseConfirmOpen(true);
                return;
            }
        }

        submitCAPAUpdate(editingCapa);
    };

    const submitCAPAUpdate = (capa: CAPA, updateLinkedRisk: boolean = false) => {
        const updates: CAPAUpdate = {
            sourceOfCAPA: capa.sourceOfCAPA,
            type: capa.type,
            description: capa.description,
            reference: capa.reference,
            rootCauseAnalysis: capa.rootCauseAnalysis,
            correctiveAction: capa.correctiveAction,
            preventiveAction: capa.preventiveAction,
            responsiblePerson: capa.responsiblePerson,
            targetCompletionDate: capa.targetCompletionDate,
            status: capa.status,
            effectivenessCheck: capa.effectivenessCheck,
            effectivenessReviewDate: capa.effectivenessReviewDate,
            closureApproval: capa.closureApproval,
            relatedRisk: capa.relatedRisk,
        };
        updateCAPA({ capaId: capa.capaId, updates });

        // If closing and linked risk, update the risk status to "Controlled"
        if (updateLinkedRisk && capa.status === "Closed" && capa.relatedRisk) {
            const linkedRisk = risks.find(r => r.riskId === capa.relatedRisk);
            if (linkedRisk && linkedRisk.status !== "Closed") {
                updateRisk({
                    riskId: linkedRisk.riskId,
                    updates: {
                        status: "Controlled",
                        reviewDate: new Date().toISOString().split("T")[0],
                    },
                });
            }
        }

        setIsEditOpen(false);
        setEditingCapa(null);
    };

    const handleExportCSV = () => {
        const headers = ["CAPA ID", "Type", "Description", "Root Cause", "CA", "PA", "Responsible", "Target Date", "Status", "Effectiveness", "Related Risk"];
        const rows = filteredCapas.map(c => [
            c.capaId, c.type, c.description, c.rootCauseAnalysis,
            c.correctiveAction, c.preventiveAction, c.responsiblePerson,
            c.targetCompletionDate, c.status, c.effectivenessCheck, c.relatedRisk,
        ]);
        const csv = [headers, ...rows].map(r => r.map(c => `"${String(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `capa-register-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-medium">Loading CAPA Register...</span>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="text-center py-20 space-y-4">
                <p className="text-destructive font-medium">Failed to load CAPA Register</p>
                <p className="text-xs text-muted-foreground">{(error as Error)?.message}</p>
                <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
                    <RefreshCw className="w-4 h-4" /> Retry
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                        placeholder="Search CAPAs..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-9 text-sm bg-background border-border/50"
                    />
                    {search && (
                        <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[170px] h-9 text-sm bg-background border-border/50">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="Open">Open</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Under Verification">Under Verification</SelectItem>
                        <SelectItem value="Closed">Closed</SelectItem>
                    </SelectContent>
                </Select>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={handleExportCSV} disabled={filteredCapas.length === 0}>
                        <Download className="w-3.5 h-3.5" /> CSV
                    </Button>
                    <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => refetch()}>
                        <RefreshCw className="w-3.5 h-3.5" /> Sync
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-sm border border-border/50 bg-card overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30 border-b border-border/50">
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3 w-[110px]">CAPA ID</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3 w-[70px]">Type</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3 max-w-[220px]">Description</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3 hidden lg:table-cell max-w-[180px]">Actions</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3">Responsible</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3 w-[90px]">Target</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3 w-[110px]">Status</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3 hidden md:table-cell w-[120px]">Risk</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3 w-[40px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredCapas.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground text-sm">
                                    {search || statusFilter !== "all" ? "No CAPAs match your filters." : "No CAPA records found."}
                                </TableCell>
                            </TableRow>
                        ) : filteredCapas.map((capa) => {
                            const linkedRisk = getLinkedRisk(capa.relatedRisk);
                            return (
                                <TableRow
                                    key={capa.capaId}
                                    className={cn(
                                        "hover:bg-muted/20 transition-colors border-b border-border/30",
                                        isOverdue(capa) && "bg-destructive/5"
                                    )}
                                >
                                    <TableCell className="font-bold text-xs font-mono">
                                        <div className="flex items-center gap-1.5">
                                            {capa.capaId}
                                            {isOverdue(capa) && <AlertTriangle className="w-3 h-3 text-destructive" />}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={capa.type === "Corrective" ? "destructive" : "secondary"} className="text-[8px] font-bold uppercase">
                                            {capa.type === "Corrective" ? "CA" : "PA"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="max-w-[220px]">
                                        <div className="text-xs font-semibold truncate">{capa.description}</div>
                                        {capa.rootCauseAnalysis && (
                                            <div className="text-[10px] text-muted-foreground truncate mt-0.5">RC: {capa.rootCauseAnalysis}</div>
                                        )}
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell max-w-[180px]">
                                        {capa.correctiveAction && <div className="text-[10px] text-muted-foreground truncate"><span className="font-bold text-foreground">CA:</span> {capa.correctiveAction}</div>}
                                        {capa.preventiveAction && <div className="text-[10px] text-muted-foreground truncate mt-0.5"><span className="font-bold text-foreground">PA:</span> {capa.preventiveAction}</div>}
                                    </TableCell>
                                    <TableCell className="text-xs font-medium">{capa.responsiblePerson}</TableCell>
                                    <TableCell className={cn("text-xs font-medium", isOverdue(capa) ? "text-destructive" : "text-muted-foreground")}>
                                        {capa.targetCompletionDate || "—"}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn("font-bold uppercase tracking-wider text-[8px]", getCAPAStatusColor(capa.status))}>
                                            {capa.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        {linkedRisk ? (
                                            <button
                                                onClick={() => navigate(`/risk-management?tab=risk`)}
                                                className="flex items-center gap-1 group"
                                            >
                                                <span className="text-[10px] font-mono font-bold text-primary group-hover:underline">{linkedRisk.riskId}</span>
                                                <Badge variant="outline" className={cn("text-[7px] font-bold", getRiskBadgeColor(linkedRisk.status))}>
                                                    {linkedRisk.status}
                                                </Badge>
                                                <ExternalLink className="w-2.5 h-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </button>
                                        ) : capa.relatedRisk ? (
                                            <span className="text-[10px] font-mono text-muted-foreground">{capa.relatedRisk}</span>
                                        ) : (
                                            <span className="text-[10px] text-muted-foreground">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-primary" onClick={() => handleEditClick(capa)}>
                                            <Pencil className="w-3 h-3" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
                {filteredCapas.length > 0 && (
                    <div className="px-4 py-2 border-t border-border bg-muted/20 text-[10px] text-muted-foreground">
                        {search || statusFilter !== "all" ? `${filteredCapas.length} of ${capas.length} CAPAs` : `${capas.length} CAPAs total`}
                    </div>
                )}
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="font-bold text-xl">Edit CAPA {editingCapa?.capaId}</DialogTitle>
                    </DialogHeader>
                    {editingCapa && (
                        <div className="grid gap-4 py-4">
                            {/* Closure warning */}
                            {editingCapa.status === "Closed" && (!editingCapa.rootCauseAnalysis || !editingCapa.effectivenessCheck || !editingCapa.closureApproval) && (
                                <div className="p-3 rounded-sm bg-destructive/10 border border-destructive/20 flex gap-2 items-start">
                                    <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                                    <p className="text-xs text-destructive">
                                        Closing requires: Root Cause Analysis, Effectiveness Check, and Closure Approval.
                                    </p>
                                </div>
                            )}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">CAPA ID</Label>
                                    <Input value={editingCapa.capaId} disabled className="bg-muted/30" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Source</Label>
                                    <Input value={editingCapa.sourceOfCAPA} onChange={(e) => setEditingCapa({ ...editingCapa, sourceOfCAPA: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Type</Label>
                                    <Select value={editingCapa.type} onValueChange={(val: string) => setEditingCapa({ ...editingCapa, type: val })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Corrective">Corrective</SelectItem>
                                            <SelectItem value="Preventive">Preventive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Description</Label>
                                <Textarea value={editingCapa.description} onChange={(e) => setEditingCapa({ ...editingCapa, description: e.target.value })} className="min-h-[80px]" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                    Root Cause Analysis <span className="text-destructive">*</span>
                                </Label>
                                <Textarea value={editingCapa.rootCauseAnalysis} onChange={(e) => setEditingCapa({ ...editingCapa, rootCauseAnalysis: e.target.value })} className="min-h-[60px]" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Corrective Action</Label>
                                    <Textarea value={editingCapa.correctiveAction} onChange={(e) => setEditingCapa({ ...editingCapa, correctiveAction: e.target.value })} className="min-h-[60px]" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Preventive Action</Label>
                                    <Textarea value={editingCapa.preventiveAction} onChange={(e) => setEditingCapa({ ...editingCapa, preventiveAction: e.target.value })} className="min-h-[60px]" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Responsible</Label>
                                    <Input value={editingCapa.responsiblePerson} onChange={(e) => setEditingCapa({ ...editingCapa, responsiblePerson: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Target Date</Label>
                                    <Input type="date" value={editingCapa.targetCompletionDate} onChange={(e) => setEditingCapa({ ...editingCapa, targetCompletionDate: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</Label>
                                    <Select value={editingCapa.status} onValueChange={(val: string) => setEditingCapa({ ...editingCapa, status: val })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Open">Open</SelectItem>
                                            <SelectItem value="In Progress">In Progress</SelectItem>
                                            <SelectItem value="Under Verification">Under Verification</SelectItem>
                                            <SelectItem value="Closed">Closed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                        Effectiveness Check <span className="text-destructive">*</span>
                                    </Label>
                                    <Input value={editingCapa.effectivenessCheck} onChange={(e) => setEditingCapa({ ...editingCapa, effectivenessCheck: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Effectiveness Date</Label>
                                    <Input type="date" value={editingCapa.effectivenessReviewDate} onChange={(e) => setEditingCapa({ ...editingCapa, effectivenessReviewDate: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                        Closure Approval <span className="text-destructive">*</span>
                                    </Label>
                                    <Input value={editingCapa.closureApproval} onChange={(e) => setEditingCapa({ ...editingCapa, closureApproval: e.target.value })} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Related Risk</Label>
                                <Select
                                    value={editingCapa.relatedRisk || "none"}
                                    onValueChange={(val) => setEditingCapa({ ...editingCapa, relatedRisk: val === "none" ? "" : val })}
                                >
                                    <SelectTrigger><SelectValue placeholder="Select Risk..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">— None —</SelectItem>
                                        {risks.map(r => (
                                            <SelectItem key={r.riskId} value={r.riskId}>
                                                {r.riskId} — {r.riskDescription?.substring(0, 40)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {editingCapa.relatedRisk && (() => {
                                    const lr = risks.find(r => r.riskId === editingCapa.relatedRisk);
                                    return lr ? (
                                        <div className="text-[10px] text-muted-foreground mt-1 p-2 rounded bg-muted/30 border border-border/30">
                                            <span className="font-bold">{lr.riskId}</span> — {lr.riskDescription?.substring(0, 60)} — Status: <Badge variant="outline" className={cn("text-[7px]", getRiskBadgeColor(lr.status))}>{lr.status}</Badge>
                                        </div>
                                    ) : null;
                                })()}
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

            {/* Close CAPA Confirmation with Risk Update */}
            <Dialog open={isCloseConfirmOpen} onOpenChange={setIsCloseConfirmOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-bold text-lg flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            Close CAPA & Update Risk?
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            This CAPA is linked to <span className="font-bold">{closingCapa?.relatedRisk}</span>. 
                            Would you like to update the linked risk status to "Controlled" as well?
                        </DialogDescription>
                    </DialogHeader>
                    {closingCapa?.relatedRisk && (() => {
                        const lr = risks.find(r => r.riskId === closingCapa.relatedRisk);
                        return lr ? (
                            <div className="p-3 rounded-sm bg-muted/30 border border-border/30 space-y-1 text-xs">
                                <div className="font-bold">{lr.riskId} — {lr.riskDescription}</div>
                                <div className="text-muted-foreground">Current Status: <Badge variant="outline" className={cn("text-[7px]", getRiskBadgeColor(lr.status))}>{lr.status}</Badge></div>
                                <div className="text-muted-foreground mt-1">→ Will be updated to: <Badge variant="outline" className="text-[7px] text-green-600 bg-green-100">Controlled</Badge></div>
                            </div>
                        ) : null;
                    })()}
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => {
                            // Close CAPA without updating risk
                            if (closingCapa) submitCAPAUpdate(closingCapa, false);
                            setIsCloseConfirmOpen(false);
                            setClosingCapa(null);
                        }}>
                            Close CAPA Only
                        </Button>
                        <Button onClick={() => {
                            // Close CAPA and update risk
                            if (closingCapa) submitCAPAUpdate(closingCapa, true);
                            setIsCloseConfirmOpen(false);
                            setClosingCapa(null);
                        }} className="gap-2 bg-green-600 hover:bg-green-700">
                            <CheckCircle2 className="w-4 h-4" />
                            Close CAPA & Update Risk
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function getRiskBadgeColor(status: string): string {
    switch (status) {
        case "Open": return "text-red-600 bg-red-100";
        case "Under Review": return "text-yellow-600 bg-yellow-100";
        case "Controlled": return "text-blue-600 bg-blue-100";
        case "Closed": return "text-green-600 bg-green-100";
        default: return "";
    }
}
