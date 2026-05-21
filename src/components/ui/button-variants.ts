import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-bold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover-lift",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary hover:shadow-lg glow-primary",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-destructive hover:shadow-lg",
        outline: "border-2 border-primary/30 bg-transparent hover:bg-primary/10 hover:border-primary text-primary",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground hover:rounded-sm",
        link: "text-primary underline-offset-4 hover:underline",
        success: "bg-success text-success-foreground hover:bg-success/90 shadow-success hover:shadow-lg",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90 shadow-warning hover:shadow-lg",
      },
      size: {
        default: "h-12 px-6 py-3 text-sm",
        sm: "h-10 rounded-sm px-4 text-xs",
        lg: "h-14 rounded-sm px-8 text-base",
        xl: "h-16 rounded-sm px-10 text-lg",
        icon: "h-12 w-12 rounded-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
