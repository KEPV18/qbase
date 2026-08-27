import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Download, X } from "lucide-react";

interface AuditFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  categoryFilter: string;
  onCategoryChange: (value: string) => void;
  categories: string[];
  projectFilter: string;
  onProjectChange: (value: string) => void;
  projects: string[];
  yearFilter: string;
  onYearChange: (value: string) => void;
  years: string[];
  dateFilter: string;
  onDateChange: (value: string) => void;
  onExportCSV: () => void;
  totalFiltered: number;
  totalAll: number;
}

export function AuditFilters({
  search,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  categories,
  projectFilter,
  onProjectChange,
  projects,
  yearFilter,
  onYearChange,
  years,
  dateFilter,
  onDateChange,
  onExportCSV,
  totalFiltered,
  totalAll,
}: AuditFiltersProps) {
  const hasFilters = search || categoryFilter !== "all" || projectFilter !== "all" || yearFilter !== "all" || dateFilter !== "";

  return (
    <div className="bg-card rounded-sm border border-border p-4">
      <div className="flex flex-col gap-3">
        {/* Top Row: Search & Export */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by code, fileName, or recordName..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 h-9 text-xs bg-background border-border/50"
            />
            {search && (
              <button onClick={() => onSearchChange("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          
          <Button onClick={onExportCSV} variant="outline" size="sm" className="h-9 gap-1.5 shrink-0 hidden sm:flex">
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        </div>

        {/* Bottom Row: Filters Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:flex lg:flex-wrap items-center gap-2">
          {/* Category */}
          <Select value={categoryFilter} onValueChange={onCategoryChange}>
            <SelectTrigger className="w-full lg:w-[140px] h-9 text-xs bg-background border-border/50">
              <SelectValue placeholder="All Modules" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Project */}
          <Select value={projectFilter} onValueChange={onProjectChange}>
            <SelectTrigger className="w-full lg:w-[140px] h-9 text-xs bg-background border-border/50">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Year */}
          <Select value={yearFilter} onValueChange={onYearChange}>
            <SelectTrigger className="w-full lg:w-[120px] h-9 text-xs bg-background border-border/50">
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          
          {/* Date Filter */}
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full lg:w-[130px] h-9 text-xs bg-background border-border/50"
            title="Approval/Review Date"
          />

          <Button onClick={onExportCSV} variant="outline" size="sm" className="w-full h-9 gap-1.5 sm:hidden col-span-2">
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {hasFilters && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
          <span className="text-[10px] text-muted-foreground font-medium">
            Showing {totalFiltered} of {totalAll} items
          </span>
          <button
            onClick={() => { onSearchChange(""); onCategoryChange("all"); onProjectChange("all"); onYearChange("all"); onDateChange(""); }}
            className="text-[10px] text-primary font-semibold hover:underline ml-auto"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
