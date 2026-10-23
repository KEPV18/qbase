# Vezloo QMS Suite — Comprehensive Project Guide

> **Last Updated:** 2026-10-21
> **Version:** v3.0.0
> **Path:** `/home/kepv/qbase-remediation/`

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
| Google Drive API | Procedure document browsing (read-only) |
| Express 5.2 | Local OAuth server (port 3001) |
| Vercel | Deployment |

### Fonts
- **System stack** (`-apple-system`, `SF Pro Text`, `PingFang SC`, …) — no webfont is loaded; the design system uses the platform's own UI face.
- **System mono** (`SF Mono`, `Menlo`, `Cascadia Mono`) for codes and serials.

---

## 2. File Structure

```
src/
├── App.tsx                    # Main app: providers + routing + lazy loading
├── main.tsx                   # Entry point
├── index.css                  # Design tokens + component layer (light + dark)
│
├── assets/
│   ├── logo.png               # Vezloo Group logo
│   └── qms-logo.png           # QMS Suite logo
│
├── config/
│   ├── brandColors.ts         # Tenant brand palette (AA-measured)
│   └── modules.ts             # ISO-clause → module registry
│
├── data/
│   ├── formSchemas.ts         # Re-export of the unified schema
│   ├── formsRegistry.ts       # Forms registry metadata
│   ├── kpiData.ts / .json     # KPI definitions
│   └── projectsData.ts        # Project metadata
│
├── schemas/
│   ├── unifiedSchema.ts       # THE 35-form schema source of truth
│   ├── formValidation.ts      # Zod validators
│   ├── serialAndDate.ts       # Serial generation + date helpers
│   └── index.ts
│
├── integrations/
│   └── supabase/
│       ├── client.ts          # Supabase client setup (env vars, fail-closed)
│       └── types.ts           # Database types (Auto-generated)
│
├── services/                  # ← Data + domain services
│   ├── recordStorage.ts       # THE record service (Supabase + RPCs)
│   ├── dashboardStats.ts      # Dashboard aggregates (one RPC)
│   ├── auditLog.ts            # Append-only audit writes + diffs
│   ├── preWriteValidation.ts  # Validation gate before any write
│   ├── ruleEngine.ts          # Integrity rules (warn-first)
│   ├── importService.ts       # Validated import
│   ├── docxExport.ts          # DOCX export
│   ├── fileExport.ts          # CSV export
│   ├── backupService.ts       # Backup / restore
│   ├── userService.ts         # User administration
│   ├── errorReportService.ts  # Error reporting
│   ├── eventBus.ts            # Typed event bus
│   ├── recordUtils.ts
│   └── logger.ts              # Structured logging
│
├── pages/                     # ← All pages here
│   ├── Index.tsx               # Main Dashboard
│   ├── RecordViewPage.tsx      # Single record detail
│   ├── RecordListPage.tsx      # Record list
│   ├── RecordCreationPage.tsx  # Create record
│   ├── AuditPage.tsx           # Audit panel (5 tabs)
│   ├── ComplianceReportPage.tsx # Detailed compliance report (per-form filing gaps)
│   ├── ArchivePage.tsx         # Archive
│   ├── RiskManagementPage.tsx  # Risk management (3 tabs)
│   ├── ActivityPage.tsx        # Recent activity
│   ├── ProceduresPage.tsx      # Digital procedures
│   ├── ISOManualPage.tsx       # ISO 9001:2015 manual
│   ├── ProjectsPage.tsx        # Project overview
│   ├── ProjectDetailPage.tsx   # Single project detail
│   ├── FormsRegistryPage.tsx   # Forms registry
│   ├── FormTemplatePreview.tsx # Template preview
│   ├── FormCodeRedirect.tsx    # /form-code/:serial → canonical route
│   ├── NotificationsPage.tsx   # Notification centre
│   ├── KPIDashboardPage.tsx    # KPI dashboard
│   ├── KPIReportsPage.tsx      # KPI reports
│   ├── SWOTAnalysisPage.tsx    # SWOT analysis
│   ├── TraceabilityPage.tsx    # Traceability explorer
│   ├── DataIntegrityPage.tsx   # Data integrity rules dashboard
│   ├── Settings.tsx            # Settings
│   ├── AdminPanel.tsx          # User management + branding (admin only)
│   ├── DatabaseManagementPage.tsx # Database admin (admin only)
│   ├── ApprovalQueuePage.tsx   # Approval queue
│   ├── Login.tsx               # Login
│   ├── Register.tsx            # Registration (requires admin approval)
│   ├── AuthCallback.tsx        # OAuth callback handler
│   ├── ResetPassword.tsx       # Password recovery
│   ├── NotFound.tsx            # 404 page
│   ├── admin/
│   │   └── DataSanitizer.tsx   # Data sanitisation (admin only)
│   └── audit/
│       └── useAuditPage.ts     # Audit page state hook
│
├── hooks/                     # ← All hooks
│   ├── useAuth.tsx             # Auth context (Supabase + local fallback)
│   ├── useAuthUtils.ts         # Auth helpers (roles, guards)
│   ├── useSupabaseAuth.ts      # Supabase session primitives
│   ├── useUserManagement.ts    # Admin user CRUD
│   ├── useTheme.tsx            # Theme context (light/dark/system)
│   ├── useTenantIdentity.tsx   # Tenant branding (name, logo, colour)
│   ├── useRecordStorage.ts     # React Query for the records table
│   ├── useRiskData.ts          # React Query for risk register
│   ├── useCAPAData.ts          # React Query for CAPA register
│   ├── useProcessData.ts       # React Query for process maps
│   ├── useProceduresData.ts    # Local state + localStorage for procedures
│   ├── useManualData.ts        # Local state + localStorage for ISO manual
│   ├── useNotifications.ts     # Realtime notifications from Supabase
│   ├── useAuditLog.ts          # Audit log queries
│   ├── useBackup.ts            # Backup / restore
│   ├── useRefreshData.ts       # Manual refresh
│   ├── useTraceabilityResolver.ts # Traceability graph resolution
│   ├── useDebounce.ts          # General debounce utility
│   ├── useFilter.ts            # Filter state management
│   └── use-mobile.tsx           # Mobile screen detection
│
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx        # Page container + breadcrumbs
│   │   ├── DashboardLayout.tsx # Shell used by authenticated pages
│   │   ├── TopNav.tsx          # Top navigation bar
│   │   ├── Sidebar.tsx         # Desktop sidebar navigation
│   │   ├── MobileBottomNav.tsx # Mobile tab bar
│   │   ├── Breadcrumbs.tsx     # Breadcrumb navigation
│   │   └── CommandPalette.tsx  # ⌘K global search / navigation
│   │
│   ├── auth/
│   │   └── Guards.tsx          # RequireAuth + RequireRole
│   │
│   ├── forms/
│   │   ├── DynamicFormRenderer.tsx  # Schema-driven record form
│   │   ├── FormKit.tsx              # Shared template primitives
│   │   ├── DocumentView.tsx         # Document-style record wrapper
│   │   ├── SchemaDrivenRecordView.tsx
│   │   └── templates/               # DOCX-accurate F/xx templates
│   │
│   ├── templates/
│   │   └── index.tsx           # Lazy template registry (getTemplateComponent)
│   │
│   ├── risk/
│   │   ├── RiskRegisterTab.tsx      # Risk register table
│   │   ├── CapaRegisterTab.tsx      # CAPA register table
│   │   ├── ProcessInteractionTab.tsx # Process interaction table
│   │   └── RiskHeatMap.tsx          # 5×5 heat map
│   │
│   ├── traceability/
│   │   ├── TraceView.tsx            # Traceability graph
│   │   └── CAPAEvidenceDashboard.tsx
│   │
│   ├── ui/                     # shadcn/ui components + design-system primitives
│   │                           # (StatsRow, StateScreen, PageHeader, AsyncBoundary, …)
│   └── ErrorBoundary.tsx       # Error boundary
│
├── lib/                        # ← Domain libraries
│   ├── auth.ts                  # OAuth token helper
│   ├── riskRegisterService.ts   # Risk register service
│   ├── capaRegisterService.ts   # CAPA register service
│   ├── processInteractionService.ts # Process interaction service
│   ├── statusService.ts         # Record status management
│   ├── compliance.ts            # Compliance scoring
│   ├── compliancePeriods.ts     # The period engine (cadence, due dates, gaps)
│   ├── complianceReport.ts      # The detailed per-form report built on the engine
│   ├── temporalUtils.ts         # Coverage-period / date resolution
│   ├── traceability.ts          # Traceability graph builder
│   ├── departmentTheme.ts       # Per-department accent themes
│   ├── procedureRecordMapping.ts # Procedure → governed QMS records
│   ├── safeEmit.ts              # Typed event-bus emit
│   ├── ManualContent.ts         # ISO 9001:2015 manual content
│   ├── ProceduresContent.ts     # Digital procedures content
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
| `/reset-password` | ResetPassword | Password recovery |
| `/records` | RecordListPage | Record list (filter by `?formCode=`, `?section=`, `?month=`, `?project=`) |
| `/records/:serial` | RecordViewPage | Single record detail |
| `/create` | RecordCreationPage | Create a record |
| `/forms` | FormsRegistryPage | Forms registry |
| `/form/*` | FormTemplatePreview | Template preview |
| `/form-code/:serial` | FormCodeRedirect | Redirects a form code to the canonical record route |
| `/audit` | AuditPage | Audit panel (5 tabs + automated check) |
| `/compliance` | ComplianceReportPage | Detailed compliance report — every recurring form with a filing gap, period by period (`?form=F/10` scrolls to that form) |
| `/projects` | ProjectsPage | Project overview |
| `/project/:projectName` | ProjectDetailPage | Single project detail |
| `/archive` | ArchivePage | Archive |
| `/risk-management` | RiskManagementPage | Risk management (3 tabs) |
| `/activity` | ActivityPage | Recent activity |
| `/procedures` | ProceduresPage | Digital procedures |
| `/iso-manual` | ISOManualPage | ISO 9001:2015 manual |
| `/notifications` | NotificationsPage | Notification centre |
| `/kpi`, `/kpi/reports` | KPI pages | KPI dashboard and reports |
| `/swot-analysis` | SWOTAnalysisPage | SWOT analysis |
| `/traceability`, `/traceability/:recordId` | TraceabilityPage | Traceability explorer |
| `/integrity` | DataIntegrityPage | Data integrity rules dashboard |
| `/settings` | Settings | Settings |
| `/admin/accounts` | AdminPanel | User management + branding (admin only) |
| `/admin/database` | DatabaseManagementPage | Database admin (admin only) |
| `/admin/data-sanitizer` | DataSanitizer | Data sanitisation (admin only) |
| `/admin/approvals` | ApprovalQueuePage | Approval queue |

Redirects: `/modules` → `/`, `/approvals` → `/admin/approvals`, `/admin` → `/admin/accounts`, `/record/*` → `/records`.

### Routing System
- **Public routes:** `/login`, `/register`, `/auth/callback`
- **Protected routes (RequireAuth):** All other routes
- **Admin-only routes (RequireRole):** `/admin/accounts`, `/admin/database`, `/admin/data-sanitizer`
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

**Supabase Postgres is the single source of truth for QMS data.** Google Sheets is no longer a data store; the only remaining Google integration is read-only Drive browsing for procedure documents (`src/pages/ProceduresPage.tsx`).

### Supabase (Auth + Users + Notifications + QMS records)
```sql
-- profiles: user data
id uuid PK, email text, display_name text, is_active boolean, user_id text, password text (legacy)

-- user_roles: user permissions
id uuid PK, user_id text, role app_role (admin|moderator|user|manager|auditor)

-- notifications: Realtime notifications
id uuid PK, user_id uuid, type text, title text, message text, read boolean, data jsonb

-- records: every QMS record (all 35 forms)
id uuid PK, form_code text, serial text, form_name text, status text,
form_data jsonb, section int, section_name text, frequency text,
created_by text, last_modified_by text, edit_count int,
modification_reason text, deleted_at timestamptz, project_id uuid
```

### Server-side functions (the write path)
All writes go through Postgres RPCs — the browser never writes a table directly.

| RPC | Purpose |
|---|---|
| `create_record_validated` | Creates a record (draft or otherwise) with server-side validation |
| `update_record_versioned` | Versioned update with optimistic-concurrency check |
| `record_transition` | Workflow status transition, permission-checked server-side |
| `record_draft_create` / `record_draft_autosave` / `record_discard_draft` | Draft lifecycle, owner-checked |
| `soft_delete_record` | Soft delete (sets `deleted_at`) |
| `record_restore` | Restore a soft-deleted record |
| `audit_log_server_append` | Append-only audit entry; the actor comes from `auth.uid()` server-side, so it cannot be forged by the client |
| `create_notifications_batch` | Fan-out notification insert |
| `dashboard_stats` | The single aggregate RPC behind the dashboard |
| `error_report_submit` / `error_report_resolve` | Client error reporting |

### Migrations
`supabase/migrations/**.sql` is the versioned, reversible record of schema change. A production snapshot of the live schema is kept at `audit/rpc-args.json`, and `npm run verify:schemas` compares **code → production snapshot → migrations** and fails the build on an error-class divergence. See `docs/` and `audit/schema-parity.mjs`.

---

## 6. Design System — Apple Liquid Glass

**Source of truth:** `src/index.css` (tokens + component layer) and `tailwind.config.ts` (token references). The `apple-liquid-glass` skill at `~/.claude/skills/apple-liquid-glass` defines the rules.

### Philosophy (in priority order)
1. **Unified surface > fragmented cards** — sibling items go on one white panel with hairline dividers, not a pile of separately-bordered cards.
2. **Glass is seasoning** — `backdrop-filter` frost only where layers genuinely overlap (sticky nav, overlays, the one colored CTA). Plain content areas are solid `#fff` + soft shadow.
3. **Restraint is luxury** — whitespace and hierarchy before borders, fills, icons, or numbers.
4. **Hierarchy from weight + size + grayscale** — colour is for one accent, heat, and brand only.
5. **Quality lives in details** — negative tracking on titles, `tabular-nums`, hairlines, gentle hover lift.

### Tokens
| Group | Variables |
|---|---|
| Ground / surface | `--background` (#f5f5f7 light), `--card` (#ffffff), `--muted` |
| Text | `--foreground` (#1d1d1f), `--muted-foreground` (#6e6e73), `--ink` … `--ink-4` |
| Accent | `--primary` (#0071e3), `--primary-solid`, `--primary-tint`, `--primary-hover` |
| Status | `--success-solid/-tint/-hover`, `--warning-solid/-tint/-hover`, `--destructive-solid/-tint/-hover` |
| Lines | `--border` (#e3e3e6) |
| Radius | `--radius-sm` … `--radius-xl` (semantic tiers only) |
| Shadow | `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-overlay` (two-layer only) |
| Motion | `--ease-standard/-sharp/-spring`, `--duration-fast/normal/slow` |
| Type | `--font-sans` (system stack), `--font-display`, `--font-mono` |

Colour values are `H S% L%` triplets consumed as `hsl(var(--x))`; opacity variants use `hsl(var(--x) / 0.03)`.

### Component classes (`src/index.css`, `@layer components`)
| Class | Role |
|---|---|
| `.ds-card` | Standard surface — 18px radius, `--shadow-sm` |
| `.ds-panel` | Large section container — 22px radius, `--shadow-md` |
| `.ds-input` | Quiet input with a focus ring |
| `.glass` | Frosted surface, **only** where layers overlap |
| `.glass-chip` | Glass element on a coloured ground |
| `.status-pill` | Status badge using the `-tint` ramp (AA in every mode) |
| `.ds-press` | Pointer-down feedback |
| `.ds-focus-ring` | Consistent focus ring |

### Rules that must not be broken
- **Ground is cool `#f5f5f7`**, not cream/beige/kraft.
- **No webfont brand face** — the system stack only.
- **Glass never on plain content blocks.**
- **Colour never as decoration** — one accent per view.
- **No emoji as icons** — Lucide line icons, 24-grid, grayscale `currentColor`, accent only on the active/action state, ≥44px hit targets.
- **Status colours use the `-tint` ramp** for text on a tint fill, not the solid value.
- **Every interactive element has a visible focus state** and a ≥44px touch target.

### Layout standards
- Sidebar: `w-64` expanded / `w-16` collapsed (desktop), drawer on mobile
- Content: `max-w-[1400px] mx-auto`, `p-5`
- Page title: `text-xl font-bold tracking-tight` (via `PageHeader.tsx`)
- Every page renders through `AppShell` (breadcrumbs + content)

---

## 7. Data Flow

```
Supabase Postgres  →  recordStorage.ts / RPCs  →  useRecordStorage  →  Record pages
Risk Records       →  riskRegisterService      →  useRiskData (React Query)     →  Risk pages
CAPA Records       →  capaRegisterService      →  useCAPAData (React Query)    →  CAPA pages
Process Records    →  processInteractionService →  useProcessData              →  Process pages
Supabase Auth      →  useAuth (AuthProvider)  →  Guards, Login, Register
Supabase Realtime  →  useNotifications       →  Sidebar badge, NotificationsPage
LocalStorage       →  useProceduresData/useManualData →  Procedures and Manual pages
Google Drive (RO)  →  ProceduresPage.tsx      →  procedure document browsing
OAuth Proxy        →  server/local.js (Express)  →  getAccessToken()  →  Drive access
```

### Read and Write Operations
- **Records, risks, CAPA, processes:** Supabase via the RPCs listed in §5. The browser never writes a table directly.
- **Google Drive:** read-only browsing of the procedures folder, API key only.
- **Audit trail:** `audit_log` is append-only; `audit_log_server_append` derives the actor server-side.

---

## 8. Hooks

| Hook | File | Function |
|---|---|---|
| `useAuth` | `useAuth.tsx` | Complete auth context: login, logout, register, user management |
| `useAuthUtils` | `useAuthUtils.ts` | Role helpers, permission checks |
| `useSupabaseAuth` | `useSupabaseAuth.ts` | Supabase session primitives |
| `useUserManagement` | `useUserManagement.ts` | Admin user CRUD |
| `useTheme` | `useTheme.tsx` | Theme context: light/dark/system with localStorage |
| `useTenantIdentity` | `useTenantIdentity.tsx` | Tenant name, logo, and brand colour |
| `useRecords` | `useRecordStorage.ts` | React Query for the records table |
| `useRecord` | `useRecordStorage.ts` | Single record by serial |
| `useCreateRecord` | `useRecordStorage.ts` | Create mutation (validates, then calls the RPC) |
| `useUpdateRecord` | `useRecordStorage.ts` | Versioned update mutation |
| `useSubmitDraft` | `useRecordStorage.ts` | Draft submission |
| `useDeleteRecord` | `useRecordStorage.ts` | Soft-delete mutation |
| `useRestoreRecord` | `useRecordStorage.ts` | Restore mutation |
| `useArchivedRecords` | `useRecordStorage.ts` | Archived (soft-deleted) records |
| `useExistingSerials` | `useRecordStorage.ts` | Serials already in use, for duplicate prevention |
| `useDashboardStats` | `useRecordStorage.ts` | Dashboard aggregates (one RPC) |
| `useRiskData` | `useRiskData.ts` | React Query for risk register (add/update/fetch) |
| `useCAPAData` | `useCAPAData.ts` | React Query for CAPA register |
| `useProcessData` | `useProcessData.ts` | React Query for process maps |
| `useProceduresData` | `useProceduresData.ts` | Local state + localStorage for procedures |
| `useManualData` | `useManualData.ts` | Local state + localStorage for ISO manual |
| `useNotifications` | `useNotifications.ts` | Realtime notifications from Supabase |
| `useAuditLog` | `useAuditLog.ts` | Audit log queries |
| `useBackup` | `useBackup.ts` | Backup and restore |
| `useRefreshData` | `useRefreshData.ts` | Manual data refresh |
| `useTraceabilityResolver` | `useTraceabilityResolver.ts` | Traceability graph resolution |
| `useDebounce` | `useDebounce.ts` | General debounce |
| `useFilter` | `useFilter.ts` | Filter state management |
| `use-mobile` | `use-mobile.tsx` | Mobile screen detection |

---

## 9. Environment Variables

| Variable | Function |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase public key (anon / publishable) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Alternative Supabase publishable key |
| `VITE_GOOGLE_API_KEY` | Google API key (Drive read only) |
| `VITE_PROCEDURES_FOLDER_ID` | Google Drive folder ID for procedures |
| `VITE_AUTH_LOCAL_DISABLED` | Disable local auth (default: disabled) |
| `VITE_AUTH_SALT` | Local password encryption salt |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (server) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret (server) |
| `GOOGLE_REFRESH_TOKEN` | Stored OAuth refresh token (server) |

> The Supabase client **fails closed** at module load if the URL/key are missing — it throws rather than running unauthenticated.

---

## 10. Important Notes

### Security
- **Never write API keys in code** — use `import.meta.env.VITE_*`
- **The `service_role` key must never reach the client.** All privileged work happens in Postgres functions with `security definer` and an explicit `auth.uid()` check.
- Writes go through RPCs that re-check permission and state server-side; the client's own check is advisory only.
- `admin-update-password` is a Supabase Edge Function for password resets.
- Audit writes go through `audit_log_server_append`, which derives the actor from `auth.uid()` — the client cannot forge attribution.

### Automated Audit Check
- File: `src/services/ruleEngine.ts`
- Rules cover reference integrity, dependencies, sequencing, and data quality.
- Every rule defaults to **warn** mode; enforcement is switched on explicitly by an admin.

### Schema parity
- `npm run verify:schemas` → `scripts/verify-schema-parity.ts`
- Compares the code's table/RPC usage against the production snapshot (`audit/rpc-args.json`) and the migrations.
- Fails the build on an error-class divergence.

### Brand Identity
- Name: **Vezloo QMS Suite**
- Developer: **Ahmed Khaled**
- Tenant brand colours live in `src/config/brandColors.ts`; every value is measured to carry white text at AA in both themes.

### Build and checks
```bash
npm run lint          # eslint
npm run typecheck     # tsc -b --force  (NOT `tsc --noEmit` — that checks nothing)
npm run verify:schemas
npm run test          # vitest run
npm run build         # vite build
npm run ci            # all of the above, in order
```

### Notification System
- Unified on `sonner` (shadcn Toaster removed from App.tsx)
- `sonner.tsx` uses local `useTheme` (not next-themes)

---

> **For use:** Read this file first in every new conversation to quickly understand the project without exploring it from scratch.
