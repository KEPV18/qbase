// ============================================================================
// QBase — Approval Queue Page
// Shows all Pending_Approval records.
// Admin sees all. Dept Head sees only their department.
// ============================================================================

import React, { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { StateScreen } from "@/components/ui/StateScreen";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useRecords } from "@/hooks/useRecordStorage";
import { approveRecord } from "@/services/recordStorage";
import type { RecordData } from "@/components/forms/DynamicFormRenderer";
import {
  CheckCircle, Clock, Shield, Search, ExternalLink,
  Building2, Tag, FileText, User, Calendar,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  Draft:            { label: "Draft",             color: "bg-zinc-100 text-zinc-500",      icon: FileText },
  Pending_Approval: { label: "Pending Approval", color: "bg-amber-100 text-amber-700",      icon: Clock },
  Approved:         { label: "Approved",          color: "bg-green-100 text-green-700",      icon: CheckCircle },
};

function ApprovalCard({
  record,
  onApprove,
  canApprove,
}: {
  record: RecordData;
  onApprove: (serial: string) => void;
  canApprove: boolean;
}) {
  const navigate = useNavigate();
  const serial = String(record.serial ?? "");
  const formCode = String(record.formCode ?? "");
  const formName = String(record.formName ?? "");
  const dept = String(record._department ?? "—");
  const status = String(record._approvalStatus ?? "Pending_Approval");
  const createdBy = String(record._createdBy ?? "Unknown");
  const createdAt = String(record._createdAt ?? "");
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Pending_Approval;
  const Icon = cfg.icon;

  return (
    <div className="ds-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-mono">{formCode}</Badge>
            <h3 className="font-semibold text-sm">{formName || serial}</h3>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Tag size={12} /> {serial}</span>
            <span className="flex items-center gap-1"><Building2 size={12} /> {dept}</span>
            <span className="flex items-center gap-1"><User size={12} /> {createdBy}</span>
            <span className="flex items-center gap-1"><Calendar size={12} /> {createdAt ? new Date(createdAt).toLocaleDateString() : "—"}</span>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.color}`}>
          <Icon size={12} /> {cfg.label}
        </span>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => navigate(`/records/${encodeURIComponent(serial)}`)}
        >
          <ExternalLink size={12} className="mr-1" /> View
        </Button>
        {status === "Pending_Approval" && canApprove && (
          <Button
            size="sm"
            className="text-xs bg-green-600 hover:bg-green-700 text-white"
            onClick={() => onApprove(serial)}
          >
            <CheckCircle size={12} className="mr-1" /> Approve
          </Button>
        )}
      </div>
    </div>
  );
}

export default function ApprovalQueuePage() {
  const { user } = useAuth();
  const { data: allRecords, isLoading, error, refetch } = useRecords();
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState<string>("all");
  const [processing, setProcessing] = useState<Set<string>>(new Set());

  const isAdmin = user?.role === "admin";
  const userDept = user?.department ?? null;

  // Filter: only pending for queue, plus optional search + dept filter
  const pendingRecords = useMemo(() => {
    if (!allRecords) return [];
    return allRecords.filter((r: RecordData) => {
      if (r._approvalStatus !== "Pending_Approval") return false;
      if (!isAdmin && userDept && r._department !== userDept) return false;
      if (search) {
        const term = search.toLowerCase();
        const haystack = [
          String(r.serial ?? ""),
          String(r.formName ?? ""),
          String(r.formCode ?? ""),
          String(r._createdBy ?? ""),
        ].join(" ").toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (filterDept !== "all" && r._department !== filterDept) return false;
      return true;
    });
  }, [allRecords, isAdmin, userDept, search, filterDept]);

  // Unique departments from pending records
  const departments = useMemo(() => {
    const depts = new Set<string>();
    pendingRecords.forEach((r: RecordData) => {
      if (r._department) depts.add(String(r._department));
    });
    return Array.from(depts).sort();
  }, [pendingRecords]);

  const handleApprove = useCallback(async (serial: string) => {
    setProcessing(prev => new Set(prev).add(serial));
    try {
      const result = await approveRecord(serial);
      if (result.success) {
        await refetch();
      } else {
        alert(result.error || "Approval failed");
      }
    } finally {
      setProcessing(prev => {
        const next = new Set(prev);
        next.delete(serial);
        return next;
      });
    }
  }, [refetch]);

  if (isLoading) return <StateScreen state="loading" title="Loading approvals…" />;
  if (error)    return <StateScreen state="error" title="Failed to load approvals" message={error.message} />;

  return (
    <div className="space-y-6 px-4 md:px-6 lg:px-8 py-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Approval Queue"
        icon={Shield}
        description={
          isAdmin
            ? "Review and approve pending records across all departments."
            : `Review and approve pending records for ${userDept ?? "your department"}.`
        }
        badge={{ text: `${pendingRecords.length} Pending`, variant: "secondary" }}
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Pending" value={pendingRecords.length} icon={Clock} />
        <StatCard label="Your Dept" value={pendingRecords.filter((r: RecordData) => r._department === userDept).length} icon={Building2} />
        <StatCard label="Avg Age" value={
          (() => {
            const ages = pendingRecords.map((r: RecordData) => {
              const d = new Date(r._createdAt ?? 0);
              return Date.now() - d.getTime();
            });
            if (!ages.length) return "0d";
            const avgDays = Math.round(ages.reduce((a, b) => a + b, 0) / ages.length / (1000 * 60 * 60 * 24));
            return `${avgDays}d`;
          })()
        } icon={Calendar} />
        <StatCard label="Oldest" value={
          (() => {
            const dates = pendingRecords.map((r: RecordData) => new Date(r._createdAt ?? 0).getTime()).filter(Boolean);
            if (!dates.length) return "—";
            const oldest = Math.min(...dates);
            const days = Math.round((Date.now() - oldest) / (1000 * 60 * 60 * 24));
            return `${days}d`;
          })()
        } icon={Calendar} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search serial, form, creator…"
            className="pl-9"
          />
        </div>
        {isAdmin && departments.length > 1 && (
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm bg-background"
          >
            <option value="all">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
      </div>

      {/* Queue */}
      {pendingRecords.length === 0 ? (
        <StateScreen
          state="empty"
          title="Queue is Clear"
          message="No records are awaiting approval. Great work!"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {pendingRecords.map((record: RecordData) => (
            <ApprovalCard
              key={String(record.serial)}
              record={record}
              onApprove={handleApprove}
              canApprove={isAdmin || record._department === userDept}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ElementType }) {
  return (
    <div className="ds-card p-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div>
        <p className="text-lg font-bold">{value}</p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
