/**
 * Live Traceability Resolver Hook — Supabase Edition
 * 
 * Bridges live QMS data (Supabase) with TraceableRecord format
 * Fetches actual record data and resolves relationships for TraceView rendering
 * 
 * ISO 9001:2015 Clause 10.2 & 7.5.3 - Live traceability for operational data
 * 
 * Adapted from QMS Personal Site — replaced Google Sheets/Drive with Supabase
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type TraceableRecord,
  type RecordRegistry,
  buildTraceChain,
  type TraceChain,
} from "@/lib/traceability";
import { getAllCAPAs, type CAPA } from "@/lib/capaRegisterService";
import { getAllRisks, type Risk } from "@/lib/riskRegisterService";
import { PROJECTS, type Project } from "@/data/projectsData";

const QUERY_KEY = ["traceability"];

// ============================================================================
// A. RECORD TRANSFORMATION - Supabase Data → TraceableRecord
// ============================================================================

/**
 * Transform a Supabase CAPA (snake_case) into TraceableRecord format
 */
function transformCAPA(capa: CAPA): TraceableRecord {
  return {
    id: capa.capa_id,
    form: "F/22",
    number: capa.capa_id.replace(/^CAPA-\d+-/, ""),
    title: capa.description.slice(0, 60) + (capa.description.length > 60 ? "..." : ""),
    date: capa.target_completion_date || capa.created_at,
    status: capa.status === "Closed" ? "CLOSED" : 
            capa.status === "Open" ? "OPEN" : "IN_PROGRESS",
    isoClauses: ["10.2"],
    relatedRecords: parseRelatedRecordsFromReference(capa.reference, capa.capa_id),
  };
}

/**
 * Transform a Supabase Risk (snake_case) into TraceableRecord format
 */
function transformRisk(risk: Risk): TraceableRecord {
  return {
    id: risk.risk_id,
    form: "Risk",
    number: risk.risk_id,
    title: risk.risk_description.slice(0, 60) + (risk.risk_description.length > 60 ? "..." : ""),
    date: risk.review_date || risk.created_at,
    status: risk.status === "Controlled" ? "CLOSED" : 
            risk.status === "Under Review" ? "IN_PROGRESS" : "OPEN",
    isoClauses: ["6.1"],
    relatedRecords: risk.linked_capa ? [{
      form: "F/22",
      number: risk.linked_capa,
      relationship: "RESOLVES" as const,
      bidirectional: true,
      isoClause: "10.2",
      status: "ACTIVE" as const,
    }] : [],
  };
}

/**
 * Transform a static Project into TraceableRecord format
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
    relatedRecords: (project.qmsRecords || []).map(r => ({
      form: r.formCode,
      number: r.serial,
      relationship: "REFERENCES" as const,
      bidirectional: true,
      isoClause: "8.1",
      status: "ACTIVE" as const,
    })),
  };
}

/**
 * Parse related records from a CAPA reference string
 * Reference format: "F/09-001, F/12-003, Risk-R001"
 */
function parseRelatedRecordsFromReference(reference: string | null, sourceId: string) {
  if (!reference) return [];
  const refs: TraceableRecord['relatedRecords'] = [];
  const parts = reference.split(/[,\n]+/).map(s => s.trim()).filter(Boolean);
  
  for (const part of parts) {
    const formMatch = part.match(/^(F\/\d{2})-?(\d{3})/i);
    if (formMatch) {
      refs.push({
        form: formMatch[1],
        number: formMatch[2],
        relationship: "REFERENCES",
        bidirectional: true,
        isoClause: "8.1",
        status: "ACTIVE",
      });
    }
    const riskMatch = part.match(/^(R-\d+|Risk-\d+|RISK-\d+)/i);
    if (riskMatch) {
      refs.push({
        form: "Risk",
        number: riskMatch[1],
        relationship: "IDENTIFIES_RISK",
        bidirectional: true,
        isoClause: "6.1",
        status: "ACTIVE",
      });
    }
  }
  return refs;
}

// ============================================================================
// B. DATA FETCHING - Supabase First
// ============================================================================

/**
 * Build complete registry of traceable records from all data sources
 */
async function buildFullRegistry(): Promise<RecordRegistry> {
  const registry: RecordRegistry = new Map();
  
  // 1. Load CAPAs from Supabase
  try {
    const capas = await getAllCAPAs();
    capas.forEach(capa => {
      registry.set(capa.capa_id, transformCAPA(capa));
    });
  } catch (err) {
    console.warn("[traceability] Failed to load CAPAs:", err);
  }

  // 2. Load Risks from Supabase
  try {
    const risks = await getAllRisks();
    risks.forEach(risk => {
      registry.set(risk.risk_id, transformRisk(risk));
    });
  } catch (err) {
    console.warn("[traceability] Failed to load Risks:", err);
  }

  // 3. Load Projects from static data
  PROJECTS.forEach(project => {
    const record = transformProject(project);
    registry.set(record.id, record);
  });

  // 4. Form records are not yet in Supabase (stub for future)
  // When records table has form data, add: loadFormRecords(registry)

  return registry;
}

/**
 * Build registry starting from a specific record, resolving its chain
 */
async function resolveTraceChain(recordId: string): Promise<{
  registry: RecordRegistry;
  chain: TraceChain | null;
}> {
  const registry = await buildFullRegistry();
  const rootRecord = registry.get(recordId);
  
  if (!rootRecord) {
    return { registry, chain: null };
  }

  // Build trace chain from root record
  const chain = buildTraceChain(rootRecord, registry);
  return { registry, chain };
}

// ============================================================================
// C. HOOK - useTraceabilityResolver
// ============================================================================

export function useTraceabilityResolver(recordId?: string) {
  const queryClient = useQueryClient();

  // Query for full registry (used on the overview page)
  const registryQuery = useQuery({
    queryKey: [QUERY_KEY, "registry"],
    queryFn: buildFullRegistry,
    staleTime: 5 * 60 * 1000, // 5 min
  });

  // Query for specific trace chain (used on the detail page)
  const chainQuery = useQuery({
    queryKey: [QUERY_KEY, "chain", recordId],
    queryFn: () => resolveTraceChain(recordId!),
    enabled: !!recordId,
    staleTime: 5 * 60 * 1000,
  });

  const registry = recordId 
    ? chainQuery.data?.registry || new Map()
    : registryQuery.data || new Map();
  
  const rootRecord = recordId 
    ? chainQuery.data?.registry?.get(recordId) || null
    : null;

  const chain = chainQuery.data?.chain || null;

  // Compute broken links
  const brokenLinks: string[] = [];
  registry.forEach((record) => {
    record.relatedRecords?.forEach((ref) => {
      const lookupId = `${ref.form}-${ref.number}`;
      const altId = ref.form === "Risk" ? ref.number : lookupId;
      if (!registry.has(lookupId) && !registry.has(altId)) {
        brokenLinks.push(`${record.id} → ${lookupId}`);
      }
    });
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
  };

  return {
    registry,
    record: rootRecord,
    chain,
    brokenLinks,
    isLoading: registryQuery.isLoading || (recordId ? chainQuery.isLoading : false),
    error: registryQuery.error || chainQuery.error,
    invalidate,
  };
}

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
    .slice(0, 10);
  
  return { suggestions, isLoading };
}

export type { TraceableRecord, TraceChain, RecordRegistry };