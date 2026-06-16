// ============================================================================
// useManagementReviewQueue — CAPA-002 FIX
// Auto-generates draft F/21 (Management Review Meeting Minutes) records
// when KPI status hits 'critical'.
// ISO 9001:2015 Clause 9.3 — Management Review
// ============================================================================

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getRecords, createRecord } from "@/services/recordStorage";
import type { RecordData } from "@/components/forms/DynamicFormRenderer";
import type { KPIEntry } from "@/data/operationalKPIData";
import { hasCriticalKPI, getCriticalKPIs } from "@/data/operationalKPIData";

const F21_QUERY_KEY = ["forge-records", "form", "F/21"] as const;

export interface ManagementReviewQueueItem {
  id: string;
  triggerKPIs: KPIEntry[];
  reason: string;
  draftCreatedAt: string;
  status: "pending_review" | "draft_created" | "skipped";
}

/**
 * Hook that monitors KPIs and auto-queues F/21 Management Review drafts
 * when any KPI reaches 'critical' status.
 *
 * Logic:
 * 1. Accepts current KPI list
 * 2. Checks if any KPI is critical
 * 3. If critical KPIs exist and no pending F/21 draft for the same month → auto-create draft
 * 4. Returns queue items for UI display
 */
export function useManagementReviewQueue(kpis: KPIEntry[]) {
  const queryClient = useQueryClient();
  const [queueItems, setQueueItems] = useState<ManagementReviewQueueItem[]>([]);
  const autoCreatedRef = useRef<Set<string>>(new Set()); // Prevent duplicate drafts

  // Fetch existing F/21 records to avoid duplicates
  const { data: existingF21 = [] } = useQuery({
    queryKey: F21_QUERY_KEY,
    queryFn: () => getRecords("F/21"),
    staleTime: 60_000,
  });

  // Create F/21 record mutation
  const createF21Mutation = useMutation({
    mutationFn: (data: RecordData) => createRecord(data),
    onSuccess: (result) => {
      if (result.success && result.record) {
        toast.success("F/21 Auto-Queued", {
          description: `Management Review draft ${result.record.serial} created due to critical KPIs.`,
        });
      }
      queryClient.invalidateQueries({ queryKey: F21_QUERY_KEY });
    },
    onError: (err: Error) => {
      toast.error("Failed to Auto-Queue F/21", { description: err.message });
    },
  });

  // Check if an F/21 draft already exists for the current month
  const hasDraftThisMonth = useCallback(
    (month: string) => {
      return existingF21.some((r: RecordData) => {
        const createdAt = r._createdAt as string;
        return createdAt && createdAt.startsWith(month) && r.recordStatus === "draft";
      });
    },
    [existingF21]
  );

  // Auto-queue F/21 when critical KPIs detected
  useEffect(() => {
    if (!hasCriticalKPI(kpis)) return;

    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    const criticals = getCriticalKPIs(kpis);
    const criticalNames = criticals.map(k => k.name).join(", ");

    // Dedup key: if we already auto-created for this set this month, skip
    const dedupKey = `${currentMonth}-${criticals.map(k => k.id).sort().join(",")}`;
    if (autoCreatedRef.current.has(dedupKey)) return;

    // Skip if draft already exists for this month
    if (hasDraftThisMonth(currentMonth)) return;

    // Mark as processed
    autoCreatedRef.current.add(dedupKey);

    // Create queue item
    const queueItem: ManagementReviewQueueItem = {
      id: `mrq-${Date.now()}`,
      triggerKPIs: criticals,
      reason: `Critical KPIs detected: ${criticalNames}. Management review required per ISO 9001:2015 Clause 9.3.`,
      draftCreatedAt: new Date().toISOString(),
      status: "pending_review",
    };

    setQueueItems(prev => [...prev, queueItem]);

    // Auto-create F/21 draft
    const draftData: RecordData = {
      formCode: "F/21",
      recordStatus: "draft",
      meeting_date: "",
      meeting_time: "",
      meeting_place: "",
      points_discussed: `Critical KPIs requiring management review:\n${criticalNames}`,
      minutes: `Auto-generated due to critical KPI thresholds:\n${criticals
        .map(
          k =>
            `- ${k.name}: ${k.currentValue}${k.unit} (target: ${k.targetValue}${k.unit})`
        )
        .join("\n")}`,
      next_meeting_date: "",
      _createdAt: new Date().toISOString(),
      _createdBy: "system-auto-queue",
    };

    createF21Mutation.mutate(draftData);
  }, [kpis, hasDraftThisMonth, createF21Mutation]);

  // Manual skip (auditor decides review not needed)
  const skipItem = useCallback((itemId: string) => {
    setQueueItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, status: "skipped" as const } : item
      )
    );
    toast.info("F/21 Auto-Queue Skipped", {
      description: "Management review draft creation skipped for this trigger.",
    });
  }, []);

  // Manual create (auditor wants to force-create F/21 draft)
  const forceCreateDraft = useCallback(
    (itemId: string) => {
      const item = queueItems.find(i => i.id === itemId);
      if (!item) return;

      const criticalNames = item.triggerKPIs.map(k => k.name).join(", ");
      const draftData: RecordData = {
        formCode: "F/21",
        recordStatus: "draft",
        meeting_date: "",
        meeting_time: "",
        meeting_place: "",
        points_discussed: `Critical KPIs requiring management review:\n${criticalNames}`,
        minutes: `Auto-generated due to critical KPI thresholds:\n${item.triggerKPIs
          .map(
            k =>
              `- ${k.name}: ${k.currentValue}${k.unit} (target: ${k.targetValue}${k.unit})`
          )
          .join("\n")}`,
        next_meeting_date: "",
        _createdAt: new Date().toISOString(),
        _createdBy: "system-auto-queue",
      };

      createF21Mutation.mutate(draftData);
      setQueueItems(prev =>
        prev.map(i =>
          i.id === itemId ? { ...i, status: "draft_created" as const } : i
        )
      );
    },
    [queueItems, createF21Mutation]
  );

  const pendingItems = queueItems.filter(i => i.status === "pending_review");

  return {
    queueItems,
    pendingItems,
    hasCritical: hasCriticalKPI(kpis),
    skipItem,
    forceCreateDraft,
    isCreating: createF21Mutation.isPending,
  };
}