// ============================================================================
// QMS Forge — Projects Page (Static + Supabase hybrid)
// Shows projects from static data file with QMS record links from Supabase.
// ============================================================================

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { useRecords } from "@/hooks/useRecordStorage";
import { StateScreen } from "@/components/ui/StateScreen";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, FileText, Layers, ChevronRight } from "lucide-react";
import { PROJECTS, type Project } from "@/data/projectsData";

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { data: records } = useRecords();

  // Enrich static projects with Supabase record counts
  const enrichedProjects = useMemo(() => {
    return PROJECTS.map(proj => {
      // Find matching records by project_name or client_name
      const matchingRecords = (records || []).filter(r => {
        const fd = (r.formData as Record<string, unknown>) || {};
        const recProject = (fd.project_name || fd.client_name) as string;
        return recProject === proj.name || recProject === proj.client;
      });

      return {
        ...proj,
        supabaseRecordCount: matchingRecords.length,
        totalRecords: proj.qmsRecords.length + matchingRecords.length,
      };
    });
  }, [records]);

  const stats = useMemo(() => ({
    total: enrichedProjects.length,
    active: enrichedProjects.filter(p => p.status === "active").length,
    completed: enrichedProjects.filter(p => p.status === "completed").length,
    members: enrichedProjects.reduce((sum, p) => sum + p.teamSize, 0),
  }), [enrichedProjects]);

  return (
    <AppShell breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "Projects" }]}>
      <PageHeader icon={Briefcase} title="Projects" description={`Manage all Vezloo projects with QMS compliance`} />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        <Card className="border-border/30">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total Projects</p>
          </CardContent>
        </Card>
        <Card className="border-border/30">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-500">{stats.active}</p>
            <p className="text-sm text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card className="border-border/30">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-500">{stats.completed}</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card className="border-border/30">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.members}</p>
            <p className="text-sm text-muted-foreground">Team Members</p>
          </CardContent>
        </Card>
      </div>

      {/* Project Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {enrichedProjects.map(proj => (
          <Card
            key={proj.id}
            className="cursor-pointer hover:border-primary/30 transition-all group"
            onClick={() => navigate(`/projects/${proj.id}`)}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <img src="/qms.svg" alt="QMS" className="w-4 h-4" />
                    <h3 className="text-sm font-semibold truncate">{proj.name}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{proj.description}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={`text-[10px] ${proj.status === 'active' ? 'border-green-500/30 text-green-500' : proj.status === 'completed' ? 'border-blue-500/30 text-blue-500' : 'border-yellow-500/30 text-yellow-500'}`}>
                      {proj.status}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      <Briefcase className="w-3 h-3 mr-1" /> {proj.teamSize} members
                    </Badge>
                    {proj.totalRecords > 0 && (
                      <Badge variant="outline" className="text-[10px]">
                        <FileText className="w-3 h-3 mr-1" /> {proj.totalRecords} records
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {proj.startDate}{proj.endDate ? ` → ${proj.endDate}` : ' → Present'} {proj.type}
                  </p>
                  <p className="text-xs text-muted-foreground">Client: {proj.client}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}