---
phase: 07-turn-list-version-navigation
plan: 03
subsystem: generator-ui
tags: [turn-list, history, a11y, presentational]
requires: ["07-01"]
provides:
  - "TurnItem (version button: before/current/later, busy-disabled)"
  - "TransientTurnItem (non-interactive gerando/erro row)"
  - "TurnList (mobile disclosure, own scroll region, cap line, ol keyed by version id)"
  - "scrollIntoContainer helper (container-only nearest scroll)"
  - "TurnTransient type"
affects: [07-04, 07-05]
tech-stack:
  added: []
  patterns: ["props-only presentational list", "container-only scroll via getBoundingClientRect diff in useLayoutEffect"]
key-files:
  created:
    - src/components/generator/turn-item.tsx
    - src/components/generator/turn-list.tsx
    - src/components/generator/turn-list.test.tsx
  modified: []
decisions:
  - "Cap line driven by droppedCount > 0 (not versions[0].id > 1), since ids survive RESET (D-17)"
  - "Only busy disables a version button; the current item stays enabled so focus is never dropped (D-19)"
  - "Auto-scroll deps include versions[cursor]?.id and open so it fires on commits at the cap and when the mobile region opens"
metrics:
  duration: "~6 min"
  completed: 2026-10-18
  tasks: 2
  files: 3
---

# Phase 7 Plan 03: Turn list presentational components Summary

Props-driven turn list: an `<ol aria-label="Histórico de versões">` of native version buttons with stable `v{N}` numbers, `aria-current` + `atual` badge on the current version, dimmed "Será descartada ao refinar." later versions, a non-interactive gerando/erro transient row, a cap line when versions were dropped, a mobile `Histórico (N)` disclosure, and a container-only auto-scroll helper.

## Tasks

| Task | Name | Commits |
|------|------|---------|
| 1 | TurnItem and TransientTurnItem | b1a4c7a (test), 323bbee (feat) |
| 2 | TurnList with disclosure, cap line and container-only scroll | 6d86b05 (test), 74fd75c (feat) |

## Verification

- `npx vitest run`: 24 files, 282 tests passed (22 new in turn-list.test.tsx)
- `npm run typecheck`: pass
- `npm run lint`: pass
- Grep gates: no `scrollIntoView`, no `dangerouslySetInnerHTML`, no `aria-live`; `key={v.id}`; `droppedCount > 0`; `motion-reduce:animate-none` present

## TDD Gate Compliance

RED (`test(07-03)`) commits precede GREEN (`feat(07-03)`) commits for both tasks. No refactor commit needed.

## Deviations from Plan

None - plan executed exactly as written.

## Threat Model

T-07-04 mitigated: all untrusted instruction text is rendered as React children/attributes only.

## Self-Check: PASSED

- FOUND: src/components/generator/turn-item.tsx, turn-list.tsx, turn-list.test.tsx
- FOUND commits: b1a4c7a, 323bbee, 6d86b05, 74fd75c
