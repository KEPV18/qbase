# Vezloo QMS Suite — Comprehensive Project Guide

> **Last Updated:** 2026-04-19
> **Version:** v2.5.0
> **Path:** `/home/kepa/qms-personal/`

---

## 1. Overview

ISO 9001:2015 compliant Quality Management System (QMS). The application provides complete tools for document management, reviews, risk records, CAPA, process interaction maps, and operational procedures.

### Technology Stack
| Technology | Usage |
|---|---|
| React 18 + TypeScript | Frontend |
| Vite 7.3 (SWC) | Build & development |
| Tailwind CSS 3.4 + shadcn/ui | Styling & components |
| @tanstack/react-query 5 | Data management & caching |
| Supabase | Authentication + Database + Realtime |
| Google Sheets API | Primary QMS data store |
| Google Drive API | File upload & browsing |
| Express 5.2 | Local OAuth server (port 3001) |
| Vercel | Deployment |

### Fonts
- **Outfit** — Base font (sans)
- **JetBrains Mono** — Code font (mono)

---

## 2. File Structure

```
src/
├── App.tsx                    # Main app: providers + routing + lazy loading
├── App.css                    # App styles (CSS vars only)
├── main.tsx                   # Entry point
├── index.css                  # Theme variables: :root (light) + .dark (dark)
│
├── assets/
│   ├── logo.png               # Vezloo Group logo
│   └── qms-logo.png           # QMS Suite logo
│
├── integrations/
│   └── supabase/
│       ├── client.ts          # Supabase client setup (env vars)
│       └── types.ts           # Database types (Auto-generated)
│
├── pages/                     # ← All pages here
│   ├── Index.tsx               # Main Dashboard
│   ├── ModulePage.tsx          # Module page (Sales, Operations, Quality...)
│   ├── RecordDetail.tsx        # Single record detail
│   ├── AuditPage.tsx           # Audit panel (5 tabs)
│   ├── ArchivePage.tsx         # Google Drive archive
│   ├── RiskManagementPage.tsx  # Risk management (3 tabs)
│   ├── RiskRegisterPage.tsx    # Risk register (standalone)
│   ├── CAPARegisterPage.tsx    # CAPA register (standalone)
│   ├── ProcessInteractionPage.tsx # Process interaction map (standalone)
│   ├── ActivityPage.tsx        # Recent activity
│   ├── ProceduresPage.tsx      # Digital procedures + Drive archive
│   ├── ISOManualPage.tsx       # ISO 9001:2015 manual
│   ├── ProjectsPage.tsx        # Project overview
│   ├── ProjectDetailPage.tsx   # Single project detail
│   ├── AdminAccounts.tsx       # User management (admin only)
│   ├── Login.tsx               # Login
│   ├── Register.tsx            # Registration (requires admin approval)
│   ├── AuthCallback.tsx        # OAuth callback handler
│   └── NotFound.tsx            # 404 page
│
├── hooks/                     # ← All hooks
│   ├── useAuth.tsx             # Auth context (Supabase + local fallback)
│   ├── useTheme.tsx            # Theme context (light/dark/auto)
│   ├── useQMSData.ts           # React Query for Google Sheets data
│   ├── useRiskData.ts          # React Query for risk register
│   ├── useCAPAData.ts          # React Query for CAPA register
│   ├── useProcessData.ts       # React Query for process maps
│   ├── useProceduresData.ts    # Local state + localStorage for procedures
│   ├── useManualData.ts        # Local state + localStorage for ISO manual
│   ├── useDebounce.ts          # General debounce utility
│   ├── useFilter.ts            # Filter state management
│   ├── useHotkeys.ts            # Keyboard shortcuts
│   ├── use-mobile.tsx           # Mobile screen detection
│   ├── useNotifications.ts      # Realtime notifications from Supabase
│   └── use-toast.ts            # Legacy toast (shadcn)
│
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx        # Page structure: TopNav + Breadcrumbs + Content + Footer
│   │   ├── TopNav.tsx          # Top navigation bar
│   │   ├── Header.tsx          # Legacy header
│   │   ├── Sidebar.tsx          # Legacy sidebar (currently unused)
│   │   ├── Footer.tsx           # Page footer
│   │   ├── Breadcrumbs.tsx      # Breadcrumb navigation
│   │   └── NotificationBell.tsx # Notification bell (Realtime)
│   │
│   ├── auth/
│   │   └── Guards.tsx          # RequireAuth + RequireRole
│   │
│   ├── dashboard/
│   │   ├── ModuleCard.tsx      # Module card
│   │   ├── StatusCard.tsx      # KPI card
│   │   ├── RecentActivity.tsx  # Recent activity
│   │   ├── AuditReadiness.tsx  # Audit readiness indicator
│   │   ├── QuickActions.tsx    # Quick action buttons
│   │   └── PendingActions.tsx  # Pending actions
│   │
│   ├── records/
│   │   ├── RecordCard.tsx      # Record card
│   │   ├── RecordBrowser.tsx   # Record file browser
│   │   ├── RecordsTable.tsx    # Audit records table/cards
│   │   ├── AddRecordModal.tsx  # Add record window
│   │   ├── AddFormModal.tsx    # Add form window
│   │   ├── EditFrequencyModal.tsx  # Edit fill frequency
│   │   └── EditMetadataModal.tsx   # Edit record metadata
│   │
│   ├── record-detail/
│   │   ├── RecordHeader.tsx    # Detail page header
│   │   ├── FileStats.tsx      # File statistics
│   │   ├── TechnicalSpec.tsx  # Technical specifications
│   │   ├── DocumentLinks.tsx  # Template and folder links
│   │   ├── CompliancePanel.tsx # Review status panel
│   │   ├── ReviewPanel.tsx    # Reviewer panel
│   │   └── RecordTimeline.tsx # Record timeline
│   │
│   ├── audit/
│   │   ├── AuditCharts.tsx     # Audit charts
│   │   ├── AuditFilters.tsx    # Audit page filters
│   │   └── AutomatedAuditModal.tsx  # Automated audit check (3 phases)
│   │
│   ├── risk/
│   │   ├── RiskRegisterTab.tsx      # Risk register table
│   │   ├── CapaRegisterTab.tsx      # CAPA register table
│   │   ├── ProcessInteractionTab.tsx # Process interaction table
│   │   ├── RiskHeatMap.tsx          # 5×5 heat map
│   │   └── RiskStats.tsx            # Risk statistics
│   │
│   ├── settings/
│   │   └── SettingsModal.tsx   # Settings (account, appearance, colors, diagnostics)
│   │
│   ├── ui/                     # 50+ shadcn/ui components (button, card, dialog, etc.)
│   ├── ErrorBoundary.tsx       # Error boundary
│   └── NavLink.tsx             # Navigation link
│
├── lib/                        # ← Services and utilities
│   ├── auth.ts                  # OAuth token helper
│   ├── googleSheets.ts          # Google Sheets API service
│   ├── driveService.ts          # Google Drive API service
│   ├── riskRegisterService.ts   # Risk register service (Sheets)
│   ├── capaRegisterService.ts   # CAPA register service (Sheets)
│   ├── processInteractionService.ts # Process interaction service (Sheets)
│   ├── auditCheckService.ts     # Automated audit check (3 phases)
│   ├── statusService.ts         # Record status management
│   ├── ManualContent.ts         # ISO 9001:2015 manual content
│   ├── ProceduresContent.ts    # Digital procedures content
│   ├── exportUtils.ts           # Export utilities (CSV/DOCX)
│   ├── validation.ts            # Form validation utilities
│   └── utils.ts                 # cn() utility (clsx + tailwind-merge)
│
└── server/                      # Local OAuth server
    └── local.js                 # Express server (port 3001)
```

