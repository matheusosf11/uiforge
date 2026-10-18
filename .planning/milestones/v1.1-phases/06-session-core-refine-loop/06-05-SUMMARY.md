---
phase: 06-session-core-refine-loop
plan: 05
subsystem: ui
tags: [react-hooks, session, suggestions, streaming]
requires:
  - phase: 06-01
    provides: sessionReducer, streamGenerate
  - phase: 06-02
    provides: /api/suggest, suggest helpers
provides:
  - useGeneratorSession (send/retry/stop/undo/reset with stale-safe commit)
  - useSuggestions (per-version cache, abort on id change, silent fallback)
affects: [06-06]
tech-stack:
  added: []
  patterns: [reqId ref + inFlight ref stale guard, cache keyed by requested id]
key-files:
  created:
    - src/components/generator/use-generator-session.ts
    - src/components/generator/use-generator-session.test.tsx
    - src/components/generator/use-suggestions.ts
    - src/components/generator/use-suggestions.test.tsx
  modified: []
key-decisions:
  - "send() computes commit validity with the same parseCode+hasDefaultExport rules as the reducer to return committed/failed"
  - "Suggest timeout implemented with a manual 10s timer (sets timedOut, aborts) so timeout falls back while id-change abort stores nothing"
requirements-completed: []
duration: 12min
completed: 2026-10-17
---

# Phase 6 Plan 05: Session and Suggestions Hooks Summary

React hooks wiring the session reducer and streamGenerate (useGeneratorSession) plus auto per-version suggestions with cache and silent fallback (useSuggestions); 20 new tests with injected fetch.

## Commits
- 286d940: useGeneratorSession + tests
- db65a1e: useSuggestions + tests

## Deviations from Plan
None - plan executed as written.

## Notes
- Requirements not marked complete per orchestrator instruction.
- Verified: new vitest files pass, typecheck and eslint clean, no dependencies added.

## Known Stubs
None.

## Self-Check: PASSED
