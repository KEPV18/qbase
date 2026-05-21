import type { Config } from "tailwindcss"

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Outfit", "system-ui", "sans-serif"],
        heading: ["Outfit", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        error: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        /* ── Neon Palette ── */
        "neon-cyan": "hsl(var(--neon-cyan))",
        "neon-violet": "hsl(var(--neon-violet))",
        "neon-emerald": "hsl(var(--neon-emerald))",
        "neon-amber": "hsl(var(--neon-amber))",
        "neon-red": "hsl(var(--neon-red))",
        /* ── Module Palette ── */
        module: {
          sales: "hsl(var(--module-sales))",
          operations: "hsl(var(--module-operations))",
          quality: "hsl(var(--module-quality))",
          procurement: "hsl(var(--module-procurement))",
          hr: "hsl(var(--module-hr))",
          rnd: "hsl(var(--module-rnd))",
          management: "hsl(var(--module-management))",
        },
      },
      borderRadius: {
        lg: "4px",
        md: "2px",
        sm: "0px",
      },
      spacing: {
        "4xs": "2px",
        "3xs": "4px",
        "2xs": "8px",
        xs: "12px",
        sm: "16px",
        md: "20px",
        lg: "24px",
        xl: "32px",
        "2xl": "40px",
        "3xl": "48px",
        "4xl": "64px",
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
        "glow-sm": "0 0 8px hsl(186 100% 50% / 0.15)",
        "glow-md": "0 0 16px hsl(186 100% 50% / 0.2), 0 0 32px hsl(186 100% 50% / 0.08)",
        "glow-lg": "0 0 24px hsl(186 100% 50% / 0.3), 0 0 48px hsl(186 100% 50% / 0.12), 0 0 64px hsl(186 100% 50% / 0.06)",
      },
      fontSize: {
        xs: ["12px", { lineHeight: "16px", fontWeight: "400" }],
        sm: ["14px", { lineHeight: "20px", fontWeight: "400" }],
        base: ["14px", { lineHeight: "20px", fontWeight: "400" }],
        lg: ["16px", { lineHeight: "24px", fontWeight: "400" }],
        h2: ["20px", { lineHeight: "28px", fontWeight: "600" }],
        h1: ["24px", { lineHeight: "32px", fontWeight: "600" }],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "aurora-shift": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        "glow-breathe": {
          "0%, 100%": { boxShadow: "0 0 4px hsl(186 100% 50% / 0.1)" },
          "50%": { boxShadow: "0 0 16px hsl(186 100% 50% / 0.3), 0 0 32px hsl(186 100% 50% / 0.1)" },
        },
        "grid-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "aurora-shift": "aurora-shift 15s ease-in-out infinite alternate",
        "glow-breathe": "glow-breathe 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "grid-pulse": "grid-pulse 8s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config