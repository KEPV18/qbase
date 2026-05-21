/**
 * Live Traceability Resolver Hook
 * 
 * Bridges live QMS data (Google Sheets, Drive) with TraceableRecord format
 * Fetches actual record data and resolves relationships for TraceView rendering
 * 
 * ISO 9001:2015 Clause 10.2 & 7.5.3 - Live traceability for operational data
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  type TraceableRecord,
  type RelatedRecord,
  type RecordRegistry,
  buildTraceChain,
  type TraceChain,
} from "@/lib/traceability";
import { listFormRecords, type FormRecord } from "@/lib/formRecordService";
import { getAllCAPAs, type CAPA } from "@/lib/capaRegisterService";
import { getAllRisks, type Risk } from "@/lib/riskRegisterService";
import { getAllProjects, type Project } from "@/data/projectsData";

const QUERY_KEY = ["traceability"];

// ============================================================================
// A. RECORD TRANSFORMATION - Live Data → TraceableRecord
// ============================================================================

/**
 * Transform a CAPA into TraceableRecord format
 */
function transformCAPA(capa: CAPA): TraceableRecord {
  return {
    id: capa.capaId,
    form: "F/22",
    number: capa.capaId.replace(/^CAPA-\d+-/, ""),
    title: capa.description.slice(0, 60) + (capa.description.length > 60 ? "..." : ""),
    date: capa.targetCompletionDate,
    status: capa.status === "Closed" ? "CLOSED" : 
            capa.status === "Open" ? "OPEN" : "IN_PROGRESS",
    isoClauses: ["10.2"],
    // Parse related records from reference field
    relatedRecords: parseRelatedRecordsFromReference(capa.reference, capa.capaId),
  };
}

/**
 * Transform a Risk into TraceableRecord format
 */
function transformRisk(risk: Risk): TraceableRecord {
  return {
    id: risk.riskId,
    form: "Risk",
    number: risk.riskId,
    title: risk.hazardDescription.slice(0, 60) + (risk.hazardDescription.length > 60 ? "..." : ""),
    date: risk.lastReviewed,
    status: risk.mitigationStatus === "Treatment Effective" ? "CLOSED" : 
            risk.mitigationStatus === "Treatment In Progress" ? "IN_PROGRESS" : "OPEN",
    isoClauses: ["6.1"],
    relatedRecords: [], // Will be fetched from relationship store
  };
}

/**
 * Transform a Project into TraceableRecord format
 */
function transformProject(project: Project): TraceableRecord {
  return {
    id: `Project-${project.id}`,
    form: "Project",
    number: project.id,
    title: `${project.name} (${project.client})`,
    date: project.startDate,
    status: project.status === "completed" ? "CLOSED" : 
            project.status === "active" ? "IN_PROGRESS" : "OPEN",
    isoClauses: ["8.1"],
    relatedRecords: project.linkedRecords?.map(r => ({
      form: r.formCode,
      number: r.recordNumber,
      relationship: r.relationType || "REFERENCES",
      bidirectional: true,
      isoClause: "8.1",
      status: "ACTIVE",
    })) || [],
  };
}

/**
 * Transform a FormRecord (F/09, F/28, etc.) into TraceableRecord format
 */
function transformFormRecord(record: FormRecord): TraceableRecord {
  // Extract form code from recordId (e.g., "F/09-001" -> "F/09")
  const parts = record.recordId.split("-");
  const form = parts.slice(0, -1).join("-") || parts[0];
  const number = parts[parts.length - 1];
  
  return {
    id: record.recordId,
    form,
    number,
    title: record.details?.title || record.recordId,
    date: record.date,
    status: record.status === "Closed" ? "CLOSED" : 
            record.status === "Approved" ? "CLOSED" : 
            record.status === "Open" ? "OPEN" : "IN_PROGRESS",
    isoClauses: ["10.2"], // Default, can be overridden by form type
    relatedRecords: record.details?.relatedRecords || [],
  };
}

/**
 * Parse related records from CAPA reference string
 * Handles formats like: "Complaint ID: F/09-001; Risk ID: R-012"
 */
function parseRelatedRecordsFromReference(reference: string, sourceId: string): RelatedRecord[] {
  const records: RelatedRecord[] = [];
  
  // Pattern: F/09-XXX (Customer Complaints)
  const complaintMatch = reference?.match(/F\/09-(\d+)/i);
  if (complaintMatch) {
    records.push({
      form: "F/09",
      number: complaintMatch[1].padStart(3, "0"),
      relationship: "RESOLVES",
      bidirectional: true,
      isoClause: "10.2",
      status: "ACTIVE",
    });
  }
  
  // Pattern: F/10-XXX (Internal Nonconformity)
  const ncMatch = reference?.match(/F\/10-(\d+)/i);
  if (ncMatch) {
    records.push({
      form: "F/10",
      number: ncMatch[1].padStart(3, "0"),
      relationship: "RESOLVES",
      bidirectional: true,
      isoClause: "10.2",
      status: "ACTIVE",
    });
  }
  
  // Pattern: Risk R-XXX
  const riskMatch = reference?.match(/Risk\s*([A-Z]-\d+)/i);
  if (riskMatch) {
    records.push({
      form: "Risk",
      number: riskMatch[1],
      relationship: "IDENTIFIES_RISK",
      bidirectional: true,
      isoClause: "6.1",
      status: "ACTIVE",
    });
  }
  
  return records;
}

