---
phase: 01-foundation-streaming-generation
plan: 04
subsystem: ui
tags: [ai-sdk, useCompletion, prism-react-renderer, streaming, react]

# Dependency graph
requires:
  - phase: 01-foundation-streaming-generation
    provides: Next.js 15 shell, POST /api/generate text stream, parseCode extractor, shadcn button/textarea, @ai-sdk/react + prism-react-renderer already installed
provides:
  - Client GeneratorShell orchestrating useCompletion against /api/generate
  - PromptForm with Cmd/Ctrl+Enter, disabled-while-busy, and Stop
  - Syntax-highlighted CodeView via prism-react-renderer (text tokens only)
  - Live two-pane loop mounted from src/app/page.tsx
affects: [02-sandboxed-live-preview, 03-export-examples-accessible-ux]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useCompletion({ api: "/api/generate", streamProtocol: "text" }) as the only client transport
    - parseCode(completion) via useMemo so the editor streams fence-stripped TSX
    - Presentational PromptForm/CodeView; all stream state lives in GeneratorShell
    - Generated code rendered as prism tokens, never dangerouslySetInnerHTML

key-files:
  created:
    - src/components/generator/code-view.tsx
    - src/components/generator/prompt-form.tsx
    - src/components/generator/generator-shell.tsx
  modified:
    - src/app/page.tsx
    - src/app/api/generate/route.ts

key-decisions:
  - "Verified @ai-sdk/react@4 useCompletion exposes streamProtocol: 'text' plus completion/complete/input/setInput/isLoading/stop/error — used complete(trimmed) instead of handleSubmit"
  - "Portuguese UI copy; aria-label values kept as the Phase 1 shell contract (Prompt / Generated code)"
  - "Fail-fast 500 when GOOGLE_GENERATIVE_AI_API_KEY is missing so a failed generate surfaces an error instead of a silent empty 200 stream"

patterns-established:
  - "Pattern 7: GeneratorShell is the only 'use client' orchestrator; page.tsx stays an RSC host"
  - "Pattern 8: parseCode runs on every streamed completion chunk before CodeView render"

requirements-completed: [GEN-01, GEN-04, GEN-05, EDIT-01]

# Metrics
duration: 5min
completed: 2026-10-15
---

# Phase 1 Plan 04: Walking Skeleton Client Summary

**Client useCompletion text-stream loop: PromptForm submit/stop + parseCode + prism-highlighted CodeView mounted from page.tsx**

## Performance

- **Duration:** 5 min
- **Started:** 2026-10-15T04:02:36Z
- **Completed:** 2026-10-15T04:08:10Z
- **Tasks:** 3/3
- **Files modified:** 5

## Accomplishments
- `CodeView` highlights streamed TSX as text tokens (`prism-react-renderer` `Highlight`, language `tsx`) with a Portuguese empty state and `aria-label="Generated code"`
- `PromptForm` captures the prompt, submits via button or Cmd/Ctrl+Enter, disables input+submit while busy, and shows a Stop control during generation
- `GeneratorShell` calls `useCompletion({ api: "/api/generate", streamProtocol: "text" })`, derives `parseCode(completion)` into the editor, and surfaces failures in a visible `role="alert"` block
- `page.tsx` is now an RSC host that renders the live shell (static placeholders removed)

## Task Commits

Each task was committed atomically:

1. **Task 1: Syntax-highlighted streaming code view** - `dffa1ee` (feat)
2. **Task 2: Prompt form — textarea, submit/stop, Cmd/Ctrl+Enter, disabled-while-busy** - `a5f964b` (feat)
3. **Task 3: GeneratorShell orchestration + wire into page.tsx** - `6aed0ce` (feat)
4. **Deviation fix: surface generation failures** - `5c5ef5c` (fix)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified
- `src/components/generator/code-view.tsx` - Presentational syntax-highlighted TSX view (text only)
- `src/components/generator/prompt-form.tsx` - Textarea + Gerar/Parar + Cmd/Ctrl+Enter + disabled-while-busy
- `src/components/generator/generator-shell.tsx` - Client orchestrator: useCompletion, parseCode, error alert
- `src/app/page.tsx` - RSC host that mounts `<GeneratorShell />`
- `src/app/api/generate/route.ts` - Fail-fast 500 when the Gemini key is missing (deviation)

