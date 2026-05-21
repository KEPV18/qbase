import React, { useState } from 'react';
import {
  Building2,
  Globe,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  FileText,
  Download,
  Calendar,
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
// CONTEXT OF ORGANIZATION ANALYSIS
// ISO 9001:2015 Clause 4.1 & 4.2
// ============================================================================

interface ContextIssue {
  id: string;
  category: 'Internal' | 'External';
  subCategory: string;
  issue: string;
  riskLevel: 'High' | 'Medium' | 'Low';
  opportunities: string[];
  risks: string[];
  monitoringMethod: string;
  responsibleHOD: string;
  reviewDate: string;
}

const CONTEXT_ISSUES: ContextIssue[] = [
  // INTERNAL ISSUES
  {
    id: 'CTX-001',
    category: 'Internal',
    subCategory: 'Organizational Culture',
    issue: 'ISO 9001:2015 certification ambition drives quality-focused culture',
    riskLevel: 'Medium',
    opportunities: [
      'Competitive advantage in data annotation market',
      'Client trust through certification',
      'Process standardization benefits',
    ],
    risks: [
      'Resource allocation for certification process',
      'Staff training requirements',
    ],
    monitoringMethod: 'Monthly management review',
    responsibleHOD: 'CEO',
    reviewDate: '2026-04-15',
  },
  {
    id: 'CTX-002',
    category: 'Internal',
    subCategory: 'Resource Capabilities',
    issue: 'Workforce of 100+ data annotators with varying skill levels',
    riskLevel: 'High',
    opportunities: [
      'Scalable workforce for large projects',
      'Multi-language annotation capabilities',
      'Domain expertise development',
    ],
    risks: [
      'Quality consistency across annotators',
      'Turnover impact on project delivery',
      'Training standardization challenges',
    ],
    monitoringMethod: 'Quarterly skills assessment',
    responsibleHOD: 'HR Manager',
    reviewDate: '2026-03-30',
  },
  {
    id: 'CTX-003',
    category: 'Internal',
    subCategory: 'Process Performance',
    issue: 'Web-based QMS platform implemented for process control',
    riskLevel: 'Low',
    opportunities: [
      'Real-time process monitoring',
      'Automated documentation',
      'Traceability across all records',
    ],
    risks: [
      'System downtime impact',
      'Data migration risks',
      'User adoption challenges',
    ],
    monitoringMethod: 'System uptime + user feedback',
    responsibleHOD: 'IT Manager',
    reviewDate: '2026-05-01',
  },

  // EXTERNAL ISSUES
  {
    id: 'CTX-004',
    category: 'External',
    subCategory: 'Market Competition',
    issue: 'Growing data annotation market with increasing competition',
    riskLevel: 'High',
    opportunities: [
      'ISO certification as differentiator',
      'Premium pricing for certified services',
      'Enterprise client acquisition',
    ],
    risks: [
      'Price pressure from competitors',
      'Client switching costs decreasing',
      'Technology automation threats',
    ],
    monitoringMethod: 'Quarterly market analysis',
    responsibleHOD: 'Sales Manager',
    reviewDate: '2026-04-01',
  },
  {
    id: 'CTX-005',
    category: 'External',
    subCategory: 'Legal/Regulatory',
    issue: 'GDPR compliance requirements for EU data subjects',
    riskLevel: 'High',
    opportunities: [
      'Compliance as market entry requirement',
      'Data protection reputation',
    ],
    risks: [
      'Non-compliance penalties (4% global revenue)',
      'Data breach legal consequences',
      'Cross-border transfer restrictions',
    ],
    monitoringMethod: 'Legal compliance audit',
    responsibleHOD: 'Quality Manager',
    reviewDate: '2026-03-15',
  },
  {
    id: 'CTX-006',
    category: 'External',
    subCategory: 'Technology Trends',
    issue: 'Rapid advancement in AI/ML automation',
    riskLevel: 'Medium',
    opportunities: [
      'Higher-value annotation services',
      'AI-assisted quality control',
      'Tool development opportunities',
    ],
    risks: [
      'Automated annotation reducing demand',
      'Skill obsolescence',
      'Investment in new tools required',
    ],
    monitoringMethod: 'Technology watch reports',
    responsibleHOD: 'R&D Manager',
    reviewDate: '2026-06-01',
  },
  {
    id: 'CTX-007',
    category: 'External',
    subCategory: 'Economic Climate',
    issue: 'Economic uncertainty affecting client budgets',
    riskLevel: 'Medium',
    opportunities: [
      'Cost-conscious clients seeking efficiency',
      'Outsourcing trend continuation',
    ],
    risks: [
      'Client budget cuts',
      'Delayed projects',
      'Payment delays',
    ],
    monitoringMethod: 'Client portfolio revenue analysis',
    responsibleHOD: 'Finance Manager',
    reviewDate: '2026-04-30',
  },
  {
    id: 'CTX-008',
    category: 'External',
    subCategory: 'Client Requirements',
    issue: 'Increasing client demand for certified processes',
    riskLevel: 'High',
    opportunities: [
      'ISO 9001:2015 as competitive requirement',
      'Premium service positioning',
    ],
    risks: [
      'Client loss without certification',
      'RFP disqualification',
    ],
    monitoringMethod: 'Client requirement tracking',
    responsibleHOD: 'Sales Manager',
    reviewDate: '2026-03-01',
  },
];

export default function ContextAnalysisPage(): JSX.Element {
  const [selectedIssue, setSelectedIssue] = useState<ContextIssue | null>(null);
  const [filter, setFilter] = useState<'All' | 'Internal' | 'External'>('All');

  const filteredIssues =
    filter === 'All'
      ? CONTEXT_ISSUES
      : CONTEXT_ISSUES.filter((i) => i.category === filter);

  const internalCount = CONTEXT_ISSUES.filter((i) => i.category === 'Internal').length;
  const externalCount = CONTEXT_ISSUES.filter((i) => i.category === 'External').length;
  const highRiskCount = CONTEXT_ISSUES.filter((i) => i.riskLevel === 'High').length;

  const handleExport = () => {
    const csv = [
      'ID,Category,SubCategory,Issue,RiskLevel,Opportunities,Risks,ResponsibleHOD,ReviewDate',
      ...CONTEXT_ISSUES.map(
        (i) =>
          `${i.id},${i.category},${i.subCategory},"${i.issue}",${i.riskLevel},"${i.opportunities.join('; ')}","${i.risks.join('; ')}",${i.responsibleHOD},${i.reviewDate}`
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `context-analysis-${new Date().toISOString().split('T')[0]}.csv`;
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
              Context of Organization Analysis
            </h1>
            <p className="text-muted-foreground mt-1">
              ISO 9001:2015 Clause 4.1 — Understanding organization and context
            </p>
          </div>
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export Analysis
          </Button>
        </div>

        {/* ISO Notice */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="bg-blue-500 text-white rounded-full p-2">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                Clause 4.1 Compliance
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Analysis of internal and external issues relevant to purpose and strategic direction.
                Reviewed per P/01 procedure. Risks and opportunities documented per Clause 6.1.
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{CONTEXT_ISSUES.length}</div>
              <p className="text-xs text-muted-foreground">Internal + External</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Internal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{internalCount}</div>
              <p className="text-xs text-muted-foreground">Organizational factors</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">External</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{externalCount}</div>
              <p className="text-xs text-muted-foreground">Market & environment</p>
            </CardContent>
          </Card>

          <Card className="border-red-200 dark:border-red-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center text-red-600">
                <AlertTriangle className="h-4 w-4 mr-1" />
                High Risk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{highRiskCount}</div>
              <p className="text-xs text-red-500">Require mitigation plans</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {(['All', 'Internal', 'External'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f === 'All' && <Globe className="h-4 w-4 mr-1" />}
              {f === 'Internal' && <Building2 className="h-4 w-4 mr-1" />}
              {f === 'External' && <TrendingUp className="h-4 w-4 mr-1" />}
              {f}
            </Button>
          ))}
        </div>

        {/* Issues Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredIssues.map((issue) => (
            <Card
              key={issue.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedIssue(issue)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{issue.issue}</CardTitle>
                    <CardDescription className="mt-1">
                      {issue.id} • {issue.subCategory}
                    </CardDescription>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      issue.riskLevel === 'High'
                        ? 'bg-red-100 text-red-800'
                        : issue.riskLevel === 'Medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {issue.riskLevel}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center text-muted-foreground">
                      <Building2 className="h-3 w-3 mr-1" />
                      {issue.responsibleHOD}
                    </span>
                    <span className="flex items-center text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-1" />
                      {issue.reviewDate}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm">
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Detail Dialog */}
        {selectedIssue && (
          <Dialog open={!!selectedIssue} onOpenChange={() => setSelectedIssue(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{selectedIssue.issue}</DialogTitle>
                <DialogDescription>
                  {selectedIssue.id} • {selectedIssue.category} • {selectedIssue.subCategory}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Opportunities */}
                <div>
                  <h4 className="text-sm font-semibold flex items-center text-green-600 mb-2">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Opportunities
                  </h4>
                  <ul className="space-y-1">
                    {selectedIssue.opportunities.map((opp, idx) => (
                      <li key={idx} className="text-sm flex items-start">
                        <span className="text-green-500 mr-2">+</span>
                        {opp}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Risks */}
                <div>
                  <h4 className="text-sm font-semibold flex items-center text-red-600 mb-2">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Risks
                  </h4>
                  <ul className="space-y-1">
                    {selectedIssue.risks.map((risk, idx) => (
                      <li key={idx} className="text-sm flex items-start">
                        <span className="text-red-500 mr-2">⚠</span>
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Monitoring */}
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="text-sm font-semibold flex items-center mb-2">
                    <FileText className="h-4 w-4 mr-2" />
                    Monitoring & Review
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Method:</span>
                      <div>{selectedIssue.monitoringMethod}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Responsible:</span>
                      <div>{selectedIssue.responsibleHOD}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Next Review:</span>
                      <div>{selectedIssue.reviewDate}</div>
                    </div>
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
