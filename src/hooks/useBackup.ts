// =============================================================================
// QBase — Backup/Restore React Hook
// Wraps backupService for dashboard UI consumption with loading/error states.
// =============================================================================

import { useState, useCallback } from "react";
import { exportBackup, downloadBackupFile, importBackup, type RestoreResult } from "@/services/backupService";
import { useRefreshData } from "./useRefreshData";

export interface UseBackupReturn {
  isExporting: boolean;
  isImporting: boolean;
  lastRestore: RestoreResult | null;
  exportBackup: (password: string, filename?: string) => Promise<void>;
  importBackup: (file: File, password: string) => Promise<void>;
}

export function useBackup(): UseBackupReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [lastRestore, setLastRestore] = useState<RestoreResult | null>(null);
  const { refreshRecords } = useRefreshData();

  const handleExport = useCallback(async (password: string, filename?: string) => {
    setIsExporting(true);
    try {
      const backup = await exportBackup(password);
      downloadBackupFile(backup, filename);
    } finally {
      setIsExporting(false);
    }
  }, []);

  const handleImport = useCallback(async (file: File, password: string) => {
    setIsImporting(true);
    try {
      const result = await importBackup(file, password);
      setLastRestore(result);
      if (result.success) {
        await refreshRecords(); // Refresh UI with restored data
      }
    } finally {
      setIsImporting(false);
    }
  }, [refreshRecords]);

  return {
    isExporting,
    isImporting,
    lastRestore,
    exportBackup: handleExport,
    importBackup: handleImport,
  };
}
