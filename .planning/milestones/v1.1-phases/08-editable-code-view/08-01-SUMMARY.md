---
phase: 08-editable-code-view
plan: 01
subsystem: session-state
tags: [reducer, hook, manual-versions, tdd]
requires: []
provides:
  - "COMMIT_MANUAL reducer action (manual version after the cursor, truncation, 20-version cap)"
  - "SessionNotice 'manual' and SessionState.savedManualId (one-action carry)"
  - "canRegenerate false on manual versions"
  - "useGeneratorSession: send/retry/undo/restore accept an optional draft committed first"
affects: [08-04, 08-05]
tech-stack:
  added: []
  patterns:
    - "Eager stateRef advance (stateRef.current = next) + dispatch of the same pure action for same-handler sequencing"
key-files:
  created: []
  modified:
    - src/lib/session.ts
    - src/lib/session.test.ts
    - src/components/generator/use-generator-session.ts
    - src/components/generator/use-generator-session.test.tsx
decisions:
  - "appendVersion helper is shared by COMMIT and COMMIT_MANUAL; savedManualId = version.id only for notice 'manual'"
  - "START/UNDO/RESTORE/REJECT carry savedManualId only when the previous notice is 'manual' (one follow-up action)"
  - "commitManual ignores non-string drafts so the shell's onClick={session.undo} MouseEvent is harmless until 08-05"
  - "retry with a draft uses the new manual version as base instead of the error's original baseId"
metrics:
  duration: "~10 min"
  completed: 2026-10-18
  tasks: 2
  files: 4
---

# Phase 8 Plan 01: Manual-version session model Summary

The session reducer now has a COMMIT_MANUAL action. It saves edited code as a source "manual" version right after the cursor, drops the later versions and applies the 20-version cap. The session hook commits a draft eagerly before refine, retry, undo or restore, so a refine sends the edited code as `currentCode` and undo afterwards lands on the "Edição manual" version.

## Tasks

| Task | Name | Commits |
| ---- | ---- | ------- |
| 1 | Reducer COMMIT_MANUAL, savedManualId lifecycle, canRegenerate source rule | 51feb3f (RED), 5517358 (GREEN) |
| 2 | Hook eager commitManual and draft-aware send/undo/restore/retry | 9bfe64d (RED), 0685b4c (GREEN) |

## What was built

- `src/lib/session.ts`: `"manual"` notice, `savedManualId` field (null in the initial state and on RESET/COMMIT/FAIL/ABORT), the `COMMIT_MANUAL` action (no-op while pending, on an empty session or when the code is unchanged; no export-default check, per D-10), and a module-private `appendVersion` helper. `carriedManualId` keeps the id through one START/UNDO/RESTORE/REJECT. REJECT keeps the `"manual"` notice. `canRegenerate` now requires `source === "ai"`.
- `src/components/generator/use-generator-session.ts`: `commitManual(code: unknown)` checks `typeof code !== "string"` and the busy state, runs the reducer, sets `stateRef.current = next`, then dispatches. `send(text, draft?)` returns "ignored" before committing anything. `retry(draft?)` uses the manual version as base when there is one. `undo(draft?)` and `restore(id, draft?)` commit first. The keys of the returned object are unchanged.

## Verification

- `npx vitest run`: 24 files, 335 tests pass. That includes the new "COMMIT_MANUAL" (8), "savedManualId" (7), "canRegenerate with manual versions" (1) and "manual drafts" (11) blocks. generator-shell tests are still green.
- `npm run typecheck` and `npm run lint` are clean.

## TDD Gate Compliance

Each task has a RED `test(08-01)` commit followed by a GREEN `feat(08-01)` commit. No refactor commit was needed.

## Deviations from Plan

None. The plan was executed as written. I ran prettier by accident; it is not the project formatter and it reformatted lines outside this plan, so I reverted it before committing.

## Threat mitigations

- T-08-01: the oversized-draft test proves no request is sent and the error is too_large (the run() pre-check still applies to a manual base).
- T-08-02: the non-string draft guard is covered by the `{ type: "click" }` test.

## Self-Check: PASSED

- All 4 modified files exist, and commits 51feb3f, 5517358, 9bfe64d and 0685b4c are in `git log`.
