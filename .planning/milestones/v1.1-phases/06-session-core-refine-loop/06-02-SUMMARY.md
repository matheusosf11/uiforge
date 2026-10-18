---
phase: 06-session-core-refine-loop
plan: 02
subsystem: api
tags: [suggest, rate-limit, gemini, zod, ai-sdk]
requires: []
provides:
  - "POST /api/suggest returning up to 4 sanitized pt-BR {label, instruction}"
  - "src/lib/suggest.ts (Suggestion, FALLBACK_SUGGESTIONS, MOCK_SUGGESTIONS, sanitizeSuggestions, fillWithFallback)"
  - "getSuggestRateLimitConfig, SUGGEST_MODEL_IDS/getSuggestModels, suggest prompt builders"
affects: [06-05]
tech-stack:
  added: []
  patterns: ["generateText + Output.object (no deprecated generateObject)", "separate limiter bucket via suggest: key prefix"]
key-files:
  created:
    - src/lib/suggest.ts
    - src/lib/suggest.test.ts
    - src/lib/ai/suggest-prompt.ts
    - src/app/api/suggest/route.ts
    - src/app/api/suggest/route.test.ts
  modified:
    - src/lib/ai/prompt.ts
    - src/lib/ai/model.ts
    - src/lib/rate-limit.ts
    - src/lib/rate-limit.test.ts
    - playwright.config.ts
    - .env.example
key-decisions:
  - "Mock mode short-circuits before the API-key check; __suggest_fail__ only honored in mock"
  - "Rate-limit applied after the size guards so 413 consumes no quota"
requirements-completed: []
duration: 10min
completed: 2026-10-17
---

# Phase 6 Plan 02: Suggest endpoint Summary

/api/suggest with its own limiter bucket (suggest: prefix, 10/min default), flash-lite-first model list, structured output via `generateText` + `Output.object`, and server-side sanitization clamped to 4 items; shared client-safe helpers provide the fixed fallback list for D-08.

## Commits
- 5cba87d: helpers, prompt, model list, rate-limit config, Playwright env
- d36e1eb: route and route tests

## Deviations from Plan
None in code. `neutralizeDelimiters` was exported only (no behavior change). `timeout: 8000` is accepted by the installed `generateText` (number form), so no AbortSignal combination was needed.

## Notes
- `.env.example`: SUGGEST_RATE_LIMIT_MAX / SUGGEST_RATE_LIMIT_WINDOW_MS comment lines were appended surgically but the file was left uncommitted on purpose, because it holds the user's private uncommitted edits. Same for `theme-provider.tsx` and `vitest.setup.ts` (never staged).
- No dependencies added. Verified: vitest (src/app/api/suggest, src/lib) 138 passed, typecheck clean, eslint clean on touched dirs.
- Requirements ITER-09 / QUAL-06 intentionally not marked complete (client side pending).

## Known Stubs
None.

## Threat Flags
None.

## Self-Check: PASSED
