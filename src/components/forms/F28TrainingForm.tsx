/**
 * F/28 Training Record Form
 * 
 * Features:
 * - ISO 9001:2015 Clause 7.2 compliant
 * - RelationshipPicker for linking to CAPA, Project, Procedure
 * - Skills matrix integration
 * - Effectiveness evaluation
 */

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { RelationshipPicker } from "@/components/traceability/RelationshipPicker";
import {
  type RelatedRecord,
  createBidirectionalLink,
} from "@/lib/traceability";
import { createFormRecord, type FormRecordInput } from "@/lib/formRecordService";
import { toast } from "sonner";
import { AlertTriangle, Save, X, GraduationCap, Users } from "lucide-react";

// ============================================================================
// A. INTERFACES
// ============================================================================

export interface F28FormData {
  trainingId: string;
  date: string;
  trainingTopic: string;
  trainingType: "Initial" | "Recurring" | "Refresher" | "Corrective";
  triggeredBy: string; // e.g., "CAPA-001", "Annual Requirement"
  participants: string[];
  numberOfParticipants: number;
  trainer: string;
  duration: string;
  method: "Classroom" | "Online" | "On-the-Job" | "Workshop";
  content: string;
  evaluationMethod: string;
  effectivenessResult: string;
  competencyAchieved: boolean;
  nextTrainingDate: string;
  project: string;
  relatedRecords: RelatedRecord[];
}

interface F28TrainingFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (recordId: string) => void;
  initialData?: Partial<F28FormData>;
  editMode?: boolean;
  recordId?: string;
  autoLinkTo?: { form: string; number: string }; // Auto-link from CAPA
}

// ============================================================================
// B. CONFIGURATION
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

const TRAINER_OPTIONS = [
  "Ahmed Khaled",
  "Andrew Maged",
  "Youssef Hamada",
  "Eman El Serafy",
  "Mena Sami",
  "Yara Khairy",
  "External Trainer",
];

// ============================================================================
// C. VALIDATION
// ============================================================================

function validateFormData(data: F28FormData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.trainingTopic.trim()) {
    errors.push("Training topic is required");
  }
  
  if (!data.trainer) {
    errors.push("Trainer is required");
  }
  
  if (data.participants.length === 0 && data.numberOfParticipants <= 0) {
    errors.push("At least one participant is required");
  }
  
  if (!data.content.trim() || data.content.length < 20) {
    errors.push("Training content must be at least 20 characters");
  }
  
  // ISO 7.2: Effectiveness must be evaluated
  if (!data.evaluationMethod.trim()) {
    errors.push("Evaluation method is required (Clause 7.2 compliance)");
  }
  
  if (data.trainingType === "Corrective" && 
      !data.relatedRecords.some(r => r.form === "F/22" && r.relationship === "REQUIRES_TRAINING")) {
    errors.push("Corrective training must be linked to a CAPA (Clause 10.2)");
  }
  
  return { valid: errors.length === 0, errors };
}

// ============================================================================
// D. MAIN COMPONENT
// ============================================================================

