// ============================================================================
// QBase — Projects Workspace (NotionWarm Split-Screen)
// Left panel: project list with record count badges
// Right panel: project detail (metadata, team, linked records)
// Discovers projects by scanning form_data text for known project names
// Dark mode aware — all colors have dark: variants
// ============================================================================

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { useRecords } from "@/hooks/useRecordStorage";
import { PROJECTS, type Project } from "@/data/projectsData";
import { FileText, Users, Calendar, ChevronRight, Briefcase, Search } from "lucide-react";

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
  const { data: records, isLoading } = useRecords();
  const [selectedProject, setSelectedProject] = useState<DiscoveredProject | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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
          <h1 className="text-2xl font-['Georgia'] font-bold text-[#2d2d2d] dark:text-[#e8e3db] mb-1">
            📁 Projects Workspace
          </h1>
          <p className="text-sm text-[#9f9a8f] dark:text-[#7a756a]">
            Discovered {discovered.length} projects from {records?.length || 0} records
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-6 h-6 border-2 border-[#2d2d2d] dark:border-[#e8e3db] border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="flex gap-5 flex-1 min-h-0">
            {/* ─── LEFT PANEL: Project List (4 cols) ─────────────────── */}
            <div className="w-4/12 flex flex-col min-w-0">
              {/* Search */}
              <div className="relative mb-3">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9f9a8f] dark:text-[#7a756a]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search projects..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-[#f8f6f1] dark:bg-[#1a1a18] border border-[#e8e3db] dark:border-[#2d2d2b] rounded-sm text-[#2d2d2d] dark:text-[#e8e3db] placeholder:text-[#9f9a8f] dark:placeholder:text-[#7a756a] focus:outline-none focus:border-[#2d2d2d] dark:focus:border-[#e8e3db] focus:ring-1 focus:ring-[#2d2d2d]/20 dark:focus:ring-[#e8e3db]/20"
                />
              </div>

              {/* Project list */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {filteredProjects.length === 0 && (
                  <div className="text-center py-10 text-sm text-[#9f9a8f] dark:text-[#7a756a]">
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
                          ? 'bg-[#2d2d2d] dark:bg-[#e8e3db] text-white dark:text-[#1a1a18]'
                          : 'bg-[#f8f6f1] dark:bg-[#1a1a18] border border-[#e8e3db] dark:border-[#2d2d2b] hover:border-[#d4cfc4] dark:hover:border-[#3d3d3a] hover:bg-[#f5f2eb] dark:hover:bg-[#1e1e1c] text-[#5a564c] dark:text-[#b5b0a5]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className={`text-sm font-semibold truncate ${
                            isSelected ? 'text-white dark:text-[#1a1a18]' : 'text-[#2d2d2d] dark:text-[#e8e3db]'
                          }`}>
                            {project.name}
                          </div>
                          <p className={`text-xs mt-0.5 line-clamp-2 ${
                            isSelected ? 'text-[#b5b0a5] dark:text-[#5a564c]' : 'text-[#9f9a8f] dark:text-[#7a756a]'
                          }`}>
                            {project.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-sm ${
                              isSelected
                                ? 'bg-white/10 dark:bg-[#1a1a18]/10 text-white dark:text-[#1a1a18]'
                                : 'bg-[#ece8df] dark:bg-[#232220] text-[#7a756a] dark:text-[#b5b0a5]'
                            }`}>
                              {project.status}
                            </span>
                            <span className={`text-[10px] ${isSelected ? 'text-[#b5b0a5] dark:text-[#5a564c]' : 'text-[#9f9a8f] dark:text-[#7a756a]'}`}>
                              {project.teamSize} members
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {recordCount > 0 && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-sm ${
                              isSelected
                                ? 'bg-white/15 dark:bg-[#1a1a18]/15 text-white dark:text-[#1a1a18]'
                                : 'bg-[#ece8df] dark:bg-[#232220] text-[#7a756a] dark:text-[#b5b0a5]'
                            }`}>
                              {recordCount}
                            </span>
                          )}
                          <ChevronRight className={`w-3.5 h-3.5 ${
                            isSelected ? 'text-white dark:text-[#1a1a18]' : 'text-[#9f9a8f] dark:text-[#7a756a]'
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
                  <div className="bg-[#f8f6f1] dark:bg-[#1a1a18] border border-[#e8e3db] dark:border-[#2d2d2b] rounded-sm p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h2 className="text-lg font-['Georgia'] font-bold text-[#2d2d2d] dark:text-[#e8e3db]">{selectedProject.name}</h2>
                        <p className="text-xs text-[#9f9a8f] dark:text-[#7a756a] mt-0.5">{selectedProject.projectId}</p>
                      </div>
                      <button
                        onClick={() => navigate(`/project/${encodeURIComponent(selectedProject.name)}`)}
                        className="text-xs text-[#7a756a] dark:text-[#b5b0a5] hover:text-[#2d2d2d] dark:hover:text-[#e8e3db] border border-[#e8e3db] dark:border-[#2d2d2b] px-2.5 py-1 rounded-sm hover:bg-[#ece8df] dark:hover:bg-[#232220] transition-colors"
                      >
                        Open Full View →
                      </button>
                    </div>

                    {/* Timeline */}
                    <div className="flex items-center gap-4 text-xs text-[#7a756a] dark:text-[#b5b0a5] mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {selectedProject.startDate}
                        {selectedProject.endDate ? ` → ${selectedProject.endDate}` : ' → Present'}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded-sm text-[10px] font-medium ${
                        selectedProject.status === 'active'
                          ? 'bg-[#e8f5e9] dark:bg-[#1b3a1b] text-[#2e7d32] dark:text-[#81c784]'
                          : selectedProject.status === 'completed'
                          ? 'bg-[#e3f2fd] dark:bg-[#1a2a4a] text-[#1565c0] dark:text-[#64b5f6]'
                          : 'bg-[#fff8e1] dark:bg-[#3a2a1a] text-[#f57f17] dark:text-[#ffb74d]'
                      }`}>
                        {selectedProject.status}
                      </span>
                    </div>

                    {/* AI-Summarized Scope */}
                    <div className="border-t border-[#e8e3db] dark:border-[#2d2d2b] pt-3">
                      <h3 className="text-xs font-semibold text-[#2d2d2d] dark:text-[#e8e3db] uppercase tracking-wider mb-1.5">
                        Scope Summary
                      </h3>
                      <p className="text-sm text-[#5a564c] dark:text-[#b5b0a5] leading-relaxed">
                        {selectedProject.description.slice(0, 300)}
                        {selectedProject.description.length > 300 ? '...' : ''}
                      </p>
                    </div>

                    {/* Quick stats */}
                    <div className="flex gap-4 mt-3 pt-3 border-t border-[#e8e3db] dark:border-[#2d2d2b]">
                      <div className="flex items-center gap-1.5 text-xs text-[#7a756a] dark:text-[#b5b0a5]">
                        <FileText className="w-3.5 h-3.5" />
                        <span>{selectedProject.linkedRecords.length} linked records</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-[#7a756a] dark:text-[#b5b0a5]">
                        <Users className="w-3.5 h-3.5" />
                        <span>{selectedProject.teamSize} team members</span>
                      </div>
                    </div>
                  </div>

                  {/* ── Team Distribution ──────────────────────────────── */}
                  <div className="bg-[#f8f6f1] dark:bg-[#1a1a18] border border-[#e8e3db] dark:border-[#2d2d2b] rounded-sm p-5">
                    <h3 className="text-sm font-['Georgia'] font-bold text-[#2d2d2d] dark:text-[#e8e3db] mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#7a756a] dark:text-[#b5b0a5]" />
                      Team Distribution
                    </h3>
                    {selectedProject.team.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {selectedProject.team.map((role, i) => (
                          <div key={i} className="flex items-center justify-between px-3 py-2 bg-[#f5f2eb] dark:bg-[#1e1e1c] border border-[#e8e3db] dark:border-[#2d2d2b] rounded-sm">
                            <span className="text-xs text-[#5a564c] dark:text-[#b5b0a5]">{role.role}</span>
                            <span className="text-xs font-semibold text-[#2d2d2d] dark:text-[#e8e3db] bg-white dark:bg-[#1a1a18] px-2 py-0.5 rounded-sm border border-[#e8e3db] dark:border-[#2d2d2b]">
                              {role.count}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#9f9a8f] dark:text-[#7a756a]">No team data available</p>
                    )}

                    {teamDistribution.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[#e8e3db] dark:border-[#2d2d2b]">
                        <p className="text-[10px] font-semibold text-[#7a756a] dark:text-[#b5b0a5] uppercase tracking-wider mb-2">
                          Record Activity by Form
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {teamDistribution.map(({ formName, count }) => (
                            <span key={formName} className="text-[10px] px-2 py-0.5 bg-[#ece8df] dark:bg-[#232220] text-[#7a756a] dark:text-[#b5b0a5] rounded-sm">
                              {formName}: {count}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Linked Document Cabinet ─────────────────────────── */}
                  <div className="bg-[#f8f6f1] dark:bg-[#1a1a18] border border-[#e8e3db] dark:border-[#2d2d2b] rounded-sm p-5">
                    <h3 className="text-sm font-['Georgia'] font-bold text-[#2d2d2d] dark:text-[#e8e3db] mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#7a756a] dark:text-[#b5b0a5]" />
                      Linked Document Cabinet
                      <span className="text-[10px] font-normal text-[#9f9a8f] dark:text-[#7a756a]">
                        ({selectedProject.linkedRecords.length} records)
                      </span>
                    </h3>

                    {Object.keys(groupedRecords).length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="w-8 h-8 mx-auto mb-2 text-[#d4cfc4] dark:text-[#3d3d3a]" />
                        <p className="text-xs text-[#9f9a8f] dark:text-[#7a756a]">No linked records found for this project.</p>
                        <p className="text-[10px] text-[#9f9a8f] dark:text-[#7a756a] mt-1">
                          Records will appear here when they reference this project in their form data.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {Object.entries(groupedRecords).map(([formCode, recs]) => (
                          <div key={formCode} className="bg-[#f8f6f1] dark:bg-[#1a1a18] border border-[#e8e3db] dark:border-[#2d2d2b] rounded-sm p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-[#2d2d2d] dark:text-[#e8e3db]">{formCode}</span>
                              <span className="text-[10px] text-[#7a756a] dark:text-[#b5b0a5] font-medium">{recs.length} record{recs.length !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="space-y-1">
                              {recs.slice(0, 5).map(r => (
                                <button
                                  key={r.serial}
                                  onClick={() => navigate(`/records/${encodeURIComponent(r.serial)}`)}
                                  className="w-full flex items-center justify-between text-[10px] px-2 py-1 bg-white dark:bg-[#1a1a18] border border-[#e8e3db] dark:border-[#2d2d2b] rounded-sm hover:bg-[#f5f2eb] dark:hover:bg-[#1e1e1c] transition-colors"
                                >
                                  <span className="font-mono text-[#5a564c] dark:text-[#b5b0a5]">{r.serial}</span>
                                  <span className="text-[#9f9a8f] dark:text-[#7a756a]">
                                    {r._createdAt ? new Date(r._createdAt).toLocaleDateString() : ''}
                                  </span>
                                </button>
                              ))}
                              {recs.length > 5 && (
                                <p className="text-[10px] text-center text-[#9f9a8f] dark:text-[#7a756a] pt-1">
                                  +{recs.length - 5} more
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-[#f8f6f1] dark:bg-[#1a1a18] border border-[#e8e3db] dark:border-[#2d2d2b] rounded-sm p-10 text-center">
                  <Briefcase className="w-12 h-12 mx-auto mb-3 text-[#d4cfc4] dark:text-[#3d3d3a]" />
                  <h3 className="text-base font-['Georgia'] font-bold text-[#2d2d2d] dark:text-[#e8e3db] mb-1">Select a Project</h3>
                  <p className="text-sm text-[#9f9a8f] dark:text-[#7a756a]">
                    Choose a project from the left panel to view its metadata, team, and linked records.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}