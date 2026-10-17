---
phase: 02-sandboxed-live-preview
plan: 02
subsystem: ui
tags: [sandpack, tailwind-v4, externalResources, error-overlay, preview]

# Dependency graph
requires:
  - phase: 02-sandboxed-live-preview
    provides: Preview-only Sandpack iframe, react-ts files map, SandpackCss injection, mount-on-finish snapshot
provides:
  - Tailwind v4 Play CDN in the iframe via pinned jsDelivr externalResources
  - Host role=alert from useErrorMessage plus Sandpack ErrorOverlay
  - hasDefaultExport guard with Portuguese missing-default alert that still mounts Sandpack
affects: [03-export-examples-accessible-ux, 04-quality-gate-deploy]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Load iframe Tailwind via options.externalResources, never host npm @tailwindcss/browser
    - Pin jsDelivr @tailwindcss/browser@4.3.3; never use the v3 Play CDN
    - PreviewErrorBanner must be a child of SandpackProvider (useErrorMessage)
    - Keep showSandpackErrorOverlay on; render bundler errors as text children

key-files:
  created:
    - src/components/generator/preview-error.tsx
  modified:
    - src/components/generator/sandbox-preview.tsx
    - src/lib/sandpack-files.ts
    - src/lib/sandpack-files.test.ts

key-decisions:
  - "Pinned jsDelivr @tailwindcss/browser@4.3.3 on SandpackProvider.externalResources; did not install the host package or use cdn.tailwindcss.com"
  - "hasDefaultExport is /export\\s+default/; export { Foo as default } is an accepted miss (RESEARCH OQ3) and still mounts Sandpack"
  - "PreviewErrorBanner lives inside SandpackProvider; overlay stays on; missing-default Portuguese alert does not skip the iframe"

patterns-established:
  - "Pattern 3: Tailwind-in-iframe via externalResources + pinned @tailwindcss/browser@4.3.3"
  - "Pattern 6: ErrorOverlay + host useErrorMessage() role=alert; never showSandpackErrorOverlay={false}"

requirements-completed: [PREV-02, PREV-03]

# Metrics
duration: 3min
completed: 2026-10-15
---

# Phase 2 Plan 02: Tailwind-in-sandbox + preview error state Summary

**Pinned jsDelivr `@tailwindcss/browser@4.3.3` on `externalResources` so v4 utilities style the iframe, with a host `role="alert"` from `useErrorMessage()` plus ErrorOverlay so compile/runtime failures are never a blank preview**

## Performance

- **Duration:** 3 min
- **Started:** 2026-10-15T04:55:21Z
- **Completed:** 2026-10-15T04:57:59Z
- **Tasks:** 2/2
- **Files modified:** 4

## Accomplishments
- `SandpackProvider` injects Tailwind v4 via `options.externalResources` pointing at the pinned jsDelivr Play CDN; v3 `cdn.tailwindcss.com` is absent and `@tailwindcss/browser` is not a host npm dependency
- `hasDefaultExport` (`/export\s+default/`) plus four Vitest cases; missing default export shows the Portuguese alert and still mounts Sandpack
- `PreviewErrorBanner` surfaces `useErrorMessage()` as text children in a host `role="alert"`; `showSandpackErrorOverlay` stays on
- Host still never evals generated JSX (`eval` / `new Function` / generated-HTML injection remain grepped out)

## Task Commits

Each task was committed atomically:

1. **Task 1: Tailwind v4 Play CDN via externalResources** - `595a5cf` (feat)
2. **Task 2 RED: failing hasDefaultExport test** - `c50e6db` (test)
3. **Task 2 GREEN: error overlay + missing default export** - `4c1c6f2` (feat)

**Plan metadata:** pending (docs: complete plan)

_Note: TDD Task 2 produced two commits (test → feat). No refactor commit — GREEN already matched the planned implementation._

