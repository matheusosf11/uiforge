---
phase: 07-turn-list-version-navigation
plan: 01
subsystem: generator-session
tags: [reducer, history, restore, numbering]
requires: []
provides:
  - "RESTORE action (notice undo/forward, no truncation)"
  - "droppedCount + displayNumber/versionNumber/currentNumber/laterRange/hasDroppedVersions selectors"
  - "IN-01 guard: COMMIT with removed base keeps history"
  - "useGeneratorSession().restore(versionId)"
affects: [07-02, 07-03, 07-04, 07-05]
tech-stack:
  added: []
  patterns: ["pure reducer selectors for display numbering", "hook mirrors reducer guard for SendResult"]
key-files:
  created: []
  modified:
    - src/lib/session.ts
    - src/lib/session.test.ts
    - src/components/generator/use-generator-session.ts
    - src/components/generator/use-generator-session.test.tsx
decisions:
  - "Backward RESTORE reuses notice 'undo'; forward uses new 'forward' notice (D-20)"
  - "Display numbers = droppedCount + index + 1; ids stay internal; RESET zeroes droppedCount but keeps nextVersionId (D-17)"
  - "IN-01 guard keeps non-null baseId in the error so retry falls back to the committed version instead of regenerating from scratch"
metrics:
  duration: "~5 min"
  completed: 2026-10-18
  tasks: 2
  files: 4
---

# Phase 7 Plan 01: Session restore and stable numbering Summary

The reducer now has a non-truncating RESTORE action (undo/forward notices), stable display numbers based on a `droppedCount` that survives the 20-version cap and goes back to zero on RESET, and an IN-01 guard so a COMMIT whose base is gone no longer wipes history. The hook exposes `restore(versionId)`.

## Tasks

| Task | Name | Commits |
| ---- | ---- | ------- |
| 1 | RESTORE, numbering selectors, IN-01 guard (TDD) | c8adb64 (test), 6983359 (feat) |
| 2 | Hook restore() + commit base check (TDD) | acd4cf0 (test), 0f05d51 (feat) |

## Verification

- `npx vitest run`: 22 files, 253 tests passed
- `npm run typecheck`: clean
- `npm run lint`: clean

## Deviations from Plan

None. The plan was followed as written. The IN-01 guard keeps `baseId` non-null on purpose, which the plan already specified as a departure from the research snippet.

## TDD Gate Compliance

Both tasks have a RED `test(07-01)` commit followed by a GREEN `feat(07-01)` commit.

## Self-Check: PASSED
