import { log } from "@/services/logger";
import { useState, useEffect, useCallback } from "react";
import { PROCEDURES_CONTENT, type ProcedureSection } from "@/lib/ProceduresContent";

const STORAGE_KEY = "qms_procedures_data";

export function useProceduresData() {
  const [data, setData] = useState<ProcedureSection[]>(PROCEDURES_CONTENT);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setData(JSON.parse(saved));
      } catch (e) {
        log.system.error("useProceduresData:parse_failed", (e as Error)?.message || String(e));
      }
    }
    setIsLoaded(true);
  }, []);

  const saveData = useCallback((newData: ProcedureSection[]) => {
    setData(newData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
  }, []);

  const updateProcedure = useCallback((id: string, updates: Partial<ProcedureSection>) => {
    const newData = data.map(p => p.id === id ? { ...p, ...updates } : p);
    saveData(newData);
  }, [data, saveData]);

  const resetToDefault = useCallback(() => {
    saveData(PROCEDURES_CONTENT);
  }, [saveData]);

  /**
   * Replace the whole procedure set with a snapshot.
   *
   * This exists so a reset can be UNDONE rather than confirmed.  The
   * design system's rule is explicit: "easy undo beats confirmation
   * dialogs; reserve confirmations for genuinely destructive,
   * irreversible actions".  A reset to the factory text is trivially
   * reversible — the caller snapshots `data` before resetting and hands
   * it back here when the user takes the Undo action.
   */
  const restoreData = useCallback((snapshot: ProcedureSection[]) => {
    saveData(snapshot);
  }, [saveData]);

  return {
    data,
    isLoaded,
    updateProcedure,
    resetToDefault,
    restoreData
  };
}
