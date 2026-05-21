/**
 * Relationship-Based Traceability System
 * ISO 9001:2015 QMS — Option 2 Implementation
 * 
 * Preserves existing F/XX numbering while adding:
 * - Relationship graph between records
 * - Bidirectional link synchronization
 * - ISO clause tagging
 * - Client-side aggregation
 */

// ============================================================================
// A. DATA STRUCTURES
// ============================================================================

/** ISO 9001:2015 Clause reference for relationship tagging */
export type ISOClause = 
  | "4.1" | "4.2" | "4.3" | "4.4"   // Context of Organization
  | "5.1" | "5.2" | "5.3"           // Leadership
  | "6.1" | "6.2" | "6.3"           // Planning
  | "7.1" | "7.2" | "7.3" | "7.4" | "7.5" // Support
  | "8.1" | "8.2" | "8.3" | "8.4" | "8.5" | "8.6" | "8.7" // Operation
  | "9.1" | "9.2" | "9.3"           // Performance Evaluation
  | "10.1" | "10.2" | "10.3";         // Improvement

/** Relationship types for traceability links */
export type RelationshipType =
  | "TRIGGERS"              // Source initiates target (e.g., Complaint → CAPA)
  | "RESOLVES"              // Target resolves source (e.g., CAPA → Complaint)
  | "IMPACTS"               // Source affects target process/output
  | "REFERENCES"            // General reference link
  | "UPDATES_PROCEDURE"     // Source requires procedure update
  | "TRIGGERS_REVIEW"       // Source triggers Management Review
  | "REQUIRES_TRAINING"     // Source requires training action
  | "IDENTIFIES_RISK"       // Source identifies new risk
  | "MATERIALIZES_RISK";    // Risk materialized into nonconformity

/** Metadata for each traceability link */
export interface RelatedRecord {
  form: string;                    // e.g., "F/22", "F/28", "Risk"
  number: string;                  // e.g., "001", "R-012"
  relationship: RelationshipType;
  bidirectional: boolean;          // If true, reverse link auto-generated
  isoClause: ISOClause;
  timestamp?: string;              // ISO 8601 date of link creation
  createdBy?: string;              // User who created link
  notes?: string;                  // Optional explanation
  status?: "ACTIVE" | "PENDING" | "BROKEN"; // Link health
}

/** Core interface for any traceable record */
export interface TraceableRecord {
  id: string;                      // Unique record ID (e.g., "F/09-001")
  form: string;                    // Form code (e.g., "F/09")
  number: string;                  // Sequential number (e.g., "001")
  title: string;
  date: string;                    // ISO 8601 date
  status: "OPEN" | "IN_PROGRESS" | "CLOSED" | "CANCELLED";
  relatedRecords: RelatedRecord[]; // Traceability links
  isoClauses?: ISOClause[];        // Clauses this record addresses
  auditTrail?: AuditEvent[];       // Field-level change history
}

/** Audit event for change tracking */
export interface AuditEvent {
  timestamp: string;
  user: string;
  action: "CREATED" | "UPDATED" | "LINKED" | "CLOSED";
  field?: string;
  oldValue?: unknown;
  newValue?: unknown;
}

// ============================================================================
// B. VALIDATION RULES
// ============================================================================

/** Validation result for traceability operations */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  field: string;
  severity: "CRITICAL" | "ERROR";
}

export interface ValidationWarning {
  code: string;
  message: string;
  field: string;
  suggestion?: string;
}

/** Known valid form codes in the system */
export const VALID_FORMS = [
  "F/09",   // Customer Complaint
  "F/10",   // Customer Feedback
  "F/11",   // Production Plan
  "F/19",   // Product Description
  "F/21",   // Management Review
  "F/22",   // CAPA
  "F/28",   // Training Record
  "F/30",   // Production Record
  "F/43",   // Onboarding
  "F/44",   // Recruitment
  "F/45",   // Document Master List
  "Risk",   // Risk Register
  "Project" // Projects
] as const;

/** Registry of known records (populated from system data) */
export type RecordRegistry = Map<string, TraceableRecord>;

/**
 * Validate a traceability link before saving
 * Rules:
 * 1. Target form code must be valid
 * 2. Target number must exist in registry
 * 3. Cyclic dependencies prevented (no A→B→A where A closes)
 * 4. Duplicate links flagged (same form+number+relationship)
 */
