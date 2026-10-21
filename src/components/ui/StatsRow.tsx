import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatItem {
  icon: LucideIcon;
  value: number | string;
  label: string;
  variant?: "default" | "success" | "warning" | "destructive" | "info";
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
 * modes:  light 6.66–7.42:1 · dark 7.20–8.32:1 — all clear AA.
 */
const variantStyles: Record<NonNullable<StatItem["variant"]>, string> = {
  default: "text-foreground",
  success: "text-success-tint",
  warning: "text-warning-tint",
  destructive: "text-destructive-tint",
  info: "text-info-tint",
};

const colStyles: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-2 md:grid-cols-4",
  5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
  6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
};

export function StatsRow({ stats, columns, className }: StatsRowProps) {
  const cols = columns || (stats.length <= 4 ? 4 : stats.length <= 5 ? 5 : 6);

  return (
    /* One panel of hairline-separated cells — not a pile of separate
       cards.  The negative margins collapse the cell borders into a
       single grid of hairlines, and `overflow-hidden` on the panel
       trims the outer edge. */
    <div className={cn("ds-panel overflow-hidden", className)}>
      <div className={cn("grid -mb-px -mr-px", colStyles[cols])}>
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

          return clickable ? (
            <button
              key={i}
              type="button"
              onClick={stat.onClick}
              className="flex items-center gap-3 border-b border-r border-border px-5 py-4 text-left transition-colors hover:bg-foreground/[0.03]"
            >
              {body}
            </button>
          ) : (
            <div
              key={i}
              className="flex items-center gap-3 border-b border-r border-border px-5 py-4"
            >
              {body}
            </div>
          );
        })}
      </div>
    </div>
  );
}
