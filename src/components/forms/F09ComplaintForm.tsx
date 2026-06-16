/**
 * F/09 Customer Complaint Form
 * 
 * Features:
 * - ISO 9001:2015 Clause 9.1.2 compliant
 * - RelationshipPicker for linking to CAPA (F/22)
 * - Validation: MAJOR/CRITICAL complaints require CAPA linkage
 * - Auto-populated related records for Projects
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
import { RelationshipPicker } from "@/components/traceability/RelationshipPicker";
import {
  type RelatedRecord,
  createBidirectionalLink,
} from "@/lib/traceability";
import { createFormRecord, type FormRecordInput } from "@/lib/formRecordService";
import { toast } from "sonner";
import { AlertTriangle, AlertCircle, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// A. INTERFACES
// ============================================================================

export interface F09FormData {
  complaintNumber: string;
  date: string;
  customerName: string;
  project: string;
  complaintType: "MINOR" | "MAJOR" | "CRITICAL";
  description: string;
  immediateAction: string;
  responsiblePerson: string;
  targetClosureDate: string;
  relatedRecords: RelatedRecord[];
}

interface F09ComplaintFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (recordId: string) => void;
  initialData?: Partial<F09FormData>;
  editMode?: boolean;
  recordId?: string;
}

// ============================================================================
// B. PROJECT OPTIONS
// ============================================================================

const PROJECT_OPTIONS = [
  "General / All Company",
  "BatFast Project",
  "ETH Project",
  "ETH-Cedric Project",
  "Video Detection Project",
  "Vocal AI Project",
  "Tennis Project",
  "Omniaz Project",
];

// ============================================================================
// C. VALIDATION
// ============================================================================

/**
 * Validate F/09 form data
 * MAJOR/CRITICAL complaints require CAPA linkage (Clause 10.2)
 */
function validateFormData(data: F09FormData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.customerName.trim()) {
    errors.push("Customer name is required");
  }
  
  if (!data.description.trim() || data.description.length < 20) {
    errors.push("Description must be at least 20 characters");
  }
  
  if (!data.responsiblePerson.trim()) {
    errors.push("Responsible person is required");
  }
  
  // ISO 9001:2015 Clause 10.2 - MAJOR/CRITICAL requires CAPA
  if ((data.complaintType === "MAJOR" || data.complaintType === "CRITICAL") && 
      !data.relatedRecords.some(r => r.form === "F/22" && r.relationship === "TRIGGERS")) {
    errors.push(`ISO Clause 10.2: ${data.complaintType} complaints require CAPA linkage`);
  }
  
  return { valid: errors.length === 0, errors };
}

// ============================================================================
// D. MAIN COMPONENT
// ============================================================================

