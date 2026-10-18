---
phase: 08-editable-code-view
plan: 05
subsystem: generator-ui
tags: [editor, drafts, session, status]
requires:
  - "08-01 send/retry/undo/restore(draft?), COMMIT_MANUAL, savedManualId, versionNumber"
  - "08-03 DiscardDraftDialog, TurnList draftActive"
  - "08-04 shell draft state, dirty, draftCode, stale-draft effect"
provides:
  - "Draft-aware handleSubmit/handleRetry/handleUndo/handleRestore in GeneratorShell"
  - "D-09 discard confirmation when going to a later version with a draft"
  - "Composite status 'Edição salva como vM · …'"
affects: []
tech-stack:
  added: []
  patterns:
    - "Commit-then-act handlers. Undo and restore clear the draft explicitly because they land back on the draft's base id"
key-files:
  created: []
  modified:
    - src/components/generator/generator-shell.tsx
    - src/components/generator/generator-shell.test.tsx
decisions:
  - "handleUndo and the non-D-09 branch of handleRestore always call setDraft(null) after the session action, so a second Desfazer never commits a duplicate manual version"
  - "Desfazer is enabled when canUndo || (dirty && !busy), and the shortcut is suppressed while either dialog is open"
metrics:
  duration: "~12 min"
  completed: 2026-10-18
  tasks: 2
  files: 2
---

# Phase 8 Plan 05: Commit draft before actions Summary

Every session action now respects the draft. Refine (button or Ctrl/⌘+Enter), Desfazer (button or Ctrl/⌘+Z outside text fields), restoring an earlier or the current version, and the banner's "Tentar de novo" each save the draft as an "Edição manual" version first and then act on it. Going to a later, dimmed version while a draft exists opens "Descartar edições?" (D-09). "Cancelar" or Escape keeps the draft, and "Descartar edições e ir" drops it and restores the target ("Foi para vX"). "Novo componente" asks for confirmation whenever a draft exists, even with a single version. The single aria-live status shows the composite text "Edição salva como vM · Refinando…", "· Voltou para vN" or "· Foi para vN", or "Edição salva como vM" alone (for example, when an oversized draft is rejected without a request).

## Tasks

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | Draft-aware handlers, D-09 dialog, Novo componente rule, composite status | 8ba26a4 |
| 2 | Shell integration tests (draft commit before actions describe, 16 tests) | 2b7b31f |

## Verification

- `npx vitest run`: 403 tests pass (16 new)
- `npm run typecheck` and `npm run lint`: clean
- The plan's grep checks pass: `session.send(prompt.trim(), draftCode)`, `session.retry(draftCode)`, `session.undo(draftCode)`, `versions.length > 1 || dirty`, `<DiscardDraftDialog` and a single `aria-live` are all present. No `onUndo={session.undo}` or `onRestore={session.restore}` remains.

## Deviations from Plan

- The 08-04 "drops a stale draft" test now expects the draft to be committed before restoring v1, as D-07 requires. It checks for the status "Edição salva como v3 · Voltou para v1" and "v1 · 3 versões". The plan asked for this update.
- The oversized-draft test has a 30 s timeout. Rendering a draft of MAX_CODE_LENGTH + 1 characters in jsdom takes about 5 s. This changes only the test, not the product.
- To check the editor value against a substring, the tests read `.value` and use `toContain`, because `toHaveValue` does not accept asymmetric matchers.

No product bugs were found, and the hook and reducer were not changed.

## Known Stubs

None.

## Self-Check: PASSED

- generator-shell.tsx and generator-shell.test.tsx are modified
- Commits 8ba26a4 and 2b7b31f exist
