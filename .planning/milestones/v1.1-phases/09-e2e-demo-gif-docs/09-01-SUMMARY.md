---
phase: 09-e2e-demo-gif-docs
plan: 01
subsystem: e2e
tags: [playwright, e2e, refine, journey, mock]
requires: [mock model refine + __edited__ + __e2e_error__ (Phase 6-8)]
provides: [e2e/journey.spec.ts full refine-loop journey]
affects: [QUAL-07]
tech-stack:
  added: []
  patterns: [serial single-test journey, waitForRequest + postDataJSON, alert filtered by text]
key-files:
  created: [e2e/journey.spec.ts]
  modified: []
decisions:
  - "Journey numbering follows the reducer truncation: the manual edit made on v1 becomes v2 and the refined result becomes v3 (D-01 wording said v3/v4)"
  - "Failed-refine alert is located with getByRole('alert').filter({ hasText: 'Sua versão anterior foi mantida' }) so the preview's load-timeout alert cannot match"
metrics:
  duration: ~10min
  completed: 2026-10-18
---

# Phase 9 Plan 01: Refine Journey E2E Summary

One serial Playwright test in Chromium on the deterministic mock. It runs generate, then refine (v2, request carries v1), undo to v1, a manual draft edit, a refine after the edit (request `currentCode` contains `__edited__`/`marca-journey`, "Edição manual" recorded, v3 shows `EditedSeen`), and finally a `__e2e_error__` refine that keeps v3 with the same code and preview and shows the alert.

## Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Write e2e/journey.spec.ts | 91ff387 | e2e/journey.spec.ts |
| 2 | Isolated Playwright run (port 3200) | (no code change) | - |

## Verification

- Isolated copy used for the final (and only) run: `C:\Users\mateu\AppData\Local\Temp\claude\C--Users-mateu-OneDrive--rea-de-Trabalho-projeto-portifolio\77b72327-b636-403a-84c1-43fa4f4640e3\scratchpad\e2e-run-0901` (git archive of 91ff387, node_modules junction).
- `E2E_PORT=3200 timeout 540 npx playwright test e2e/journey.spec.ts e2e/generate.spec.ts`: **11 passed, 0 failed** (34.4s). That is 10 generate.spec.ts tests plus the journey (5.3s). It took 1 Playwright run. The `[WebServer] e2e mock mid-stream failure` logs are expected and come from the `__e2e_error__` tests.
- `npx vitest run`: 27 files, 418 tests passed. `npm run typecheck` and `npm run lint` are clean.
- `e2e/generate.spec.ts` and `e2e/screenshots.spec.ts` are unchanged (D-02). The spec has exactly one `test(` call and contains no "Atualizando" or "Refinando" (D-03).

## Deviations from Plan

- **Numbering vs D-01 wording (planned deviation, kept):** the test asserts "Pronto — v3" and "v3 · 3 versões" after refining from the edit, not v4. COMMIT_MANUAL truncates to `versions.slice(0, cursor + 1)`, so the manual edit becomes v2. The D-01 intent is kept: an "Edição manual" version comes first, then the refined one, and `currentCode` contains the edit.
- **Alert locator:** the alert is filtered by text, not taken with `.first()`, as the plan-checker asked.

No other deviations.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: e2e/journey.spec.ts
- FOUND: commit 91ff387
