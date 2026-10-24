// ============================================================================
// QBase — the lint config, plus the coverage the base config was missing
// ============================================================================
//
// `eslint.config.js` is the base: the TypeScript / React sources, with
// `js.configs.recommended` and the TypeScript rules.
//
// This file composes that base and ADDS two things.  Nothing here relaxes
// a rule that the base sets.
//
// ── 1. The JavaScript and MJS files were never linted ──────────────────────
//
// The base config's `files` was `["**/*.{ts,tsx}"]`, so `npm run lint`
// reported "clean" while never opening a single `.js` or `.mjs` file in
// the repository: the root utilities, the local OAuth server, the
// postcss config and the local-stack probes were all outside the lint.
//
// The block below brings them in.  It is worth knowing what that found on
// its first run: `comprehensive_audit.cjs` incremented four counters that
// were declared inside a different function, so the script died with a
// `ReferenceError` the first time it met an offending record — and it
// never got that far, because it also read its schemas from a hardcoded
// path into another machine's workspace.  Both are fixed.
//
// ── 2. `react-hooks/exhaustive-deps` was "off" ─────────────────────────────
//
// A hook that closes over a value it did not list in its dependency array
// was not reported at all.  That is the shape of a stale closure: the
// effect runs with the value from the render that created it, and the
// page shows a number that no longer matches the state.
//
// The rule is switched on as a WARNING, not an error: `npm run lint` stays
// green, and every occurrence becomes visible.
// ============================================================================

import base from './eslint.config.js';
import reactHooks from 'eslint-plugin-react-hooks';
import js from '@eslint/js';
import globals from 'globals';

export default [
  // The base config only ignores `dist`.  The other two build outputs are
  // in the repository tree too, and linting compiled bundles produces
  // thousands of errors that say nothing about the source.
  //
  // `dist-*` is a PATTERN, not a list of the three directories that happen
  // to exist today: a build output is a build output whatever it is
  // called, and a fourth one (a throwaway verification build, a preview
  // under a new name) must not be able to fail the source gate with
  // hundreds of errors read out of a compiled bundle.
  { ignores: ['dist', 'dist-*', 'coverage', 'design-backups'] },

  ...base,

  // ── the JavaScript / MJS utilities ──────────────────────────────────────
  {
    ...js.configs.recommended,
    files: ['**/*.{js,mjs,cjs}'],
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.es2022 },
    },
    rules: {
      // These are one-off operational scripts, not a library: an unused
      // binding in one is a leftover, but a failing lint run over a script
      // nobody runs is noise, not signal.
      'no-unused-vars': 'warn',
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    // The local-stack probes are injected into a page and run in the
    // BROWSER, so they have `document` and not `process`.
    files: ['tools/local-stack/audit-sweep.mjs', 'tools/local-stack/design-probe.js'],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },

  // ── the React hooks rule, as a warning ──────────────────────────────────
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: { 'react-hooks/exhaustive-deps': 'warn' },
  },
];
