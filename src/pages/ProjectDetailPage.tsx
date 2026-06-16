// ============================================================================
// QBase — Project Detail Page (NotionWarm, Dark Mode Aware)
// Deep project context view at /project/:projectName
// Shows full project metadata, team, linked records
// ============================================================================

import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { useRecords } from "@/hooks/useRecordStorage";
import { PROJECTS } from "@/data/projectsData";
import { FileText, Users, Calendar, ArrowLeft, Briefcase } from "lucide-react";

const KNOWN_PROJECT_NAMES = PROJECTS.map(p => p.name);

interface LinkedRecord {
  serial: string;
  formCode: string;
  formName: string;
  _createdAt?: string;
}

function scanRecordForProject(record: Record<string, unknown>): string | null {
  const projectId = record.project_id as string | undefined;
  if (projectId) {
    const match = PROJECTS.find(p => p.id === projectId || p.name === projectId);
    if (match) return match.name;
  }
  const projectName = record.project_name as string | undefined;
  if (projectName && KNOWN_PROJECT_NAMES.includes(projectName)) return projectName;
  const formData = record.form_data as Record<string, unknown> | undefined;
  if (formData) {
    const textValues = Object.values(formData).filter(v => typeof v === 'string').join(' ');
    for (const pname of KNOWN_PROJECT_NAMES) {
      if (textValues.toLowerCase().includes(pname.toLowerCase())) return pname;
    }
  }
  const allText = Object.entries(record)
    .filter(([k, v]) => typeof v === 'string' && !k.startsWith('_'))
    .map(([, v]) => v as string).join(' ');
  for (const pname of KNOWN_PROJECT_NAMES) {
    if (allText.toLowerCase().includes(pname.toLowerCase())) return pname;
  }
  return null;
}

