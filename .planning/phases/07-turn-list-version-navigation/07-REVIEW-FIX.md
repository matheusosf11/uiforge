---
phase: 07-turn-list-version-navigation
fixed_at: 2026-10-18T00:00:00Z
review_path: .planning/phases/07-turn-list-version-navigation/07-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 7: Code Review Fix Report

**Fixed at:** 2026-10-18
**Source review:** .planning/phases/07-turn-list-version-navigation/07-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (WR-01, WR-02, WR-03, IN-01, IN-02, IN-03; IN-04..IN-06 out of scope)
- Fixed: 6
- Skipped: 0
- Verification: `npx vitest run` (24 files, 308 tests pass), `npm run typecheck` clean, `npm run lint` clean.

## Fixed Issues

### WR-01: Preview "Tentar de novo" after a restore silently discards the later versions

**Files modified:** `src/lib/session.ts`, `src/lib/session.test.ts`, `src/components/generator/use-generator-session.ts`, `src/components/generator/use-generator-session.test.tsx`, `src/components/generator/generator-shell.tsx`, `src/components/generator/generator-shell.test.tsx`
**Commit:** 74f3af3
**Status:** fixed: requires human verification (logic change)
**Applied fix:**
- New selector `canRegenerate(state)` in `session.ts`. It is true only when the current version is the last kept one (`cursor === versions.length - 1`) and its real base exists: `cursor > 0`, or `cursor === 0 && droppedCount === 0` (a true first generation).
- In the hook, `regenerate()` returns `"ignored"` without a request unless `canRegenerate` holds. The hook also exposes `canRegenerate`.
- The shell passes `onRegenerate` only when `!error && canRegenerate`. Otherwise the preview shows the error state without the button, and refine and restore stay available.
- The busy state still only disables the button (`regenerateDisabled`).
- The reducer has no regenerate action, so the guard lives in the session module's selector and is enforced in the hook. START and COMMIT semantics are unchanged.
- Tests:
  - The `session.test.ts` test that pinned the old cursor-0-after-cap wipe now asserts `canRegenerate === false`. A new `canRegenerate` describe block covers: empty session, v1, last version, a restored earlier version, an evicted parent, and the last version after the cap.
  - New hook test: regenerate after a restore is a no-op.
  - New shell tests: a restored earlier version shows no button; cursor 0 after the cap drop (21 commits) shows no button; going back to the last version shows the button again and it regenerates from the parent as before.

### WR-02: `<ol>` loses list semantics in Safari/VoiceOver

**Files modified:** `src/components/generator/turn-list.tsx`, `src/components/generator/turn-list.test.tsx`
**Commit:** 3a98ab1
**Applied fix:** Added `role="list"` to the history `<ol>` and kept `aria-label="Histórico de versões"`. Added a test that asserts the explicit role.

### WR-03: `scrollIntoContainer` aligns items to the container's border box

**Files modified:** `src/components/generator/turn-list.tsx`, `src/components/generator/turn-list.test.tsx`
**Commit:** 35b72a2
**Status:** fixed: requires human verification (geometry logic; jsdom has no layout)
**Applied fix:**
- The helper now measures against the scrollport: the top is `rect.top + clientTop` and the height is `clientHeight`.
- It keeps a margin between the item and the edge equal to the container's computed padding, and never less than the 3px focus ring (`focus-visible:ring-3`). With `p-1` that margin is 4px, so the item and its ring stay fully visible.
- It returns early when `clientHeight === 0`, i.e. the collapsed mobile disclosure or no layout.
- The tests now mock `clientTop`, `clientHeight` and the padding. They cover the 1px border plus 4px padding case at the top and bottom, the in-margin "already visible" case and the not-laid-out case. The existing cases were updated for the 3px ring margin.

### IN-01: `hasDroppedVersions` is a dead export

**Files modified:** `src/lib/session.ts`, `src/lib/session.test.ts`
**Commit:** 27be4fb
**Applied fix:**
- Deleted the unused selector and its two assertions. The adjacent `droppedCount` assertions still cover the behavior.
- I chose deletion because TurnList already receives `droppedCount` for numbering, so passing a separate boolean would add an extra prop for no gain.
- Older planning docs (07-01-PLAN, 07-RESEARCH, 07-01-SUMMARY) still mention it as a historical record and were left untouched.

### IN-02: The UI-SPEC cap-line condition contradicts CONTEXT and the implementation

**Files modified:** `.planning/phases/07-turn-list-version-navigation/07-UI-SPEC.md`
**Commit:** faaf685
**Applied fix:** Changed the §2 cap-line rule to "shown when `droppedCount > 0`", with a note not to test version ids. That was the only remaining occurrence; the outline at line 120 already said `droppedCount > 0`.

### IN-03: The code-panel scroll reset runs after paint

**Files modified:** `src/components/generator/code-view.tsx`
**Commit:** 007dbbb
**Applied fix:** Switched the `scrollResetKey` effect from `useEffect` to `useLayoutEffect` (D-12, no one-frame flash).

## Notes

- I worked in the main working tree, not an isolated worktree, because running vitest, tsc and eslint needs the installed `node_modules`.
- Each commit staged only its explicit paths. `.env.example`, `src/components/theme/theme-provider.tsx` and `vitest.setup.ts` were never staged or modified.

---

_Fixed: 2026-10-18_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
