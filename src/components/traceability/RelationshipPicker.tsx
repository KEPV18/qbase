/**
 * Relationship Picker Component
 * 
 * UI for linking records with bidirectional traceability
 * Used in F/09, F/22, F/28, Risk, and Project forms
 * 
 * ISO 9001:2015 Clause 10.2 - Nonconformity and Corrective Action linkage
 */

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Link as LinkIcon,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Clock,
} from "lucide-react";
import {
  type RelatedRecord,
  type RelationshipType,
  type ISOClause,
  VALID_FORMS,
} from "@/lib/traceability";
import { useTraceabilityResolver, useRecordSuggestions } from "@/hooks/useTraceabilityResolver";

// ============================================================================
// A. CONFIGURATION
// ============================================================================

/** Relationship presets for each source type */
const RELATIONSHIP_PRESETS: Record<string, { type: RelationshipType; label: string; clause: ISOClause }[]> = {
  "F/09": [
    { type: "TRIGGERS", label: "Triggers CAPA", clause: "10.2" },
    { type: "IMPACTS", label: "Impacts Project", clause: "8.5" },
    { type: "REFERENCES", label: "References Property", clause: "8.5.3" },
  ],
  "F/22": [
    { type: "RESOLVES", label: "Resolves Complaint/NC", clause: "10.2" },
    { type: "REQUIRES_TRAINING", label: "Requires Training", clause: "7.2" },
    { type: "IDENTIFIES_RISK", label: "Identifies Risk", clause: "6.1" },
    { type: "TRIGGERS_REVIEW", label: "Triggers Review", clause: "9.3.2" },
    { type: "UPDATES_PROCEDURE", label: "Updates Procedure", clause: "7.5" },
  ],
  "F/28": [
    { type: "REFERENCES", label: "Required by CAPA", clause: "10.2" },
    { type: "IMPACTS", label: "Impacts Project", clause: "8.5" },
    { type: "REQUIRES_TRAINING", label: "Leads to Additional Training", clause: "7.2" },
  ],
  Risk: [
    { type: "MATERIALIZES_RISK", label: "Materialized in NC", clause: "10.2" },
    { type: "UPDATES_PROCEDURE", label: "Updates Procedure", clause: "6.1" },
    { type: "TRIGGERS_REVIEW", label: "Triggers Review", clause: "9.3.2" },
  ],
  Project: [
    { type: "REFERENCES", label: "Has Sales Record", clause: "8.2" },
    { type: "IMPACTS", label: "Impacts Customer Property", clause: "8.5.3" },
    { type: "REFERENCES", label: "Has Training Record", clause: "7.2" },
  ],
};

/** ISO Clause descriptions for tooltips */
const CLAUSE_DESCRIPTIONS: Record<ISOClause, string> = {
  "4.1": "Understanding organization and context",
  "4.2": "Understanding needs of interested parties",
  "4.3": "Determining scope of QMS",
  "4.4": "QMS and its processes",
  "5.1": "Leadership and commitment",
  "5.2": "Policy",
  "5.3": "Organizational roles, responsibilities",
  "6.1": "Actions to address risks and opportunities",
  "6.2": "Quality objectives",
  "6.3": "Planning of changes",
  "7.1": "Resources",
  "7.2": "Competence",
  "7.3": "Awareness",
  "7.4": "Communication",
  "7.5": "Documented information",
  "8.1": "Operational planning",
  "8.2": "Requirements for products/services",
  "8.3": "Design and development",
  "8.4": "Control of externally provided processes",
  "8.5": "Production and service provision",
  "8.6": "Release of products/services",
  "8.7": "Control of nonconforming outputs",
  "9.1": "Monitoring, measurement, analysis",
  "9.2": "Internal audit",
  "9.3": "Management review",
  "10.1": "General improvement",
  "10.2": "Nonconformity and corrective action",
  "10.3": "Continual improvement",
};

/** Color coding for relationship badges */
const RELATIONSHIP_COLORS: Record<RelationshipType, string> = {
  TRIGGERS: "bg-blue-500",
  RESOLVES: "bg-green-500",
  IMPACTS: "bg-amber-500",
  REFERENCES: "bg-gray-500",
  UPDATES_PROCEDURE: "bg-purple-500",
  TRIGGERS_REVIEW: "bg-indigo-500",
  REQUIRES_TRAINING: "bg-cyan-500",
  IDENTIFIES_RISK: "bg-red-500",
  MATERIALIZES_RISK: "bg-rose-500",
};

