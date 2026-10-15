---
phase: 02-sandboxed-live-preview
plan: 01
subsystem: ui
tags: [sandpack, next-dynamic, react-ts, preview, isolation]

# Dependency graph
requires:
  - phase: 01-foundation-streaming-generation
    provides: GeneratorShell useCompletion + parseCode snapshot source, page.tsx RSC host, ThemeProvider layout
provides:
  - Preview-only Sandpack iframe mounted after stream finish
  - react-ts files map (/Component.tsx + /App.tsx wrapper)
  - Official App Router Sandpack stitches CSS injection
  - next/dynamic ssr:false mount gate inside GeneratorShell
affects: [02-02-PLAN, 03-export-examples-accessible-ux]

# Tech tracking
tech-stack:
  added: ["@codesandbox/sandpack-react@2.20.0"]
  patterns:
    - next/dynamic(..., { ssr: false }) only in GeneratorShell, never page.tsx
    - Snapshot previewCode on isLoading true→false; do not remount Sandpack per token
    - Compose SandpackProvider + SandpackPreview (no all-in-one Sandpack preset)
    - getSandpackCssText + useServerInsertedHTML is the only allowed dangerouslySetInnerHTML

key-files:
  created:
    - src/lib/sandpack-files.ts
    - src/lib/sandpack-files.test.ts
    - src/components/sandpack/sandpack-css.tsx
    - src/components/generator/sandbox-preview.tsx
  modified:
    - package.json
    - package-lock.json
    - src/app/layout.tsx
    - src/components/generator/generator-shell.tsx

key-decisions:
  - "Pinned @codesandbox/sandpack-react@^2.20.0 as the only new direct dependency; sandpack-client/themes and host @tailwindcss/browser were not added"
  - "Generated TSX lives in hidden /Component.tsx; /App.tsx only default-imports it — template /index.tsx is left untouched"
  - "SandboxPreview is preview-only (Provider + Preview); CodeView remains the host editor"
  - "ssr:false dynamic import stays in GeneratorShell so page.tsx remains an RSC host"

patterns-established:
  - "Pattern 1: next/dynamic ssr:false of SandboxPreview from the client orchestrator only"
  - "Pattern 2: buildSandpackFiles wraps generated default-export TSX for react-ts"
  - "Pattern 4: wasLoading + previewCode snapshot on stream finish"
  - "Pattern 5: SandpackCss injects getSandpackCssText() from layout <head>"

requirements-completed: [PREV-01]

# Metrics
duration: 5min
completed: 2026-10-15
---

# Phase 2 Plan 01: SandboxPreview + CSS injection + mount-on-finish Summary

**Preview-only Sandpack 2.20.0 iframe mounts after stream finish via next/dynamic ssr:false, with getSandpackCssText injection and a hidden /Component.tsx + /App.tsx files map**

## Performance

- **Duration:** 5 min
- **Started:** 2026-10-15T04:47:57Z
- **Completed:** 2026-10-15T04:53:56Z
- **Tasks:** 3/3
- **Files modified:** 8

## Accomplishments
- `buildSandpackFiles` maps generated TSX to hidden `/Component.tsx` plus a hidden `/App.tsx` wrapper that default-imports it; Vitest covers the four contract behaviors
- `SandpackCss` injects official stitches CSS (`getSandpackCssText` / `useServerInsertedHTML`) from `layout.tsx` `<head>`
- `SandboxPreview` composes `SandpackProvider` + `SandpackPreview` (`template="react-ts"`, `key={code}`) with no editor preset
- `GeneratorShell` snapshots `parseCode(completion)` only when `isLoading` flips false, dynamically imports the preview with `ssr: false`, and keeps Sandpack out of the tree during empty/loading

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: failing react-ts files map test** - `24bec74` (test)
2. **Task 1 GREEN: files map + pin Sandpack 2.20.0** - `c750962` (feat)
3. **Task 2: SandpackCss injection + preview-only SandboxPreview** - `b00c66e` (feat)
4. **Task 3: snapshot on finish + dynamic-mount SandboxPreview** - `6e51fa3` (feat)

**Plan metadata:** pending (docs: complete plan)

_Note: TDD Task 1 produced two commits (test → feat). No refactor commit — GREEN already matched the planned wrapper._

