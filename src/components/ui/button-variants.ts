import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-bold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover-lift",
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
        default: "h-10 px-5 py-2 text-sm",
        sm: "h-9 rounded-full px-3 text-xs",
        lg: "h-14 rounded-full px-8 text-base",
        xl: "h-16 rounded-full px-10 text-lg",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
