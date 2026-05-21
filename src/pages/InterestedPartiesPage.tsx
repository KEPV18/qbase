import React, { useState, useMemo } from 'react';
import {
  Users,
  Building2,
  Scale,
  Briefcase,
  FileText,
  AlertCircle,
  CheckCircle,
  Calendar,
  TrendingUp,
  Download,
  Filter,
  Search,
  AlertTriangle,
  Shield,
} from 'lucide-react';
import {
  InterestedParty,
  DEFAULT_INTERESTED_PARTIES,
  getHighRiskParties,
  getPartiesNeedingReview,
  getPartyRiskSummary,
  getCategorySummary,
  exportToCSV,
} from '@/data/interestedPartiesData';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// ============================================================================
// INTERESTED PARTIES REGISTER PAGE
// ISO 9001:2015 Clause 4.2 Implementation
// ============================================================================

const categoryIcons = {
  Customer: Building2,
  Supplier: Briefcase,
  Employee: Users,
  Regulatory: Scale,
  Partner: Shield,
  Community: Users,
  Investor: TrendingUp,
};

const categoryColors = {
  Customer: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  Supplier: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  Employee: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  Regulatory: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  Partner: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  Community: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  Investor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
};

export default function InterestedPartiesPage(): JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [selectedParty, setSelectedParty] = useState<InterestedParty | null>(null);

  const parties = DEFAULT_INTERESTED_PARTIES;
  const highRiskParties = useMemo(() => getHighRiskParties(), []);
  const partiesNeedingReview = useMemo(() => getPartiesNeedingReview(new Date()), []);
  const riskSummary = useMemo(() => getPartyRiskSummary(), []);
  const categorySummary = useMemo(() => getCategorySummary(), []);

  const filteredParties = useMemo(() => {
    return parties.filter((party) => {
      const matchesSearch =
        party.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        party.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        party.responsibleHOD.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        categoryFilter === 'All' || party.category === categoryFilter;
      const matchesRisk = riskFilter === 'All' || party.riskLevel === riskFilter;
      return matchesSearch && matchesCategory && matchesRisk;
    });
  }, [parties, searchQuery, categoryFilter, riskFilter]);

  const handleExport = () => {
    const csv = exportToCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interested-parties-register-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <AppShell>
      <div className="space-y-6 p-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Interested Parties Register
            </h1>
            <p className="text-muted-foreground mt-1">
              ISO 9001:2015 Clause 4.2 — Understanding needs and expectations
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* ISO Compliance Notice */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="bg-blue-500 text-white rounded-full p-2">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                ISO 9001:2015 Clause 4.2 Compliance
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                This register documents all interested parties, their needs, expectations, 
                legal requirements, and relevant risks/opportunities. Reviewed and updated 
                per P/01 procedure.
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Parties</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{parties.length}</div>
              <p className="text-xs text-muted-foreground">Registered stakeholders</p>
            </CardContent>
          </Card>

          <Card className="border-red-200 dark:border-red-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <AlertTriangle className="h-4 w-4 text-red-500 mr-1" />
                High Risk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {riskSummary.High}
              </div>
              <p className="text-xs text-red-500">Require active monitoring</p>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 dark:border-yellow-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Calendar className="h-4 w-4 text-yellow-500 mr-1" />
                Due for Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {partiesNeedingReview.length}
              </div>
              <p className="text-xs text-yellow-500">Review date passed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.keys(categorySummary).length}
              </div>
              <p className="text-xs text-muted-foreground">Unique party types</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, ID, or HOD..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm"
          >
            <option value="All">All Categories</option>
            <option value="Customer">Customer</option>
            <option value="Supplier">Supplier</option>
            <option value="Employee">Employee</option>
            <option value="Regulatory">Regulatory</option>
            <option value="Partner">Partner</option>
            <option value="Community">Community</option>
            <option value="Investor">Investor</option>
          </select>
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm"
          >
            <option value="All">All Risks</option>
            <option value="High">High Risk</option>
            <option value="Medium">Medium Risk</option>
            <option value="Low">Low Risk</option>
          </select>
        </div>

        {/* Parties Table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 text-sm font-medium">Party</th>
                <th className="text-left p-3 text-sm font-medium">Category</th>
                <th className="text-left p-3 text-sm font-medium">Risk</th>
                <th className="text-left p-3 text-sm font-medium">Status</th>
                <th className="text-left p-3 text-sm font-medium">Responsible</th>
                <th className="text-left p-3 text-sm font-medium">Next Review</th>
                <th className="text-left p-3 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredParties.map((party) => {
                const Icon = categoryIcons[party.category];
                const isOverdue = new Date(party.nextReview) < new Date();
                return (
                  <tr
                    key={party.id}
                    className="border-t hover:bg-muted/50 cursor-pointer"
                    onClick={() => setSelectedParty(party)}
                  >
                    <td className="p-3">
                      <div className="font-medium">{party.name}</div>
                      <div className="text-xs text-muted-foreground">{party.id}</div>
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${categoryColors[party.category]}`}
                      >
                        <Icon className="h-3 w-3" />
                        {party.category}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          party.riskLevel === 'High'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                            : party.riskLevel === 'Medium'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        }`}
                      >
                        {party.riskLevel}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          party.status === 'Active'
                            ? 'bg-green-100 text-green-800'
                            : party.status === 'Inactive'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {party.status}
                      </span>
                    </td>
                    <td className="p-3 text-sm">{party.responsibleHOD}</td>
                    <td className="p-3">
                      <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
                        {party.nextReview}
                        {isOverdue && ' ⚠️ '}
                      </span>
                    </td>
                    <td className="p-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedParty(party);
                        }}
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredParties.length === 0 && (
          <div className="text-center py-12 border rounded-lg">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No interested parties found</p>
          </div>
        )}

        {/* Detail Dialog */}
        {selectedParty && (
          <Dialog open={!!selectedParty} onOpenChange={() => setSelectedParty(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {React.createElement(categoryIcons[selectedParty.category], { className: 'h-5 w-5' })}
                  {selectedParty.name}
                </DialogTitle>
                <DialogDescription>
                  ID: {selectedParty.id} | Risk Level: {selectedParty.riskLevel} | Status: {selectedParty.status}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Relevance */}
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">Relevance</h4>
                  <p className="text-sm">{selectedParty.relevance}</p>
                </div>

                {/* Needs */}
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Needs
                  </h4>
                  <ul className="space-y-1">
                    {selectedParty.needs.map((need, idx) => (
                      <li key={idx} className="text-sm flex items-start">
                        <span className="text-muted-foreground mr-2">•</span>
                        {need}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Expectations */}
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Expectations
                  </h4>
                  <ul className="space-y-1">
                    {selectedParty.expectations.map((exp, idx) => (
                      <li key={idx} className="text-sm flex items-start">
                        <span className="text-muted-foreground mr-2">•</span>
                        {exp}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Legal Requirements */}
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center">
                    <Scale className="h-4 w-4 mr-1" />
                    Legal & Compliance Requirements
                  </h4>
                  <ul className="space-y-1">
                    {selectedParty.legalRequirements.map((req, idx) => (
                      <li key={idx} className="text-sm flex items-start">
                        <span className="text-red-500 mr-2">⚖</span>
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Review Cycle */}
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="text-sm font-semibold mb-2 flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    Review Cycle
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Last Reviewed:</span>
                      <div>{selectedParty.lastReviewed}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Next Review Due:</span>
                      <div
                        className={
                          new Date(selectedParty.nextReview) < new Date()
                            ? 'text-red-500 font-medium'
                            : ''
                        }
                      >
                        {selectedParty.nextReview}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Responsible HOD:</span>
                      <div>{selectedParty.responsibleHOD}</div>
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
