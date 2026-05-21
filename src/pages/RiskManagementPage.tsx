import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation, useNavigate } from "react-router-dom";
import { lazy, Suspense } from "react";
const RiskRegisterTab = lazy(() => import("@/components/risk/RiskRegisterTab").then(m => ({ default: m.RiskRegisterTab })));
const CapaRegisterTab = lazy(() => import("@/components/risk/CapaRegisterTab").then(m => ({ default: m.CapaRegisterTab })));
const ProcessInteractionTab = lazy(() => import("@/components/risk/ProcessInteractionTab").then(m => ({ default: m.ProcessInteractionTab })));
const RiskHeatMap = lazy(() => import("@/components/risk/RiskHeatMap").then(m => ({ default: m.RiskHeatMap })));

import { Shield, AlertTriangle, Activity, ChevronRight, Clock, CheckCircle } from "lucide-react";
import { StatsRow } from "@/components/ui/StatsRow";
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
        if (tab && ["risk", "capa", "process"].includes(tab)) {
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
                    iconClassName="text-destructive"
                    title="Risk & Process Management"
                    description="ISO 9001:2015 Clause 6.1 — Monitor risks, track CAPAs, and visualize processes."
                    badgeVariant="destructive"
                />

                {/* Stats */}
                <StatsRow stats={[
                    { icon: AlertTriangle, value: risks.length, label: "Total Risks", variant: "default" },
                    { icon: AlertTriangle, value: risks.filter(r => r.status === "Open").length, label: "Open Risks", variant: "destructive" },
                    { icon: AlertTriangle, value: risks.filter(r => r.riskScore >= 12).length, label: "High/Critical", variant: "warning" },
                    { icon: Shield, value: capas.filter(c => c.status === "Open" || c.status === "In Progress").length, label: "Active CAPAs", variant: "info" },
                    { icon: Clock, value: capas.filter(c => c.status !== "Closed" && c.targetCompletionDate && new Date(c.targetCompletionDate) < new Date()).length, label: "Overdue CAPAs", variant: "warning" },
                    { icon: CheckCircle, value: risks.filter(r => r.status === "Controlled" || r.status === "Closed").length, label: "Controlled", variant: "success" },
                ]} />

                {/* Heat Map - only on risk tab */}
                {activeTab === "risk" && risks.length > 0 && (
                    <details open className="group">
                        <summary className="flex items-center gap-2 cursor-pointer bg-card rounded-sm border border-border p-4 hover:bg-muted/30 transition-colors list-none">
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-open:rotate-90 transition-transform" />
                            <span className="text-sm font-bold text-foreground">Risk Heat Map</span>
                            <span className="text-[9px] text-muted-foreground font-mono ml-auto">Click to toggle</span>
                        </summary>
                        <div className="mt-2">
                            <Suspense fallback={<div className="h-48 bg-muted/20 animate-pulse rounded-sm" />}><RiskHeatMap risks={risks} /></Suspense>
                        </div>
                    </details>
                )}

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={handleTabChange}>
                    <TabsList className="grid w-full grid-cols-3 lg:w-[500px] h-10 p-1 bg-muted/40 rounded-sm border border-border/50">
                        <TabsTrigger value="risk" className="gap-1.5 rounded-sm text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Risk Register
                            {risks.length > 0 && <span className="text-[9px] font-mono bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-sm ml-1">{risks.length}</span>}
                        </TabsTrigger>
                        <TabsTrigger value="capa" className="gap-1.5 rounded-sm text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <Shield className="w-3.5 h-3.5" />
                            CAPA Register
                            {capas.length > 0 && <span className="text-[9px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded-sm ml-1">{capas.length}</span>}
                        </TabsTrigger>
                        <TabsTrigger value="process" className="gap-1.5 rounded-sm text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <Activity className="w-3.5 h-3.5" />
                            Process Map
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="risk" className="mt-4">
                        <div className="bg-card rounded-sm border border-border overflow-hidden">
                            <Suspense fallback={<div className="h-48 bg-muted/20 animate-pulse rounded-sm" />}><RiskRegisterTab /></Suspense>
                        </div>
                    </TabsContent>

                    <TabsContent value="capa" className="mt-4">
                        <div className="bg-card rounded-sm border border-border overflow-hidden">
                            <Suspense fallback={<div className="h-48 bg-muted/20 animate-pulse rounded-sm" />}><CapaRegisterTab /></Suspense>
                        </div>
                    </TabsContent>

                    <TabsContent value="process" className="mt-4">
                        <div className="bg-card rounded-sm border border-border overflow-hidden">
                            <Suspense fallback={<div className="h-48 bg-muted/20 animate-pulse rounded-sm" />}><ProcessInteractionTab /></Suspense>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </AppShell>
    );
}