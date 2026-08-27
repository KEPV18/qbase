# QBase Architecture Audit Report 2026

## Executive Summary

This document presents a comprehensive audit of the QBase Quality Management System (QMS) codebase conducted on 11 June 2026. The audit covers Frontend, Backend/Services, and Architecture/Infrastructure aspects of the application.

- **Project:** QBase QMS — React/TypeScript application deployed on Vercel
- **Total Files Analyzed:** 243+ TypeScript/TSX files
- **Total Findings:** ~82 issues across all categories
- **Build Status:** Clean (0 ESLint errors, 0 TypeScript errors after recent fixes)
- **Production URL:** https://qbase-sable.vercel.app
- **Database:** Supabase PostgreSQL with 248 production records

---

## Critical Statistics

| Severity | Frontend | Backend | Architecture | Total |
|----------|----------|---------|--------------|-------|
| 🔴 Critical | 10 | 3 | 3 | 16 |
| 🟠 High | 12 | 6 | 5 | 23 |
| 🟡 Medium | 13 | 7 | 5 | 25 |
| 🟢 Low | 8 | 3 | 7 | 18 |
| **Total** | **43** | **19** | **20** | **82** |

---

## Part I: Frontend Review (243 files analyzed)

### 🔴 Critical Issues (10)

#### 1. Duplicate ErrorBoundary — One Clears localStorage
- **Files:** `src/components/ui/ErrorBoundary.tsx` and `src/components/ui/error-boundary.tsx`
- **Line:** error-boundary.tsx line ~54, 64
- **Description:** Two ErrorBoundary components exist with different casing. The kebab-case version (`error-boundary.tsx`) contains `localStorage.clear()` in its error handler — this is extremely dangerous as it wipes all client-side data (auth tokens, preferences, drafts) on any unhandled error.
- **Impact:** Complete data loss for users on any runtime error.
- **Fix:** Delete `error-boundary.tsx` and keep only `ErrorBoundary.tsx`.

#### 2. Swallowed Errors — console.error("Error") Without Details
- **File:** `src/hooks/useAuth.tsx`
- **Lines:** 185, 313, 400, 620, 622, 696, 707, 712, 760, 763, 777, 794, 800, 839, 842, 845, 860, 865 (18+ locations)
- **Description:** Throughout `useAuth.tsx`, error handlers call `console.error("Error")` without passing the actual error object. This makes debugging impossible — developers see "Error" in the console with no stack trace, no message, no context.
- **Impact:** Complete inability to diagnose auth failures in production.
- **Fix:** Replace all instances with `console.error("[AUTH] Contextual description:", err)`.

#### 3. Direct DOM Manipulation Anti-Patterns
- **Files:**
  - `src/components/layout/Sidebar.tsx` (line 64): `document.body.style.overflow`
  - `src/components/layout/TopNav.tsx` (line 60): `document.body.style.overflow`
  - `src/pages/ISOManualPage.tsx` (lines 38, 64): `document.getElementById`
  - `src/pages/ProceduresPage.tsx` (lines 125, 181): `document.getElementById`
- **Description:** Direct DOM manipulation in React bypasses the Virtual DOM reconciliation, causing synchronization issues between React's internal state and the actual DOM.
- **Impact:** Unpredictable UI behavior, hydration mismatches, memory leaks.
- **Fix:** Use `useRef` + `scrollIntoView` for scroll operations. Use CSS classes toggled via React state for overflow.

#### 4. Full Page Reloads Instead of State Management
- **Files:**
  - `src/pages/Index.tsx` (line 74): `window.location.reload()`
  - `src/components/ui/error-boundary.tsx` (lines 54, 64): `window.location.reload()`
  - `src/components/editor/DocumentEditor.tsx` (line 71): `window.location.reload()`
- **Description:** Multiple locations trigger full page reloads instead of using React state invalidation or React Query cache invalidation.
- **Impact:** Terrible UX — users lose scroll position, form state, filters. Unnecessary server round-trips.
- **Fix:** Use `queryClient.invalidateQueries()` or `navigate(0)` as last resort.

#### 5. Hardcoded Default Admin Credentials
- **File:** `src/hooks/useAuth.tsx` (lines 114-122)
- **Description:**
  ```ts
  const seeded: AppUser = {
    id: crypto.randomUUID(),
    name: "admin",
    email: "admin@local",
    password: "SET_ON_FIRST_LOGIN",
    role: "admin",
  };
  ```
