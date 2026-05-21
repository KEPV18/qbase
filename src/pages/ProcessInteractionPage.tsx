import React, { useState } from 'react';
import {
  ArrowRight,
  ArrowLeftRight,
  Settings,
  Users,
  CheckCircle,
  FileText,
  Search,
  Download,
  Scale,
  Layers,
  Target,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

// ============================================================================
// PROCESS INTERACTION MAP (SIPOC)
// ISO 9001:2015 Clause 4.4
// ============================================================================

interface ProcessNode {
  id: string;
  name: string;
  owner: string;
  isoClause: string;
  inputs: string[];
  outputs: string[];
  interfaces: string[];
  kpi: string[];
  procedure: string;
}

const QMS_PROCESSES: ProcessNode[] = [
  {
    id: 'P-01',
    name: 'Sales & Contract Review',
    owner: 'Sales Manager',
    isoClause: '8.2',
    inputs: [
      'Customer Inquiry',
      'RFQ (Request for Quote)',
      'Technical Specifications',
      'Capacity Assessment',
    ],
    outputs: [
      'Quotation (F/19)',
      'Customer Acceptance',
      'Sales Order',
      'Project Brief',
    ],
    interfaces: ['P-02 Operations', 'P-07 Management Review'],
    kpi: ['Quote Response Time', 'Win Rate', 'Contract Accuracy'],
    procedure: 'P/01 - Sales Process',
  },
  {
    id: 'P-02',
    name: 'Operations - Annotation',
    owner: 'Operations Manager',
    isoClause: '8.5',
    inputs: [
      'Project Requirements (F/11, F/28)',
      'Raw Data from Customer',
      'Trained Annotators',
      'Annotation Guidelines',
    ],
    outputs: [
      'Annotated Dataset (per F/43)',
      'Quality Metrics',
      'Production Reports',
      'Agent Performance Data',
    ],
    interfaces: ['P-01 Sales', 'P-03 Quality', 'P-06 HR'],
    kpi: ['Throughput', 'Accuracy Rate', 'On-Time Delivery'],
    procedure: 'P/02 - Production Control',
  },
  {
    id: 'P-03',
    name: 'Quality Control & Assurance',
    owner: 'Quality Manager',
    isoClause: '8.6, 8.7',
    inputs: [
      'Annotated Data (from P-02)',
      'Quality Standards (F/42)',
      'Customer Requirements',
      'Audit Results',
    ],
    outputs: [
      'QC Verified Output',
      'Nonconformity Reports (F/08)',
      'CAPA Actions (F/22)',
      'Quality Metrics',
    ],
    interfaces: ['P-02 Operations', 'P-04 Procurement'],
    kpi: ['Defect Rate', 'Rework %', 'First Pass Yield'],
    procedure: 'P/03 - Quality Control',
  },
  {
    id: 'P-04',
    name: 'Procurement - External Providers',
    owner: 'Procurement Manager',
    isoClause: '8.4',
    inputs: [
      'Procurement Request (F/12)',
      'Approved Vendor List (F/15)',
      'Specifications',
      'Budget Approval',
    ],
    outputs: [
      'Purchase Order (F/16)',
      'Goods/Services Received',
      'Inspection Report (F/14)',
      'Supplier Performance Data',
    ],
    interfaces: ['P-03 Quality', 'P-07 Management'],
    kpi: ['Supplier On-Time %', 'Quality Acceptance Rate', 'Cost Variance'],
    procedure: 'P/04 - Purchasing Process',
  },
  {
    id: 'P-05',
    name: 'HR - Competence & Training',
    owner: 'HR Manager',
    isoClause: '7.1, 7.2',
    inputs: [
      'Headcount Request (F/11)',
      'Training Needs (F/02)',
      'Performance Gaps',
      'Budget',
    ],
    outputs: [
      'Trained Personnel (F/28)',
      'Training Records',
      'Competence Verification',
      'Authorization Records',
    ],
    interfaces: ['P-02 Operations', 'P-09 Audit'],
    kpi: ['Training Completion %', 'Competence Assessment Pass Rate'],
    procedure: 'P/05 - HR Management',
  },
  {
    id: 'P-06',
    name: 'Customer Property Control',
    owner: 'Operations Manager',
    isoClause: '8.5.3',
    inputs: [
      'Customer Raw Data',
      'IP Agreements',
      'Security Protocols',
      'Handling Requirements',
    ],
    outputs: [
      'Customer Data Inventory (F/50)',
      'Security Audit Reports',
      'Data Destruction Records',
      'Transfer Logs',
    ],
    interfaces: ['P-02 Operations', 'P-07 Management'],
    kpi: ['Data Security Incidents', 'Property Loss Events'],
    procedure: 'P/06 - Customer Property',
  },
  {
    id: 'P-07',
    name: 'Management Review',
    owner: 'CEO',
    isoClause: '9.3',
    inputs: [
      'KPI Dashboard',
      'Audit Results',
      'Customer Feedback',
      'Nonconformity Trends',
      'Context Changes',
    ],
    outputs: [
      'Management Review Minutes (F/21)',
      'Action Items',
      'Resource Decisions',
      'Policy Updates',
    ],
    interfaces: ['All Processes'],
    kpi: ['Action Item Completion %', 'Review Frequency Compliance'],
    procedure: 'P/07 - Management Review',
  },
  {
    id: 'P-08',
    name: 'Nonconformity & CAPA',
    owner: 'Quality Manager',
    isoClause: '10.2',
    inputs: [
      'Nonconformity Reports (F/08)',
      'Customer Complaints (F/09)',
      'Audit Findings',
      'Process Deviations',
    ],
    outputs: [
      'CAPA Records (F/22)',
      'Corrective Action Evidence',
      'Procedure Updates',
      'Training Alerts',
    ],
    interfaces: ['P-03 Quality', 'P-07 Management'],
    kpi: ['CAPA Closure Rate', 'Effectiveness Verification %'],
    procedure: 'P/08 - CAPA Process',
  },
  {
    id: 'P-09',
    name: 'Internal Audit',
    owner: 'Lead Auditor',
    isoClause: '9.2',
    inputs: [
      'Audit Schedule (F/25)',
      'Audit Criteria',
      'Process Documentation',
      'Previous Findings',
    ],
    outputs: [
      'Audit Reports (F/48)',
      'Nonconformity Reports',
      'Audit Evidence',
      'Management Review Input',
    ],
    interfaces: ['P-07 Management', 'All Modules'],
    kpi: ['Audit Schedule Compliance', 'Finding Closure Rate'],
    procedure: 'P/09 - Internal Audit',
  },
];

// Process categories for filtering
const CATEGORIES = [
  { id: 'core', name: 'Core (COP)', desc: 'Customer-Oriented Processes' },
  { id: 'support', name: 'Support (SP)', desc: 'Support Processes' },
  { id: 'management', name: 'Management (MP)', desc: 'Management Processes' },
];

export default function ProcessInteractionPage(): JSX.Element {
  const [selectedProcess, setSelectedProcess] = useState<ProcessNode | null>(null);
  const [filter, setFilter] = useState<string>('All');
  const [search, setSearch] = useState('');

  const filteredProcesses = QMS_PROCESSES.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      p.owner.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const handleExport = () => {
    const csv = [
      'Process ID,Name,Owner,ISO Clause,Inputs,Outputs,Interfaces,KPI,Procedure',
      ...QMS_PROCESSES.map(
        (p) =>
          `${p.id},"${p.name}",${p.owner},${p.isoClause},"${p.inputs.join('; ')}","${p.outputs.join('; ')}","${p.interfaces.join('; ')}","${p.kpi.join('; ')}",${p.procedure}`
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `process-interaction-map-sipoc.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <AppShell>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Process Interaction Map
            </h1>
            <p className="text-muted-foreground mt-1">
              ISO 9001:2015 Clause 4.4 — QMS processes and their interactions (SIPOC)
            </p>
          </div>
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export SIPOC
          </Button>
        </div>

        {/* ISO Notice */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="bg-blue-500 text-white rounded-full p-2">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                Clause 4.4 Compliance — SIPOC Methodology
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Supplier-Input-Process-Output-Customer mapping for all QMS processes.
                Shows interfaces, ownership, ISO clauses, and KPIs per process.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Processes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{QMS_PROCESSES.length}</div>
              <p className="text-xs text-muted-foreground">Documented processes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">COP</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">Customer-oriented</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">SP</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">4</div>
              <p className="text-xs text-muted-foreground">Support processes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">MP</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2</div>
              <p className="text-xs text-muted-foreground">Management processes</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search processes, owners, clauses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-md border border-input bg-background"
            />
          </div>
        </div>

        {/* Process Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProcesses.map((process) => (
            <Card
              key={process.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedProcess(process)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-mono text-muted-foreground">
                      {process.id}
                    </div>
                    <CardTitle className="text-base">{process.name}</CardTitle>
                  </div>
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                    {process.isoClause}
                  </span>
                </div>              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center text-sm">
                    <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                    {process.owner}
                  </div>

                  <div className="flex items-center text-sm">
                    <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                    {process.procedure}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Interfaces:</span>
                    <div className="flex flex-wrap gap-1">
                      {process.interfaces.slice(0, 2).map((iface, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-gray-100 px-2 py-0.5 rounded"
                        >
                          {iface}
                        </span>
                      ))}
                      {process.interfaces.length > 2 && (
                        <span className="text-xs text-muted-foreground">
                          +{process.interfaces.length - 2}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <Target className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {process.kpi.length} KPIs defined
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Process Detail Dialog */}
        {selectedProcess && (
          <Dialog open={!!selectedProcess} onOpenChange={() => setSelectedProcess(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  {selectedProcess.name}
                </DialogTitle>
                <DialogDescription>
                  {selectedProcess.id} • Owner: {selectedProcess.owner} • ISO Clause: {selectedProcess.isoClause}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* SIPOC Grid */}
                <div className="grid grid-cols-5 gap-2">
                  <div className="text-center">
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-xs font-semibold text-green-700 mb-2">SUPPLIER</div>
                      <div className="text-xs space-y-1">
                        {selectedProcess.inputs.slice(0, 3).map((input, idx) => (
                          <div key={idx} className="bg-white p-1 rounded">{input}</div>
                        ))}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 mx-auto mt-1 text-green-500" />
                  </div>

                  <div className="text-center">
                    <div className="bg-blue-50 p-3 rounded-lg h-full">
                      <div className="text-xs font-semibold text-blue-700 mb-2">INPUT</div>
                      <div className="text-xs space-y-1">
                        {selectedProcess.inputs.map((input, idx) => (
                          <div key={idx} className="bg-white p-1 rounded">{input}</div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
                      <div className="text-xs font-semibold text-purple-700 mb-2">PROCESS</div>
                      <div className="text-sm font-medium">{selectedProcess.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">{selectedProcess.id}</div>
                    </div>
                    <ArrowLeftRight className="h-4 w-4 mx-auto mt-1 text-purple-500" />
                  </div>

                  <div className="text-center">
                    <div className="bg-orange-50 p-3 rounded-lg h-full">
                      <div className="text-xs font-semibold text-orange-700 mb-2">OUTPUT</div>
                      <div className="text-xs space-y-1">
                        {selectedProcess.outputs.map((output, idx) => (
                          <div key={idx} className="bg-white p-1 rounded">{output}</div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <ArrowRight className="h-4 w-4 mx-auto mb-1 text-red-500 rotate-180" />
                    <div className="bg-red-50 p-3 rounded-lg">
                      <div className="text-xs font-semibold text-red-700 mb-2">CUSTOMER</div>
                      <div className="text-xs space-y-1">
                        {selectedProcess.outputs.slice(0, 3).map((output, idx) => (
                          <div key={idx} className="bg-white p-1 rounded">{output}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Interfaces */}
                <div>
                  <h4 className="font-semibold mb-2 flex items-center">
                    <ArrowLeftRight className="h-4 w-4 mr-2" />
                    Process Interfaces
                  </h4>                  <div className="flex flex-wrap gap-2">
                    {selectedProcess.interfaces.map((iface, idx) => (
                      <span
                        key={idx}
                        className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                      >
                        {iface}
                      </span>
                    ))}
                  </div>
                </div>

                {/* KPIs */}
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold mb-3 flex items-center">
                    <Target className="h-4 w-4 mr-2" />
                    Key Performance Indicators
                  </h4>                  <ul className="space-y-2">
                    {selectedProcess.kpi.map((kpi, idx) => (
                      <li key={idx} className="text-sm flex items-center">
                        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                        {kpi}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Procedure Reference */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Documented Procedure
                  </h4>                  <p className="text-sm">{selectedProcess.procedure}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Referenced procedure document available in Procedures module
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppShell>
  );
}
