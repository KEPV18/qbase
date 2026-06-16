// ============================================================================
// useCAPAEvidence — React Query hook for CAPA evidence data
// Provides fetch, add, and review mutations for evidence items.
// ============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getCAPAEvidence,
  addCAPAEvidence,
  updateCAPAEvidence,
  calculateEvidenceStats,
  type CAPAEvidence,
  type EvidenceStatus,
  type EvidenceType,
} from "@/lib/capaRegisterService";

const EVIDENCE_KEY = (capaId: string) => ["capa-evidence", capaId] as const;

export function useCAPAEvidence(capaId: string) {
  const queryClient = useQueryClient();

  const {
    data: evidence = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: EVIDENCE_KEY(capaId),
    queryFn: () => getCAPAEvidence(capaId),
    enabled: !!capaId,
    staleTime: 15_000,
  });

  const addMutation = useMutation({
    mutationFn: (input: { capaId: string; type: EvidenceType; description: string }) =>
      addCAPAEvidence(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EVIDENCE_KEY(capaId) });
      toast.success("Evidence Added", { description: "Evidence item has been added." });
    },
    onError: (err: Error) => {
      toast.error("Failed to Add Evidence", { description: err.message });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: ({
      evidenceId,
      updates,
    }: {
      evidenceId: string;
      updates: { status: EvidenceStatus; reviewerComment: string };
    }) => updateCAPAEvidence(evidenceId, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: EVIDENCE_KEY(capaId) });
      const label = variables.updates.status === "approved" ? "Approved" : "Rejected";
      toast.success(`Evidence ${label}`, { description: `Evidence item has been ${label.toLowerCase()}.` });
    },
    onError: (err: Error) => {
      toast.error("Failed to Review Evidence", { description: err.message });
    },
  });

  const stats = calculateEvidenceStats(evidence);

  return {
    evidence,
    stats,
    isLoading,
    isError,
    error,
    refetch,
    addEvidence: addMutation.mutate,
    reviewEvidence: reviewMutation.mutate,
    isAdding: addMutation.isPending,
    isReviewing: reviewMutation.isPending,
  };
}