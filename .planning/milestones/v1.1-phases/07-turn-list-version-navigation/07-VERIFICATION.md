---
phase: 07-turn-list-version-navigation
verified: 2026-10-18T00:40:00Z
status: human_needed
score: 5/5 roadmap success criteria verified (35/35 plan must-have truths verified in code)
overrides_applied: 0
human_verification:
  - test: "Visual check of the turn list on desktop (light and dark): current item, dimmed later items, max height of about 5 items"
    expected: "Current item has bg-muted, a primary left border and an 'atual' badge. After a restore, later items show instruction and icon at about 50% opacity while 'vN' stays legible. The list scrolls on its own and the field and chips stay visible."
    why_human: "Visual appearance and contrast; jsdom has no layout"
  - test: "Container scroll geometry (WR-03): with 8+ versions, restore/undo/commit so the current item is out of view"
    expected: "Only the list scrolls (not the page). The current or transient item is fully visible and its focus ring is not clipped at the top or bottom edge."
    why_human: "scrollIntoContainer uses real layout metrics; the review-fix marks it as needing human verification"
  - test: "Screen reader pass (NVDA/VoiceOver, including Safari for WR-02)"
    expected: "'Histórico de versões' is announced as a list with N items. The current item is announced as current. Restore labels read 'Restaurar vN: … Concluída.' and later items add 'Será descartada ao refinar.' 'Voltou para vN' / 'Foi para vN' / 'Pronto — vN' are announced once via the status region. Focus stays on the clicked item."
    why_human: "Real assistive-technology output cannot be asserted programmatically"
  - test: "Mobile viewport (< md): 'Histórico (N)' disclosure"
    expected: "Collapsed by default. It keeps its open state across commit/undo/restore and collapses on Novo componente. Touch targets are at least 44px. Opening it brings the current item into view."
    why_human: "Responsive layout and touch behavior"
  - test: "WR-01 behavior: restore an earlier version after a preview runtime error"
    expected: "The preview 'Tentar de novo' is not offered when it would discard later versions. Refining and restoring still work."
    why_human: "The review-fix marks this logic change as needing human verification; it needs a real runtime error in the sandbox"
---

# Phase 7: Turn List & Version Navigation Verification Report

**Phase Goal:** Users see their session as a list of turns and can jump to any earlier version, understanding what the next refinement will build on.
**Verified:** 2026-10-18
**Status:** human_needed
**Re-verification:** No (initial verification)

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | List of turns with per-turn status (gerando / ok / erro) and the current version highlighted | VERIFIED | `turn-list.tsx` renders `<ol role="list" aria-label="Histórico de versões">` with one `<li><TurnItem>` per version (oldest first). `turn-item.tsx` uses a `Check` icon plus "Concluída." in the label. `TransientTurnItem` uses `Loader2` (with `motion-reduce:animate-none`) and "gerando…", or `AlertTriangle` (destructive) and "erro", each with sr-only "Gerando: " / "Erro: ". The current item gets `aria-current="true"`, `border-primary bg-muted` and an "atual" badge. The shell derives `transient` from `pending`, or from `error && versions.length > 0` (generator-shell.tsx:107-111). |
| 2 | Clicking a turn restores that version in code and preview | VERIFIED | `TurnItem onClick -> onRestore(v.id) -> session.restore -> dispatch RESTORE` (shell:215, hook:150-153). The reducer moves `cursor` (session.ts:238-249). `committed = versions[cursor]` feeds both `SandboxPreview code` and `CodeView code`. `scrollResetKey` resets the code scroll to the top (code-view.tsx:45-47, a layout effect after IN-03). Covered by shell tests at lines 436 and 592 and by the e2e "restore an earlier turn from the list". |
| 3 | After a restore, later versions are dimmed and "Refinar a partir da vN" is shown; refining discards the later versions | VERIFIED | `position === "later"` applies `opacity-50` to the instruction and icon, and the label ends with "Será descartada ao refinar." `laterRange(state)` gives the base notice in singular or plural form (shell:113-120). PromptForm renders `#refine-base-notice` above the textarea, wired through `aria-describedby`. The hook's `send` uses `committedVersion` (the restored one) as base. COMMIT does `versions.slice(0, baseIndex+1)` and appends, so the new version is numbered vN+1. Covered by the shell test at line 493 and by the e2e. |
| 4 | Only the latest 20 versions are kept | VERIFIED | `MAX_VERSIONS = 20`. COMMIT shifts the oldest versions while `length > 20` and adds them to `droppedCount`. `displayNumber = droppedCount + index + 1` keeps numbers stable. The cap line "Versões mais antigas descartadas (limite de 20)" shows when `droppedCount > 0`. RESET sets `droppedCount` to 0. The IN-01 guard keeps history when the base is gone. Covered by session tests at lines 207 and 241. |
| 5 | Screen-reader and keyboard access: semantic list, aria-current, descriptive labels, aria-live status, focus managed after restore/reset | VERIFIED (code) / human for real AT | `<ol>` has an explicit `role="list"` (WR-02) and an aria-label. Items are native `<button>`s in the tab order, with no roving tabindex. Labels read "Restaurar vN: …" or "vN, versão atual: …". The single `aria-live="polite"` region shows "Voltou para vN" (notice undo) and "Foi para vN" (notice forward). Only `busy` disables items, so focus stays on the clicked item (test at line 436). Reset focuses the textarea (requestNew / dialog confirmFocusRef). |