// ============================================================================
// B. LIVE DATA FETCHING
// ============================================================================

/**
 * Fetch all traceable records from live sources
 */
async function fetchAllTraceableRecords(): Promise<RecordRegistry> {
  const registry: RecordRegistry = new Map();
  
  // Fetch CAPAs
  try {
    const capas = await getAllCAPAs();
    capas.forEach(capa => {
      registry.set(capa.capaId, transformCAPA(capa));
    });
  } catch (e) {
    console.warn("Failed to fetch CAPAs:", e);
  }
  
  // Fetch Risks
  try {
    const risks = await getAllRisks();
    risks.forEach(risk => {
      registry.set(risk.riskId, transformRisk(risk));
    });
  } catch (e) {
    console.warn("Failed to fetch Risks:", e);
  }
  
  // Fetch Projects
  try {
    const projects = await getAllProjects();
    projects.forEach(project => {
      registry.set(`Project-${project.id}`, transformProject(project));
    });
  } catch (e) {
    console.warn("Failed to fetch Projects:", e);
  }
  
  // Fetch Form Records (F/09, F/28, etc.) - requires form-specific queries
  // These would typically be fetched via listFormRecords for each form type
  
  return registry;
}

/**
 * Fetch a single record by ID from live sources
 */
async function fetchTraceableRecord(recordId: string): Promise<TraceableRecord | null> {
  // Try CAPA first
  try {
    const capas = await getAllCAPAs();
    const capa = capas.find(c => c.capaId === recordId);
    if (capa) return transformCAPA(capa);
  } catch (e) {
    console.warn("Failed to fetch CAPA:", e);
  }
  
  // Try Risk
  try {
    const risks = await getAllRisks();
    const risk = risks.find(r => r.riskId === recordId);
    if (risk) return transformRisk(risk);
  } catch (e) {
    console.warn("Failed to fetch Risk:", e);
  }
  
  // Try Project
  try {
    const projects = await getProjects();
    const project = projects.find(p => `Project-${p.id}` === recordId);
    if (project) return transformProject(project);
  } catch (e) {
    console.warn("Failed to fetch Project:", e);
  }
  
  return null;
}

// ============================================================================
// C. LOCALSTORAGE RELATIONSHIP STORE
// ============================================================================

const STORAGE_KEY = "qms_traceability_relationships";

interface StoredRelationship {
  id: string;
  sourceId: string;
  targetForm: string;
  targetNumber: string;
  relationship: RelatedRecord["relationship"];
  isoClause: RelatedRecord["isoClause"];
  timestamp: string;
  createdBy: string;
  notes?: string;
}

/**
 * Get all stored relationships from localStorage
 */
