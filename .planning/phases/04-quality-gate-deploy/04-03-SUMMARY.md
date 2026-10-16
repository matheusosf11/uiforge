---
phase: 04-quality-gate-deploy
plan: 03
subsystem: preview
tags: [preview, sandbox, color-scheme, cleanup]
requires: [04-01, 04-02]
provides: [always-light preview, sandbox invariant test, hasDefaultExport module]
affects: [README dependency story]
tech-stack:
  removed: ["@codesandbox/sandpack-react"]
key-files:
  created:
    - src/components/generator/sandbox-preview.test.tsx
    - src/lib/has-default-export.ts
    - src/lib/has-default-export.test.ts
  modified:
    - src/lib/preview-srcdoc.ts
    - src/lib/preview-srcdoc.test.ts
    - src/components/generator/sandbox-preview.tsx
    - package.json
    - package-lock.json
  deleted:
    - src/lib/sandpack-files.ts
    - src/lib/sandpack-files.test.ts
    - src/components/sandpack/sandpack-css.tsx
    - src/components/generator/preview-error.tsx
decisions:
  - "D-17: preview is always color-scheme light (meta, CSS and iframe style); supersedes Phase 3 D-10"
metrics:
  completed: 2026-10-16
requirements: [QUAL-01]
---

# Phase 4 Plan 03: Preview hardening Summary

Preview is now always light (meta, srcdoc CSS, iframe style), the iframe `sandbox="allow-scripts"` invariant has an RTL regression test, and all dead Sandpack code plus the dependency are removed.

## Commits
- a63720e: feat(04-03): force preview always light and guard sandbox invariant
- b8a7dc1: chore(04-03): remove dead Sandpack code and dependency

## Verification
grep re-check confirmed the only runtime importer was sandbox-preview.tsx (hasDefaultExport); sandpack-css and preview-error had no importers. `npm run lint`, `npm run typecheck`, `npm test` (11 files, 82 tests) and `npm run build` all pass. No Sandpack references remain in src or package.json.

## Deviations from Plan
None. Plan executed as written. Only change beyond the letter of the plan: `html { color-scheme: light; }` was added as its own CSS rule in the srcdoc style block.

## Notes
QUAL-01 listed in plan frontmatter; QUAL-02 not touched (needs 04-04 e2e).

## Self-Check: PASSED