---

## 3. Pages and Routes

| Route | Page | Description |
|---|---|---|
| `/` | Dashboard | KPIs, module cards, audit readiness |
| `/login` | Login | Login (email/password + Google OAuth) |
| `/register` | Register | New account registration (pending admin approval) |
| `/auth/callback` | AuthCallback | OAuth callback handler |
| `/module/:moduleId` | ModulePage | Module details (Sales, Operations, Quality...) |
| `/record/*` | RecordDetail | Single record detail with review panels |
| `/audit` | AuditPage | Audit panel (5 tabs + automated check) |
| `/projects` | ProjectsPage | Project overview |
| `/project/:projectName` | ProjectDetailPage | Single project detail |
| `/archive` | ArchivePage | Drive file archive (restore/delete) |
| `/risk-management` | RiskManagementPage | Risk management (3 tabs) |
| `/risk` | RiskRegisterPage | Risk register (standalone) |
| `/capa` | CAPARegisterPage | CAPA register (standalone) |
| `/process-interaction` | ProcessInteractionPage | Process interaction map (standalone) |
| `/activity` | ActivityPage | Recent activity |
| `/procedures` | ProceduresPage | Digital procedures + Drive archive |
| `/iso-manual` | ISOManualPage | ISO 9001:2015 manual |
| `/admin/accounts` | AdminAccounts | User management (admin only) |

