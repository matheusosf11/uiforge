---
phase: 07-turn-list-version-navigation
plan: 05
subsystem: e2e
tags: [playwright, e2e, turn-list, restore, smoke]
requires:
  - "07-04: shell-level turn list, restore, base notice, stable-number session bar"
provides:
  - "e2e refine smoke on the new counter ('v2 · 2 versões' / 'v1 · 1 versão')"
  - "Real-browser restore smoke (restore v1, forward to v2)"
affects:
  - "Phase 9 full refine journey builds on this smoke"
tech-stack:
  added: []
  patterns:
    - "Re-query turn buttons by their new accessible name after restore (names change with position)"
key-files:
  created: []
  modified:
    - e2e/generate.spec.ts
decisions:
  - "Ran the whole Playwright suite (per orchestrator instruction) instead of only e2e/generate.spec.ts; screenshots.spec.ts self-skips without SCREENSHOTS=1"
metrics:
  duration: "~10min"
  completed: 2026-10-18
  tasks: 2
  files: 1
---

# Phase 7 Plan 05: e2e counter update and restore smoke Summary

The e2e refine smoke now checks the stable-number counter ("v2 · 2 versões", "v1 · 1 versão"). A new "restore an earlier turn from the list" test covers HIST-01/02/03/05 in a real browser:

- the list "Histórico de versões" shows 2 items, and v2 has `aria-current="true"`;
- "Restaurar v1" shows "Voltou para v1", puts the v1 preview back and shows the base notice "Refinar a partir da v1 — v2 será descartada";
- focus stays on the v1 button, now named "v1, versão atual: ...";
- "Restaurar v2: ... Será descartada ao refinar." shows "Foi para v2" and the refined preview.

## Tasks

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | Update counter strings and add restore smoke | 18cda56 |
| 2 | Run Playwright with a clean port and hard timeout (no file changes) | n/a |

## Verification

- Port 3100 was free before the run and free after it (`netstat` printed nothing). No processes were killed.
- `timeout 540 npx playwright test --reporter=line`: **7 passed, 2 skipped, 0 failed** (45.2s). The 2 skipped tests are in `e2e/screenshots.spec.ts`, which skips itself unless SCREENSHOTS=1. The `[WebServer]` "e2e mock mid-stream failure" logs come from the error-path tests and are expected.
- Playwright needed 1 of the 2 allowed runs.
- `npx vitest run`: 24 files, 293 tests passed
- `npm run typecheck`: clean
- `npm run lint`: clean
- No "v2 de 2" / "v1 de 1" left in e2e/generate.spec.ts. `e2e/screenshots.spec.ts` is unchanged.

## Deviations from Plan

None. The orchestrator asked for the full suite with `--reporter=line`, so that is what ran instead of the plan's `e2e/generate.spec.ts --reporter=list`.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: e2e/generate.spec.ts (contains "v2 · 2 versões", "Restaurar v1", "Foi para v2", "Refinar a partir da v1 — v2 será descartada")
- FOUND: commit 18cda56