export function validateRelatedRecord(
  record: RelatedRecord,
  sourceRecord: TraceableRecord,
  registry: RecordRegistry
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Rule 1: Valid form code
  if (!VALID_FORMS.includes(record.form as typeof VALID_FORMS[number])) {
    errors.push({
      code: "INVALID_FORM",
      message: `Form code "${record.form}" is not recognized`,
      field: "form",
      severity: "CRITICAL"
    });
  }

  // Rule 2: Target exists in registry
  const targetId = `${record.form}-${record.number}`;
  const targetExists = registry.has(targetId);
  
  if (!targetExists) {
    errors.push({
      code: "MISSING_TARGET",
      message: `Target record ${targetId} not found in system registry`,
      field: "number",
      severity: "CRITICAL"
    });
  }

  // Rule 3: Cyclic check (prevent closing records from linking to open ancestors)
  if (sourceRecord.status === "CLOSED" && targetExists) {
    const target = registry.get(targetId)!;
    if (target.status === "OPEN") {
      warnings.push({
        code: "CLOSED_TO_OPEN_LINK",
        message: `Closed record ${sourceRecord.id} links to open record ${targetId}`,
        field: "status",
        suggestion: "Verify this is intentional (e.g., closed complaint triggers new CAPA)"
      });
    }
  }

  // Rule 4: Duplicate check within source
  const duplicates = sourceRecord.relatedRecords.filter(
    r => r.form === record.form && 
         r.number === record.number && 
         r.relationship === record.relationship
  );
  
  if (duplicates.length > 0) {
    errors.push({
      code: "DUPLICATE_LINK",
      message: `Link to ${targetId} with relationship "${record.relationship}" already exists`,
      field: "relationship",
      severity: "ERROR"
    });
  }

  // Rule 5: ISO clause alignment
  const clauseValid = /^\d{1,2}\.\d{1,2}$/.test(record.isoClause);
  if (!clauseValid) {
    errors.push({
      code: "INVALID_CLAUSE",
      message: `ISO clause "${record.isoClause}" format invalid (expected X.Y or X.YZ)`,
      field: "isoClause",
      severity: "ERROR"
    });
  }

  return {
    valid: errors.filter(e => e.severity === "CRITICAL").length === 0,
    errors,
    warnings
  };
}

// ============================================================================
// C. BIDIRECTIONAL SYNC
// ============================================================================

/**
 * Generate the reverse relationship for bidirectional links
 * Mapping: Each relationship has defined inverse
 */
export const RELATIONSHIP_INVERSE: Record<RelationshipType, RelationshipType> = {
  "TRIGGERS": "RESOLVES",
  "RESOLVES": "TRIGGERS",
  "IMPACTS": "REFERENCES",
  "REFERENCES": "REFERENCES",
  "UPDATES_PROCEDURE": "REFERENCES",
  "TRIGGERS_REVIEW": "REFERENCES",
  "REQUIRES_TRAINING": "REFERENCES",
  "IDENTIFIES_RISK": "MATERIALIZES_RISK",
  "MATERIALIZES_RISK": "IDENTIFIES_RISK"
};

/**
 * Create bidirectional link
 * When A links to B, this generates B's link back to A
 */
export function createBidirectionalLink(
  source: TraceableRecord,
  targetRecord: RelatedRecord
): RelatedRecord | null {
  if (!targetRecord.bidirectional) return null;

  const inverseRelationship = RELATIONSHIP_INVERSE[targetRecord.relationship];
  
  return {
    form: source.form,
    number: source.number,
    relationship: inverseRelationship,
    bidirectional: true,
    isoClause: targetRecord.isoClause,
    timestamp: new Date().toISOString(),
    status: "ACTIVE"
  };
}

// ============================================================================
// D. TRACE CHAIN RESOLUTION (Client-Side)
// ============================================================================

/** Node in the traceability graph */
export interface TraceNode {
  record: TraceableRecord;
  depth: number;              // Distance from starting node
  path: string[];             // IDs visited to reach this node
  incoming: TraceNode[];      // Parent nodes (point to this)
  outgoing: TraceNode[];      // Child nodes (pointed to by this)
}