export default function ProjectDetailPage() {
  const { projectName } = useParams<{ projectName: string }>();
  const navigate = useNavigate();
  const { data: records, isLoading } = useRecords();
  const decodedName = projectName ? decodeURIComponent(projectName) : '';

  const project = useMemo(() => {
    if (!decodedName) return null;
    return PROJECTS.find(p => p.name === decodedName || p.id === decodedName) || null;
  }, [decodedName]);

  const linkedRecords: LinkedRecord[] = useMemo(() => {
    if (!project || !records) return [];
    return (records as unknown as Record<string, unknown>[]).filter(r => {
      const matched = scanRecordForProject(r);
      return matched === project.name;
    }).map(r => ({
      serial: (r.serial as string) || '',
      formCode: (r.formCode as string) || '',
      formName: (r.formName as string) || '',
      _createdAt: (r._createdAt as string) || undefined,
    }));
  }, [project, records]);

  const groupedRecords = useMemo(() => {
    const groups: Record<string, LinkedRecord[]> = {};
    linkedRecords.forEach(r => {
      if (!groups[r.formCode]) groups[r.formCode] = [];
      groups[r.formCode].push(r);
    });
    return groups;
  }, [linkedRecords]);

  const teamActivity = useMemo(() => {
    const formCounts: Record<string, number> = {};
    linkedRecords.forEach(r => { formCounts[r.formName] = (formCounts[r.formName] || 0) + 1; });
    return Object.entries(formCounts).map(([formName, count]) => ({ formName, count })).sort((a, b) => b.count - a.count);
  }, [linkedRecords]);

  if (isLoading) {
    return (
      <AppShell breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "Projects", path: "/projects" }, { label: decodedName || "Loading..." }]}>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-6 h-6 border-2 border-[#2d2d2d] dark:border-[#e8e3db] border-t-transparent rounded-full" />
        </div>
      </AppShell>
    );
  }

  if (!project) {
    return (
      <AppShell breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "Projects", path: "/projects" }, { label: decodedName || "Not Found" }]}>
        <div className="bg-[#f8f6f1] dark:bg-[#1a1a18] border border-[#e8e3db] dark:border-[#2d2d2b] rounded-sm p-10 text-center">
          <Briefcase className="w-12 h-12 mx-auto mb-3 text-[#d4cfc4] dark:text-[#3d3d3a]" />
          <h3 className="text-base font-['Georgia'] font-bold text-[#2d2d2d] dark:text-[#e8e3db] mb-1">Project Not Found</h3>
          <p className="text-sm text-[#9f9a8f] dark:text-[#7a756a] mb-4">No project found for "{decodedName}"</p>
          <button onClick={() => navigate('/projects')}
            className="text-xs text-[#7a756a] dark:text-[#b5b0a5] hover:text-[#2d2d2d] dark:hover:text-[#e8e3db] border border-[#e8e3db] dark:border-[#2d2d2b] px-3 py-1.5 rounded-sm hover:bg-[#ece8df] dark:hover:bg-[#232220] transition-colors">
            ← Back to Projects
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell breadcrumbs={[
      { label: "Dashboard", path: "/" },
      { label: "Projects", path: "/projects" },
      { label: project.name },
    ]}>
      <button onClick={() => navigate('/projects')}
        className="flex items-center gap-1 text-xs text-[#7a756a] dark:text-[#b5b0a5] hover:text-[#2d2d2d] dark:hover:text-[#e8e3db] mb-4 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Projects
      </button>

      {/* ── Project Metadata Canvas ── */}
      <div className="bg-[#f8f6f1] dark:bg-[#1a1a18] border border-[#e8e3db] dark:border-[#2d2d2b] rounded-sm p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-['Georgia'] font-bold text-[#2d2d2d] dark:text-[#e8e3db]">{project.name}</h1>
            <p className="text-xs text-[#9f9a8f] dark:text-[#7a756a] mt-0.5">{project.id} · {project.type}</p>
          </div>
          <span className={`px-2 py-1 rounded-sm text-[11px] font-medium ${
            project.status === 'active'
              ? 'bg-[#e8f5e9] dark:bg-[#1b3a1b] text-[#2e7d32] dark:text-[#81c784]'
              : project.status === 'completed'
              ? 'bg-[#e3f2fd] dark:bg-[#1a2a4a] text-[#1565c0] dark:text-[#64b5f6]'
              : 'bg-[#fff8e1] dark:bg-[#3a2a1a] text-[#f57f17] dark:text-[#ffb74d]'
          }`}>{project.status}</span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-[#7a756a] dark:text-[#b5b0a5] mb-4">
          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{project.startDate}{project.endDate ? ` → ${project.endDate}` : ' → Present'}</span>
          <span className="text-[#9f9a8f] dark:text-[#7a756a]">·</span>
          <span>Client: {project.client}</span>
          <span className="text-[#9f9a8f] dark:text-[#7a756a]">·</span>
          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{project.teamSize} members</span>
        </div>

        <div className="border-t border-[#e8e3db] dark:border-[#2d2d2b] pt-4">
          <h3 className="text-xs font-semibold text-[#2d2d2d] dark:text-[#e8e3db] uppercase tracking-wider mb-2">Scope & Description</h3>
          <p className="text-sm text-[#5a564c] dark:text-[#b5b0a5] leading-relaxed">{project.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-[#e8e3db] dark:border-[#2d2d2b]">
          {project.composition && <div><span className="text-[10px] font-semibold text-[#7a756a] dark:text-[#b5b0a5] uppercase tracking-wider">Composition</span><p className="text-xs text-[#5a564c] dark:text-[#b5b0a5] mt-0.5">{project.composition}</p></div>}
          {project.endProduct && <div><span className="text-[10px] font-semibold text-[#7a756a] dark:text-[#b5b0a5] uppercase tracking-wider">End Product</span><p className="text-xs text-[#5a564c] dark:text-[#b5b0a5] mt-0.5">{project.endProduct}</p></div>}
          {project.methodOfPrevention && <div><span className="text-[10px] font-semibold text-[#7a756a] dark:text-[#b5b0a5] uppercase tracking-wider">Method of Prevention</span><p className="text-xs text-[#5a564c] dark:text-[#b5b0a5] mt-0.5">{project.methodOfPrevention}</p></div>}
          {project.storageCondition && <div><span className="text-[10px] font-semibold text-[#7a756a] dark:text-[#b5b0a5] uppercase tracking-wider">Storage</span><p className="text-xs text-[#5a564c] dark:text-[#b5b0a5] mt-0.5">{project.storageCondition}</p></div>}
          {project.distributionMethod && <div><span className="text-[10px] font-semibold text-[#7a756a] dark:text-[#b5b0a5] uppercase tracking-wider">Distribution</span><p className="text-xs text-[#5a564c] dark:text-[#b5b0a5] mt-0.5">{project.distributionMethod}</p></div>}
          {project.licensing && <div><span className="text-[10px] font-semibold text-[#7a756a] dark:text-[#b5b0a5] uppercase tracking-wider">Licensing</span><p className="text-xs text-[#5a564c] dark:text-[#b5b0a5] mt-0.5">{project.licensing}</p></div>}
          {project.intendedUse && <div><span className="text-[10px] font-semibold text-[#7a756a] dark:text-[#b5b0a5] uppercase tracking-wider">Intended Use</span><p className="text-xs text-[#5a564c] dark:text-[#b5b0a5] mt-0.5">{project.intendedUse}</p></div>}
          {project.regulatoryRequirements && <div><span className="text-[10px] font-semibold text-[#7a756a] dark:text-[#b5b0a5] uppercase tracking-wider">Regulatory</span><p className="text-xs text-[#5a564c] dark:text-[#b5b0a5] mt-0.5">{project.regulatoryRequirements}</p></div>}
        </div>
      </div>

      {/* ── Team Distribution ── */}
      <div className="bg-[#f8f6f1] dark:bg-[#1a1a18] border border-[#e8e3db] dark:border-[#2d2d2b] rounded-sm p-5 mb-4">
        <h3 className="text-sm font-['Georgia'] font-bold text-[#2d2d2d] dark:text-[#e8e3db] mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-[#7a756a] dark:text-[#b5b0a5]" /> Team Distribution
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
          {project.team.map((role, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2 bg-[#f5f2eb] dark:bg-[#1e1e1c] border border-[#e8e3db] dark:border-[#2d2d2b] rounded-sm">
              <span className="text-xs text-[#5a564c] dark:text-[#b5b0a5]">{role.role}</span>
              <span className="text-xs font-semibold text-[#2d2d2d] dark:text-[#e8e3db] bg-white dark:bg-[#1a1a18] px-2 py-0.5 rounded-sm border border-[#e8e3db] dark:border-[#2d2d2b]">{role.count}</span>
            </div>
          ))}
        </div>
        {teamActivity.length > 0 && (
          <div className="border-t border-[#e8e3db] dark:border-[#2d2d2b] pt-3">
            <p className="text-[10px] font-semibold text-[#7a756a] dark:text-[#b5b0a5] uppercase tracking-wider mb-2">Record Activity by Form</p>
            <div className="flex flex-wrap gap-1.5">
              {teamActivity.map(({ formName, count }) => (
                <span key={formName} className="text-[10px] px-2 py-0.5 bg-[#ece8df] dark:bg-[#232220] text-[#7a756a] dark:text-[#b5b0a5] rounded-sm">{formName}: {count}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Linked Document Cabinet ── */}
      <div className="bg-[#f8f6f1] dark:bg-[#1a1a18] border border-[#e8e3db] dark:border-[#2d2d2b] rounded-sm p-5 mb-4">
        <h3 className="text-sm font-['Georgia'] font-bold text-[#2d2d2d] dark:text-[#e8e3db] mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#7a756a] dark:text-[#b5b0a5]" /> Linked Document Cabinet
          <span className="text-[10px] font-normal text-[#9f9a8f] dark:text-[#7a756a]">({linkedRecords.length} records)</span>
        </h3>
        {Object.keys(groupedRecords).length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-8 h-8 mx-auto mb-2 text-[#d4cfc4] dark:text-[#3d3d3a]" />
            <p className="text-xs text-[#9f9a8f] dark:text-[#7a756a]">No linked records found for this project.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {Object.entries(groupedRecords).map(([formCode, recs]) => (
              <div key={formCode} className="bg-[#f8f6f1] dark:bg-[#1a1a18] border border-[#e8e3db] dark:border-[#2d2d2b] rounded-sm p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[#2d2d2d] dark:text-[#e8e3db]">{formCode}</span>
                  <span className="text-[10px] text-[#7a756a] dark:text-[#b5b0a5]">{recs.length} record{recs.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-1">
                  {recs.slice(0, 6).map(r => (
                    <button key={r.serial} onClick={() => navigate(`/records/${encodeURIComponent(r.serial)}`)}
                      className="w-full flex items-center justify-between text-[10px] px-2 py-1 bg-white dark:bg-[#1a1a18] border border-[#e8e3db] dark:border-[#2d2d2b] rounded-sm hover:bg-[#f5f2eb] dark:hover:bg-[#1e1e1c] transition-colors">
                      <span className="font-mono text-[#5a564c] dark:text-[#b5b0a5]">{r.serial}</span>
                      <span className="text-[#9f9a8f] dark:text-[#7a756a]">{r._createdAt ? new Date(r._createdAt).toLocaleDateString() : ''}</span>
                    </button>
                  ))}
                  {recs.length > 6 && <p className="text-[10px] text-center text-[#9f9a8f] dark:text-[#7a756a] pt-1">+{recs.length - 6} more</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}