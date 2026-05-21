import React, { useMemo, useState } from "react";
import {
  buildTraceChain,
  type TraceChain,
  type TraceNode,
  type RelationshipType,
  exportTracePackage,
  getClauseCoverage,
  VALID_FORMS,
  type ISOClause,
  type TraceableRecord,
  type RelatedRecord,
} from "@/lib/traceability";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Link as LinkIcon,
  Shield,
  X,
  Activity,
  AlertCircle,
  GitBranch,
  Layers,
  FileCheck,
  Eye,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ============================================================================
// A. CONFIGURATION
// ============================================================================

/** Color coding for relationship types */
const RELATIONSHIP_COLORS: Record<RelationshipType, string> = {
  TRIGGERS: "bg-blue-500",
  RESOLVES: "bg-green-500",
  IMPACTS: "bg-amber-500",
  REFERENCES: "bg-gray-500",
  UPDATES_PROCEDURE: "bg-purple-500",
  TRIGGERS_REVIEW: "bg-indigo-500",
  REQUIRES_TRAINING: "bg-cyan-500",
  IDENTIFIES_RISK: "bg-red-500",
  MATERIALIZES_RISK: "bg-rose-500",
};

/** Display labels for relationships */
const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  TRIGGERS: "Triggers",
  RESOLVES: "Resolves",
  IMPACTS: "Impacts",
  REFERENCES: "References",
  UPDATES_PROCEDURE: "Updates Procedure",
  TRIGGERS_REVIEW: "Triggers Review",
  REQUIRES_TRAINING: "Requires Training",
  IDENTIFIES_RISK: "Identifies Risk",
  MATERIALIZES_RISK: "Materializes Risk",
};

/** ISO Clause descriptions for tooltips */
const CLAUSE_DESCRIPTIONS: Record<ISOClause, string> = {
  "4.1": "Understanding organization and context",
  "4.2": "Understanding needs of interested parties",
  "4.3": "Determining scope of QMS",
  "4.4": "QMS and its processes",
  "5.1": "Leadership and commitment",
  "5.2": "Policy",
  "5.3": "Organizational roles, responsibilities",
  "6.1": "Actions to address risks and opportunities",
  "6.2": "Quality objectives",
  "6.3": "Planning of changes",
  "7.1": "Resources",
  "7.2": "Competence",
  "7.3": "Awareness",
  "7.4": "Communication",
  "7.5": "Documented information",
  "8.1": "Operational planning",
  "8.2": "Requirements for products/services",
  "8.3": "Design and development",
  "8.4": "Control of externally provided processes",
  "8.5": "Production and service provision",
  "8.6": "Release of products/services",
  "8.7": "Control of nonconforming outputs",
  "9.1": "Monitoring, measurement, analysis",
  "9.2": "Internal audit",
  "9.3": "Management review",
  "10.1": "General improvement",
  "10.2": "Nonconformity and corrective action",
  "10.3": "Continual improvement",
};

/** Icon mapping for form types */
const FORM_ICONS: Record<string, React.ElementType> = {
  "F/09": AlertTriangle,
  "F/10": FileText,
  "F/11": Clock,
  "F/19": FileCheck,
  "F/21": Shield,
  "F/22": Activity,
  "F/28": Layers,
  "F/30": FileCheck,
  "F/43": GitBranch,
  "F/44": GitBranch,
  "F/45": FileText,
  Risk: AlertCircle,
  Project: FileText,
};

// ============================================================================
// B. SUB-COMPONENTS
// ============================================================================

/** Status Badge for record status */
function StatusBadge({ status }: { status: string }) {
  const configs = {
    OPEN: { color: "bg-amber-100 text-amber-800", icon: Clock },
    IN_PROGRESS: { color: "bg-blue-100 text-blue-800", icon: Activity },
    CLOSED: { color: "bg-green-100 text-green-800", icon: CheckCircle2 },
    CANCELLED: { color: "bg-gray-100 text-gray-800", icon: X },
  } as const;

  const config = configs[status as keyof typeof configs] || configs.CANCELLED;
  const Icon = config.icon;

  return (
    <Badge className={cn("font-medium", config.color)}>
      <Icon className="w-3 h-3 mr-1" />
      {status}
    </Badge>
  );
}

