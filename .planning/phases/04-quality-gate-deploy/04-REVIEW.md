---
phase: 04-quality-gate-deploy
depth: standard
status: issues_found
reviewed: 2026-10-16
files_reviewed: 27
findings:
  critical: 0
  warning: 4
  info: 4
  total: 8
---

# Phase 4: Code Review

## Focus-area verdicts

- **D-02 (mock never active in production):** holds — `isE2EMock()` (`src/lib/ai/model.ts:8-13`) requires `UIFORGE_E2E_MOCK === "1"` AND `VERCEL_ENV !== "production"`, env-only, read at call time; `ai/test` dynamically imported. Residual: a self-hosted prod build with the flag set would enable mock (by design).
- **Sandbox invariant:** holds — `sandbox="allow-scripts"` exactly (`sandbox-preview.tsx:54`); no `dangerouslySetInnerHTML` in `src`; srcdoc payload escapes `<`.
- **CI security:** `permissions: contents: read`, no secrets, concurrency cancel. Weak points: tag pinning (IN-02).
- **Route error mapping:** limiter 429 + Retry-After; provider 429 → 429; other provider failures → 502; missing key → 500; mid-stream error errors the body.

## Warnings

### WR-01: README architecture diagram names the wrong model
**File:** `README.md:62`, `README.pt-BR.md:62`
**Issue:** Mermaid node says "Gemini 2.5 Flash" but `MODEL_ID` is `gemini-3.8-flash` (switched in ac7dcd0); contradicts line 75.
**Fix:** Label "Gemini (gemini-3.8-flash)" in both files.

### WR-02: Rate limiter trusts spoofable `x-forwarded-for`; map can grow unbounded
**File:** `src/lib/rate-limit.ts:21-25, 41-49`
**Issue:** First `x-forwarded-for` entry is client-controlled off Vercel (`next start`/other hosts) → limit bypass with rotating fake IPs, one Map entry per fake IP; cleanup only above 5000 keys and only removes fully expired windows → unbounded growth + O(n) scans.
**Fix:** Prefer `x-vercel-forwarded-for` / `x-real-ip`; only trust forwarded headers when `process.env.VERCEL` is set; add a hard key cap (evict oldest or fall back to the shared `"unknown"` bucket); document the self-hosted caveat.

### WR-03: `@ai-sdk/provider` imported but not declared
**File:** `src/lib/ai/mock-model.ts:3`, `package.json`
**Issue:** Type-only import relies on npm hoisting a transitive dependency; typecheck/build can break on lockfile/hoisting changes.
**Fix:** Derive the stream-part type from already-declared packages (`ai` / `ai/test` exports, e.g. via `MockLanguageModelV4` / `simulateReadableStream` parameter types) — or declare the dependency.

### WR-04: `import type` stripping regex can delete real code
**File:** `src/lib/preview-srcdoc.ts:6`
**Issue:** `/import\s+type\s+[^;]+;?/g` spans newlines; with no trailing semicolon it consumes up to the next `;` anywhere, silently removing component code (semicolon-free LLM output is plausible).
**Fix:** Single-statement match, e.g. `/^\s*import\s+type\b[^\n;]*(?:;|$)/gm`, plus a regression test.

## Info

### IN-01: Provider 429 has no `Retry-After`
**File:** `src/app/api/generate/route.ts:123-127` — add a default or document.

### IN-02: GitHub Actions pinned by major tag, not SHA
**File:** `.github/workflows/ci.yml` — low risk (read-only, no secrets); pin SHAs + Dependabot.

### IN-03: `hasDefaultExport` matches comments/strings
**File:** `src/lib/has-default-export.ts:2` — anchor `^\s*export\s+default\b` with `m`.

### IN-04: Package/config inconsistencies
**File:** `package.json`, `playwright.config.ts:21` — `shadcn` CLI in dependencies; `@types/node ^26` vs engines 22.x; `reuseExistingServer: !isCI` can reuse a non-mock server on :3100 locally (conflicts with D-01 intent).

_Reviewer: gsd-code-reviewer (standard)_
