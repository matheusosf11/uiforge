---
phase: 09-e2e-demo-gif-docs
fixed_at: 2026-10-18T06:30:00Z
review_path: .planning/phases/09-e2e-demo-gif-docs/09-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 9: Code Review Fix Report

**Fixed at:** 2026-10-18T06:30:00Z
**Source review:** .planning/phases/09-e2e-demo-gif-docs/09-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7 (WR-01..WR-04, IN-01, IN-05, IN-07)
- Fixed: 7
- Skipped: 0
- Left documented, not fixed (out of scope by request): IN-02, IN-03, IN-04, IN-06

Verification: `npm run typecheck` and `npm run lint` are clean, and `npx vitest run` passed 418 tests in 27 files. Playwright was not run here; the orchestrator runs e2e in an isolated copy. I ran `node --check` on `scripts/demo-gif.mjs` after each edit. I also ran three invalid-env calls (`DEMO_GIF_SPEED=abc`, `DEMO_GIF_FLOOR=300`, `DEMO_GIF_MAX=0`). Each exits 1 with a clear message before it probes ffmpeg or records, and `docs/demo.gif` was not touched.

## Fixed Issues

### WR-01: demo-gif writes straight to the tracked `docs/demo.gif`

**Files modified:** `scripts/demo-gif.mjs`
**Commit:** 085adfd
**Applied fix:** Each step of the ladder now renders pass 2 to `test-results/demo/demo.tmp.gif`. `docs/demo.gif` is replaced (`copyFileSync`) only when a step is under 3 MiB, and the temp file is removed afterwards. If ffmpeg fails partway or the GIF stays oversized, the committed GIF is not touched; the oversize error message now says so.

### WR-02: Tuning env vars are not validated

**Files modified:** `scripts/demo-gif.mjs`
**Commit:** 2e1684f
**Applied fix:** Added a `num(name, def, { min, max, gt })` helper. A value that is NaN, non-finite or out of range now fails with a clear message. The four values use these ranges:
- `DEMO_GIF_START`: >= 0
- `DEMO_GIF_SPEED`: > 0
- `DEMO_GIF_MAX`: > 0
- `DEMO_GIF_FLOOR`: 0..255, then rounded

### WR-03: Substring status matchers collide with the robot bubble

**Files modified:** `e2e/journey.spec.ts`, `e2e/screenshots.spec.ts`
**Commit:** 7792e90
**Applied fix:** All status assertions are now scoped to the status line, `[aria-live="polite"][aria-atomic="true"]`. This is the only element with that pair of attributes (it is in `generator-shell.tsx`), and `robot-corner.tsx` reads its status from the same element. The scoped assertions:
- in the journey spec: `Pronto — v1`, `Pronto — v2`, `Pronto — v3` and `Voltou para v1`;
- in the screenshot spec: `Pronto`.

Each uses `toContainText`, so the substring convention from D-02 is kept, and a bubble on a viewport of 1536px or more can no longer cause a strict-mode error. Needs e2e confirmation from the orchestrator run.

### WR-04: Demo selection does not guard `indexOf("Acao")` returning -1

**Files modified:** `e2e/demo.spec.ts`
**Commit:** e896f9b
**Applied fix:** The selection is set only when the label is found. The `evaluate` returns the index, and the spec then checks `expect(start, "mock fixture must contain the 'Acao' label").toBeGreaterThanOrEqual(0)`. A changed fixture now fails immediately instead of after a 15 s timeout.

### IN-01: Missing accent in the language switcher link

**Files modified:** `README.md`, `README.pt-BR.md`
**Commit:** e1f1ae7
**Applied fix:** "Portugues (BR)" is now "Português (BR)" on line 1 of both files.

### IN-05: `shell: true` combined with an args array

**Files modified:** `scripts/demo-gif.mjs`
**Commit:** b2f8177
**Applied fix:** The script now runs the constant string `"npx playwright test e2e/demo.spec.ts"` with `shell: true` and no args array, which avoids DEP0190. I did not use the review's alternative (spawning `npx.cmd` without a shell) because Node >= 18.20 / 20.12 refuses to spawn `.cmd` files without a shell (EINVAL, CVE-2024-27980). The string is constant, so there is no injection risk. I checked the same pattern with `npx --version` (exit 0).

### IN-07: Journey version numbering differs from CONTEXT D-01

**Files modified:** `.planning/phases/09-e2e-demo-gif-docs/09-CONTEXT.md`
**Commit:** 47132dd
**Applied fix:** D-01 now says that committing the edit made from v1 discards v2, so "Edição manual" is v2 and the refine is v3. This matches the reducer and `e2e/journey.spec.ts`.

---

_Fixed: 2026-10-18T06:30:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
