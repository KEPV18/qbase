import { useMemo } from "react";
import type { QMSRecord, FileReview } from "@/lib/googleSheets";

/**
 * Extracts unique project names from record file reviews.
 * Used by TopNav, Sidebar, and ProjectsPage.
 */
export function useProjects(records: QMSRecord[] | undefined): string[] {
  return useMemo(() => {
    if (!records) return [];

    const projs = new Set<string>();
    records.forEach(r => {
      if (r.fileReviews && r.files) {
        const existingFileIds = new Set(r.files.map(f => f.id));
        Object.entries(r.fileReviews).forEach(([fileId, review]: [string, FileReview]) => {
          if (!existingFileIds.has(fileId)) return;
          const name = (review.project === "General / All Company" || !review.project) ? "General" : review.project;
          projs.add(name);
        });
      }
    });

    return Array.from(projs).sort();
  }, [records]);
}