export function F28TrainingForm({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  editMode = false,
  recordId,
  autoLinkTo,
}: F28TrainingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showValidation, setShowValidation] = useState(false);
  const [participantInput, setParticipantInput] = useState("");
  
  const [formData, setFormData] = useState<F28FormData>({
    trainingId: initialData?.trainingId || "",
    date: initialData?.date || new Date().toISOString().split("T")[0],
    trainingTopic: initialData?.trainingTopic || "",
    trainingType: initialData?.trainingType || "Initial",
    triggeredBy: initialData?.triggeredBy || "",
    participants: initialData?.participants || [],
    numberOfParticipants: initialData?.numberOfParticipants || 0,
    trainer: initialData?.trainer || "",
    duration: initialData?.duration || "1 hour",
    method: initialData?.method || "Classroom",
    content: initialData?.content || "",
    evaluationMethod: initialData?.evaluationMethod || "",
    effectivenessResult: initialData?.effectivenessResult || "",
    competencyAchieved: initialData?.competencyAchieved ?? false,
    nextTrainingDate: initialData?.nextTrainingDate || "",
    project: initialData?.project || "General / All Company",
    relatedRecords: initialData?.relatedRecords || [],
  });
  
  // Auto-populate link if coming from CAPA
  useEffect(() => {
    if (autoLinkTo && formData.relatedRecords.length === 0) {
      const autoLink: RelatedRecord = {
        form: autoLinkTo.form,
        number: autoLinkTo.number,
        relationship: "REQUIRES_TRAINING",
        bidirectional: true,
        isoClause: "7.2",
        status: "ACTIVE",
        notes: `Training required by CAPA ${autoLinkTo.form}-${autoLinkTo.number}`,
      };
      setFormData(prev => ({
        ...prev,
        relatedRecords: [autoLink],
        triggeredBy: `${autoLinkTo.form}-${autoLinkTo.number}`,
        trainingType: "Corrective",
      }));
    }
  }, [autoLinkTo]);
  
  const sourceId = recordId || formData.trainingId || "F/28-NEW";
  
  const handleChange = (field: keyof F28FormData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleRelatedRecordsChange = (records: RelatedRecord[]) => {
    setFormData(prev => ({ ...prev, relatedRecords: records }));
  };
  
  const addParticipant = () => {
    if (participantInput.trim()) {
      setFormData(prev => ({
        ...prev,
        participants: [...prev.participants, participantInput.trim()],
        numberOfParticipants: prev.participants.length + 1,
      }));
      setParticipantInput("");
    }
  };
  
  const removeParticipant = (index: number) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.filter((_, i) => i !== index),
      numberOfParticipants: prev.participants.length - 1,
    }));
  };
  
  const handleSubmit = async () => {
    setShowValidation(true);
    const { valid, errors } = validateFormData(formData);
    
    if (!valid) {
      setValidationErrors(errors);
      toast.error("Validation Failed", { description: errors[0] });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const recordInput: FormRecordInput = {
        formCode: "F/28",
        title: `${formData.trainingTopic} - ${formData.trainingType} Training`,
        details: {
          trainingTopic: formData.trainingTopic,
          trainingType: formData.trainingType,
          triggeredBy: formData.triggeredBy,
          participants: formData.participants,
          numberOfParticipants: formData.numberOfParticipants,
          trainer: formData.trainer,
          duration: formData.duration,
          method: formData.method,
          content: formData.content,
          evaluationMethod: formData.evaluationMethod,
          effectivenessResult: formData.effectivenessResult,
          competencyAchieved: formData.competencyAchieved,
          nextTrainingDate: formData.nextTrainingDate,
          project: formData.project,
          isoClauses: ["7.2"],
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
            related.relationship === "REQUIRES_TRAINING" ? "REFERENCES" : related.relationship,
            related.isoClause
          );
        }
      }
      
      toast.success("Training Recorded", {
        description: `${record.recordId} saved with ${formData.participants.length} participants.`,
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
  
  const isCorrective = formData.trainingType === "Corrective";
  const hasCAPALink = formData.relatedRecords.some(r => 
    r.form === "F/22" && r.relationship === "REQUIRES_TRAINING"
  );
  
  const canSubmit = formData.trainingTopic && 
                    formData.trainer && 
                    formData.participants.length > 0 &&
                    (!isCorrective || hasCAPALink);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-mono">F/28</span>
            <DialogTitle>Training Record</DialogTitle>
          </div>
          <DialogDescription>
            ISO 9001:2015 Clause 7.2 — Competence
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
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Training Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => handleChange("date", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Training Type</Label>
              <Select 
                value={formData.trainingType} 
                onValueChange={(v) => handleChange("trainingType", v as F28FormData["trainingType"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Initial">Initial</SelectItem>
                  <SelectItem value="Recurring">Recurring</SelectItem>
                  <SelectItem value="Refresher">Refresher</SelectItem>
                  <SelectItem value="Corrective">Corrective (Post-CAPA)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Project</Label>
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
          
          {/* Training Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Training Topic *</Label>
              <Input
                value={formData.trainingTopic}
                onChange={(e) => handleChange("trainingTopic", e.target.value)}
                placeholder="e.g., Video Annotation Quality Standards"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Trainer *</Label>
                <Select value={formData.trainer} onValueChange={(v) => handleChange("trainer", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRAINER_OPTIONS.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duration</Label>
                <Input
                  value={formData.duration}
                  onChange={(e) => handleChange("duration", e.target.value)}
                  placeholder="e.g., 2 hours"
                />
              </div>
              <div className="space-y-2">
                <Label>Method</Label>
                <Select value={formData.method} onValueChange={(v) => handleChange("method", v as F28FormData["method"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Classroom">Classroom</SelectItem>
                    <SelectItem value="Online">Online</SelectItem>
                    <SelectItem value="On-the-Job">On-the-Job</SelectItem>
                    <SelectItem value="Workshop">Workshop</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Training Content *</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => handleChange("content", e.target.value)}
                placeholder="Topics covered, materials used, objectives..."
                rows={3}
              />
            </div>
          </div>
          
          {/* Participants */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Participants ({formData.participants.length})
            </Label>
            
            <div className="flex gap-2">
              <Input
                placeholder="Add participant (Agent ID or Name)"
                value={participantInput}
                onChange={(e) => setParticipantInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addParticipant())}
              />
              <Button type="button" variant="outline" onClick={addParticipant}>
                Add
              </Button>
            </div>
            
            {formData.participants.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.participants.map((p, idx) => (
                  <span 
                    key={idx} 
                    className="inline-flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-sm"
                  >
                    {p}
                    <button 
                      onClick={() => removeParticipant(idx)}
                      className="text-slate-400 hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          
          {/* Evaluation */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Evaluation Method * (Clause 7.2 Compliance)</Label>
              <Input
                value={formData.evaluationMethod}
                onChange={(e) => handleChange("evaluationMethod", e.target.value)}
                placeholder="e.g., Written test, practical demonstration, supervisor observation"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Effectiveness Result</Label>
              <Textarea
                value={formData.effectivenessResult}
                onChange={(e) => handleChange("effectivenessResult", e.target.value)}
                placeholder="Results of competency assessment..."
                rows={2}
              />
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="competency"
                  checked={formData.competencyAchieved}
                  onCheckedChange={(checked) => handleChange("competencyAchieved", checked)}
                />
                <Label htmlFor="competency">
                  Competency Achieved
                </Label>
              </div>
              
              <div className="space-y-2 flex-1">
                <Label>Next Training Date</Label>
                <Input
                  type="date"
                  value={formData.nextTrainingDate}
                  onChange={(e) => handleChange("nextTrainingDate", e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Relationship Picker */}
          <RelationshipPicker
            sourceId={sourceId}
            sourceForm="F/28"
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
            disabled={isSubmitting || !canSubmit}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? "Saving..." : "Save Training Record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