/** Complete trace chain from a starting record */
export interface TraceChain {
  rootId: string;
  nodes: Map<string, TraceNode>;
  ordered: TraceNode[];       // BFS traversal for display
  cycles: string[][];          // Detected cycles (for warning)
  gaps: string[];              // Broken links
  stats: {
    totalRecords: number;
    maxDepth: number;
    byForm: Record<string, number>;
    byClause: Record<string, number>;
  };
}

/**
 * Build complete trace chain from starting record
 * Uses BFS traversal with cycle detection
 * Performance target: <2s for ≤15 linked records
 */
export function buildTraceChain(
  startRecord: TraceableRecord,
  registry: RecordRegistry,
  maxDepth: number = 10
): TraceChain {
  const startTime = performance.now();
  const nodes = new Map<string, TraceNode>();
  const queue: { id: string; depth: number; path: string[] }[] = [];
  const visited = new Set<string>();
  const cycles: string[][] = [];
  const gaps: string[] = [];

  // Initialize root
  const rootNode: TraceNode = {
    record: startRecord,
    depth: 0,
    path: [startRecord.id],
    incoming: [],
    outgoing: []
  };
  nodes.set(startRecord.id, rootNode);
  queue.push({ id: startRecord.id, depth: 0, path: [startRecord.id] });

  // BFS traversal
  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentNode = nodes.get(current.id)!;

    if (current.depth >= maxDepth) continue;

    // Process outgoing links
    for (const related of currentNode.record.relatedRecords) {
      const targetId = `${related.form}-${related.number}`;
      
      // Check for cycle
      if (current.path.includes(targetId)) {
        cycles.push([...current.path, targetId]);
        continue;
      }

      // Check if target exists
      const targetRecord = registry.get(targetId);
      if (!targetRecord) {
        gaps.push(targetId);
        continue;
      }

      // Create or update target node
      if (!nodes.has(targetId)) {
        const targetNode: TraceNode = {
          record: targetRecord,
          depth: current.depth + 1,
          path: [...current.path, targetId],
          incoming: [currentNode],
          outgoing: []
        };
        nodes.set(targetId, targetNode);
        queue.push({ id: targetId, depth: current.depth + 1, path: targetNode.path });
      } else {
        const existing = nodes.get(targetId)!;
        if (!existing.incoming.includes(currentNode)) {
          existing.incoming.push(currentNode);
        }
      }

      // Update outgoing
      if (!currentNode.outgoing.find(n => n.record.id === targetId)) {
        currentNode.outgoing.push(nodes.get(targetId)!);
      }
    }

    visited.add(current.id);
  }

  // Build ordered list (BFS order)
  const ordered: TraceNode[] = [];
  const orderedIds = new Set<string>();
  const bfsQueue = [startRecord.id];
  
  while (bfsQueue.length > 0) {
    const id = bfsQueue.shift()!;
    if (orderedIds.has(id)) continue;
    
    const node = nodes.get(id);
    if (node) {
      ordered.push(node);
      orderedIds.add(id);
      
      // Queue outgoing nodes
      for (const out of node.outgoing) {
        if (!orderedIds.has(out.record.id)) {
          bfsQueue.push(out.record.id);
        }
      }
    }
  }

  // Generate stats
  const byForm: Record<string, number> = {};
  const byClause: Record<string, number> = {};
  
  for (const node of nodes.values()) {
    byForm[node.record.form] = (byForm[node.record.form] || 0) + 1;
    for (const clause of node.record.isoClauses || []) {
      byClause[clause] = (byClause[clause] || 0) + 1;
    }
  }

  const endTime = performance.now();
  
  // Performance logging
  if (endTime - startTime > 2000) {
    console.warn(`[Traceability] BuildTraceChain took ${(endTime - startTime).toFixed(2)}ms (>2s target)`);
  }

  return {
    rootId: startRecord.id,
    nodes,
    ordered,
    cycles,
    gaps,
    stats: {
      totalRecords: nodes.size,
      maxDepth: Math.max(...Array.from(nodes.values()).map(n => n.depth)),
      byForm,
      byClause
    }
  };
}

// ============================================================================
// E. UTILITY FUNCTIONS
// ============================================================================

