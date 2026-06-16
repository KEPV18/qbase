import { useMemo } from "react";
import type { Risk } from "@/lib/riskRegisterService";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RiskHeatMapProps {
  risks: Risk[];
}

const LIKELIHOOD_LABELS = ["Rare", "Unlikely", "Possible", "Likely", "Almost Certain"];
const IMPACT_LABELS = ["Negligible", "Minor", "Moderate", "Major", "Catastrophic"];

function getCellColor(score: number): string {
  if (score <= 3) return "bg-success/20 border-success/30 text-success";
  if (score <= 6) return "bg-warning/20 border-warning/30 text-warning";
  if (score <= 12) return "bg-orange-500/20 border-orange-500/30 text-orange-600";
  return "bg-destructive/20 border-destructive/30 text-destructive";
}

function getCellBg(score: number): string {
  if (score <= 3) return "bg-success/10";
  if (score <= 6) return "bg-warning/10";
  if (score <= 12) return "bg-orange-500/10";
  return "bg-destructive/10";
}

export function RiskHeatMap({ risks }: RiskHeatMapProps) {
  const grid = useMemo(() => {
    // Build 5x5 grid, map risks to cells
    const cells: Record<string, Risk[]> = {};
    for (let l = 1; l <= 5; l++) {
      for (let i = 1; i <= 5; i++) {
        cells[`${l}-${i}`] = [];
      }
    }
    risks.forEach(r => {
      const key = `${r.likelihood}-${r.impact}`;
      if (cells[key]) cells[key].push(r);
    });
    return cells;
  }, [risks]);

  return (
    <div className="bg-card rounded-sm border border-border p-5">
      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
        Risk Heat Map
      </h3>
      <div className="flex gap-2">
        {/* Y-axis label */}
        <div className="flex flex-col justify-between items-end pr-1 py-1">
          <span className="text-[8px] text-muted-foreground font-bold -rotate-0 writing-mode-vertical" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
            LIKELIHOOD →
          </span>
        </div>

        <div className="flex-1">
          {/* Grid */}
          <TooltipProvider delayDuration={200}>
            <div className="grid grid-cols-5 gap-1">
              {/* Render from top (L=5) to bottom (L=1) */}
              {[5, 4, 3, 2, 1].map(l =>
                [1, 2, 3, 4, 5].map(i => {
                  const key = `${l}-${i}`;
                  const cellRisks = grid[key];
                  const score = l * i;
                  return (
                    <Tooltip key={key}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "aspect-square rounded-sm border flex flex-col items-center justify-center relative transition-all hover:scale-105 cursor-default min-h-[40px]",
                            getCellBg(score),
                            cellRisks.length > 0 ? getCellColor(score) : "bg-muted/20 border-border/30 text-muted-foreground/40"
                          )}
                        >
                          <span className="text-[10px] font-bold">{score}</span>
                          {cellRisks.length > 0 && (
                            <span className="text-[8px] font-black">{cellRisks.length}</span>
                          )}
                        </div>
                      </TooltipTrigger>
                      {cellRisks.length > 0 && (
                        <TooltipContent side="top" className="max-w-[220px]">
                          <p className="text-[10px] font-bold mb-1">L={l} × I={i} = {score}</p>
                          {cellRisks.map(r => (
                            <p key={r.riskId} className="text-[10px] text-muted-foreground truncate">
                              {r.riskId}: {r.riskDescription}
                            </p>
                          ))}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                })
              )}
            </div>
          </TooltipProvider>

          {/* X-axis labels */}
          <div className="grid grid-cols-5 gap-1 mt-1">
            {IMPACT_LABELS.map((label, i) => (
              <div key={i} className="text-center text-[7px] font-bold text-muted-foreground/60 uppercase truncate">
                {label}
              </div>
            ))}
          </div>
          <p className="text-center text-[8px] text-muted-foreground font-bold mt-1">IMPACT →</p>
        </div>

        {/* Y-axis labels */}
        <div className="flex flex-col-reverse justify-between py-1 pl-1">
          {LIKELIHOOD_LABELS.map((label, i) => (
            <div key={i} className="text-[7px] font-bold text-muted-foreground/60 uppercase leading-tight" style={{ height: "20%" }}>
              {(i + 1)}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/50">
        {[
          { label: "Low (1-3)", color: "bg-success/30" },
          { label: "Medium (4-6)", color: "bg-warning/30" },
          { label: "High (7-12)", color: "bg-orange-500/30" },
          { label: "Critical (13-25)", color: "bg-destructive/30" },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={cn("w-3 h-3 rounded", l.color)} />
            <span className="text-[9px] text-muted-foreground font-medium">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
