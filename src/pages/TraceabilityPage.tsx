/**
 * ISO 9001:2015 Traceability Live Page
 *
 * PRODUCTION-READY: Uses live data resolver exclusively
 * All mock/fabricated data have been removed.
 *
 * ISO 9001:2015 Clause 10.2 & 7.5.3 - Traceability
 */

import React, { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { TraceView } from "@/components/traceability/TraceView";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  CheckCircle2,
  GitBranch,
  Clock,
  Search,
  FileText,
  Shield,
} from "lucide-react";
import { useTraceabilityResolver } from "@/hooks/useTraceabilityResolver";
import CAPAEvidenceDashboard from "@/components/traceability/CAPAEvidenceDashboard";
import { cn } from "@/lib/utils";

export default function TraceabilityPage() {
  const { recordId } = useParams<{ recordId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState<"live" | "capa-evidence">(
    "live"
  );

  const { registry, record: rootRecord, isLoading, brokenLinks } =
    useTraceabilityResolver(recordId || undefined);

  const startingPoints = useMemo(() => {
    const points: { id: string; label: string; form: string }[] = [];
    registry.forEach((r) => {
      if (r.form === "F/09" || r.form === "F/22" || r.form === "Risk") {
        points.push({
          id: r.id,
          label: `${r.id}: ${r.title}`,
          form: r.form,
        });
      }
    });
    return points.slice(0, 20);
  }, [registry]);

  const handleOpenRecord = (id: string) => {
    navigate(`/record/${id}`);
  };

  const handleSelectChange = (value: string) => {
    navigate(`/traceability/${value}`);
  };

  const hasBrokenLinks = brokenLinks.length > 0;
  const relationshipCount = rootRecord?.relatedRecords?.length || 0;

  if (activeTab === "capa-evidence") {
    return (
      <AppShell
        breadcrumbs={[
          { label: "Dashboard", path: "/" },
          { label: "Traceability", path: "/traceability" },
          { label: "CAPA Evidence" },
        ]}
      >
        {/* Page header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-lg bg-primary text-primary-foreground">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">CAPA Evidence Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              ISO 9001:2015 Clause 10.2 — Verify corrective action effectiveness
            </p>
          </div>
        </div>

        <CAPAEvidenceDashboard />

        <Card className="mt-8">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Shield className="w-5 h-5 shrink-0" />
              <div>
                <p className="text-foreground">
                  <strong>ISO 9001:2015 Clause 10.2:</strong> CAPA effectiveness
                  shall be verified before closure.
                </p>
                <p className="mt-1 text-xs">
                  This dashboard tracks evidence (KPI improvement, audit closures,
                  training completion, procedure updates) required to verify
                  corrective actions are effective.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell
      breadcrumbs={[
        { label: "Dashboard", path: "/" },
        { label: "Traceability" },
      ]}
    >
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary text-primary-foreground">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">ISO 9001:2015 Traceability</h1>
            <p className="text-sm text-muted-foreground">
              Relationship-Based Record Linking System
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40"
          >
            <CheckCircle2 className="w-3 h-3 mr-1" />
            ISO Clause 7.5.3
          </Badge>
          <Badge
            variant="outline"
            className="bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/40"
          >
            <Activity className="w-3 h-3 mr-1" />
            Live Data
          </Badge>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="mb-6 flex gap-2">
        <Button
          variant={activeTab === "live" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("live")}
        >
          <GitBranch className="w-4 h-4 mr-1.5" />
          Live Traceability
        </Button>
        <Button
          variant={activeTab === "capa-evidence" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("capa-evidence")}
        >
          <Shield className="w-4 h-4 mr-1.5" />
          CAPA Evidence
        </Button>
      </div>

      {/* Record Selector */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <label className="text-sm font-medium whitespace-nowrap">
              Select Record:
            </label>
            <Select
              value={recordId || ""}
              onValueChange={handleSelectChange}
            >
              <SelectTrigger className="w-full sm:w-[500px]">
                <Search className="w-4 h-4 mr-2 shrink-0 text-muted-foreground" />
                <SelectValue placeholder="Search for a record..." />
              </SelectTrigger>
              <SelectContent>
                {startingPoints.map((point) => (
                  <SelectItem key={point.id} value={point.id}>
                    {point.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isLoading && (
              <div className="flex items-center text-muted-foreground">
                <Clock className="w-4 h-4 animate-spin mr-2" />
                Loading...
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status Panel */}
      {rootRecord ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Record ID</p>
              <p className="text-2xl font-mono font-bold">{rootRecord.id}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="text-2xl font-bold">{rootRecord.status}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Linked Records</p>
              <p className="text-2xl font-bold">{relationshipCount}</p>
            </CardContent>
          </Card>

          <Card
            className={
              hasBrokenLinks
                ? "border-amber-400 dark:border-amber-600"
                : "border-emerald-400 dark:border-emerald-600"
            }
          >
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Link Health</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">
                  {hasBrokenLinks ? brokenLinks.length : "✓"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {hasBrokenLinks ? "Broken" : "Valid"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="mb-6">
          <CardContent className="pt-6 text-center py-12">
            <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
            <p className="text-lg font-medium">No record selected</p>
            <p className="text-sm text-muted-foreground mt-2">
              Select a record from the dropdown above to view its traceability
              chain
            </p>
          </CardContent>
        </Card>
      )}

      {/* Main Trace View */}
      {rootRecord && (
        <TraceView
          rootRecord={rootRecord}
          registry={registry}
          onOpenRecord={handleOpenRecord}
        />
      )}

      {/* Documentation */}
      <Card className="mt-8">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <FileText className="w-5 h-5 shrink-0" />
            <div>
              <p className="text-foreground">
                <strong>Data Source:</strong> Live QMS Registry
              </p>
              <p className="mt-1 text-xs">
                Traceability chains are built client-side from relatedRecords[]
                arrays. ISO Clause 7.5.3 compliant — no custom TRC-XXXX IDs
                required.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}