---
phase: 05-refine-api-contract-edit-prompt
plan: 02
subsystem: api
tags: [route, refine, vitest, ai-sdk]
requires: [05-01]
provides:
  - /api/generate refine mode ({prompt, currentCode})
  - 413 code_too_large before rate limiter
  - generate_usage log (mode, model, tokens)
  - 05-UAT.md manual checklist
affects: [phase 06 client]
key-files:
  modified:
    - src/app/api/generate/route.ts
    - src/app/api/generate/route.test.ts
  created:
    - .planning/phases/05-refine-api-contract-edit-prompt/05-UAT.md
key-decisions:
  - "currentCode nullish/whitespace transforms to undefined (generate mode); real code keeps untrimmed text"
  - "413 returned before checkRateLimit, plus content-length > 200_000 early reject"
  - "maxOutputTokens 32_768 in both modes"
  - "Usage log only mode, model id, token counts"
requirements-completed: [ITER-03, ITER-04]
duration: 15min
completed: 2026-10-17
---

# Phase 5 Plan 02: Route refine mode Summary

/api/generate now runs edit mode when currentCode is present (buildSystem/buildUserPrompt), keeps v1.0 behavior otherwise, rejects oversize code with 413 without consuming quota, and logs privacy-safe usage.

## Tasks

1. Route refine mode, 413, maxOutputTokens, usage log - d09c9b0
2. Manual real-key UAT checklist (D-15) - 6a99fc0

## Verification

`npx vitest run src/app/api/generate src/lib` passes (103 tests); `npx tsc --noEmit` clean.

## Deviations from Plan

None - plan executed exactly as written. UAT (D-15) is pending a human run with a real key; not blocking.

## Known Stubs

None.

## Self-Check: PASSED
