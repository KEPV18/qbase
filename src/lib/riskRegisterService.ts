/**
 * riskRegisterService.ts — Supabase-backed
 * Risks stored in Supabase. Falls back to empty if table doesn't exist yet.
 */

import { supabase } from '@/integrations/supabase/client';

export type RiskStatus = "Open" | "Under Review" | "Controlled" | "Closed";

export interface Risk {
  id: string;
  title: string;
  description: string;
  category: string;
  likelihood: number;
  impact: number;
  riskScore: number;
  status: RiskStatus;
  mitigationPlan: string;
  owner: string;
  targetDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface RiskInput {
  title: string;
  description?: string;
  category?: string;
  likelihood: number;
  impact: number;
  mitigationPlan?: string;
  owner?: string;
  targetDate?: string;
}

export interface RiskUpdate {
  title?: string;
  description?: string;
  category?: string;
  likelihood?: number;
  impact?: number;
  status?: RiskStatus;
  mitigationPlan?: string;
  owner?: string;
  targetDate?: string;
}

export async function getAllRisks(): Promise<Risk[]> {
  const { data, error } = await supabase.from('risks').select('*').order('created_at', { ascending: false });
  if (error || !data) {
    console.warn('[riskRegister] Table not available, returning empty:', error?.message);
    return [];
  }
  return data as Risk[];
}

export async function addRisk(input: RiskInput): Promise<Risk> {
  const score = (input.likelihood || 1) * (input.impact || 1);
  const risk: Partial<Risk> = {
    id: crypto.randomUUID(),
    title: input.title,
    description: input.description || '',
    category: input.category || 'General',
    likelihood: input.likelihood,
    impact: input.impact,
    riskScore: score,
    status: 'Open',
    mitigationPlan: input.mitigationPlan || '',
    owner: input.owner || '',
    targetDate: input.targetDate || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('risks').insert(risk).select().single();
  if (error) {
    console.error('[riskRegister] Failed to add risk:', error.message);
    return risk as Risk;
  }
  return data as Risk;
}

export async function updateRisk(riskId: string, updates: RiskUpdate): Promise<Risk> {
  const updateData = { ...updates, updatedAt: new Date().toISOString() };
  if (updates.likelihood !== undefined && updates.impact !== undefined) {
    (updateData as any).riskScore = updates.likelihood * updates.impact;
  }

  const { data, error } = await supabase.from('risks').update(updateData).eq('id', riskId).select().single();
  if (error) {
    console.error('[riskRegister] Failed to update risk:', error.message);
    throw new Error(`Failed to update risk: ${error.message}`);
  }
  return data as Risk;
}

export function calculateRiskStats(risks: Risk[]) {
  return {
    total: risks.length,
    open: risks.filter(r => r.status === 'Open').length,
    underReview: risks.filter(r => r.status === 'Under Review').length,
    controlled: risks.filter(r => r.status === 'Controlled').length,
    closed: risks.filter(r => r.status === 'Closed').length,
    avgScore: risks.length > 0 ? Math.round(risks.reduce((sum, r) => sum + r.riskScore, 0) / risks.length) : 0,
  };
}

export function getRiskLevel(score: number): "Low" | "Medium" | "High" | "Critical" {
  if (score >= 20) return "Critical";
  if (score >= 12) return "High";
  if (score >= 6) return "Medium";
  return "Low";
}

export function getRiskLevelColor(score: number): string {
  const level = getRiskLevel(score);
  switch (level) {
    case 'Critical': return 'bg-red-500 text-white';
    case 'High': return 'bg-orange-500 text-white';
    case 'Medium': return 'bg-yellow-500 text-black';
    case 'Low': return 'bg-green-500 text-white';
  }
}