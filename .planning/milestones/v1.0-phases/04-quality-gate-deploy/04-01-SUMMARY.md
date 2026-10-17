---
phase: 04-quality-gate-deploy
plan: 01
subsystem: api
tags: [rate-limit, mock-model, ai-sdk, vitest, e2e-prep]
requires: []
provides:
  - "checkRateLimit/clientIp/getRateLimitConfig (in-memory per-IP sliding window)"
  - "isE2EMock/getModel and createE2EMockModel/FIXED_COMPONENT (env-gated mock)"
  - "POST /api/generate 429 + Retry-After and mock-mode key bypass"
affects: [04-02, 04-03, e2e]
tech-stack:
  added: []
  patterns: ["request-time env reads", "dynamic import of ai/test only in mock mode"]
key-files:
  created:
    - src/lib/rate-limit.ts
    - src/lib/rate-limit.test.ts
    - src/lib/ai/mock-model.ts
    - src/lib/ai/model.test.ts
  modified:
    - src/lib/ai/model.ts
    - src/app/api/generate/route.ts
    - src/app/api/generate/route.test.ts
    - .env.example
key-decisions:
  - "Mock switch is env only (UIFORGE_E2E_MOCK=1 and VERCEL_ENV != production)"
  - "429 body stays rate_limited so the Phase 3 client path is reused"
requirements-completed: [QUAL-01, QUAL-02]
duration: 15min
completed: 2026-10-16
---

# Phase 4 Plan 01: Rate limit and e2e mock model Summary

Best-effort per-IP sliding-window limiter (default 5/60s, 429 + Retry-After) and an env-gated deterministic mock Gemini model wired into the generate route.

## Tasks

| Task | Commit |
|------|--------|
| 1 Rate limiter | c9399ec |
| 2 Mock model + getModel | c5a7c06 |
| 3 Route wiring, tests, .env.example | 63226d1 |

## Deviations from Plan

None in behavior. Minor: mock-model.ts uses a type-only import of `LanguageModelV4StreamPart` from `@ai-sdk/provider` (transitive dependency, not listed in package.json; erased at runtime) to type the chunk array. No packages installed.

## Verification

`npm test` (86 passed), `npx tsc --noEmit`, `npm run lint` all pass.

## Known Stubs

None.

## Self-Check: PASSED
