---
phase: 08-editable-code-view
plan: 04
subsystem: generator-ui
tags: [editor, drafts, debounce, preview]
requires:
  - "08-01 Version.source / canRegenerate false on manual"
  - "08-02 CodeView onChange/readOnly/dirty/onDiscard/historyKey"
  - "08-03 SandboxPreview errorSource, TurnTransient rascunho"
provides:
  - "useDebouncedDraft<T>(value: T | null, ms): T | null"
  - "Shell draft state { baseId, code }, dirty, editorValue, previewCode, composite versionKey"
affects: [08-05]
tech-stack:
  added: []
  patterns:
    - "Null pass-through debounce: stored value cleared during render, never in an effect"
    - "Composite history/scroll key `${committed.id}:${nextVersionId}:${cursor}`"
key-files:
  created:
    - src/components/generator/use-debounced-draft.ts
    - src/components/generator/use-debounced-draft.test.tsx
  modified:
    - src/components/generator/generator-shell.tsx
    - src/components/generator/generator-shell.test.tsx
decisions:
  - "useDebouncedDraft clears its stored value during render when the input turns null, so a new draft after a discard never shows the previous draft before its own 500 ms timer"
  - "TurnList draftActive is not wired here; the clickable current item belongs with 08-05's commit-before-action sequencing"
metrics:
  duration: "~10 min"
  completed: 2026-10-18
  tasks: 2
  files: 4
---

# Phase 8 Plan 04: Shell draft wiring Summary

After v1 the code view can be edited. Typing creates a draft that only the shell holds, `{ baseId, code }`. The preview picks up the draft 500 ms after the last keystroke, without the "Atualizando…" badge. While a draft exists, the header shows "Editado" and "Descartar edições", the turn list ends with the row "Edição manual (rascunho)", and the preview's "Tentar de novo" is hidden, with `errorSource` set to "user". Copiar and Baixar export the draft. The editor is read-only before v1 exists and while code streams.

## Tasks

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | useDebouncedDraft hook and shell draft wiring | 86f362a |
| 2 | Shell integration tests (editable code describe, 9 tests) | 644cb16 |

## Verification

- `npx vitest run`: 387 tests pass (5 new for useDebouncedDraft, 9 new shell tests)
- `npm run typecheck` and `npm run lint`: clean
- The plan's grep checks all pass. `codeForPanel` is gone, there is exactly 1 `aria-live`, and the composite versionKey is present.

## Deviations from Plan

None in product code. In the tests, the committed code is the output of `parseCode`, which is trimmed. So the shell tests compare against `FIXED_COMPONENT.trim()` and `REFINED_COMPONENT.trim()` (`V1`/`V2`) instead of the raw constants.

## Notes for 08-05

- The stale-draft effect only fires when the committed id moves away from `draft.baseId`. Flows that commit and then undo or restore back to the base must call `setDraft(null)` themselves.
- The "drops a stale draft" test restores without committing first. 08-05 changes that flow and owns updating the test.

## Known Stubs

None.

## Self-Check: PASSED

- Created files exist: use-debounced-draft.ts, use-debounced-draft.test.tsx
- Commits 86f362a and 644cb16 exist in git log
