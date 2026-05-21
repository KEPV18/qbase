import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Target,
  Users,
  TrendingUp,
  Award,
  Briefcase,
  BarChart3,
  PieChart,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Info,
  ArrowLeft,
  Grid3X3,
  List,
} from "lucide-react";
import {
  KPI_DATA,
  getAllCategories,
  getAllRoleTitles,
  getKPIStatistics,
  getCategoryColor,
  calculateRoleKPIScore,
  type RoleKPIData,
  type KPI,
} from "@/data/kpiData";
import { AppShell } from "@/components/layout/AppShell";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// ── Helpers ──────────────────────────────────────────────────────────

const calculateTotalWeight = (kpis: KPI[]) =>
  kpis.reduce((sum, kpi) => sum + kpi.weight, 0);

// ── Role KPI Card ────────────────────────────────────────────────────

const RoleKPICard = ({
  role,
  onClick,
}: {
  role: RoleKPIData;
  onClick: () => void;
}) => {
  const totalWeight = calculateTotalWeight(role.kpis);
  const isWeightValid = totalWeight >= 0.95 && totalWeight <= 1.05;

  return (
    <Card
      className={cn(
        "hover:shadow-lg transition-all cursor-pointer border-l-4 group",
        "bg-card text-card-foreground",
        isWeightValid
          ? "border-l-emerald-500 hover:border-l-emerald-400"
          : "border-l-red-500 hover:border-l-red-400"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-semibold">
              {role.title}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{role.department}</p>
          </div>
          <Badge variant={isWeightValid ? "default" : "destructive"}>
            {role.kpis.length} KPIs
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Manager */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4 shrink-0" />
            <span>Reports to: {role.manager}</span>
          </div>

          {/* Responsible */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Briefcase className="w-4 h-4 shrink-0" />
            <span>Responsible: HR</span>
          </div>

          {/* Weight validation */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Weight Total:
            </span>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "font-medium",
                  isWeightValid ? "text-success" : "text-destructive"
                )}
              >
                {(totalWeight * 100).toFixed(0)}%
              </span>
              {isWeightValid ? (
                <CheckCircle2 className="w-4 h-4 text-success" />
              ) : (
                <AlertCircle className="w-4 h-4 text-destructive" />
              )}
            </div>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-1.5 pt-2">
            {(() => {
              const cats = [...new Set(role.kpis.map((k) => k.category))];
              return cats.slice(0, 3).map((cat) => (
                <Badge
                  key={cat}
                  variant="secondary"
                  className="text-xs"
                  style={{
                    backgroundColor: getCategoryColor(cat),
                    color: "#fff",
                  }}
                >
                  {cat}
                </Badge>
              ));
            })()}
            {[...new Set(role.kpis.map((k) => k.category))].length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{[...new Set(role.kpis.map((k) => k.category))].length - 3}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ── KPI Detail Dialog Content ────────────────────────────────────────

const KPIDetailView = ({ role }: { role: RoleKPIData }) => {
  return (
    <div className="space-y-6">
      {/* Role header */}
      <div className="bg-muted/50 p-4 rounded-lg border">
        <h3 className="text-2xl font-bold">{role.title}</h3>
        <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
          <span>
            <strong className="text-foreground">Department:</strong>{" "}
            {role.department}
          </span>
          <span>
            <strong className="text-foreground">Manager:</strong>{" "}
            {role.manager}
          </span>
          <span>
            <strong className="text-foreground">Level:</strong>{" "}
            {role.jobLevel}
          </span>
          <span>
            <strong className="text-foreground">Status:</strong>{" "}
            {role.employmentStatus}
          </span>
        </div>
      </div>

      {/* KPIs table */}
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%]">Objective</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-center">Weight</TableHead>
              <TableHead className="text-center">Target</TableHead>
              <TableHead className="text-center">Evaluation</TableHead>
              <TableHead className="text-center">Responsible</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {role.kpis.map((kpi) => (
              <TableRow key={kpi.id}>
                <TableCell className="font-medium">
                  {kpi.objective}
                </TableCell>
                <TableCell>
                  <Badge
                    style={{
                      backgroundColor: getCategoryColor(kpi.category),
                      color: "#fff",
                    }}
                  >
                    {kpi.category}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  {(kpi.weight * 100).toFixed(0)}%
                </TableCell>
                <TableCell className="text-center">{kpi.target}</TableCell>
                <TableCell className="text-center">
                  {kpi.evaluation ?? (
                    <span className="text-muted-foreground text-xs">
                      N/A
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="text-xs">HR</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Score card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" />
            Overall Performance Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-3xl font-bold">
              {calculateRoleKPIScore(role).toFixed(1)}%
            </div>
            <div className="flex-1">
              <Progress
                value={calculateRoleKPIScore(role)}
                className="h-3"
                indicatorClassName={
                  calculateRoleKPIScore(role) >= 80
                    ? "bg-success"
                    : calculateRoleKPIScore(role) >= 50
                    ? "bg-warning"
                    : "bg-destructive"
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ── Main Page ────────────────────────────────────────────────────────

export default function KPIDashboardPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const categories = getAllCategories();
  const statistics = getKPIStatistics();

  const filteredRoles = useMemo(() => {
    return KPI_DATA.filter((role) => {
      const matchesSearch =
        role.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        role.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        role.manager.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        selectedCategory === "all" ||
        role.kpis.some((k) => k.category === selectedCategory);
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  return (
    <TooltipProvider>
      <AppShell
        breadcrumbs={[
          { label: "Dashboard", path: "/" },
          { label: "KPI Dashboard" },
        ]}
      >
        {/* ── Page header ──────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary text-primary-foreground">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">KPI Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Individual Performance Management (IPM) — ISO 9001:2015
              </p>
            </div>
          </div>
        </div>

        {/* ── Statistics cards ─────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Total Roles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{statistics.totalRoles}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="w-4 h-4" />
                Total KPIs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{statistics.totalKPIs}</p>
              <p className="text-xs text-muted-foreground">
                Avg {statistics.avgKPIsPerRole} per role
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <PieChart className="w-4 h-4" />
                Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{statistics.categories}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Valid Weights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {statistics.rolesWithValidWeights}/{statistics.totalRoles}
              </p>
              <p className="text-xs text-muted-foreground">
                Roles with 100% weight
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Filters ──────────────────────────────────────────── */}
        <Card className="mb-4">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search roles, departments, managers…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-full md:w-[200px]">
                  <Filter className="w-4 h-4 mr-2 shrink-0" />
                  <SelectValue placeholder="Filter by category" />
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

              <div className="flex gap-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="gap-2"
                >
                  <Grid3X3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Grid</span>
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className="gap-2"
                >
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline">Table</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Results count ────────────────────────────────────── */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Showing {filteredRoles.length} of {KPI_DATA.length} roles
          </span>
          {searchTerm && (
            <Badge variant="secondary" className="text-xs">
              Search: &ldquo;{searchTerm}&rdquo;
            </Badge>
          )}
          {selectedCategory !== "all" && (
            <Badge variant="secondary" className="text-xs">
              Category: {selectedCategory}
            </Badge>
          )}
        </div>

        {/* ── Grid view ────────────────────────────────────────── */}
        {viewMode === "grid" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRoles.map((role) => (
              <Dialog key={role.roleKey}>
                <DialogTrigger asChild>
                  <div>
                    <RoleKPICard role={role} onClick={() => {}} />
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>KPI Details — {role.title}</DialogTitle>
                  </DialogHeader>
                  <KPIDetailView role={role} />
                </DialogContent>
              </Dialog>
            ))}
          </div>
        )}

        {/* ── Table view ───────────────────────────────────────── */}
        {viewMode === "table" && (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role Title</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead className="text-center">KPIs</TableHead>
                    <TableHead className="text-center">Total Weight</TableHead>
                    <TableHead>Categories</TableHead>
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRoles.map((role) => {
                    const totalWeight = calculateTotalWeight(role.kpis);
                    const isValid =
                      totalWeight >= 0.95 && totalWeight <= 1.05;
                    return (
                      <TableRow key={role.roleKey}>
                        <TableCell className="font-medium">
                          {role.title}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {role.department}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {role.manager}
                        </TableCell>
                        <TableCell className="text-center">
                          {role.kpis.length}
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={
                              isValid ? "text-success" : "text-destructive"
                            }
                          >
                            {(totalWeight * 100).toFixed(0)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {[
                              ...new Set(role.kpis.map((k) => k.category)),
                            ]
                              .slice(0, 2)
                              .map((cat) => (
                                <Badge
                                  key={cat}
                                  variant="secondary"
                                  className="text-xs"
                                  style={{
                                    backgroundColor: getCategoryColor(cat),
                                    color: "#fff",
                                  }}
                                >
                                  {cat}
                                </Badge>
                              ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>
                                  KPI Details — {role.title}
                                </DialogTitle>
                              </DialogHeader>
                              <KPIDetailView role={role} />
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* ── Empty state ──────────────────────────────────────── */}
        {filteredRoles.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="w-12 h-12 text-muted-foreground/40 mb-4" />
              <p className="text-lg font-medium">No roles found</p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search or filter criteria.
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── Category Legend ──────────────────────────────────── */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Category Legend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <Badge
                  key={cat}
                  style={{
                    backgroundColor: getCategoryColor(cat),
                    color: "#fff",
                  }}
                >
                  {cat}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── ISO Note ─────────────────────────────────────────── */}
        <Card className="mt-6 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-medium text-amber-800 dark:text-amber-300">
                  ISO 9001:2015 Compliance Note
                </h4>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  This KPI Dashboard provides Individual Performance
                  Management (IPM) data for all operational roles. Per ISO
                  9001:2015 Clause 9.3.2, Management Review inputs include
                  organizational performance data. Each role&apos;s KPI
                  weights must sum to 100%. Valid weights are indicated with
                  green borders.
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
                  Source: /home/kepa/Downloads/FORMS/vezlooipmssheets/ |
                  Generated:{" "}
                  {new Date().toISOString().split("T")[0]}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Footer ───────────────────────────────────────────── */}
        <Footer />
      </AppShell>
    </TooltipProvider>
  );
}
