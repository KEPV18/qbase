// ============================================================================
// QMS Forge — Project Detail Page (Static + Supabase hybrid)
// Shows project details with linked QMS records from static data and Supabase.
// ============================================================================

import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { useRecords } from "@/hooks/useRecordStorage";
import { PROJECTS, type Project, type QMSRecord } from "@/data/projectsData";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StateScreen } from "@/components/ui/StateScreen";
import { ArrowLeft, Briefcase, FileText, Users, Calendar, ExternalLink } from "lucide-react";

export default function ProjectDetailPage() {
  const { projectName } = useParams<{ projectName: string }>();
  const navigate = useNavigate();
  const { data: records } = useRecords();

  // Find project by ID or name
  const project = useMemo(() => {
    if (!projectName) return null;
    const decoded = decodeURIComponent(projectName);
    return PROJECTS.find(p => p.id === decoded || p.name === decoded) || null;
  }, [projectName]);

  // Combine static qmsRecords with Supabase records
  const allRecords = useMemo(() => {
    if (!project) return [];
    const staticRecords: QMSRecord[] = project.qmsRecords || [];
    
    // Also find matching Supabase records
    const supabaseRecords = (records || []).filter(r => {
      const fd = (r.formData as Record<string, unknown>) || {};
      const recProject = (fd.project_name || fd.client_name) as string;
      return recProject === project.name || recProject === project.client;
    }).map(r => ({
      serial: r.serial as string,
      formCode: r.formCode as string,
      formName: r.formName as string,
    }));

    // Merge, avoiding duplicates by serial
    const seen = new Set(staticRecords.map(r => r.serial));
    const merged = [...staticRecords];
    for (const r of supabaseRecords) {
      if (!seen.has(r.serial)) {
        merged.push(r);
        seen.add(r.serial);
      }
    }
    return merged.sort((a, b) => a.formCode.localeCompare(b.formCode) || a.serial.localeCompare(b.serial));
  }, [project, records]);

  // Group records by form code
  const groupedRecords = useMemo(() => {
    const groups: Record<string, QMSRecord[]> = {};
    allRecords.forEach(r => {
      if (!groups[r.formCode]) groups[r.formCode] = [];
      groups[r.formCode].push(r);
    });
    return groups;
  }, [allRecords]);

  if (!project) {
    return (
      <AppShell breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "Projects", path: "/projects" }]}>
        <StateScreen state="error" title="Project not found" message={`No project found for "${projectName}"`} />
      </AppShell>
    );
  }

  const statusColor = project.status === "active" ? "text-green-500 border-green-500/30" 
    : project.status === "completed" ? "text-blue-500 border-blue-500/30" 
    : "text-yellow-500 border-yellow-500/30";

  return (
    <AppShell breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "Projects", path: "/projects" }, { label: project.name }]}>
      <PageHeader icon={Briefcase} title={project.name} description={project.description} />

      <div className="flex items-center gap-3 mt-2 mb-6">
        <Badge variant="outline" className={statusColor}>{project.status}</Badge>
        <Badge variant="outline"><Calendar className="w-3 h-3 mr-1" />{project.startDate}{project.endDate ? ` → ${project.endDate}` : " → Ongoing"}</Badge>
        <Badge variant="outline">{project.type}</Badge>
        <Badge variant="outline"><Users className="w-3 h-3 mr-1" />{project.teamSize} members</Badge>
      </div>

      {/* Team Composition */}
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Users className="w-5 h-5" /> Team Composition</h3>
      <p className="text-sm text-muted-foreground mb-3">{project.teamSize} members</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {project.team.map((t, i) => (
          <Card key={i} className="border-border/30">
            <CardContent className="p-3 flex justify-between">
              <span className="text-sm">{t.role}</span>
              <Badge variant="secondary">{t.count}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* QMS Records */}
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><FileText className="w-5 h-5" /> QMS Records</h3>
      {allRecords.length > 0 ? (
        <div className="space-y-3 mb-6">
          {Object.entries(groupedRecords).map(([code, recs]) => (
            <Card key={code} className="border-border/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{code} — {recs[0].formName}</span>
                  <Badge variant="outline" className="text-xs">{recs.length} record{recs.length > 1 ? "s" : ""}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recs.map(r => (
                    <Badge key={r.serial} variant="secondary" className="text-xs">{r.serial}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-border/30">
          <CardContent className="p-6 text-center">
            <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No linked QMS records for this project.</p>
          </CardContent>
        </Card>
      )}

      {/* Product Description */}
      {project.composition && (
        <>
          <h3 className="text-lg font-semibold mb-3">Product Description (F/19)</h3>
          <Card className="border-border/30 mb-6">
            <CardContent className="p-4 space-y-2 text-sm">
              {project.composition && <p><span className="font-medium">Composition:</span> {project.composition}</p>}
              {project.endProduct && <p><span className="font-medium">End Product:</span> {project.endProduct}</p>}
              {project.methodOfPrevention && <p><span className="font-medium">Method of Prevention:</span> {project.methodOfPrevention}</p>}
              {project.storageCondition && <p><span className="font-medium">Storage Condition:</span> {project.storageCondition}</p>}
              {project.distributionMethod && <p><span className="font-medium">Distribution Method:</span> {project.distributionMethod}</p>}
              {project.supportPeriod && <p><span className="font-medium">Support & Update:</span> {project.supportPeriod}</p>}
              {project.licensing && <p><span className="font-medium">Licensing:</span> {project.licensing}</p>}
              {project.intendedUse && <p><span className="font-medium">Intended Use:</span> {project.intendedUse}</p>}
              {project.regulatoryRequirements && <p><span className="font-medium">Regulatory:</span> {project.regulatoryRequirements}</p>}
            </CardContent>
          </Card>
        </>
      )}

      <Button variant="outline" onClick={() => navigate("/projects")}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Projects
      </Button>
    </AppShell>
  );
}