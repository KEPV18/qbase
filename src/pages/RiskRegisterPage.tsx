import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { useRiskData } from "@/hooks/useRiskData";
import { getRiskLevel, getRiskLevelColor } from "@/lib/riskRegisterService";
import type { RiskStatus, RiskInput } from "@/lib/riskRegisterService";
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
import {
  AlertTriangle,
  Plus,
  Shield,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  Target,
  Info
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function RiskRegisterPage() {
  const navigate = useNavigate();
  const { risks, stats, isLoading, isError, error, addRisk, updateRisk, isAdding } = useRiskData();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // New risk form state
  const [newRisk, setNewRisk] = useState<RiskInput>({
    processDepartment: "",
    riskDescription: "",
    cause: "",
    likelihood: 3,
    impact: 3,
    actionControl: "",
    owner: "",
    reviewDate: "",
  });

  const handleAddRisk = () => {
    addRisk(newRisk, {
      onSuccess: () => {
        setIsAddDialogOpen(false);
        setNewRisk({
          processDepartment: "",
          riskDescription: "",
          cause: "",
          likelihood: 3,
          impact: 3,
          actionControl: "",
          owner: "",
          reviewDate: "",
        });
      },
    });
  };

  const handleStatusChange = (riskId: string, newStatus: RiskStatus) => {
    updateRisk({ riskId, updates: { status: newStatus } });
  };

  const filteredRisks = statusFilter === "all"
    ? risks
    : risks.filter(r => r.status === statusFilter);

  return (
    <AppShell breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "Risk Register" }]}>
      <div className="space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-7 h-7 text-orange-500" />
                Risk Register
              </h1>
              <p className="text-muted-foreground mt-1">
                ISO 9001:2015 Clause 6.1 — Actions to address risks and opportunities
              </p>
            </div>
            <div className="flex gap-2">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Risk
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add New Risk</DialogTitle>
                    <DialogDescription>
                      Identify a new risk for monitoring. Risk Score will be calculated automatically.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="department">Process / Department</Label>
                        <Input
                          id="department"
                          value={newRisk.processDepartment}
                          onChange={(e) => setNewRisk({ ...newRisk, processDepartment: e.target.value })}
                          placeholder="e.g., Operations, Sales"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="owner">Risk Owner</Label>
                        <Input
                          id="owner"
                          value={newRisk.owner}
                          onChange={(e) => setNewRisk({ ...newRisk, owner: e.target.value })}
                          placeholder="Person responsible"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Risk Description</Label>
                      <Textarea
                        id="description"
                        value={newRisk.riskDescription}
                        onChange={(e) => setNewRisk({ ...newRisk, riskDescription: e.target.value })}
                        placeholder="Describe the identified risk..."
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cause">Cause / Source</Label>
                      <Textarea
                        id="cause"
                        value={newRisk.cause}
                        onChange={(e) => setNewRisk({ ...newRisk, cause: e.target.value })}
                        placeholder="Root cause or source of the risk..."
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="likelihood">Likelihood (1-5)</Label>
                        <Select
                          value={newRisk.likelihood.toString()}
                          onValueChange={(v) => setNewRisk({ ...newRisk, likelihood: parseInt(v) })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 - Rare</SelectItem>
                            <SelectItem value="2">2 - Unlikely</SelectItem>
                            <SelectItem value="3">3 - Possible</SelectItem>
                            <SelectItem value="4">4 - Likely</SelectItem>
                            <SelectItem value="5">5 - Almost Certain</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="impact">Impact (1-5)</Label>
                        <Select
                          value={newRisk.impact.toString()}
                          onValueChange={(v) => setNewRisk({ ...newRisk, impact: parseInt(v) })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 - Negligible</SelectItem>
                            <SelectItem value="2">2 - Minor</SelectItem>
                            <SelectItem value="3">3 - Moderate</SelectItem>
                            <SelectItem value="4">4 - Major</SelectItem>
                            <SelectItem value="5">5 - Catastrophic</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Risk Score</Label>
                        <div className={`h-10 flex items-center justify-center rounded-md font-bold ${getRiskLevelColor(newRisk.likelihood * newRisk.impact)}`}>
                          {newRisk.likelihood * newRisk.impact} - {getRiskLevel(newRisk.likelihood * newRisk.impact)}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="action">Action / Control Measures</Label>
                      <Textarea
                        id="action"
                        value={newRisk.actionControl}
                        onChange={(e) => setNewRisk({ ...newRisk, actionControl: e.target.value })}
                        placeholder="Control measures to mitigate this risk..."
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reviewDate">Review Date</Label>
                      <Input
                        id="reviewDate"
                        type="date"
                        value={newRisk.reviewDate}
                        onChange={(e) => setNewRisk({ ...newRisk, reviewDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <Alert>
                    <Info className="w-4 h-4" />
                    <AlertDescription>
                      Write operations require OAuth authentication. If using API Key, the operation will show an error.
                    </AlertDescription>
                  </Alert>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddRisk} disabled={isAdding}>
                      {isAdding ? "Adding..." : "Add Risk"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Risks</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <p className="text-2xl font-bold">{stats.total}</p>
                    )}
                  </div>
                  <Shield className="w-8 h-8 text-primary/20" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">High / Critical</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <p className="text-2xl font-bold text-red-600">{stats.highRisks}</p>
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
                    <p className="text-sm text-muted-foreground">Open Risks</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <p className="text-2xl font-bold text-yellow-600">{stats.open}</p>
                    )}
                  </div>
                  <Clock className="w-8 h-8 text-yellow-200" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Risk Score</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <p className="text-2xl font-bold">{stats.avgRiskScore}</p>
                    )}
                  </div>
                  <Target className="w-8 h-8 text-primary/20" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Risk Matrix Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-sm bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Low Risk</p>
                  <p className="text-xl font-bold">{isLoading ? "-" : stats.lowRisks}</p>
                  <p className="text-xs text-muted-foreground">Score 1-7</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-yellow-500">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-sm bg-yellow-100 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Medium Risk</p>
                  <p className="text-xl font-bold">{isLoading ? "-" : stats.mediumRisks}</p>
                  <p className="text-xs text-muted-foreground">Score 8-14</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-sm bg-red-100 flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">High/Critical Risk</p>
                  <p className="text-xl font-bold">{isLoading ? "-" : stats.highRisks}</p>
                  <p className="text-xs text-muted-foreground">Score 15-25</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Risk Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Risk Register</CardTitle>
                  <CardDescription>All identified risks and their current status</CardDescription>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="Under Review">Under Review</SelectItem>
                    <SelectItem value="Controlled">Controlled</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
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
                    Failed to load risks: {error?.message || "Unknown error"}
                  </AlertDescription>
                </Alert>
              ) : filteredRisks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No risks found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Risk ID</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-center">L</TableHead>
                        <TableHead className="text-center">I</TableHead>
                        <TableHead className="text-center">Score</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRisks.map((risk) => (
                        <TableRow key={risk.riskId}>
                          <TableCell className="font-mono font-medium">{risk.riskId}</TableCell>
                          <TableCell>{risk.processDepartment}</TableCell>
                          <TableCell className="max-w-xs truncate">{risk.riskDescription}</TableCell>
                          <TableCell className="text-center">{risk.likelihood}</TableCell>
                          <TableCell className="text-center">{risk.impact}</TableCell>
                          <TableCell className="text-center">
                            <Badge className={getRiskLevelColor(risk.riskScore)}>
                              {risk.riskScore}
                            </Badge>
                          </TableCell>
                          <TableCell>{risk.owner}</TableCell>
                          <TableCell>
                            <Select
                              value={risk.status}
                              onValueChange={(v) => handleStatusChange(risk.riskId, v as RiskStatus)}
                            >
                              <SelectTrigger className="w-32 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Open">Open</SelectItem>
                                <SelectItem value="Under Review">Under Review</SelectItem>
                                <SelectItem value="Controlled">Controlled</SelectItem>
                                <SelectItem value="Closed">Closed</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/risk/${encodeURIComponent(risk.riskId)}`)}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
    </AppShell>
  );
}
