---
phase: 06-session-core-refine-loop
plan: 06
subsystem: ui
tags: [generator-shell, session, refine, integration-tests]
requires:
  - phase: 06-01..06-05
    provides: session reducer, streamGenerate, suggest API, session UI primitives, refine-aware form/preview, session and suggestions hooks
provides:
  - GeneratorShell rewritten on useGeneratorSession/useSuggestions/SessionBar/NewComponentDialog/useUndoShortcut
  - Shell integration tests (11)
affects: [07, 08]
tech-stack:
  added: []
  patterns: [single status source, derived code panel from pending/committed]
key-files:
  created:
    - src/components/generator/generator-shell.test.tsx
  modified:
    - src/components/generator/generator-shell.tsx
key-decisions:
  - "SandboxPreview onRegenerate is omitted while the shell error banner is shown, so only one 'Tentar de novo' button exists at a time"
requirements-completed: []
duration: 15min
completed: 2026-10-17
---

# Phase 6 Plan 06: GeneratorShell Rewrite Summary

GeneratorShell now runs on the session architecture (useCompletion and its ref/effect machinery removed): refine mode after v1, "Pronto — vN" / "Refinando…" / "Voltou para vN" status in one aria-live region, live-streaming code panel that reverts on failure/stop, suggestion chips, session bar, confirmed reset and Ctrl/Cmd+Z undo.

## Tasks
1. Shell rewrite: c454924
2. Integration tests (11 cases covering the eight scenario groups): see git log (test(06-06))

## Verification
Full `npx vitest run` 22 files / 232 tests pass; `npm run typecheck` and `npm run lint` clean. Playwright not run here.

## Deviations from Plan
- [Rule 3] The runtime-error alert in SandboxPreview and the shell banner could both render "Tentar de novo"; the preview's retry is now only passed when no shell error is showing.

## Known Stubs
None.

## Self-Check: PASSED
