import { useState, useEffect, useCallback } from "react";
import { MANUAL_CONTENT, type ManualSection } from "@/lib/ManualContent";

const STORAGE_KEY = "qms_iso_manual_data";

export function useManualData() {
  const [data, setData] = useState<ManualSection[]>(MANUAL_CONTENT);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setData(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved manual data", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage
  const saveData = useCallback((newData: ManualSection[]) => {
    setData(newData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
  }, []);

  const updateSection = useCallback((sectionId: string, updates: Partial<ManualSection>) => {
    const newData = data.map(s => s.id === sectionId ? { ...s, ...updates } : s);
    saveData(newData);
  }, [data, saveData]);

  const updateSubsection = useCallback((sectionId: string, subId: string, content: string) => {
    const newData = data.map(s => {
      if (s.id === sectionId && s.subsections) {
        return {
          ...s,
          subsections: s.subsections.map(sub => sub.id === subId ? { ...sub, content } : sub)
        };
      }
      return s;
    });
    saveData(newData);
  }, [data, saveData]);

  const resetToDefault = useCallback(() => {
    saveData(MANUAL_CONTENT);
  }, [saveData]);

  return {
    data,
    isLoaded,
    updateSection,
    updateSubsection,
    resetToDefault
  };
}
