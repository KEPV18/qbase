import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation, useNavigate } from "react-router-dom";
import { lazy, Suspense } from "react";
const RiskRegisterTab = lazy(() => import("@/components/risk/RiskRegisterTab").then(m => ({ default: m.RiskRegisterTab })));
const CapaRegisterTab = lazy(() => import("@/components/risk/CapaRegisterTab").then(m => ({ default: m.CapaRegisterTab })));
const ProcessInteractionTab = lazy(() => import("@/components/risk/ProcessInteractionTab").then(m => ({ default: m.ProcessInteractionTab })));
const RiskHeatMap = lazy(() => import("@/components/risk/RiskHeatMap").then(m => ({ default: m.RiskHeatMap })));
const CAPAEvidenceDashboard = lazy(() => import("@/components/traceability/CAPAEvidenceDashboard"));

import { Shield, AlertTriangle, Activity, ChevronRight, Clock, CheckCircle, FileCheck2 } from "lucide-react";
import { StatsRow } from "@/components/ui/StatsRow";
import { UnifiedPanel } from "@/components/ui/UnifiedPanel";
import { PageHeader } from "@/components/ui/PageHeader";
import { useRiskData } from "@/hooks/useRiskData";
import { useCAPAData } from "@/hooks/useCAPAData";

export default function RiskManagementPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("risk");

    const { risks } = useRiskData();
    const { capas } = useCAPAData();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get("tab");
        if (tab && ["risk", "capa", "process", "capa-evidence"].includes(tab)) {
            setActiveTab(tab);
        }
    }, [location.search]);

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        navigate(`/risk-management?tab=${value}`, { replace: true });
    };

    return (
        <AppShell breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "Risk & Process Management" }]}>
            <div className="space-y-5">
                {/* Header */}
                <PageHeader
                    icon={AlertTriangle}
                    iconClassName="text-destructive-tint"
                    title="Risk & Process Management"
                    description="ISO 9001:2015 Clause 6.1 — Monitor risks, track CAPAs, and visualize processes."
                    badgeVariant="destructive"
                />

                {/* Stats */}
                <StatsRow stats={[
                    { icon: AlertTriangle, value: risks.length, label: "Total Risks", variant: "default" },
                    { icon: AlertTriangle, value: risks.filter(r => r.status === "Open").length, label: "Open Risks", variant: "destructive" },
                    { icon: AlertTriangle, value: risks.filter(r => r.risk_score >= 12).length, label: "High/Critical", variant: "warning" },
                    { icon: Shield, value: capas.filter(c => c.status === "Open" || c.status === "In Progress").length, label: "Active CAPAs" },
                    { icon: Clock, value: capas.filter(c => c.status !== "Closed" && c.target_completion_date && new Date(c.target_completion_date) < new Date()).length, label: "Overdue CAPAs", variant: "warning" },
                    // "Controlled" is the NORMAL state of a risk — greyscale.
                    // The colour in this row is spent on the three counts
                    // that are actually a problem: open, high, overdue.
                    { icon: CheckCircle, value: risks.filter(r => r.status === "Controlled" || r.status === "Closed").length, label: "Controlled" },
                ]} />

                {/* Heat Map - only on risk tab.
                    ONE panel with the disclosure as its header: the summary
                    used to be a hard `rounded-sm` card of its own with the
                    map floating below it outside the frame. */}
                {activeTab === "risk" && risks.length > 0 && (
                    <UnifiedPanel>
                        <details open className="group">
                            <summary className="flex items-center gap-2 cursor-pointer px-5 py-3.5 hover:bg-foreground/[0.03] transition-colors list-none">
                                <ChevronRight className="w-4 h-4 text-muted-foreground group-open:rotate-90 transition-transform" />
                                <span className="text-sm font-bold text-foreground">Risk Heat Map</span>
                                <span className="text-[9px] text-muted-foreground font-mono ml-auto">Click to toggle</span>
                            </summary>
                            <div className="border-t border-border p-4">
                                <Suspense fallback={<div className="h-48 bg-muted/20 animate-pulse rounded-sm" />}><RiskHeatMap risks={risks} /></Suspense>
                            </div>
                        </details>
                    </UnifiedPanel>
                )}

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={handleTabChange}>
                    <TabsList className="grid w-full grid-cols-4 lg:w-[640px] h-10 p-1 bg-muted/40 rounded-sm border border-border/50">
                        <TabsTrigger value="risk" className="gap-1.5 rounded-sm text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Risk Register
                            {risks.length > 0 && <span className="text-[9px] font-mono bg-destructive/10 text-destructive-tint px-1.5 py-0.5 rounded-sm ml-1">{risks.length}</span>}
                        </TabsTrigger>
                        <TabsTrigger value="capa" className="gap-1.5 rounded-sm text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <Shield className="w-3.5 h-3.5" />
                            CAPA Register
                            {capas.length > 0 && <span className="text-[9px] font-mono bg-primary/10 text-primary-tint px-1.5 py-0.5 rounded-sm ml-1">{capas.length}</span>}
                        </TabsTrigger>
                        <TabsTrigger value="process" className="gap-1.5 rounded-sm text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <Activity className="w-3.5 h-3.5" />
                            Process Map
                        </TabsTrigger>
                        <TabsTrigger value="capa-evidence" className="gap-1.5 rounded-sm text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <FileCheck2 className="w-3.5 h-3.5" />
                            CAPA Evidence
                        </TabsTrigger>
                    </TabsList>

                    {/* Each tab body is ONE panel — the register's own table
                        frame was a second border inside a second border, so
                        the surface read as a card nested in a card. */}
                    <TabsContent value="risk" className="mt-4">
                        <UnifiedPanel className="overflow-hidden">
                            <Suspense fallback={<div className="h-48 bg-muted/20 animate-pulse rounded-sm" />}><RiskRegisterTab /></Suspense>
                        </UnifiedPanel>
                    </TabsContent>

                    <TabsContent value="capa" className="mt-4">
                        <UnifiedPanel className="overflow-hidden">
                            <Suspense fallback={<div className="h-48 bg-muted/20 animate-pulse rounded-sm" />}><CapaRegisterTab /></Suspense>
                        </UnifiedPanel>
                    </TabsContent>

                    <TabsContent value="process" className="mt-4">
                        <UnifiedPanel className="overflow-hidden">
                            <Suspense fallback={<div className="h-48 bg-muted/20 animate-pulse rounded-sm" />}><ProcessInteractionTab /></Suspense>
                        </UnifiedPanel>
                    </TabsContent>

                    <TabsContent value="capa-evidence" className="mt-4">
                        <Suspense fallback={<div className="h-48 bg-muted/20 animate-pulse rounded-sm" />}><CAPAEvidenceDashboard /></Suspense>
                    </TabsContent>
                </Tabs>
            </div>
        </AppShell>
    );
}