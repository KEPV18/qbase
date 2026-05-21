/**
 * processInteractionService.ts — Supabase-backed
 * Process interactions stored in Supabase. Falls back to empty if table doesn't exist yet.
 */

import { supabase } from '@/integrations/supabase/client';

export interface ProcessInteraction {
  id: string;
  name: string;
  description: string;
  inputs: string;
  outputs: string;
  responsible: string;
  supporting: string;
  kpi: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessInput {
  name: string;
  description?: string;
  inputs?: string;
  outputs?: string;
  responsible?: string;
  supporting?: string;
  kpi?: string;
}

export interface ProcessUpdate {
  name?: string;
  description?: string;
  inputs?: string;
  outputs?: string;
  responsible?: string;
  supporting?: string;
  kpi?: string;
  status?: string;
}

export async function getAllProcesses(): Promise<ProcessInteraction[]> {
  const { data, error } = await supabase.from('process_interactions').select('*').order('created_at', { ascending: true });
  if (error || !data) {
    console.warn('[processInteraction] Table not available, returning empty:', error?.message);
    return [];
  }
  return data as ProcessInteraction[];
}

export async function addProcess(input: ProcessInput): Promise<ProcessInteraction> {
  const process: Partial<ProcessInteraction> = {
    id: crypto.randomUUID(),
    name: input.name,
    description: input.description || '',
    inputs: input.inputs || '',
    outputs: input.outputs || '',
    responsible: input.responsible || '',
    supporting: input.supporting || '',
    kpi: input.kpi || '',
    status: 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('process_interactions').insert(process).select().single();
  if (error) {
    console.error('[processInteraction] Failed to add process:', error.message);
    return process as ProcessInteraction;
  }
  return data as ProcessInteraction;
}

export async function updateProcess(processId: string, updates: ProcessUpdate): Promise<ProcessInteraction> {
  // Accept processId as name or UUID — try UUID first
  const updateData = { ...updates, updatedAt: new Date().toISOString() };

  // Try by id first
  let { data, error } = await supabase.from('process_interactions').update(updateData).eq('id', processId).select().single();

  // If not found by id, try by name
  if (error) {
    const result = await supabase.from('process_interactions').update(updateData).eq('name', processId).select().single();
    data = result.data;
    error = result.error;
  }

  if (error) {
    console.error('[processInteraction] Failed to update process:', error.message);
    throw new Error(`Failed to update process: ${error.message}`);
  }
  return data as ProcessInteraction;
}

export function calculateProcessStats(processes: ProcessInteraction[]) {
  return {
    total: processes.length,
    active: processes.filter(p => p.status === 'Active').length,
    inactive: processes.filter(p => p.status !== 'Active').length,
  };
}

export function getProcessFlow(processes: ProcessInteraction[]): { from: string; to: string }[] {
  const flows: { from: string; to: string }[] = [];
  for (const p of processes) {
    const inputList = p.inputs.split(',').map(s => s.trim()).filter(Boolean);
    for (const input of inputList) {
      flows.push({ from: input, to: p.name });
    }
  }
  return flows;
}

export function findDependentProcesses(processName: string, processes: ProcessInteraction[]): string[] {
  return processes
    .filter(p => p.inputs.toLowerCase().includes(processName.toLowerCase()))
    .map(p => p.name);
}

export function extractRecordCodes(outputs: string): string[] {
  if (!outputs) return [];
  const matches = outputs.match(/F\/\d+/g);
  return matches ? [...new Set(matches)] : [];
}