### Routing System
- **Public routes:** `/login`, `/register`, `/auth/callback`
- **Protected routes (RequireAuth):** All other routes
- **Admin-only routes (RequireRole):** `/admin/accounts`
- All pages are **lazy-loaded** via `React.lazy()` + `Suspense`
- Provider order: `QueryClientProvider` > `ErrorBoundary` > `ThemeProvider` > `AuthProvider` > `TooltipProvider` > `BrowserRouter`

---

## 4. Authentication System

### Login Flow
```
User → Login.tsx → useAuth.login()
  ├── Email/password → Supabase Auth (signInWithPassword)
  ├── Google OAuth → Express Proxy → Google → callback → Supabase session
  └── Local fallback → SHA-256 + localStorage (disabled by default)
```

### Registration Flow
```
User → Register.tsx → useAuth.register()
  → Supabase Auth (signUp) + profiles row (is_active: false) + user_roles row (role: "user")
  → Waiting for Admin approval
```

### Database Tables
- **profiles**: id, email, display_name, is_active, user_id, password (legacy)
- **user_roles**: id, user_id, role (admin/moderator/user/manager/auditor)
- **notifications**: id, user_id, type, title, message, read, data (jsonb)

### Guards
- `RequireAuth` → redirects to `/login` if not authenticated
- `RequireRole` → redirects to `/` if insufficient permissions

### Local OAuth Server (`server/local.js`)
- `GET /api/auth` → starts Google OAuth flow
- `GET /api/auth/callback` → receives callback
- `GET /api/token` → returns saved OAuth token

---

## 5. Database

### Supabase (Authentication + Users + Notifications)
```sql
-- profiles: user data
id uuid PK, email text, display_name text, is_active boolean, user_id text, password text (legacy)

-- user_roles: user permissions
id uuid PK, user_id text, role app_role (admin|moderator|user|manager|auditor)

-- notifications: Realtime notifications
id uuid PK, user_id uuid, type text, title text, message text, read boolean, data jsonb
```

### Google Sheets (Primary Data)
| Sheet | Function | Source |
|---|---|---|
| Data | Main QMS records (35+ forms per module) | `VITE_SPREADSHEET_ID` |
| Risk Register | Risk records | Fixed Spreadsheet ID |
| CAPA Register | Corrective action records | Same Spreadsheet ID |
| Process Interaction Sheet | Process interaction map | `VITE_SPREADSHEET_ID` |

> **Important note:** Google Sheets is the primary data store for QMS data. Supabase only manages authentication, profiles, and notifications.

---

## 6. Theme System

### Controlled Obsidian Theme
- **Base theme:** Dark with neon-cyan and neon-violet accents
- **Color system:** CSS variables with `hsl(var(--*))`
- **Base file:** `src/index.css` — contains `:root` (light) + `.dark` (dark)
- **Toggle:** `useTheme.tsx` toggles `dark`/`light` class on `<html>`
- **Accent colors:** 8 possible colors, saved in `localStorage.getItem('accentColor')`, applied via `data-accent` on `<html>`
- **Color settings:** From `SettingsModal.tsx`

### Design Standards
- Sidebar: `w-60` expanded / `w-[60px]` collapsed
- Page margins: `md:ml-[60px]` collapsed / `md:ml-60` expanded
- Max width: `max-w-[1400px] mx-auto`
- Page title: `text-2xl font-bold tracking-tight`
- Cards: `rounded-xl` standard / `rounded-2xl` featured
- Every page includes: TopNav + Breadcrumbs + Footer

---

## 7. Data Flow

```
Google Sheets API  →  googleSheets.ts  →  useQMSData (React Query)  →  Pages/Components
Google Drive API   →  driveService.ts   →  useQMSData / direct calls       →  Pages/Components
Risk Sheet         →  riskRegisterService →  useRiskData (React Query)     →  Risk pages
CAPA Sheet         →  capaRegisterService →  useCAPAData (React Query)    →  CAPA pages
Process Sheet       →  processInteractionService →  useProcessData          →  Process pages
Supabase Auth      →  useAuth (AuthProvider)  →  Guards, Login, Register
Supabase Realtime  →  useNotifications       →  NotificationBell
LocalStorage       →  useProceduresData/useManualData →  Procedures and Manual pages
OAuth Proxy        →  server/local.js (Express)  →  getAccessToken()  →  Drive/Sheets write operations
```

