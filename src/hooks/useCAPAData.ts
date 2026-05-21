/**
 * React Query hook for CAPA Register data
 * 
 * Provides data fetching, caching, and mutation capabilities
 * for the CAPA Register module.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getAllCAPAs,
  addCAPA,
  updateCAPA,
  calculateCAPAStats,
  type CAPA,
  type CAPAInput,
  type CAPAUpdate,
} from "@/lib/capaRegisterService";

const QUERY_KEY = ["capas"];

/**
 * Hook for fetching and managing CAPA Register data
 */
export function useCAPAData() {
  const queryClient = useQueryClient();
  // Fetch all CAPAs
  const {
    data: capas = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: getAllCAPAs,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });

  // Add new CAPA mutation
  const addCAPAMutation = useMutation({
    mutationFn: (input: CAPAInput) => addCAPA(input),
    onSuccess: (newCAPA) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("CAPA Created", { description: `CAPA ${newCAPA.capaId} has been created successfully.` });
    },
    onError: (error: Error) => {
      toast.error("Failed to Create CAPA", {
        description: error.message.includes("API key")
          ? "Write operations require OAuth authentication. Current API key is read-only."
          : error.message,
      });
    },
  });

  // Update CAPA mutation
  const updateCAPAMutation = useMutation({
    mutationFn: ({ capaId, updates }: { capaId: string; updates: CAPAUpdate }) =>
      updateCAPA(capaId, updates),
    onSuccess: (updatedCAPA) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("CAPA Updated", { description: `CAPA ${updatedCAPA.capaId} has been updated successfully.` });
    },
    onError: (error: Error) => {
      toast.error("Failed to Update CAPA", {
        description: error.message.includes("API key")
          ? "Write operations require OAuth authentication. Current API key is read-only."
          : error.message,
      });
    },
  });

  // Calculate statistics
  const stats = calculateCAPAStats(capas);

  return {
    capas,
    stats,
    isLoading,
    isError,
    error,
    refetch,
    addCAPA: addCAPAMutation.mutate,
    updateCAPA: updateCAPAMutation.mutate,
    isAdding: addCAPAMutation.isPending,
    isUpdating: updateCAPAMutation.isPending,
  };
}

/**
 * Hook for fetching a single CAPA by ID
 */
export function useCAPA(capaId: string) {
  const { capas, isLoading, isError } = useCAPAData();
  const capa = capas.find((c) => c.capaId === capaId);

  return {
    capa,
    isLoading,
    isError,
    notFound: !isLoading && !capa,
  };
}
