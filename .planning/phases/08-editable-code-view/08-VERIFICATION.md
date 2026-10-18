---
phase: 08-editable-code-view
verified: 2026-10-18T06:00:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 1
overrides:
  - must_have: "User can type in the syntax-highlighted code view (light/dark kept); it is locked while a generation streams"
    reason: "User decision outside Phase 8: the site is dark-only (theme toggle removed, ThemeProvider forcedTheme=\"dark\" in src/app/layout.tsx). The 'light/dark kept' clause of EDIT-04 is satisfied by the dark theme only. CodeView still maps resolvedTheme 'light' to nightOwlLight, so light would work if the theme were re-enabled."
    accepted_by: "matheus (user decision, relayed by orchestrator)"
    accepted_at: "2026-10-18T06:00:00Z"
human_verification:
  - test: "Type in the code editor on desktop (dark theme) and watch the highlight layer"
    expected: "The caret and the highlighted text stay aligned while typing, including long lines and Tab indents. The colors match nightOwl. The 12px padding and font match the old panel. No flicker or 'Atualizando…' badge appears while the preview follows after about 500 ms."
    why_human: "Overlay alignment and visual polish cannot be checked with grep or jsdom."
  - test: "Use a screen reader (NVDA or VoiceOver) on the editor: Tab into it, type, press Esc then Tab"
    expected: "The field is announced as 'Editor de código' with the description 'Esc e depois Tab para sair'. Status changes ('Edição salva como vM · Refinando…', 'Pronto — vK') are announced once, through the single live region."
    why_human: "Real assistive-tech announcement order and verbosity need a person to judge."
  - test: "Open the Código tab on a phone (iOS Safari and Android Chrome), edit the code, then refine"
    expected: "Focusing the editor does not zoom the page (16px font on mobile). Editing works. The Editado badge and the Descartar edições, Copiar and Baixar buttons wrap and stay tappable."
    why_human: "Mobile zoom and touch behavior need a real device."
  - test: "Type into a draft that has a syntax error, then fix it"
    expected: "The preview shows the user-code error copy ('Seu código tem um erro…'), the app stays usable, and the preview recovers by itself after the fix."
    why_human: "Unit tests and e2e cover this logic, but how the iframe error state looks and recovers is visual."
---

# Phase 8: Editable Code View Verification Report

**Phase Goal:** Users can edit the generated code by hand, see the preview follow, and refine or export exactly what they edited.
**Verified:** 2026-10-18T06:00:00Z
**Status:** human_needed
**Re-verification:** No (initial verification)

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can type in the syntax-highlighted code view (light/dark kept). It is locked while a generation streams. | PASSED (override) | `code-view.tsx` hosts `react-simple-code-editor` with the `prism-react-renderer` `Highlight` (nightOwl, or nightOwlLight when resolvedTheme is light). Shell passes `readOnly={busy \|\| !committed}`. While read-only, `onValueChange` is ignored and `rewritesValue` blocks Enter, Backspace, Ctrl+Z/Y and wrapping. While pending, the editor shows the live parsed stream. Tests: shell "is editable after v1 and locked while a refine streams (D-05)" and CodeView "never changes the value while read-only". Dark-only is an accepted user override (forcedTheme="dark" in `src/app/layout.tsx`). |
| 2 | After a ~500 ms pause the preview reflects the edit. Invalid code shows the existing preview error state without breaking the app. | VERIFIED | `use-debounced-draft.ts` is a trailing debounce with an instant null pass-through. The shell calls `useDebouncedDraft(dirty ? draft : null, 500)`, which feeds `SandboxPreview code={previewCode}`. `errorSource="user"` switches the copy. `onRegenerate` is omitted while dirty. Tests: shell "debounces the preview by 500 ms…" and "hides the preview regenerate and flags user code…". E2E: the `marca-e2e` marker reaches the iframe srcdoc. |
| 3 | Refining after a manual edit uses the edited code as base and records an "Edição manual" version first, so undo returns to it. | VERIFIED | `session.ts` has `COMMIT_MANUAL`: source "manual", instruction "", truncates after the cursor, applies the cap, skips the export default check, ignores the action while pending or when the draft equals the base or is empty. The hook's `commitManual` advances `stateRef` eagerly, so `send` calls `run(text, committedVersion(stateRef.current))`. The shell's `handleSubmit` calls `session.send(prompt, draftCode)`, and undo, restore and retry follow the same pattern. E2E: `postDataJSON().currentCode` contains the edit, the list shows "Edição manual", and Desfazer brings back "Voltou para v2" with the edit in the editor. |
| 4 | Copy and download export the code currently shown, including manual edits. | VERIFIED | `handleCopy` and `handleDownload` use the `code` prop, which is `editorValue` (the draft when dirty). Tests: shell "copies the draft text shown (D-17)" and e2e "Copiar exports the edited code" (clipboard contains `copiado-e2e`). |
| 5 | The editor is keyboard-accessible: labelled, no Tab trap, Escape exits. | VERIFIED | The editor has `<label htmlFor="code-editor">Editor de código</label>` and an imperative `aria-describedby="code-editor-hint"` that points to "Esc e depois Tab para sair". `ignoreTabKey={readOnly \|\| exitMode}`. Escape sets exitMode, and any other key or a focus change clears it. E2E: the editor has the expected accessible description, Tab keeps focus inside, and Esc then Tab moves focus out. |

