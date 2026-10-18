---
phase: 08-editable-code-view
plan: 03
subsystem: generator-ui
tags: [preview, turn-list, alert-dialog, drafts]
requires: []
provides:
  - "SandboxPreview errorSource?: \"ai\" | \"user\" (default \"ai\")"
  - "TurnTransient kind \"rascunho\" (instruction ignored) rendered as 'Edição manual (rascunho)'"
  - "TurnList draftActive?: boolean -> TurnItem allowCurrentClick"
  - "DiscardDraftDialog({ open, onOpenChange, onConfirm, baseNumber, targetNumber, finalFocusRef? })"
affects: [08-04, 08-05]
tech-stack:
  added: []
  patterns:
    - "Copy variant chosen by a prop, look and sandbox untouched"
    - "AlertDialog with Cancelar initialFocus and a single finalFocus target for both outcomes"
key-files:
  created:
    - src/components/generator/discard-draft-dialog.tsx
    - src/components/generator/discard-draft-dialog.test.tsx
  modified:
    - src/components/generator/sandbox-preview.tsx
    - src/components/generator/sandbox-preview.test.tsx
    - src/components/generator/turn-item.tsx
    - src/components/generator/turn-list.tsx
    - src/components/generator/turn-list.test.tsx
decisions:
  - "The rascunho row is an early-return branch in TransientTurnItem, so gerando/erro markup stays byte-identical"
  - "DiscardDraftDialog has no confirmed-ref branch: both outcomes return focus to finalFocusRef (the clicked turn item survives the restore)"
metrics:
  duration: "~5 min"
  completed: 2026-10-18
  tasks: 3
  files: 7
---

# Phase 8 Plan 03: Draft presentational pieces Summary

SandboxPreview gets an `errorSource="user"` copy variant for errors in the user's own code (D-12). The turn list gets a non-interactive "Edição manual (rascunho)" row with a Pencil icon (D-14) and a current item that becomes clickable while a draft exists (D-07). A new DiscardDraftDialog covers the phase's only confirmation (D-09).

## Tasks

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | SandboxPreview errorSource copy variant | 04761cf |
| 2 | Turn list draft row and clickable current item | 5ece193 |
| 3 | DiscardDraftDialog (D-09) | 39d9d94 |

## Verification

- `npx vitest run`: 373 tests pass (5 new in sandbox-preview, 5 new in turn-list, 5 in discard-draft-dialog)
- `npm run typecheck` and `npm run lint`: clean
- `sandbox="allow-scripts"` unchanged (T-08-06)

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None. The components are wired by 08-04/08-05.

## Self-Check: PASSED

- Created files exist: discard-draft-dialog.tsx, discard-draft-dialog.test.tsx
- Commits 04761cf, 5ece193, 39d9d94 exist in git log
