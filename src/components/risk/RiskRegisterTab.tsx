import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Loader2, RefreshCw, Search, X, Download, Plus, Link2, ExternalLink, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useRiskData } from "@/hooks/useRiskData";
import { useCAPAData } from "@/hooks/useCAPAData";
import type { Risk, RiskUpdate } from "@/lib/riskRegisterService";
import { getRiskLevel, getRiskLevelColor } from "@/lib/riskRegisterService";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export function RiskRegisterTab() {
    const { risks, isLoading, isError, error, refetch, updateRisk, isUpdating, addRisk, isAdding: isAddingRisk } = useRiskData();
    const { capas, addCAPA, isAdding: isAddingCAPA } = useCAPAData();
    const navigate = useNavigate();
    const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [isAddOpen, setIsAddOpen] = useState(false);

    // Create CAPA from Risk dialog
    const [isCreateCAPAOpen, setIsCreateCAPAOpen] = useState(false);
    const [capaSourceRisk, setCAPASourceRisk] = useState<Risk | null>(null);
    const [newCAPAData, setNewCAPAData] = useState({
        type: "Corrective" as "Corrective" | "Preventive",
        description: "",
        rootCauseAnalysis: "",
        correctiveAction: "",
        preventiveAction: "",
        responsiblePerson: "",
        targetCompletionDate: "",
    });

    // Link existing CAPA dialog
    const [isLinkCAPAOpen, setIsLinkCAPAOpen] = useState(false);
    const [linkSourceRisk, setLinkSourceRisk] = useState<Risk | null>(null);
    const [selectedCAPAId, setSelectedCAPAId] = useState("");

    const filteredRisks = useMemo(() => {
        let result = risks;
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(r =>
                r.riskId.toLowerCase().includes(q) ||
                r.riskDescription.toLowerCase().includes(q) ||
                r.processDepartment.toLowerCase().includes(q) ||
                r.owner.toLowerCase().includes(q)
            );
        }
        if (statusFilter !== "all") {
            result = result.filter(r => r.status === statusFilter);
        }
        return result;
    }, [risks, search, statusFilter]);

    const unlinkedCAPAs = useMemo(() => {
        return capas.filter(c => !c.relatedRisk || c.relatedRisk.trim() === "");
    }, [capas]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Controlled": return "default";
            case "Open": return "destructive";
            case "Under Review": return "secondary";
            case "Closed": return "outline";
            default: return "outline";
        }
    };

    const getLinkedCAPAStatus = (linkedCAPA: string) => {
        if (!linkedCAPA) return null;
        const capa = capas.find(c => c.capaId === linkedCAPA);
        return capa;
    };

    const handleEditClick = (risk: Risk) => {
        setEditingRisk({ ...risk });
        setIsEditOpen(true);
    };

    const handleSave = () => {
        if (!editingRisk) return;
        const updates: RiskUpdate = {
            processDepartment: editingRisk.processDepartment,
            riskDescription: editingRisk.riskDescription,
            cause: editingRisk.cause,
            likelihood: editingRisk.likelihood,
            impact: editingRisk.impact,
            actionControl: editingRisk.actionControl,
            owner: editingRisk.owner,
            status: editingRisk.status,
            reviewDate: editingRisk.reviewDate,
            linkedCAPA: editingRisk.linkedCAPA,
        };
        updateRisk({ riskId: editingRisk.riskId, updates });
        setIsEditOpen(false);
        setEditingRisk(null);
    };

    const handleAddRisk = () => {
        if (!editingRisk) return;
        addRisk({
            processDepartment: editingRisk.processDepartment || "",
            riskDescription: editingRisk.riskDescription || "",
            cause: editingRisk.cause || "",
            likelihood: editingRisk.likelihood || 1,
            impact: editingRisk.impact || 1,
            actionControl: editingRisk.actionControl || "",
            owner: editingRisk.owner || "",
        });
        setIsAddOpen(false);
        setEditingRisk(null);
    };

    const handleCreateCAPAForRisk = (risk: Risk) => {
        setCAPASourceRisk(risk);
        setNewCAPAData({
            type: "Corrective",
            description: `CAPA for Risk: ${risk.riskDescription}`,
            rootCauseAnalysis: risk.cause || "",
            correctiveAction: risk.actionControl || "",
            preventiveAction: "",
            responsiblePerson: risk.owner || "",
            targetCompletionDate: "",
        });
        setIsCreateCAPAOpen(true);
    };

    const handleSubmitCreateCAPA = () => {
        if (!capaSourceRisk) return;
        addCAPA({
            sourceOfCAPA: "Risk Register",
            type: newCAPAData.type,
            description: newCAPAData.description,
            reference: capaSourceRisk.riskId,
            rootCauseAnalysis: newCAPAData.rootCauseAnalysis,
            correctiveAction: newCAPAData.correctiveAction,
            preventiveAction: newCAPAData.preventiveAction,
            responsiblePerson: newCAPAData.responsiblePerson,
            targetCompletionDate: newCAPAData.targetCompletionDate,
            relatedRisk: capaSourceRisk.riskId,
        }, {
            onSuccess: (newCAPA) => {
                // Update risk with linked CAPA
                updateRisk({
                    riskId: capaSourceRisk.riskId,
                    updates: { linkedCAPA: newCAPA.capaId },
                });
                setIsCreateCAPAOpen(false);
                setCAPASourceRisk(null);
            }
        });
    };

    const handleLinkCAPAToRisk = (risk: Risk) => {
        setLinkSourceRisk(risk);
        setSelectedCAPAId("");
        setIsLinkCAPAOpen(true);
    };

    const handleSubmitLinkCAPA = () => {
        if (!linkSourceRisk || !selectedCAPAId) return;
        updateRisk({
            riskId: linkSourceRisk.riskId,
            updates: { linkedCAPA: selectedCAPAId },
        });
        setIsLinkCAPAOpen(false);
        setLinkSourceRisk(null);
    };

    const handleExportCSV = () => {
        const headers = ["Risk ID", "Department", "Description", "Cause", "L", "I", "Score", "Level", "Action", "Owner", "Status", "Linked CAPA"];
        const rows = filteredRisks.map(r => [
            r.riskId, r.processDepartment, r.riskDescription, r.cause,
            r.likelihood, r.impact, r.riskScore, getRiskLevel(r.riskScore),
            r.actionControl, r.owner, r.status, r.linkedCAPA
        ]);
        const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `risk-register-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const navigateToCAPA = (capaId: string) => {
        navigate(`/risk-management?tab=capa`);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-medium">Loading Risk Register...</span>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="text-center py-20 space-y-4">
                <p className="text-destructive font-medium">Failed to load Risk Register</p>
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
                        placeholder="Search risks..."
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
                    <SelectTrigger className="w-full sm:w-[150px] h-9 text-sm bg-background border-border/50">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="Open">Open</SelectItem>
                        <SelectItem value="Under Review">Under Review</SelectItem>
                        <SelectItem value="Controlled">Controlled</SelectItem>
                        <SelectItem value="Closed">Closed</SelectItem>
                    </SelectContent>
                </Select>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={handleExportCSV} disabled={filteredRisks.length === 0}>
                        <Download className="w-3.5 h-3.5" /> CSV
                    </Button>
                    <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => refetch()}>
                        <RefreshCw className="w-3.5 h-3.5" /> Sync
                    </Button>
                    <Button size="sm" className="h-9 gap-1.5 bg-primary" onClick={() => { setEditingRisk({ riskId: "", processDepartment: "", riskDescription: "", cause: "", likelihood: 3, impact: 3, actionControl: "", owner: "", status: "Open", reviewDate: "", linkedCAPA: "", rowIndex: 0 }); setIsAddOpen(true); }}>
                        <Plus className="w-3.5 h-3.5" /> Add Risk
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-sm border border-border/50 bg-card overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30 border-b border-border/50">
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3 w-[90px]">ID</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3">Dept</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3 max-w-[200px]">Description</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3 text-center w-[80px]">Score</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3 hidden lg:table-cell">Action</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3">Owner</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3 w-[100px]">Status</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3 hidden md:table-cell w-[150px]">CAPA</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3 w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredRisks.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground text-sm">
                                    {search || statusFilter !== "all" ? "No risks match your filters." : "No risks found."}
                                </TableCell>
                            </TableRow>
                        ) : filteredRisks.map((risk) => {
                            const linkedCapa = getLinkedCAPAStatus(risk.linkedCAPA);
                            return (
                                <TableRow key={risk.riskId} className="hover:bg-muted/20 transition-colors border-b border-border/30">
                                    <TableCell className="font-bold text-xs font-mono">{risk.riskId}</TableCell>
                                    <TableCell className="text-xs font-medium">{risk.processDepartment}</TableCell>
                                    <TableCell className="max-w-[200px]">
                                        <div className="text-xs font-semibold truncate" title={risk.riskDescription}>{risk.riskDescription}</div>
                                        <div className="text-[10px] text-muted-foreground truncate mt-0.5" title={risk.cause}>{risk.cause}</div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="outline" className={cn("font-bold text-[10px]", getRiskLevelColor(risk.riskScore))}>
                                            {risk.riskScore}
                                        </Badge>
                                        <div className="text-[8px] text-muted-foreground mt-0.5">{risk.likelihood}×{risk.impact}</div>
                                    </TableCell>
                                    <TableCell className="text-[10px] text-muted-foreground truncate max-w-[130px] hidden lg:table-cell" title={risk.actionControl}>{risk.actionControl || "—"}</TableCell>
                                    <TableCell className="text-xs font-medium">{risk.owner}</TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusColor(risk.status)} className="font-bold uppercase tracking-wider text-[8px]">{risk.status}</Badge>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        {linkedCapa ? (
                                            <button
                                                onClick={() => navigateToCAPA(linkedCapa.capaId)}
                                                className="flex items-center gap-1 group"
                                            >
                                                <span className="text-[10px] font-mono font-bold text-primary group-hover:underline">{linkedCapa.capaId}</span>
                                                <Badge variant="outline" className={cn("text-[7px] font-bold", getCAPABadgeColor(linkedCapa.status))}>
                                                    {linkedCapa.status}
                                                </Badge>
                                                <ExternalLink className="w-2.5 h-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </button>
                                        ) : (
                                            <span className="text-[10px] text-muted-foreground">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-0.5">
                                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-primary" onClick={() => handleEditClick(risk)} title="Edit Risk">
                                                <Pencil className="w-3 h-3" />
                                            </Button>
                                            {!risk.linkedCAPA && (
                                                <>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-green-600" onClick={() => handleCreateCAPAForRisk(risk)} title="Create CAPA">
                                                        <Plus className="w-3 h-3" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-blue-600" onClick={() => handleLinkCAPAToRisk(risk)} title="Link existing CAPA">
                                                        <Link2 className="w-3 h-3" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
                {filteredRisks.length > 0 && (
                    <div className="px-4 py-2 border-t border-border bg-muted/20 text-[10px] text-muted-foreground">
                        {search || statusFilter !== "all" ? `${filteredRisks.length} of ${risks.length} risks` : `${risks.length} risks total`}
                    </div>
                )}
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="font-bold text-xl">Edit Risk {editingRisk?.riskId}</DialogTitle>
                    </DialogHeader>
                    {editingRisk && (
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Risk ID</Label>
                                    <Input value={editingRisk.riskId} disabled className="bg-muted/30" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Department</Label>
                                    <Input value={editingRisk.processDepartment} onChange={(e) => setEditingRisk({ ...editingRisk, processDepartment: e.target.value })} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Description</Label>
                                <Textarea value={editingRisk.riskDescription} onChange={(e) => setEditingRisk({ ...editingRisk, riskDescription: e.target.value })} className="min-h-[80px]" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cause</Label>
                                <Textarea value={editingRisk.cause} onChange={(e) => setEditingRisk({ ...editingRisk, cause: e.target.value })} className="min-h-[60px]" />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Likelihood (1-5)</Label>
                                    <Input type="number" min="1" max="5" value={editingRisk.likelihood} onChange={(e) => setEditingRisk({ ...editingRisk, likelihood: parseInt(e.target.value) || 1 })} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Impact (1-5)</Label>
                                    <Input type="number" min="1" max="5" value={editingRisk.impact} onChange={(e) => setEditingRisk({ ...editingRisk, impact: parseInt(e.target.value) || 1 })} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Score</Label>
                                    <div className="flex h-10 w-full rounded-md border border-input bg-muted/20 px-3 py-2 text-sm font-bold text-primary">
                                        {editingRisk.likelihood * editingRisk.impact}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Action / Control</Label>
                                <Textarea value={editingRisk.actionControl} onChange={(e) => setEditingRisk({ ...editingRisk, actionControl: e.target.value })} className="min-h-[80px]" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Owner</Label>
                                    <Input value={editingRisk.owner} onChange={(e) => setEditingRisk({ ...editingRisk, owner: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</Label>
                                    <Select value={editingRisk.status} onValueChange={(val: string) => setEditingRisk({ ...editingRisk, status: val })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Open">Open</SelectItem>
                                            <SelectItem value="Under Review">Under Review</SelectItem>
                                            <SelectItem value="Controlled">Controlled</SelectItem>
                                            <SelectItem value="Closed">Closed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Review Date</Label>
                                    <Input value={editingRisk.reviewDate} onChange={(e) => setEditingRisk({ ...editingRisk, reviewDate: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Linked CAPA</Label>
                                    <Select
                                        value={editingRisk.linkedCAPA || "none"}
                                        onValueChange={(val) => setEditingRisk({ ...editingRisk, linkedCAPA: val === "none" ? "" : val })}
                                    >
                                        <SelectTrigger><SelectValue placeholder="Select CAPA..." /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">— None —</SelectItem>
                                            {capas.map(c => (
                                                <SelectItem key={c.capaId} value={c.capaId}>
                                                    {c.capaId} — {c.description?.substring(0, 40)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {editingRisk.linkedCAPA && (() => {
                                        const lc = capas.find(c => c.capaId === editingRisk.linkedCAPA);
                                        return lc ? (
                                            <div className="text-[10px] text-muted-foreground mt-1 p-2 rounded bg-muted/30 border border-border/30">
                                                <span className="font-bold">{lc.capaId}</span> — Status: <Badge variant="outline" className={cn("text-[7px]", getCAPABadgeColor(lc.status))}>{lc.status}</Badge>
                                            </div>
                                        ) : null;
                                    })()}
                                </div>
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

            {/* Create CAPA from Risk Dialog */}
            <Dialog open={isCreateCAPAOpen} onOpenChange={setIsCreateCAPAOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="font-bold text-xl flex items-center gap-2">
                            <Plus className="w-5 h-5 text-green-600" />
                            Create CAPA for {capaSourceRisk?.riskId}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            This will create a new CAPA linked to risk <span className="font-bold">{capaSourceRisk?.riskId}</span> and automatically update both records.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {/* Risk summary */}
                        <div className="p-3 rounded-sm bg-muted/30 border border-border/30 space-y-1">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Source Risk</div>
                            <div className="text-sm font-semibold">{capaSourceRisk?.riskDescription}</div>
                            <div className="text-xs text-muted-foreground">Cause: {capaSourceRisk?.cause}</div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Type</Label>
                            <Select value={newCAPAData.type} onValueChange={(val: string) => setNewCAPAData({ ...newCAPAData, type: val })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Corrective">Corrective</SelectItem>
                                    <SelectItem value="Preventive">Preventive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Description</Label>
                            <Textarea value={newCAPAData.description} onChange={(e) => setNewCAPAData({ ...newCAPAData, description: e.target.value })} className="min-h-[60px]" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                Root Cause Analysis <span className="text-destructive">*</span>
                            </Label>
                            <Textarea value={newCAPAData.rootCauseAnalysis} onChange={(e) => setNewCAPAData({ ...newCAPAData, rootCauseAnalysis: e.target.value })} className="min-h-[60px]" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Corrective Action</Label>
                                <Textarea value={newCAPAData.correctiveAction} onChange={(e) => setNewCAPAData({ ...newCAPAData, correctiveAction: e.target.value })} className="min-h-[60px]" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Preventive Action</Label>
                                <Textarea value={newCAPAData.preventiveAction} onChange={(e) => setNewCAPAData({ ...newCAPAData, preventiveAction: e.target.value })} className="min-h-[60px]" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Responsible Person</Label>
                                <Input value={newCAPAData.responsiblePerson} onChange={(e) => setNewCAPAData({ ...newCAPAData, responsiblePerson: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                    Target Date <span className="text-destructive">*</span>
                                </Label>
                                <Input type="date" value={newCAPAData.targetCompletionDate} onChange={(e) => setNewCAPAData({ ...newCAPAData, targetCompletionDate: e.target.value })} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsCreateCAPAOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleSubmitCreateCAPA}
                            disabled={isAddingCAPA || !newCAPAData.rootCauseAnalysis || !newCAPAData.targetCompletionDate}
                            className="gap-2"
                        >
                            {isAddingCAPA && <Loader2 className="w-4 h-4 animate-spin" />}
                            Create CAPA & Link
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Link Existing CAPA Dialog */}
            <Dialog open={isLinkCAPAOpen} onOpenChange={setIsLinkCAPAOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-bold text-lg flex items-center gap-2">
                            <Link2 className="w-5 h-5 text-blue-600" />
                            Link CAPA to {linkSourceRisk?.riskId}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Select an existing CAPA to link to this risk. Both records will be updated.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Select CAPA</Label>
                            <Select value={selectedCAPAId} onValueChange={setSelectedCAPAId}>
                                <SelectTrigger><SelectValue placeholder="Choose CAPA..." /></SelectTrigger>
                                <SelectContent>
                                    {capas.map(c => (
                                        <SelectItem key={c.capaId} value={c.capaId}>
                                            {c.capaId} — {c.status} — {c.description?.substring(0, 30)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {selectedCAPAId && (() => {
                            const sc = capas.find(c => c.capaId === selectedCAPAId);
                            return sc ? (
                                <div className="p-3 rounded-sm bg-muted/30 border border-border/30 space-y-1 text-xs">
                                    <div className="font-bold">{sc.capaId}</div>
                                    <div className="text-muted-foreground">{sc.description}</div>
                                    <div className="flex gap-2 mt-1">
                                        <Badge variant="outline" className={cn("text-[7px]", getCAPABadgeColor(sc.status))}>{sc.status}</Badge>
                                        <Badge variant="outline" className="text-[7px]">{sc.type}</Badge>
                                    </div>
                                </div>
                            ) : null;
                        })()}
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsLinkCAPAOpen(false)}>Cancel</Button>
                        <Button
                            onClick={() => {
                                if (!linkSourceRisk || !selectedCAPAId) return;
                                updateRisk({
                                    riskId: linkSourceRisk.riskId,
                                    updates: { linkedCAPA: selectedCAPAId },
                                });
                                setIsLinkCAPAOpen(false);
                                setLinkSourceRisk(null);
                            }}
                            disabled={!selectedCAPAId || isUpdating}
                            className="gap-2"
                        >
                            {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                            Link CAPA
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add New Risk Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-bold text-lg flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-primary" />
                            Add New Risk
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Create a new risk entry in the register
                        </DialogDescription>
                    </DialogHeader>
                    
                    {editingRisk && (
                    <div className="space-y-3 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Risk ID</Label>
                                <Input 
                                    disabled
                                    placeholder="Auto-generated" 
                                    value="Auto-generated on Save"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Department</Label>
                                <Input 
                                    placeholder="Quality" 
                                    value={editingRisk.processDepartment || ''}
                                    onChange={(e) => setEditingRisk({...editingRisk, processDepartment: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Risk Description</Label>
                            <Textarea 
                                placeholder="Describe the risk..." 
                                value={editingRisk.riskDescription || ''}
                                onChange={(e) => setEditingRisk({...editingRisk, riskDescription: e.target.value})}
                                rows={3}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Likelihood (1-5)</Label>
                                <Input 
                                    type="number" 
                                    min="1" max="5"
                                    placeholder="3"
                                    value={editingRisk.likelihood || ''}
                                    onChange={(e) => setEditingRisk({...editingRisk, likelihood: parseInt(e.target.value) || 0})}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Impact (1-5)</Label>
                                <Input 
                                    type="number" 
                                    min="1" max="5"
                                    placeholder="3"
                                    value={editingRisk.impact || ''}
                                    onChange={(e) => setEditingRisk({...editingRisk, impact: parseInt(e.target.value) || 0})}
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Cause / Mitigation</Label>
                            <Textarea 
                                placeholder="Describe the cause or action..." 
                                value={editingRisk.cause || ''}
                                onChange={(e) => setEditingRisk({...editingRisk, cause: e.target.value})}
                                rows={2}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Owner</Label>
                            <Input 
                                placeholder="Manager name"
                                value={editingRisk.owner || ''}
                                onChange={(e) => setEditingRisk({...editingRisk, owner: e.target.value})}
                            />
                        </div>
                    </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                        <Button 
                            disabled={isAddingRisk}
                            onClick={() => {
                                handleAddRisk();
                            }}
                        >
                            {isAddingRisk && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            Save Risk
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function getCAPABadgeColor(status: string): string {
    switch (status) {
        case "Open": return "text-red-600 bg-red-100";
        case "In Progress": return "text-blue-600 bg-blue-100";
        case "Under Verification": return "text-yellow-600 bg-yellow-100";
        case "Closed": return "text-green-600 bg-green-100";
        default: return "";
    }
}
