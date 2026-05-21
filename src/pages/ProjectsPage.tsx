import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Briefcase, 
  Plus, 
  Search, 
  Users, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  LayoutGrid,
  Filter,
  ChevronDown,
  ChevronUp,
  Edit,
  Trash2,
  ExternalLink,
  MoreVertical,
  Video,
  Mic,
  Trophy,
  MapPin,
  BrainCircuit,
  Zap,
  Cpu,
  Film
} from "lucide-react";
import { 
  useProjects, 
  type Project 
} from "@/data/projectsData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AppShell } from "@/components/layout/AppShell";
import { cn } from "@/lib/utils";

// ============================================================================
// Project Theme — unique color & icon per project
// ============================================================================
const PROJECT_THEMES: Record<string, { icon: any; accent: string; bg: string; border: string; badge: string; gradient: string }> = {
  "VDP-001": { 
    icon: Video, 
    accent: "text-violet-600 dark:text-violet-400", 
    bg: "bg-violet-100 dark:bg-violet-900/40",
    border: "border-violet-400/30 dark:border-violet-600/30",
    badge: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400",
    gradient: "from-violet-500 to-purple-600"
  },
  "VAI-002": { 
    icon: Mic, 
    accent: "text-rose-600 dark:text-rose-400", 
    bg: "bg-rose-100 dark:bg-rose-900/40",
    border: "border-rose-400/30 dark:border-rose-600/30",
    badge: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400",
    gradient: "from-rose-500 to-pink-600"
  },
  "TSA-003": { 
    icon: Trophy, 
    accent: "text-amber-600 dark:text-amber-400", 
    bg: "bg-amber-100 dark:bg-amber-900/40",
    border: "border-amber-400/30 dark:border-amber-600/30",
    badge: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    gradient: "from-amber-500 to-orange-600"
  },
  "OMN-004": { 
    icon: MapPin, 
    accent: "text-teal-600 dark:text-teal-400", 
    bg: "bg-teal-100 dark:bg-teal-900/40",
    border: "border-teal-400/30 dark:border-teal-600/30",
    badge: "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400",
    gradient: "from-teal-500 to-cyan-600"
  },
  "ETH-005": { 
    icon: BrainCircuit, 
    accent: "text-indigo-600 dark:text-indigo-400", 
    bg: "bg-indigo-100 dark:bg-indigo-900/40",
    border: "border-indigo-400/30 dark:border-indigo-600/30",
    badge: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400",
    gradient: "from-indigo-500 to-blue-600"
  },
  "BTF-006": { 
    icon: Zap, 
    accent: "text-emerald-600 dark:text-emerald-400", 
    bg: "bg-emerald-100 dark:bg-emerald-900/40",
    border: "border-emerald-400/30 dark:border-emerald-600/30",
    badge: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
    gradient: "from-emerald-500 to-green-600"
  },
  "ETH2-007": { 
    icon: Cpu, 
    accent: "text-sky-600 dark:text-sky-400", 
    bg: "bg-sky-100 dark:bg-sky-900/40",
    border: "border-sky-400/30 dark:border-sky-600/30",
    badge: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400",
    gradient: "from-sky-500 to-blue-600"
  },
  "ETC-008": { 
    icon: Film, 
    accent: "text-fuchsia-600 dark:text-fuchsia-400", 
    bg: "bg-fuchsia-100 dark:bg-fuchsia-900/40",
    border: "border-fuchsia-400/30 dark:border-fuchsia-600/30",
    badge: "bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-400",
    gradient: "from-fuchsia-500 to-pink-600"
  },
  "FAT-009": { 
    icon: Film, 
    accent: "text-orange-600 dark:text-orange-400", 
    bg: "bg-orange-100 dark:bg-orange-900/40",
    border: "border-orange-400/30 dark:border-orange-600/30",
    badge: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
    gradient: "from-orange-500 to-red-600"
  },
};

const DEFAULT_THEME = { 
  icon: Briefcase, 
  accent: "text-gray-600 dark:text-gray-400", 
  bg: "bg-gray-100 dark:bg-gray-800",
  border: "border-gray-300 dark:border-gray-600",
  badge: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400",
  gradient: "from-gray-500 to-gray-600"
};

