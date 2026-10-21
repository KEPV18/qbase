// ============================================================================
// QBase — Projects Workspace (Split-Screen)
// Left panel: project list with record count badges
// Right panel: project detail (metadata, team, linked records)
// Discovers projects by scanning form_data text for known project names
// Dark mode aware — all colors have dark: variants
// ============================================================================

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { useRecords } from "@/hooks/useRecordStorage";
import { AsyncBoundary } from "@/components/ui/AsyncBoundary";
import { PROJECTS, type Project } from "@/data/projectsData";
import { FileText, Users, Calendar, ChevronRight, Briefcase, Search, FolderKanban } from "lucide-react";

// ─── Known project names to scan for in form_data ──────────────────────
const KNOWN_PROJECT_NAMES = PROJECTS.map(p => p.name);

interface DiscoveredProject {
  name: string;
  projectId: string;
  description: string;
  status: string;
  startDate: string;
  endDate?: string;
  teamSize: number;
  team: { role: string; count: number }[];
  linkedRecords: {
    serial: string;
    formCode: string;
    formName: string;
    _createdAt?: string;
  }[];
}

// ─── Helper: scan a record's form_data for project name mentions ──────
function scanRecordForProject(
  record: Record<string, unknown>,
): string | null {
  const projectId = record.project_id as string | undefined;
  if (projectId) {
    const match = PROJECTS.find(p => p.id === projectId || p.name === projectId);
    if (match) return match.name;
  }

  const projectName = record.project_name as string | undefined;
  if (projectName && KNOWN_PROJECT_NAMES.includes(projectName)) {
    return projectName;
  }

  const formData = record.form_data as Record<string, unknown> | undefined;
  if (formData) {
    const textValues = Object.values(formData)
      .filter(v => typeof v === 'string')
      .join(' ');
    for (const pname of KNOWN_PROJECT_NAMES) {
      if (textValues.toLowerCase().includes(pname.toLowerCase())) {
        return pname;
      }
    }
  }

  const allText = Object.entries(record)
    .filter(([k, v]) => typeof v === 'string' && !k.startsWith('_'))
    .map(([, v]) => v as string)
    .join(' ');
  for (const pname of KNOWN_PROJECT_NAMES) {
    if (allText.toLowerCase().includes(pname.toLowerCase())) {
      return pname;
    }
  }

  return null;
}

