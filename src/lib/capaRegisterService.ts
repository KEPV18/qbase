/**
 * capaRegisterService.ts — Supabase-backed
 * CAPAs stored in Supabase. Falls back to empty if table doesn't exist yet.
 */

import { supabase } from '@/integrations/supabase/client';

export type CAPAType = "Corrective" | "Preventive";
export type CAPAStatus = "Open" | "In Progress" | "Under Verification" | "Closed";

export interface CAPA {
  id: string;
  title: string;
  description: string;
  type: CAPAType;
  status: CAPAStatus;
  rootCause: string;
  correctiveAction: string;
  preventiveAction: string;
  owner: string;
  targetDate: string;
  completionDate: string;
  verificationResult: string;
  createdAt: string;
  updatedAt: string;
}

export interface CAPAInput {
  title: string;
  description?: string;
  type: CAPAType;
  rootCause?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  owner?: string;
  targetDate?: string;
}

export interface CAPAUpdate {
  title?: string;
  description?: string;
  type?: CAPAType;
  status?: CAPAStatus;
  rootCause?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  owner?: string;
  targetDate?: string;
  completionDate?: string;
  verificationResult?: string;
}

export async function getAllCAPAs(): Promise<CAPA[]> {
  const { data, error } = await supabase.from('capas').select('*').order('created_at', { ascending: false });
  if (error || !data) {
    console.warn('[capaRegister] Table not available, returning empty:', error?.message);
    return [];
  }
  return data as CAPA[];
}

export async function addCAPA(input: CAPAInput): Promise<CAPA> {
  const capa: Partial<CAPA> = {
    id: crypto.randomUUID(),
    title: input.title,
    description: input.description || '',
    type: input.type,
    status: 'Open',
    rootCause: input.rootCause || '',
    correctiveAction: input.correctiveAction || '',
    preventiveAction: input.preventiveAction || '',
    owner: input.owner || '',
    targetDate: input.targetDate || '',
    completionDate: '',
    verificationResult: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('capas').insert(capa).select().single();
  if (error) {
    console.error('[capaRegister] Failed to add CAPA:', error.message);
    return capa as CAPA;
  }
  return data as CAPA;
}

export async function updateCAPA(capaId: string, updates: CAPAUpdate): Promise<CAPA> {
  const updateData = { ...updates, updatedAt: new Date().toISOString() };
  const { data, error } = await supabase.from('capas').update(updateData).eq('id', capaId).select().single();
  if (error) {
    console.error('[capaRegister] Failed to update CAPA:', error.message);
    throw new Error(`Failed to update CAPA: ${error.message}`);
  }
  return data as CAPA;
}

export function calculateCAPAStats(capas: CAPA[]) {
  return {
    total: capas.length,
    open: capas.filter(c => c.status === 'Open').length,
    inProgress: capas.filter(c => c.status === 'In Progress').length,
    underVerification: capas.filter(c => c.status === 'Under Verification').length,
    closed: capas.filter(c => c.status === 'Closed').length,
    corrective: capas.filter(c => c.type === 'Corrective').length,
    preventive: capas.filter(c => c.type === 'Preventive').length,
  };
}

export function getCAPAStatusColor(status: CAPAStatus): string {
  switch (status) {
    case 'Open': return 'bg-blue-500 text-white';
    case 'In Progress': return 'bg-yellow-500 text-black';
    case 'Under Verification': return 'bg-orange-500 text-white';
    case 'Closed': return 'bg-green-500 text-white';
  }
}

// ============================================================================
// CAPA Evidence — Supabase-backed
// Tracks evidence items attached to each CAPA with status-based review workflow.
// ISO 9001:2015 Clause 10.2 — Nonconformity and corrective action evidence
// ============================================================================

export type EvidenceStatus = 'pending' | 'approved' | 'rejected';
export type EvidenceType = 'document' | 'photo' | 'measurement' | 'test_result' | 'other';

export interface CAPAEvidence {
  id: string;
  capaId: string;
  type: EvidenceType;
  description: string;
  status: EvidenceStatus;
  reviewedBy: string;
  reviewedAt: string | null;
  reviewerComment: string;
  createdAt: string;
  updatedAt: string;
}

export interface CAPAEvidenceInput {
  capaId: string;
  type: EvidenceType;
  description: string;
}

export interface CAPAEvidenceUpdate {
  status?: EvidenceStatus;
  reviewedBy?: string;
  reviewerComment?: string;
}

/**
 * Fetch all evidence items for a given CAPA.
 */
export async function getCAPAEvidence(capaId: string): Promise<CAPAEvidence[]> {
  const { data, error } = await supabase
    .from('capa_evidence')
    .select('*')
    .eq('capa_id', capaId)
    .order('created_at', { ascending: true });
  if (error || !data) {
    console.warn('[capaEvidence] Table not available, returning empty:', error?.message);
    return [];
  }
  return data as CAPAEvidence[];
}

/**
 * Add a new evidence item to a CAPA.
 */
export async function addCAPAEvidence(input: CAPAEvidenceInput): Promise<CAPAEvidence> {
  const evidence: Partial<CAPAEvidence> = {
    id: crypto.randomUUID(),
    capa_id: input.capaId,
    type: input.type,
    description: input.description,
    status: 'pending',
    reviewed_by: '',
    reviewed_at: null,
    reviewer_comment: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('capa_evidence')
    .insert(evidence)
    .select()
    .single();
  if (error) {
    console.error('[capaEvidence] Failed to add evidence:', error.message);
    return evidence as CAPAEvidence;
  }
  return data as CAPAEvidence;
}

/**
 * Update an evidence item (approve/reject, add review comment).
 */
export async function updateCAPAEvidence(
  evidenceId: string,
  updates: CAPAEvidenceUpdate
): Promise<CAPAEvidence> {
  const updateData: Record<string, unknown> = {
    ...updates,
    status: updates.status,
    reviewed_by: updates.reviewedBy,
    reviewer_comment: updates.reviewerComment,
    reviewed_at: updates.status ? new Date().toISOString() : undefined,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('capa_evidence')
    .update(updateData)
    .eq('id', evidenceId)
    .select()
    .single();
  if (error) {
    console.error('[capaEvidence] Failed to update evidence:', error.message);
    throw new Error(`Failed to update evidence: ${error.message}`);
  }
  return data as CAPAEvidence;
}

/**
 * Calculate evidence statistics for closure logic.
 * CAPA-001 FIX: canClose requires pending === 0 AND rejected === 0 AND total > 0.
 * A CAPA with rejected evidence CANNOT be closed — rejected items must be
 * rectified or replaced before closure.
 */
export function calculateEvidenceStats(evidence: CAPAEvidence[]) {
  const pending = evidence.filter(e => e.status === 'pending').length;
  const approved = evidence.filter(e => e.status === 'approved').length;
  const rejected = evidence.filter(e => e.status === 'rejected').length;
  const total = evidence.length;

  // CRITICAL FIX (CAPA-001):Rejected evidence blocks CAPA closure
  const canClose = pending === 0 && rejected === 0 && total > 0;

  return { total, pending, approved, rejected, canClose };
}