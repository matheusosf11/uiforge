---
phase: 01-foundation-streaming-generation
plan: 02
subsystem: api
tags: [ai-sdk, gemini, streamText, zod, nextjs-route-handler]

# Dependency graph
requires:
  - phase: 01-foundation-streaming-generation
    provides: Next.js 15 App Router scaffold + ai@7 / @ai-sdk/google@4 / zod@4 already installed
provides:
  - Centralized Gemini model factory (gemini-2.5-flash) in src/lib/ai/model.ts
  - SYSTEM_PROMPT with default-export / react-only / Tailwind-only / no-fence rules plus one-shot example
  - POST /api/generate streaming Route Handler (plain text protocol)
affects: [01-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Plain-text stream protocol via streamText().toTextStreamResponse()
    - Server-only Gemini key (GOOGLE_GENERATIVE_AI_API_KEY, no NEXT_PUBLIC_)
    - zod body validation with 400 on empty/oversized/malformed prompts
    - Node runtime + maxDuration=60 for Vercel-safe streaming

key-files:
  created:
    - src/lib/ai/model.ts
    - src/lib/ai/prompt.ts
    - src/app/api/generate/route.ts
  modified:
    - .planning/phases/01-foundation-streaming-generation/01-USER-SETUP.md

key-decisions:
  - "Verified toTextStreamResponse exists on the installed ai@7 StreamTextResult and used it as prescribed (plain text, not UI-message protocol)"
  - "Centralized MODEL_ID as gemini-2.5-flash in src/lib/ai/model.ts for a one-line swap"
  - "SYSTEM_PROMPT lives entirely in src/lib/ai/prompt.ts with a few-shot default-exported Tailwind example"

patterns-established:
  - "Pattern 3: AI config modules under src/lib/ai; Route Handler imports model + SYSTEM_PROMPT"
  - "Pattern 4: Streaming endpoints return the stream (never await full text) with runtime=nodejs and maxDuration"

requirements-completed: [GEN-03]

# Metrics
duration: 2min
completed: 2026-10-15
---

# Phase 1 Plan 02: Streaming Backend Summary

**POST /api/generate streams Gemini TSX tokens as plain text via streamText + toTextStreamResponse, with zod validation and a centralized model/prompt**

## Performance

- **Duration:** 2 min
- **Started:** 2026-10-15T03:51:18Z
- **Completed:** 2026-10-15T03:53:14Z
- **Tasks:** 2/2
- **Files modified:** 4

## Accomplishments
- Gemini model id centralized in `src/lib/ai/model.ts` (`gemini-2.5-flash`) so a higher-headroom or Groq swap is one line
- `SYSTEM_PROMPT` forbids prose, markdown fences, non-react imports, named-only exports, and network/fetch; includes a one-shot Tailwind example
- `POST /api/generate` validates `{ prompt }` with zod (400 on empty/oversized/malformed), calls `streamText`, and returns a plain-text token stream
- Vercel-safe route config: `runtime = "nodejs"`, `maxDuration = 60`; API key never referenced with `NEXT_PUBLIC_`

## Task Commits

Each task was committed atomically:

1. **Task 1: Centralized model config + system prompt module** - `f5546b3` (feat)
2. **Task 2: Streaming POST /api/generate Route Handler** - `7ec616b` (feat)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified
- `src/lib/ai/model.ts` - `google(MODEL_ID)` factory; `MODEL_ID = "gemini-2.5-flash"`
- `src/lib/ai/prompt.ts` - `SYSTEM_PROMPT` with component-generation rules and one-shot example
- `src/app/api/generate/route.ts` - POST handler: zod parse → streamText → toTextStreamResponse
- `.planning/phases/01-foundation-streaming-generation/01-USER-SETUP.md` - added `curl -N` streaming verification

## Decisions Made
- Confirmed `toTextStreamResponse()` on installed `ai@7` types (present; marked deprecated in favor of standalone `toTextStream` / `createTextStreamResponse`). Used the prescribed helper because the name did not drift.
- Did not switch to the newer standalone helpers — that would be an unplanned API change; 01-04 client expects the plain-text protocol either helper produces.
- Left `package.json` untouched (deps installed in 01-01).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Acceptance grep matched a comment mentioning the UI-message helper**
- **Found during:** Task 2 (Streaming POST /api/generate)
- **Issue:** The plan's comment contained the string `toUIMessageStreamResponse`, so `! grep -q 'toUIMessageStreamResponse'` failed even though the UI-message protocol was not used.
- **Fix:** Reworded the comment to "Plain text stream protocol (not the UI-message protocol)."
- **Files modified:** `src/app/api/generate/route.ts`
- **Verification:** Re-ran all Task 2 acceptance greps — all PASS; `npm run build` succeeded
- **Committed in:** `7ec616b`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Comment-only. Behavior matches the plan (plain-text `toTextStreamResponse`).

## Issues Encountered
None. `toTextStreamResponse` exists on the installed `ai@7` StreamTextResult; no fallback to `result.textStream` was needed. Automated checks do not require `GOOGLE_GENERATIVE_AI_API_KEY`.

## Known Stubs
None — the Route Handler is fully wired to `streamText`. Live Gemini tokens still require the developer key in `.env.local` (see User Setup); that is environment setup, not a code stub.

## User Setup Required
**External services require manual configuration.** See [01-USER-SETUP.md](./01-USER-SETUP.md) for:
- `GOOGLE_GENERATIVE_AI_API_KEY` from Google AI Studio
- Copy `.env.example` → `.env.local` (gitignored)
- Optional live check: `curl -N -X POST http://localhost:3000/api/generate -H "content-type: application/json" -d '{"prompt":"a button"}'`

## Next Phase Readiness
- Ready for 01-03 (parse-code + Vitest) in parallel — does not depend on this handler
- 01-04 should call `/api/generate` with `streamProtocol: 'text'` (plain text, not UI-message)
- Live generate loop still blocked on the developer adding the Gemini key to `.env.local`

## Self-Check: PASSED

- Key artifacts exist on disk (`src/lib/ai/model.ts`, `src/lib/ai/prompt.ts`, `src/app/api/generate/route.ts`, SUMMARY)
- Task commits found: `f5546b3`, `7ec616b`
- All Task 1 and Task 2 acceptance greps passed; `npm run build` succeeded (includes `ƒ /api/generate`)

---
*Phase: 01-foundation-streaming-generation*
*Completed: 2026-10-15*
