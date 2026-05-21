/**
 * processInteractionService.ts — Supabase-backed
 * Processes stored in Supabase "processes" table.
 * Process interactions stored in "process_interactions" table.
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

/** Map a Supabase row (snake_case) to the ProcessInteraction interface (camelCase) */
function mapRowToProcess(row: Record<string, unknown>): ProcessInteraction {
  return {
    id: row.id as string,
    name: (row.process_name as string) || '',
    description: `${row.category || ''} — ${row.controls || ''}`.trim(),
    inputs: (row.inputs as string) || '',
    outputs: (row.outputs as string) || '',
    responsible: (row.owner as string) || '',
    supporting: (row.resources as string) || '',
    kpi: (row.effectiveness as string) || '',
    status: (row.status as string) || 'Active',
    createdAt: (row.created_at as string) || '',
    updatedAt: (row.updated_at as string) || '',
  };
}

/** Map ProcessInteraction to a Supabase insert row (snake_case) */
function mapProcessToRow(process: Partial<ProcessInteraction>): Record<string, unknown> {
  return {
    process_name: process.name,
    category: process.description || '',
    owner: process.responsible,
    inputs: process.inputs,
    outputs: process.outputs,
    resources: process.supporting,
    effectiveness: process.kpi,
    controls: '',
    competence_needed: '',
    status: process.status || 'Active',
  };
}

export async function getAllProcesses(): Promise<ProcessInteraction[]> {
  // Use API route with service_role key to bypass RLS on processes table
  try {
    const response = await fetch('/api/processes');
    if (!response.ok) {
      console.warn('[processInteraction] API route failed, falling back to direct query');
      // Fallback: try direct Supabase query (works if RLS policies are added later)
      const { data, error } = await supabase
        .from('processes')
        .select('*')
        .order('process_id', { ascending: true });
      if (error || !data) {
        console.warn('[processInteraction] Direct query also failed:', error?.message);
        return [];
      }
      return (data as Record<string, unknown>[]).map(mapRowToProcess);
    }
    const data = await response.json();
    return (data as Record<string, unknown>[]).map(mapRowToProcess);
  } catch (err) {
    console.warn('[processInteraction] fetch error:', err);
    // Fallback to direct query
    const { data, error } = await supabase
      .from('processes')
      .select('*')
      .order('process_id', { ascending: true });
    if (error || !data) {
      console.warn('[processInteraction] Fallback query failed:', error?.message);
      return [];
    }
    return (data as Record<string, unknown>[]).map(mapRowToProcess);
  }
}

export async function addProcess(input: ProcessInput): Promise<ProcessInteraction> {
  const processRow = mapProcessToRow({
    name: input.name,
    description: input.description,
    inputs: input.inputs,
    outputs: input.outputs,
    responsible: input.responsible,
    supporting: input.supporting,
    kpi: input.kpi,
    status: 'Active',
  });

  const { data, error } = await supabase
    .from('processes')
    .insert(processRow)
    .select()
    .single();

  if (error) {
    console.error('[processInteraction] Failed to add process:', error.message);
    throw new Error(`Failed to add process: ${error.message}`);
  }

  return mapRowToProcess(data as Record<string, unknown>);
}

export async function updateProcess(processId: string, updates: ProcessUpdate): Promise<ProcessInteraction> {
  const updateRow: Record<string, unknown> = {};
  const mapped = mapProcessToRow(updates as Partial<ProcessInteraction>);

  // Only include fields that are being updated
  for (const [key, value] of Object.entries(mapped)) {
    if (value !== undefined && value !== '') {
      updateRow[key] = value;
    }
  }
  updateRow['updated_at'] = new Date().toISOString();

  // Try by id first
  let { data, error } = await supabase
    .from('processes')
    .update(updateRow)
    .eq('id', processId)
    .select()
    .single();

  // If not found by id, try by process_name
  if (error) {
    const result = await supabase
      .from('processes')
      .update(updateRow)
      .eq('process_name', processId)
      .select()
      .single();
    data = result.data;
    error = result.error;
  }

  if (error) {
    console.error('[processInteraction] Failed to update process:', error.message);
    throw new Error(`Failed to update process: ${error.message}`);
  }

  return mapRowToProcess(data as Record<string, unknown>);
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