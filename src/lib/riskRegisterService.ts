/**
 * Risk Register Service — Supabase-backed
 * Replaces Google Sheets with Supabase as the single source of truth.
 * @iso ISO 9001:2015 Clause 6.1 - Actions to address risks and opportunities
 */

import { supabase } from '@/integrations/supabase/client';

export type RiskStatus = "Open" | "Under Review" | "Controlled" | "Closed";

export interface Risk {
  id: string;
  risk_id: string;
  process_department: string;
  risk_description: string;
  cause: string;
  likelihood: number;
  impact: number;
  risk_score: number;
  action_control: string;
  owner: string;
  status: RiskStatus;
  review_date: string | null;
  linked_capa: string | null;
  created_at: string;
  updated_at: string;
}

export interface RiskInput {
  process_department: string;
  risk_description: string;
  cause: string;
  likelihood: number;
  impact: number;
  action_control: string;
  owner: string;
  review_date?: string;
  linked_capa?: string;
}

export interface RiskUpdate {
  process_department?: string;
  risk_description?: string;
  cause?: string;
  likelihood?: number;
  impact?: number;
  action_control?: string;
  owner?: string;
  status?: RiskStatus;
  review_date?: string;
  linked_capa?: string;
}

const VALID_STATUSES: RiskStatus[] = ["Open", "Under Review", "Controlled", "Closed"];

function isValidRating(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

function isValidStatus(status: string): status is RiskStatus {
  return VALID_STATUSES.includes(status as RiskStatus);
}

function generateRiskId(existingRisks: Risk[]): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const existing = existingRisks
    .map(r => r.risk_id)
    .filter(id => id.match(/^RISK-\d{2}-\d{3}$/))
    .map(id => parseInt(id.split("-")[2], 10))
    .filter(n => !isNaN(n));
  const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
  return `RISK-${year}-${String(next).padStart(3, "0")}`;
}

export async function getAllRisks(): Promise<Risk[]> {
  const { data, error } = await supabase
    .from("risks")
    .select("*")
    .is("deleted_at", null)
    .order("risk_id", { ascending: true });

  if (error) {
    console.error("[riskRegister] Fetch error:", error.message);
    throw new Error(`Failed to fetch risks: ${error.message}`);
  }
  return (data as Risk[]) || [];
}

export async function addRisk(input: RiskInput): Promise<Risk> {
  if (!isValidRating(input.likelihood)) throw new Error("Likelihood must be between 1 and 5");
  if (!isValidRating(input.impact)) throw new Error("Impact must be between 1 and 5");

  const existingRisks = await getAllRisks();
  const risk_id = generateRiskId(existingRisks);

  const { data, error } = await supabase
    .from("risks")
    .insert({
      risk_id,
      process_department: input.process_department,
      risk_description: input.risk_description,
      cause: input.cause,
      likelihood: input.likelihood,
      impact: input.impact,
      action_control: input.action_control,
      owner: input.owner,
      review_date: input.review_date || null,
      linked_capa: input.linked_capa || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to add risk: ${error.message}`);
  return data as Risk;
}

export async function updateRisk(riskId: string, updates: RiskUpdate): Promise<Risk> {
  if (updates.likelihood !== undefined && !isValidRating(updates.likelihood))
    throw new Error("Likelihood must be between 1 and 5");
  if (updates.impact !== undefined && !isValidRating(updates.impact))
    throw new Error("Impact must be between 1 and 5");
  if (updates.status && !isValidStatus(updates.status))
    throw new Error("Invalid status value");

  const { data, error } = await supabase
    .from("risks")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("risk_id", riskId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update risk: ${error.message}`);
  return data as Risk;
}

export function calculateRiskStats(risks: Risk[]) {
  const total = risks.length;
  const open = risks.filter(r => r.status === "Open").length;
  const underReview = risks.filter(r => r.status === "Under Review").length;
  const controlled = risks.filter(r => r.status === "Controlled").length;
  const closed = risks.filter(r => r.status === "Closed").length;
  const highCritical = risks.filter(r => r.risk_score >= 12).length;
  const medium = risks.filter(r => r.risk_score >= 6 && r.risk_score < 12).length;
  const low = risks.filter(r => r.risk_score < 6).length;

  const byDepartment: Record<string, number> = {};
  risks.forEach(r => {
    byDepartment[r.process_department] = (byDepartment[r.process_department] || 0) + 1;
  });

  return { total, open, underReview, controlled, closed, highCritical, medium, low, byDepartment };
}