// ============================================================================
// QBase — Approval Queue Page
// Shows all Pending_Approval records + recent activity (created/approved).
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
  Building2, Tag, FileText, User, Calendar, History, PlusCircle,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  Draft:            { label: "Draft",             color: "bg-zinc-100 text-zinc-500",      icon: FileText },
  Pending_Approval: { label: "Pending Approval", color: "bg-amber-100 text-amber-700",      icon: Clock },
  Approved:         { label: "Approved",          color: "bg-green-100 text-green-700",      icon: CheckCircle },
};

type ViewMode = "pending" | "recent_created" | "recent_approved";

function RecordCard({
  record,
  onApprove,
  canApprove,
  showApprovedBy = false,
}: {
  record: RecordData;
  onApprove: (serial: string) => void;
  canApprove: boolean;
  showApprovedBy?: boolean;
}) {
  const navigate = useNavigate();
  const serial = String(record.serial ?? "");
  const formCode = String(record.formCode ?? "");
  const formName = String(record.formName ?? "");
  const dept = String(record._department ?? "—");
  const status = String(record._approvalStatus ?? "Pending_Approval");
  const createdBy = String(record._createdBy ?? "Unknown");
  const createdAt = String(record._createdAt ?? "");
  const lastModifiedBy = String(record._lastModifiedBy ?? "");
  const lastModifiedAt = String(record._lastModifiedAt ?? "");
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
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><Tag size={12} /> {serial}</span>
            <span className="flex items-center gap-1"><Building2 size={12} /> {dept}</span>
            <span className="flex items-center gap-1"><User size={12} /> Created: {createdBy}</span>
            <span className="flex items-center gap-1"><Calendar size={12} /> {createdAt ? new Date(createdAt).toLocaleDateString() : "—"}</span>
            {showApprovedBy && lastModifiedBy && (
              <>
                <span className="flex items-center gap-1"><CheckCircle size={12} className="text-green-600" /> Approved: {lastModifiedBy}</span>
                <span className="flex items-center gap-1"><Calendar size={12} /> {lastModifiedAt ? new Date(lastModifiedAt).toLocaleDateString() : "—"}</span>
              </>
            )}
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
  const [viewMode, setViewMode] = useState<ViewMode>("pending");
  const [limit, setLimit] = useState(10);

  const isAdmin = user?.role === "admin";
  const userDept = user?.department ?? null;

  // Filter records based on view mode
  const filteredRecords = useMemo(() => {
    if (!allRecords) return [];
    
    let base = allRecords;
    
    // Department filter (non-admin)
    if (!isAdmin && userDept) {
      base = base.filter(r => r._department === userDept);
    }
    
    // Search filter
    if (search) {
      const term = search.toLowerCase();
      base = base.filter(r => {
        const haystack = [
          String(r.serial ?? ""),
          String(r.formName ?? ""),
          String(r.formCode ?? ""),
          String(r._createdBy ?? ""),
          String(r._lastModifiedBy ?? ""),
        ].join(" ").toLowerCase();
        return haystack.includes(term);
      });
    }
    
    // Department dropdown filter
    if (filterDept !== "all") {
      base = base.filter(r => r._department === filterDept);
    }

    // View mode filter
    switch (viewMode) {
      case "pending":
        return base.filter(r => r._approvalStatus === "Pending_Approval");
      case "recent_created":
        return base
          .sort((a, b) => new Date(b._createdAt ?? 0).getTime() - new Date(a._createdAt ?? 0).getTime())
          .slice(0, limit);
      case "recent_approved":
        return base
          .filter(r => r._approvalStatus === "Approved")
          .sort((a, b) => new Date(b._lastModifiedAt ?? 0).getTime() - new Date(a._lastModifiedAt ?? 0).getTime())
          .slice(0, limit);
    }
  }, [allRecords, isAdmin, userDept, search, filterDept, viewMode, limit]);

  // Stats for current view
  const stats = useMemo(() => {
    if (!allRecords) return { pending: 0, createdToday: 0, approvedToday: 0, total: 0 };
    
    let base = allRecords;
    if (!isAdmin && userDept) {
      base = base.filter(r => r._department === userDept);
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    return {
      pending: base.filter(r => r._approvalStatus === "Pending_Approval").length,
      createdToday: base.filter(r => (r._createdAt ?? "").startsWith(today)).length,
      approvedToday: base.filter(r => r._approvalStatus === "Approved" && (r._lastModifiedAt ?? "").startsWith(today)).length,
      total: base.length,
    };
  }, [allRecords, isAdmin, userDept]);

  // Unique departments for filter dropdown
  const departments = useMemo(() => {
    const depts = new Set<string>();
    (allRecords ?? []).forEach((r: RecordData) => {
      if (r._department) depts.add(String(r._department));
    });
    return Array.from(depts).sort();
  }, [allRecords]);

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

  const viewTabs: { id: ViewMode; label: string; icon: React.ElementType; count: number }[] = [
    { id: "pending", label: "Pending Approval", icon: Clock, count: stats.pending },
    { id: "recent_created", label: "Recent Created", icon: PlusCircle, count: Math.min(filteredRecords.length, limit) },
    { id: "recent_approved", label: "Recent Approved", icon: CheckCircle, count: Math.min(filteredRecords.length, limit) },
  ];

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
        badge={{ text: `${stats.pending} Pending`, variant: "secondary" }}
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Pending" value={stats.pending} icon={Clock} color="amber" />
        <StatCard label="Created Today" value={stats.createdToday} icon={PlusCircle} color="blue" />
        <StatCard label="Approved Today" value={stats.approvedToday} icon={CheckCircle} color="green" />
        <StatCard label="Total Records" value={stats.total} icon={FileText} color="purple" />
      </div>

      {/* View Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg" role="tablist">
        {viewTabs.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={viewMode === tab.id}
            onClick={() => setViewMode(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              viewMode === tab.id
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
            <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-muted-foreground/20 text-muted-foreground">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Limit selector for recent views */}
      {(viewMode === "recent_created" || viewMode === "recent_approved") && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Show:</span>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-2 py-1 border rounded-md text-sm bg-background w-24"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span>records</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search serial, form, creator, approver…"
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

      {/* Records Grid */}
      {filteredRecords.length === 0 ? (
        <StateScreen
          state="empty"
          title={viewMode === "pending" ? "Queue is Clear" : "No Records Found"}
          message={
            viewMode === "pending"
              ? "No records are awaiting approval. Great work!"
              : viewMode === "recent_created"
                ? "No recently created records found."
                : "No recently approved records found."
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredRecords.map((record: RecordData) => (
            <RecordCard
              key={String(record.serial)}
              record={record}
              onApprove={handleApprove}
              canApprove={isAdmin || record._department === userDept}
              showApprovedBy={viewMode === "recent_approved"}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color = "primary" }: { label: string; value: string | number; icon: React.ElementType; color?: string }) {
  const colorMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    purple: "bg-purple-100 text-purple-700",
  };
  const bgColor = colorMap[color] || colorMap.primary;

  return (
    <div className="ds-card p-3 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-full ${bgColor} flex items-center justify-center`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-lg font-bold">{value}</p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
