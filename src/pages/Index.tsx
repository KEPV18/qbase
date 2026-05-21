import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { StatusCard } from "@/components/dashboard/StatusCard";
import { ModuleCard } from "@/components/dashboard/ModuleCard";
import { StateScreen } from "@/components/ui/StateScreen";
import { useRecords } from "@/hooks/useRecordStorage";
import { FORM_SCHEMAS } from "@/data/formSchemas";
import { MODULE_CONFIG } from "@/config/modules";
import {
  FileText, AlertTriangle, CheckCircle, Database,
  Layers, TrendingUp, Clock, Shield, FilePlus, FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ─── Dashboard page — Supabase-connected ────────────────────────── */
export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: records, isLoading, error } = useRecords();

  // Compute stats from real Supabase records
  const stats = useMemo(() => {
    const totalRecords = records?.length ?? 0;
    const totalForms = FORM_SCHEMAS.length;

    const sectionCounts: Record<number, number> = {};
    FORM_SCHEMAS.forEach(s => { sectionCounts[s.section] = 0; });
    records?.forEach(r => {
      const schema = FORM_SCHEMAS.find(s => s.code === r.formCode);
      if (schema) sectionCounts[schema.section] = (sectionCounts[schema.section] || 0) + 1;
    });

    const formCodes = new Set(records?.map(r => r.formCode) || []);
    const unpopulatedForms = FORM_SCHEMAS.filter(s => !formCodes.has(s.code));
    const gaps = unpopulatedForms.length;

    const projects = new Set<string>();
    records?.forEach(r => {
      const fd = (r.formData as Record<string, unknown>) || {};
      const name = fd.project_name || fd.client_name;
      if (name && typeof name === "string") projects.add(name);
    });

    const recentRecords = (records || [])
      .sort((a, b) => (b._createdAt as string || '').localeCompare(a._createdAt as string || ''))
      .slice(0, 5);

    // Module-level stats for ModuleCard
    const moduleStats: Record<string, { formsCount: number; recordsCount: number; pendingCount: number; issuesCount: number }> = {};
    Object.values(MODULE_CONFIG).forEach(mod => {
      const formsInSection = FORM_SCHEMAS.filter(s => s.section === mod.section);
      const recordsInSection = records?.filter(r => {
        const schema = FORM_SCHEMAS.find(s => s.code === r.formCode);
        return schema?.section === mod.section;
      }) || [];
      const gapCount = formsInSection.filter(s => !records?.some(r => r.formCode === s.code)).length;

      moduleStats[mod.id] = {
        formsCount: formsInSection.length,
        recordsCount: recordsInSection.length,
        pendingCount: gapCount,
        issuesCount: 0,
      };
    });

    return { totalRecords, totalForms, sectionCounts, gaps, projects: projects.size, recentRecords, unpopulatedForms, moduleStats };
  }, [records]);

  if (isLoading) return <StateScreen state="loading" title="Loading dashboard…" />;
  if (error) return <StateScreen state="error" title="Failed to load data" message={error.message} action={{ label: "Retry", onClick: () => window.location.reload() }} />;

  return (
    <AppShell breadcrumbs={[{ label: "Dashboard" }]}>
      <div className="space-y-8">
        {/* Welcome banner */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">
              ISO 9001 Quality Management System — {stats.totalForms} forms across 7 sections
            </p>
          </div>
          <Button onClick={() => navigate('/create')} className="gap-2">
            <FilePlus className="w-4 h-4" /> New Record
          </Button>
        </div>

        {/* Stats overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatusCard
            title="Total Records"
            value={stats.totalRecords}
            subtitle={`${stats.totalForms} form types`}
            icon={Database}
            variant="default"
          />
          <StatusCard
            title="Active Forms"
            value={stats.totalForms}
            subtitle="ISO 9001 mapped"
            icon={Layers}
            variant="success"
          />
          <StatusCard
            title="Form Gaps"
            value={stats.gaps}
            subtitle={stats.gaps > 10 ? "Needs attention" : "On track"}
            icon={AlertTriangle}
            variant={stats.gaps > 10 ? "warning" : "success"}
          />
          <StatusCard
            title="Projects"
            value={stats.projects}
            subtitle="Active projects"
            icon={FolderOpen}
            variant="default"
          />
        </div>

        {/* Gaps alert */}
        {stats.gaps > 0 && (
          <div className="flex items-start gap-3 p-4 rounded-lg border border-warning/20 bg-warning/5">
            <AlertTriangle className="w-5 h-5 text-warning mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{stats.gaps} forms have zero records</p>
              <p className="text-xs text-muted-foreground mt-0.5">These forms need at least one record for audit compliance.</p>
            </div>
            <Button size="sm" variant="outline" className="shrink-0" onClick={() => navigate('/create')}>
              <FilePlus className="w-4 h-4 mr-1" /> Create
            </Button>
          </div>
        )}

        {/* Module cards */}
        <SectionHeader icon={Layers} label="QMS Modules" description={`${FORM_SCHEMAS.length} forms across 7 ISO 9001 sections`} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Object.values(MODULE_CONFIG).map(mod => {
            const mStats = stats.moduleStats[mod.id] || { formsCount: 0, recordsCount: 0, pendingCount: 0, issuesCount: 0 };
            return (
              <ModuleCard
                key={mod.id}
                title={mod.name}
                description={mod.description}
                icon={mod.icon}
                moduleClass={mod.moduleClass}
                isoClause={mod.isoClause}
                stats={mStats}
                onClick={() => navigate(`/module/${mod.id}`)}
              />
            );
          })}
        </div>

        {/* Quick actions */}
        <SectionHeader icon={TrendingUp} label="Quick Actions" />
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => navigate('/create')} className="gap-2">
            <FilePlus className="w-4 h-4" /> Create Record
          </Button>
          <Button variant="outline" onClick={() => navigate('/records')} className="gap-2">
            <Database className="w-4 h-4" /> View All Records
          </Button>
          <Button variant="outline" onClick={() => navigate('/forms')} className="gap-2">
            <Layers className="w-4 h-4" /> Forms Registry
          </Button>
          <Button variant="outline" onClick={() => navigate('/integrity')} className="gap-2">
            <Shield className="w-4 h-4" /> Data Integrity
          </Button>
        </div>

        {/* Recent records */}
        {stats.recentRecords.length > 0 && (
          <>
            <SectionHeader icon={Clock} label="Recent Records" />
            <div className="space-y-2">
              {stats.recentRecords.map(r => (
                <Card
                  key={r.serial as string}
                  className="cursor-pointer hover:border-primary/20 transition-colors"
                  onClick={() => navigate(`/records/${encodeURIComponent(r.serial as string)}`)}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{r.serial as string}</span>
                      <span className="text-xs text-muted-foreground ml-2">{r.formName as string}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{r.formCode as string}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}