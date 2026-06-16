import type { FormEntry, FormFrequency, FormImportance } from "@/data/formsRegistry";

export interface FormsStats {
  total: number;
  byImportance: Record<FormImportance, number>;
  byFrequency: Record<string, number>;
  withRecords: number;
  totalRecords: number;
}

export function computeStats(forms: FormEntry[]): FormsStats {
  const total = forms.length;
  const byImportance: Record<FormImportance, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  const byFrequency: Record<string, number> = {};
  let withRecords = 0;
  let totalRecords = 0;

  forms.forEach(f => {
    byImportance[f.importance]++;
    byFrequency[f.frequency] = (byFrequency[f.frequency] || 0) + 1;
    if (f.lastRecordCount && f.lastRecordCount > 0) {
      withRecords++;
      totalRecords += f.lastRecordCount;
    }
  });

  return { total, byImportance, byFrequency, withRecords, totalRecords };
}

export type FormFilterKey = "importance" | "frequency" | "section" | "search";

export function filterForms(forms: FormEntry[], filters: {
  importance: string;
  frequency: string;
  section: string;
  search: string;
}): FormEntry[] {
  let filtered = forms;

  if (filters.importance !== "all") {
    filtered = filtered.filter(f => f.importance === filters.importance);
  }
  if (filters.frequency !== "all") {
    filtered = filtered.filter(f => f.frequency === filters.frequency);
  }
  if (filters.section !== "all") {
    filtered = filtered.filter(f => f.section === filters.section);
  }
  if (filters.search) {
    const s = filters.search.toLowerCase();
    filtered = filtered.filter(f =>
      f.code.toLowerCase().includes(s) ||
      f.name.toLowerCase().includes(s) ||
      f.description?.toLowerCase().includes(s)
    );
  }

  return filtered;
}