import React, { useState } from 'react';
import {
  ShieldCheck,
  Calendar,
  CheckCircle,
  AlertCircle,
  FileText,
  Download,
  Users,
  ClipboardCheck,
  Plus,
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
import { Input } from '@/components/ui/input';

// ============================================================================
// INTERNAL AUDIT PROGRAM
// ISO 9001:2015 Clause 9.2
// ============================================================================

interface AuditPlan {
  id: string;
  auditPeriod: string;
  scope: string[];
  auditor: string;
  auditee: string;
  plannedDate: string;
  status: 'Planned' | 'In Progress' | 'Completed' | 'Overdue';
  findings: number;
  reportId?: string;
}

interface Auditor {
  id: string;
  name: string;
  qualification: string;
  lastTraining: string;
  competenceVerified: boolean;
  assignedAreas: string[];
  totalAudits: number;
}

const AUDITORS: Auditor[] = [
  {
    id: 'AUD-001',
    name: 'Ahmed Khaled',
    qualification: 'ISO 9001:2015 Lead Auditor (IRCA)',
    lastTraining: '2025-06-15',
    competenceVerified: true,
    assignedAreas: ['Management', 'Quality'],
    totalAudits: 12,
  },
  {
    id: 'AUD-002',
    name: 'Maria Magdy',
    qualification: 'ISO 9001:2015 Internal Auditor',
    lastTraining: '2025-09-20',
    competenceVerified: true,
    assignedAreas: ['Operations', 'HR'],
    totalAudits: 8,
  },
];

const ANNUAL_AUDIT_PLAN: AuditPlan[] = [
  // Q1 Audits
  {
    id: 'IA-2026-001',
    auditPeriod: 'Q1 2026',
    scope: ['Sales Module', 'Customer Communication'],
    auditor: 'Ahmed Khaled',
    auditee: 'Sales Manager',
    plannedDate: '2026-03-15',
    status: 'Planned',
    findings: 0,
  },
  {
    id: 'IA-2026-002',
    auditPeriod: 'Q1 2026',
    scope: ['Operations Module', 'Production Planning'],
    auditor: 'Maria Magdy',
    auditee: 'Operations Manager',
    plannedDate: '2026-03-22',
    status: 'Planned',
    findings: 0,
  },
  // Q2 Audits
  {
    id: 'IA-2026-003',
    auditPeriod: 'Q2 2026',
    scope: ['Quality Module', 'CAPA Process', 'Nonconformity Control'],
    auditor: 'Ahmed Khaled',
    auditee: 'Quality Manager',
    plannedDate: '2026-06-10',
    status: 'Planned',
    findings: 0,
  },
  {
    id: 'IA-2026-004',
    auditPeriod: 'Q2 2026',
    scope: ['Procurement Module', 'Supplier Evaluation'],
    auditor: 'Maria Magdy',
    auditee: 'Procurement Manager',
    plannedDate: '2026-06-17',
    status: 'Planned',
    findings: 0,
  },
  // Q3 Audits
  {
    id: 'IA-2026-005',
    auditPeriod: 'Q3 2026',
    scope: ['HR Module', 'Training Records', 'Competence Verification'],
    auditor: 'Maria Magdy',
    auditee: 'HR Manager',
    plannedDate: '2026-09-15',
    status: 'Planned',
    findings: 0,
  },
  {
    id: 'IA-2026-006',
    auditPeriod: 'Q3 2026',
    scope: ['R&D Module', 'Design Process (if applicable)'],
    auditor: 'Ahmed Khaled',
    auditee: 'R&D Manager',
    plannedDate: '2026-09-22',
    status: 'Planned',
    findings: 0,
  },
  // Q4 Audits
  {
    id: 'IA-2026-007',
    auditPeriod: 'Q4 2026',
    scope: ['Management Module', 'Management Review Process'],
    auditor: 'Ahmed Khaled',
    auditee: 'CEO',
    plannedDate: '2026-11-15',
    status: 'Planned',
    findings: 0,
  },
  {
    id: 'IA-2026-008',
    auditPeriod: 'Q4 2026',
    scope: ['Full System Audit - All Modules'],
    auditor: 'Ahmed Khaled + Maria Magdy',
    auditee: 'All HODs',
    plannedDate: '2026-12-01',
    status: 'Planned',
    findings: 0,
  },
];

// Audit Criteria from ISO 9001:2015
const AUDIT_CRITERIA = [
  'ISO 9001:2015 Standard Requirements',
  'Organization Quality Manual',
  'Organization Procedures (P/00 to P/13)',
  'Organization Work Instructions',
  'Applicable Legal and Regulatory Requirements',
  'Customer-Specific Requirements',
  'Internal Process Performance Data',
];

export default function InternalAuditPage(): JSX.Element {
  const [selectedAudit, setSelectedAudit] = useState<AuditPlan | null>(null);
  const [selectedAuditor, setSelectedAuditor] = useState<Auditor | null>(null);
  const [filter, setFilter] = useState<'All' | 'Planned' | 'In Progress' | 'Completed'>('All');

  const filteredAudits =
    filter === 'All'
      ? ANNUAL_AUDIT_PLAN
      : ANNUAL_AUDIT_PLAN.filter((a) => a.status === filter);

  const completedCount = ANNUAL_AUDIT_PLAN.filter((a) => a.status === 'Completed').length;
  const plannedCount = ANNUAL_AUDIT_PLAN.filter((a) => a.status === 'Planned').length;
  const totalFindings = ANNUAL_AUDIT_PLAN.reduce((sum, a) => sum + a.findings, 0);

  const handleExport = () => {
    const csv = [
      'ID,Audit Period,Scope,Auditor,Auditee,Planned Date,Status,Findings',
      ...ANNUAL_AUDIT_PLAN.map(
        (a) =>
          `${a.id},${a.auditPeriod},"${a.scope.join('; ')}",${a.auditor},${a.auditee},${a.plannedDate},${a.status},${a.findings}`
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `internal-audit-program-2026.csv`;
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
              Internal Audit Program
            </h1>
            <p className="text-muted-foreground mt-1">
              ISO 9001:2015 Clause 9.2 — Annual audit schedule and competency
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Export Plan
            </Button>
          </div>
        </div>

        {/* ISO Notice */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="bg-blue-500 text-white rounded-full p-2">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                Clause 9.2 Compliance
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Comprehensive annual audit program covering all QMS processes. 
                Auditors trained and competent per IRCA standards. 
                Planning considers process importance and prior results.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Audit Program</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ANNUAL_AUDIT_PLAN.length} Audits</div>
              <p className="text-xs text-muted-foreground">Planned for 2026</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{completedCount}</div>
              <p className="text-xs text-muted-foreground">Audits done</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Planned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{plannedCount}</div>
              <p className="text-xs text-muted-foreground">Remaining audits</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Competent Auditors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{AUDITORS.length}</div>
              <p className="text-xs text-muted-foreground">IRCA certified</p>
            </CardContent>
          </Card>
        </div>

        {/* Auditors Section */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Competent Auditors
          </h2>          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {AUDITORS.map((auditor) => (
              <Card
                key={auditor.id}
                className="cursor-pointer hover:shadow-md"
                onClick={() => setSelectedAuditor(auditor)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{auditor.name}</CardTitle>
                      <CardDescription>{auditor.id}</CardDescription>
                    </div>
                    {auditor.competenceVerified && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Competent
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    {auditor.qualification}
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {auditor.totalAudits} audits
                    </span>
                    <span className="flex items-center">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Training: {auditor.lastTraining}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Audit Criteria */}
        <div className="bg-muted p-4 rounded-lg">
          <h3 className="font-semibold mb-3 flex items-center">
            <ClipboardCheck className="h-4 w-4 mr-2" />
            Audit Criteria (ISO 9.2.1)
          </h3>          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {AUDIT_CRITERIA.map((criterion, idx) => (
              <li key={idx} className="text-sm flex items-start">
                <CheckCircle className="h-4 w-4 mr-2 text-green-500 flex-shrink-0" />
                {criterion}
              </li>
            ))}
          </ul>
        </div>

        {/* Annual Plan */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Annual Audit Schedule</h2>

          {/* Filter */}
          <div className="flex gap-2 mb-4">
            {(['All', 'Planned', 'In Progress', 'Completed'] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(f)}
              >
                {f}
              </Button>
            ))}
          </div>

          {/* Audit List */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 text-sm font-medium">Audit ID</th>
                  <th className="text-left p-3 text-sm font-medium">Period</th>
                  <th className="text-left p-3 text-sm font-medium">Scope</th>
                  <th className="text-left p-3 text-sm font-medium">Auditor</th>
                  <th className="text-left p-3 text-sm font-medium">Date</th>
                  <th className="text-left p-3 text-sm font-medium">Status</th>
                  <th className="text-left p-3 text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAudits.map((audit) => (
                  <tr key={audit.id} className="border-t hover:bg-muted/50">
                    <td className="p-3 font-medium">{audit.id}</td>
                    <td className="p-3">{audit.auditPeriod}</td>
                    <td className="p-3">
                      <div className="text-sm">{audit.scope.join(', ')}</div>
                    </td>
                    <td className="p-3 text-sm">{audit.auditor}</td>
                    <td className="p-3 text-sm">{audit.plannedDate}</td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          audit.status === 'Completed'
                            ? 'bg-green-100 text-green-800'
                            : audit.status === 'In Progress'
                            ? 'bg-blue-100 text-blue-800'
                            : audit.status === 'Overdue'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {audit.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedAudit(audit)}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Detail Dialog */}
        {selectedAudit && (
          <Dialog open={!!selectedAudit} onOpenChange={() => setSelectedAudit(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{selectedAudit.id}</DialogTitle>
                <DialogDescription>
                  {selectedAudit.auditPeriod} Internal Audit
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <h4 className="font-semibold mb-2">Audit Scope:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {selectedAudit.scope.map((s, idx) => (
                      <li key={idx} className="text-sm">{s}</li>
                    ))}
                  </ul>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Auditor:</span>
                    <div>{selectedAudit.auditor}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Auditee:</span>
                    <div>{selectedAudit.auditee}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Planned Date:</span>
                    <div>{selectedAudit.plannedDate}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <div>{selectedAudit.status}</div>
                  </div>
                </div>
                {selectedAudit.reportId && (
                  <div className="bg-muted p-3 rounded">
                    <span className="text-sm font-medium">Report ID: {selectedAudit.reportId}</span>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Auditor Detail Dialog */}
        {selectedAuditor && (
          <Dialog open={!!selectedAuditor} onOpenChange={() => setSelectedAuditor(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{selectedAuditor.name}</DialogTitle>
                <DialogDescription>{selectedAuditor.id}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="bg-muted p-4 rounded">
                  <h4 className="font-semibold mb-2">Qualification</h4>
                  <p className="text-sm">{selectedAuditor.qualification}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Last Training:</span>
                    <div>{selectedAuditor.lastTraining}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Audits:</span>
                    <div>{selectedAuditor.totalAudits}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Competence:</span>
                    <div>{selectedAuditor.competenceVerified ? '✅ Verified' : '⏳ Pending'}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Assigned Areas</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedAuditor.assignedAreas.map((area, idx) => (
                      <span
                        key={idx}
                        className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppShell>
  );
}