## Files Created/Modified
- `src/components/generator/sandbox-preview.tsx` - `externalResources` Tailwind v4 pin, missing-default Portuguese alert, `PreviewErrorBanner`, `showSandpackErrorOverlay`
- `src/components/generator/preview-error.tsx` - `useErrorMessage()` host `role="alert"` banner
- `src/lib/sandpack-files.ts` - `hasDefaultExport` regex guard
- `src/lib/sandpack-files.test.ts` - four `hasDefaultExport` cases (plus existing `buildSandpackFiles` suite)

## Decisions Made
- Pinned `https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.3.3` rather than floating `@4`; did not `npm install @tailwindcss/browser` and did not fall back to the v3 Play CDN
- Lightweight `/export\s+default/` test only — `export { Foo as default }` is a known accepted miss; still show the Portuguese alert and still mount
- `PreviewErrorBanner` is the first child inside `SandpackProvider`; a host React error boundary was not added (cannot catch iframe errors)

## Deviations from Plan

None - plan executed exactly as written.

The Task 2 acceptance grep `grep -q 'export\\s+default'` looks for two literal backslashes; the implementation is the planned `/export\s+default/` and was verified with `grep -F 'export\s+default'`.

---

**Total deviations:** 0 auto-fixed
**Impact on plan:** No scope creep. Phase 2 PREV-02 and PREV-03 are implemented.

## Issues Encountered
None

## Known Stubs
None — `PreviewErrorBanner` returning `null` when `useErrorMessage()` is empty is the success path, not a stub. Missing-default copy is the locked Portuguese alert.

## Threat Flags
None — new surfaces match the plan threat model. `externalResources` is a single pinned jsDelivr URL (T-02-06). Bundler error text is React children, not HTML (T-02-07). Overlay stays on and the Portuguese alert still mounts Sandpack (T-02-08). No `eval` / `new Function` / generated-HTML injection (T-02-09 / T-02-01).

## TDD Gate Compliance
- RED: `c50e6db` — 4/4 `hasDefaultExport` tests failed (`hasDefaultExport is not a function`)
- GREEN: `4c1c6f2` — 8/8 Vitest tests in `sandpack-files.test.ts` passed after implementation
- REFACTOR: skipped — GREEN already matched the planned implementation

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 2 plans complete (PREV-01/02/03). Ready for Phase 3 (export/examples/accessible UX) or `/gsd-verify-work` for Phase 2
- Live generate→styled-preview still depends on `GOOGLE_GENERATIVE_AI_API_KEY` and the jsDelivr + CodeSandbox bundler network
- Playwright generate→preview remains Phase 4 (QUAL-02). Browser confirmation that a `bg-indigo-600` button is visibly indigo needs a finished generation — no hardcoded fixture was left in the UI
- Iframe `dark:` still follows `prefers-color-scheme` (Phase 3 theme polish)

## Verification Results

- `npx vitest run src/lib/sandpack-files.test.ts` — 8/8 passed
- `npm test` — 21/21 passed
- `npx tsc --noEmit` — passed
- `npm run build` — passed (`○ /`, `ƒ /api/generate`)
- Static assertions: jsDelivr `@tailwindcss/browser@4.3.3` in `externalResources`; no v3 CDN; no host `@tailwindcss/browser` package; `useErrorMessage` + `role="alert"`; `showSandpackErrorOverlay` present and not false; Portuguese missing-default copy; no `eval` / `new Function` / generated-HTML injection

## Self-Check: PASSED

- Key artifacts exist on disk (`sandbox-preview.tsx`, `preview-error.tsx`, `sandpack-files.ts`, `sandpack-files.test.ts`)
- Task commits found: `595a5cf`, `c50e6db`, `4c1c6f2`
- Acceptance greps passed (AC2 verified via `grep -F 'export\s+default'`); `npm test` (21/21) and `npm run build` succeeded

---
*Phase: 02-sandboxed-live-preview*
*Completed: 2026-10-15*