**Score:** 5/5 truths verified

### Plan must-haves (07-01..07-05): all verified

- **07-01:** VERIFIED.
  - RESTORE is a no-op (same state reference) while pending, for an unknown id and for the current id. It sets notice `undo` or `forward` and clears the error.
  - The selectors exist: `displayNumber`, `versionNumber`, `currentNumber`, `laterRange`.
  - `hasDroppedVersions` was removed by review fix IN-01 as dead code. That is an intentional, documented change; nothing uses it.
  - The IN-01 COMMIT guard is in place, and `restore` is exposed by the hook.
- **07-02:** VERIFIED.
  - The `turnList` slot sits between `sessionBar` and the heading.
  - `baseNotice` renders only when it is truthy.
  - `aria-describedby` switches between "refine-base-notice prompt-char-count" and "prompt-char-count".
  - `scrollResetKey` works in CodeView.
- **07-03:** VERIFIED.
  - Items use stable numbers, oldest first.
  - Item states (current, later, busy) and the transient row work as specified.
  - The cap line shows only when `droppedCount > 0`.
  - The disclosure has `aria-expanded`/`aria-controls` and is hidden at `md` and above.
  - Scrolling is container-only (`scrollIntoContainer`, no `scrollIntoView`).
- **07-04:** VERIFIED.
  - The list appears only when `refineMode` (`versions.length > 0`) is true, so a failed first generation shows no list.
  - The session bar reads "vN · M versões" or "vN · 1 versão".
  - `historyOpen` is only reset by `doReset`.
  - Chips are keyed by `committed.id` (useSuggestions cache), so they follow the restore.
  - The `onRestore={session.restore}`, `laterRange(state)` and `scrollResetKey=` links are present.
- **07-05:** VERIFIED in the spec.
  - The spec has the "v2 · 2 versões" and "v1 · 1 versão" strings and the restore smoke (`Restaurar v1`, `Foi para v2`).
  - The orchestrator reports Playwright at 7 passed and 2 skipped. I did not re-run it, per instructions.

### CONTEXT decisions D-01..D-20

All are reflected in code:

- **Layout (D-01..D-04):** `max-h-44` is 5 × 32px rows plus gaps, and the list scrolls on its own. The mobile disclosure is collapsed by default. Order is oldest first, with a layout-effect scroll. The list shows only after v1.
- **Items (D-05..D-08):** one line with truncation and a `title`, plus the status icons. The current item has a badge, a border and `aria-current`. Later items are at 50% opacity with no strikethrough.
- **Transient turns (D-09..D-11):** the gerando row shows while streaming with all items disabled. The erro row is cleared by START, UNDO, RESTORE and RESET. ABORT leaves no trace and keeps the prompt.
- **Restore (D-12..D-16):** restore is instant with a code-scroll reset. Later items stay clickable. Undo is cursor − 1. The notice wording is singular or plural and the button still says "Refinar". Chips follow the restored version.
- **Numbering (D-17):** stable `droppedCount` numbering. The text is "vN · M versões".
- **Accessibility (D-18..D-20):** `<ol>` with buttons, focus kept on the clicked item, and the "Voltou para" / "Foi para" wording.

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/lib/session.ts` | VERIFIED | RESTORE, `forward` notice, `droppedCount`, selectors, IN-01 guard |
| `src/components/generator/use-generator-session.ts` | VERIFIED | `restore` dispatches RESTORE and is returned |
| `src/components/generator/turn-item.tsx` | VERIFIED | Exports TurnItem and TransientTurnItem; used by turn-list |
| `src/components/generator/turn-list.tsx` | VERIFIED | Exports TurnList, scrollIntoContainer and TurnTransient; used by the shell |
| `src/components/generator/prompt-form.tsx` | VERIFIED | `turnList` and `baseNotice` props are rendered |
| `src/components/generator/code-view.tsx` | VERIFIED | `scrollResetKey` prop and effect |
| `src/components/generator/session-bar.tsx` | VERIFIED | "versões"/"versão" counter |
| `src/components/generator/generator-shell.tsx` | VERIFIED | All wiring present |
| `e2e/generate.spec.ts` | VERIFIED | Updated counter strings and the restore smoke |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| hook `restore` | reducer RESTORE | `dispatch({ type: "RESTORE", versionId })` | WIRED |
| shell | `session.restore` | `TurnList onRestore={session.restore}` | WIRED |
| shell | `laterRange` / `currentNumber` | status and baseNotice derivation | WIRED |
| shell | CodeView | `scrollResetKey={scrollResetKey}` | WIRED |
| textarea | `#refine-base-notice` | `aria-describedby` | WIRED |
| TurnList | `displayNumber` / `MAX_VERSIONS` | import | WIRED |
| TurnList layout effect | `scrollIntoContainer(` | container-only scroll | WIRED |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
|----------|------|--------|-----------|--------|
| TurnList | `versions`, `cursor`, `droppedCount` | `useReducer(sessionReducer)` state, via the shell | yes | FLOWING |
| Preview / CodeView | `committed.code` | `versions[cursor]` | yes | FLOWING |
| Status region | `notice` + `currentNumber` | reducer | yes | FLOWING |
| Chips | `useSuggestions({id, code})` | `/api/suggest` + per-id cache | yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Unit and integration suite (reducer RESTORE/cap/IN-01, shell restore/forward/discard/chips/gerando/erro/disclosure/focus) | `npx vitest run` | 24 files, 308 tests passed | PASS |
| Typecheck | `npx tsc --noEmit` | exit 0 | PASS |
| Lint | `npx eslint src e2e` | no output | PASS |
| E2E restore smoke | Playwright (not re-run per instructions) | orchestrator reports 7 passed, 2 skipped (opt-in screenshots) | PASS (reported) |

