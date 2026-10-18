# Phase 8: Editable Code View - Context

**Gathered:** 2026-10-18
**Status:** Ready for planning

<domain>
## Phase Boundary

The code panel becomes an editor with syntax highlighting. It keeps the current nightOwl / nightOwlLight look. Typing creates a draft on top of the current version:

- The preview follows the draft after a debounce.
- Copy and Baixar export what is shown.
- The draft becomes a `source: "manual"` version ("Edição manual") when the user refines, undoes, restores or starts a new component. Refinement then uses the edited code as its base.
- The editor is keyboard accessible.

Requirements: EDIT-04, EDIT-05, EDIT-06, EDIT-07, EDIT-08.

Out of this phase: the full e2e journey, the GIF and the READMEs (Phase 9). Also out: line numbers, search, autocomplete, formatting and persistence.
</domain>

<decisions>
## Implementation Decisions

### Carried forward (locked earlier — do not re-ask)
- The session reducer already models `Version.source: "ai" | "manual"`. The turn list already renders a manual version as "Edição manual" (Phase 7).
- Refining from an older version truncates the versions after it at COMMIT. The cap is 20 versions with stable display numbers (`droppedCount + index + 1`).
- There is one status `aria-live` region and only one "Tentar de novo" button at a time. The preview's regenerate is only offered when it would not delete versions (Phase 7 WR-01).
- "Novo componente" asks for confirmation when there is more than one version **or manual edits** (Phase 6 D-12). A draft counts as a manual edit.
- Code panel and preview switch instantly on restore (Phase 7 D-12). The code panel scrolls to the top on undo or restore.
- The model receives only the current code and the instruction (Phase 5 `currentCode`). `MAX_CODE_LENGTH` is 30 000: a 413 maps to `CODE_TOO_LARGE_MESSAGE`, and the client pre-checks the size.

### Editor
- **D-01:** Use `react-simple-code-editor`, a textarea overlay, with the existing `prism-react-renderer` providing the highlight. This is the one new dependency allowed in this phase. Research must smoke-test it with React 19 and Next 15 first. If it is incompatible, fall back to a homemade textarea overlay with no dependency (not CodeMirror) and record the decision.
- **D-02:** Tab and Shift+Tab indent by 2 spaces. Escape switches the editor to "exit" mode, so the next Tab moves focus out (no keyboard trap, EDIT-08). Show a visible hint "Esc e depois Tab para sair", also linked through `aria-describedby`.
- **D-03:** No line numbers; keep today's panel look.
- **D-04:** The editor works on mobile too, in the Código tab, with no extra features.
- **D-05:** The editor is read-only while a generation or refinement streams (EDIT-04). During the stream it shows the live streaming code, as today. It is also read-only before v1 exists, when there is no code.

### Draft → version
- **D-06:** Typing creates a draft on top of the current version. Only the shell holds this state; it is not a reducer version yet. A draft whose text equals the base version's code counts as no draft at all.
- **D-07:** The draft is committed as a `source: "manual"` version ("Edição manual") automatically, before any of these actions:
  - **Refinar:** commit, then refine from the manual version (EDIT-06).
  - **Desfazer** (button or Ctrl/⌘+Z outside fields): commit, then undo, which lands on the original version. The edit stays restorable in the list.
  - **Restore** of an earlier or the same-position version: commit, then restore.
  - **Novo componente:** the confirmation dialog appears because of the draft, then a reset.
- **D-08:** Editing an older, restored version follows the refine rule. When the draft is committed, it goes right after the base and drops the later versions. The base notice "Refinar a partir da vN — … serão descartadas" stays visible while editing.
- **D-09:** Edge case: a draft on an older version while the user clicks a later, dimmed version. Committing would delete that target, so ask first with an AlertDialog. The dialog says "Você tem edições na vN. Ir para a vX descarta essas edições." with the actions [Descartar edições e ir] and [Cancelar]. Confirming drops the draft and restores vX. This is the only case that asks.
- **D-10:** Refining with a broken draft is allowed. The manual version is saved as-is, even invalid, because "corrija o erro" is a valid instruction. Manual versions skip the `export default` validity rule that AI commits use, but the `MAX_CODE_LENGTH` pre-check still applies.

### Preview & invalid code
- **D-11:** The preview follows the draft 500 ms after typing stops. No "Atualizando…" badge, to avoid flicker.
- **D-12:** Broken edited code (syntax or runtime error, or no `export default`) shows the existing preview error state. It recovers by itself when the code is fixed. The preview's "Tentar de novo" (regenerate) is not shown while a draft exists, because the error comes from the user's code.