- **Impact:** Default credentials embedded in source code. If auth fallback mode activates, anyone can access the admin account.
- **Fix:** Remove the seeded user entirely. Use environment variables or database migration scripts for initial setup.

#### 6. Memory Leak in useAuth — syncUserProfile Dependency
- **File:** `src/hooks/useAuth.tsx` (line 271, 648)
- **Description:** `syncUserProfile` depends on `user` in its dependency array, causing function recreation on every user change, leading to memory leaks and duplicate API calls.
- **Impact:** Memory leaks, degraded performance over time, excessive Supabase API calls.
- **Fix:** Use refs for mutable values instead of including them in dependency arrays.

#### 7. Unsafe `import.meta` Casting
- **File:** `src/hooks/useAuth.tsx` (lines 41, 46)
- **Description:**
  ```ts
  (((import.meta as unknown as { env?: Record<string, unknown> }).env?.VITE_AUTH_LOCAL_DISABLED) ?? "true") === "true";
  ```
- **Impact:** Type assertions bypass compile-time safety. Runtime crashes if `import.meta.env` is undefined.
- **Fix:** Use `import.meta.env.VITE_AUTH_LOCAL_DISABLED` directly with proper undefined checks.

#### 8. Missing Search Input Sanitization
- **File:** `src/components/layout/Header.tsx` (line 99)
- **Description:** Search term values are sent directly to Google Drive API without sanitization or encoding.
- **Impact:** Potential XSS or injection if search results are rendered unsafely.
- **Fix:** Apply `encodeURIComponent()` or `DOMPurify` before sending search terms.

#### 9. Infinite Loop in Sidebar useEffect
- **File:** `src/components/layout/Sidebar.tsx` (lines 50-55)
- **Description:**
  ```ts
  useEffect(() => {
    if (pathModule && !expandedItems.includes(pathModule)) {
      setExpandedItems(prev => [...prev, pathModule]);
    }
  }, [location.pathname, expandedItems]);
  ```
- **Impact:** The effect depends on `expandedItems` but also modifies it, creating an infinite render loop that consumes CPU.
- **Fix:** Remove `expandedItems` from dependency array and use functional updates only.

#### 10. Inline IIFE Recreated on Every Render
- **File:** `src/components/layout/Header.tsx` (lines 128-135)
- **Description:** An Immediately Invoked Function Expression (IIFE) is defined inline in JSX, recreating the function on every render.
- **Impact:** Unnecessary allocations, potential child re-renders.
- **Fix:** Extract to a separate component or use `useMemo`.

---

### 🟠 High Issues (12)

#### 11. Missing useMemo on Expensive Computations
- **File:** `src/components/records/RecordBrowser.tsx` (line 180)
- **Description:** `files.filter(...).map(...)` runs on every render without memoization.
- **Fix:** Wrap with `useMemo`.

#### 12. Unsafe `as unknown as` Casts
- **Files:**
  - `src/pages/RecordViewPage.tsx` (lines 88, 89, 471, 479)
  - `src/pages/RecordListPage.tsx` (line 94)
  - `src/services/ruleEngine.ts` (line 485)
- **Description:** Multiple locations use `as unknown as SomeType` to bypass TypeScript's type system entirely.
- **Fix:** Use Type Guards (`isRecordData()`) or proper generic types.

#### 13. Notifications Using Polling
- **File:** `src/hooks/useNotifications.ts` (lines 152-161)
- **Description:** Polls every 30 seconds for up to 100 notifications, consuming server resources unnecessarily.
- **Fix:** Use Supabase Realtime or Server-Sent Events.

#### 14. Theme Media Query Without Cleanup
- **File:** `src/hooks/useTheme.tsx` (line 21)
- **Description:** Adds `matchMedia` listeners but never removes them on unmount.
- **Fix:** Return cleanup function from `useEffect`.

#### 15. Hardcoded Encryption Salt
- **File:** `src/hooks/useAuth.tsx` (line 46)
- **Description:** `const salt = ... || "qms-salt-2026-v1"` — fallback salt is readable in source code.
- **Fix:** Use environment variables exclusively with no fallback.

#### 16. Missing Error Boundary on Some Routes
- **File:** `src/App.tsx` (lines 127-132)
- **Description:** NotFound route is not wrapped in `PageBoundary` while other routes are.
- **Fix:** Wrap all routes consistently.

