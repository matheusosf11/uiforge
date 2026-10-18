---
phase: 06-session-core-refine-loop
plan: 01
subsystem: ui
tags: [reducer, streaming, vitest, session]
requires:
  - phase: 05-refine-api-contract-edit-prompt
    provides: /api/generate currentCode contract and status codes
provides:
  - Pure session reducer (versions, cursor, pending, stale-id guard, truncate-at-commit, 20-cap)
  - streamGenerate fetch stream with discriminated result
affects: [06-02, 06-03, 07, 08]
tech-stack:
  added: []
  patterns: [id-guarded reducer actions, discriminated stream result]
key-files:
  created:
    - src/lib/session.ts
    - src/lib/session.test.ts
    - src/lib/stream-generate.ts
    - src/lib/stream-generate.test.ts
  modified: []
key-decisions:
  - "Truncation happens only at COMMIT, never at START"
  - "RESET keeps nextVersionId monotonic"
requirements-completed: [ITER-01, ITER-02, ITER-05, ITER-07, QUAL-06]
duration: 10min
completed: 2026-10-17
---

# Phase 6 Plan 01: Session Reducer and streamGenerate Summary

Pure session reducer with request-id stale guard, commit validation (non-empty + export default), truncate-at-commit, 20-version cap, plus a `streamGenerate` fetch reader that never reports ok on mid-stream errors.

## Tasks
1. Session reducer + tests (16 tests) - commit 2c5dd23
2. streamGenerate + tests (10 tests) - commit c438a25

## Deviations from Plan
None - plan executed as written. (A test helper was adjusted because jsdom's DOMException is not `instanceof Error`; test-only.)

## Known Stubs
None.

## Self-Check: PASSED
Vitest 26/26 passing, `npm run typecheck` clean, package.json untouched.
