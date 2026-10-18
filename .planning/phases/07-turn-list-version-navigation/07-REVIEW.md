---
phase: 07-turn-list-version-navigation
reviewed: 2026-10-18T00:00:00Z
depth: standard
diff_base: c8adb64^
files_reviewed: 9
files_reviewed_list:
  - src/lib/session.ts
  - src/components/generator/use-generator-session.ts
  - src/components/generator/turn-item.tsx
  - src/components/generator/turn-list.tsx
  - src/components/generator/session-bar.tsx
  - src/components/generator/generator-shell.tsx
  - src/components/generator/prompt-form.tsx
  - src/components/generator/code-view.tsx
  - e2e/generate.spec.ts
findings:
  critical: 0
  warning: 3
  info: 6
  total: 9
status: issues_found
---

# Phase 7: Code Review Report

**Reviewed:** 2026-10-18
**Depth:** standard
**Files Reviewed:** 9 (tests skimmed for coverage: session.test.ts, use-generator-session.test.tsx, turn-list.test.tsx, generator-shell.test.tsx, code-view.test.tsx, prompt-form.test.tsx)
**Status:** issues_found

## Summary

These files were checked against 07-CONTEXT (D-01..D-20) and 07-UI-SPEC:
- the RESTORE reducer case, stable numbering (`droppedCount`), the IN-01 guard and the selectors;
- the hook's `restore`;
- the TurnList/TurnItem components;
- shell wiring: status, transient row, base notice, scroll reset;
- the PromptForm slots and the session bar counter.

The core restore logic holds up:
- **Reducer ordering.** RESTORE is ignored while pending, and the reducer processes dispatches in order. So stop+restore, and a commit racing a click, both resolve correctly.
- **Stale requests.** `reqIdRef` and the abort checks block stale requests.
- **Retry base.** Restore, undo and START clear `error`, so the retry base can never point at a version the user navigated away from.
- **Truncation and numbering.** Truncation plus the cap keep `droppedCount + index + 1` stable. RESET restarts numbering at v1.
- **Suggestions.** `useSuggestions` returns `cache[id] ?? null`, so another version's chips are never shown.
- **Focus.** Keys are version ids, so focus stays on the clicked item.
- **Live region.** There is a single `aria-live` region.
- **Copy.** Every copy string matches the UI-SPEC exactly. These were checked: base notice in singular and plural, counter `v{N} · {M} versões` / `1 versão`, cap line, `Foi para`, `atual`, `gerando…`, `erro`, the sr-only prefixes and the three item aria-labels.

No blockers were found. The main concerns:
- **WR-01.** The preview's regenerate path silently throws away the restored redo stack. The base notice does not warn about it.
- **WR-02.** A WebKit list-semantics loss.
- **WR-03.** An off-by-border bug in the container scroll helper that clips items and focus rings.

## Warnings

### WR-01: Preview "Tentar de novo" after a restore silently discards the later versions, outside the base-notice warning

**File:** `src/components/generator/use-generator-session.ts:127-133`, `src/lib/session.ts:152-179`, `src/components/generator/generator-shell.tsx:322-324`
**Issue:**
Phase 7 makes the following path easy to reach:
1. The user restores an earlier vK. Later versions vK+1..vY are kept as an implicit redo (D-13).
2. vK's preview throws at runtime.
3. The user clicks the preview's "Tentar de novo".
4. `regenerate()` runs vK's instruction against `versions[cursor-1]`.

At COMMIT this truncates to the parent, so **vK and every later version are discarded**. This happens with no confirmation. The visible base notice is also wrong: it says "Refinar a partir da vK — vK+1 a vY serão descartadas", but the action actually replaces vK too.

It is worse at `cursor === 0` once the cap has evicted versions (`droppedCount > 0`):
- `parent` is `null`, so the refine instruction (e.g. "deixar em modo escuro") is sent as a fresh prompt without `currentCode`. That produces an unrelated component.
- `kept = []` wipes all 19 later versions.
- The cap line "Versões mais antigas descartadas (limite de 20)" stays visible next to a single item. The test at `session.test.ts:328` pins this behavior (`versions.toHaveLength(1)`).

The UI-SPEC treats the base notice as "the warning for this implicitly destructive action". The regenerate path bypasses that warning.

**Fix:** Pick one of these:
- (a) Hide or disable the preview regenerate while `laterRange(state) !== null`, and leave plain refine as the only way forward.
- (b) Make regenerate keep the later versions. Commit the replacement in place, which needs a reducer action such as `REPLACE { id, raw, versionId }`.
- (c) At minimum, show a regenerate-specific notice or confirmation when later versions exist. Also refuse regenerate at `cursor === 0 && droppedCount > 0` instead of issuing a fresh generation from a refine instruction:

```ts
const regenerate = useCallback(async () => {
  const s = stateRef.current;
  const current = committedVersion(s);
  if (!current) return "ignored";
  if (s.cursor === 0 && s.droppedCount > 0) return "ignored"; // real parent evicted
  ...
}, [run]);
```

### WR-02: `<ol>` loses list semantics in Safari/VoiceOver

**File:** `src/components/generator/turn-list.tsx:98`
**Issue:**
- Tailwind v4 preflight sets `list-style: none` on `ol`.
- WebKit drops the implicit `list` role for lists styled this way, outside `<nav>`. VoiceOver users then lose "list, N items" and the list name "Histórico de versões".
- D-18 requires a semantic `<ol>` with an accessible name.
- The Playwright e2e uses `getByRole("list")` in Chromium only, so it does not catch this.

