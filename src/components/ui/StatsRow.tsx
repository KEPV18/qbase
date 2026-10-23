import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

import { PanelCell, PanelCells, UnifiedPanel } from "./UnifiedPanel";

interface StatItem {
  icon: LucideIcon;
  value: number | string;
  label: string;
  /**
   * The status the NUMBER reports, if any.
   *
   * There is deliberately no "info" variant: a count that reports no
   * state — "9 roles", "12 active CAPAs" — is a plain number and stays
   * greyscale.  Every caller that reached for `info` was painting a
   * neutral count blue, and the blue said nothing.  A number gets a
   * colour only when the colour IS the information.
   */
  variant?: "default" | "success" | "warning" | "destructive";
  onClick?: () => void;
}

interface StatsRowProps {
  stats: StatItem[];
  columns?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

/**
 * The semantic colour of the NUMBER, not of the whole cell.
 *
 * The old implementation tinted the icon, the value AND gave the icon a
 * coloured chip, so a row of six metrics read as a rainbow of chips —
 * the "colour as decoration" anti-pattern.  Now the number carries the
 * meaning (a red "3" says "three overdue", which the digit alone does
 * not) and everything else stays grayscale.
 *
 * Every pairing below is measured against the card surface in BOTH
 * modes:  light 6.66–16.83:1 · dark 6.03–15.63:1 — all clear AA.
 * The low end of each range is the tightest status tint
 * (success 6.66 light / destructive 6.03 dark); the high end is the
 * default foreground.
 */
const variantStyles: Record<NonNullable<StatItem["variant"]>, string> = {
  default: "text-foreground",
  success: "text-success-tint",
  warning: "text-warning-tint",
  destructive: "text-destructive-tint",
};

export function StatsRow({ stats, columns, className }: StatsRowProps) {
  const cols = columns || (stats.length <= 4 ? 4 : stats.length <= 5 ? 5 : 6);

  return (
    /* One panel of hairline-separated cells — not a pile of separate
       cards.  The geometry lives in `UnifiedPanel` now: the negative
       margins collapse the cell borders into a single grid of hairlines,
       and `overflow-hidden` on the panel trims the outer edge. */
    <UnifiedPanel className={className}>
      <PanelCells columns={cols}>
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          const variant = stat.variant || "default";
          const clickable = Boolean(stat.onClick);

          const body = (
            <>
              <Icon className="h-[18px] w-[18px] shrink-0 text-ink-3" aria-hidden="true" />
              <div className="min-w-0">
                <p className={cn("text-[22px] font-bold leading-none tracking-[-0.01em] tabular-nums", variantStyles[variant])}>
                  {stat.value}
                </p>
                <p className="mt-1 text-[12px] font-medium leading-[1.4] text-muted-foreground">{stat.label}</p>
              </div>
            </>
          );

          if (clickable) {
            return (
              <button
                key={i}
                type="button"
                onClick={stat.onClick}
                className="flex items-center gap-3 border-b border-r border-border px-5 py-4 text-left transition-colors hover:bg-foreground/[0.03]"
              >
                {body}
              </button>
            );
          }

          return (
            <PanelCell key={i} className="flex items-center gap-3">
              {body}
            </PanelCell>
          );
        })}
      </PanelCells>
    </UnifiedPanel>
  );
}

