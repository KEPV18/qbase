# Linear Issues Export
## Generated from Code Review - April 1, 2026

---

## 🔴 Critical Priority

### Issue 1: Hardcoded Supabase Credentials
**Priority:** Critical  
**Labels:** security, backend, critical  
**State:** Todo

**Description:**
The Supabase anon key is hardcoded in `src/integrations/supabase/client.ts` which poses a security vulnerability.

**Current Code:**
```typescript
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2YnF6ZW5weHNkdWhoaGlrYmN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MTU4NjUsImV4cCI6MjA4NTk5MTg2NX0.QegWahbjFcbopke8fnnUbvrZa7Lrcc6WKQVWN3vDiNw"
```

**Acceptance Criteria:**
- [ ] Move key to environment variable (VITE_SUPABASE_ANON_KEY)
- [ ] Remove hardcoded fallback
- [ ] Rotate the exposed key in Supabase dashboard
- [ ] Update deployment docs

**Estimated Effort:** 2 hours

---

### Issue 2: Remove TypeScript 'as any' Assertions
**Priority:** Critical  
**Labels:** typescript, quality, technical-debt  
**State:** Todo

**Description:**
47 instances of `as any` type assertions found across codebase, bypassing type safety.

**Examples:**
- `src/components/records/RecordCard.tsx:51` - `(record as any).isAtomic`
- `src/hooks/useAuth.tsx:23` - `(user as any).role`

**Acceptance Criteria:**
- [ ] Define proper interfaces/types
- [ ] Replace all `as any` with proper types
- [ ] Enable strict TypeScript rules
- [ ] Fix resulting type errors

**Estimated Effort:** 8 hours

---

### Issue 3: Add React Error Boundaries
**Priority:** Critical  
**Labels:** react, ui, stability  
**State:** Todo

**Description:**
No error boundaries implemented. App crashes completely on component errors.

**Acceptance Criteria:**
- [ ] Create ErrorBoundary component
- [ ] Wrap main routes
- [ ] Add fallback UI
- [ ] Log errors to monitoring service

**Estimated Effort:** 4 hours

---

### Issue 4: Implement Input Validation
**Priority:** Critical  
**Labels:** security, validation, api  
**State:** Todo

**Description:**
No input validation on forms or API endpoints. Risk of injection attacks.

**Acceptance Criteria:**
- [ ] Add Zod schemas for all inputs
- [ ] Validate forms before submit
- [ ] Validate API payloads
- [ ] Sanitize user inputs

**Estimated Effort:** 12 hours

---

## 🟠 High Priority

### Issue 5: Refactor Large Components
**Priority:** High  
**Labels:** refactoring, components, architecture  
**State:** Todo

**Description:**
Multiple components exceed 300 lines, violating Single Responsibility Principle.

**Files:**
- `src/components/records/RecordCard.tsx` (350 lines)
- `src/components/dashboard/QuickActions.tsx` (430 lines)
- `src/pages/ModulePage.tsx` (600 lines)

**Acceptance Criteria:**
- [ ] Split RecordCard into sub-components
- [ ] Extract QuickActions logic
- [ ] Break ModulePage into sections
- [ ] All components < 150 lines

**Estimated Effort:** 16 hours

---

### Issue 6: Fix useEffect Dependencies
**Priority:** High  
**Labels:** react, hooks, bugs  
**State:** Todo

**Description:**
12 instances of missing useEffect dependencies causing stale closures.

**Example:**
```typescript
useEffect(() => {
  loadFiles();
}, []); // Missing: record.code
```

**Acceptance Criteria:**
- [ ] Fix all eslint exhaustive-deps warnings
- [ ] Add proper dependency arrays
- [ ] Extract to custom hooks where needed

**Estimated Effort:** 6 hours

---

### Issue 7: Add Loading States
**Priority:** High  
**Labels:** ui, ux, loading  
**State:** Todo

**Description:**
Components show blank/empty screens during data fetching.

**Acceptance Criteria:**
- [ ] Add skeleton loaders to lists
- [ ] Add spinners to buttons
- [ ] Show progress for file uploads
- [ ] Add optimistic updates

**Estimated Effort:** 8 hours

---

### Issue 8: Implement API Retry Logic
**Priority:** High  
**Labels:** api, reliability, error-handling  
**State:** Todo

**Description:**
API calls fail permanently on network errors. No retry mechanism.

