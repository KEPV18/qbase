import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { useProcessData } from "@/hooks/useProcessData";
import { extractRecordCodes } from "@/lib/processInteractionService";
import type { ProcessInput } from "@/lib/processInteractionService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Network,
  Plus,
  RefreshCw,
  AlertCircle,
  Users,
  Target,
  FileText,
  ArrowRight,
  Info,
  BarChart3,
  Workflow
} from "lucide-react";

export default function ProcessInteractionPage() {
  const navigate = useNavigate();
  const { processes, stats, processFlow, isLoading, isError, error, refetch, addProcess, isAdding } = useProcessData();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<string | null>(null);

  // New process form state
  const [newProcess, setNewProcess] = useState<ProcessInput>({
    processName: "",
    processOwner: "",
    inputs: "",
    mainActivities: "",
    outputs: "",
    receiver: "",
    kpi: "",
  });

  const handleAddProcess = () => {
    addProcess(newProcess, {
      onSuccess: () => {
        setIsAddDialogOpen(false);
        setNewProcess({
          processName: "",
          processOwner: "",
          inputs: "",
          mainActivities: "",
          outputs: "",
          receiver: "",
          kpi: "",
        });
      },
    });
  };

  return (
    <AppShell breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "Process Interaction" }]}>
      <div className="space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Network className="w-7 h-7 text-purple-500" />
                Process Interaction Sheet
              </h1>
              <p className="text-muted-foreground mt-1">
                ISO 9001:2015 Clause 4.4 — Quality management system and its processes
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Process
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add New Process</DialogTitle>
                    <DialogDescription>
                      Define a new process and its interactions within the QMS.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="processName">Process Name</Label>
                        <Input
                          id="processName"
                          value={newProcess.processName}
                          onChange={(e) => setNewProcess({ ...newProcess, processName: e.target.value })}
                          placeholder="e.g., Order Processing"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="processOwner">Process Owner</Label>
                        <Input
                          id="processOwner"
                          value={newProcess.processOwner}
                          onChange={(e) => setNewProcess({ ...newProcess, processOwner: e.target.value })}
                          placeholder="Person responsible"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="inputs">Inputs</Label>
                      <Textarea
                        id="inputs"
                        value={newProcess.inputs}
                        onChange={(e) => setNewProcess({ ...newProcess, inputs: e.target.value })}
                        placeholder="Required inputs for this process..."
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="activities">Main Activities</Label>
                      <Textarea
                        id="activities"
                        value={newProcess.mainActivities}
                        onChange={(e) => setNewProcess({ ...newProcess, mainActivities: e.target.value })}
                        placeholder="Key activities performed in this process..."
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="outputs">Outputs (Records)</Label>
                      <Textarea
                        id="outputs"
                        value={newProcess.outputs}
                        onChange={(e) => setNewProcess({ ...newProcess, outputs: e.target.value })}
                        placeholder="Outputs and record codes (e.g., F/08, F/22)..."
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="receiver">Receiver</Label>
                        <Input
                          id="receiver"
                          value={newProcess.receiver}
                          onChange={(e) => setNewProcess({ ...newProcess, receiver: e.target.value })}
                          placeholder="Process or department receiving outputs"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="kpi">KPI (Key Performance Indicator)</Label>
                        <Input
                          id="kpi"
                          value={newProcess.kpi}
                          onChange={(e) => setNewProcess({ ...newProcess, kpi: e.target.value })}
                          placeholder="e.g., Order accuracy rate > 98%"
                        />
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <Info className="w-4 h-4" />
                    <AlertDescription>
                      Process names must be unique. KPIs are mandatory for ISO compliance.
                    </AlertDescription>
                  </Alert>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddProcess} disabled={isAdding}>
                      {isAdding ? "Adding..." : "Add Process"}
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
                    <p className="text-sm text-muted-foreground">Total Processes</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <p className="text-2xl font-bold">{stats.total}</p>
                    )}
                  </div>
                  <Workflow className="w-8 h-8 text-primary/20" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Process Owners</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <p className="text-2xl font-bold">{stats.uniqueOwners}</p>
                    )}
                  </div>
                  <Users className="w-8 h-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">KPI Coverage</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <p className="text-2xl font-bold text-green-600">{stats.kpiCoverage}%</p>
                    )}
                  </div>
                  <Target className="w-8 h-8 text-green-200" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Linked Records</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <p className="text-2xl font-bold">{stats.recordReferences}</p>
                    )}
                  </div>
                  <FileText className="w-8 h-8 text-purple-200" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Process Flow Visualization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="w-5 h-5" />
                Process Flow Map
              </CardTitle>
              <CardDescription>Visual representation of process interactions</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : processFlow.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Network className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No process flows defined yet</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-4 p-4 bg-muted/30 rounded-sm">
                  {processFlow.map((flow, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-background p-3 rounded-sm border shadow-sm"
                    >
                      <Badge variant="outline" className="font-medium">
                        {flow.from}
                      </Badge>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      <Badge variant="secondary" className="font-medium">
                        {flow.to}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Process Table */}
          <Card>
            <CardHeader>
              <CardTitle>Process Register</CardTitle>
              <CardDescription>All defined processes and their interactions</CardDescription>
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
                    Failed to load processes: {error?.message || "Unknown error"}
                  </AlertDescription>
                </Alert>
              ) : processes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Network className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No processes defined yet</p>
                  <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Process
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Process Name</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Inputs</TableHead>
                        <TableHead>Main Activities</TableHead>
                        <TableHead>Outputs</TableHead>
                        <TableHead>Receiver</TableHead>
                        <TableHead>KPI</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {processes.map((process) => {
                        const recordCodes = extractRecordCodes(process.outputs);

                        return (
                          <TableRow
                            key={process.processName}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => setSelectedProcess(
                              selectedProcess === process.processName ? null : process.processName
                            )}
                          >
                            <TableCell className="font-medium">
                              {process.processName}
                            </TableCell>
                            <TableCell>{process.processOwner}</TableCell>
                            <TableCell className="max-w-xs">
                              <span className="text-sm text-muted-foreground line-clamp-2">
                                {process.inputs}
                              </span>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <span className="text-sm text-muted-foreground line-clamp-2">
                                {process.mainActivities}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {recordCodes.length > 0 ? (
                                  recordCodes.map((code) => (
                                    <Badge
                                      key={code}
                                      variant="outline"
                                      className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/record/${encodeURIComponent(code)}`);
                                      }}
                                    >
                                      {code}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-sm text-muted-foreground">
                                    {process.outputs.substring(0, 30)}...
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{process.receiver}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Target className="w-3 h-3 text-muted-foreground" />
                                <span className="text-sm">{process.kpi}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Process Detail Panel */}
          {selectedProcess && (
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Process Details: {selectedProcess}</span>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedProcess(null)}>
                    Close
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const process = processes.find(p => p.processName === selectedProcess);
                  if (!process) return null;

                  return (
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium mb-2">Process Owner</h4>
                        <p className="text-muted-foreground">{process.processOwner}</p>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Receiver</h4>
                        <p className="text-muted-foreground">{process.receiver}</p>
                      </div>
                      <div className="col-span-2">
                        <h4 className="font-medium mb-2">Inputs</h4>
                        <p className="text-muted-foreground">{process.inputs}</p>
                      </div>
                      <div className="col-span-2">
                        <h4 className="font-medium mb-2">Main Activities</h4>
                        <p className="text-muted-foreground">{process.mainActivities}</p>
                      </div>
                      <div className="col-span-2">
                        <h4 className="font-medium mb-2">Outputs (Records)</h4>
                        <p className="text-muted-foreground">{process.outputs}</p>
                      </div>
                      <div className="col-span-2">
                        <h4 className="font-medium mb-2">KPI</h4>
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-primary" />
                          <p className="text-muted-foreground">{process.kpi}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}
      </div>
    </AppShell>
  );
}
