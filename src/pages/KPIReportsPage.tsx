import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText, Download, Printer, Calendar, CheckCircle2,
  AlertCircle, FileSpreadsheet, ArrowLeft, Info,
} from "lucide-react";
import {
  KPI_DATA, getAllCategories, getKPIStatistics,
  calculateRoleKPIScore,
  type RoleKPIData,
} from "@/data/kpiData";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatsRow } from "@/components/ui/StatsRow";
import { PanelRow, PanelRows, UnifiedPanel } from "@/components/ui/UnifiedPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

function generateCSV(roles: RoleKPIData[]): string {
  const headers = ["Role","Department","Manager","KPI_ID","Category","Objective","Weight_%","Target_%","Evaluation_%","Achievement_%","Status"];
  const rows: string[] = [headers.join(",")];
  roles.forEach((role) => {
    role.kpis.forEach((kpi) => {
      const achievement = kpi.evaluation !== null ? ((kpi.evaluation / kpi.target) * 100).toFixed(1) : "";
      const status = kpi.evaluation !== null
        ? parseFloat(achievement) >= 100 ? "Achieved" : parseFloat(achievement) >= 80 ? "Partial" : "At Risk"
        : "Not Evaluated";
      rows.push([
        `"${role.title}"`, `"${role.department}"`, `"${role.manager}"`,
        kpi.id, `"${kpi.category}"`, `"${kpi.objective.replace(/"/g, '""')}"`,
        (kpi.weight * 100).toFixed(0), (kpi.target * 100).toFixed(0),
        kpi.evaluation !== null ? (kpi.evaluation * 100).toFixed(0) : "",
        achievement, status,
      ].join(","));
    });
  });
  return rows.join("\n");
}