// ============================================================================
// Project Card Component
// ============================================================================
interface ProjectCardProps {
  project: Project;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ProjectCard({ project, onView, onEdit, onDelete }: ProjectCardProps) {
  const isActive = project.status === "active";
  const isCompleted = project.status === "completed";

  const theme = PROJECT_THEMES[project.id] || DEFAULT_THEME;
  const ProjectIcon = theme.icon;

  const statusConfig = {
    active: { 
      label: "Active", 
      color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
      icon: CheckCircle2,
      iconColor: "text-emerald-500"
    },
    completed: { 
      label: "Completed", 
      color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
      icon: CheckCircle2,
      iconColor: "text-blue-500"
    },
    pending: { 
      label: "Pending", 
      color: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
      icon: Clock,
      iconColor: "text-amber-500"
    },
  };

  const status = statusConfig[project.status];
  const StatusIcon = status.icon;

  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
      "border bg-card",
      theme.border
    )}>
      {/* Accent bar */}
      <div className={cn("h-1.5 w-full bg-gradient-to-r", theme.gradient)} />
      
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center shadow-sm",
            theme.bg, theme.accent
          )}>
            <ProjectIcon className="w-5 h-5" />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onView}>
                <ExternalLink className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-red-600 dark:text-red-400">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Title */}
        <h3 className={cn("mt-3 text-lg font-semibold text-foreground transition-colors", theme.accent)}>
          {project.name}
        </h3>
        <div className="flex items-center gap-1.5 mt-1">
          <Badge variant="secondary" className={cn("text-[10px] font-mono tracking-wider px-1.5 py-0 h-5", theme.badge)}>
            {project.id}
          </Badge>
          <span className="text-xs text-muted-foreground">·</span>
          <p className="text-sm text-muted-foreground">{project.type}</p>
        </div>

        {/* Status Badge */}
        <div className="mt-3">
          <span className={cn(
            "inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border",
            status.color
          )}>
            <StatusIcon className={cn("w-3 h-3", status.iconColor)} />
            {status.label}
          </span>
        </div>

        {/* Info */}
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground/50" />
            <span>{project.teamSize} team members</span>
          </div>
          {project.startDate && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground/50" />
              <span>
                {new Date(project.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} - 
                {project.endDate ? new Date(project.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : "Present"}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground/60 font-medium">Client:</span>
            <span>{project.client}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex gap-2">
          <Button 
            onClick={onView}
            className={cn("flex-1 text-white bg-gradient-to-r", theme.gradient, "hover:opacity-90")}
            size="sm"
          >
            View Details
          </Button>
          <Button 
            onClick={onEdit}
            variant="outline"
            size="sm"
          >
            Edit
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// Stats Component
// ============================================================================
function StatsCards({ stats }: { stats: ReturnType<typeof useProjects>["stats"] }) {
  const cards = [
    { label: "Total Projects", value: stats.total, color: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400" },
    { label: "Active", value: stats.active, color: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400" },
    { label: "Completed", value: stats.completed, color: "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400" },
    { label: "Team Members", value: stats.totalTeam, color: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label} className={cn("p-4 border-0", card.color)}>
          <p className="text-2xl font-bold">{card.value}</p>
          <p className="text-xs font-medium opacity-80">{card.label}</p>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// Delete Dialog
// ============================================================================
function DeleteDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  projectName 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void;
  projectName: string;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-red-600 dark:text-red-400">Delete Project?</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{projectName}</strong>? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Delete Project</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================
export default function ProjectsPage() {
  const navigate = useNavigate();
  const { projects, delete: deleteProject, stats, clients } = useProjects();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed" | "pending">("all");
  const [clientFilter, setClientFilter] = useState<"all" | string>("all");
  const [showFilters, setShowFilters] = useState(false);
  
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; project: Project | null }>({ 
    isOpen: false, 
    project: null 
  });

  // Filter projects
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch = 
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.code.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || project.status === statusFilter;
      const matchesClient = clientFilter === "all" || project.client === clientFilter;
      
      return matchesSearch && matchesStatus && matchesClient;
    });
  }, [projects, searchQuery, statusFilter, clientFilter]);

  const handleView = (id: string) => {
    navigate(`/projects/${id}`);
  };

  const handleEdit = (id: string) => {
    navigate(`/projects/${id}/edit`);
  };

  const handleDelete = (project: Project) => {
    setDeleteDialog({ isOpen: true, project });
  };

  const confirmDelete = () => {
    if (deleteDialog.project) {
      deleteProject(deleteDialog.project.id);
      setDeleteDialog({ isOpen: false, project: null });
    }
  };

  const handleAddNew = () => {
    navigate("/projects/new");
  };

  return (
    <AppShell breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "Projects" }]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50">
              <Briefcase className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Projects</h1>
              <p className="text-xs text-muted-foreground">Manage all Vezloo projects with QMS compliance</p>
            </div>
          </div>
          <Button 
            onClick={handleAddNew}
            className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white gap-2"
          >
            <Plus className="w-4 h-4" />
            Add New Project
          </Button>
        </div>

        {/* Stats */}
        <StatsCards stats={stats} />

        {/* Filters */}
        <Card className="p-4 bg-card border">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="w-4 h-4" />
                Filters
                {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>

            {showFilters && (
              <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-border">
                <Select value={statusFilter} onValueChange={(v: typeof statusFilter) => setStatusFilter(v)}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Filter by client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client} value={client}>{client}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </Card>

        {/* Projects Grid */}
        {filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onView={() => handleView(project.id)}
                onEdit={() => handleEdit(project.id)}
                onDelete={() => handleDelete(project)}
              />
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center bg-card border">
            <Briefcase className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No projects found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filter criteria.</p>
          </Card>
        )}

        {/* Footer */}
        <Card className="p-4 bg-muted/30 border">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>
              Showing <span className="font-bold text-foreground">{filteredProjects.length}</span> of {" "}
              <span className="font-bold text-foreground">{projects.length}</span> projects
            </p>
            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Active
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Completed
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Pending
              </span>
            </div>
          </div>
        </Card>

        {/* Delete Dialog */}
        <DeleteDialog
          isOpen={deleteDialog.isOpen}
          onClose={() => setDeleteDialog({ isOpen: false, project: null })}
          onConfirm={confirmDelete}
          projectName={deleteDialog.project?.name || ""}
        />
      </div>
    </AppShell>
  );
}
