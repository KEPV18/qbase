import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Briefcase, 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Users, 
  Calendar, 
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  FileText,
  Tag,
  Save,
  Loader2,
  ChevronRight,
  ExternalLink,
  FolderOpen,
  Target,
  TrendingUp
} from "lucide-react";
import { useProjects, type Project } from "@/data/projectsData";
import { useQMSData } from "@/hooks/useQMSData";
import { getRecordsForProject, type ProjectRecordEntry } from "@/lib/procedureRecordMapping";
import { formatTimeAgo } from "@/lib/googleSheets";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AppShell } from "@/components/layout/AppShell";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
// Import KPI functions
import { 
  getTeamLeaderForProject, 
  calculateRoleKPIScore,
  getCategoryColor,
  type RoleKPIData
} from "@/data/kpiData";

// ============================================================================
// KPI Section Component - Linked to Project Team Leader
// ============================================================================
function KPISection({ projectName }: { projectName: string }) {
  const teamLeader = useMemo(() => getTeamLeaderForProject(projectName), [projectName]);
  
  if (!teamLeader) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
          <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Team Leader KPIs
        </h3>
        <p className="text-sm text-muted-foreground">
          No KPI data linked to this project.
        </p>
      </div>
    );
  }

  const kpiScore = calculateRoleKPIScore(teamLeader);
  const totalWeight = teamLeader.kpis.reduce((sum, k) => sum + k.weight, 0);
  const isWeightValid = totalWeight >= 0.95 && totalWeight <= 1.05;
  const categories = [...new Set(teamLeader.kpis.map(k => k.category))];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
          <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Team Leader KPIs
        </h3>
        <Badge variant="secondary">{teamLeader.title}</Badge>
      </div>

      {/* KPI Overview Card */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border-indigo-200 dark:border-indigo-800">
        <CardContent className="p-4 space-y-3">
          {/* Role Info */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Reports to</p>
              <p className="font-medium text-foreground">{teamLeader.manager}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Department</p>
              <p className="font-medium text-foreground">{teamLeader.department}</p>
            </div>
          </div>

          <Separator className="bg-indigo-200/50" />

          {/* KPI Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {teamLeader.kpis.length}
              </p>
              <p className="text-xs text-muted-foreground">KPIs</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {(totalWeight * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-muted-foreground">Total Weight</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {kpiScore.toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground">Avg Score</p>
            </div>
          </div>

          {/* Weight Validation */}
          <div className="flex items-center gap-2 text-xs">
            {isWeightValid ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-500 dark:text-green-400" />
                <span className="text-green-600 dark:text-green-400">Weight validation passed</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span className="text-amber-600 dark:text-amber-400">Weight: {Math.round(totalWeight * 100)}% (Target: 100%)</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPI Categories */}
      <div className="flex flex-wrap gap-2">
        {categories.map(cat => (
          <Badge 
            key={cat}
            style={{ 
              backgroundColor: getCategoryColor(cat), 
              color: 'white' 
            }}
            className="text-xs"
          >
            {cat}
          </Badge>
        ))}
      </div>

      {/* Key KPIs Preview */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">Key Objectives</h4>
        {teamLeader.kpis.slice(0, 3).map((kpi, idx) => (
          <div key={kpi.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate" title={kpi.objective}>
                {idx + 1}. {kpi.objective.substring(0, 60)}...
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground">
                {(kpi.weight * 100).toFixed(0)}%
              </span>
              {kpi.evaluation !== null && (
                <Progress 
                  value={(kpi.evaluation / kpi.target) * 100} 
                  className="w-16 h-1.5"
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Link to full KPI Dashboard */}
      <div className="pt-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={() => window.open('/kpi', '_blank')}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          View Full KPI Dashboard
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Team Member Display
// ============================================================================
function TeamSection({ team }: { team: Project["team"] }) {
  const totalMembers = team.reduce((sum, t) => sum + t.count, 0);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
          <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          Team Composition
        </h3>
        <Badge variant="secondary">{totalMembers} members</Badge>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {team.map((member, idx) => (
          <Card key={idx} className="p-4 border bg-card">
            <p className="text-sm font-medium text-foreground">{member.role}</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{member.count}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// QMS Records Section — dynamically linked via fileReviews.project metadata
// ============================================================================
function QMSRecordsSection({ 
  projectName, 
  allRecords,
  agents 
}: { 
  projectName: string;
  allRecords: any[];
  agents?: string[];
}) {
  const navigate = useNavigate();
  
  const linked = useMemo(() => getRecordsForProject(projectName, allRecords), [projectName, allRecords]);

  if (linked.length === 0 && (!agents || agents.length === 0)) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
          <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          QMS Records
        </h3>
        <Card className="p-6">
          <p className="text-center text-sm text-muted-foreground">
            No linked QMS records or agents found for this project.
          </p>
        </Card>
      </div>
    );
  }

  // Group linked entries by record category for organized display
  const groupedByCategory = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const entry of linked) {
      const cat = entry.record.category || "Uncategorized";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(entry);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [linked]);

  const totalFiles = linked.reduce((sum: number, e: any) => sum + e.files.length, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
          <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          QMS Records
        </h3>
        <Badge variant="outline" className="font-mono text-xs">
          {totalFiles} file{totalFiles !== 1 ? "s" : ""} &middot; {linked.length} form{linked.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="space-y-6">
        {groupedByCategory.map(([category, entries]) => (
          <div key={category}>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70 mb-3 flex items-center gap-2">
              <FolderOpen className="w-3 h-3" />
              {category}
              <Badge variant="outline" className="text-[9px] font-mono">{entries.length} form{entries.length !== 1 ? "s" : ""}</Badge>
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {entries.map((entry) => (
                <div key={entry.record.code} className="group">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                      {entry.record.code}
                    </span>
                    <p className="text-sm font-medium text-foreground truncate">{entry.record.recordName}</p>
                  </div>
                  <div className="pl-5 space-y-1">
                    {entry.files.map((file: any, fid: number) => (
                      <button
                        key={fid}
                        onClick={() => navigate(`/record/${file.id}`)}
                        className="flex items-center gap-2 w-full text-left text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded px-2 py-1.5 transition-colors"
                      >
                        <FileText className="w-3 h-3 shrink-0" />
                        <span className="truncate">{file.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Edit Form (Inline)
// ============================================================================
interface EditFormProps {
  project: Project;
  onSave: (updated: Project) => void;
  onCancel: () => void;
}

function EditForm({ project, onSave, onCancel }: EditFormProps) {
  const [form, setForm] = useState({ ...project });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Project Name</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-lg border bg-background text-foreground border-border focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Type</label>
          <input
            type="text"
            name="type"
            value={form.type}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-lg border bg-background text-foreground border-border focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Client</label>
          <input
            type="text"
            name="client"
            value={form.client}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-lg border bg-background text-foreground border-border focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Status</label>
          <select
            name="status"
            value={form.status}
            onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value as Project["status"] }))}
            className="w-full px-3 py-2 rounded-lg border bg-background text-foreground border-border focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Start Date</label>
          <input
            type="date"
            name="startDate"
            value={form.startDate}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-lg border bg-background text-foreground border-border focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">End Date</label>
          <input
            type="date"
            name="endDate"
            value={form.endDate}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-lg border bg-background text-foreground border-border focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Description</label>
        <textarea
          name="description"
          rows={3}
          value={form.description}
          onChange={handleChange}
          className="w-full px-3 py-2 rounded-lg border bg-background text-foreground border-border focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </form>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================
export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { projects, updateProject, deleteProject } = useProjects();
  const { records: allRecords } = useQMSData();
  
  const project = useMemo(() => projects.find(p => p.id === id), [projects, id]);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  if (!project) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto py-12 px-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Project Not Found</h1>
            <p className="text-muted-foreground mb-6">The project you're looking for doesn't exist.</p>
            <Button onClick={() => navigate('/projects')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Projects
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  const statusColors = {
    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    completed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
  };

  const statusIcons = {
    active: CheckCircle2,
    completed: CheckCircle2,
    pending: Clock
  };

  const StatusIcon = statusIcons[project.status];

  const handleDelete = () => {
    deleteProject(project.id);
    navigate('/projects');
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </div>

        {/* Project Header Card */}
        {!isEditing && (
          <Card className="mb-6">
            <div className="p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
                    <Badge className={cn("capitalize", statusColors[project.status])}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {project.status}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">{project.description}</p>
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-4 h-4" />
                      {project.client}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {project.startDate} &rarr; {project.endDate || 'Ongoing'}
                    </span>
                    <Badge variant="outline">{project.type}</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Edit Mode */}
        {isEditing && (
          <Card className="mb-6">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Edit Project</h2>
              <EditForm 
                project={project} 
                onSave={(updated) => {
                  updateProject(project.id, updated);
                  setIsEditing(false);
                }}
                onCancel={() => setIsEditing(false)}
              />
            </div>
          </Card>
        )}

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Team Section */}
          <Card className="p-6">
            <TeamSection team={project.team} />
          </Card>

          {/* KPI Section */}
          <Card className="p-6">
            <KPISection projectName={project.name} />
          </Card>

          {/* QMS Records Section - Full Width */}
          <Card className="p-6 lg:col-span-2">
            <QMSRecordsSection 
              projectName={project.name}
              allRecords={allRecords || []}
              agents={project.agents}
            />
          </Card>
        </div>

        {/* Delete Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Project</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{project.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-3">
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
