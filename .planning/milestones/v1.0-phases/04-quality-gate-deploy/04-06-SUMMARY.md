---
phase: 04-quality-gate-deploy
plan: 06
subsystem: docs
tags: [readme, screenshots, playwright, i18n, threat-model]
requires: ["04-03", "04-04", "04-05"]
provides: [bilingual-readme, readme-screenshots, screenshot-spec]
affects: [README.md, README.pt-BR.md, docs/, e2e/screenshots.spec.ts]
key-files:
  created: [e2e/screenshots.spec.ts, docs/screenshot-light.png, docs/screenshot-dark.png, docs/README.md, README.pt-BR.md]
  modified: [README.md]
decisions:
  - "Screenshots are opt-in (SCREENSHOTS=1), taken against the mock-model production build"
  - "README placeholders OWNER / REPO / DEPLOY_URL are left for 04-08"
  - "QUAL-05 left Pending until 04-08 fills the real URL/owner placeholders"
metrics:
  completed: 2026-10-16
---

# Phase 4 Plan 06: Screenshots and Bilingual README Summary

Playwright-generated light/dark screenshots (opt-in, mock model) plus an interview-ready English README and a structurally identical PT-BR mirror, both describing the real sandboxed `srcdoc` iframe architecture.

## Tasks

| Task | Commit |
| ---- | ------ |
| 1. Screenshot spec + PNGs + docs/README.md | 140bcdc |
| 2. English README | a6d0a2c |
| 3. PT-BR README | a9f1887 |

## Notes

- Both READMEs have 12 H2 sections, mermaid diagram, threat model (isolated vs residual risks), trade-offs, testing, deployment, v2 roadmap, and the Portuguese-UI note.
- Threat-model claim verified: `grep dangerouslySetInnerHTML src` returns nothing; `sandbox-preview.test.tsx` asserts no `allow-same-origin`. Sandpack appears only as "removed" in trade-offs.
- Documented a residual risk found while reading code: the host `message` listener does not check `event.source` (impact limited to a text error line).
- `npm run e2e`: 4 passed, 2 skipped (screenshots). `npm test` (82), typecheck and lint pass.
- `docs/demo.gif` is a documented placeholder (commented-out image link in READMEs).

## Deviations from Plan

None - plan executed as written.

## Deferred

- OWNER / REPO / DEPLOY_URL placeholders and docs/demo.gif are filled in 04-08. QUAL-05 is therefore not marked complete here.

## Self-Check: PASSED