function getStoredRelationships(): StoredRelationship[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Store relationships to localStorage
 */
function storeRelationships(relationships: StoredRelationship[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(relationships));
}

/**
 * Add a new relationship
 */
async function addRelationship(
  sourceId: string,
  targetForm: string,
  targetNumber: string,
  relationship: RelatedRecord["relationship"],
  isoClause: RelatedRecord["isoClause"],
  notes?: string
): Promise<RelatedRecord> {
  const user = localStorage.getItem("auth_user") || "Unknown";
  
  const rel: StoredRelationship = {
    id: `${sourceId}-${targetForm}-${targetNumber}-${Date.now()}`,
    sourceId,
    targetForm,
    targetNumber,
    relationship,
    isoClause,
    timestamp: new Date().toISOString(),
    createdBy: user,
    notes,
  };
  
  const existing = getStoredRelationships();
  existing.push(rel);
  storeRelationships(existing);
  
  // Return as RelatedRecord format
  return {
    form: targetForm,
    number: targetNumber,
    relationship,
    bidirectional: true,
    isoClause,
    timestamp: rel.timestamp,
    createdBy: rel.createdBy,
    notes,
    status: "ACTIVE",
  };
}

/**
 * Remove a relationship
 */
async function removeRelationship(sourceId: string, targetForm: string, targetNumber: string): Promise<void> {
  const existing = getStoredRelationships();
  const filtered = existing.filter(
    r => !(r.sourceId === sourceId && r.targetForm === targetForm && r.targetNumber === targetNumber)
  );
  storeRelationships(filtered);
}

/**
 * Get all relationships for a record
 */
function getRelatedRecordsForId(recordId: string): RelatedRecord[] {
  const stored = getStoredRelationships();
  return stored
    .filter(r => r.sourceId === recordId)
    .map(r => ({
      form: r.targetForm,
      number: r.targetNumber,
      relationship: r.relationship,
      bidirectional: true,
      isoClause: r.isoClause,
      timestamp: r.timestamp,
      createdBy: r.createdBy,
      notes: r.notes,
      status: "ACTIVE" as const,
    }));
}

// ============================================================================
// D. HOOK EXPORTS
// ============================================================================

/**
 * Main hook for traceability resolution
 */
export function useTraceabilityResolver(recordId?: string) {
  const queryClient = useQueryClient();
  
  // Fetch all records for registry
  const {
    data: registry = new Map(),
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [...QUERY_KEY, "registry"],
    queryFn: fetchAllTraceableRecords,
    staleTime: 30000,
  });
  
  // Build trace chain for specific record
  const chain = recordId ? buildTraceChainFromRegistry(recordId, registry) : null;
  
  // Fetch specific record
  const { data: record, isLoading: recordLoading } = useQuery({
    queryKey: [...QUERY_KEY, "record", recordId],
    queryFn: () => fetchTraceableRecord(recordId!),
    enabled: !!recordId,
    staleTime: 30000,
  });
  
  // Add relationship mutation
  const addRelationshipMutation = useMutation({
    mutationFn: async (params: {
      sourceId: string;
      targetForm: string;
      targetNumber: string;
      relationship: RelatedRecord["relationship"];
      isoClause: RelatedRecord["isoClause"];
      notes?: string;
    }) => {
      return addRelationship(
        params.sourceId,
        params.targetForm,
        params.targetNumber,
        params.relationship,
        params.isoClause,
        params.notes
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Relationship Added", {
        description: "Bidirectional link created successfully.",
      });
    },
    onError: (error: Error) => {
      toast.error("Failed to Add Relationship", {
        description: error.message,
      });
    },
  });
  
  // Remove relationship mutation
  const removeRelationshipMutation = useMutation({
    mutationFn: async (params: {
      sourceId: string;
      targetForm: string;
      targetNumber: string;
    }) => {
      return removeRelationship(params.sourceId, params.targetForm, params.targetNumber);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Relationship Removed", {
        description: "Link deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast.error("Failed to Remove Relationship", {
        description: error.message,
      });
    },
  });
  
  // Check for broken links
  const brokenLinks = chain ? findBrokenLinks(chain, registry) : [];
  
  return {
    // Data
    registry,
    record,
    chain,
    
    // Status
    isLoading: isLoading || recordLoading,
    isError,
    error,
    
    // Statistics
    brokenLinks,
    hasBrokenLinks: brokenLinks.length > 0,
    relationshipCount: record?.relatedRecords?.length || 0,
    
    // Actions
    refetch,
    addRelationship: addRelationshipMutation.mutate,
    removeRelationship: removeRelationshipMutation.mutate,
    isAdding: addRelationshipMutation.isPending,
    isRemoving: removeRelationshipMutation.isPending,
    
    // Helper
    getRelatedRecords: getRelatedRecordsForId,
  };
}

/**
 * Build trace chain from registry
 */
function buildTraceChainFromRegistry(
  recordId: string,
  registry: RecordRegistry
): TraceChain | null {
  const root = registry.get(recordId);
  if (!root) return null;
  
  return buildTraceChain(root, registry);
}

/**
 * Find broken links in a trace chain
 */
function findBrokenLinks(chain: TraceChain, registry: RecordRegistry): string[] {
  const broken: string[] = [];
  
  for (const node of chain.nodes.values()) {
    for (const rel of node.record.relatedRecords) {
      const targetId = `${rel.form}-${rel.number}`;
      if (!registry.has(rel.form === "Risk" ? rel.number : `${rel.form}-${rel.number}`)) {
        // Check alternative ID formats
        const altId = rel.form === "Risk" 
          ? `Risk-${rel.number}` 
          : `${rel.form}-${parseInt(rel.number)}`.toString();
        
        if (!registry.has(altId) && !registry.has(rel.number)) {
          broken.push(`${rel.form}-${rel.number}`);
        }
      }
    }
  }
  
  return [...new Set(broken)];
}

/**
 * Hook for record suggestions (used in RelationshipPicker)
 */
export function useRecordSuggestions(searchTerm: string, excludeForm?: string) {
  const { registry, isLoading } = useTraceabilityResolver();
  
  const suggestions = Array.from(registry.values())
    .filter(r => {
      if (excludeForm && r.form === excludeForm) return false;
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        r.id.toLowerCase().includes(term) ||
        r.title.toLowerCase().includes(term) ||
        r.form.toLowerCase().includes(term)
      );
    })
    .slice(0, 10); // Limit to 10 suggestions
  
  return { suggestions, isLoading };
}