## Decisions Made
- Confirmed installed `@ai-sdk/react@4` `useCompletion` options include `streamProtocol: 'text'` and helpers `{ completion, complete, input, setInput, isLoading, stop, error }`. No fetch-reader fallback needed.
- Used `complete(trimmedPrompt)` rather than `handleSubmit` so empty/whitespace and in-flight submits are guarded before the request.
- UI strings are Portuguese; contract `aria-label`s stay `"Prompt"` / `"Generated code"` as specified by the Phase 1 shell.
- `package.json` left untouched (`@ai-sdk/react` and `prism-react-renderer` already installed in 01-01).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Failed generates returned HTTP 200 with an empty body**
- **Found during:** Task 3 browser verification (submit without `.env.local`)
- **Issue:** `streamText` fails asynchronously after `toTextStreamResponse()` has already started a 200 text stream. `useCompletion` treated that as a successful empty completion, so the UI returned to ready with no error — violating "a failed request surfaces an error message".
- **Fix:** Return 500 before streaming when `GOOGLE_GENERATIVE_AI_API_KEY` is missing. On the client, combine hook `error` / `onError` with an empty-completion fallback (ignored if the user hit Stop).
- **Files modified:** `src/app/api/generate/route.ts`, `src/components/generator/generator-shell.tsx`
- **Verification:** `curl` to `POST /api/generate` without a key now returns 500 + a plain-text message; `npm run build` and `npm test` still pass. Loading UI (disabled textarea, disabled Gerar, visible Parar) was confirmed in the browser before the fix.
- **Committed in:** `5c5ef5c`

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Required for the plan's error-state truth. No scope creep; no new endpoint.

## Issues Encountered
- Live Gemini token streaming was not exercised end-to-end: `.env.local` is not present in this workspace. Browser verification covered empty state, disabled-while-empty submit, fill → enabled Gerar, in-flight disable + Stop, and the missing-key failure path after the 500 fix (via curl). A real-key stream still needs `GOOGLE_GENERATIVE_AI_API_KEY` in `.env.local` (see User Setup).

## Known Stubs
None — the generate loop is fully wired. Empty CodeView copy is an intentional empty state, not a placeholder stub.

## Threat Flags
None — no new network endpoints or auth paths. Client still talks only to `/api/generate`. Generated code is still rendered as prism text tokens (T-01-09). Submit/textarea disable-while-busy remains (T-01-10). Gemini key stays server-only (T-01-11).

## User Setup Required
**External services require manual configuration.** See [01-USER-SETUP.md](./01-USER-SETUP.md) for:
- `GOOGLE_GENERATIVE_AI_API_KEY` from Google AI Studio
- Copy `.env.example` → `.env.local` (gitignored)

## Next Phase Readiness
- Phase 1 walking skeleton is complete: prompt → `/api/generate` → parseCode → highlighted code view, with stop and error
- Ready for Phase 2 Sandboxed Live Preview (`SandboxPreview` on stream-finish; do not remount Sandpack per token)
- Blocker for a live generate demo: developer must add the Gemini key to `.env.local`

## Verification Results

- `npx tsc --noEmit` — passed (Tasks 1–3)
- `npm run build` — passed (includes `○ /` and `ƒ /api/generate`)
- `npm test` — 12/12 passed
- Static assertions: `useCompletion` + `streamProtocol`, `parseCode`, Cmd/Ctrl+Enter, `disabled`, stop/`Parar`, error alert, `GeneratorShell` in `page.tsx`, no `dangerouslySetInnerHTML`
- `POST /api/generate` without a key returns 500 (after deviation fix)

## Self-Check: PASSED

- Key artifacts exist on disk (`code-view.tsx`, `prompt-form.tsx`, `generator-shell.tsx`, `page.tsx`, SUMMARY)
- Task commits found: `dffa1ee`, `a5f964b`, `6aed0ce`, `5c5ef5c`
- Acceptance greps passed; `npm run build` and `npm test` (12/12) succeeded

---
*Phase: 01-foundation-streaming-generation*
*Completed: 2026-10-15*
