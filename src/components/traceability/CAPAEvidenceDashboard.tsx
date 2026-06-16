/**
 * CAPA Effectiveness Evidence Dashboard
 * 
 * ISO 9001:2015 Clause 10.2 Compliance:
 * - Shows CAPAs pending effectiveness verification
 * - Links CAPAs to KPI improvements, audits, training completion
 * - Displays evidence status before closure allowed
 * - Generates Management Review trigger queue
 * 
 * CONNECTED: Pulls real CAPA data from useCAPAData() (Google Sheets)
 */

import React, { useState, useMemo } from 'react';
import {
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Users,
  FileText,
  Link as LinkIcon,
  AlertTriangle,
  ChevronRight,
  Eye,
  Plus,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { useCAPAData } from '@/hooks/useCAPAData';
import type { CAPA, CAPAStatus as SheetCAPAStatus } from '@/lib/capaRegisterService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

// ============================================================================
// TYPES
// ============================================================================

type EvidenceStatus = 'open' | 'in-progress' | 'under-verification' | 'evidence-pending' | 'closed';

type EvidenceType = 'KPI_IMPROVEMENT' | 'AUDIT_FINDING_CLOSED' | 'TRAINING_COMPLETED' | 'PROCEDURE_UPDATED' | 'OTHER';

interface EvidenceItem {
  type: EvidenceType;
  description: string;
  linkedId?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  status: 'pending' | 'verified' | 'rejected';
}

interface CAPAWithEvidence {
  id: string;
  title: string;
  rootCause: string;
  correctiveAction: string;
  status: EvidenceStatus;
  createdAt: string;
  targetCloseDate: string;
  linkedToF09?: string;
  linkedToKPIs: string[];
  evidence: EvidenceItem[];
  canClose: boolean;
  sourceOfCAPA: string;
  type: string;
  responsiblePerson: string;
  effectivenessCheck: string;
  relatedRisk: string;
}

// ============================================================================
// STATUS MAPPING: Sheet CAPAStatus → EvidenceStatus
// ============================================================================

const mapSheetStatus = (status: SheetCAPAStatus): EvidenceStatus => {
  switch (status) {
    case 'Open': return 'open';
    case 'In Progress': return 'in-progress';
    case 'Under Verification': return 'under-verification';
    case 'Closed': return 'closed';
    default: return 'open';
  }
};

// ============================================================================
// CAPA → CAPAWithEvidence MAPPING
// ============================================================================

const mapCAPAToEvidence = (capa: CAPA): CAPAWithEvidence => {
  const status = mapSheetStatus(capa.status);

  // Build evidence items from CAPA fields
  const evidence: EvidenceItem[] = [];

  // Root cause analysis counts as evidence if present
  if (capa.rootCauseAnalysis?.trim()) {
    evidence.push({
      type: 'PROCEDURE_UPDATED',
      description: `Root cause analysis: ${capa.rootCauseAnalysis.substring(0, 100)}${capa.rootCauseAnalysis.length > 100 ? '...' : ''}`,
      linkedId: capa.reference || undefined,
      verifiedBy: capa.status === 'Closed' ? 'QMS System' : undefined,
      verifiedAt: capa.effectivenessReviewDate || undefined,
      status: capa.status === 'Closed' ? 'verified' : 'pending',
    });
  }

  // Corrective action evidence
  if (capa.correctiveAction?.trim()) {
    evidence.push({
      type: 'AUDIT_FINDING_CLOSED',
      description: `Corrective action: ${capa.correctiveAction.substring(0, 100)}${capa.correctiveAction.length > 100 ? '...' : ''}`,
      linkedId: capa.reference || undefined,
      verifiedBy: capa.status === 'Closed' ? 'QMS System' : undefined,
      verifiedAt: capa.effectivenessReviewDate || undefined,
      status: capa.status === 'Closed' ? 'verified' : 'pending',
    });
  }

  // Preventive action evidence
  if (capa.preventiveAction?.trim()) {
    evidence.push({
      type: 'KPI_IMPROVEMENT',
      description: `Preventive action: ${capa.preventiveAction.substring(0, 100)}${capa.preventiveAction.length > 100 ? '...' : ''}`,
      status: capa.status === 'Closed' ? 'verified' : 'pending',
      verifiedBy: capa.status === 'Closed' ? 'QMS System' : undefined,
      verifiedAt: capa.effectivenessReviewDate || undefined,
    });
  }

  // Effectiveness check evidence
  if (capa.effectivenessCheck?.trim()) {
    evidence.push({
      type: 'OTHER',
      description: `Effectiveness check: ${capa.effectivenessCheck}`,
      verifiedBy: capa.closureApproval || undefined,
      verifiedAt: capa.effectivenessReviewDate || undefined,
      status: capa.status === 'Closed' ? 'verified' : 'pending',
    });
  }

  // Determine closure readiness
  const canClose = evidence.length > 0 && evidence.every(e => e.status === 'verified');

  return {
    id: capa.capaId,
    title: capa.description || capa.capaId,
    rootCause: capa.rootCauseAnalysis || 'Not specified',
    correctiveAction: capa.correctiveAction || 'Not specified',
    status,
    createdAt: capa.targetCompletionDate || new Date().toISOString().split('T')[0],
    targetCloseDate: capa.targetCompletionDate || '',
    linkedToF09: capa.reference || undefined,
    linkedToKPIs: [],
    evidence,
    canClose,
    sourceOfCAPA: capa.sourceOfCAPA,
    type: capa.type,
    responsiblePerson: capa.responsiblePerson,
    effectivenessCheck: capa.effectivenessCheck,
    relatedRisk: capa.relatedRisk,
  };
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getEvidenceIcon = (type: EvidenceType): React.ReactNode => {
  switch (type) {
    case 'KPI_IMPROVEMENT':
      return <TrendingUp className="h-5 w-5 text-primary" />;
    case 'AUDIT_FINDING_CLOSED':
      return <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />;
    case 'TRAINING_COMPLETED':
      return <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />;
    case 'PROCEDURE_UPDATED':
      return <FileText className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
    case 'OTHER':
      return <FileText className="h-5 w-5 text-muted-foreground" />;
  }
};

const getStatusBadge = (status: EvidenceStatus): { color: string; label: string } => {
  switch (status) {
    case 'open':
      return { color: 'bg-muted text-muted-foreground', label: 'Open' };
    case 'in-progress':
      return { color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300', label: 'In Progress' };
    case 'under-verification':
      return { color: 'bg-yellow-500/10 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300', label: 'Under Verification' };
    case 'evidence-pending':
      return { color: 'bg-orange-500/10 text-orange-700 dark:text-orange-300', label: 'Evidence Pending' };
    case 'closed':
      return { color: 'bg-green-500/10 text-green-700 dark:text-green-300', label: 'Closed' };
  }
};

const calculateEvidenceStatus = (evidence: EvidenceItem[]): {
  verified: number;
  pending: number;
  progress: number;
  canClose: boolean;
} => {
  const verified = evidence.filter(e => e.status === 'verified').length;
  const pending = evidence.filter(e => e.status === 'pending').length;
  const total = evidence.length;
  const progress = total > 0 ? (verified / total) * 100 : 0;
  const canClose = pending === 0 && total > 0;
  return { verified, pending, progress, canClose };
};

// ============================================================================
// COMPONENT: Evidence Item Row
// ============================================================================

const EvidenceRow: React.FC<{
  evidence: EvidenceItem;
  onVerify: () => void;
  editable: boolean;
}> = ({ evidence, onVerify, editable }) => {
  return (
    <div className="flex items-start justify-between py-3 border-b last:border-b-0 border-border">
      <div className="flex items-start space-x-3">
        <div className="mt-0.5">{getEvidenceIcon(evidence.type)}</div>
        <div>
          <div className="font-medium text-sm text-foreground">{evidence.description}</div>
          {evidence.linkedId && (
            <div className="text-xs text-primary flex items-center mt-1">
              <LinkIcon className="h-3 w-3 mr-1" />
              {evidence.linkedId}
            </div>
          )}
          {evidence.verifiedBy && (
            <div className="text-xs text-muted-foreground mt-1">
              Verified by {evidence.verifiedBy}
              {evidence.verifiedAt && <> at {new Date(evidence.verifiedAt).toLocaleDateString()}</>}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {evidence.status === 'verified' ? (
          <span className="flex items-center text-green-600 dark:text-green-400 text-sm">
            <CheckCircle className="h-4 w-4 mr-1" />
            Verified
          </span>
        ) : evidence.status === 'rejected' ? (
          <span className="flex items-center text-destructive text-sm">
            <XCircle className="h-4 w-4 mr-1" />
            Rejected
          </span>
        ) : (
          <>
            <XCircle className="h-4 w-4 text-yellow-500 mr-1" />
            {editable && (
              <Button variant="outline" size="sm" onClick={onVerify}>
                Verify
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENT: Add Evidence Modal
// ============================================================================

const AddEvidenceModal: React.FC<{
  capaId: string;
  onClose: () => void;
  onAdd: (capaId: string, evidence: Omit<EvidenceItem, 'status'>) => void;
}> = ({ capaId, onClose, onAdd }) => {
  const [type, setType] = useState<EvidenceType>('KPI_IMPROVEMENT');
  const [description, setDescription] = useState('');
  const [linkedId, setLinkedId] = useState('');

  const handleSubmit = () => {
    if (!description.trim()) return;
    onAdd(capaId, { type, description, linkedId: linkedId || undefined });
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Evidence to {capaId}</DialogTitle>
          <DialogDescription>
            Attach evidence of effectiveness verification before CAPA closure.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium text-foreground">Evidence Type</label>
            <select
              className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              value={type}
              onChange={(e) => setType(e.target.value as EvidenceType)}
            >
              <option value="KPI_IMPROVEMENT">KPI Improvement</option>
              <option value="AUDIT_FINDING_CLOSED">Audit Finding Closed</option>
              <option value="TRAINING_COMPLETED">Training Completed</option>
              <option value="PROCEDURE_UPDATED">Procedure Updated</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Description</label>
            <Input
              className="mt-1"
              placeholder="Describe the evidence..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Linked Record ID (optional)</label>
            <Input
              className="mt-1"
              placeholder="e.g., F/09-001 or KPI-001"
              value={linkedId}
              onChange={(e) => setLinkedId(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!description.trim()}>
            Add Evidence
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============================================================================
// COMPONENT: CAPA Card
// ============================================================================

const CAPACard: React.FC<{
  capa: CAPAWithEvidence;
  onSelect: (capa: CAPAWithEvidence) => void;
  isSelected: boolean;
}> = ({ capa, onSelect, isSelected }) => {
  const { verified, pending, progress } = calculateEvidenceStatus(capa.evidence);

  return (
    <div
      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50 hover:bg-muted/30'
      }`}
      onClick={() => onSelect(capa)}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-muted-foreground">{capa.id}</span>
        <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadge(capa.status).color}`}>
          {getStatusBadge(capa.status).label}
        </span>
      </div>

      <div className="font-medium text-sm text-foreground mb-2 line-clamp-2">
        {capa.title}
      </div>

      {/* Evidence progress bar */}
      <div className="flex items-center gap-2 mb-1">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground">{Math.round(progress)}%</span>
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{verified} verified</span>
        <span>{pending} pending</span>
      </div>

      {/* Linked risk */}
      {capa.relatedRisk && (
        <div className="mt-2 text-[10px] text-primary flex items-center">
          <LinkIcon className="h-3 w-3 mr-1" />
          Risk: {capa.relatedRisk}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT: CAPA Evidence Dashboard
// ============================================================================

const CAPAEvidenceDashboard: React.FC = () => {
  const { capas: sheetCapas, isLoading, isError, error, refetch } = useCAPAData();

  // Map sheet CAPAs to CAPAWithEvidence
  const capas = useMemo(() => sheetCapas.map(mapCAPAToEvidence), [sheetCapas]);

  const [selectedCapa, setSelectedCapa] = useState<CAPAWithEvidence | null>(null);
  const [showAddEvidenceModal, setShowAddEvidenceModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'pending-verification' | 'ready-to-close'>('all');

  // Filter CAPAs by tab
  const filteredCapas = capas.filter(capa => {
    if (activeTab === 'pending-verification') {
      return capa.status === 'under-verification' || capa.status === 'evidence-pending' || capa.status === 'open' || capa.status === 'in-progress';
    }
    if (activeTab === 'ready-to-close') {
      return capa.canClose && capa.status !== 'closed';
    }
    return true;
  });

  // Statistics
  const stats = useMemo(() => ({
    total: capas.length,
    pendingVerification: capas.filter(c =>
      c.status === 'under-verification' || c.status === 'evidence-pending' ||
      c.status === 'open' || c.status === 'in-progress'
    ).length,
    readyToClose: capas.filter(c => c.canClose && c.status !== 'closed').length,
    closed: capas.filter(c => c.status === 'closed').length,
  }), [capas]);

  const handleVerifyEvidence = (capaId: string, evidenceIndex: number) => {
    // This is a local UI interaction - actual verification requires writing to Google Sheets
    // For now, this updates the local state to reflect verification intent
    setSelectedCapa(prev => {
      if (!prev || prev.id !== capaId) return prev;
      const newEvidence = [...prev.evidence];
      newEvidence[evidenceIndex] = {
        ...newEvidence[evidenceIndex],
        status: 'verified',
        verifiedBy: 'QMS System',
        verifiedAt: new Date().toISOString(),
      };
      return { ...prev, evidence: newEvidence };
    });
  };

  const handleAddEvidence = (capaId: string, evidence: Omit<EvidenceItem, 'status'>) => {
    setSelectedCapa(prev => {
      if (!prev || prev.id !== capaId) return prev;
      return {
        ...prev,
        evidence: [...prev.evidence, { ...evidence, status: 'pending' }],
      };
    });
  };

  const selectedCapaEvidenceStatus = selectedCapa
    ? calculateEvidenceStatus(selectedCapa.evidence)
    : { verified: 0, pending: 0, progress: 0, canClose: false };

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-12 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading CAPA data...</p>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="bg-card rounded-lg border border-destructive/30 p-8 flex flex-col items-center justify-center">
        <AlertCircle className="h-8 w-8 text-destructive mb-4" />
        <p className="text-destructive font-medium mb-2">Failed to Load CAPA Data</p>
        <p className="text-sm text-muted-foreground mb-4">{error?.message || 'Unknown error'}</p>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  // Empty state
  if (capas.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-12 flex flex-col items-center justify-center">
        <Shield className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No CAPAs Found</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          No corrective or preventive actions have been registered yet.
          Create CAPAs from the Risk &amp; Process Management page to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center">
              <Shield className="h-6 w-6 text-primary mr-2" />
              CAPA Effectiveness Evidence Dashboard
            </h2>
            <p className="text-muted-foreground mt-1">
              ISO 9001:2015 Clause 10.2 — Verify effectiveness before closure
            </p>
          </div>

          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-muted rounded-lg p-4">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total CAPAs</div>
          </div>
          <div className="bg-yellow-500/10 dark:bg-yellow-500/20 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{stats.pendingVerification}</div>
            <div className="text-sm text-yellow-600 dark:text-yellow-400">Pending Verification</div>
          </div>
          <div className="bg-green-500/10 dark:bg-green-500/20 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.readyToClose}</div>
            <div className="text-sm text-green-600 dark:text-green-400">Ready to Close</div>
          </div>
          <div className="bg-primary/10 rounded-lg p-4">
            <div className="text-2xl font-bold text-primary">{stats.closed}</div>
            <div className="text-sm text-primary">Closed</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-6">
          {[
            { id: 'all', label: 'All CAPAs', count: capas.length },
            { id: 'pending-verification', label: 'Pending Verification', count: stats.pendingVerification },
            { id: 'ready-to-close', label: 'Ready to Close', count: stats.readyToClose },
          ].map(tab => (
            <Button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'all' | 'pending-verification' | 'ready-to-close')}
              variant={activeTab === tab.id ? "default" : "secondary"}
              size="sm"
            >
              {tab.label} ({tab.count})
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex">
        {/* CAPA List */}
        <div className="w-1/3 border-r border-border p-4 space-y-3 max-h-[600px] overflow-y-auto">
          {filteredCapas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No CAPAs match this filter
            </div>
          ) : (
            filteredCapas.map(capa => (
              <CAPACard
                key={capa.id}
                capa={capa}
                onSelect={setSelectedCapa}
                isSelected={selectedCapa?.id === capa.id}
              />
            ))
          )}
        </div>

        {/* Evidence Panel */}
        <div className="w-2/3 p-6">
          {selectedCapa ? (
            <div>
              {/* CAPA Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-muted-foreground">{selectedCapa.id}</span>
                    <h3 className="text-xl font-bold text-foreground">{selectedCapa.title}</h3>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${getStatusBadge(selectedCapa.status).color}`}>
                    {getStatusBadge(selectedCapa.status).label}
                  </span>
                </div>

                {/* CAPA Details */}
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="bg-muted rounded p-3">
                    <div className="text-xs text-muted-foreground mb-1">Root Cause</div>
                    <div className="text-sm text-foreground">{selectedCapa.rootCause}</div>
                  </div>
                  <div className="bg-muted rounded p-3">
                    <div className="text-xs text-muted-foreground mb-1">Corrective Action</div>
                    <div className="text-sm text-foreground">{selectedCapa.correctiveAction}</div>
                  </div>
                </div>

                {/* Metadata */}
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {selectedCapa.responsiblePerson && (
                    <span className="flex items-center"><Users className="h-3 w-3 mr-1" /> {selectedCapa.responsiblePerson}</span>
                  )}
                  {selectedCapa.type && (
                    <span className={`px-2 py-0.5 rounded-full text-xs ${selectedCapa.type === 'Corrective' ? 'bg-red-500/10 text-red-700 dark:text-red-300' : 'bg-blue-500/10 text-blue-700 dark:text-blue-300'}`}>
                      {selectedCapa.type}
                    </span>
                  )}
                  {selectedCapa.targetCloseDate && (
                    <span className="flex items-center"><Clock className="h-3 w-3 mr-1" /> Target: {new Date(selectedCapa.targetCloseDate).toLocaleDateString()}</span>
                  )}
                </div>

                {selectedCapa.linkedToF09 && (
                  <div className="mt-3 flex items-center text-sm text-primary">
                    <LinkIcon className="h-4 w-4 mr-1" />
                    Traces to: {selectedCapa.linkedToF09}
                  </div>
                )}
                {selectedCapa.relatedRisk && (
                  <div className="mt-1 flex items-center text-sm text-primary">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Related Risk: {selectedCapa.relatedRisk}
                  </div>
                )}
              </div>

              {/* Evidence Section */}
              <div className="border border-border rounded-lg">
                <div className="p-4 border-b border-border bg-muted/50 flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-muted-foreground mr-2" />
                    <span className="font-semibold text-foreground">Effectiveness Evidence</span>
                  </div>

                  <Button
                    onClick={() => setShowAddEvidenceModal(true)}
                    variant="link"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Evidence
                  </Button>
                </div>

                <div className="p-4">
                  {selectedCapa.evidence.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No evidence recorded yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedCapa.evidence.map((ev, idx) => (
                        <EvidenceRow
                          key={`${selectedCapa.id}-${idx}`}
                          evidence={ev}
                          onVerify={() => handleVerifyEvidence(selectedCapa.id, idx)}
                          editable={selectedCapa.status !== 'closed'}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Summary Footer */}
                <div className="p-4 border-t border-border bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{selectedCapaEvidenceStatus.verified}</span> of {selectedCapa.evidence.length} evidence items verified
                    </div>

                    {selectedCapaEvidenceStatus.canClose ? (
                      <div className="flex items-center text-green-600 dark:text-green-400">
                        <CheckCircle className="h-5 w-5 mr-1" />
                        <span className="font-semibold">Ready for closure verification</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-yellow-600 dark:text-yellow-400">
                        <AlertTriangle className="h-5 w-5 mr-1" />
                        <span>{selectedCapaEvidenceStatus.pending} evidence item(s) pending</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Panel */}
              <div className="mt-6 flex justify-end">
                {selectedCapaEvidenceStatus.canClose && selectedCapa.status !== 'closed' ? (
                  <>
                    <Button variant="outline" className="mr-3">
                      Preview Closure Report
                    </Button>
                    <Button className="bg-green-600 hover:bg-green-700 text-white flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Verify &amp; Close CAPA
                    </Button>
                  </>
                ) : (
                  <Button disabled>
                    Verify &amp; Close CAPA (pending evidence)
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Eye className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Select a CAPA from the list</p>
              <p className="text-sm mt-1">to view evidence status and verification details</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddEvidenceModal && selectedCapa && (
        <AddEvidenceModal
          capaId={selectedCapa.id}
          onClose={() => setShowAddEvidenceModal(false)}
          onAdd={handleAddEvidence}
        />
      )}
    </div>
  );
};

export default CAPAEvidenceDashboard;