#### 17. Inaccessible Loading Spinner
- **File:** `src/components/ui/LoadingScreen.tsx` (line 7)
- **Description:** No `aria-live` or `role="status"` for screen readers.
- **Fix:** Add accessibility attributes.

#### 18. Checkbox Field Missing Error Association
- **File:** `src/components/forms/DynamicFormRenderer.tsx` (lines 290-308)
- **Description:** Checkbox errors are not linked to the input via `aria-describedby`.
- **Fix:** Add `aria-describedby` and `aria-invalid`.

#### 19. AudioContext Leak
- **File:** `src/hooks/useNotifications.ts` (lines 64-95)
- **Description:** Creates a new `AudioContext` each time without calling `close()`.
- **Fix:** Reuse a single AudioContext instance or close after playback.

#### 20. Inline Event Handlers Without useCallback
- **File:** `src/components/forms/DynamicFormRenderer.tsx` (lines 738-742)
- **Description:** `handleSubmit` is not memoized with `useCallback`, causing child re-renders.
- **Fix:** Wrap with `useCallback`.

#### 21. Potential setState During Render
- **File:** `src/pages/AuthCallback.tsx`
- **Description:** May call `setState` during render phase.
- **Fix:** Use `useEffect` for redirect logic.

#### 22. React.useEffect Without Import
- **File:** `src/components/forms/DynamicFormRenderer.tsx` (line 496)
- **Description:** Uses `React.useEffect` without explicit React import.
- **Fix:** Import `useEffect` directly from 'react'.

---

### 🟡 Medium Issues (13)

#### 23-35. Various Issues
- Missing `aria-labels` on navigation buttons (`Sidebar.tsx`)
- Form inputs without proper `aria-describedby` for errors (`Login.tsx`)
- Tables without `scope="col"` on headers (`DynamicFormRenderer.tsx`)
- Custom dropdown not keyboard accessible (`RecordBrowser.tsx`)
- Missing `rel="noopener noreferrer"` on some external links
- Images without fallback alt text (`Header.tsx`)
- `useRecords` refetches on window focus unnecessarily
- Generic "Loading..." message without context (`LoadingScreen.tsx`)
- Using array index as React `key` fallback (`AuditPage.tsx`)
- Inline styles instead of CSS classes (`RecordListPage.tsx`)
- `useMemo` without proper dependencies (`RecordListPage.tsx`)
- Buttons without explicit `type="button"`
- Empty or suppressed `catch` blocks

---

### 🟢 Low Issues (8)

#### 36-43. Minor Issues
- Unused imports (`AuditPage.tsx`)
- Inconsistent naming (`card.tsx` vs `card-new.tsx`)
- Commented-out code (`useAuth.tsx` line 746)
- Missing JSDoc on utilities (`src/lib/utils.ts`)
- `console.warn` in production (`useAuth.tsx`)
- Inconsistent quote styles across files
- Magic numbers (5000ms timeout hardcoded)
- Hardcoded `PAGE_SIZE = 12`

---

## Part II: Backend/Services Review (47 files analyzed)

### 🔴 Critical Issues (3)

#### C1. Hardcoded CreatedBy in recordStorage
- **File:** `src/services/recordStorage.ts` (line 286)
- **Description:** `_createdBy = 'akh.dev185@gmail.com'` is hardcoded for all records created without explicit user attribution.
- **Impact:** Incorrect audit trail. Cannot track who actually created records.
- **Fix:** Call `supabase.auth.getUser()` and use the actual authenticated user's ID.

#### C2. No Authentication Check Before Write Operations
- **File:** `src/services/recordStorage.ts` — `create`, `update`, `delete` operations
- **Description:** No `supabase.auth.getUser()` validation before any write operation. Any logged-in user can modify any record.
- **Impact:** Complete lack of write authorization. Data integrity at risk.
- **Fix:** Validate the authenticated user before every write. Add user ID to operation metadata.

#### C3. Database Error Messages Leaked to User
- **File:** `src/services/recordStorage.ts` (lines 321-333)
- **Description:** Raw Supabase error codes (e.g., `23505` duplicate key) are returned directly to the UI.
- **Impact:** Information disclosure. Attackers can probe the database schema.
- **Fix:** Map database errors to generic user-friendly messages. Log details internally.

