/**
 * F/22 CAPA (Corrective Action) Form - PHASE 2 ENHANCED
 * 
 * Features:
 * - ISO 9001:2015 Clause 10.2 compliant
 * - RelationshipPicker for linking to F/09, F/28, Risk, Reviews
 * - **NEW**: Effectiveness Evidence Section (KPI, Training, Audit, Procedure)
 * - **NEW**: CAPA Closure Validation (ISO 10.2 mandatory evidence)
 * - **NEW**: Auto-queue for Management Review (Clause 9.3.2)
 * - **NEW**: Linked KPI tracking
 */

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RelationshipPicker } from "@/components/traceability/RelationshipPicker";
import {
  type RelatedRecord,
  createBidirectionalLink,
} from "@/lib/traceability";
import { createFormRecord, type FormRecordInput } from "@/lib/formRecordService";
import { type CAPAInput } from "@/lib/capaRegisterService";
import { getKPIsByRole, type KPI } from "@/data/kpiData";
import { toast } from "sonner";
import { AlertTriangle, Save, X, CheckCircle, ArrowLeftRight, TrendingUp, GraduationCap, FileText, BookOpen, Shield } from "lucide-react";

// ============================================================================
// A. INTERFACES
// ============================================================================

export type EffectivenessEvidenceType = 
  | "KPI_IMPROVEMENT" 
  | "AUDIT_FINDING_CLOSED" 
  | "TRAINING_COMPLETED" 
  | "PROCEDURE_UPDATED" 
  | "OTHER";

