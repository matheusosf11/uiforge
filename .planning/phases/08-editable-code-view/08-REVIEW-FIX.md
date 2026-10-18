---
phase: 08-editable-code-view
fixed_at: 2026-10-18T05:50:00Z
review_path: .planning/phases/08-editable-code-view/08-REVIEW.md
iteration: 1
findings_in_scope: 11
fixed: 10
skipped: 1
status: partial
---

# Phase 8: Code Review Fix Report

**Fixed at:** 2026-10-18T05:50:00Z
**Source review:** .planning/phases/08-editable-code-view/08-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 11. That is all seven warnings plus IN-01, IN-03, IN-04 and IN-05.
- Fixed: 10. WR-05, WR-06 and WR-07 were already fixed by the orchestrator in c169f5c.
- Skipped: 1. IN-05 is won't-fix by decision.
- Left as documented info, not in scope: IN-02, IN-06, IN-07, IN-08.

Verification: `npx vitest run` passes (27 files, 418 tests, 9 of them new). `npm run typecheck` and `npm run lint` are clean. Playwright was not run here. The orchestrator runs the e2e suite.

Fixes ran on the main tree, as the project convention requires (no worktrees). Each commit staged its files by explicit path. `.env.example`, `src/components/theme/theme-provider.tsx` and `vitest.setup.ts` were not touched.

## Fixed Issues

### WR-01: Restoring the oldest version with a draft at the 20-version cap lands on the manual version instead

**Files modified:** `src/components/generator/generator-shell.tsx`, `src/components/generator/generator-shell.test.tsx`
**Commit:** 2484dc6
**Applied fix:** `handleRestore` now checks one more case before committing. With a draft, the commit evicts `versions[0]` when `cursor + 2 > MAX_VERSIONS`. If the click targets index 0 in that state, the shell opens the D-09 DiscardDraftDialog instead, with no commit. The dialog reads "Você tem edições na v20. Ir para a v1 descarta essas edições.". On confirm, the draft is dropped and the target is restored, so the requested version always survives.
**Test:** a shell test builds 20 versions, adds a draft on v20 and clicks v1. It checks that the dialog appears, that Cancelar keeps the draft, and that confirming lands on v1 ("Voltou para v1", "v1 · 20 versões", no manual version).
**Status:** fixed (logic change; please confirm the UX of reusing the D-09 dialog for this case)

### WR-02: Escape in the read-only editor blurs it and drops focus to `<body>`

**Files modified:** `src/components/generator/code-view.tsx`, `src/components/generator/code-view.test.tsx`
**Commit:** 4cf242f
**Applied fix:** in read-only mode the key guard now also calls `preventDefault` on Escape, which stops the library's `blur()`. Tab still passes through (`ignoreTabKey`), so focus is never trapped. The old read-only test asserted that Escape is not prevented, so that assertion was removed.
**Test:** a new test sets the editor read-only, presses Escape and checks that the editor keeps focus and its text. It then checks that Tab still moves to the next element.
**Note:** UI-SPEC §3 says "Tab, Shift+Tab and Escape are never intercepted while read-only". The purpose of that rule is no keyboard trap, and that still holds. Escape now only keeps focus where it was, consistent with RESEARCH P1 ("block … blur").

### WR-03: The editor and its hint unmount at the start of every generation or refine

**Files modified:** `src/components/generator/generator-shell.tsx`, `src/components/generator/code-view.tsx`, `src/components/generator/generator-shell.test.tsx`, `src/components/generator/code-view.test.tsx`
**Commit:** e18f42a
**Applied fix:**
- Shell: while pending, `editorValue` is the parsed stream, or the committed code until the first parsed chunk arrives. A refine therefore never flashes an empty editor.
- CodeView: `showEditor = code !== "" || !readOnly || busy`. The editor and its hint stay mounted while streaming, even with empty code, for example at the start of the first generation. The placeholder now only shows in the idle, empty, read-only state.

**Tests:** two shell tests use a new `"silent"` mock stream that sends no chunk:
- On a refine, the same textarea element stays mounted, read-only, still holding v1, and the hint is present.
- On the first generation, an empty read-only editor shows instead of the placeholder.