---

### 🟠 High Issues (6)

#### H1. Password Stored in User Object
- **File:** `src/hooks/useAuth.tsx` (line 601)
- **Description:** In fallback mode, `password` is included in the `AppUser` object that may be serialized or logged.
- **Impact:** Credential exposure in logs, localStorage, or memory dumps.
- **Fix:** Never store passwords in user objects. Keep authentication separate from user data.

#### H2. XSS in Export Functionality
- **Files:** `src/services/fileExport.ts`, `src/services/docxExport.ts`
- **Description:** Exported CSV/JSON/DOCX values are not sanitized. A record containing `<script>` in a field could execute when the export is opened.
- **Impact:** XSS vulnerability in exported files.
- **Fix:** Sanitize all exported values. Use proper escaping for CSV (RFC 4180).

#### H3. Race Condition in Serial Generation
- **File:** `src/services/recordStorage.ts` (lines 254-278)
- **Description:** Fetches existing serials, then generates new one in two steps. Two concurrent requests could generate the same serial.
- **Impact:** Duplicate serial numbers, primary key conflicts.
- **Fix:** Use database-level auto-increment or `SELECT FOR UPDATE` transaction.

#### H4. Audit Log Failures Silenced
- **File:** `src/services/auditLog.ts` (line 111)
- **Description:** `appendAuditLog` failures are logged to `console.error` only. No retry, no alerting.
- **Impact:** Audit trail gaps go undetected.
- **Fix:** Implement retry logic with exponential backoff. Surface critical failures to user.

#### H5. Orphan UUID in Audit Log
- **File:** `src/services/auditLog.ts` (line 96)
- **Description:** When a record ID is missing, `crypto.randomUUID()` is used. Creates orphan audit entries that don't link to actual records.
- **Impact:** Broken audit trail. Unlinkable audit entries.
- **Fix:** Reject audit log entries without valid record IDs.

#### H6. Unbounded form_data Size
- **File:** `src/services/recordStorage.ts` — `form_data` parameter
- **Description:** No size limit on `form_data` JSONB payload. Extremely large payloads could cause DoS.
- **Impact:** Denial of service via large payloads.
- **Fix:** Reject `form_data` larger than 1MB before database insertion.

---

### 🟡 Medium Issues (7)

#### M1. N+1 Queries in Audit Log Retrieval
- **File:** `src/services/auditLog.ts` (lines 141-159)
- **Description:** `getAuditLogForSerial` executes two separate queries — one for `record_id`, then another for audit entries.
- **Fix:** Use a single JOIN query.

#### M2. Hardcoded PerformedBy in Status Change
- **File:** `src/services/recordStorage.ts` (line 554)
- **Description:** `changeRecordStatus` passes `'akh.dev185@gmail.com'` as `performed_by`.
- **Fix:** Use authenticated user's ID.

#### M3. Stale Admin Role Cache
- **File:** `src/services/eventBus.ts` (lines 109-136)
- **Description:** `_cachedAdminIds` never expires. Role changes don't reflect until page reload.
- **Fix:** Add timestamp-based cache invalidation.

#### M4. TypeScript Types Don't Match Database
- **File:** `src/integrations/supabase/types.ts`
- **Description:** `audit_log` columns (e.g., `action`) defined as `string` but should be constrained.
- **Fix:** Generate types from actual database schema using `supabase gen types`.

#### M5. Generic Error Messages in useAuth
- **File:** `src/hooks/useAuth.tsx` (lines 185, 313, 400)
- **Description:** `console.error("Error")` provides zero debugging information.
- **Fix:** Include context and actual error objects.

#### M6. Conflicting Data Source Comments
- **Files:** `src/services/recordStorage.ts` and `src/hooks/useRecordStorage.ts`
- **Description:** One claims "Supabase ONLY", another claims "source of truth = Sheets". Inconsistent documentation.
- **Fix:** Update comments to reflect actual architecture.

#### M7. No Rate Limiting
- **File:** `src/services/recordStorage.ts`
- **Description:** No limits on create/update/delete operations per user per minute.
- **Fix:** Implement client-side rate limiting or use Supabase RLS with rate limit policies.

---

### 🟢 Low Issues (3)

- Missing `useCallback` on some functions (`useAuth.tsx`)
- `escapeCSV` doesn't handle all edge cases (`fileExport.ts`)
- No validation of `window.location.origin` (`useAuth.tsx` line 858)

