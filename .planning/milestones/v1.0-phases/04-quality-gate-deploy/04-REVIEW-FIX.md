---
phase: 04-quality-gate-deploy
fixed_at: 2026-10-16
review_path: .planning/phases/04-quality-gate-deploy/04-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 4: Code Review Fix Report

**Source review:** 04-REVIEW.md (WR-01..WR-04, plus IN-04 `reuseExistingServer` by request)

Final gate: `npm run lint`, `typecheck`, `test`, `build`, `e2e` all pass (e2e uses the mock).

## Fixed Issues

### WR-01: README diagram names the wrong model
**Files:** `README.md`, `README.pt-BR.md` — **Commit:** 89183bb
Mermaid label now "Gemini (gemini-3.8-flash)".

### WR-02: Rate limiter trusts spoofable `x-forwarded-for`; unbounded map
**Files:** `src/lib/rate-limit.ts`, `src/lib/rate-limit.test.ts`, `README.md`, `README.pt-BR.md` — **Commits:** 0084a14, 1c61803
`clientIp` honours headers only when `VERCEL` is set (order `x-vercel-forwarded-for`, `x-real-ip`, `x-forwarded-for`); otherwise the shared `"unknown"` bucket. Hard cap of 5000 keys (expired sweep, then new keys fall into a shared overflow bucket). Defaults, 429 + Retry-After and env config unchanged. Unit tests added; one-line self-hosted caveat added to both READMEs. Follow-up commit 1c61803 makes `route.test.ts` stub `VERCEL=1` since it relies on forwarded headers.
Status: fixed (logic change, human verification recommended).

### WR-03: `@ai-sdk/provider` imported but not declared
**File:** `src/lib/ai/mock-model.ts` — **Commit:** c39e9f6
Stream-part type derived from `MockLanguageModelV4["doStream"]` (`ai/test`); no dependency added; typecheck passes.

### WR-04: `import type` stripping regex can delete real code
**Files:** `src/lib/preview-srcdoc.ts`, `src/lib/preview-srcdoc.test.ts` — **Commit:** 3f75c47
Regex is now a single statement match (handles multi-line braces, optional semicolon). Regression tests for semicolon-free and multi-line `import type`.
Status: fixed (logic change, human verification recommended).

## Extra (Info, by request)

### IN-04 (partial): `reuseExistingServer`
**File:** `playwright.config.ts` — **Commit:** ef535b4
Set to `false` so e2e always starts its own mock server (protects D-01).

## Skipped Issues

None.

_Fixer: Claude (gsd-code-fixer), ran on `main` directly (no worktree) because the caller required in-place commits and a full gate run._
