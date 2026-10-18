---
phase: 07-turn-list-version-navigation
plan: 04
subsystem: generator-ui
tags: [turn-list, restore, session-bar, a11y, integration-tests]
requires:
  - "07-01: currentNumber, laterRange, droppedCount, session.restore, notice 'forward'"
  - "07-02: PromptForm turnList/baseNotice slots, CodeView scrollResetKey"
  - "07-03: TurnList, TurnTransient"
provides:
  - "Shell-level turn list with restore, base notice, transient rows and mobile disclosure"
  - "Stable-number session bar ('vN · M versões' / 'vN · 1 versão')"
affects:
  - "e2e strings ('vN de M' -> new counter) to be updated in 07-05"
tech-stack:
  added: []
  patterns:
    - "Status, base notice and transient row derived in render from session state (single aria-live region)"
key-files:
  created: []
  modified:
    - src/components/generator/session-bar.tsx
    - src/components/generator/session-bar.test.tsx
    - src/components/generator/generator-shell.tsx
    - src/components/generator/generator-shell.test.tsx
decisions:
  - "SessionBar prop renamed position -> number; shell passes currentNumber(state) ?? 1"
  - "scrollResetKey = committed.id only when not pending and notice is undo/forward"
  - "historyOpen lives in the shell; only doReset collapses it"
metrics:
  duration: "~15min"
  completed: 2026-10-18
  tasks: 2
  files: 4
---

# Phase 7 Plan 04: Shell wiring for the turn list Summary

Wired TurnList into GeneratorShell. It renders in the PromptForm slot once v1 exists and calls `session.restore`. Status texts now use stable numbers, including the new "Foi para vN". Other additions: the "Refinar a partir da vN — ..." base notice, transient "gerando…"/"erro" rows, the code panel scrolling to the top on undo or restore, and a `historyOpen` disclosure that collapses only on Novo componente. The session bar now reads "vN · M versões".

## Tasks

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | Stable-number session bar and shell wiring | 8dab7ed |
| 2 | Shell integration tests (10 cases in `describe("turn list")`) | d5125cb |

## Verification

- `npx vitest run`: 24 files, 293 tests passed
- `npm run typecheck`: clean
- `npm run lint`: clean
- Grep checks: no "cursor + 1", one `aria-live`, `setHistoryOpen(false)` inside doReset, "Foi para v" present, no "vN de M" assertions left in unit tests

## Deviations from Plan

None. Plan executed as written. No existing query became ambiguous because of the new list items, so no `within(...)` scoping changes were needed in the existing tests.

## TDD Gate Compliance

Task 2 (tdd="true") passed on the first run, without a RED stage: its implementation was already delivered in Task 1 of this same plan (by design, Task 1 wires the shell and Task 2 proves it). No product bug was exposed.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: src/components/generator/session-bar.tsx, generator-shell.tsx and both test files
- FOUND: commits 8dab7ed, d5125cb
