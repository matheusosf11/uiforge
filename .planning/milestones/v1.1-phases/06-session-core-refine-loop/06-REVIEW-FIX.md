---
phase: 06-session-core-refine-loop
fixed_at: 2026-10-17T00:00:00Z
review_path: .planning/phases/06-session-core-refine-loop/06-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 6: Code Review Fix Report

**Fixed at:** 2026-10-17
**Source review:** .planning/phases/06-session-core-refine-loop/06-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (WR-01..WR-05; Info findings out of scope)
- Fixed: 5
- Skipped: 0

Verification after all fixes: `npx vitest run` 22 files / 241 tests passed; `npm run typecheck` clean; `npm run lint` clean. Playwright was not run.

## Fixed Issues

### WR-01: Preview runtime-error retry refines the broken code instead of regenerating it

**Files modified:** `src/lib/session.ts`, `src/lib/session.test.ts`, `src/components/generator/use-generator-session.ts`, `src/components/generator/use-generator-session.test.tsx`, `src/components/generator/generator-shell.tsx`, `src/components/generator/generator-shell.test.tsx`
**Commit:** beac8c5
**Status:** fixed: requires human verification (logic change)
**Applied fix:** `START` accepts an optional explicit `baseId` (`null` = fresh generation). The hook now has an internal `run(instruction, base)`. `send` uses the committed version as the base. The new `regenerate()` redoes the committed version from its own base: v1 is resent as `{ prompt }` with no `currentCode`, and vN re-runs its instruction against `versions[cursor - 1]`. COMMIT truncation then replaces the broken version. `retry()` now resolves the base from `error.baseId`, so a failed v1 regenerate retries in generate mode. The shell's preview `onRegenerate` calls `session.regenerate()`. Known trade-off (documented in code): once the 20-version cap has evicted the real first version, regenerating `versions[0]` uses only its instruction.

### WR-02: Banner "Tentar de novo" commit does not clear the prompt field (D-02)

**Files modified:** `src/components/generator/generator-shell.tsx`, `src/components/generator/generator-shell.test.tsx`
**Commit:** 74811bf
**Status:** fixed: requires human verification (logic change)
**Applied fix:** A new `handleRetry` awaits `session.retry()`. On `"committed"` it clears the field, unless the user has meanwhile edited the field into a draft that differs from the retried instruction. The integration test asserts that the field is empty after the retry commits.

### WR-03: Focus after confirming "Novo componente" does not land on the textarea

**Files modified:** `src/components/generator/new-component-dialog.tsx`, `src/components/generator/generator-shell.tsx`, `src/components/generator/generator-shell.test.tsx`
**Commit:** 637f566
**Applied fix:** `NewComponentDialog` takes a new `confirmFocusRef` and uses a function `finalFocus`. After "Descartar e começar" it focuses the textarea. On cancel or Esc it focuses the "Novo componente" button, as before. The imperative focus call was removed from the confirm path and kept for the single-version immediate reset. The test asserts `toHaveFocus()` on the textarea after confirm, and it stays focused 100 ms later. Without the dialog change the test fails.

### WR-04: Undo shortcut fires on Ctrl+Y / Ctrl+W on QWERTZ / AZERTY

**Files modified:** `src/components/generator/use-undo-shortcut.ts`, `src/components/generator/use-undo-shortcut.test.tsx`
**Commit:** fe6c636
**Applied fix:** The shortcut now matches the logical `e.key`. `e.code === "KeyZ"` is used only when `e.key` is not a single printable character (IME / dead keys). Tests: Ctrl+Y and Ctrl+W on physical KeyZ neither undo nor call preventDefault. A logical "z"/"Z" typed on another physical key, and "Process" on KeyZ, still undo.

### WR-05: Client suggest timeout shorter than the server's two-model chain

**Files modified:** `src/lib/suggest.ts`, `src/app/api/suggest/route.ts`, `src/components/generator/use-suggestions.ts`, `src/components/generator/use-suggestions.test.tsx`
**Commit:** 5ed2efe
**Status:** fixed: requires human verification (timing/caching logic)
**Applied fix:** Shared constants now live in `lib/suggest.ts`: `SUGGEST_MODEL_TIMEOUT_MS = 5000`, `SUGGEST_SERVER_BUDGET_MS = 9000`, and `SUGGEST_CLIENT_TIMEOUT_MS = budget + 3000` (12 s). The route runs the model chain under a total deadline. Each model gets `min(5000, remaining)`, and the chain stops when less than 1 s remains. When the client times out, the fallback list is marked provisional. The chips still show, but when that version becomes current again it is refetched, and a real answer replaces the fallback. Non-ok, 429 and bad-JSON failures stay cached on purpose so a failing or rate-limited endpoint is not hammered; a code comment documents this. Tests cover the timeout-versus-budget relationship and refetch after a provisional fallback.

---

_Fixed: 2026-10-17_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