A CodeView test covers the switch from an editable editor to busy read-only with empty code. It checks that the same element is still there, is focused, and that the hint is shown.

### WR-04: The e2e "Copiar exports the edited code" test reads the clipboard before the write resolves

**Files modified:** `e2e/generate.spec.ts`
**Commit:** 6e617f7
**Applied fix:** both Copiar e2e tests (the one at line ~58 and the edit-copy test) now wait for `button "Copiado"` to be visible before calling `navigator.clipboard.readText()`. These tests have not been run here, because the orchestrator runs Playwright.

### WR-05: The topology backdrop ignores `prefers-reduced-motion` and runs on phones

**Files modified:** (by the orchestrator)
**Commit:** c169f5c
**Applied fix:** the topology background is now skipped under `prefers-reduced-motion`. It still runs on mobile on purpose, because the user asked for this background.

### WR-06: three.js is loaded from cdnjs without Subresource Integrity

**Files modified:** (by the orchestrator)
**Commit:** c169f5c
**Applied fix:** the three.js script now has an SRI `integrity` hash and `crossorigin`.

### WR-07: Clicking the robot overwrites whatever the user typed in the prompt field

**Files modified:** (by the orchestrator)
**Commit:** c169f5c
**Applied fix:** a robot click no longer overwrites a typed prompt.

### IN-01: Discard keeps the library's undo stack

**Files modified:** `src/components/generator/generator-shell.tsx`, `src/components/generator/generator-shell.test.tsx`
**Commit:** 7e06f73
**Applied fix:** a discard counter in the shell is appended to the editor's `historyKey`, so "Descartar edições" resets the library's undo history. Ctrl+Z after discarding and typing now returns to the base, not to a stale draft. The counter is kept out of `versionKey`, so a discard does not trigger the D-12 scroll reset.
**Test:** discard, type "x", press Ctrl+Z in the editor, and the editor shows v1 again. The test failed before the fix, which was confirmed by stashing it.
**Note:** CONTEXT D-13 says "the editor's own Ctrl+Z still works" after a discard. Ctrl+Z still works for edits made after the discard, but it no longer brings back the discarded text. That was never promised (UI-SPEC "do not promise more"; RESEARCH resolved Q3: full draft recovery is out of scope).

### IN-03: An empty or whitespace-only draft becomes a manual version

**Files modified:** `src/lib/session.ts`, `src/lib/session.test.ts`, `src/components/generator/generator-shell.tsx`, `src/components/generator/generator-shell.test.tsx`
**Commit:** 618c945
**Applied fix:** two changes, the second as defence in depth:
- The shell's `draftCode` is `null` for a whitespace-only draft.
- `COMMIT_MANUAL` returns the state unchanged for empty or whitespace-only code.

Refinar, Desfazer, restore and retry therefore treat an empty draft as no draft. Refinar runs from the committed code. The empty draft is then dropped: by the stale-draft effect when the version changes, or by the explicit `setDraft(null)` in the handlers. This is the "treat as no draft / discard" option from the review.
**Tests:**
- A reducer test checks that `""` and `" \n\t "` are no-ops.
- A shell test refines an empty draft and checks that `currentCode` is v1's code and that no manual version is created.
- A shell test presses Desfazer with an empty draft at v2. It lands on v1 with no manual version and no "Editado" badge.

**Status:** fixed (logic change; please confirm the chosen semantics)

### IN-04: The stale-draft effect lists an unused dependency

**Files modified:** `src/components/generator/generator-shell.tsx`
**Commit:** 3d8d470
**Applied fix:** removed `hasPending` and its dependency entry. Lint is clean.

## Skipped Issues

### IN-05: The mobile editor font is 16px, not the locked 12px

**File:** `src/components/generator/code-view.tsx:303`
**Reason:** won't fix. `max-md:text-base` is the deliberate decision recorded in RESEARCH "Open Questions (RESOLVED)" item 4: iOS Safari zooms into fields with a font under 16px, so the editor and the highlight layer both use 16px on mobile and stay aligned.
**Original issue:** `max-md:text-base` deviates from the UI-SPEC typography ("Code … 12px").

---

_Fixed: 2026-10-18T05:50:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
