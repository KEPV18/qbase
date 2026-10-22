import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-bold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover-lift ds-press",
  {
    variants: {
      variant: {
        // The hover step is a token, not an opacity fade. `bg-x/90`
        // LIGHTENS the fill while the text stays put, which put white
        // on #1980e6 at 3.98:1 — below AA. The `-hover` step moves the
        // fill away from the text instead (darker in light, brighter in
        // dark), so the pair stays above 4.5:1 in both modes.
        default: "bg-primary text-primary-foreground hover:bg-primary-hover shadow-primary hover:shadow-lg glow-primary",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive-hover shadow-destructive hover:shadow-lg",
        outline: "border-2 border-primary/30 bg-transparent hover:bg-primary/10 hover:border-primary text-primary-tint",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary-tint underline-offset-4 hover:underline",
        success: "bg-success text-success-foreground hover:bg-success-hover shadow-success hover:shadow-lg",
        warning: "bg-warning text-warning-foreground hover:bg-warning-hover shadow-warning hover:shadow-lg",
      },
      size: {
        // Touch targets are ≥44px on every tier.  The design system is
        // explicit that a control needs a 44px HIT AREA even when the
        // visual is smaller — the previous tiers were 40px (default),
        // 36px (sm) and 40px (icon), all under the minimum.
        //
        // `default` and `icon` simply grow to 44px.  The `sm` tier is
        // used in dense toolbars where a 44px box would break the row, so
        // it keeps its 36px visual height and reaches a 44px hit area
        // through a transparent ::after that extends 6px past the box on
        // each side (36 + 12 = 48px; a caller that overrides the height
        // down to 32px still lands on 44px).
        default: "h-11 px-5 text-sm",
        sm: "relative h-9 rounded-full px-3 text-xs after:absolute after:-inset-y-1.5 after:left-0 after:right-0 after:content-['']",
        lg: "h-14 rounded-full px-8 text-base",
        xl: "h-16 rounded-full px-10 text-lg",
        icon: "h-11 w-11 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
