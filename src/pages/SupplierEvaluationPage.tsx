import React, { useState } from 'react';
import {
  Building2,
  Star,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Calendar,
  FileText,
  Download,
  Search,
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
// SUPPLIER EVALUATION REGISTER
// ISO 9001:2015 Clause 8.4
// ============================================================================

interface Supplier {
  id: string;
  name: string;
  category: 'Critical' | 'Non-Critical';
  services: string[];
  evaluationDate: string;
  nextEvaluation: string;
  qualityScore: number;
  deliveryScore: number;
  priceScore: number;
  overallScore: number;
  status: 'Approved' | 'Conditional' | 'Disqualified';
  riskLevel: 'High' | 'Medium' | 'Low';
  lastAudit?: string;
  auditFindings?: number;
  approvedBy: string;
}

const SUPPLIERS: Supplier[] = [
  {
    id: 'SUP-001',
    name: 'Al-Nasser Stationery',
    category: 'Non-Critical',
    services: ['Office Supplies', 'Stationery', 'Printing Materials'],
    evaluationDate: '2025-09-30',
    nextEvaluation: '2026-03-30',
    qualityScore: 85,
    deliveryScore: 90,
    priceScore: 88,
    overallScore: 87,
    status: 'Approved',
    riskLevel: 'Low',
    approvedBy: 'Procurement Manager',
  },
  {
    id: 'SUP-002',
    name: 'TechServer Egypt',
    category: 'Critical',
    services: ['Cloud Hosting', 'Data Storage', 'Security Services'],
    evaluationDate: '2025-12-15',
    nextEvaluation: '2026-06-15',
    qualityScore: 92,
    deliveryScore: 88,
    priceScore: 75,
    overallScore: 85,
    status: 'Approved',
    riskLevel: 'High',
    lastAudit: '2025-11-20',
    auditFindings: 2,
    approvedBy: 'IT Manager',
  },
  {
    id: 'SUP-003',
    name: 'Cairo IT Solutions',
    category: 'Critical',
    services: ['Hardware Supply', 'Technical Support', 'Maintenance'],
    evaluationDate: '2025-11-01',
    nextEvaluation: '2026-05-01',
    qualityScore: 78,
    deliveryScore: 82,
    priceScore: 90,
    overallScore: 83,
    status: 'Conditional',
    riskLevel: 'Medium',
    approvedBy: 'IT Manager',
  },
  {
    id: 'SUP-004',
    name: 'Global Training Academy',
    category: 'Non-Critical',
    services: ['ISO Training', 'Soft Skills Training'],
    evaluationDate: '2025-10-20',
    nextEvaluation: '2026-04-20',
    qualityScore: 95,
    deliveryScore: 92,
    priceScore: 70,
    overallScore: 86,
    status: 'Approved',
    riskLevel: 'Low',
    approvedBy: 'HR Manager',
  },
];

const EVALUATION_CRITERIA = [
  { name: 'Quality Performance', weight: 40, description: 'Product/service quality, defect rates' },
  { name: 'Delivery Performance', weight: 35, description: 'On-time delivery, lead times' },
  { name: 'Price Competitiveness', weight: 25, description: 'Cost, payment terms' },
];

export default function SupplierEvaluationPage(): JSX.Element {
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [filter, setFilter] = useState<'All' | 'Critical' | 'Non-Critical'>('All');
  const [search, setSearch] = useState('');

  const filteredSuppliers = SUPPLIERS.filter((s) => {
    const matchesFilter = filter === 'All' || s.category === filter;
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const approvedCount = SUPPLIERS.filter((s) => s.status === 'Approved').length;
  const criticalCount = SUPPLIERS.filter((s) => s.category === 'Critical').length;
  const avgScore = Math.round(
    SUPPLIERS.reduce((sum, s) => sum + s.overallScore, 0) / SUPPLIERS.length
  );

  const handleExport = () => {
    const csv = [
      'ID,Name,Category,Services,Quality,Delivery,Price,Overall,Status,Risk,Next Evaluation',
      ...SUPPLIERS.map(
        (s) =>
          `${s.id},"${s.name}",${s.category},"${s.services.join('; ')}",${s.qualityScore},${s.deliveryScore},${s.priceScore},${s.overallScore},${s.status},${s.riskLevel},${s.nextEvaluation}`
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supplier-evaluation-register-${new Date().toISOString().split('T')[0]}.csv`;
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
              Supplier Evaluation Register
            </h1>
            <p className="text-muted-foreground mt-1">
              ISO 9001:2015 Clause 8.4 — External provider performance monitoring
            </p>
          </div>
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export Register
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
                Clause 8.4 Compliance
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Systematic evaluation of external providers based on quality, delivery, and price criteria. 
                Critical suppliers require more stringent monitoring.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Suppliers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{SUPPLIERS.length}</div>
              <p className="text-xs text-muted-foreground">{approvedCount} Approved</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Critical</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
              <p className="text-xs text-muted-foreground">Require audit</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgScore}/100</div>
              <p className="text-xs text-muted-foreground">Overall rating</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Evaluations Due</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">2</div>
              <p className="text-xs text-muted-foreground">Within 30 days</p>
            </CardContent>
          </Card>
        </div>

        {/* Evaluation Criteria */}
        <div className="bg-muted p-4 rounded-lg">
          <h3 className="font-semibold mb-3">Evaluation Criteria</h3>          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {EVALUATION_CRITERIA.map((criterion, idx) => (
              <div key={idx} className="bg-white p-3 rounded border">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{criterion.name}</span>
                  <span className="text-sm font-bold text-blue-600">{criterion.weight}%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{criterion.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search suppliers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-md border border-input"
            />
          </div>          <div className="flex gap-2">
            {['All', 'Critical', 'Non-Critical'].map((f) => (
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

        {/* Suppliers Table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 text-sm font-medium">Supplier</th>
                <th className="text-left p-3 text-sm font-medium">Category</th>
                <th className="text-left p-3 text-sm font-medium">Overall Score</th>
                <th className="text-left p-3 text-sm font-medium">Status</th>
                <th className="text-left p-3 text-sm font-medium">Risk</th>
                <th className="text-left p-3 text-sm font-medium">Next Review</th>
                <th className="text-left p-3 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.map((supplier) => (
                <tr key={supplier.id} className="border-t hover:bg-muted/50">
                  <td className="p-3">
                    <div className="font-medium">{supplier.name}</div>
                    <div className="text-xs text-muted-foreground">{supplier.id}</div>
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        supplier.category === 'Critical'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {supplier.category}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            supplier.overallScore >= 85
                              ? 'bg-green-500'
                              : supplier.overallScore >= 70
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${supplier.overallScore}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{supplier.overallScore}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Q:{supplier.qualityScore} D:{supplier.deliveryScore} P:{supplier.priceScore}
                    </div>
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        supplier.status === 'Approved'
                          ? 'bg-green-100 text-green-800'
                          : supplier.status === 'Conditional'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {supplier.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        supplier.riskLevel === 'High'
                          ? 'bg-red-100 text-red-800'
                          : supplier.riskLevel === 'Medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {supplier.riskLevel}
                    </span>
                  </td>
                  <td className="p-3 text-sm">
                    {supplier.nextEvaluation}
                  </td>
                  <td className="p-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedSupplier(supplier)}
                    >
                      View Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Supplier Detail Dialog */}
        {selectedSupplier && (
          <Dialog open={!!selectedSupplier} onOpenChange={() => setSelectedSupplier(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{selectedSupplier.name}</DialogTitle>
                <DialogDescription>{selectedSupplier.id} • {selectedSupplier.category}</DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Scores */}
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold mb-4">Performance Scores</h4>                  <div className="space-y-4">
                    {[
                      { name: 'Quality', score: selectedSupplier.qualityScore },
                      { name: 'Delivery', score: selectedSupplier.deliveryScore },
                      { name: 'Price', score: selectedSupplier.priceScore },
                    ].map((metric, idx) => (
                      <div key={idx}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm">{metric.name}</span>
                          <span className="text-sm font-medium">{metric.score}/100</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${metric.score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Overall Score</span>
                        <span className="text-xl font-bold">{selectedSupplier.overallScore}/100</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Services */}
                <div>
                  <h4 className="font-semibold mb-2">Services Provided</h4>                  <div className="flex flex-wrap gap-2">
                    {selectedSupplier.services.map((service, idx) => (
                      <span
                        key={idx}
                        className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Review Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Last Evaluation:</span>
                    <div>{selectedSupplier.evaluationDate}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Next Evaluation:</span>
                    <div>{selectedSupplier.nextEvaluation}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Approved By:</span>
                    <div>{selectedSupplier.approvedBy}</div>
                  </div>
                  {selectedSupplier.lastAudit && (
                    <>
                      <div>
                        <span className="text-muted-foreground">Last Audit:</span>
                        <div>{selectedSupplier.lastAudit}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Audit Findings:</span>
                        <div>{selectedSupplier.auditFindings}</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppShell>
  );
}