export function F09ComplaintForm({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  editMode = false,
  recordId,
}: F09ComplaintFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showValidation, setShowValidation] = useState(false);
  
  const [formData, setFormData] = useState<F09FormData>({
    complaintNumber: initialData?.complaintNumber || "",
    date: initialData?.date || new Date().toISOString().split("T")[0],
    customerName: initialData?.customerName || "",
    project: initialData?.project || "General / All Company",
    complaintType: initialData?.complaintType || "MINOR",
    description: initialData?.description || "",
    immediateAction: initialData?.immediateAction || "",
    responsiblePerson: initialData?.responsiblePerson || "",
    targetClosureDate: initialData?.targetClosureDate || "",
    relatedRecords: initialData?.relatedRecords || [],
  });
  
  const sourceId = recordId || `F/09-${formData.complaintNumber || "NEW"}`;
  
  // Auto-validate when complaint type or related records change
  useEffect(() => {
    if (showValidation) {
      const { errors } = validateFormData(formData);
      setValidationErrors(errors);
    }
  }, [formData.complaintType, formData.relatedRecords, showValidation]);
  
  const handleChange = (field: keyof F09FormData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleRelatedRecordsChange = (records: RelatedRecord[]) => {
    setFormData(prev => ({ ...prev, relatedRecords: records }));
  };
  
  const handleSubmit = async () => {
    setShowValidation(true);
    const { valid, errors } = validateFormData(formData);
    
    if (!valid) {
      setValidationErrors(errors);
      toast.error("Validation Failed", {
        description: errors[0],
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Build record input
      const recordInput: FormRecordInput = {
        formCode: "F/09",
        title: `Customer Complaint - ${formData.customerName} (${formData.complaintType})`,
        details: {
          customerName: formData.customerName,
          project: formData.project,
          complaintType: formData.complaintType,
          description: formData.description,
          immediateAction: formData.immediateAction,
          responsiblePerson: formData.responsiblePerson,
          targetClosureDate: formData.targetClosureDate,
          isoClauses: ["9.1.2", "10.2"],
          relatedRecords: formData.relatedRecords,
        },
      };
      
      // Create record
      const record = await createFormRecord(recordInput);
      
      // Save bidirectional links
      for (const related of formData.relatedRecords) {
        if (related.bidirectional) {
          await createBidirectionalLink(
            record.recordId,
            related.form,
            related.number,
            related.relationship,
            related.isoClause
          );
        }
      }
      
      toast.success("Complaint Recorded", {
        description: `${record.recordId} created with ${formData.relatedRecords.length} linked records.`,
      });
      
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
  
  const isMajor = formData.complaintType === "MAJOR" || formData.complaintType === "CRITICAL";
  const hasCAPALink = formData.relatedRecords.some(r => r.form === "F/22" && r.relationship === "TRIGGERS");
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-mono">F/09</span>
            <DialogTitle>Customer Complaint Record</DialogTitle>
          </div>
          <DialogDescription>
            ISO 9001:2015 Clause 9.1.2 — Customer Feedback and Complaints
          </DialogDescription>
        </DialogHeader>
        
        {showValidation && validationErrors.length > 0 && (
          <Alert className="mb-4 border-amber-400 bg-amber-50">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <AlertTitle>Validation Errors</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside mt-2">
                {validationErrors.map((err, i) => (
                  <li key={i} className="text-sm">{err}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-6 py-4">
          {/* Header Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Complaint Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => handleChange("date", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Complaint Number</Label>
              <Input
                value={formData.complaintNumber}
                onChange={(e) => handleChange("complaintNumber", e.target.value)}
                placeholder="Auto-generated"
                disabled={!editMode}
              />
            </div>
          </div>
          
          {/* Customer Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Customer / Client Name *</Label>
              <Input
                value={formData.customerName}
                onChange={(e) => handleChange("customerName", e.target.value)}
                placeholder="e.g., ETH Client"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Associated Project</Label>
              <Select value={formData.project} onValueChange={(v) => handleChange("project", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_OPTIONS.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Classification */}
          <div className="space-y-2">
            <Label>Complaint Classification *</Label>
            <Select 
              value={formData.complaintType} 
              onValueChange={(v) => handleChange("complaintType", v as F09FormData["complaintType"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MINOR">MINOR — Minor issue, immediate resolution</SelectItem>
                <SelectItem value="MAJOR">MAJOR — Significant quality impact</SelectItem>
                <SelectItem value="CRITICAL">CRITICAL — Safety/regulatory impact</SelectItem>
              </SelectContent>
            </Select>
            
            {isMajor && !hasCAPALink && (
              <Alert className="mt-2 border-red-400 bg-red-50">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-700">
                  <strong>ISO 9001:2015 Clause 10.2:</strong> MAJOR/CRITICAL complaints 
                  must trigger a CAPA before submission.
                </AlertDescription>
              </Alert>
            )}
          </div>
          
          {/* Description */}
          <div className="space-y-2">
            <Label>Complaint Description *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Detailed description of the complaint..."
              rows={4}
            />
          </div>
          
          {/* Immediate Action */}
          <div className="space-y-2">
            <Label>Immediate Action Taken</Label>
            <Textarea
              value={formData.immediateAction}
              onChange={(e) => handleChange("immediateAction", e.target.value)}
              placeholder="Containment actions, temporary fixes..."
              rows={3}
            />
          </div>
          
          {/* Assignment */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Responsible Person *</Label>
              <Input
                value={formData.responsiblePerson}
                onChange={(e) => handleChange("responsiblePerson", e.target.value)}
                placeholder="Name of complaint owner"
              />
            </div>
            <div className="space-y-2">
              <Label>Target Closure Date</Label>
              <Input
                type="date"
                value={formData.targetClosureDate}
                onChange={(e) => handleChange("targetClosureDate", e.target.value)}
              />
            </div>
          </div>
          
          <Separator />
          
          {/* Relationship Picker */}
          <RelationshipPicker
            sourceId={sourceId}
            sourceForm="F/09"
            initialRelationships={formData.relatedRecords}
            onRelationshipsChange={handleRelatedRecordsChange}
          />
          
        </div>
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || (isMajor && !hasCAPALink)}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? "Saving..." : "Save Complaint"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