/** Relationship Badge with color and tooltip */
function RelationshipBadge({
  relationship,
  isoClause,
}: {
  relationship: RelationshipType;
  isoClause: ISOClause;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            className={cn(
              "text-white font-medium text-xs",
              RELATIONSHIP_COLORS[relationship]
            )}
          >
            {RELATIONSHIP_LABELS[relationship]}
            <span className="ml-1 opacity-75">[{isoClause}]</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="font-medium">ISO 9001:2015 Clause {isoClause}</p>
          <p className="text-xs text-slate-300 mt-1">
            {CLAUSE_DESCRIPTIONS[isoClause]}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Record Card for Timeline */
function TraceRecordCard({
  node,
  isRoot,
  depth,
  onOpenRecord,
  brokenLinks,
}: {
  node: TraceNode;
  isRoot: boolean;
  depth: number;
  onOpenRecord: (id: string) => void;
  brokenLinks: string[];
}) {
  const [expanded, setExpanded] = useState(true);
  const Icon = FORM_ICONS[node.record.form] || FileText;
  
  const hasBrokenLinks = node.record.relatedRecords.some(
    (r) => brokenLinks.includes(`${r.form}-${r.number}`)
  );

  return (
    <Card
      className={cn(
        "relative transition-all",
        isRoot && "border-2 border-indigo-500",
        hasBrokenLinks && "border-amber-400"
      )}
      style={{ marginLeft: depth * 24 }}
    >
      {/* Depth indicator line */}
      {depth > 0 && (
        <div
          className="absolute -left-6 top-1/2 w-6 h-0.5 bg-slate-300"
          aria-hidden="true"
        />
      )}

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "p-2 rounded-lg",
                isRoot ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-600"
              )}
            >
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-slate-500">
                  {node.record.form}-{node.record.number}
                </span>
                {isRoot && (
                  <Badge variant="secondary" className="text-xs">
                    Starting Point
                  </Badge>
                )}
              </div>
              <h4 className="font-semibold mt-0.5">{node.record.title}</h4>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={node.record.status} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          {/* Date and metadata */}
          <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
            <span>{node.record.date}</span>
            <span>•</span>
            <span>{node.record.isoClauses?.join(", ") || "N/A"}</span>
          </div>

          {/* Related Records */}
          {node.record.relatedRecords.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500 uppercase">
                Related Records
              </p>
              <div className="flex flex-wrap gap-2">
                {node.record.relatedRecords.map((related, idx) => {
                  const targetId = `${related.form}-${related.number}`;
                  const isBroken = brokenLinks.includes(targetId);

                  return (
                    <TooltipProvider key={idx}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenRecord(targetId)}
                            className={cn(
                              "text-xs h-auto py-1",
                              isBroken && "border-amber-400 bg-amber-50"
                            )}
                          >
                            <div className="flex items-center gap-1">
                              {isBroken && (
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                              )}
                              <span>{targetId}</span>
                              <ArrowRight className="w-3 h-3 mx-1" />
                              <RelationshipBadge
                                relationship={related.relationship}
                                isoClause={related.isoClause}
                              />
                            </div>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {isBroken ? (
                            <p className="text-amber-600">⚠️ Broken link: Target not found</p>
                          ) : (
                            <p>Click to open {targetId}</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            </div>
          )}

          {/* Open Record Button */}
          <div className="mt-4 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenRecord(node.record.id)}
            >
              <Eye className="w-4 h-4 mr-2" />
              View Record
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

/** Summary Statistics Panel */
function TraceStats({ chain }: { chain: TraceChain }) {
  const coverage = useMemo(() => getClauseCoverage(chain), [chain]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-slate-500">Total Records</p>
          <p className="text-2xl font-bold">{chain.stats.totalRecords}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-slate-500">Trace Depth</p>
          <p className="text-2xl font-bold">{chain.stats.maxDepth}</p>
          <p className="text-xs text-slate-400">levels</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-slate-500">ISO Clauses</p>
          <p className="text-2xl font-bold">{coverage.clauses.length}</p>
          <p className="text-xs text-slate-400">
            {coverage.gaps.length > 0 && `${coverage.gaps.length} gaps`}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-slate-500">Broken Links</p>
          <p
            className={cn(
              "text-2xl font-bold",
              chain.gaps.length > 0 ? "text-amber-600" : "text-green-600"
            )}
          >
            {chain.gaps.length}
          </p>
        </CardContent>
      </Card>

      {/* Clause coverage bar */}
      <Card className="col-span-2 md:col-span-4">
        <CardContent className="pt-6">
          <p className="text-sm font-medium mb-2">ISO 9001:2015 Clause Coverage</p>
          <div className="flex flex-wrap gap-2">
            {coverage.clauses.map((clause) => (
              <TooltipProvider key={clause}>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="secondary" className="cursor-help">
                      {clause}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    {CLAUSE_DESCRIPTIONS[clause as ISOClause]}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
          {coverage.gaps.length > 0 && (
            <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-sm">
              <AlertTriangle className="w-4 h-4 inline mr-1 text-amber-600" />
              <span className="text-amber-800">
                Expected clauses not found: {coverage.gaps.join(", ")}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** Export Panel */
function TraceExportPanel({ chain }: { chain: TraceChain }) {
  const [format, setFormat] = useState<"JSON" | "MARKDOWN" | "CSV">("JSON");

  const handleExport = () => {
    const content = exportTracePackage(chain, format);
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Trace_${chain.rootId}_${format.toLowerCase()}.${
      format === "JSON" ? "json" : format === "CSV" ? "csv" : "md"
    }`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Card className="print:hidden">
      <CardHeader>
        <CardTitle className="text-sm">Export Trace Package</CardTitle>
        <CardDescription>For audit documentation</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          {(["JSON", "MARKDOWN", "CSV"] as const).map((f) => (
            <Button
              key={f}
              variant={format === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFormat(f)}
            >
              {f}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export {format}
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// C. MAIN COMPONENT
// ============================================================================

interface TraceViewProps {
  rootRecord: TraceableRecord;
  registry: Map<string, TraceableRecord>;
  onOpenRecord: (id: string) => void;
  className?: string;
}

/**
 * Main Traceability View Component
 * Displays complete trace chain from a starting record
 * ISO 9001:2015 Audit-Ready Format
 */
export function TraceView({
  rootRecord,
  registry,
  onOpenRecord,
  className,
}: TraceViewProps) {
  const chain = useMemo(
    () => buildTraceChain(rootRecord, registry),
    [rootRecord, registry]
  );

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Traceability Chain</h2>
          <p className="text-slate-500">
            Starting from{" "}
            <span className="font-mono font-medium text-slate-700">
              {rootRecord.form}-{rootRecord.number}
            </span>{" "}
            {rootRecord.title}
          </p>
        </div>

        <TraceExportPanel chain={chain} />
      </div>

      {/* Stats */}
      <TraceStats chain={chain} />

      {/* Timeline */}
      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Timeline View</TabsTrigger>
          <TabsTrigger value="matrix">Relationship Matrix</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          {chain.ordered.map((node, index) => (
            <TraceRecordCard
              key={node.record.id}
              node={node}
              isRoot={index === 0}
              depth={node.depth}
              onOpenRecord={onOpenRecord}
              brokenLinks={chain.gaps}
            />
          ))}
        </TabsContent>

        <TabsContent value="matrix">
          {/* Matrix view of all relationships */}
          <Card>
            <CardContent className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">From</th>
                      <th className="text-left py-2">Relationship</th>
                      <th className="text-left py-2">To</th>
                      <th className="text-left py-2">ISO Clause</th>
                      <th className="text-left py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chain.ordered.flatMap((node) =>
                      node.record.relatedRecords.map((rel, idx) => {
                        const targetId = `${rel.form}-${rel.number}`;
                        const isBroken = chain.gaps.includes(targetId);
                        return (
                          <tr
                            key={`${node.record.id}-${idx}`}
                            className="border-b last:border-0"
                          >
                            <td className="py-2 font-mono">{node.record.id}</td>
                            <td className="py-2">
                              <RelationshipBadge
                                relationship={rel.relationship}
                                isoClause={rel.isoClause}
                              />
                            </td>
                            <td className="py-2 font-mono">{targetId}</td>
                            <td className="py-2">{rel.isoClause}</td>
                            <td className="py-2">
                              {isBroken ? (
                                <Badge
                                  variant="outline"
                                  className="text-amber-600 border-amber-400"
                                >
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Broken
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-green-600 border-green-400"
                                >
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Valid
                                </Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Re-export for convenience
export { buildTraceChain, exportTracePackage, getClauseCoverage };
export type { TraceChain, TraceNode, TraceableRecord, RelatedRecord };
