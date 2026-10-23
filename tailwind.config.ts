import tailwindcssAnimate from "tailwindcss-animate";
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
        // System stack (SF / PingFang) — never a webfont as the brand face.
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "SF Pro Display",
          "Helvetica Neue",
          "PingFang SC",
          "Hiragino Sans GB",
          "Microsoft YaHei",
          "sans-serif",
        ],
        // Display face — the same system stack. A separate webfont (Outfit,
        // Inter) used to fill this slot; the design system requires the
        // system stack, so display and sans differ only in tracking.
        display: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "Helvetica Neue",
          "PingFang SC",
          "Hiragino Sans GB",
          "Microsoft YaHei",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SF Mono", "Menlo", "Monaco", "Cascadia Mono", "monospace"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        // Semantic text ramp — the grayscale hierarchy.
        // Primary text = foreground; body = ink; summary = ink-2/3; placeholder = ink-4.
        // Every step that carries text clears WCAG AA (4.5:1) on the
        // ground it lands on; ink-4 is the placeholder step only.
        ink: {
          DEFAULT: "hsl(var(--text-body))",  // #424245 — long-form body
          2: "hsl(var(--text-2))",          // #5f5f63 — summary / meta
          3: "hsl(var(--text-3))",          // #69696d — tertiary / captions
          4: "hsl(var(--text-4))",          // #7d7d82 — placeholder
        },
        // Component greys
        track: "hsl(var(--track))",   // #e8e8ed — meter / toggle-off track
        faint: "hsl(var(--faint))",   // #d2d2d7 — index numbers, arrows
        heat: "hsl(var(--heat))",     // #ff6b00 — heat / "hottest"
        live: "hsl(var(--live))",     // #30d158 — live / online
        // Supporting accent — the gradient's second stop. Never a text or
        // fill colour on its own; it only terminates a gradient.
        support: "hsl(var(--accent-support))",
        // The document masthead gradient. These are DEEPER than the UI
        // accent so that the white text sitting on them — including the
        // 70–100% white labels in the header — clears AA at every stop.
        masthead: {
          from: "hsl(var(--masthead-from))",
          to: "hsl(var(--masthead-to))",
        },
        // Document ink — the grayscale ramp used inside QMS documents,
        // where the accent is withheld so the page reads as paper.
        doc: {
          DEFAULT: "hsl(var(--doc-ink))",   // #424245 — body
          2: "hsl(var(--doc-ink-2))",       // #6e6e73 — labels, meta
          3: "hsl(var(--doc-ink-3))",       // #86868b — tertiary
          4: "hsl(var(--doc-ink-4))",       // #aeaeb2 — placeholder
        },
        "doc-rule": "hsl(var(--doc-rule))",
        "doc-rule-soft": "hsl(var(--doc-rule-soft))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          // Filled surface (white text on it) — pinned across modes.
          solid: "hsl(var(--primary-solid))",
          // Text sitting on a tint of its own family.
          tint: "hsl(var(--primary-tint))",
          // The hover step of the base fill — darker in light mode,
          // brighter in dark, so the fill never lightens under its text.
          hover: "hsl(var(--primary-hover))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          // Filled surface (white text on it) — pinned across modes.
          solid: "hsl(var(--success-solid))",
          tint: "hsl(var(--success-tint))",
          hover: "hsl(var(--success-hover))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          solid: "hsl(var(--warning-solid))",
          tint: "hsl(var(--warning-tint))",
          hover: "hsl(var(--warning-hover))",
        },
        error: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
          // Text sitting on a wash of its own family.
          tint: "hsl(var(--info-tint))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
          solid: "hsl(var(--destructive-solid))",
          tint: "hsl(var(--destructive-tint))",
          hover: "hsl(var(--destructive-hover))",
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
      },
      // Easing — the design system's two curves, named.  `ease-spring` is
      // for interactive layers (sheet, dialog, drawer): fast start, long
      // settle.  `ease-out-quart` is for small moves (hover, segmented
      // slide).  The Tailwind defaults include `linear` and the default
      // `ease`, both of which the motion spec forbids.
      transitionTimingFunction: {
        spring: "cubic-bezier(0.32, 0.72, 0, 1)",
        "out-quart": "cubic-bezier(0.25, 1, 0.5, 1)",
      },
      // Radius — named tiers only (pill 999 / chip 6 / thumb 12 / sheet 16 /
      // card 18 / panel 22 / hero 26). No ad-hoc in-between values.
      borderRadius: {
        none: "0",
        sm: "0.375rem",   /* 6px  — chip */
        DEFAULT: "0.5rem", /* 8px  — base */
        md: "0.75rem",    /* 12px — thumb */
        lg: "1rem",       /* 16px — sheet */
        xl: "1.125rem",   /* 18px — card */
        "2xl": "1.375rem", /* 22px — panel */
        "3xl": "1.625rem", /* 26px — hero */
        full: "999px",    /* pill */
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
      // The section rhythm — the gap between sibling sections of a page.
      // The design system names it: `clamp(34px, 6vw, 56px)`.  It lives
      // in `padding`/`margin` rather than `spacing`, because that is the
      // scale Tailwind derives `py-*`/`mb-*` from.
      padding: {
        section: "var(--section-gap)",
        // The container gutter named by the design system (22px).  It was
        // declared as a CSS variable and never read; the shell now uses
        // `px-pad` so the gutter is one value, not six.
        pad: "var(--pad-x)",
      },
      margin: {
        section: "var(--section-gap)",
      },
      // Reading column (720px) and grid/dense column (1080px).  Both were
      // declared as CSS variables and never read; the app hardcoded
      // `max-w-[1400px]` in seven places instead.
      //
      // A third tier, `--max-doc`, holds the QMS form facsimile.  Those
      // documents are faithful reproductions of the source Word forms —
      // up to 18 table columns — and squeezing them into the 1080 grid
      // column would make every cell unreadable.  It is a named token
      // rather than the ad-hoc `max-w-[1400px]` it replaces.
      maxWidth: {
        read: "var(--max-read)",
        grid: "var(--max-grid)",
        doc: "var(--max-doc)",
      },
      // Shadow — two-layer only (tight contact + soft spread). Never one hard shadow.
      boxShadow: {
        sm: "0 1px 2px 0 rgb(0 0 0 / 0.04), 0 8px 24px rgb(0 0 0 / 0.05)",
        DEFAULT: "0 1px 2px 0 rgb(0 0 0 / 0.04), 0 8px 24px rgb(0 0 0 / 0.05)",
        md: "0 1px 3px 0 rgb(0 0 0 / 0.05), 0 14px 40px rgb(0 0 0 / 0.05)",
        // The hover-lift step. Two layers like every other shadow — the
        // tight contact layer is what keeps a lift from reading as a
        // single hard drop-shadow.
        lg: "0 1px 2px 0 rgb(0 0 0 / 0.04), 0 12px 32px 0 rgb(0 0 0 / 0.1)",
        xl: "0 1px 2px 0 rgb(0 0 0 / 0.04), 0 12px 32px 0 rgb(0 0 0 / 0.1)",
        "2xl": "0 2px 8px 0 rgb(0 0 0 / 0.1), 0 30px 80px 0 rgb(0 0 0 / 0.24)",
        overlay: "0 2px 8px 0 rgb(0 0 0 / 0.1), 0 30px 80px 0 rgb(0 0 0 / 0.24)",
        // Tinted contact shadows for filled surfaces. These are the
        // "colored CTA" shadow from the design system: the fill is the
        // saturated surface, the shadow carries the same hue so the button
        // sits in the accent rather than on a neutral grey haze.
        primary: "0 1px 2px 0 hsl(var(--primary-solid) / 0.22), 0 10px 28px 0 hsl(var(--primary-solid) / 0.24)",
        success: "0 1px 2px 0 hsl(var(--success-solid) / 0.22), 0 10px 28px 0 hsl(var(--success-solid) / 0.24)",
        warning: "0 1px 2px 0 hsl(var(--warning-solid) / 0.22), 0 10px 28px 0 hsl(var(--warning-solid) / 0.24)",
        destructive: "0 1px 2px 0 hsl(var(--destructive-solid) / 0.22), 0 10px 28px 0 hsl(var(--destructive-solid) / 0.24)",
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
        // Accent shadow breathing — two-layer, tinted, never a neon halo.
        "glow-breathe": {
          "0%, 100%": {
            boxShadow:
              "0 1px 2px hsl(var(--primary) / 0.08), 0 4px 12px hsl(var(--primary) / 0.1)",
          },
          "50%": {
            boxShadow:
              "0 2px 6px hsl(var(--primary) / 0.1), 0 10px 28px hsl(var(--primary) / 0.14)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
        "accordion-up": "accordion-up 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
        "glow-breathe": "glow-breathe 3s cubic-bezier(0.25, 1, 0.5, 1) infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config