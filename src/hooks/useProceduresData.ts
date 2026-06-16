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
        console.error("Failed to parse saved procedures data", e);
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

  return {
    data,
    isLoaded,
    updateProcedure,
    resetToDefault
  };
}