**Fix:**
```tsx
<ol role="list" aria-label="Histórico de versões" className="flex flex-col gap-1">
```

### WR-03: `scrollIntoContainer` aligns items to the container's border box, clipping the item and its focus ring

**File:** `src/components/generator/turn-list.tsx:22-30`
**Issue:**
- `container.getBoundingClientRect()` includes the 1px border. The scrollport is the padding box, and the region also has `p-1`.
- When an item above the viewport is targeted, `e.top` ends up equal to the outer border edge. This happens on undo/restore to an earlier item while the list is scrolled to the bottom.
- The result is that 1px of the row sits under the border, and the 3px `focus-visible` ring is cut off entirely.
- The same happens at the bottom for any row that is not the last one; the last row is saved by scroll clamping.
- The UI-SPEC requires the item to be "fully inside" and the ring to be unclipped ("the container has `p-1`, which leaves room for the ring").
- The unit tests mock rects without borders, so they pass.

**Fix:** Measure against the padding box and keep a margin for the ring:
```ts
export function scrollIntoContainer(container: HTMLElement, el: HTMLElement, margin = 4) {
  const c = container.getBoundingClientRect();
  const e = el.getBoundingClientRect();
  const top = c.top + container.clientTop + margin;
  const bottom = c.top + container.clientTop + container.clientHeight - margin;
  if (e.top < top) container.scrollTop -= top - e.top;
  else if (e.bottom > bottom) container.scrollTop += e.bottom - bottom;
}
```

## Info

### IN-01: `hasDroppedVersions` is a dead export

**File:** `src/lib/session.ts:105-108`
**Issue:** No production code uses it. `turn-list.tsx:93` tests `droppedCount > 0` inline.
**Fix:** Use the selector in TurnList (pass a `capped` boolean), or delete it.

### IN-02: The UI-SPEC cap-line condition contradicts CONTEXT and the implementation

**File:** `.planning/phases/07-turn-list-version-navigation/07-UI-SPEC.md` §2 (cap line), vs `turn-list.tsx:93`
**Issue:**
- The UI-SPEC says the line is shown "when the oldest kept version id is greater than 1".
- Ids are internal and keep counting across resets and regenerations, so that rule would be wrong after the first reset.
- The code correctly follows D-17 (`droppedCount > 0`).
**Fix:** Update the UI-SPEC wording to `droppedCount > 0`, so a later phase does not "fix" the code to match the spec.

### IN-03: The code-panel scroll reset runs after paint

**File:** `src/components/generator/code-view.tsx:42-45`
**Issue:**
- `useEffect` runs after the browser paints. For one frame, the restored code is shown at the previous version's scroll offset before jumping to the top.
- D-12 asks for an instant switch, with no fade or flash.
**Fix:** Use `useLayoutEffect` for the `scrollTop = 0` reset.

### IN-04: The retry fallback contradicts the IN-01 guard; the hook duplicates the reducer's validation

**File:** `src/components/generator/use-generator-session.ts:65-73, 112-116`
**Issue:**
- When the IN-01 guard fires, the error has `baseId` = a removed version.
- `retry()` then falls back to `committedVersion(s)`. It silently retries against a different base, which is exactly what IN-01 is meant to prevent.
- This path is unreachable today, because nothing evicts versions while a request is pending.
- Separately, `baseStillKept` plus `parseCode`/`hasDefaultExport` re-derive the reducer's COMMIT outcome. The two can drift apart.
**Fix:**
- Return `"ignored"` (or clear the error) when the base is gone, instead of falling back.
- Consider deriving the `SendResult` from the post-COMMIT state, e.g. compare `versions` or `error` via a reducer result, instead of re-validating in the hook.

### IN-05: Test coverage gaps

**Files:** `src/components/generator/turn-list.test.tsx`, `generator-shell.test.tsx`, `e2e/generate.spec.ts`
**Issue:**
- **Auto-scroll.** Only the pure `scrollIntoContainer` helper is tested. The `useLayoutEffect` wiring is not covered: the target is the transient row when present, otherwise current, and it re-runs on commit, undo, restore, transient-kind change and disclosure open.
- **Stable numbers in the shell.** No shell-level test checks the stable number in `Pronto — v21`, the counter and the base notice after the cap.
- **Restore is ignored while busy.** The reducer case is covered, but there is no test where the user clicks a disabled item.
- **Refine after restore in e2e.** The e2e restore smoke never refines from the restored base, so truncation is unit-tested only.
**Fix:** Add a TurnList test that mocks rects and asserts `scrollTop` after rerendering with a new cursor or transient. Add a shell test that drives 21 commits and asserts `Pronto — v21`, `v21 · 20 versões` and the cap line.

### IN-06: The current item's accessible name reorders its visible text (WCAG 2.5.3 label-in-name)

**File:** `src/components/generator/turn-item.tsx:27`
**Issue:**
- The visible text reads "v2 · azul · atual", but the accessible name is "v2, versão atual: azul. Concluída.".
- Speech-input users saying "clicar azul atual" may not match.
- The wording is mandated by the UI-SPEC, so this is a note only.
**Fix:** None required. If the spec is revisited, put the instruction text before "atual" in the label.

---

_Reviewed: 2026-10-18_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
