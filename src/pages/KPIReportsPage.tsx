import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Download,
  Printer,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  File as FilePdf,
  Filter,
  ArrowLeft,
  Info,
} from "lucide-react";
import {
  KPI_DATA,
  getAllCategories,
  getKPIStatistics,
  getCategoryColor,
  calculateRoleKPIScore,
  type RoleKPIData,
} from "@/data/kpiData";
import { AppShell } from "@/components/layout/AppShell";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ============================================================================
// Export Helpers
// ============================================================================

function generateCSV(roles: RoleKPIData[]): string {
  const headers = [
    "Role",
    "Department",
    "Manager",
    "KPI_ID",
    "Category",
    "Objective",
    "Weight_%",
    "Target_%",
    "Evaluation_%",
    "Achievement_%",
    "Status",
  ];

  const rows: string[] = [headers.join(",")];

  roles.forEach((role) => {
    role.kpis.forEach((kpi) => {
      const achievement =
        kpi.evaluation !== null
          ? ((kpi.evaluation / kpi.target) * 100).toFixed(1)
          : "";
      const status =
        kpi.evaluation !== null
          ? parseFloat(achievement) >= 100
            ? "Achieved"
            : parseFloat(achievement) >= 80
            ? "Partial"
            : "At Risk"
          : "Not Evaluated";

      rows.push(
        [
          `"${role.title}"`,
          `"${role.department}"`,
          `"${role.manager}"`,
          kpi.id,
          `"${kpi.category}"`,
          `"${kpi.objective.replace(/"/g, '""')}"`,
          (kpi.weight * 100).toFixed(0),
          (kpi.target * 100).toFixed(0),
          kpi.evaluation !== null ? (kpi.evaluation * 100).toFixed(0) : "",
          achievement,
          status,
        ].join(",")
      );
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
      role: role.title,
      department: role.department,
      manager: role.manager,
      totalWeight: role.kpis.reduce((sum, k) => sum + k.weight, 0),
      avgScore: calculateRoleKPIScore(role),
      kpis: role.kpis.map((kpi) => ({
        id: kpi.id,
        category: kpi.category,
        objective: kpi.objective,
        weight: kpi.weight,
        target: kpi.target,
        evaluation: kpi.evaluation,
        achievement:
          kpi.evaluation !== null
            ? (kpi.evaluation / kpi.target) * 100
            : null,
        frequency: kpi.frequency,
      })),
    })),
  };
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================================
// Main Component
// ============================================================================

export default function KPIReportsPage() {
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const categories = getAllCategories();
  const stats = getKPIStatistics();

  const filteredRoles = useMemo(() => {
    return KPI_DATA.filter((role) => {
      if (selectedRoles.length > 0 && !selectedRoles.includes(role.roleKey)) {
        return false;
      }
      if (
        selectedCategories.length > 0 &&
        !role.kpis.some((k) => selectedCategories.includes(k.category))
      ) {
        return false;
      }
      return true;
    });
  }, [selectedRoles, selectedCategories]);

  const reportStats = useMemo(() => {
    const totalKPIs = filteredRoles.reduce(
      (sum, r) => sum + r.kpis.length,
      0
    );
    const validWeightRoles = filteredRoles.filter((r) => {
      const totalWeight = r.kpis.reduce((sum, k) => sum + k.weight, 0);
      return totalWeight >= 0.95 && totalWeight <= 1.05;
    });

    return {
      totalKPIs,
      validWeightRoles: validWeightRoles.length,
      overallCompliance: filteredRoles.length
        ? Math.round((validWeightRoles.length / filteredRoles.length) * 100)
        : 0,
    };
  }, [filteredRoles]);

  const handleExportCSV = () => {
    const csv = generateCSV(filteredRoles);
    downloadFile(
      csv,
      `VEZLOO_KPI_Report_${new Date().toISOString().split("T")[0]}.csv`,
      "text/csv;charset=utf-8;"
    );
  };

  const handleExportJSON = () => {
    const json = JSON.stringify(generateJSONReport(filteredRoles), null, 2);
    downloadFile(
      json,
      `VEZLOO_KPI_Report_${new Date().toISOString().split("T")[0]}.json`,
      "application/json"
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AppShell
      breadcrumbs={[
        { label: "Dashboard", path: "/" },
        { label: "KPI Dashboard", path: "/kpi" },
        { label: "KPI Reports" },
      ]}
    >
      {/* ── Page header ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/kpi")}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div className="p-2.5 rounded-lg bg-primary text-primary-foreground">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">KPI Reports</h1>
            <p className="text-xs text-muted-foreground">
              ISO 9001:2015 Compliance Documentation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportJSON}>
            <FilePdf className="w-4 h-4 mr-2" />
            Export JSON
          </Button>
          <Button variant="default" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* ── Print-only header ────────────────────────────────── */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold">VEZLOO - KPI Audit Report</h1>
        <p className="text-sm text-muted-foreground">
          Generated: {new Date().toLocaleDateString()} | ISO 9001:2015 Compliant
          Documentation
        </p>
      </div>

      <div ref={printRef}>
        {/* ── Filters ────────────────────────────────────────── */}
        <Card className="mb-6 print:hidden">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Report Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Roles
                </label>
                <Select
                  value={selectedRoles.length === 0 ? "all" : "selected"}
                  onValueChange={(val) => {
                    if (val === "all") setSelectedRoles([]);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {KPI_DATA.map((role) => (
                      <SelectItem key={role.roleKey} value={role.roleKey}>
                        {role.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Categories
                </label>
                <Select
                  value={selectedCategories.length === 0 ? "all" : "selected"}
                  onValueChange={(val) => {
                    if (val === "all") setSelectedCategories([]);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedRoles([]);
                    setSelectedCategories([]);
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Summary stats ──────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Roles</p>
              <p className="text-2xl font-bold">{filteredRoles.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total KPIs</p>
              <p className="text-2xl font-bold">{reportStats.totalKPIs}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                Valid Weight Config
              </p>
              <p className="text-2xl font-bold text-success">
                {reportStats.validWeightRoles}/{filteredRoles.length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                Compliance Rate
              </p>
              <p className="text-2xl font-bold">
                {reportStats.overallCompliance}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── KPI Details table ──────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>KPI Details by Role</CardTitle>
          </CardHeader>
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
                      const achievement =
                        kpi.evaluation !== null
                          ? (kpi.evaluation / kpi.target) * 100
                          : null;

                      return (
                        <TableRow key={kpi.id}>
                          {idx === 0 && (
                            <TableCell
                              rowSpan={role.kpis.length}
                              className="font-medium align-top"
                            >
                              {role.title}
                            </TableCell>
                          )}
                          {idx === 0 && (
                            <TableCell
                              rowSpan={role.kpis.length}
                              className="align-top text-muted-foreground"
                            >
                              {role.department}
                            </TableCell>
                          )}

                          <TableCell>
                            <Badge
                              style={{
                                backgroundColor: getCategoryColor(kpi.category),
                                color: "#fff",
                              }}
                              className="text-xs"
                            >
                              {kpi.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {(kpi.weight * 100).toFixed(0)}%
                          </TableCell>
                          <TableCell className="text-right">
                            {(kpi.target * 100).toFixed(0)}%
                          </TableCell>
                          <TableCell className="text-center">
                            {achievement !== null ? (
                              <Badge
                                variant={
                                  achievement >= 100
                                    ? "default"
                                    : achievement >= 80
                                    ? "secondary"
                                    : "destructive"
                                }
                              >
                                {achievement.toFixed(1)}%
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
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

        {/* ── Weight Validation ──────────────────────────────── */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Weight Validation Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredRoles.map((role) => {
                const totalWeight = role.kpis.reduce(
                  (sum, k) => sum + k.weight,
                  0
                );
                const isValid = totalWeight >= 0.95 && totalWeight <= 1.05;

                return (
                  <div
                    key={role.roleKey}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border",
                      "bg-card text-card-foreground"
                    )}
                  >
                    <div>
                      <p className="font-medium">{role.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {role.department}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "font-bold",
                          isValid ? "text-success" : "text-destructive"
                        )}
                      >
                        {(totalWeight * 100).toFixed(0)}%
                      </span>
                      {isValid ? (
                        <CheckCircle2 className="w-5 h-5 text-success" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-destructive" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── ISO Note ───────────────────────────────────────── */}
        <Card className="mt-6 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-medium text-amber-800 dark:text-amber-300">
                  ISO 9001:2015 Compliance Note
                </h4>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  This report documents Individual Performance Management
                  (IPM) KPIs as required for Management Review inputs (Clause
                  9.3.2). All KPI weights should sum to 100% per role.
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
                  Source: /home/kepa/Downloads/FORMS/vezlooipmssheets/ |
                  Generated: {new Date().toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Footer ───────────────────────────────────────────── */}
      <Footer />
    </AppShell>
  );
}
