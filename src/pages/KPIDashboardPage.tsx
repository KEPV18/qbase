import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Target, Users, TrendingUp, Award, Briefcase, BarChart3,
  PieChart, Search, Filter, ChevronDown, ChevronUp, ExternalLink,
  CheckCircle2, AlertCircle, Info, ArrowLeft, Grid3X3, List,
} from "lucide-react";
import {
  KPI_DATA, getAllCategories, getAllRoleTitles, getKPIStatistics,
  calculateRoleKPIScore,
  type RoleKPIData, type KPI,
} from "@/data/kpiData";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatsRow } from "@/components/ui/StatsRow";
import { PanelCell, PanelCells, PanelRow, PanelRows, UnifiedPanel } from "@/components/ui/UnifiedPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const calculateTotalWeight = (kpis: KPI[]) =>
  kpis.reduce((sum, kpi) => sum + kpi.weight, 0);

const RoleKPICard = ({ role, onClick }: { role: RoleKPIData; onClick: () => void }) => {
  const totalWeight = calculateTotalWeight(role.kpis);
  const isWeightValid = totalWeight >= 0.95 && totalWeight <= 1.05;

  return (
    <Card
      /* No coloured left bar.  The design system names "each item with
         its own border + tint + colored left-bar" as the signature
         anti-pattern, and the bar was redundant: the weight percentage
         below is already tinted by validity and carries a check or an
         alert icon next to it. */
      className="ds-card hover:shadow-lg transition-all cursor-pointer group"
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
          {/* A count is not a status.  The filled primary badge put a
              bright accent pill on every one of the nine cards in the
              grid — nine accents, none of them meaning anything.  The
              tag is neutral; the weight check below is the thing that
              can actually be a problem, and it says so in colour. */}
          <Badge variant={isWeightValid ? "secondary" : "destructive"}>
            {role.kpis.length} KPIs
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4 shrink-0" />
            <span>Reports to: {role.manager}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Weight Total:</span>
            <div className="flex items-center gap-2">
              {/* A VALID weight is the normal state, so it is greyscale:
                  the eye should land on the one card whose weights do not
                  add up, not on eight green ticks.  (Same rule as the SLA
                  Health Pill on the dashboard.) */}
              <span className={cn("font-medium tabular-nums", isWeightValid ? "text-foreground" : "text-destructive-tint")}>
                {(totalWeight * 100).toFixed(0)}%
              </span>
              {isWeightValid
                ? <CheckCircle2 className="w-4 h-4 text-ink-4" />
                : <AlertCircle className="w-4 h-4 text-destructive-tint" />}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-2">
            {[...new Set(role.kpis.map((k) => k.category))].slice(0, 3).map((cat) => (
              /* A category is a label, not a status: the neutral tag, and
                 the words do the work. */
              <Badge key={cat} variant="secondary">
                {cat}
              </Badge>
            ))}
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

const KPIDetailView = ({ role }: { role: RoleKPIData }) => (
  <div className="space-y-6">
    {/* The dialog's own title already reads "KPI Details — <role title>",
        so the old `h3` here repeated it verbatim.  What is left is the
        metadata, and that is four facts: one panel, hairline mesh, no
        tinted card and no second title. */}
    <UnifiedPanel>
      <PanelCells columns={4}>
        <PanelCell>
          <p className="text-xs text-muted-foreground">Department</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{role.department}</p>
        </PanelCell>
        <PanelCell>
          <p className="text-xs text-muted-foreground">Manager</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{role.manager}</p>
        </PanelCell>
        <PanelCell>
          <p className="text-xs text-muted-foreground">Level</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{role.jobLevel}</p>
        </PanelCell>
        <PanelCell>
          <p className="text-xs text-muted-foreground">Status</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{role.employmentStatus}</p>
        </PanelCell>
      </PanelCells>
    </UnifiedPanel>

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
              <TableCell className="font-medium">{kpi.objective}</TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {kpi.category}
                </Badge>
              </TableCell>
              <TableCell className="text-center">{(kpi.weight * 100).toFixed(0)}%</TableCell>
              <TableCell className="text-center">{kpi.target}</TableCell>
              <TableCell className="text-center">
                {kpi.evaluation ?? <span className="text-muted-foreground text-xs">N/A</span>}
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="outline" className="text-xs">HR</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Award className="w-4 h-4 text-primary-tint" />
          Overall Performance Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="text-3xl font-bold tabular-nums">{calculateRoleKPIScore(role).toFixed(1)}%</div>
          <div className="flex-1">
            <Progress
              value={calculateRoleKPIScore(role)}
              className="h-3"
              indicatorClassName={
                calculateRoleKPIScore(role) >= 80 ? "bg-success"
                  : calculateRoleKPIScore(role) >= 50 ? "bg-warning" : "bg-destructive"
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default function KPIDashboardPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const categories = getAllCategories();
  const statistics = getKPIStatistics();

  const filteredRoles = useMemo(() =>
    KPI_DATA.filter((role) => {
      const matchesSearch =
        role.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        role.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        role.manager.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        selectedCategory === "all" ||
        role.kpis.some((k) => k.category === selectedCategory);
      return matchesSearch && matchesCategory;
    }),
    [searchTerm, selectedCategory]
  );

  return (
    <TooltipProvider>
      <AppShell breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "KPI Dashboard" }]}>
        <div>
          <PageHeader
            icon={Target}
            title="KPI Dashboard"
            description="Individual Performance Management (IPM) — ISO 9001:2015"
          />

          <StatsRow
            className="mt-5 mb-6"
            stats={[
              { icon: Briefcase, value: statistics.totalRoles, label: "Total Roles" },
              { icon: Target, value: statistics.totalKPIs, label: "Total KPIs" },
              { icon: PieChart, value: statistics.categories, label: "Categories", variant: "default" },
              { icon: CheckCircle2, value: `${statistics.rolesWithValidWeights}/${statistics.totalRoles}`, label: "Valid Weights", variant: "success" },
            ]}
          />

          <Card className="mb-4 ds-card">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      placeholder="Search roles, departments, managers…"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="input-modern w-full pl-9 pr-4 py-2 text-sm"
                    />
                  </div>
                </div>

                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <Filter className="w-4 h-4 mr-2 shrink-0" />
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <Button variant={viewMode === "grid" ? "default" : "outline"} size="sm" onClick={() => setViewMode("grid")} className="gap-2">
                    <Grid3X3 className="w-4 h-4" />
                    <span className="hidden sm:inline">Grid</span>
                  </Button>
                  <Button variant={viewMode === "table" ? "default" : "outline"} size="sm" onClick={() => setViewMode("table")} className="gap-2">
                    <List className="w-4 h-4" />
                    <span className="hidden sm:inline">Table</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Showing {filteredRoles.length} of {KPI_DATA.length} roles
            </span>
            {searchTerm && <Badge variant="secondary" className="text-xs">Search: &ldquo;{searchTerm}&rdquo;</Badge>}
            {selectedCategory !== "all" && <Badge variant="secondary" className="text-xs">Category: {selectedCategory}</Badge>}
          </div>

          {viewMode === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRoles.map((role) => (
                <Dialog key={role.roleKey}>
                  <DialogTrigger asChild>
                    <div><RoleKPICard role={role} onClick={() => {}} /></div>
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

          {viewMode === "table" && (
            <Card className="ds-card">
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
                      const isValid = totalWeight >= 0.95 && totalWeight <= 1.05;
                      return (
                        <TableRow key={role.roleKey}>
                          <TableCell className="font-medium">{role.title}</TableCell>
                          <TableCell className="text-muted-foreground">{role.department}</TableCell>
                          <TableCell className="text-muted-foreground">{role.manager}</TableCell>
                          <TableCell className="text-center">{role.kpis.length}</TableCell>
                          <TableCell className="text-center">
                            <span className={cn("tabular-nums", isValid ? "text-foreground" : "text-destructive-tint")}>
                              {(totalWeight * 100).toFixed(0)}%
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {[...new Set(role.kpis.map((k) => k.category))].slice(0, 2).map((cat) => (
                                <Badge key={cat} variant="secondary">
                                  {cat}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm"><ExternalLink className="w-4 h-4" /></Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>KPI Details — {role.title}</DialogTitle>
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

          {filteredRoles.length === 0 && (
            <Card className="ds-card">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Search className="w-12 h-12 text-ink-4 mb-4" />
                <p className="text-lg font-medium">No roles found</p>
                <p className="text-sm text-muted-foreground">Try adjusting your search or filter criteria.</p>
              </CardContent>
            </Card>
          )}

          {/* The "Category Legend" card used to live here.  It existed for
              one reason: to map each category's HUE to its name, because the
              chips themselves were coloured.  With the chips neutral the
              legend would list seven names that every chip already spells
              out — and the category filter above already offers the same
              seven.  It was noise with a legend's shape, so it is gone. */}

          <UnifiedPanel className="mt-6">
            <PanelRows>
              <PanelRow className="items-start">
                {/* An informational note is not a warning: the icon is the
                    only thing that carries colour, and it carries the
                    system's info tint, not the heat orange. */}
                <Info className="w-5 h-5 mt-0.5 shrink-0 text-info-tint" aria-hidden="true" />
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold tracking-[-0.01em] text-foreground">ISO 9001:2015 Compliance Note</h4>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    This KPI Dashboard provides Individual Performance Management (IPM) data for all operational roles.
                    Per ISO 9001:2015 Clause 9.3.2, Management Review inputs include organizational performance data.
                    Each role&apos;s KPI weights must sum to 100%. Valid weights are indicated with green borders.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2 tabular-nums">
                    Generated: {new Date().toISOString().split("T")[0]}
                  </p>
                </div>
              </PanelRow>
            </PanelRows>
          </UnifiedPanel>
        </div>
      </AppShell>
    </TooltipProvider>
  );
}