### Probe Execution

None declared. Step 7c does not apply.

### Requirements Coverage

| Requirement | Plans | Status | Evidence |
|-------------|-------|--------|----------|
| HIST-01 | 07-03, 07-04, 07-05 | SATISFIED | SC1 |
| HIST-02 | 07-01, 07-02, 07-04, 07-05 | SATISFIED | SC2 |
| HIST-03 | 07-01, 07-02, 07-03, 07-04, 07-05 | SATISFIED | SC3 |
| HIST-04 | 07-01, 07-03, 07-04 | SATISFIED | SC4 |
| HIST-05 | 07-02, 07-03, 07-04, 07-05 | SATISFIED (code); real AT needs a human check | SC5 |

No orphaned requirements. REQUIREMENTS.md still lists HIST-01..05 as "Pending" in its checkboxes and traceability table. That is a bookkeeping update for the orchestrator.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (phase files) | none | No TBD/FIXME/XXX/TODO/HACK markers | none | none |
| working tree | none | `.env.example`, `theme-provider.tsx` and `vitest.setup.ts` have uncommitted changes | Info | Not a Phase 7 file; these are the leftover changes ROADMAP Phase 5 flagged for reconciliation. They are not part of this phase's goal. |

The review reported 0 critical, 3 warning and 6 info findings. The review-fix report shows all 6 targeted findings fixed and none skipped. The fixes for WR-01 and WR-03 are explicitly marked as needing human verification, and they appear in the human items below.

### Human Verification Required

1. **Desktop visual check.** Check the current-item styling (bg-muted, primary left border, "atual" badge), the 50% dimming of later items and the list height of about 5 items, in light and dark themes.
2. **Scroll geometry (WR-03).** With 8 or more versions, the current or transient item should be fully visible after commit, undo or restore, its focus ring should not be clipped, and the page should not scroll.
3. **Screen reader (including Safari/VoiceOver for WR-02).** Check the list semantics, `aria-current`, the restore labels, the status announcements and that focus stays on the clicked item.
4. **Mobile disclosure.** "Histórico (N)" should start collapsed, keep its state across commit, undo and restore, and collapse on Novo componente. Touch targets should be at least 44px.
5. **WR-01.** After a restore with a preview runtime error, the preview "Tentar de novo" should not discard later versions.

### Gaps Summary

No gaps. Every roadmap success criterion, plan must-have and CONTEXT decision is backed by code that is substantive, wired and has real data flowing through it, with tests covering it. What remains is visual, assistive-technology, layout-geometry and mobile behavior that jsdom cannot assert, so the status is human_needed.

---

_Verified: 2026-10-18T00:40:00Z_
_Verifier: Claude (gsd-verifier)_

## Update 2026-10-18: browser check (orchestrator)

Headless Chromium against the e2e mock (dark theme, 7 versions, restore v2), desktop 1280×900 and mobile 390×844:
- **WR-03 scroll:** the current item is fully inside the container's padding box (desktop: item 206–238 inside 166–340). Focus stays on the clicked item and the list scrolls itself, not the page.
- **Visual:** the current item has a highlighted background, a left border and the "atual" badge. Later versions are dimmed, with the vN label at full opacity. The list shows about 5 rows and is cut mid-row on purpose. The notice reads "Refinar a partir da v2 — v3 a v7 serão descartadas".
- **Mobile:** the "Histórico (7)" disclosure is open and the rows meet the 44px touch target.
- **Found and fixed during the check, outside Phase 7:** the whole app fell back to a serif font (Geist was never applied). Commit "fix: apply Geist font".

Still for the user (non-blocking): a screen-reader pass (NVDA/VoiceOver, including Safari for WR-02) and a manual run of WR-01 (preview runtime error after a restore).