**Score:** 5/5 (one item passed by override)

### Plan must-haves (D-01..D-17)

| Decision | Status | Evidence |
|----------|--------|----------|
| D-01 react-simple-code-editor 0.14.1 + Prism | VERIFIED | `package.json`: `"react-simple-code-editor": "0.14.1"`. This is the only new dependency. |
| D-02 Tab/Shift+Tab indent 2, Esc exit mode, hint | VERIFIED | `tabSize={2} insertSpaces`. CodeView tests cover indent and unindent, Esc+Tab, Esc+Shift+Tab, and leaving exit mode on another key. |
| D-03 no line numbers, same look | VERIFIED (visual: human) | No gutter. `padding={12}` and `font-mono text-xs leading-relaxed`. |
| D-04 mobile Código tab | VERIFIED (device: human) | The same CodeView sits inside `#panel-code`, with `max-md:text-base` (IN-05 won't-fix, documented). |
| D-05 read-only while streaming / before v1 | VERIFIED | `readOnly={busy \|\| !committed}`. The reducer ignores COMMIT_MANUAL while pending. |
| D-06 shell-only draft, equal = none, stale dropped | VERIFIED | `draft {baseId, code}`. `dirty` requires a matching baseId and different code. An effect drops a stale draft. |
| D-07 commit before refine/undo/restore/retry/new | VERIFIED | `handleSubmit`, `handleUndo`, `handleRestore` and `handleRetry` pass `draftCode`. `requestNew` asks when `dirty`. `undoEnabled = canUndo \|\| (dirty && !busy)`. |
| D-08 commit on older version truncates later | VERIFIED | `appendVersion(state, versions.slice(0, cursor+1), …)`. The base notice uses `laterRange`. |
| D-09 discard dialog for later target | VERIFIED | `DiscardDraftDialog` has the exact copy, initial focus on Cancelar, and `finalFocus` on the clicked item. `handleRestore` sends `idx > cursor` (and the WR-01 cap edge) to the dialog. |
| D-10 broken/oversized draft saved as-is | VERIFIED | There is no hasDefaultExport check in COMMIT_MANUAL. `run` rejects a base over MAX_CODE_LENGTH with REJECT too_large. |
| D-11 500 ms, no badge | VERIFIED | See truth 2. |
| D-12 error copy + no regenerate on draft/manual | VERIFIED | `canRegenerate` requires `source === "ai"`. `sandbox-preview.tsx` has the exact user-error copy. |
| D-13 Editado + Descartar edições | VERIFIED | `showDraftControls = dirty && !readOnly`. Discard has no confirmation, resets the editor history (IN-01) and moves focus to the editor. |
| D-14 rascunho row | VERIFIED | `turn-item.tsx` uses `DRAFT_TEXT = "Edição manual (rascunho)"` with a Pencil icon. The transient precedence is gerando > rascunho > erro. |
| D-15 "Edição salva como vM" status | VERIFIED | `savedManualId` carries over for exactly one follow-up action. The shell builds the combined status in its single aria-live region. |
| D-16 title "Código", name "Editor de código" | VERIFIED | `h2#code-panel-title` reads "Código". The section is `aria-labelledby` that title. E2E has no selector on "Código gerado". |
| D-17 export what is shown | VERIFIED | See truth 4. |

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/lib/session.ts` | VERIFIED | COMMIT_MANUAL, appendVersion, notice "manual", savedManualId, canRegenerate source rule |
| `src/components/generator/use-generator-session.ts` | VERIFIED | Eager `commitManual`. send, retry, undo and restore take an optional draft. |
| `src/components/generator/code-view.tsx` | VERIFIED | Editor host with value, onChange, readOnly, dirty, onDiscard and historyKey |
| `src/components/generator/use-debounced-draft.ts` | VERIFIED | Imported and used by the shell |
| `src/components/generator/discard-draft-dialog.tsx` | VERIFIED | Rendered by the shell |
| `src/components/generator/turn-item.tsx` / `turn-list.tsx` | VERIFIED | Rascunho kind, `allowCurrentClick={draftActive && position === "current"}` |
| `src/components/generator/sandbox-preview.tsx` | VERIFIED | `errorSource` prop, set by the shell |
| `e2e/generate.spec.ts` | VERIFIED | "edit smoke" describe with 3 tests |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| hook commitManual | sessionReducer COMMIT_MANUAL | `stateRef.current = next` then dispatch | WIRED |
| hook send | run(base) | `committedVersion(stateRef.current)` after commit | WIRED |
| code-view | textarea#code-editor | label htmlFor + imperative aria-describedby | WIRED |
| code-view | Editor | `ignoreTabKey={readOnly \|\| exitMode}` | WIRED |
| turn-list | TurnItem | `allowCurrentClick={draftActive …}` | WIRED |
| shell | CodeView | onChange, readOnly, dirty, onDiscard, historyKey | WIRED |
| shell | SandboxPreview | `code={previewCode}`, `errorSource=` | WIRED |
| shell | session.send / undo / restore / retry | `draftCode` | WIRED |
| shell | status | `Edição salva como v…` from savedManualId | WIRED |
| e2e | POST /api/generate | `waitForRequest` + `postDataJSON().currentCode` | WIRED |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
|----------|------|--------|-----------|--------|
| CodeView | `code` | `editorValue` = stream, or draft, or committed version | Yes | FLOWING |
| SandboxPreview | `code` | `previewCode` = debounced draft or committed code | Yes | FLOWING |
| Refine request | `currentCode` | manual Version.code after the eager commit | Yes (e2e asserted) | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Unit and integration suite | `npx vitest run` | 27 files, 418 tests passed | PASS |
| Typecheck | `npx tsc --noEmit` | exit 0 | PASS |
| Lint | `npx eslint src e2e` | no output | PASS |
| E2E (orchestrator evidence, not re-run) | `npx playwright test` (E2E_PORT=3200) | 10 passed, 2 skipped (opt-in screenshots) | PASS (reported) |

### Probe Execution

None declared. Step 7c does not apply.

### Requirements Coverage

| Requirement | Source Plans | Status | Evidence |
|-------------|--------------|--------|----------|
| EDIT-04 | 01, 02, 04, 06 | SATISFIED (override on light theme) | Truth 1 |
| EDIT-05 | 01, 03, 04, 06 | SATISFIED | Truth 2 |
| EDIT-06 | 01, 03, 05, 06 | SATISFIED | Truth 3 |
| EDIT-07 | 02, 04, 06 | SATISFIED | Truth 4 |
| EDIT-08 | 02, 06 | SATISFIED | Truth 5 |

There are no orphaned requirements. REQUIREMENTS.md still shows EDIT-04..08 as "Pending" and unchecked, so the traceability table needs updating. This is bookkeeping, not a code gap.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (phase files) | - | TBD/FIXME/XXX | none found | - |
| `generator-shell.tsx` | errorSource / onRegenerate | Gating keys off `dirty`, not off "the preview shows the draft" (review IN-02) | Info | If the AI code was already broken, the first keystroke switches to user-error copy and hides "Tentar de novo" up to 500 ms before the preview changes. This is cosmetic. |
| `code-view.tsx` | `max-md:text-base` | 16px on mobile versus the 12px in UI-SPEC (IN-05) | Info | Deliberate won't-fix that prevents the iOS focus zoom |
| `use-generator-session.ts` | send | An oversized draft is saved before it is rejected (IN-08) | Info | Intended and tested. Desfazer recovers it. |

### Human Verification Required

1. **Editor overlay and visual fidelity.** Type on desktop. The caret and highlight stay aligned, the nightOwl colors and the old panel's padding and font are kept, and the preview follows after about 500 ms with no flicker.
2. **Screen reader.** The editor is announced as "Editor de código" with the hint "Esc e depois Tab para sair". Status messages are announced once.
3. **Mobile Código tab.** Focusing the editor does not zoom the page on iOS. Editing works, and the header buttons wrap and stay tappable.
4. **Broken draft recovery.** The user-error copy appears in the preview, the app stays usable, and the preview recovers by itself after the fix.

### Gaps Summary

None. All five ROADMAP success criteria and D-01..D-17 are present in the code, wired end to end, and covered by unit, integration and e2e tests. The light-theme wording of EDIT-04 is closed by an accepted user override (the site is dark-only). The status is human_needed only because the visual, assistive-tech and mobile checks above cannot be automated.

---

_Verified: 2026-10-18T06:00:00Z_
_Verifier: Claude (gsd-verifier)_
