---
phase: 06-session-core-refine-loop
plan: 07
subsystem: testing
tags: [e2e, playwright, refine, uat]
requires:
  - phase: 06-06
    provides: GeneratorShell on session hooks
provides:
  - Refine smoke e2e (refine -> Pronto — v2 -> Desfazer -> v1; refine failure keeps v1)
  - Manual real-key UAT checklist for /api/suggest (06-UAT.md)
affects: [09]
tech-stack:
  added: []
  patterns: [mock-driven refine e2e]
key-files:
  created:
    - .planning/phases/06-session-core-refine-loop/06-UAT.md
  modified:
    - e2e/generate.spec.ts
key-decisions:
  - "Full journey e2e stays in Phase 9; this plan only adds a short smoke"
requirements-completed: [ITER-01, ITER-02, ITER-05, ITER-07, ITER-08, ITER-09, QUAL-06]
duration: 30min
completed: 2026-10-17
---

# Phase 6 Plan 07: Refine Smoke E2E + Suggest UAT Summary

Two refine smoke tests added under the e2e mock, plus a non-blocking manual real-key checklist for `/api/suggest`.

## Tasks
1. Refine smoke e2e: fd14eda
2. 06-UAT.md (manual /api/suggest checklist): cdc0a86

## Verification
`npx playwright test`: 6 passed, 2 skipped (README screenshot specs are opt-in). The existing v1.0 selectors ("Gerar", "Pronto") still work.

## Deviations from Plan
- The first e2e run hung because a leftover `next dev -p 3100` from the Phase 5 UAT held the port and Playwright reused it. Killed with user approval; re-run passed with no test changes.

## Known Stubs
None.

## Self-Check: PASSED