export interface EffectivenessEvidence {
  type: EffectivenessEvidenceType;
  description: string;
  linkedRecordId?: string; // F/22, F/28, P/XX, F/25, KPI-XX
  linkedRecordType?: string;
  attachmentUrl?: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface F22FormData {
  capaId: string;
  date: string;
  sourceOfCAPA: string;
  sourceType: "Complaint" | "Audit" | "Risk" | "NC" | "Other";
  referenceId: string;
  type: "Corrective" | "Preventive";
  severity: "MINOR" | "MAJOR" | "CRITICAL";
  description: string;
  rootCauseAnalysis: string;
  correctiveAction: string;
  preventiveAction: string;
  responsiblePerson: string;
  targetCompletionDate: string;
  status: "Open" | "In Progress" | "Under Verification" | "Closed";
  effectivenessCheck: string;
  effectivenessEvidence?: EffectivenessEvidence;
  relatedRecords: RelatedRecord[];
  // ISO 9.3.2 Management Review tracking
  addedToManagementReview: boolean;
  managementReviewRef?: string;
}

interface F22CAPAFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (recordId: string) => void;
  initialData?: Partial<F22FormData>;
  editMode?: boolean;
  recordId?: string;
  autoLinkTo?: { form: string; number: string };
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// B. VALIDATION - PHASE 2 ENHANCED
// ============================================================================

/**
 * Validate CAPA closure per ISO 9001:2015 Clause 10.2
 * EFFECTIVENESS EVIDENCE IS MANDATORY before status = CLOSED
 */
function validateFormData(data: F22FormData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Basic validation
  if (!data.description.trim() || data.description.length < 30) {
    errors.push("Description must be at least 30 characters");
  }
  
  if (!data.rootCauseAnalysis.trim() || data.rootCauseAnalysis.length < 50) {
    errors.push("Root Cause Analysis must be at least 50 characters");
  }
  
  if (!data.correctiveAction.trim()) {
    errors.push("Corrective Action is required");
  }
  
  if (!data.responsiblePerson.trim()) {
    errors.push("Responsible Person is required");
  }
  
  // ISO 10.2: CAPA must reference source
  if (!data.relatedRecords.some(r => 
    r.relationship === "RESOLVES" || r.relationship === "IDENTIFIES_RISK"
  )) {
    errors.push("CAPA must be linked to its source (F/09, F/10, or Risk)");
  }
  
  // ═══════════════════════════════════════════════════════════════
  // PHASE 2: CLOSURE VALIDATION - ISO 9001:2015 Clause 10.2
  // ═══════════════════════════════════════════════════════════════
  if (data.status === "Closed") {
    // Effectiveness evidence is MANDATORY
    if (!data.effectivenessEvidence) {
      errors.push("ISO 9001:2015 Clause 10.2: Effectiveness evidence is required before closing CAPA");
    } else {
      // Validate evidence completeness
      if (!data.effectivenessEvidence.type) {
        errors.push("Effectiveness evidence type is required");
      }
      if (!data.effectivenessEvidence.description || data.effectivenessEvidence.description.length < 20) {
        errors.push("Effectiveness evidence description must be at least 20 characters");
      }
      
      // Linked record validation for specific types
      const requiresLinkedRecord: EffectivenessEvidenceType[] = [
        "KPI_IMPROVEMENT",
        "AUDIT_FINDING_CLOSED", 
        "TRAINING_COMPLETED",
        "PROCEDURE_UPDATED"
      ];
      
      if (requiresLinkedRecord.includes(data.effectivenessEvidence.type) && 
          !data.effectivenessEvidence.linkedRecordId) {
        errors.push(`${data.effectivenessEvidence.type} requires a linked record reference`);
      }
    }
    
    // MAJOR/CRITICAL severity requires explicit verification
    if ((data.severity === "MAJOR" || data.severity === "CRITICAL") && !data.addedToManagementReview) {
      warnings.push("MAJOR/CRITICAL CAPA should be added to Management Review per Clause 9.3.2");
    }
  }
  
  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Verify that a linked record exists and is complete
 */
function verifyLinkedRecord(evidence: EffectivenessEvidence): { valid: boolean; error?: string } {
  if (!evidence.linkedRecordId) {
    return { valid: true }; // Not required for OTHER type
  }
  
  // Check localStorage for record existence
  const records = JSON.parse(localStorage.getItem("qms_form_records") || "[]");
  const found = records.find((r: { recordId: string }) => 
    r.recordId === evidence.linkedRecordId
  );
  
  if (!found) {
    return { 
      valid: false, 
      error: `Linked evidence ${evidence.linkedRecordId} not found in registry` 
    };
  }
  
  // Verify linked record is complete
  if (found.status === "Open" || found.status === "Draft") {
    return {
      valid: false,
      error: `Linked evidence ${evidence.linkedRecordId} is incomplete (status: ${found.status})`
    };
  }
  
  return { valid: true };
}

// ============================================================================
// C. MANAGEMENT REVIEW QUEUE
// ============================================================================

interface ManagementReviewItem {
  source: string;
  ref: string;
  summary: string;
  clause: string;
  priority: string;
  timestamp: string;
  capaId: string;
}

const MR_QUEUE_KEY = "qms_management_review_queue";

/**
 * Add CAPA to Management Review queue (ISO 9.3.2 compliance)
 */
function addToManagementReviewQueue(capa: F22FormData): ManagementReviewItem {
  const item: ManagementReviewItem = {
    source: "CAPA",
    ref: `F/22-${capa.capaId.split("-").pop() || "NEW"}`,
    summary: capa.effectivenessEvidence?.description?.slice(0, 200) || "CAPA Effectiveness Review",
    clause: "9.3.2(c)",
    priority: capa.severity,
    timestamp: new Date().toISOString(),
    capaId: capa.capaId,
  };
  
  const existing = JSON.parse(localStorage.getItem(MR_QUEUE_KEY) || "[]");
  existing.push(item);
  localStorage.setItem(MR_QUEUE_KEY, JSON.stringify(existing));
  
  return item;
}

// ============================================================================
// D. KPI LINKING
// ============================================================================

const KPI_ICONS: Record<string, React.ElementType> = {
  KPI_IMPROVEMENT: TrendingUp,
  AUDIT_FINDING_CLOSED: Shield,
  TRAINING_COMPLETED: GraduationCap,
  PROCEDURE_UPDATED: BookOpen,
  OTHER: FileText,
};

const KPI_COLORS: Record<string, string> = {
  KPI_IMPROVEMENT: "bg-green-100 text-green-700",
  AUDIT_FINDING_CLOSED: "bg-blue-100 text-blue-700",
  TRAINING_COMPLETED: "bg-purple-100 text-purple-700",
  PROCEDURE_UPDATED: "bg-orange-100 text-orange-700",
  OTHER: "bg-gray-100 text-gray-700",
};

// ============================================================================
// E. MAIN COMPONENT
// ============================================================================

export function F22CAPAForm({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  editMode = false,
  recordId,
  autoLinkTo,
}: F22CAPAFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult>({ valid: true, errors: [], warnings: [] });
  const [showValidation, setShowValidation] = useState(false);
  
  // KPI list for selector
  const [availableKPIs, setAvailableKPIs] = useState<KPI[]>([]);
  
  const [formData, setFormData] = useState<F22FormData>({
    capaId: initialData?.capaId || "",
    date: initialData?.date || new Date().toISOString().split("T")[0],
    sourceOfCAPA: initialData?.sourceOfCAPA || "",
    sourceType: initialData?.sourceType || "Complaint",
    referenceId: initialData?.referenceId || "",
    type: initialData?.type || "Corrective",
    severity: initialData?.severity || "MINOR",
    description: initialData?.description || "",
    rootCauseAnalysis: initialData?.rootCauseAnalysis || "",
    correctiveAction: initialData?.correctiveAction || "",
    preventiveAction: initialData?.preventiveAction || "",
    responsiblePerson: initialData?.responsiblePerson || "",
    targetCompletionDate: initialData?.targetCompletionDate || "",
    status: initialData?.status || "Open",
    effectivenessCheck: initialData?.effectivenessCheck || "",
    effectivenessEvidence: initialData?.effectivenessEvidence || undefined,
    relatedRecords: initialData?.relatedRecords || [],
    addedToManagementReview: initialData?.addedToManagementReview ?? false,
    managementReviewRef: initialData?.managementReviewRef || "",
  });
  
  // Load KPIs on mount
  useEffect(() => {
    const kpis = getKPIsByRole("Quality Manager"); // Get all KPIs
    setAvailableKPIs(kpis);
  }, []);
  
  // Auto-populate link if coming from complaint
  useEffect(() => {
    if (autoLinkTo && formData.relatedRecords.length === 0) {
      const autoLink: RelatedRecord = {
        form: autoLinkTo.form,
        number: autoLinkTo.number,
        relationship: "RESOLVES",
        bidirectional: true,
        isoClause: "10.2",
        status: "ACTIVE",
        notes: `Auto-linked from ${autoLinkTo.form}-${autoLinkTo.number}`,
      };
      setFormData(prev => ({
        ...prev,
        relatedRecords: [autoLink],
        referenceId: `${autoLinkTo.form}-${autoLinkTo.number}`,
      }));
    }
  }, [autoLinkTo]);
  
  const sourceId = recordId || formData.capaId || "F/22-NEW";
  
  // Auto-validate when status changes to Closed
  useEffect(() => {
    if (formData.status === "Closed") {
      const result = validateFormData(formData);
      setValidationResult(result);
    }
  }, [formData.status, formData.effectivenessEvidence, formData.relatedRecords]);
  
  const handleChange = (field: keyof F22FormData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleRelatedRecordsChange = (records: RelatedRecord[]) => {
    setFormData(prev => ({ ...prev, relatedRecords: records }));
  };
  
  const updateEffectivenessEvidence = (updates: Partial<EffectivenessEvidence>) => {
    setFormData(prev => ({
      ...prev,
      effectivenessEvidence: {
        ...prev.effectivenessEvidence,
        ...updates,
      } as EffectivenessEvidence,
    }));
  };
  
  const handleSubmit = async () => {
    setShowValidation(true);
    const result = validateFormData(formData);
    setValidationResult(result);
    
    if (!result.valid) {
      toast.error("Validation Failed", { description: result.errors[0] });
      return;
    }
    
    // Verify linked evidence exists
    if (formData.effectivenessEvidence) {
      const verified = verifyLinkedRecord(formData.effectivenessEvidence);
      if (!verified.valid) {
        toast.error("Evidence Verification Failed", { description: verified.error });
        return;
      }
    }
    
    setIsSubmitting(true);
    
    try {
      // ISO 9.3.2: Queue for Management Review if MAJOR/CRITICAL
      let mrItem: ManagementReviewItem | null = null;
      if ((formData.severity === "MAJOR" || formData.severity === "CRITICAL") && formData.status === "Closed") {
        mrItem = addToManagementReviewQueue(formData);
        formData.addedToManagementReview = true;
        formData.managementReviewRef = mrItem.ref;
      }
      
      const recordInput: FormRecordInput = {
        formCode: "F/22",
        title: `CAPA - ${formData.sourceOfCAPA} (${formData.severity} - ${formData.type})`,
        details: {
          sourceOfCAPA: formData.sourceOfCAPA,
          sourceType: formData.sourceType,
          referenceId: formData.referenceId,
          type: formData.type,
          severity: formData.severity,
          description: formData.description,
          rootCauseAnalysis: formData.rootCauseAnalysis,
          correctiveAction: formData.correctiveAction,
          preventiveAction: formData.preventiveAction,
          responsiblePerson: formData.responsiblePerson,
          targetCompletionDate: formData.targetCompletionDate,
          status: formData.status,
          effectivenessCheck: formData.effectivenessCheck,
          effectivenessEvidence: formData.effectivenessEvidence,
          addedToManagementReview: formData.addedToManagementReview,
          managementReviewRef: formData.managementReviewRef,
          isoClauses: ["10.2"],
          relatedRecords: formData.relatedRecords,
        },
      };
      
      const record = await createFormRecord(recordInput);
      
      // Save bidirectional links
      for (const related of formData.relatedRecords) {
        if (related.bidirectional) {
          await createBidirectionalLink(
            record.recordId,
            related.form,
            related.number,
            related.relationship === "RESOLVES" ? "TRIGGERS" : related.relationship,
            related.isoClause
          );
        }
      }
      
      // Success notification
      const messages: string[] = [`${record.recordId} saved successfully.`];
      if (mrItem) {
        messages.push(`Queued for Management Review: ${mrItem.ref}`);
      }
      if (formData.effectivenessEvidence) {
        messages.push(`Evidence: ${formData.effectivenessEvidence.type} verified`);
      }
      
      toast.success("CAPA Created", { description: messages.join(" ") });
      
      onSuccess?.(record.recordId);
      onClose();
    } catch (error) {
      toast.error("Failed to Save", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const isClosed = formData.status === "Closed";
  const showEvidenceSection = isClosed || formData.effectivenessEvidence !== undefined;
  
  const canSubmit = formData.rootCauseAnalysis.length >= 50 && 
                    formData.correctiveAction.length > 0 &&
                    formData.relatedRecords.length > 0 &&
                    (!isClosed || (formData.effectivenessEvidence?.type && 
                                  formData.effectivenessEvidence?.linkedRecordId));
  
  const EvidenceIcon = formData.effectivenessEvidence?.type 
    ? KPI_ICONS[formData.effectivenessEvidence.type] 
    : FileText;
    
  const renderEvidenceSelector = () => {
    return (
      <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex items-center gap-2 mb-2">
          <EvidenceIcon className="w-5 h-5 text-indigo-600" />
          <h4 className="font-semibold text-indigo-900">Effectiveness Evidence</h4>
          <Badge variant="secondary" className="text-xs">ISO 10.2 Required</Badge>
        </div>
        
        {/* Evidence Type */}
        <div className="space-y-2">
          <Label>Evidence Type *</Label>
          <Select 
            value={formData.effectivenessEvidence?.type || ""} 
            onValueChange={(v) => updateEffectivenessEvidence({ 
              type: v as EffectivenessEvidenceType,
              linkedRecordId: undefined, // Reset linked record on type change
              linkedRecordType: undefined,
            })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select how effectiveness was verified..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="KPI_IMPROVEMENT">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  KPI Improvement (Dashboard)
                </div>
              </SelectItem>
              <SelectItem value="AUDIT_FINDING_CLOSED">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Internal Audit Finding Closed (F/25)
                </div>
              </SelectItem>
              <SelectItem value="TRAINING_COMPLETED">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Training Completed (F/28)
                </div>
              </SelectItem>
              <SelectItem value="PROCEDURE_UPDATED">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Procedure Updated (P/XX)
                </div>
              </SelectItem>
              <SelectItem value="OTHER">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Other (Requires Documentation)
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Dynamic Fields Based on Evidence Type */}
        {formData.effectivenessEvidence?.type === "KPI_IMPROVEMENT" && (
          <div className="space-y-2">
            <Label>Select Affected KPI *</Label>
            <Select
              value={formData.effectivenessEvidence.linkedRecordId || ""}
              onValueChange={(v) => updateEffectivenessEvidence({ 
                linkedRecordId: v,
                linkedRecordType: "KPI",
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select KPI..." />
              </SelectTrigger>
              <SelectContent>
                {availableKPIs.map((kpi) => (
                  <SelectItem key={kpi.id} value={kpi.id}>
                    {kpi.id} - {kpi.name} (Target: {kpi.target}%)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>            
            {formData.effectivenessEvidence.linkedRecordId && (
              <div className="text-xs text-slate-500 mt-1">
                Linked KPI will be marked as "Improved by CAPA" in dashboard
              </div>
            )}
          </div>
        )}
        
        {formData.effectivenessEvidence?.type === "TRAINING_COMPLETED" && (
          <div className="space-y-2">
            <Label>Link Training Record (F/28) *</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter F/28-XXX record number"
                value={formData.effectivenessEvidence.linkedRecordId || ""}
                onChange={(e) => updateEffectivenessEvidence({ 
                  linkedRecordId: e.target.value,
                  linkedRecordType: "F/28",
                })}
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  // Open F/28 creation modal
                  // This would trigger on-the-fly F/28 creation
                  toast.info("Create F/28", { description: "F/28 form would open here" });
                }}
              >
                + Create F/28
              </Button>
            </div>
          </div>
        )}
        
        {formData.effectivenessEvidence?.type === "AUDIT_FINDING_CLOSED" && (
          <div className="space-y-2">
            <Label>Link Internal Audit Finding (F/20) *</Label>
            <Input
              placeholder="Enter F/20-XXX finding reference"
              value={formData.effectivenessEvidence.linkedRecordId || ""}
              onChange={(e) => updateEffectivenessEvidence({ 
                linkedRecordId: e.target.value,
                linkedRecordType: "F/20",
              })}
            />
          </div>
        )}
        
        {/* Evidence Description */}
        <div className="space-y-2">
          <Label>Evidence Description *</Label>
          <Textarea
            placeholder="Describe how effectiveness was verified..."
            value={formData.effectivenessEvidence?.description || ""}
            onChange={(e) => updateEffectivenessEvidence({ description: e.target.value })}
            rows={3}
          />
          <div className="text-xs text-slate-500">
            Minimum 20 characters required
            {formData.effectivenessEvidence?.description && (
              <span className={formData.effectivenessEvidence.description.length < 20 ? "text-red-500" : "text-green-500"}>
                {" "}({formData.effectivenessEvidence.description.length}/20)
              </span>
            )}
          </div>
        </div>
        
        {/* Attachment for OTHER type */}
        {formData.effectivenessEvidence?.type === "OTHER" && (
          <div className="space-y-2">
            <Label>Attachment URL</Label>
            <Input
              placeholder="Link to evidence file..."
              value={formData.effectivenessEvidence.attachmentUrl || ""}
              onChange={(e) => updateEffectivenessEvidence({ attachmentUrl: e.target.value })}
            />
          </div>
        )}
        
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-mono">F/22</span>
            <DialogTitle>Corrective Action (CAPA)</DialogTitle>
            {formData.severity && (
              <Badge 
                className={
                  formData.severity === "CRITICAL" ? "bg-red-100 text-red-700" :
                  formData.severity === "MAJOR" ? "bg-amber-100 text-amber-700" :
                  "bg-blue-100 text-blue-700"
                }
              >
                {formData.severity}
              </Badge>
            )}
          </div>
          <DialogDescription>
            ISO 9001:2015 Clause 10.2 — Nonconformity and Corrective Action
            {isClosed && <span className="text-red-600 font-medium"> — EFFECTIVENESS VERIFICATION REQUIRED</span>}
          </DialogDescription>
        </DialogHeader>
        
        {/* Validation Alerts */}
        {showValidation && validationResult.errors.length > 0 && (
          <Alert className="mb-4 border-red-400 bg-red-50">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertTitle>Validation Errors — Fix before submission</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside mt-2 text-sm">
                {validationResult.errors.map((err, i) => (
                  <li key={i} className="text-red-700">{err}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        {showValidation && validationResult.warnings.length > 0 && (
          <Alert className="mb-4 border-amber-400 bg-amber-50">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <AlertTitle>Warnings</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside mt-2 text-sm">
                {validationResult.warnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-6 py-4">
          {/* Header Row - Source Info */}
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Source Type</Label>
              <Select 
                value={formData.sourceType} 
                onValueChange={(v) => handleChange("sourceType", v as F22FormData["sourceType"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Complaint">Customer Complaint (F/09)</SelectItem>
                  <SelectItem value="Audit">Internal Audit (F/20)</SelectItem>
                  <SelectItem value="Risk">Risk Materialization</SelectItem>
                  <SelectItem value="NC">Internal NC (F/10)</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>CAPA Type</Label>
              <Select value={formData.type} onValueChange={(v) => handleChange("type", v as F22FormData["type"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Corrective">Corrective Action</SelectItem>
                  <SelectItem value="Preventive">Preventive Action</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Severity *</Label>
              <Select value={formData.severity} onValueChange={(v) => handleChange("severity", v as F22FormData["severity"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MINOR">MINOR</SelectItem>
                  <SelectItem value="MAJOR">MAJOR</SelectItem>
                  <SelectItem value="CRITICAL">CRITICAL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => handleChange("status", v as F22FormData["status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Under Verification">Under Verification</SelectItem>
                  <SelectItem value="Closed">Closed (Evidence Required)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Description & Root Cause */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Problem Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Detailed description of the nonconformity..."
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Root Cause Analysis *</Label>
              <Textarea
                value={formData.rootCauseAnalysis}
                onChange={(e) => handleChange("rootCauseAnalysis", e.target.value)}
                placeholder="5-Why analysis, Fishbone diagram results..."
                rows={4}
                className={formData.rootCauseAnalysis.length < 50 ? "border-amber-300" : ""}
              />
              <div className="text-xs text-slate-500">
                Required: 50+ characters ({formData.rootCauseAnalysis.length}/50)
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Corrective Action *</Label>
              <Textarea
                value={formData.correctiveAction}
                onChange={(e) => handleChange("correctiveAction", e.target.value)}
                placeholder="Immediate fix to address the issue..."
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Preventive Action</Label>
              <Textarea
                value={formData.preventiveAction}
                onChange={(e) => handleChange("preventiveAction", e.target.value)}
                placeholder="Long-term measures to prevent recurrence..."
                rows={3}
              />
            </div>
          </div>
          
          {/* Assignment & Timeline */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Responsible Person *</Label>
              <Input
                value={formData.responsiblePerson}
                onChange={(e) => handleChange("responsiblePerson", e.target.value)}
                placeholder="Owner of this CAPA"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Target Completion</Label>
              <Input
                type="date"
                value={formData.targetCompletionDate}
                onChange={(e) => handleChange("targetCompletionDate", e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Effectiveness Check</Label>
              <Input
                value={formData.effectivenessCheck}
                onChange={(e) => handleChange("effectivenessCheck", e.target.value)}
                placeholder="Verification method"
              />
            </div>
          </div>
          
          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* PHASE 2: EFFECTIVENESS EVIDENCE SECTION */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {showEvidenceSection && renderEvidenceSelector()}
          
          <Separator />
          
          {/* Relationship Picker */}
          <RelationshipPicker
            sourceId={sourceId}
            sourceForm="F/22"
            initialRelationships={formData.relatedRecords}
            onRelationshipsChange={handleRelatedRecordsChange}
          />
          
          {/* ISO 9.3.2 Management Review Notice */}
          {(formData.severity === "MAJOR" || formData.severity === "CRITICAL") && formData.status === "Closed" && (
            <Alert className="mt-4 border-indigo-400 bg-indigo-50">
              <Shield className="w-4 h-4 text-indigo-600" />
              <AlertDescription className="text-indigo-700">
                <strong>ISO 9001:2015 Clause 9.3.2:</strong> This {formData.severity} severity CAPA will 
                be automatically queued for Management Review upon closure. 
                {formData.addedToManagementReview && <span className="font-mono">Ref: {formData.managementReviewRef}</span>}
              </AlertDescription>
            </Alert>
          )}
          
        </div>
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !canSubmit}
            className={isClosed && !formData.effectivenessEvidence ? "bg-red-600" : ""}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? "Saving..." : 
             isClosed && !formData.effectivenessEvidence ? "Add Evidence Required" : "Save CAPA"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