**Acceptance Criteria:**
- [ ] Add exponential backoff
- [ ] Max 3 retry attempts
- [ ] Show user-friendly error messages
- [ ] Cache successful responses

**Estimated Effort:** 6 hours

---

### Issue 9: Add React Query (TanStack Query)
**Priority:** High  
**Labels:** react, data-fetching, caching  
**State:** Todo

**Description:**
Replace manual data fetching with React Query for better caching and UX.

**Benefits:**
- Automatic caching
- Background refetching
- Optimistic updates
- Error handling

**Acceptance Criteria:**
- [ ] Install @tanstack/react-query
- [ ] Replace useEffect data fetching
- [ ] Add query keys
- [ ] Implement mutations

**Estimated Effort:** 16 hours

---

### Issue 10: Improve Accessibility (a11y)
**Priority:** High  
**Labels:** accessibility, ui, ux  
**State:** Todo

**Description:**
Multiple accessibility violations found.

**Issues:**
- Missing aria-labels on icon buttons
- Form inputs without labels
- No keyboard navigation
- Low color contrast

**Acceptance Criteria:**
- [ ] Add aria labels to all interactive elements
- [ ] Fix form label associations
- [ ] Add keyboard shortcuts
- [ ] Test with screen reader

**Estimated Effort:** 12 hours

---

## 🟡 Medium Priority

### Issue 11: Remove Console.log Statements
**Priority:** Medium  
**Labels:** cleanup, logging  
**State:** Todo

**Description:**
34 console.log statements in production code.

**Acceptance Criteria:**
- [ ] Remove all console.log
- [ ] Add proper logging service
- [ ] Configure log levels
- [ ] Add to eslint rules

**Estimated Effort:** 2 hours

---

### Issue 12: Clean Up Unused Imports
**Priority:** Medium  
**Labels:** cleanup, quality  
**State:** Todo

**Description:**
23 unused imports increasing bundle size.

**Acceptance Criteria:**
- [ ] Run eslint --fix
- [ ] Configure auto-removal
- [ ] Add to pre-commit hook

**Estimated Effort:** 1 hour

---

### Issue 13: Add Unit Tests
**Priority:** Medium  
**Labels:** testing, quality  
**State:** Todo

**Description:**
Current test coverage: 0%

**Acceptance Criteria:**
- [ ] Setup Vitest
- [ ] Add React Testing Library
- [ ] Test critical business logic
- [ ] Target: 70% coverage

**Estimated Effort:** 24 hours

---

### Issue 14: Implement Code Splitting
**Priority:** Medium  
**Labels:** performance, bundle-size  
**State:** Todo

**Description:**
No lazy loading implemented. Large initial bundle.

**Acceptance Criteria:**
- [ ] Add React.lazy to routes
- [ ] Lazy load heavy components
- [ ] Add loading boundaries
- [ ] Measure bundle size

**Estimated Effort:** 8 hours

---

### Issue 15: Add Prettier + ESLint Config
**Priority:** Medium  
**Labels:** tooling, quality  
**State:** Todo

**Description:**
Inconsistent code formatting across files.

**Acceptance Criteria:**
- [ ] Setup Prettier config
- [ ] Configure ESLint rules
- [ ] Add pre-commit hooks
- [ ] Format all files

**Estimated Effort:** 4 hours

---

## 📊 Summary

| Priority | Count | Total Effort |
|----------|-------|--------------|
| Critical | 4 | 26 hours |
| High | 6 | 64 hours |
| Medium | 5 | 39 hours |
| **Total** | **15** | **129 hours** |

---

## 🎯 Sprints

### Sprint 1 (Week 1): Security & Stability
- Issue 1: Hardcoded credentials
- Issue 3: Error boundaries
- Issue 11: Remove console.log

### Sprint 2 (Week 2): Code Quality
- Issue 2: Remove 'as any'
- Issue 12: Clean imports
- Issue 15: Prettier/ESLint

### Sprint 3 (Week 3-4): Architecture
- Issue 5: Refactor components
- Issue 6: Fix useEffect
- Issue 9: React Query

### Sprint 4 (Week 5): UX & Testing
- Issue 7: Loading states
- Issue 10: Accessibility
- Issue 13: Unit tests

---

**Generated:** April 1, 2026  
**Source:** CODE_REVIEW_REPORT.md
