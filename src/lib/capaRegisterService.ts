/**
 * CAPA Register Service — Supabase-backed
 * Replaces Google Sheets with Supabase as the single source of truth.
 * @iso ISO 9001:2015 Clause 10.2 - Nonconformity and corrective action
 */

import { supabase } from '@/integrations/supabase/client';

export type CAPAType = "Corrective" | "Preventive";
export type CAPAStatus = "Open" | "In Progress" | "Under Verification" | "Closed";

export interface CAPA {
  id: string;
  capa_id: string;
  source_of_capa: string;
  type: CAPAType;
  description: string;
  reference: string | null;
  root_cause_analysis: string;
  corrective_action: string | null;
  preventive_action: string | null;
  responsible_person: string;
  target_completion_date: string | null;
  status: CAPAStatus;
  effectiveness: string | null;
  verification_date: string | null;
  related_risk: string | null;
  created_at: string;
  updated_at: string;
}

export interface CAPAInput {
  source_of_capa: string;
  type: CAPAType;
  description: string;
  reference?: string;
  root_cause_analysis: string;
  corrective_action?: string;
  preventive_action?: string;
  responsible_person: string;
  target_completion_date: string;
  related_risk?: string;
}

export interface CAPAUpdate {
  source_of_capa?: string;
  type?: CAPAType;
  description?: string;
  reference?: string;
  root_cause_analysis?: string;
  corrective_action?: string;
  preventive_action?: string;
  responsible_person?: string;
  target_completion_date?: string;
  status?: CAPAStatus;
  effectiveness?: string;
  verification_date?: string;
  related_risk?: string;
}

const VALID_TYPES: CAPAType[] = ["Corrective", "Preventive"];
const VALID_STATUSES: CAPAStatus[] = ["Open", "In Progress", "Under Verification", "Closed"];

function generateCAPAId(existingCapas: CAPA[]): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const existing = existingCapas
    .map(c => c.capa_id)
    .filter(id => id.match(/^CAPA-\d{2}-\d{3}$/))
    .map(id => parseInt(id.split("-")[2], 10))
    .filter(n => !isNaN(n));
  const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
  return `CAPA-${year}-${String(next).padStart(3, "0")}`;
}

export async function getAllCAPAs(): Promise<CAPA[]> {
  const { data, error } = await supabase
    .from("capas")
    .select("*")
    .order("capa_id", { ascending: true });

  if (error) {
    console.error("[capaRegister] Fetch error:", error.message);
    throw new Error(`Failed to fetch CAPAs: ${error.message}`);
  }
  return (data as CAPA[]) || [];
}

export async function addCAPA(input: CAPAInput): Promise<CAPA> {
  const existingCapas = await getAllCAPAs();
  const capa_id = generateCAPAId(existingCapas);

  const { data, error } = await supabase
    .from("capas")
    .insert({
      capa_id,
      source_of_capa: input.source_of_capa,
      type: input.type,
      description: input.description,
      reference: input.reference || null,
      root_cause_analysis: input.root_cause_analysis,
      corrective_action: input.corrective_action || null,
      preventive_action: input.preventive_action || null,
      responsible_person: input.responsible_person,
      target_completion_date: input.target_completion_date,
      related_risk: input.related_risk || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to add CAPA: ${error.message}`);
  return data as CAPA;
}

export async function updateCAPA(capaId: string, updates: CAPAUpdate): Promise<CAPA> {
  if (updates.type && !VALID_TYPES.includes(updates.type))
    throw new Error("Invalid CAPA type");
  if (updates.status && !VALID_STATUSES.includes(updates.status))
    throw new Error("Invalid CAPA status");

  const { data, error } = await supabase
    .from("capas")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("capa_id", capaId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update CAPA: ${error.message}`);
  return data as CAPA;
}

export function getCAPAStatusColor(status: CAPAStatus): string {
  switch (status) {
    case "Open": return "text-red-600 bg-red-100";
    case "In Progress": return "text-blue-600 bg-blue-100";
    case "Under Verification": return "text-yellow-600 bg-yellow-100";
    case "Closed": return "text-green-600 bg-green-100";
    default: return "text-gray-600 bg-gray-100";
  }
}

export function calculateCAPAStats(capas: CAPA[]) {
  const total = capas.length;
  const open = capas.filter(c => c.status === "Open").length;
  const inProgress = capas.filter(c => c.status === "In Progress").length;
  const underVerification = capas.filter(c => c.status === "Under Verification").length;
  const closed = capas.filter(c => c.status === "Closed").length;
  const corrective = capas.filter(c => c.type === "Corrective").length;
  const preventive = capas.filter(c => c.type === "Preventive").length;

  const bySource: Record<string, number> = {};
  capas.forEach(c => {
    bySource[c.source_of_capa] = (bySource[c.source_of_capa] || 0) + 1;
  });

  return { total, open, inProgress, underVerification, closed, corrective, preventive, bySource };
}