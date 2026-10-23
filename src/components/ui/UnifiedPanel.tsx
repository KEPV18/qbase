import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * UnifiedPanel — ONE surface with hairline dividers.
 *
 * The design system's first rule is "unified surface > fragmented cards":
 * sibling items belong on ONE white panel separated by hairlines, not on a
 * pile of separately-bordered, separately-tinted cards.  The codebase
 * already had that pattern in two places — `StatsRow` (a grid of cells) and
 * `ui/table.tsx` (hairline rows) — and the pages kept hand-rolling their
 * own version of the opposite.  This file is that pattern, made shareable,
 * so a page cannot get it wrong by accident.
 *
 * Two shapes, because the geometry differs:
 *
 *   • `PanelRows`  — a vertical stack.  The divider is `divide-y`, so it
 *     is drawn by the parent and never doubles up.
 *   • `PanelCells` — a grid.  The cells carry `border-b border-r` and the
 *     grid carries `-mb-px -mr-px`, so the borders collapse into a single
 *     hairline mesh and the panel's `overflow-hidden` trims the outer edge.
 *     This is exactly what `StatsRow` does, lifted into a primitive.
 *
 * The SEMANTIC COLOUR goes on the number, never on the whole cell.  A row
 * of four tinted panels reads as a heat map; a row of four white cells
 * whose NUMBERS are tinted reads as four facts.  That rule, and its
 * measured contrast numbers, are documented on `StatsRow`.
 */

/* ── The panel ──────────────────────────────────────────────────────────── */

interface UnifiedPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** `panel` is the 22px tier — a large section. `card` is the 18px tier. */
  tier?: "panel" | "card";
}

export function UnifiedPanel({ tier = "panel", className, children, ...props }: UnifiedPanelProps) {
  return (
    <div
      className={cn(tier === "panel" ? "ds-panel" : "ds-card", "overflow-hidden", className)}
      {...props}
    >
      {children}
    </div>
  );
}

/* ── A header row, separated from the body by one hairline ─────────────── */

/* `title` is re-declared as a node, so the HTML `title?: string` attribute
   is dropped from the base — a panel's title is a heading, not a tooltip. */
interface PanelHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  /** Render the title as an `h2`.  Panels are sections, so they label themselves. */
  as?: "h2" | "h3" | "div";
}

export function PanelHeader({
  title,
  meta,
  actions,
  as: Tag = "h2",
  className,
  children,
  ...props
}: PanelHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b border-border px-5 py-3.5",
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 items-baseline gap-2.5">
        {title ? (
          <Tag className="truncate text-sm font-bold tracking-[-0.01em] text-foreground">{title}</Tag>
        ) : null}
        {meta ? <span className="shrink-0 text-[11px] text-muted-foreground">{meta}</span> : null}
        {children}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/* ── A vertical stack of rows ───────────────────────────────────────────── */

export function PanelRows({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("divide-y divide-border", className)} {...props}>
      {children}
    </div>
  );
}

/**
 * The attribute bag shared by the polymorphic panel elements.
 *
 * `type` is re-declared narrowly: `AllHTMLAttributes` types it as a free
 * `string`, which does not satisfy the `<button>` overload's
 * `"button" | "reset" | "submit"`.
 */
type PanelElementProps = Omit<React.AllHTMLAttributes<HTMLElement>, "type"> & {
  type?: "button" | "submit" | "reset";
};

/**
 * One row of a `PanelRows` stack.
 *
 * `as="button"` gives it the native keyboard/AT semantics of a control;
 * the row is still a full-width button with a hairline under it.
 */
interface PanelRowProps extends PanelElementProps {
  as?: "div" | "button" | "li" | "a";
}

export function PanelRow({ as: Tag = "div", className, children, ...props }: PanelRowProps) {
  return (
    <Tag
      className={cn(
        "flex w-full items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-foreground/[0.03]",
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

/* ── A grid of cells ────────────────────────────────────────────────────── */

interface PanelCellsProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: 2 | 3 | 4 | 5 | 6 | 7;
}

const cellColumns: Record<NonNullable<PanelCellsProps["columns"]>, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 md:grid-cols-3",
  4: "grid-cols-2 md:grid-cols-4",
  5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
  6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
  7: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7",
};

export function PanelCells({ columns = 4, className, children, ...props }: PanelCellsProps) {
  return (
    /* `-mb-px -mr-px` collapses the cells' borders into one hairline mesh;
       the panel's `overflow-hidden` trims the outer edge. */
    <div className={cn("grid -mb-px -mr-px", cellColumns[columns], className)} {...props}>
      {children}
    </div>
  );
}

/**
 * One cell of a `PanelCells` grid.
 *
 * `as="button"` makes the cell itself the control — the dashboard's
 * department row is seven cells that are each a filter button, and it
 * must not need a nested `<button>` inside a `<button>`.
 */
interface PanelCellProps extends PanelElementProps {
  as?: "div" | "button" | "li" | "a";
}

export function PanelCell({ as: Tag = "div", className, children, ...props }: PanelCellProps) {
  return (
    <Tag className={cn("border-b border-r border-border px-5 py-4", className)} {...props}>
      {children}
    </Tag>
  );
}

/**
 * A labelled figure inside a `PanelCell`.
 *
 * `tone` puts the semantic colour on the NUMBER only.  The label stays
 * grayscale and the small dot carries the identity, so a row of cells
 * reads as four facts rather than four heat-map tiles.  This is the rule
 * `StatsRow` already follows; see the contrast measurements on it.
 */
interface PanelFigureProps {
  label: React.ReactNode;
  value: React.ReactNode;
  tone?: "default" | "success" | "warning" | "destructive" | "info";
  /** Render the status dot beside the label.  Off for a plain figure. */
  dot?: boolean;
  /**
   * A leading glyph.  It is ALWAYS grayscale — a tinted icon is how a row
   * of metrics turns into a row of coloured chips, which is the pattern
   * `StatsRow` documents as the old, wrong implementation.
   */
  icon?: LucideIcon;
  className?: string;
}

const figureTones: Record<NonNullable<PanelFigureProps["tone"]>, string> = {
  default: "text-foreground",
  success: "text-success-tint",
  warning: "text-warning-tint",
  destructive: "text-destructive-tint",
  info: "text-info-tint",
};

const figureDots: Record<NonNullable<PanelFigureProps["tone"]>, string> = {
  default: "bg-ink-3",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  info: "bg-info",
};

export function PanelFigure({ label, value, tone = "default", dot = false, icon: Icon, className }: PanelFigureProps) {
  return (
    <div className={className}>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden="true" /> : null}
        {dot ? (
          <span className={cn("h-[6px] w-[6px] shrink-0 rounded-full", figureDots[tone])} aria-hidden="true" />
        ) : null}
        {label}
      </p>
      <p className={cn("mt-1 text-2xl font-bold leading-none tracking-[-0.02em]", figureTones[tone])}>
        {value}
      </p>
    </div>
  );
}
