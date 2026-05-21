import React, { useState } from 'react';
import {
  BookOpen,
  FileText,
  Search,
  Download,
  CheckCircle,
  AlertCircle,
  Users,
  Clock,
  Filter,
  Edit3,
  Eye,
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
// WORK INSTRUCTIONS REGISTER
// ISO 9001:2015 Clause 8.5.1
// ============================================================================

interface WorkInstruction {
  id: string;
  title: string;
  process: string;
  version: string;
  issueDate: string;
  reviewDate: string;
  status: 'Active' | 'Under Review' | 'Superseded';
  author: string;
  approver: string;
  affectedRoles: string[];
  steps: number;
  attachments: number;
  lastUpdated: string;
}

const WORK_INSTRUCTIONS: WorkInstruction[] = [
  {
    id: 'WI-OPS-001',
    title: 'Image Annotation Quality Standards',
    process: 'Operations',
    version: '1.2',
    issueDate: '2025-06-15',
    reviewDate: '2026-06-15',
    status: 'Active',
    author: 'Quality Manager',
    approver: 'Operations Manager',
    affectedRoles: ['Data Annotator', 'QC Specialist'],
    steps: 12,
    attachments: 3,
    lastUpdated: '2025-11-20',
  },
  {
    id: 'WI-OPS-002',
    title: 'Text Classification Guidelines',
    process: 'Operations',
    version: '1.0',
    issueDate: '2025-08-01',
    reviewDate: '2026-08-01',
    status: 'Active',
    author: 'Operations Manager',
    approver: 'Quality Manager',
    affectedRoles: ['Data Annotator', 'Team Leader'],
    steps: 8,
    attachments: 2,
    lastUpdated: '2025-08-01',
  },
  {
    id: 'WI-OPS-003',
    title: 'Audio Transcription Quality Control',
    process: 'Operations',
    version: '1.1',
    issueDate: '2025-09-10',
    reviewDate: '2026-09-10',
    status: 'Active',
    author: 'Senior QC Lead',
    approver: 'Quality Manager',
    affectedRoles: ['QC Specialist', 'Data Annotator'],
    steps: 15,
    attachments: 4,
    lastUpdated: '2025-12-05',
  },
  {
    id: 'WI-QC-001',
    title: 'Sampling Method for Batch Inspection',
    process: 'Quality',
    version: '2.0',
    issueDate: '2025-05-20',
    reviewDate: '2026-05-20',
    status: 'Active',
    author: 'Quality Manager',
    approver: 'CEO',
    affectedRoles: ['QC Specialist', 'Operations Manager'],
    steps: 10,
    attachments: 1,
    lastUpdated: '2025-10-15',
  },
  {
    id: 'WI-QC-002',
    title: 'Defect Classification and Coding',
    process: 'Quality',
    version: '1.3',
    issueDate: '2025-07-01',
    reviewDate: '2026-07-01',
    status: 'Under Review',
    author: 'Quality Manager',
    approver: 'Operations Manager',
    affectedRoles: ['QC Specialist', 'Data Annotator'],
    steps: 18,
    attachments: 5,
    lastUpdated: '2026-01-10',
  },
  {
    id: 'WI-HR-001',
    title: 'New Annotator Onboarding Procedure',
    process: 'HR',
    version: '1.0',
    issueDate: '2025-10-01',
    reviewDate: '2026-10-01',
    status: 'Active',
    author: 'HR Manager',
    approver: 'Operations Manager',
    affectedRoles: ['HR Officer', 'Team Leader', 'Data Annotator'],
    steps: 22,
    attachments: 6,
    lastUpdated: '2025-10-01',
  },
  {
    id: 'WI-IT-001',
    title: 'Data Security Handling Protocol',
    process: 'IT',
    version: '1.1',
    issueDate: '2025-11-01',
    reviewDate: '2026-11-01',
    status: 'Active',
    author: 'IT Manager',
    approver: 'Quality Manager',
    affectedRoles: ['All Staff'],
    steps: 14,
    attachments: 2,
    lastUpdated: '2025-12-20',
  },
];

const STEP_TEMPLATES: Record<string, string[]> = {
  'WI-OPS-001': [
    '1. Review customer requirements and annotation guidelines',
    '2. Verify image quality before annotation',
    '3. Apply bounding boxes per WI-OPS-001-A Appendix',
    '4. Validate object classification against taxonomy',
    '5. Check for occlusion handling',
    '6. Self-review annotation accuracy',
    '7. Submit for peer review if required',
    '8. Document any anomalies',
    '9. Update production log (F/43)',
    '10. Notify supervisor of completion',
    '11. Handle rework if QC rejects',
    '12. Final sign-off in QMS system',
  ],
};

export default function WorkInstructionsPage(): JSX.Element {
  const [selectedWI, setSelectedWI] = useState<WorkInstruction | null>(null);
  const [filter, setFilter] = useState<'All' | 'Active' | 'Under Review'>('All');
  const [search, setSearch] = useState('');
  const [processFilter, setProcessFilter] = useState<string>('All');

  const processes = ['All', ...new Set(WORK_INSTRUCTIONS.map((wi) => wi.process))];

  const filteredWI = WORK_INSTRUCTIONS.filter((wi) => {
    const matchesStatus = filter === 'All' || wi.status === filter;
    const matchesProcess = processFilter === 'All' || wi.process === processFilter;
    const matchesSearch =
      wi.title.toLowerCase().includes(search.toLowerCase()) ||
      wi.id.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesProcess && matchesSearch;
  });

  const activeCount = WORK_INSTRUCTIONS.filter((wi) => wi.status === 'Active').length;
  const underReview = WORK_INSTRUCTIONS.filter((wi) => wi.status === 'Under Review').length;
  const totalSteps = WORK_INSTRUCTIONS.reduce((sum, wi) => sum + wi.steps, 0);

  return (
    <AppShell>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Work Instructions</h1>
            <p className="text-muted-foreground mt-1">
              ISO 9001:2015 Clause 8.5.1 — Controlled conditions for operations
            </p>
          </div>          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export Index
            </Button>
          </div>
        </div>

        {/* ISO Notice */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="bg-blue-500 text-white rounded-full p-2">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                Clause 8.5.1 Requirement
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Work instructions define controlled conditions for service delivery.
                Include step-by-step procedures, quality criteria, and handling requirements.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total WI</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{WORK_INSTRUCTIONS.length}</div>              <p className="text-xs text-muted-foreground">Work instructions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeCount}</div>              <p className="text-xs text-green-500">In use</p>
            </CardContent>
          </Card>

          <Card className="border-yellow-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Under Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{underReview}</div>              <p className="text-xs text-yellow-500">Update pending</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSteps}</div>              <p className="text-xs text-muted-foreground">Documented procedures</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search work instructions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-md border border-input"
            />
          </div>

          <select
            value={processFilter}
            onChange={(e) => setProcessFilter(e.target.value)}
            className="rounded-md border border-input px-4 py-2"
          >
            {processes.map((p) => (
              <option key={p} value={p}>
                Process: {p}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            {['All', 'Active', 'Under Review'].map((f) => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(f as typeof filter)}
              >
                {f}
              </Button>
            ))}
          </div>
        </div>

        {/* WI Table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 text-sm font-medium">ID</th>
                <th className="text-left p-3 text-sm font-medium">Title</th>
                <th className="text-left p-3 text-sm font-medium">Process</th>
                <th className="text-left p-3 text-sm font-medium">Version</th>
                <th className="text-left p-3 text-sm font-medium">Status</th>
                <th className="text-left p-3 text-sm font-medium">Review Date</th>
                <th className="text-left p-3 text-sm font-medium">Steps</th>
                <th className="text-left p-3 text-sm font-medium">Actions</th>
              </tr>
            </thead>            <tbody>
              {filteredWI.map((wi) => (
                <tr key={wi.id} className="border-t hover:bg-muted/50">
                  <td className="p-3 font-mono text-sm">{wi.id}</td>
                  <td className="p-3">
                    <div className="font-medium">{wi.title}</div>
                    <div className="text-xs text-muted-foreground">{wi.affectedRoles.join(', ')}</div>
                  </td>
                  <td className="p-3 text-sm">{wi.process}</td>
                  <td className="p-3">
                    <span className="text-sm font-mono">v{wi.version}</span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        wi.status === 'Active'
                          ? 'bg-green-100 text-green-800'
                          : wi.status === 'Under Review'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {wi.status === 'Active' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {wi.status === 'Under Review' && <Edit3 className="h-3 w-3 mr-1" />}
                      {wi.status}
                    </span>
                  </td>
                  <td className="p-3 text-sm">{wi.reviewDate}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                      {wi.steps} steps
                    </span>
                  </td>
                  <td className="p-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedWI(wi)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Detail Dialog */}
        {selectedWI && (
          <Dialog open={!!selectedWI} onOpenChange={() => setSelectedWI(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  {selectedWI.title}
                </DialogTitle>                <DialogDescription>
                  {selectedWI.id} • Version {selectedWI.version} • {selectedWI.process} Process
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Meta Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Author:</span>
                    <div>{selectedWI.author}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Approved By:</span>
                    <div>{selectedWI.approver}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Issue Date:</span>
                    <div>{selectedWI.issueDate}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Next Review:</span>
                    <div>{selectedWI.reviewDate}</div>
                  </div>
                </div>

                {/* Affected Roles */}
                <div>
                  <h4 className="font-semibold mb-2 flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    Affected Roles
                  </h4>                  <div className="flex flex-wrap gap-2">
                    {selectedWI.affectedRoles.map((role, idx) => (
                      <span
                        key={idx}
                        className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Steps Preview */}
                {STEP_TEMPLATES[selectedWI.id] ? (
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold mb-3 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Procedure Steps ({selectedWI.steps})
                    </h4>                    <ol className="list-decimal list-inside space-y-2">
                      {STEP_TEMPLATES[selectedWI.id].map((step, idx) => (
                        <li key={idx} className="text-sm">{step.substring(3)}</li>
                      ))}
                    </ol>                  </div>
                ) : (
                  <div className="bg-muted p-4 rounded-lg text-center">
                    <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Full work instruction available in document control system
                    </p>
                    <Button variant="outline" size="sm" className="mt-2">
                      View Full Document
                    </Button>
                  </div>
                )}

                {/* Attachments */}
                <div>
                  <h4 className="font-semibold mb-2">Attachments</h4>                  <div className="space-y-2">
                    {[...Array(selectedWI.attachments)].map((_, idx) => (
                      <div
                        key={idx}
                        className="flex items-center p-2 bg-gray-50 rounded text-sm"
                      >
                        <FileText className="h-4 w-4 mr-2 text-blue-500" />
                        {selectedWI.id}-Appendix-{String.fromCharCode(65 + idx)}.pdf
                      </div>
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
