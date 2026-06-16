import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { useCAPAData } from "@/hooks/useCAPAData";
import { getCAPAStatusColor } from "@/lib/capaRegisterService";
import type { CAPAStatus, CAPAType, CAPAInput } from "@/lib/capaRegisterService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FileCheck2,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  AlertTriangle,
  Info,
  ArrowRight,
  BarChart3
} from "lucide-react";

export default function CAPARegisterPage() {
  const navigate = useNavigate();
  const { capas, stats, isLoading, isError, error, refetch, addCAPA, updateCAPA, isAdding } = useCAPAData();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  // New CAPA form state
  const [newCAPA, setNewCAPA] = useState<CAPAInput>({
    sourceOfCAPA: "",
    type: "Corrective",
    description: "",
    reference: "",
    rootCauseAnalysis: "",
    correctiveAction: "",
    preventiveAction: "",
    responsiblePerson: "",
    targetCompletionDate: "",
    relatedRisk: "",
  });

  const handleAddCAPA = () => {
    addCAPA(newCAPA, {
      onSuccess: () => {
        setIsAddDialogOpen(false);
        setNewCAPA({
          sourceOfCAPA: "",
          type: "Corrective",
          description: "",
          reference: "",
          rootCauseAnalysis: "",
          correctiveAction: "",
          preventiveAction: "",
          responsiblePerson: "",
          targetCompletionDate: "",
          relatedRisk: "",
        });
      },
    });
  };

  const handleStatusChange = (capaId: string, newStatus: CAPAStatus) => {
    updateCAPA({ capaId, updates: { status: newStatus } });
  };

  const getFilteredCAPAs = () => {
    switch (activeTab) {
      case "open": return capas.filter(c => c.status === "Open");
      case "inProgress": return capas.filter(c => c.status === "In Progress");
      case "verification": return capas.filter(c => c.status === "Under Verification");
      case "closed": return capas.filter(c => c.status === "Closed");
      case "overdue": return capas.filter(c => {
        if (c.status === "Closed") return false;
        const targetDate = new Date(c.targetCompletionDate);
        return !isNaN(targetDate.getTime()) && targetDate < new Date();
      });
      default: return capas;
    }
  };

  const filteredCAPAs = getFilteredCAPAs();

  return (
    <AppShell breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "CAPA Register" }]}>
      <div className="space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <FileCheck2 className="w-7 h-7 text-blue-500" />
                CAPA Register
              </h1>
              <p className="text-muted-foreground mt-1">
                ISO 9001:2015 Clause 10.2 — Nonconformity and corrective action
              </p>
            </div>
            <div className="flex gap-2">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    New CAPA
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New CAPA</DialogTitle>
                    <DialogDescription>
                      Create a new Corrective or Preventive Action for an identified issue or nonconformity.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="source">Source of CAPA</Label>
                        <Input
                          id="source"
                          value={newCAPA.sourceOfCAPA}
                          onChange={(e) => setNewCAPA({ ...newCAPA, sourceOfCAPA: e.target.value })}
                          placeholder="e.g., Internal Audit, Customer Complaint"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="type">Type</Label>
                        <Select
                          value={newCAPA.type}
                          onValueChange={(v) => setNewCAPA({ ...newCAPA, type: v as CAPAType })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Corrective">Corrective</SelectItem>
                            <SelectItem value="Preventive">Preventive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="reference">Reference (NC/Audit/Complaint ID)</Label>
                        <Input
                          id="reference"
                          value={newCAPA.reference}
                          onChange={(e) => setNewCAPA({ ...newCAPA, reference: e.target.value })}
                          placeholder="e.g., NC-25-001, AUDIT-25-Q1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="relatedRisk">Related Risk ID</Label>
                        <Input
                          id="relatedRisk"
                          value={newCAPA.relatedRisk}
                          onChange={(e) => setNewCAPA({ ...newCAPA, relatedRisk: e.target.value })}
                          placeholder="e.g., RISK-25-001"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description of Issue / Nonconformity</Label>
                      <Textarea
                        id="description"
                        value={newCAPA.description}
                        onChange={(e) => setNewCAPA({ ...newCAPA, description: e.target.value })}
                        placeholder="Describe the issue or nonconformity..."
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rootCause" className="flex items-center gap-2">
                        Root Cause Analysis
                        <Badge variant="destructive" className="text-xs">Required</Badge>
                      </Label>
                      <Textarea
                        id="rootCause"
                        value={newCAPA.rootCauseAnalysis}
                        onChange={(e) => setNewCAPA({ ...newCAPA, rootCauseAnalysis: e.target.value })}
                        placeholder="Identify the root cause of the issue..."
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="correctiveAction">Corrective Action</Label>
                        <Textarea
                          id="correctiveAction"
                          value={newCAPA.correctiveAction}
                          onChange={(e) => setNewCAPA({ ...newCAPA, correctiveAction: e.target.value })}
                          placeholder="Action to correct the issue..."
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="preventiveAction">Preventive Action</Label>
                        <Textarea
                          id="preventiveAction"
                          value={newCAPA.preventiveAction}
                          onChange={(e) => setNewCAPA({ ...newCAPA, preventiveAction: e.target.value })}
                          placeholder="Action to prevent recurrence..."
                          rows={3}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="responsible">Responsible Person</Label>
                        <Input
                          id="responsible"
                          value={newCAPA.responsiblePerson}
                          onChange={(e) => setNewCAPA({ ...newCAPA, responsiblePerson: e.target.value })}
                          placeholder="Person responsible for this CAPA"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="targetDate">Target Completion Date</Label>
                        <Input
                          id="targetDate"
                          type="date"
                          value={newCAPA.targetCompletionDate}
                          onChange={(e) => setNewCAPA({ ...newCAPA, targetCompletionDate: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <Info className="w-4 h-4" />
                    <AlertDescription>
                      CAPA cannot be closed without completing Effectiveness Check and obtaining Closure Approval.
                    </AlertDescription>
                  </Alert>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddCAPA} disabled={isAdding}>
                      {isAdding ? "Creating..." : "Create CAPA"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total CAPAs</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <p className="text-2xl font-bold">{stats.total}</p>
                    )}
                  </div>
                  <BarChart3 className="w-8 h-8 text-primary/20" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Open</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <p className="text-2xl font-bold text-red-600">{stats.open}</p>
                    )}
                  </div>
                  <AlertCircle className="w-8 h-8 text-red-200" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">In Progress</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
                    )}
                  </div>
                  <ArrowRight className="w-8 h-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Overdue</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <p className="text-2xl font-bold text-orange-600">{stats.overdue}</p>
                    )}
                  </div>
                  <AlertTriangle className="w-8 h-8 text-orange-200" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Closure Rate</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <p className="text-2xl font-bold text-green-600">{stats.closureRate}%</p>
                    )}
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-200" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Type Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-sm bg-blue-100 flex items-center justify-center">
                  <FileCheck2 className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Corrective Actions</p>
                  <p className="text-xl font-bold">{isLoading ? "-" : stats.corrective}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.total > 0 ? Math.round((stats.corrective / stats.total) * 100) : 0}%
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-sm bg-purple-100 flex items-center justify-center">
                  <FileCheck2 className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Preventive Actions</p>
                  <p className="text-xl font-bold">{isLoading ? "-" : stats.preventive}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-purple-600">
                    {stats.total > 0 ? Math.round((stats.preventive / stats.total) * 100) : 0}%
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* CAPA Table with Tabs */}
          <Card>
            <CardHeader>
              <CardTitle>CAPA Records</CardTitle>
              <CardDescription>Corrective and Preventive Action tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
                  <TabsTrigger value="open">Open ({stats.open})</TabsTrigger>
                  <TabsTrigger value="inProgress">In Progress ({stats.inProgress})</TabsTrigger>
                  <TabsTrigger value="verification">Verification ({stats.underVerification})</TabsTrigger>
                  <TabsTrigger value="overdue" className="text-orange-600">Overdue ({stats.overdue})</TabsTrigger>
                  <TabsTrigger value="closed">Closed ({stats.closed})</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab}>
                  {isLoading ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : isError ? (
                    <Alert variant="destructive">
                      <AlertCircle className="w-4 h-4" />
                      <AlertDescription>
                        Failed to load CAPAs: {error?.message || "Unknown error"}
                      </AlertDescription>
                    </Alert>
                  ) : filteredCAPAs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileCheck2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No CAPAs found in this category</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>CAPA ID</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Responsible</TableHead>
                            <TableHead>Target Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredCAPAs.map((capa) => {
                            const isOverdue = capa.status !== "Closed" &&
                              new Date(capa.targetCompletionDate) < new Date();

                            return (
                              <TableRow key={capa.capaId} className={isOverdue ? "bg-orange-50" : ""}>
                                <TableCell className="font-mono font-medium">{capa.capaId}</TableCell>
                                <TableCell>
                                  <Badge variant={capa.type === "Corrective" ? "default" : "secondary"}>
                                    {capa.type}
                                  </Badge>
                                </TableCell>
                                <TableCell>{capa.sourceOfCAPA}</TableCell>
                                <TableCell className="max-w-xs truncate">{capa.description}</TableCell>
                                <TableCell>{capa.responsiblePerson}</TableCell>
                                <TableCell className={isOverdue ? "text-orange-600 font-medium" : ""}>
                                  {capa.targetCompletionDate}
                                  {isOverdue && <AlertTriangle className="w-4 h-4 inline ml-1" />}
                                </TableCell>
                                <TableCell>
                                  <Badge className={getCAPAStatusColor(capa.status)}>
                                    {capa.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate(`/capa/${encodeURIComponent(capa.capaId)}`)}
                                  >
                                    View
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
    </AppShell>
  );
}