## Files Created/Modified
- `src/lib/sandpack-files.ts` - Pure react-ts files map (`COMPONENT_PATH`, `APP_PATH`, `APP_WRAPPER`, `buildSandpackFiles`)
- `src/lib/sandpack-files.test.ts` - Vitest globals tests for hidden files and no `/src/App.tsx` / `/index.tsx` overrides
- `src/components/sandpack/sandpack-css.tsx` - Official App Router stitches CSS injection
- `src/components/generator/sandbox-preview.tsx` - Preview-only Sandpack composition
- `src/app/layout.tsx` - Renders `<SandpackCss />` in `<head>`
- `src/components/generator/generator-shell.tsx` - `previewCode` snapshot + `next/dynamic` mount gate + Preview-above-Code layout
- `package.json` / `package-lock.json` - `@codesandbox/sandpack-react@^2.20.0` only

## Decisions Made
- Installed `@codesandbox/sandpack-react@2.20.0` (npm recorded `^2.20.0`); did not add `sandpack-client`, `sandpack-themes`, or host `@tailwindcss/browser`
- Followed RESEARCH Pattern 2: generated source in `/Component.tsx`, wrapper in `/App.tsx`, no custom entry
- Kept `page.tsx` as an RSC host; `ssr: false` lives only in `GeneratorShell`
- Empty/loading Portuguese copy is the dashed preview chrome; Sandpack mounts only when `previewCode` is set and `!isLoading`

## Deviations from Plan

None - plan executed exactly as written.

---

**Total deviations:** 0 auto-fixed
**Impact on plan:** No scope creep. Tailwind-in-iframe and the compile/runtime error banner remain Plan 02.

## Issues Encountered
None

## Known Stubs
None — empty ("O preview aparece aqui depois de gerar.") and loading ("Gerando preview…") copy are intentional UI-SPEC states, not placeholder stubs. `previewCode` starts `null` so Sandpack stays unmounted until the first finished generation.

## Threat Flags
None — new surfaces match the plan threat model. Generated TSX crosses into Sandpack only as a `files` string (T-02-01). `SandpackCss` `dangerouslySetInnerHTML` payload is solely `getSandpackCssText()` (T-02-03). No new network endpoints or auth paths.

## TDD Gate Compliance
- RED: `24bec74` — test failed on missing `./sandpack-files` module
- GREEN: `c750962` — 4/4 Vitest tests passed after implementation
- REFACTOR: skipped — GREEN already matched the planned implementation

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Ready for 02-02: Tailwind-in-sandbox via `externalResources` (`@tailwindcss/browser@4.3.3`) and `PreviewErrorBanner` (`useErrorMessage` → host `role="alert"`)
- `SandboxPreview` options currently omit `externalResources` on purpose (PREV-02)
- Live Gemini generate→preview still depends on `GOOGLE_GENERATIVE_AI_API_KEY` in `.env.local` (Phase 1 USER-SETUP)

## Verification Results

- `npx vitest run src/lib/sandpack-files.test.ts` — 4/4 passed
- `npm test` — 17/17 passed
- `npx tsc --noEmit` — passed (Tasks 2–3)
- `npm run build` — passed (`○ /`, `ƒ /api/generate`; no `ssr: false` in a Server Component)
- Static assertions: sandpack-react `^2.20.0`; `/Component.tsx` + `/App.tsx` wrapper; composed `SandpackPreview` (no preset editor); `getSandpackCssText` + `SandpackCss` in layout; `ssr: false` only in GeneratorShell; snapshot via `wasLoading`/`previewCode`; empty/loading Portuguese copy; no `eval` / `new Function` / generated-HTML injection; `page.tsx` has no `dynamic`

## Self-Check: PASSED

- Key artifacts exist on disk (`sandpack-files.ts`, `sandpack-files.test.ts`, `sandpack-css.tsx`, `sandbox-preview.tsx`, `generator-shell.tsx`, `layout.tsx`)
- Task commits found: `24bec74`, `c750962`, `b00c66e`, `6e51fa3`
- Acceptance greps passed; `npm run build` and `npm test` (17/17) succeeded

---
*Phase: 02-sandboxed-live-preview*
*Completed: 2026-10-15*
