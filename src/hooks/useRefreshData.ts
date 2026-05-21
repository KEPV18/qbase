import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

/**
 * Shared hook for invalidating and refetching QMS Forge data.
 * Key: 'forge-records' (Supabase-backed).
 */
export function useRefreshData() {
  const queryClient = useQueryClient();

  const refreshAll = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["forge-records"] });
    await queryClient.invalidateQueries({ queryKey: ["auditLog"] });
  }, [queryClient]);

  const refreshRecords = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["forge-records"] });
  }, [queryClient]);

  return { refreshAll, refreshRecords };
}