/** Check if a record can be closed (no open dependencies) */
export function canCloseRecord(
  record: TraceableRecord,
  registry: RecordRegistry
): { canClose: boolean; blockers: string[] } {
  const blockers: string[] = [];
  
  for (const related of record.relatedRecords) {
    // TRIGGERS relationship means we created something
    if (related.relationship === "TRIGGERS" || related.relationship === "TRIGGERS_REVIEW") {
      const targetId = `${related.form}-${related.number}`;
      const target = registry.get(targetId);
      
      if (!target) {
        blockers.push(`${targetId}: Missing target record`);
      } else if (target.status === "OPEN" || target.status === "IN_PROGRESS") {
        blockers.push(`${targetId}: Still open or in progress`);
      }
    }

    // REQUIRES_TRAINING must have training completed
    if (related.relationship === "REQUIRES_TRAINING") {
      const targetId = `${related.form}-${related.number}`;
      const target = registry.get(targetId);
      
      if (!target) {
        blockers.push(`${targetId}: Training record missing`);
      } else if (target.status !== "CLOSED") {
        blockers.push(`${targetId}: Training not completed`);
      }
    }
  }

  return {
    canClose: blockers.length === 0,
    blockers
  };
}

/** Export trace package for audit documentation */
export function exportTracePackage(
  chain: TraceChain,
  format: "JSON" | "MARKDOWN" | "CSV"
): string {
  const timestamp = new Date().toISOString();
  
  switch (format) {
    case "JSON":
      return JSON.stringify({
        exportType: "TRACE_PACKAGE",
        exportedAt: timestamp,
        rootId: chain.rootId,
        recordCount: chain.stats.totalRecords,
        records: Array.from(chain.nodes.values()).map(n => ({
          ...n.record,
          traceDepth: n.depth,
          relatedCount: n.record.relatedRecords.length
        })),
        cycles: chain.cycles,
        gaps: chain.gaps
      }, null, 2);

    case "MARKDOWN":
      let md = `# Traceability Package\n\n`;
      md += `**Root Record:** ${chain.rootId}\n\n`;
      md += `**Generated:** ${timestamp}\n\n`;
      md += `**Records in Chain:** ${chain.stats.totalRecords}\n\n`;
      md += `---\n\n`;
      
      for (const node of chain.ordered) {
        const indent = "  ".repeat(node.depth);
        md += `${indent}- **${node.record.id}** (${node.record.status})\n`;
        md += `${indent}  - ${node.record.title}\n`;
        
        for (const rel of node.record.relatedRecords) {
          md += `${indent}  - → ${rel.relationship} → ${rel.form}-${rel.number} [${rel.isoClause}]\n`;
        }
        md += `\n`;
      }
      
      if (chain.gaps.length > 0) {
        md += `## ⚠️ Broken Links\n\n`;
        chain.gaps.forEach(gap => md += `- ${gap}\n`);
      }
      
      return md;

    case "CSV":
      let csv = "Depth,Record_ID,Form,Number,Title,Status,Related_To,Relationship,ISO_Clause\n";
      for (const node of chain.ordered) {
        for (const rel of node.record.relatedRecords) {
          csv += `${node.depth},${node.record.id},${node.record.form},${node.record.number},"${node.record.title.replace(/"/g, '""')}",${node.record.status},${rel.form}-${rel.number},${rel.relationship},${rel.isoClause}\n`;
        }
      }
      return csv;

    default:
      return "";
  }
}

/** Calculate ISO clause coverage for a record and its chain */
export function getClauseCoverage(chain: TraceChain): {
  clauses: string[];
  gaps: string[];  // Expected clauses not found
} {
  const foundClauses = new Set<string>();
  
  for (const node of chain.nodes.values()) {
    for (const clause of node.record.isoClauses || []) {
      foundClauses.add(clause);
    }
    for (const related of node.record.relatedRecords) {
      foundClauses.add(related.isoClause);
    }
  }

  // Expected clauses for complaint → CAPA → Training → Review flow
  const expectedClauses = ["10.2", "7.2", "9.3.2", "9.1"];
  const gaps = expectedClauses.filter(c => !foundClauses.has(c as ISOClause));

  return {
    clauses: Array.from(foundClauses).sort(),
    gaps
  };
}