---

## Part III: Architecture & Infrastructure Review

### 🔴 Critical Issues (3)

#### A1. TypeScript Strict Mode Disabled
- **File:** `tsconfig.app.json`
- **Description:**
  ```json
  "strict": false,
  "noImplicitAny": false,
  "strictNullChecks": false
  ```
- **Impact:** TypeScript provides almost no runtime safety. Null/undefined errors will crash the app silently. Type mismatches go undetected.
- **Fix:** Enable `strict: true` gradually. Start with `strictNullChecks: true`, then `noImplicitAny: true`.

#### A2. Security Vulnerabilities in Dependencies
- **File:** `package.json`
- **Findings:** 8 vulnerabilities from `npm audit`:
  - `concurrently`: **Critical** (shell-quote dependency)
  - `shell-quote`: **Critical**
  - `axios`: **High**
  - `@xmldom/xmldom`: **High**
  - `postcss`: **Medium**
  - `react-router` / `react-router-dom`: **Medium**
- **Impact:** Remote code execution, prototype pollution, XSS.
- **Fix:** Run `npm audit fix`. Update affected packages. Consider `npm audit fix --force` for critical issues.

#### A3. No Test Infrastructure
- **Finding:** Only 3 test files exist across 243 source files (1.2% coverage)
- **Files:**
  - `src/hooks/__tests__/useDebounce.test.ts`
  - `src/hooks/__tests__/useFilter.test.ts`
  - `src/__tests__/statusService.test.ts`
- **Impact:** Zero confidence in changes. Regressions go undetected. Manual testing burden.
- **Fix:** Add Vitest + React Testing Library. Start with critical paths: auth, record CRUD, form validation.

---

### 🟠 High Issues (5)

#### A4. Duplicate UI Components
- **Files:**
  - `src/components/ui/error-boundary.tsx` + `ErrorBoundary.tsx`
  - `src/components/ui/card.tsx` + `card-new.tsx`
  - `src/components/ui/skeleton.tsx` + `skeletons.tsx`
- **Impact:** Bundle bloat, confusion for developers, potential import errors on case-insensitive filesystems (Windows/macOS).
- **Fix:** Audit and merge duplicates. Keep the better implementation. Delete the rest.

#### A5. Relative Imports Instead of Alias
- **Files:** Multiple pages use `../data/formSchemas` instead of `@/data/formSchemas`
- **Impact:** Refactoring is painful. Moving files breaks imports.
- **Fix:** Migrate all imports to use `@/` alias consistently.

#### A6. God Pages
- **Findings:**
  - `SWOTAnalysisPage.tsx`: **888 lines**
  - `AdminPanel.tsx`: **649 lines**
  - `KPIDashboardPage.tsx`: **646 lines**
  - `RecordViewPage.tsx`: **631 lines**
- **Impact:** Unmaintainable code. Merge conflicts. Testing difficulty.
- **Fix:** Extract components. Split by concern (data fetching, presentation, actions).

#### A7. No Import/Backup System
- **Finding:** Export exists (JSON, CSV, DOCX) but no Import functionality.
- **Impact:** Data portability is one-way. Cannot restore from backup or migrate data.
- **Fix:** Add CSV/JSON import with validation. Add automated backup to cloud storage.

#### A8. Incomplete Audit Trail UI
- **Finding:** `auditLog.ts` stores changes but:
  - No UI to view audit trail per record
  - No filtering or search in audit logs
  - No export for audit logs
- **Impact:** Compliance auditors cannot review change history. QMS requirement not fully met.
- **Fix:** Add Audit Log page with filtering by date, user, action, serial.

---

### 🟡 Medium Issues (5)

#### A9. Unused Dependencies
- **Packages:** `@hookform/resolvers`, `@radix-ui/react-toast`, `adm-zip`, `docxtemplater`, `pizzip`, `sucrase`
- **Impact:** Bundle bloat, longer install times, potential security surface.
- **Fix:** Remove unused packages. Run `depcheck` periodically.

#### A10. Outdated Dependencies
- **Findings:**
  - `react-day-picker@8.10.1` — v9.x available
  - `lucide-react@0.462.0` — newer versions available
  - `tailwindcss@3.4.17` — v4 available