### Read and Write Operations
- **Google Sheets Read:** API Key (read-only)
- **Google Sheets Write:** OAuth access token (requires Google login)
- **The app shows a warning** if write operations fail due to missing OAuth

---

## 8. Hooks

| Hook | File | Function |
|---|---|---|
| `useAuth` | `useAuth.tsx` | Complete auth context: login, logout, register, user management |
| `useTheme` | `useTheme.tsx` | Theme context: light/dark/auto with localStorage |
| `useQMSData` | `useQMSData.ts` | React Query for QMS data (60s refetch, 30s stale) |
| `useUpdateRecord` | `useQMSData.ts` | Mutation for sheet cell updates |
| `useDeleteRecord` | `useQMSData.ts` | Mutation for row deletion |
| `useRiskData` | `useRiskData.ts` | React Query for risk register (add/update/fetch) |
| `useCAPAData` | `useCAPAData.ts` | React Query for CAPA register |
| `useProcessData` | `useProcessData.ts` | React Query for process maps |
| `useProceduresData` | `useProceduresData.ts` | Local state + localStorage for procedures |
| `useManualData` | `useManualData.ts` | Local state + localStorage for ISO manual |
| `useNotifications` | `useNotifications.ts` | Realtime notifications from Supabase |
| `useDebounce` | `useDebounce.ts` | General debounce |
| `useFilter` | `useFilter.ts` | Filter state management |
| `useHotkeys` | `useHotkeys.ts` | Keyboard shortcuts |
| `use-mobile` | `use-mobile.tsx` | Mobile screen detection |

---

## 9. Environment Variables

| Variable | Function |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase public key |
| `VITE_GOOGLE_API_KEY` | Google API key (Sheets + Drive read) |
| `VITE_SPREADSHEET_ID` | Main Google Sheets spreadsheet ID |
| `VITE_PROCEDURES_FOLDER_ID` | Google Drive folder ID for procedures |
| `VITE_AUTH_LOCAL_DISABLED` | Disable local auth (default: "true") |
| `VITE_AUTH_SALT` | Local password encryption salt |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (server) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret (server) |
| `GOOGLE_REDIRECT_URI` | OAuth redirect URI |

---

## 10. Important Notes

### Security
- **Never write API keys in code** — use `import.meta.env.VITE_*`
- Google Sheets/Drive write operations must go through OAuth
- `admin-update-password` is a Supabase Edge Function for password resets

### Automated Audit Check
- File: `src/lib/auditCheckService.ts`
- 3 phases: Record integrity check, file sequence check, file naming check

### Brand Identity
- Name: **Vezloo QMS Suite**
- Developer: **Ahmed Khaled**
- Fixed Spreadsheet ID for Risk/CAPA: `11dGB-fG2UMqsdqc182PsY-K6S_19FKc8bsZLHlic18M`

### Build
```bash
npm install && npx vite build
```

### Notification System
- Unified on `sonner` (shadcn Toaster removed from App.tsx)
- `sonner.tsx` uses local `useTheme` (not next-themes)

---

## 11. Files Modified in Last Theme Update (2026-04-18)

- `src/index.css` — Complete rebuild with light/dark theme
- `tailwind.config.ts` — CSS variable references + module colors
- `src/App.css` — Removed conflicting Inter/hex definitions
- `src/hooks/useTheme.tsx` — Removed dead themeVars
- `src/components/ui/sonner.tsx` — Fixed import to local useTheme
- `src/components/records/RecordCard.tsx` — Replaced all hardcoded colors
- `src/pages/ProceduresPage.tsx` — API key in env var + added Breadcrumbs/Footer
- `src/pages/ISOManualPage.tsx` — Added Breadcrumbs/Footer
- `src/pages/ActivityPage.tsx` — Added Breadcrumbs
- `src/pages/ProjectsPage.tsx` — Unified layout
- `src/pages/ModulePage.tsx` — Unified layout
- `src/pages/ArchivePage.tsx` — Lucide icons instead of Emoji, toast → sonner
- `src/pages/AuditPage.tsx` — Fixed hardcoded emerald colors
- `src/pages/AuthCallback.tsx` — Fixed hardcoded colors
- `src/pages/Register.tsx` — Fixed orange-500
- `src/components/ui/LoadingSpinner.tsx` — Fixed import path
- `src/App.tsx` — Removed shadcn Toaster, kept Sonner

---

> **For use:** Read this file first in every new conversation to quickly understand the project without exploring it from scratch.
