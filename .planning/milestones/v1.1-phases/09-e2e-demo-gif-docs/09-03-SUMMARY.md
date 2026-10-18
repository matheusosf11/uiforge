---
phase: 09-e2e-demo-gif-docs
plan: 03
subsystem: docs
tags: [readme, docs, api-contract, i18n]
requires: [docs/demo.gif and dark-only screenshot (09-02), e2e/journey.spec.ts (09-01)]
provides: [README.md and README.pt-BR.md for v1.1]
affects: [DOCS-01, DOCS-02]
tech-stack:
  added: []
  patterns: [EN/PT parity checked by heading count and identical backticked-token sets]
key-files:
  created: []
  modified: [README.md, README.pt-BR.md]
decisions:
  - "New 'API' section placed after Architecture, with every number taken from prompt-limits.ts, suggest.ts, rate-limit.ts and the route files"
  - "Stale v1.0 facts corrected while editing: the generate model fallback chain (3.8-flash, 3.6-flash, 3.5-flash-lite) and the preview runtime, now self-hosted from public/preview-runtime instead of jsDelivr (threat model and trade-offs updated)"
  - "Numbers in PT use pt-BR formatting (2.000, 30.000); values are identical"
metrics:
  duration: ~15min
  completed: 2026-10-18
---

# Phase 9 Plan 03: READMEs for v1.1 Summary

README.md and README.pt-BR.md now describe the shipped v1.1 product. Each has the demo GIF at the top with the D-08 alt text, only the dark screenshot, and an updated features list:
- refine by default and "Novo componente";
- suggestion chips;
- version history (restore, dimmed later versions, 20 versions, Ctrl/⌘+Z);
- editable code (draft, 500 ms debounce, "Edição manual", Esc then Tab);
- the dark-only UI with the topology background and the 3D robot (1536px and up, reduced-motion aware).

Each README also has a new API section for `/api/generate` and `/api/suggest`, plus updated architecture (mermaid and walk-through), env vars, testing, trade-offs and roadmap sections.

## Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Update README.md (EN) | af22ba3 | README.md |
| 2 | Mirror in README.pt-BR.md and commit both | af22ba3 | README.pt-BR.md |

Both tasks were committed together, as Task 2 specifies.

## Verification

- Plan grep gates pass for both files: every required token is present, and `screenshot-light`, `<!--` and the cut items "Generation history"/"Iterative refinement" are gone.
- Parity: 13 `## ` and 2 `### ` headings in each file. The sorted unique sets of backticked tokens are identical (empty `diff`).
- `npm run lint` is clean. No non-doc files changed, so vitest was not needed.
- `.env.example`, `theme-provider.tsx` and `vitest.setup.ts` were not staged.

## Deviations from Plan

**1. [Rule 1 - Bug] Stale facts in unchanged sections.** The v1.0 text said the preview loads from jsDelivr and that the model is a single `gemini-3.8-flash`. The code self-hosts the runtime in `public/preview-runtime` (commit 5987298) and uses a three-model fallback chain. The architecture, threat model and trade-offs text was corrected, which the plan allowed as "fixing facts that changed". The "CDN dependency of the preview" trade-off was replaced by an in-memory session note.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: README.md, README.pt-BR.md (both contain docs/demo.gif)
- FOUND: commit af22ba3