- **Impact:** Missing bug fixes and features.
- **Fix:** Update in controlled batches with testing.

#### A11. Console Logging in Production
- **Files:** `auditLog.ts`, `logger.ts`, `ruleEngine.ts`
- **Impact:** Log spam in production console. Potential data leakage in logs.
- **Fix:** Use conditional logging (`import.meta.env.DEV`).

#### A12. Hardcoded API URLs
- **File:** `SettingsModal.tsx` — `http://localhost:3001/api/auth`
- **Impact:** Breaks in production. Developers must remember to change URLs.
- **Fix:** Use environment variables for all API endpoints.

#### A13. useAuth.tsx is 901 Lines
- **File:** `src/hooks/useAuth.tsx`
- **Description:** Mixes local auth, Supabase auth, and user management in one file.
- **Impact:** Unmaintainable. Testing is nearly impossible.
- **Fix:** Split into: `useLocalAuth.ts`, `useSupabaseAuth.ts`, `useUserManagement.ts`.

---

### 🟢 Low Issues (7)

- `vercel.json` missing `framework: "vite"` and build settings
- `vite.config.ts` has risky `mode === 'test'` conditional
- Proxy hardcoded to `localhost:3001`
- `build-timestamp.txt` is empty
- No `index.ts` barrel exports for components/hooks
- `axios` installed but unused (uses `fetch` and Supabase)
- `crypto.randomUUID()` used as fallback in audit log

---

## Positive Findings

Despite the issues, QBase has strong architectural foundations:

| Strength | Evidence |
|----------|----------|
| ✅ Lazy Loading | `App.tsx` uses `React.lazy()` for code splitting |
| ✅ Manual Chunks | Vite config splits vendor bundles for caching |
| ✅ Error Boundaries | Page-level error boundaries in place |
| ✅ Zod Validation | `formValidation.ts` validates all form data |
| ✅ Tailwind + clsx | Proper CSS class management |
| ✅ React Query | `useRecordStorage.ts` uses TanStack Query |
| ✅ Dark Mode | Theme provider with system preference detection |
| ✅ DOCX Templates | Word-style form templates (F08, F09, etc.) |
| ✅ Prev/Next Navigation | RecordViewPage has serial navigation |
| ✅ 248 Records Migrated | All QMS DOCX records successfully migrated |

---

## Top 10 Priority Fixes

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| 1 | Enable TypeScript strict mode | Medium | Very High |
| 2 | Fix npm audit vulnerabilities | Low | Critical |
| 3 | Remove `error-boundary.tsx` (clears localStorage) | Low | Critical |
| 4 | Add auth checks to recordStorage writes | Medium | Critical |
| 5 | Fix console.error("Error") in useAuth.tsx | Low | High |
| 6 | Remove hardcoded admin credentials | Low | Critical |
| 7 | Add test infrastructure (Vitest + RTL) | High | High |
| 8 | Split useAuth.tsx into smaller hooks | Medium | High |
| 9 | Add Import/Backup functionality | High | High |
| 10 | Fix Sidebar infinite loop | Low | Medium |

---

## Audit Metadata

- **Date:** 2026-06-11
- **Auditor:** Hermes Agent (Multi-subagent review)
- **Scope:** Frontend, Backend/Services, Architecture/Infrastructure
- **Files Analyzed:** 243+ TypeScript/TSX files
- **Tools Used:** ESLint, npm audit, depcheck, manual code review
- **Production URL:** https://qbase-sable.vercel.app
- **Source:** `/mnt/ahmed/Projects/qbase/`
- **Database:** Supabase PostgreSQL

---

## Appendix: File References

### Reports Generated
1. `/mnt/ahmed/Projects/qbase/ARCHITECTURE_REVIEW_AR.md` — Architecture findings
2. `/home/Kepv/qbase-code-review-report.md` — Frontend findings

### Key Files Modified During Previous Fixes
- `src/data/formSchemas.ts` — Added common fields, fixed `complies` type
- `src/schemas/formValidation.ts` — Added `.passthrough()`, rebuilt F09/F10/F50 schemas
- `src/pages/RecordViewPage.tsx` — Edit mode template rendering, prev/next nav
- `src/components/templates/F09Template.tsx` — Minor radio fix
- `eslint.config.js` — Disabled false-positive warnings

---

*This report is a living document. Update it as issues are resolved and new ones are discovered.*
