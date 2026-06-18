import { log } from "@/services/logger";
/**
 * processInteractionService.ts — Supabase-backed
 * Processes stored in Supabase "processes" table.
 * Process interactions stored in "process_interactions" table.
 */

import { supabase } from '@/integrations/supabase/client';

export interface ProcessInteraction {
  id: string;
  processName: string;
  description: string;
  inputs: string;
  outputs: string;
  processOwner: string;
  mainActivities: string;
  supporting: string;
  kpi: string;
  receiver: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessInput {
  processName: string;
  description?: string;
  inputs?: string;
  outputs?: string;
  processOwner?: string;
  mainActivities?: string;
  supporting?: string;
  kpi?: string;
  receiver?: string;
}

export interface ProcessUpdate {
  processName?: string;
  description?: string;
  inputs?: string;
  outputs?: string;
  processOwner?: string;
  mainActivities?: string;
  supporting?: string;
  kpi?: string;
  receiver?: string;
  status?: string;
}

/** Map a Supabase row (snake_case) to the ProcessInteraction interface */
function mapRowToProcess(row: Record<string, unknown>): ProcessInteraction {
  return {
    id: row.id as string,
    processName: (row.process_name as string) || '',
    description: `${row.category || ''} — ${row.controls || ''}`.trim(),
    inputs: (row.inputs as string) || '',
    outputs: (row.outputs as string) || '',
    processOwner: (row.owner as string) || '',
    mainActivities: (row.competence_needed as string) || '',
    supporting: (row.resources as string) || '',
    kpi: (row.effectiveness as string) || '',
    receiver: '',  // Will be derived from process_interactions later
    status: (row.status as string) || 'Active',
    createdAt: (row.created_at as string) || '',
    updatedAt: (row.updated_at as string) || '',
  };
}

/** Map ProcessInteraction to a Supabase insert row (snake_case) */
function mapProcessToRow(process: Partial<ProcessInteraction>): Record<string, unknown> {
  return {
    process_name: process.processName,
    category: process.description || '',
    owner: process.processOwner,
    inputs: process.inputs,
    outputs: process.outputs,
    resources: process.supporting,
    effectiveness: process.kpi,
    competence_needed: process.mainActivities,
    controls: '',
    status: process.status || 'Active',
  };
}

export async function getAllProcesses(): Promise<ProcessInteraction[]> {
  const { data, error } = await supabase
    .from('processes')
    .select('*')
    .order('process_id', { ascending: true });

  if (error) {
    log.system.error('processInteraction:fetch_failed', (error as Error)?.message || String(error));
    return [];
  }

  return (data as Record<string, unknown>[]).map(mapRowToProcess);
}

export async function addProcess(input: ProcessInput): Promise<ProcessInteraction> {
  const processRow = mapProcessToRow({
    processName: input.processName,
    description: input.description,
    inputs: input.inputs,
    outputs: input.outputs,
    processOwner: input.processOwner,
    mainActivities: input.mainActivities,
    supporting: input.supporting,
    kpi: input.kpi,
    receiver: input.receiver,
    status: 'Active',
  });

  const { data, error } = await supabase
    .from('processes')
    .insert(processRow)
    .select()
    .single();

  if (error) {
    log.system.error('processInteraction:add_failed', (error as Error)?.message || String(error));
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
    log.system.error('processInteraction:update_failed', (error as Error)?.message || String(error));
    throw new Error(`Failed to update process: ${error.message}`);
  }

  return mapRowToProcess(data as Record<string, unknown>);
}

export function calculateProcessStats(processes: ProcessInteraction[]) {
  const uniqueOwners = new Set(processes.map(p => p.processOwner).filter(Boolean)).size;
  const kpiCoverage = processes.length > 0
    ? Math.round((processes.filter(p => p.kpi && p.kpi.trim()).length / processes.length) * 100)
    : 0;
  const recordReferences = processes.filter(p => p.inputs || p.outputs).length;
  return {
    total: processes.length,
    active: processes.filter(p => p.status === 'Active').length,
    inactive: processes.filter(p => p.status !== 'Active').length,
    uniqueOwners,
    kpiCoverage,
    recordReferences,
  };
}

export function getProcessFlow(processes: ProcessInteraction[]): { from: string; to: string }[] {
  const flows: { from: string; to: string }[] = [];
  for (const p of processes) {
    const inputList = p.inputs.split(',').map(s => s.trim()).filter(Boolean);
    for (const input of inputList) {
      flows.push({ from: input, to: p.processName });
    }
  }
  return flows;
}

export function findDependentProcesses(processName: string, processes: ProcessInteraction[]): string[] {
  return processes
    .filter(p => p.inputs.toLowerCase().includes(processName.toLowerCase()))
    .map(p => p.processName);
}

export function extractRecordCodes(outputs: string): string[] {
  if (!outputs) return [];
  const matches = outputs.match(/F\/\d+/g);
  return matches ? [...new Set(matches)] : [];
}