### Signalling
- **D-13:** While a draft exists, the code panel header shows an "Editado" badge and a "Descartar edições" button next to Copiar and Baixar. Discarding reverts to the version's code with no confirmation; the editor's own Ctrl+Z still works.
- **D-14:** The turn list shows a transient item "Edição manual (rascunho)" at the end, in the Phase 7 transient style with a neutral pencil icon. It becomes "vN · Edição manual ✓" once committed.
- **D-15:** The status region announces "Edição salva como vN" when a draft is committed. When it was committed because of a refine, the status then moves to "Refinando…" as usual.
- **D-16:** The panel title changes from "Código gerado" to "Código". The editor has the accessible name "Editor de código" and the exit hint from D-02.
- **D-17:** Copy and Baixar export exactly what the editor shows, draft included (EDIT-07).

### Claude's Discretion
- How draft state is held: shell state or the hook, possibly with a reducer action such as `COMMIT_MANUAL { code }`. Also the exact action names and how the "commit draft then X" sequencing is implemented.
- Debounce implementation, editor styling (padding and font must match today's `pre`), the badge and button styles, and the pencil icon choice (lucide).
- How the Escape "exit mode" is implemented. One example: a state flag that lets the next Tab through, reset when focus re-enters or on any other key.
- Test layout, and whether to extend the e2e smoke (the full journey is Phase 9).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/phases/07-turn-list-version-navigation/07-CONTEXT.md` — restore, numbering, transient items, base notice
- `.planning/phases/07-turn-list-version-navigation/07-UI-SPEC.md` — list and transient item visual contract
- `.planning/phases/07-turn-list-version-navigation/07-REVIEW-FIX.md` — WR-01 `canRegenerate` rule
- `.planning/phases/06-session-core-refine-loop/06-CONTEXT.md` — commit validity, D-12 reset confirmation, status texts
- `.planning/phases/06-session-core-refine-loop/06-UI-SPEC.md` — tokens and copy conventions
- `.planning/research/STACK.md`, `.planning/research/PITFALLS.md` — editor library notes (react-simple-code-editor vs CodeMirror)
- `.planning/REQUIREMENTS.md` — EDIT-04..EDIT-08
- `.planning/ROADMAP.md` §Phase 8 — success criteria and research flag (smoke-test react-simple-code-editor, bundle budget)
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/generator/code-view.tsx` holds the read-only `pre`, rendered by `Highlight` from `prism-react-renderer` with nightOwl in dark and nightOwlLight in light, through `useTheme`.
  - It has Copiar (clipboard plus a selection fallback) and Baixar (`componentFilename`).
  - Props are `busy` and `scrollResetKey`.
  - This file becomes the editor host.
- `src/lib/session.ts` holds the reducer. It already has `Version.source` ("manual" supported), COMMIT with truncation and the cap, RESTORE, UNDO and the `canRegenerate` selector.
- `src/components/generator/use-generator-session.ts` exposes send, retry, regenerate, stop, undo, restore and reset.
- `src/components/generator/generator-shell.tsx` handles:
  - the status derivation and the single aria-live region;
  - the preview code passed to `SandboxPreview`;
  - the TurnList transient prop;
  - the NewComponentDialog condition;
  - the base notice.
- `src/components/generator/turn-list.tsx` / `turn-item.tsx` render `TransientTurnItem` (gerando/erro). A "rascunho" kind is added here.
- `src/components/generator/new-component-dialog.tsx` and `src/components/ui/alert-dialog.tsx` are the pattern for the D-09 dialog.
- `src/components/generator/sandbox-preview.tsx` has the error state, the watchdog and `onRegenerate`.
- `src/components/generator/use-undo-shortcut.ts` already ignores text fields, so Ctrl+Z inside the editor stays native.

### Established Patterns
- Fixed pt-BR copy, one status region, `motion-reduce:` and `max-md:min-h-11` targets.
- Tests use Vitest and RTL; the e2e uses the env-gated mock. Sequential executors on the main tree, no worktrees.

### Integration Points
- CodeView becomes editable with `value`/`onChange`, `readOnly`, `dirty` and `onDiscard`.
- The shell owns the draft, the debounce and the commit-before-action sequencing.
- `session.send` must use the draft or manual version as base.
- The TurnList transient prop gains a "draft" kind.
</code_context>

<specifics>
## Specific Ideas

- Panel header: "Código  [Editado]   Descartar edições · Copiar · Baixar".
- Hint: "Esc e depois Tab para sair".
- Status text: "Edição salva como vN".
- D-09 dialog text: "Você tem edições na vN. Ir para a vX descarta essas edições." with [Descartar edições e ir] and [Cancelar].
- Transient item: "Edição manual (rascunho)" with a pencil icon.
</specifics>

<deferred>
## Deferred Ideas

None.
</deferred>

---

*Phase: 08-editable-code-view*
*Context gathered: 2026-10-18*