function generateJSONReport(roles: RoleKPIData[]): object {
  return {
    generatedAt: new Date().toISOString(),
    summary: getKPIStatistics(),
    totalRoles: roles.length,
    totalKPIs: roles.reduce((sum, r) => sum + r.kpis.length, 0),
    data: roles.map((role) => ({
      role: role.title, department: role.department, manager: role.manager,
      totalWeight: role.kpis.reduce((sum, k) => sum + k.weight, 0),
      avgScore: calculateRoleKPIScore(role),
      kpis: role.kpis.map((kpi) => ({
        id: kpi.id, category: kpi.category, objective: kpi.objective,
        weight: kpi.weight, target: kpi.target, evaluation: kpi.evaluation,
        achievement: kpi.evaluation !== null ? (kpi.evaluation / kpi.target) * 100 : null,
        frequency: kpi.frequency,
      })),
    })),
  };
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

export default function KPIReportsPage() {
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const categories = getAllCategories();

  const filteredRoles = useMemo(() =>
    KPI_DATA.filter((role) => {
      if (selectedRoles.length > 0 && !selectedRoles.includes(role.roleKey)) return false;
      if (selectedCategories.length > 0 && !role.kpis.some((k) => selectedCategories.includes(k.category))) return false;
      return true;
    }),
    [selectedRoles, selectedCategories]
  );

  const reportStats = useMemo(() => {
    const totalKPIs = filteredRoles.reduce((sum, r) => sum + r.kpis.length, 0);
    const validWeightRoles = filteredRoles.filter((r) => {
      const totalWeight = r.kpis.reduce((sum, k) => sum + k.weight, 0);
      return totalWeight >= 0.95 && totalWeight <= 1.05;
    });
    return {
      totalKPIs,
      validWeightRoles: validWeightRoles.length,
      overallCompliance: filteredRoles.length ? Math.round((validWeightRoles.length / filteredRoles.length) * 100) : 0,
    };
  }, [filteredRoles]);

  const handleExportCSV = () => {
    downloadFile(generateCSV(filteredRoles), `KPI_Report_${new Date().toISOString().split("T")[0]}.csv`, "text/csv;charset=utf-8;");
  };
  const handleExportJSON = () => {
    downloadFile(JSON.stringify(generateJSONReport(filteredRoles), null, 2), `KPI_Report_${new Date().toISOString().split("T")[0]}.json`, "application/json");
  };
  const handlePrint = () => window.print();

  return (
    <AppShell breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "KPI Dashboard", path: "/kpi" }, { label: "KPI Reports" }]}>
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 print:hidden">
          <PageHeader
            icon={FileText}
            title="KPI Reports"
            description="ISO 9001:2015 Compliance Documentation"
          />
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <FileSpreadsheet className="w-4 h-4 mr-2" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportJSON}>
              <Download className="w-4 h-4 mr-2" /> JSON
            </Button>
            <Button variant="default" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" /> Print
            </Button>
          </div>
        </div>

        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold">KPI Audit Report</h1>
          <p className="text-sm text-muted-foreground">Generated: {new Date().toLocaleDateString()} | ISO 9001:2015 Compliant</p>
        </div>

        <div ref={printRef}>
          <Card className="mb-6 print:hidden ds-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Download className="w-4 h-4" /> Report Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Roles</label>
                  <Select
                    value={selectedRoles.length === 0 ? "all" : selectedRoles[0]}
                    onValueChange={(val) => setSelectedRoles(val === "all" ? [] : [val])}
                  >
                    <SelectTrigger aria-label="Filter by role"><SelectValue placeholder="All Roles" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      {KPI_DATA.map((role) => (
                        <SelectItem key={role.roleKey} value={role.roleKey}>{role.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Categories</label>
                  <Select
                    value={selectedCategories.length === 0 ? "all" : selectedCategories[0]}
                    onValueChange={(val) => setSelectedCategories(val === "all" ? [] : [val])}
                  >
                    <SelectTrigger aria-label="Filter by category"><SelectValue placeholder="All Categories" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedRoles([]); setSelectedCategories([]); }}>Clear Filters</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <StatsRow
            className="mb-6"
            stats={[
              { icon: FileText, value: filteredRoles.length, label: "Total Roles" },
              { icon: FileText, value: reportStats.totalKPIs, label: "Total KPIs" },
              { icon: CheckCircle2, value: `${reportStats.validWeightRoles}/${filteredRoles.length}`, label: "Valid Weights", variant: "success" },
              { icon: AlertCircle, value: `${reportStats.overallCompliance}%`, label: "Compliance Rate", variant: reportStats.overallCompliance >= 80 ? "success" : "warning" },
            ]}
          />

          <Card className="ds-card">
            <CardHeader><CardTitle>KPI Details by Role</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>KPI Category</TableHead>
                      <TableHead className="text-right">Weight %</TableHead>
                      <TableHead className="text-right">Target %</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRoles.map((role) =>
                      role.kpis.map((kpi, idx) => {
                        const achievement = kpi.evaluation !== null ? (kpi.evaluation / kpi.target) * 100 : null;
                        return (
                          <TableRow key={kpi.id}>
                            {idx === 0 && <TableCell rowSpan={role.kpis.length} className="font-medium align-top">{role.title}</TableCell>}
                            {idx === 0 && <TableCell rowSpan={role.kpis.length} className="align-top text-muted-foreground">{role.department}</TableCell>}
                            <TableCell>
                              <Badge variant="secondary">
                                {kpi.category}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{(kpi.weight * 100).toFixed(0)}%</TableCell>
                            <TableCell className="text-right">{(kpi.target * 100).toFixed(0)}%</TableCell>
                            <TableCell className="text-center">
                              {achievement !== null ? (
                                <Badge variant={achievement >= 100 ? "default" : achievement >= 80 ? "secondary" : "destructive"}>
                                  {achievement.toFixed(1)}%
                                </Badge>
                              ) : <span className="text-muted-foreground">-</span>}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6 ds-card">
            <CardHeader><CardTitle>Weight Validation Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredRoles.map((role) => {
                  const totalWeight = role.kpis.reduce((sum, k) => sum + k.weight, 0);
                  const isValid = totalWeight >= 0.95 && totalWeight <= 1.05;
                  return (
                    <div key={role.roleKey} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div>
                        <p className="font-medium">{role.title}</p>
                        <p className="text-xs text-muted-foreground">{role.department}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* A valid weight is the NORMAL state — greyscale.
                            The colour is spent on the role whose weights do
                            not add up, which is the one that needs it. */}
                        <span className={cn("font-bold", isValid ? "text-foreground" : "text-destructive-tint")}>
                          {(totalWeight * 100).toFixed(0)}%
                        </span>
                        {isValid ? <CheckCircle2 className="w-5 h-5 text-ink-4" /> : <AlertCircle className="w-5 h-5 text-destructive-tint" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* The compliance note is INFORMATION, not a warning: it used to
              be an amber card, which meant the export's own footer was the
              loudest thing on the page.  It is now a neutral panel with the
              system's info tint on the icon — the same treatment the KPI
              dashboard gives the identical note. */}
          <UnifiedPanel className="mt-6">
            <PanelRows>
              <PanelRow className="items-start">
                <Info className="w-5 h-5 mt-0.5 shrink-0 text-info-tint" aria-hidden="true" />
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold tracking-[-0.01em] text-foreground">ISO 9001:2015 Compliance Note</h4>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    This report documents Individual Performance Management (IPM) KPIs as required for
                    Management Review inputs (Clause 9.3.2). All KPI weights should sum to 100% per role.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Generated: {new Date().toLocaleString()}
                  </p>
                </div>
              </PanelRow>
            </PanelRows>
          </UnifiedPanel>
        </div>
      </div>
    </AppShell>
  );
}
