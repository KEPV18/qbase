import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

/**
 * Shared hook for invalidating and refetching QMS data.
 * Replaces the duplicate `queryClient.invalidateQueries + refetch` pattern.
 */
export function useRefreshData() {
  const queryClient = useQueryClient();

  const refreshAll = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["qms-data"] });
    await queryClient.invalidateQueries({ queryKey: ["qms-records"] });
    await queryClient.invalidateQueries({ queryKey: ["qms-drive-files"] });
  }, [queryClient]);

  const refreshRecords = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["qms-records"] });
  }, [queryClient]);

  const refreshDriveFiles = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["qms-drive-files"] });
  }, [queryClient]);

  return { refreshAll, refreshRecords, refreshDriveFiles };
}