// ─── Discover projects from records ────────────────────────────────────
function discoverProjects(records: Record<string, unknown>[]): DiscoveredProject[] {
  const projectMap = new Map<string, DiscoveredProject>();

  PROJECTS.forEach(p => {
    projectMap.set(p.name, {
      name: p.name,
      projectId: p.id,
      description: p.description,
      status: p.status,
      startDate: p.startDate,
      endDate: p.endDate,
      teamSize: p.teamSize,
      team: p.team,
      linkedRecords: [],
    });
  });

  records.forEach(record => {
    const matchedName = scanRecordForProject(record);
    if (matchedName && projectMap.has(matchedName)) {
      const project = projectMap.get(matchedName)!;
      project.linkedRecords.push({
        serial: (record.serial as string) || '',
        formCode: (record.formCode as string) || '',
        formName: (record.formName as string) || '',
        _createdAt: (record._createdAt as string) || undefined,
      });
    }
  });

  return Array.from(projectMap.values());
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { data: records, isLoading, error, refetch } = useRecords();
  const [selectedProject, setSelectedProject] = useState<DiscoveredProject | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const toggleGroup = (formCode: string) =>
    setExpandedGroups(prev => ({ ...prev, [formCode]: !prev[formCode] }));

  const discovered = useMemo(() => {
    if (!records) return [];
    return discoverProjects(records as unknown as Record<string, unknown>[]);
  }, [records]);

  const filteredProjects = useMemo(() => {
    if (!searchQuery) return discovered;
    const q = searchQuery.toLowerCase();
    return discovered.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.projectId.toLowerCase().includes(q)
    );
  }, [discovered, searchQuery]);

  const handleSelectProject = (project: DiscoveredProject) => {
    setSelectedProject(project);
  };

  const groupedRecords = useMemo(() => {
    if (!selectedProject) return {};
    const groups: Record<string, typeof selectedProject.linkedRecords> = {};
    selectedProject.linkedRecords.forEach(r => {
      if (!groups[r.formCode]) groups[r.formCode] = [];
      groups[r.formCode].push(r);
    });
    return groups;
  }, [selectedProject]);

  const teamDistribution = useMemo(() => {
    if (!selectedProject) return [];
    const formCounts: Record<string, number> = {};
    selectedProject.linkedRecords.forEach(r => {
      formCounts[r.formName] = (formCounts[r.formName] || 0) + 1;
    });
    return Object.entries(formCounts)
      .map(([formName, count]) => ({ formName, count }))
      .sort((a, b) => b.count - a.count);
  }, [selectedProject]);

  return (
    <AppShell breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "Projects Workspace" }]}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="mb-5">
          <h1 className="flex items-center gap-2.5 text-2xl font-display font-bold tracking-[-0.02em] text-foreground mb-1">
            <FolderKanban className="w-[22px] h-[22px] text-ink-3" aria-hidden="true" />
            Projects Workspace
          </h1>
          <p className="text-sm text-ink-3">
            Discovered {discovered.length} projects from {records?.length || 0} records
          </p>
        </div>

        <AsyncBoundary isLoading={isLoading} error={error} onRetry={() => refetch()}>
          <div className="flex gap-5 flex-1 min-h-0">
            {/* ─── LEFT PANEL: Project List (4 cols) ─────────────────── */}
            <div className="w-4/12 flex flex-col min-w-0">
              {/* Search */}
              <div className="relative mb-3">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search projects..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-ink-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/25"
                />
              </div>

              {/* Project list */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {filteredProjects.length === 0 && (
                  <div className="text-center py-10 text-sm text-ink-3">
                    No projects found
                  </div>
                )}
                {filteredProjects.map(project => {
                  const isSelected = selectedProject?.name === project.name;
                  const recordCount = project.linkedRecords.length;
                  return (
                    <button
                      key={project.projectId}
                      onClick={() => handleSelectProject(project)}
                      className={`w-full text-left p-3 rounded-sm transition-all ${
                        isSelected
                          ? 'bg-foreground text-background'
                          : 'bg-card border border-border hover:border-foreground/20 hover:bg-muted/40 text-ink dark:text-ink-2'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className={`text-sm font-semibold truncate ${
                            isSelected ? 'text-background' : 'text-foreground dark:text-foreground'
                          }`}>
                            {project.name}
                          </div>
                          <p className={`text-xs mt-0.5 line-clamp-2 ${
                            isSelected ? 'text-background/70 dark:text-background/70' : 'text-ink-3 dark:text-ink-3'
                          }`}>
                            {project.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-sm ${
                              isSelected
                                ? 'bg-background/10 text-background'
                                : 'bg-muted text-ink-2 dark:text-ink-2'
                            }`}>
                              {project.status}
                            </span>
                            <span className={`text-[10px] ${isSelected ? 'text-background/70 dark:text-background/70' : 'text-ink-3 dark:text-ink-3'}`}>
                              {project.teamSize} members
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {recordCount > 0 && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-sm ${
                              isSelected
                                ? 'bg-background/15 text-background'
                                : 'bg-muted text-ink-2 dark:text-ink-2'
                            }`}>
                              {recordCount}
                            </span>
                          )}
                          <ChevronRight className={`w-3.5 h-3.5 ${
                            isSelected ? 'text-background' : 'text-ink-3 dark:text-ink-3'
                          }`} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ─── RIGHT PANEL: Project Detail (8 cols) ────────────────── */}
            <div className="w-8/12 min-w-0">
              {selectedProject ? (
                <div className="space-y-4 overflow-y-auto pr-1 max-h-[calc(100vh-220px)]">
                  {/* ── Project Metadata Canvas ────────────────────────── */}
                  <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h2 className="text-lg font-display font-bold tracking-tight text-foreground">{selectedProject.name}</h2>
                        <p className="text-xs text-ink-3 mt-0.5">{selectedProject.projectId}</p>
                      </div>
                      <button
                        onClick={() => navigate(`/project/${encodeURIComponent(selectedProject.name)}`)}
                        className="text-xs text-ink-2 dark:text-ink-2 hover:text-foreground border border-border px-2.5 py-1 rounded-md hover:bg-muted transition-colors"
                      >
                        Open Full View →
                      </button>
                    </div>

                    {/* Timeline */}
                    <div className="flex items-center gap-4 text-xs text-ink-2 dark:text-ink-2 mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {selectedProject.startDate}
                        {selectedProject.endDate ? ` → ${selectedProject.endDate}` : ' → Present'}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded-sm text-[10px] font-medium ${
                        selectedProject.status === 'active'
                          ? 'bg-success/10 dark:bg-success/15 text-success-tint'
                          : selectedProject.status === 'completed'
                          ? 'bg-primary/10 dark:bg-primary/15 text-primary-tint'
                          : 'bg-warning/10 dark:bg-warning/15 text-warning-tint'
                      }`}>
                        {selectedProject.status}
                      </span>
                    </div>

                    {/* AI-Summarized Scope */}
                    <div className="border-t border-border pt-3">
                      <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                        Scope Summary
                      </h3>
                      <p className="text-sm text-ink dark:text-ink-2 leading-relaxed">
                        {selectedProject.description.slice(0, 300)}
                        {selectedProject.description.length > 300 ? '...' : ''}
                      </p>
                    </div>

                    {/* Quick stats */}
                    <div className="flex gap-4 mt-3 pt-3 border-t border-border">
                      <div className="flex items-center gap-1.5 text-xs text-ink-2 dark:text-ink-2">
                        <FileText className="w-3.5 h-3.5" />
                        <span>{selectedProject.linkedRecords.length} linked records</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-ink-2 dark:text-ink-2">
                        <Users className="w-3.5 h-3.5" />
                        <span>{selectedProject.teamSize} team members</span>
                      </div>
                    </div>
                  </div>

                  {/* ── Team Distribution ──────────────────────────────── */}
                  <div className="bg-card border border-border rounded-xl p-5">
                    <h3 className="text-sm font-display font-semibold tracking-tight text-foreground mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4 text-ink-2 dark:text-ink-2" />
                      Team Distribution
                    </h3>
                    {selectedProject.team.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {selectedProject.team.map((role, i) => (
                          <div key={i} className="flex items-center justify-between px-3 py-2 bg-muted/40 border border-border rounded-lg">
                            <span className="text-xs text-ink dark:text-ink-2">{role.role}</span>
                            <span className="text-xs font-semibold text-foreground bg-card px-2 py-0.5 rounded-md border border-border">
                              {role.count}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-ink-3">No team data available</p>
                    )}

                    {teamDistribution.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-[10px] font-semibold text-ink-2 uppercase tracking-wider mb-2">
                          Record Activity by Form
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {teamDistribution.map(({ formName, count }) => (
                            <span key={formName} className="text-[10px] px-2 py-0.5 bg-muted text-ink-2 dark:text-ink-2 rounded-md">
                              {formName}: {count}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Linked Document Cabinet ─────────────────────────── */}
                  <div className="bg-card border border-border rounded-xl p-5">
                    <h3 className="text-sm font-display font-semibold tracking-tight text-foreground mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-ink-2 dark:text-ink-2" />
                      Linked Document Cabinet
                      <span className="text-[10px] font-normal text-ink-3">
                        ({selectedProject.linkedRecords.length} records)
                      </span>
                    </h3>

                    {Object.keys(groupedRecords).length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="w-8 h-8 mx-auto mb-2 text-faint" />
                        <p className="text-xs text-ink-3">No linked records found for this project.</p>
                        <p className="text-[10px] text-ink-3 mt-1">
                          Records will appear here when they reference this project in their form data.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {Object.entries(groupedRecords).map(([formCode, recs]) => (
                          <div key={formCode} className="bg-card border border-border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-foreground dark:text-foreground">{formCode}</span>
                              <span className="text-[10px] text-ink-2 dark:text-ink-2 font-medium">{recs.length} record{recs.length !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="space-y-1">
                              {(expandedGroups[formCode] ? recs : recs.slice(0, 5)).map(r => (
                                <button
                                  key={r.serial}
                                  onClick={() => navigate(`/records/${encodeURIComponent(r.serial)}`)}
                                  className="w-full flex items-center justify-between text-[10px] px-2 py-1 bg-card border border-border rounded-md hover:bg-muted/40 transition-colors"
                                >
                                  <span className="font-mono text-ink-2 dark:text-ink-2">{r.serial}</span>
                                  <span className="text-ink-3 dark:text-ink-3">
                                    {r._createdAt ? new Date(r._createdAt).toLocaleDateString() : ''}
                                  </span>
                                </button>
                              ))}
                              {recs.length > 5 && (
                                <button onClick={() => toggleGroup(formCode)}
                                  className="w-full text-[10px] text-center text-ink-2 dark:text-ink-2 hover:text-foreground pt-1 hover:underline transition-colors">
                                  {expandedGroups[formCode]
                                    ? `− Show ${recs.length - 5} less`
                                    : `+${recs.length - 5} more — Show all ${recs.length}`}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-card border border-border rounded-xl p-10 text-center">
                  <Briefcase className="w-12 h-12 mx-auto mb-3 text-faint" />
                  <h3 className="text-base font-display font-bold tracking-tight text-foreground mb-1">Select a Project</h3>
                  <p className="text-sm text-ink-3">
                    Choose a project from the left panel to view its metadata, team, and linked records.
                  </p>
                </div>
              )}
            </div>
          </div>
        </AsyncBoundary>
      </div>
    </AppShell>
  );
}