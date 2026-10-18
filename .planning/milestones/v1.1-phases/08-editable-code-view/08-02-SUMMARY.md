---
phase: 08-editable-code-view
plan: 02
subsystem: code-view
tags: [editor, a11y, react-simple-code-editor, prism]
requires: []
provides:
  - "CodeView props: code, busy, scrollResetKey (string | number | null), onChange, readOnly (default busy || !onChange), dirty, onDiscard, historyKey"
  - "Editor ids: textarea#code-editor, hint#code-editor-hint, h2#code-panel-title; scroll wrapper data-testid code-scroll"
  - "Editado badge + Descartar edições button when dirty && !readOnly"
affects: [08-04, 08-05, 08-06]
tech-stack:
  added:
    - "react-simple-code-editor 0.14.1 (exact)"
  patterns:
    - "Read-only lock: preventDefault only the keys the library rewrites (Enter, Backspace, Ctrl/Meta+Z/Y, bracket/quote wrap with a selection) plus a no-op onValueChange"
    - "Exit mode: Escape preventDefault + ignoreTabKey={readOnly || exitMode}"
    - "Imperative aria-describedby on the textarea; label htmlFor for the name"
    - "Undo history reset via the editor ref session setter on historyKey change (no key remount)"
key-files:
  created: []
  modified:
    - package.json
    - package-lock.json
    - src/components/generator/code-view.tsx
    - src/components/generator/code-view.test.tsx
    - src/components/generator/generator-shell.test.tsx
decisions:
  - "Bracket/quote wrap keys are blocked in read-only only when text is selected (the only case the library rewrites), so Ctrl+9 / Cmd+[ browser shortcuts stay untouched"
  - "onKeyDown is typed KeyboardEvent<HTMLElement> because the library types it as a div & textarea handler intersection"
  - "Discard focus uses requestAnimationFrame because the button unmounts with the draft"
metrics:
  duration: "~12 min"
  completed: 2026-10-18
  tasks: 2
  files: 5
---

# Phase 8 Plan 02: Editable code view Summary

CodeView now hosts react-simple-code-editor 0.14.1 with the prism-react-renderer Highlight as its highlight layer. It keeps the old panel look (nightOwl / nightOwlLight, 12px padding, font-mono text-xs leading-relaxed, max-md:text-base). It is labelled "Editor de código" and described by the always-visible hint "Esc e depois Tab para sair". The editor is read-only whenever there is no onChange, so the shell behaves as before until 08-04 wires the drafts.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install react-simple-code-editor and rewrite CodeView as the editor host | 86ee158 | package.json, package-lock.json, code-view.tsx, code-view.test.tsx, generator-shell.test.tsx |
| 2 | CodeView editor behavior tests | 8f86c75 | code-view.test.tsx |

## What was built

- Section `aria-labelledby="code-panel-title"`, title "Código". Header order: Descartar edições (only when dirty, editable and onDiscard is set), Copiar, Baixar. All three have `max-md:min-h-11`.
- Editor in a scroll wrapper (`data-testid="code-scroll"`, focus-within ring, theme background). The highlight renders one div per line with no wrapping pre.
- Read-only lock (P1): `rewritesValue()` blocks only the library-handled rewrites. Tab, Shift+Tab, Escape, arrows, copy and select-all pass through. While read-only the library's Escape blur applies.
- Editable: Escape enters exit mode (preventDefault stops the blur), so the next Tab or Shift+Tab leaves the editor. Any other non-modifier key, focus or blur resets exit mode.
- historyKey resets the library's undo stack through the ref `session` setter. scrollResetKey resets the wrapper scroll and the textarea selection.
- Copy and download use the shown value. When the clipboard fails, the copy fallback focuses the textarea and selects its text.
- Shell tests: every unnamed `getByRole("textbox")` is now named "Descreva a mudança" (all of them were in refine mode). The restore scroll test queries `code-scroll`.

## Verification

- `npm ls react-simple-code-editor`: 0.14.1. The only package.json change is that dependency line.
- `npx vitest run`: 24 files, 357 tests pass. code-view.test.tsx has 25 tests.
- `npm run typecheck` and `npm run lint`: clean.
- Mutation check: with the read-only guard, the onValueChange guard and the history reset removed, the 3 matching tests fail. The code was restored afterwards.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] onKeyDown type mismatch**
- **Found during:** Task 1 typecheck
- **Issue:** The library types `onKeyDown` as `KeyboardEventHandler<HTMLDivElement> & KeyboardEventHandler<HTMLTextAreaElement>`, so a textarea-typed handler failed tsc.
- **Fix:** The handler takes `KeyboardEvent<HTMLElement>` and casts `currentTarget` to a textarea where it needs the selection.
- **Commit:** 86ee158

## TDD Gate Compliance

Task 2 is marked `tdd="true"`, but the plan has Task 1 implement the behavior first, in a commit that also has to leave the suite green. So Task 2 has no failing RED commit. To make up for it, the guards were removed by hand and the matching tests were confirmed to fail (see Verification).

## Known Stubs

None. CodeView stays read-only until 08-04 passes onChange, dirty, onDiscard and historyKey from the shell. That is planned, not a stub.

## Self-Check: PASSED

- FOUND: src/components/generator/code-view.tsx
- FOUND: src/components/generator/code-view.test.tsx
- FOUND: 86ee158
- FOUND: 8f86c75