// ============================================================================
// B. SUB-COMPONENTS
// ============================================================================

interface RelationshipItemProps {
  relationship: RelatedRecord;
  onDelete: () => void;
  onNavigate: () => void;
  isBroken?: boolean;
}

function RelationshipItem({
  relationship,
  onDelete,
  onNavigate,
  isBroken,
}: RelationshipItemProps) {
  return (
    <Card className={cn(isBroken && "border-amber-400 bg-amber-50")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-md text-white text-xs font-bold", RELATIONSHIP_COLORS[relationship.relationship])}>
              {relationship.form}
            </div>
            <div>
              <p className="font-mono text-sm font-medium">
                {relationship.form}-{relationship.number}
                {isBroken && (
                  <AlertTriangle className="w-4 h-4 inline ml-2 text-amber-600" />
                )}
              </p>
              <display className="text-xs text-slate-500">
                {relationship.relationship} • {relationship.isoClause}
              </display>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={onNavigate}>
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View Record</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Remove Link</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        {relationship.notes && (
          <p className="text-xs text-slate-500 mt-2">{relationship.notes}</p>
        )}
        
        {relationship.timestamp && (
          <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
            <Clock className="w-3 h-3" />
            <span>
              Created {new Date(relationship.timestamp).toLocaleDateString()} by {relationship.createdBy || "Unknown"}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// C. MAIN COMPONENT
// ============================================================================

interface RelationshipPickerProps {
  /** Current record ID (e.g., "F/09-001") */
  sourceId: string;
  /** Form code (e.g., "F/09") */
  sourceForm: string;
  /** Existing relationships */
  initialRelationships?: RelatedRecord[];
  /** Callback when relationships change */
  onRelationshipsChange?: (relationships: RelatedRecord[]) => void;
  /** Optional className */
  className?: string;
  /** Read-only mode (for archived records) */
  readOnly?: boolean;
}

export function RelationshipPicker({
  sourceId,
  sourceForm,
  initialRelationships = [],
  onRelationshipsChange,
  className,
  readOnly = false,
}: RelationshipPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [relationshipToDelete, setRelationshipToDelete] = useState<RelatedRecord | null>(null);
  
  // Form state
  const [targetForm, setTargetForm] = useState<string>("");
  const [targetNumber, setTargetNumber] = useState("")
;  const [relationshipType, setRelationshipType] = useState<RelationshipType>("REFERENCES");
  const [isoClause, setIsoClause] = useState<ISOClause>("10.2");
  const [notes, setNotes] = useState("");
  
  const [relationships, setRelationships] = useState<RelatedRecord[]>(initialRelationships);
  
  const {
    addRelationship,
    removeRelationship,
    isAdding,
    isRemoving,
    brokenLinks,
  } = useTraceabilityResolver(sourceId);
  
  const presets = RELATIONSHIP_PRESETS[sourceForm] || RELATIONSHIP_PRESETS["F/09"];
  
  // Update parent when relationships change
  React.useEffect(() => {
    if (onRelationshipsChange) {
      onRelationshipsChange(relationships);
    }
  }, [relationships, onRelationshipsChange]);
  
  const handleAdd = async () => {
    if (!targetForm || !targetNumber) return;
    
    const newRel = {
      form: targetForm,
      number: targetNumber,
      relationship: relationshipType,
      bidirectional: true,
      isoClause,
      notes,
      status: "ACTIVE" as const,
    };
    
    // Add to local state
    setRelationships([...relationships, newRel]);
    
    // Persist via mutation
    addRelationship({
      sourceId,
      targetForm,
      targetNumber,
      relationship: relationshipType,
      isoClause,
      notes,
    });
    
    // Reset form
    setTargetForm("");
    setTargetNumber("");
    setRelationshipType("REFERENCES");
    setNotes("");
    setIsOpen(false);
  };
  
  const handleDelete = async () => {
    if (!relationshipToDelete) return;
    
    // Remove from local state
    setRelationships(relationships.filter(
      r => !(r.form === relationshipToDelete.form && r.number === relationshipToDelete.number)
    ));
    
    // Persist via mutation
    removeRelationship({
      sourceId,
      targetForm: relationshipToDelete.form,
      targetNumber: relationshipToDelete.number,
    });
    
    setDeleteDialogOpen(false);
    setRelationshipToDelete(null);
  };
  
  const openDeleteDialog = (rel: RelatedRecord) => {
    setRelationshipToDelete(rel);
    setDeleteDialogOpen(true);
  };
  
  const navigateToRecord = (form: string, number: string) => {
    // Navigate to record detail page
    const path = form === "Risk" ? `/risk-management?riskId=${number}` : `/record/${form}-${number}`;
    window.open(path, "_blank");
  };

  return (
    <div className={cn("space-y-4", className)}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                Related Records
                <Badge variant="secondary">{relationships.length}</Badge>
              </CardTitle>
              <p className="text-sm text-slate-500">
                Link to other QMS records for audit traceability
              </p>
            </div>
            
            {!readOnly && (
              <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Link
                  </Button>
                </DialogTrigger>
                
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Add Related Record</DialogTitle>
                    <DialogDescription>
                      Create a bidirectional link to another QMS record
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    {/* Target Form */}
                    <div className="space-y-2">
                      <Label>Target Form</Label>
                      <Select value={targetForm} onValueChange={setTargetForm}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select form type..." />
                        </SelectTrigger>
                        <SelectContent>
                          {VALID_FORMS.map((form) => (
                            <SelectItem key={form} value={form}>{form}</SelectItem>
                          ))}
                          <SelectItem value="Risk">Risk</SelectItem>
                          <SelectItem value="Project">Project</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Target Number */}
                    <div className="space-y-2">
                      <Label>Record Number</Label>
                      <Input
                        placeholder="e.g., 001"
                        value={targetNumber}
                        onChange={(e) => setTargetNumber(e.target.value)}
                      />
                    </div>
                    
                    {/* Relationship Type */}
                    <div className="space-y-2">
                      <Label>Relationship</Label>
                      <Select value={relationshipType} onValueChange={(v) => setRelationshipType(v as RelationshipType)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select relationship..." />
                        </SelectTrigger>
                        <SelectContent>
                          {presets.map((preset) => (
                            <SelectItem key={preset.type} value={preset.type}>
                              {preset.label} [{preset.clause}]
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-500 mt-1">
                        {CLAUSE_DESCRIPTIONS[isoClause]}
                      </p>
                    </div>
                    
                    {/* ISO Clause */}
                    <div className="space-y-2">
                      <Label>ISO 9001:2015 Clause</Label>
                      <Select value={isoClause} onValueChange={(v) => setIsoClause(v as ISOClause)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(CLAUSE_DESCRIPTIONS).map((clause) => (
                            <SelectItem key={clause} value={clause}>{clause}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Notes */}
                    <div className="space-y-2">
                      <Label>Notes (Optional)</Label>
                      <Textarea
                        placeholder="Explain the relationship context..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button
                      onClick={handleAdd}
                      disabled={!targetForm || !targetNumber || isAdding}
                    >
                      {isAdding ? "Linking..." : "Add Link"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {relationships.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <LinkIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm">No related records linked</p>
              {!readOnly && (
                <p className="text-xs mt-2">Use "Add Link" to connect records</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {relationships.map((rel, idx) => (
                <RelationshipItem
                  key={idx}
                  relationship={rel}
                  onDelete={() => openDeleteDialog(rel)}
                  onNavigate={() => navigateToRecord(rel.form, rel.number)}
                  isBroken={brokenLinks.includes(`${rel.form}-${rel.number}`)}
                />
              ))}
            </div>
          )}
          
          {brokenLinks.length > 0 && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">{brokenLinks.length} Broken Link(s)</span>
              </div>
              <p className="text-xs text-amber-700 mt-1">
                Some linked records could not be found in the live registry.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Link?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the bidirectional link to{" "}
              <strong>{relationshipToDelete?.form}-{relationshipToDelete?.number}</strong>.
              The link will no longer appear in traceability chains.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600">
              {isRemoving ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
