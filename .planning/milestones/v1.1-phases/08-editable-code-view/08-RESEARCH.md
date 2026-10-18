# Phase 8: Editable Code View - Research

**Researched:** 2026-10-18
**Domain:** Textarea-overlay code editor (react-simple-code-editor + prism-react-renderer), draft → version state sequencing in a React reducer, editor a11y
**Confidence:** HIGH (library source read and smoke-tested in jsdom, a Next 15.5.28 production build and real Chromium; codebase read line by line)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Carried forward (locked earlier — do not re-ask)
- The session reducer already models `Version.source: "ai" | "manual"`. The turn list already renders a manual version as "Edição manual" (Phase 7).
- Refining from an older version truncates the versions after it at COMMIT. The cap is 20 versions with stable display numbers (`droppedCount + index + 1`).
- There is one status `aria-live` region and only one "Tentar de novo" button at a time. The preview's regenerate is only offered when it would not delete versions (Phase 7 WR-01).
- "Novo componente" asks for confirmation when there is more than one version **or manual edits** (Phase 6 D-12). A draft counts as a manual edit.
- Code panel and preview switch instantly on restore (Phase 7 D-12). The code panel scrolls to the top on undo or restore.
- The model receives only the current code and the instruction (Phase 5 `currentCode`). `MAX_CODE_LENGTH` is 30 000: a 413 maps to `CODE_TOO_LARGE_MESSAGE`, and the client pre-checks the size.

#### Editor
- **D-01:** Use `react-simple-code-editor`, a textarea overlay, with the existing `prism-react-renderer` providing the highlight. This is the one new dependency allowed in this phase. Research must smoke-test it with React 19 and Next 15 first. If it is incompatible, fall back to a homemade textarea overlay with no dependency (not CodeMirror) and record the decision.
- **D-02:** Tab and Shift+Tab indent by 2 spaces. Escape switches the editor to "exit" mode, so the next Tab moves focus out (no keyboard trap, EDIT-08). Show a visible hint "Esc e depois Tab para sair", also linked through `aria-describedby`.
- **D-03:** No line numbers; keep today's panel look.
- **D-04:** The editor works on mobile too, in the Código tab, with no extra features.
- **D-05:** The editor is read-only while a generation or refinement streams (EDIT-04). During the stream it shows the live streaming code, as today. It is also read-only before v1 exists, when there is no code.

#### Draft → version
- **D-06:** Typing creates a draft on top of the current version. Only the shell holds this state; it is not a reducer version yet. A draft whose text equals the base version's code counts as no draft at all.
- **D-07:** The draft is committed as a `source: "manual"` version ("Edição manual") automatically, before any of these actions:
  - **Refinar:** commit, then refine from the manual version (EDIT-06).
  - **Desfazer** (button or Ctrl/⌘+Z outside fields): commit, then undo, which lands on the original version. The edit stays restorable in the list.
  - **Restore** of an earlier or the same-position version: commit, then restore.
  - **Novo componente:** the confirmation dialog appears because of the draft, then a reset.
- **D-08:** Editing an older, restored version follows the refine rule. When the draft is committed, it goes right after the base and drops the later versions. The base notice "Refinar a partir da vN — … serão descartadas" stays visible while editing.
- **D-09:** Edge case: a draft on an older version while the user clicks a later, dimmed version. Committing would delete that target, so ask first with an AlertDialog. The dialog says "Você tem edições na vN. Ir para a vX descarta essas edições." with the actions [Descartar edições e ir] and [Cancelar]. Confirming drops the draft and restores vX. This is the only case that asks.
- **D-10:** Refining with a broken draft is allowed. The manual version is saved as-is, even invalid, because "corrija o erro" is a valid instruction. Manual versions skip the `export default` validity rule that AI commits use, but the `MAX_CODE_LENGTH` pre-check still applies.

#### Preview & invalid code
- **D-11:** The preview follows the draft 500 ms after typing stops. No "Atualizando…" badge, to avoid flicker.
- **D-12:** Broken edited code (syntax or runtime error, or no `export default`) shows the existing preview error state. It recovers by itself when the code is fixed. The preview's "Tentar de novo" (regenerate) is not shown while a draft exists, because the error comes from the user's code.

#### Signalling
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

### Deferred Ideas (OUT OF SCOPE)
None. (Domain also excludes: full e2e journey, GIF, READMEs → Phase 9; line numbers, search, autocomplete, formatting, persistence.)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EDIT-04 | Edit code in the code view, highlighted, light/dark kept; locked while streaming | Editor smoke test (§Standard Stack), `readOnly` pitfall P1 (library still edits on Tab/Enter/Ctrl+Z when readOnly), div-per-line highlight geometry (§Pattern 2) |
| EDIT-05 | ~500 ms debounce to preview; invalid code shows existing preview error | `useDebouncedDraft` (§Pattern 4), SandboxPreview resets on `code` change (`sandbox-preview.tsx:33-60`), `errorSource` copy variant (UI-SPEC), `canRegenerate` + `source==="ai"` (§Pattern 5) |
| EDIT-06 | Refine after manual edits uses edited code, records "Edição manual" version first, undo returns to it | `COMMIT_MANUAL` reducer action + eager `stateRef` commit in the hook (§Pattern 1, §Pattern 3) |
| EDIT-07 | Copy/download export the shown code | CodeView already exports its `code` prop (`code-view.tsx:64,83-87`); feed it the editor value; fallback selects the textarea |
| EDIT-08 | Keyboard accessible: labelled, no Tab trap, Escape exits | `ignoreTabKey={readOnly \|\| exitMode}` + Escape `preventDefault` (§Pattern 2); aria props do NOT reach the textarea (P2) → `<label htmlFor>` + imperative `aria-describedby` |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

No `CLAUDE.md` in the repo root (verified: `ls`). Conventions come from prior phases and the user's memory: pt-BR copy, single `aria-live` status region, `motion-reduce:` variants, `max-md:min-h-11` touch targets, Vitest + RTL, env-gated mock e2e, sequential executors on the main tree (no worktrees), never `npx shadcn add` (UI-SPEC).

## Summary

`react-simple-code-editor@0.14.1` works with React 19.3.1 and Next 15.5.28. [VERIFIED: scratchpad smoke test]
- **Unit tests:** 10 Vitest/jsdom tests passed with zero `console.error` output. They covered the default import, typing, Tab = 2 spaces, Escape-then-Tab exit, readOnly and the undo history.
- **Production build:** `next build` produced a static, prerendered page with no SSR or hydration errors.
- **Real browser:** Chromium in Playwright ran against `next start` with no console errors or warnings. Typing and Tab worked, and the highlighted layer matched the textarea.
- **Bundle cost:** about +3.4 kB gzip route JS (First Load 129 kB → 133 kB, versus an identical page with only `Highlight`). This is well under the 150 kB budget in PITFALLS #12. **D-01 holds: no fallback is needed.**

The library has three behaviours the approved UI-SPEC does not expect. The plan must handle each (P1–P3 below):
1. `aria-label`, `aria-describedby` and other HTML attributes passed to `<Editor>` land on the **wrapper div**, not the textarea. Only `textareaId`, `readOnly`, `onKeyDown` and the other listed props are forwarded.
2. `readOnly` does not stop the library's own key handlers. Tab, Shift+Tab, Enter auto-indent, Backspace-unindent, bracket-wrap and Ctrl+Z/Y still call `onValueChange`. Tab is also still trapped while read-only. Measured: readOnly + Tab changed `"abc"` to `"abc  "` with focus still on the textarea.
3. Ctrl+Z inside the editor uses the library's **own history stack** (it calls `preventDefault` on the native undo). That stack is not reset when `value` changes from outside. After a restore, Ctrl+Z brings back the previous version's text as a bogus draft. Reset it through the `ref.session` setter.

For state, add one reducer action, `COMMIT_MANUAL { code }`. It appends right after the cursor, which truncates the later versions, applies the cap and skips the `export default` check. The hook commits it **eagerly**: it computes `sessionReducer(stateRef.current, action)`, assigns `stateRef.current`, then dispatches. Because of that, the existing `send`/`undo`/`restore` calls that run right after it in the same handler see the new manual version as `committed`, with no signature changes and no `flushSync`.

React batches the two dispatches into one render, so "Edição salva como vM" would never render on its own. The status text must therefore be composite (`Edição salva como vM · Voltou para vN`, `… · Refinando…`). It is driven by one new state field.

**Primary recommendation:** Install `react-simple-code-editor@^0.14.1`. Isolate it in `CodeView`, with:
- `ignoreTabKey={readOnly || exitMode}`;
- a read-only key guard;
- a visually hidden `<label htmlFor>` and an imperatively set `aria-describedby`;
- a history reset on every base change.

Add `COMMIT_MANUAL` plus an eager `commitManual` in the hook, and pass `draft` into `send`/`undo`/`restore`/`retry` so the "commit then X" sequence is atomic and unit-testable.

## Architectural Responsibility Map

Single-tier client app (Next.js client components). Tiers here are the client modules.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Version history, manual commit, truncation/cap | `src/lib/session.ts` (pure reducer) | — | Already owns COMMIT/RESTORE/UNDO; pure → unit-testable |
| "commit draft then X" sequencing | `use-generator-session.ts` (hook) | shell (decides when, D-09 dialog) | The hook owns `stateRef`, so it can commit eagerly before `run` reads the base |
| Draft text, debounce, dirty flag | `generator-shell.tsx` (D-06: shell-only) | — | Draft is UI state, not a version |
| Editing, highlighting, keyboard, a11y | `code-view.tsx` | — | UI-SPEC: the editor host |
| Preview of draft / error copy | `sandbox-preview.tsx` | shell (passes `code`, `errorSource`, `onRegenerate`) | Already has the error state + watchdog |
| Draft transient row | `turn-list.tsx` / `turn-item.tsx` | shell (computes `transient`) | Phase 7 transient pattern |
| Payload to `/api/generate` | unchanged (`stream-generate`) | — | `currentCode` = manual version's code via `run(text, base)` |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-simple-code-editor | 0.14.1 (latest; published 2024-07-04) | Textarea + highlighted `<pre>` overlay, Tab indent, auto-indent, undo history | Locked by D-01. ~21.7 kB unminified CJS, zero deps, peer `react >=16.8`, MIT, ~467k downloads/week [VERIFIED: npm registry + api.npmjs.org] |
| prism-react-renderer | 2.4.1 (installed) | `Highlight` tokens + nightOwl / nightOwlLight | Already used in `code-view.tsx:4,135` |

### Supporting (already installed; nothing else to add)
| Library | Purpose |
|---------|---------|
| next-themes | `resolvedTheme` → prism theme (`code-view.tsx:26-34`) |
| lucide-react 1.57 | `Pencil` (verified exported: `lucide-react.d.ts:16227`), `X` |
| @base-ui/react via `components/ui/alert-dialog` | D-09 dialog, cloned from `new-component-dialog.tsx` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-simple-code-editor | Homemade overlay (D-01 fallback) | Not needed. The library already handles Tab indent, the undo history after programmatic edits and auto-indent, which are the hard parts of a homemade version. Keep the fallback only if a later regression appears. |
| (any) | CodeMirror / Monaco | Excluded by D-01 |

**Installation (executor, not research):**
```bash
npm install react-simple-code-editor@^0.14.1
```
Import: `import Editor from "react-simple-code-editor";`. The default import resolved correctly in Vitest 5 (CJS interop), Next 15 webpack and TypeScript (bundled `lib/index.d.ts`). [VERIFIED: smoke test]

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| react-simple-code-editor | npm | ~8 yrs (0.14.1: 2024-07-04) | 467,051/wk (2026-10-10..16) | github.com/react-simple-code-editor/react-simple-code-editor | [OK] (`slopcheck install -e npm`) | Approved |

- `npm view react-simple-code-editor scripts.postinstall` printed nothing, so there is no postinstall script. Its only lifecycle script is `prepare` (tsc), which does not run on consumer install.
- **Packages removed:** none. **Packages flagged [SUS]:** none.
- Note: run without `-e npm`, slopcheck auto-detected PyPI and reported a false `[SLOP]`. Always pass `-e npm`.

## Architecture Patterns

### System Architecture Diagram

```
 keystroke ──► CodeView <Editor onValueChange> ──► shell setDraft({baseId, code})
                    ▲ value                                │
                    │                                      ├─► dirty = draft.baseId===committed.id && code!==committed.code && !busy
  editorValue = pending ? parseCode(pending.text)          │        ├─► header: Editado + Descartar edições
              : dirty ? draft.code : committed.code         │        ├─► TurnList transient "rascunho"
                    │                                      │        └─► canRegenerate gate / errorSource="user"
                    ▼                                      ▼
  Copiar / Baixar export editorValue        useDebouncedDraft(draft, 500) ──► previewCode ──► SandboxPreview(code)
                                                                              (instant on discard/commit/restore)
 Action (Refinar / Desfazer / restore / Tentar de novo)
   └─► hook.X(..., draftCode | null)
          ├─ draft? commitManual(code): next = reducer(stateRef, COMMIT_MANUAL); stateRef=next; dispatch
          └─ then existing logic (run(text, committedVersion(stateRef)) / UNDO / RESTORE) ── same batch ──► one render
 Later dimmed version clicked while dirty ──► DiscardDraftDialog ──confirm──► setDraft(null); restore(vX)
 Novo componente while dirty ──► NewComponentDialog ──confirm──► reset (no commit), setDraft(null)
```

### Recommended file touch list
```
src/lib/session.ts                       # COMMIT_MANUAL, savedManualId, canRegenerate(source==="ai")
src/components/generator/use-generator-session.ts  # commitManual (eager), draft param on send/undo/restore/retry
src/components/generator/generator-shell.tsx       # draft state, debounce, dirty, status, D-09 dialog, wiring
src/components/generator/code-view.tsx             # Editor host (value/onChange/readOnly/dirty/onDiscard)
src/components/generator/use-debounced-draft.ts    # NEW tiny hook (or inline in shell)
src/components/generator/discard-draft-dialog.tsx  # NEW (clone of new-component-dialog.tsx)
src/components/generator/turn-list.tsx / turn-item.tsx  # "rascunho" kind; current item clickable when draft
src/components/generator/sandbox-preview.tsx       # errorSource prop (UI-SPEC copy variant)
```

### Pattern 1: `COMMIT_MANUAL` reducer action
Add it to `SessionAction` (`session.ts:42-53`). Factor the append-and-cap tail of COMMIT (`session.ts:179-202`) into a helper so both actions share it:
```ts
| { type: "COMMIT_MANUAL"; code: string }

function appendVersion(state: SessionState, kept: Version[], v: Version, notice: SessionNotice): SessionState {
  const versions = [...kept, v];
  let dropped = 0;
  while (versions.length > MAX_VERSIONS) { versions.shift(); dropped++; }
  return { versions, cursor: versions.length - 1, pending: null, error: null,
           nextVersionId: state.nextVersionId + 1, notice, droppedCount: state.droppedCount + dropped,
           savedManualId: notice === "manual" ? v.id : null };
}

case "COMMIT_MANUAL": {
  if (state.pending !== null) return state;           // EDIT-04: never while streaming
  const base = committedVersion(state);
  if (!base || action.code === base.code) return state; // D-06: equal draft = no draft
  // D-08: right after the base, dropping later versions. No hasDefaultExport (D-10).
  // IN-01 holds by construction: the base is the cursor, which always exists.
  return appendVersion(state, state.versions.slice(0, state.cursor + 1),
    { id: state.nextVersionId, code: action.code, instruction: "", source: "manual" }, "manual");
}
```
- `SessionNotice` (`session.ts:28`) gains `"manual"`.
- New state field `savedManualId: number | null`, so the status line can say "Edição salva como vM" after the follow-up action in the same batch. Rule: START, UNDO and RESTORE carry it only when `state.notice === "manual"`. CHUNK carries it, since it spreads the state. COMMIT, FAIL, ABORT, REJECT and RESET clear it. The literal-object returns in COMMIT (`:194-202`) and RESET (`:251-259`) must set it, and TypeScript enforces that.
- `instruction: ""` makes `run()` ignore it, as defence in depth (`use-generator-session.ts:36-37`). The turn list already shows "Edição manual" for `source === "manual"` (`turn-list.tsx:131`).

### Pattern 2: Editor host in CodeView (EDIT-04, EDIT-08)
```tsx
// Source: library API read from node_modules/react-simple-code-editor/src/index.tsx (0.14.1)
const READONLY_SAFE = new Set(["Tab","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Home","End","PageUp","PageDown","Shift","Control","Alt","Meta"]);
const MODIFIERS = new Set(["Shift","Control","Alt","Meta"]);
const [exitMode, setExitMode] = useState(false);

<label htmlFor={editorId} className="sr-only">Editor de código</label>
<div ref={scrollRef} className="max-h-[70vh] flex-1 overflow-auto rounded-lg focus-within:ring-3 focus-within:ring-ring/50"
     style={{ backgroundColor: prismTheme.plain.backgroundColor }}>
  <Editor
    ref={editorRef}                       // { session: { history } } imperative handle
    value={code}
    onValueChange={(next) => { if (!readOnly) onChange(next); }}   // P1 guard
    readOnly={readOnly}
    ignoreTabKey={readOnly || exitMode}   // no trap while read-only; exit mode lets Tab through
    tabSize={2} insertSpaces padding={12}
    textareaId={editorId}
    textareaClassName="outline-none"
    className="min-h-full font-mono text-xs leading-relaxed"
    style={{ ...prismTheme.plain, caretColor: prismTheme.plain.color }}
    onKeyDown={(e) => {
      if (readOnly) {                     // P1: block the library's own edits/undo/blur
        const copyOrSelectAll = (e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "a");
        if (!READONLY_SAFE.has(e.key) && !copyOrSelectAll) e.preventDefault();
        return;
      }
      if (e.key === "Escape") { e.preventDefault(); setExitMode(true); return; } // stops the library's blur()
      if (!MODIFIERS.has(e.key) && e.key !== "Tab") setExitMode(false);          // Shift of Shift+Tab must not reset
    }}
    onFocus={() => setExitMode(false)}
    onBlur={() => setExitMode(false)}
    highlight={(c) => (
      <Highlight code={c} language="tsx" theme={prismTheme}>
        {({ tokens, getLineProps, getTokenProps }) => (
          <>{tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line })}>
              {line.map((token, k) => <span key={k} {...getTokenProps({ token })} />)}
            </div>))}</>
        )}
      </Highlight>
    )}
  />
</div>
<p id={hintId} className="mt-2 text-xs text-muted-foreground">Esc e depois Tab para sair</p>
```
- **The `highlight` callback returns line `div`s without a `<pre>`.** The library renders its own `aria-hidden` `<pre>`. Measured in Chromium with blank lines, a soft-wrapped long line and a trailing newline: the div-per-line output gives pre height 258 = textarea scrollHeight 258. A fragment-plus-`"\n"` variant undershot (238.5 vs 258), which would make the caret drift. [VERIFIED: Playwright geometry probe]
- **Use `aria-describedby`, not an Editor prop (P2).** Set it in a layout effect on `document.getElementById(editorId)`, with the dependency "is the editor mounted". React leaves attributes it does not manage untouched.
- **Accessible name:** `getByRole("textbox", { name: "Editor de código" })` resolves through the `<label htmlFor>` (smoke-tested).
- **Use `readOnly`, not `disabled`.** It keeps focus when a refine starts (UI-SPEC §2).

### Pattern 3: Hook — eager commit, then the existing action
```ts
// use-generator-session.ts
const commitManual = useCallback((code: string | null | undefined): Version | null => {
  if (code == null) return null;
  const s = stateRef.current;
  if (inFlightRef.current !== null || isBusy(s)) return null;
  const next = sessionReducer(s, { type: "COMMIT_MANUAL", code });
  if (next === s) return null;           // no base / equal to base
  stateRef.current = next;               // eager: the calls below see the manual version
  dispatch({ type: "COMMIT_MANUAL", code });
  return committedVersion(next);
}, []);

const send = useCallback((text: string, draft?: string | null) => {
  if (!text.trim() || inFlightRef.current !== null || isBusy(stateRef.current)) return Promise.resolve<SendResult>("ignored");
  commitManual(draft);                   // only commit when the refine will actually start
  return run(text, committedVersion(stateRef.current));   // base = manual version → currentCode = edited code
}, [run, commitManual]);

const undo = useCallback((draft?: string | null) => {
  commitManual(draft); dispatch({ type: "UNDO" });         // queued after COMMIT_MANUAL → lands on the original
}, [commitManual]);

const restore = useCallback((versionId: number, draft?: string | null) => {
  commitManual(draft); dispatch({ type: "RESTORE", versionId });
}, [commitManual]);
```
- **Why this is safe:** `useReducer` processes queued actions in order against the updated state. The reducer is pure, so the eager `stateRef` equals what the next render assigns at `:25`, and StrictMode's double reducer call is harmless. `run()` reads `stateRef.current` for the busy check (`:38`) and for `baseStillKept` (`:70-72`), and both stay correct.
- **Size limit (D-10, UI-SPEC §6):** if the draft exceeds 30 000 chars, `send` commits it first. Then `run` REJECTs at `:42-45` with `too_large`, so the banner appears and the manual version is kept.
- **`retry` with a draft** (not in the UI-SPEC; recommended): if a draft exists, `commitManual(draft)` and then `run(error.instruction, committedVersion(stateRef.current))`. Without this, `retry()` (`:109-119`) re-runs against `error.baseId`, ignores the edit, and its AI COMMIT truncates the manual version away (data loss).
- **Undo with a draft at v1:** `canUndo` is false at cursor 0 (`session.ts:73-75`). The shell must enable Desfazer when `canUndo || (dirty && !busy)`. That applies in `SessionBar` (`session-bar.tsx:27`) and in `useUndoShortcut({ enabled })` (`generator-shell.tsx:170-174`).

### Pattern 4: Shell — draft, dirty, debounce, wiring
```ts
const [draft, setDraft] = useState<{ baseId: number; code: string } | null>(null);
const dirty = !!draft && !!committed && !pending && draft.baseId === committed.id && draft.code !== committed.code;
const draftCode = dirty ? draft!.code : null;
const editorValue = pending ? parseCode(pending.text) : (draftCode ?? committed?.code ?? "");   // replaces :93-95
const debounced = useDebouncedDraft(dirty ? draft : null, 500);  // null passes through instantly
const previewCode = dirty && debounced?.baseId === committed!.id ? debounced.code : committed?.code;
```
- **`useDebouncedDraft(value, ms)`:** a `useEffect` that calls `setTimeout(set, ms)` with a cleanup. When `value === null` it sets null synchronously, so discard, commit and restore update the preview instantly and no stale draft flashes on the next keystroke.
- **Handlers.** Each one calls `setDraft(null)` after the hook call:
  - `handleSubmit` → `session.send(prompt, draftCode)` (`:138-142`).
  - `handleUndo` → `session.undo(draftCode)`.
  - `handleRestore(id)`:
    - if `dirty && indexOf(id) > cursor`, open the D-09 dialog and do not commit;
    - otherwise call `session.restore(id, draftCode)`.
  - `requestNew` (`:161-168`) → condition `versions.length > 1 || dirty`; `doReset` also clears the draft.
- **Clicking the current item while dirty** (UI-SPEC §6, "not a no-op"): `TurnItem` swallows clicks on the current item (`turn-item.tsx:204-206`). Pass a `draftActive` prop, or always call `onRestore` and let the hook no-op. Commit-then-RESTORE(base) works because after the commit the base is at `cursor - 1`.
- **CodeView props:** `code={editorValue} onChange={(c) => committed && !busy && setDraft({ baseId: committed.id, code: c })} readOnly={busy || !committed} dirty={dirty} onDiscard={() => setDraft(null)} scrollResetKey`.
- **Status line (`:97-103`).** Let `saved = state.savedManualId` be resolved to a display number M (by index in `versions`), and `prefix = saved ? "Edição salva como vM · " : ""`:
  - pending → `prefix + "Refinando…"`;
  - notice `"manual"` → `Edição salva como vN`;
  - undo / forward → `prefix + "Voltou para"` / `"Foi para"` vN.

  Substring assertions on `Voltou para vN` and `Pronto — vN` keep working (UI-SPEC §6).
- **Transient precedence (`:107-111`):** `pending ? gerando : dirty ? rascunho : error && versions.length ? erro : null`. Add `"rascunho"` to `TurnTransient["kind"]` (`turn-list.tsx:11-14`). Its `instruction` text is "Edição manual (rascunho)", shown with the `Pencil` icon and no sr-only prefix (UI-SPEC §5).
- **Scroll reset:** `scrollResetKey` (`:123-126`) is unchanged in the shell. In CodeView the layout effect (`code-view.tsx:44-47`) targets the scroll **wrapper div**, because the library's `pre` no longer scrolls. It also resets the editor history (Pattern 6).

### Pattern 5: Regenerate gating (D-12)
- In `canRegenerate` (`session.ts:112-117`), add `committedVersion(state)?.source === "ai"`. A manual version has no instruction to replay. The hook's `regenerate` (`:130-136`) inherits the guard.
- In the shell (`:324-328`), pass `onRegenerate` only when `!error && session.canRegenerate && !dirty`.
- Pass `errorSource={dirty || committed.source === "manual" ? "user" : "ai"}` to SandboxPreview for the UI-SPEC copy variant. Today's copy at `sandbox-preview.tsx:86,95` says "A IA gerou…".

### Pattern 6: Reset the editor's history on base change (P3)
```ts
useLayoutEffect(() => {        // deps: the base identity (committed id, or "pending")
  const ed = editorRef.current;
  if (ed) ed.session = { history: { stack: [{ value: code, selectionStart: 0, selectionEnd: 0, timestamp: 0 }], offset: 0 } };
}, [historyKey]);
```
- **Without the reset:** Ctrl+Z inside the editor after a version switch produced the previous version's text. **With it**, Ctrl+Z is a no-op. [VERIFIED: jsdom test]
- **Use the setter, not `key` remounting.** A remount drops focus, and the UI-SPEC wants focus kept when a refine starts.
- **Discard is not a base change, so don't reset there.** The stack survives, but Ctrl+Z after a discard returns the second-to-last draft state (`"base x "` for the draft `"base x y"`), not the full draft. If an exact "Ctrl+Z restores the discarded draft" is wanted, push a `{ value: baseCode }` record onto the stack on discard. Either way, keep the UI-SPEC rule of not promising recovery in the copy.

### Anti-Patterns to Avoid
- **Passing `aria-*`, `spellCheck` or `autoCapitalize` as `<Editor>` props.** They go to the wrapper div (verified). The library already sets `spellCheck={false}`, `autoCapitalize="off"`, `autoCorrect="off"` and `autoComplete="off"` on the textarea.
- **Relying on `readOnly` alone to lock editing.** See P1.
- **Using `flushSync` to show "Edição salva" before the next action.** Screen readers announce the last polite update anyway. Use the composite status instead.
- **Using the `key` prop to reset editor history.** It loses focus.
- **Overriding the library's `white-space: pre-wrap`** to get horizontal scrolling. The two layers then misalign. Soft wrapping is the deliberate UI-SPEC change.
- **Committing the draft before checking that the refine will run.** An empty prompt or a busy state would create a stray manual version.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tab indent, undo after programmatic edits, auto-indent | Custom textarea `keydown` + `execCommand` | react-simple-code-editor | Native undo breaks once JS rewrites `value`; the library keeps its own history |
| Highlight layer | Second tokenizer | Existing `prism-react-renderer` `Highlight` | Same theme objects as today |
| Confirm dialog | New modal | Clone `new-component-dialog.tsx` (focus handling via `finalFocus`) | Focus-return edge cases already solved |
| Version append, cap, truncation | Shell-side array edits | Reducer `appendVersion` helper | Keeps the IN-01, cap and numbering invariants in one tested place |

## Common Pitfalls

### P1: `readOnly` does not lock the library
- **What goes wrong:** the library's `handleKeyDown` (src `index.tsx:284-505`) ignores `readOnly`. Tab, Shift+Tab, Enter, Backspace, bracket-wrap and Ctrl+Z/Y call `updateInput`, which sets `input.value` directly and calls `onValueChange`.
- **Effect during streaming:** a stray edit, a desync between the DOM value and React state, and Tab trapped. Measured: `"abc"` became `"abc  "`.
- **How to avoid:** `ignoreTabKey={readOnly || exitMode}`, a `preventDefault` guard in `onKeyDown` (the library returns early when `defaultPrevented`, `:288`), and a no-op `onValueChange` when read-only.

### P2: aria attributes land on the wrapper
- **What goes wrong:** `...rest` is spread onto the container `div` (`index.tsx:544`). The textarea gets only the listed props (`:553-585`).
- **How to avoid:** a `<label htmlFor={textareaId} className="sr-only">` plus an imperative `aria-describedby`.
- **Warning sign:** the test `getByRole("textbox", { name: "Editor de código" })` fails.

### P3: The editor's undo stack spans versions
- **What goes wrong:** the history lives in a ref (`:132-135`) and is recorded only on mount and on the user's own edits.
- **How to avoid:** reset it via the `ref.session` setter on every base change (Pattern 6).
- **Platform note:** in jsdom `navigator.platform` is `""`, so the Ctrl path applies. Fire `keyDown` with `keyCode: 90, ctrlKey: true`, because the library checks `keyCode`, not `key`.

### P4: Existing tests will break on a second textbox
After v1, `generator-shell.test.tsx` calls `getByRole("textbox")` with no name at lines 118, 141, 193, 206, 249, 271, 300, 360, 462 and 487. RTL throws "multiple elements" once the editor exists.
- **Fix:** name them (`{ name: "Descreva a mudança" }` / `"Prompt"`).
- **Also:** `#panel-code pre` at lines 597 and 610, and `code-view.test.tsx:8-12`, use the `pre`'s `scrollTop`. Repoint them to the scroll wrapper (e.g. `data-testid="code-scroll"`).
- **Labels to update:** the section's `aria-label="Generated code"` (`code-view.tsx:98`) becomes `aria-labelledby` → "Código" (UI-SPEC §1), and the title text "Código gerado" (`:102-104`) becomes "Código".

### P5: Batched dispatches swallow "Edição salva"
COMMIT_MANUAL and the follow-up action render once, so the status shows only the final notice. Fix: the `savedManualId` field and composite text (Pattern 1/4).

### P6: Retry/regenerate after manual edits
- **Retry with a draft** silently loses the edit. See Pattern 3: commit, then run from the manual version.
- **Regenerate on a manual version** has no instruction. Gate it with `source === "ai"`.

### P7: Cap edge
At 20 versions with the cursor on the last one, committing a draft evicts the oldest version. If the user clicked that oldest version (an earlier restore), RESTORE finds no index and no-ops (`session.ts:241-242`). The result is "Edição salva como v21" with the cursor on v21. This is acceptable and rare. Cover it with a reducer test, not new UI.

### P8: Mobile
iOS Safari zooms on focus into text fields with a font size under 16px, and the editor is 12px per the UI-SPEC. [ASSUMED] Keep 12px (locked typography) and add the zoom to manual verification. If it bothers the user, `max-md:text-base` on the editor root is the one-line fix; both layers inherit it.

### P9: Suggestions on the manual version
- `useSuggestions` is keyed by `committed.id/code` (`use-suggestions.ts:13-35`), so a committed manual version may trigger a `/api/suggest` request.
- In the refine flow the manual version is immediately followed by START. Check that the hook does not fetch while busy, or accept one extra request. Low risk.

## Code Examples

The patterns above are the examples. They come from the library source in `node_modules/react-simple-code-editor/src/index.tsx` (0.14.1) and were exercised in scratchpad tests.

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Read-only `pre` (`code-view.tsx:134-154`) | Overlay editor with the same tokens | Same look; lines soft-wrap (UI-SPEC deliberate change) |
| `React.forwardRef` (library) | Still supported in React 19 | No warnings observed in 19.3.1 dev mode [VERIFIED: smoke test] |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | iOS Safari auto-zooms into inputs under 16px on focus | P8 | Cosmetic only; fix is one class |
| A2 | Screen readers announce only the latest polite update when two updates land in the same frame | P5 / Pattern 4 | The composite text is correct either way |

## Open Questions (RESOLVED)

RESOLVED by orchestrator (2026-10-18):
1. Combined status "Edição salva como vM · Refinando…" is accepted. It replaces the two-step sequence in the UI-SPEC.
2. A retry with a draft present commits the draft first, then retries from it, so the edit is never lost.
3. Restoring the full discarded draft with Ctrl+Z is out of scope. The UI makes no promise about it.
4. iOS zoom is prevented up front with `max-md:text-base` on the editor and the highlight layer together, so both stay identical.

(The original question list was removed after resolution; see items 1–4 above.)

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | build/test | ✓ | v24.21.0 locally (`engines` says 22.x) | Works; already the status quo |
| npm registry access | installing the editor | ✓ | — | — |
| Playwright Chromium | e2e | ✓ (used for the smoke test) | 1.64.1 | — |

There are no missing dependencies. The smoke workspace in the scratchpad (outside the repo) is `C:\Users\mateu\AppData\Local\Temp\claude\C--Users-mateu-OneDrive--rea-de-Trabalho-projeto-portifolio\77b72327-b636-403a-84c1-43fa4f4640e3\scratchpad\rsce-smoke`. The repo was not modified.

## Validation Architecture

`workflow.nyquist_validation` is `false` in config. This section is included because the orchestrator asked for it.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 5 + jsdom 30 + RTL 16 + user-event 14; Playwright 1.64 (mock e2e) |
| Config file | `vitest.config.ts`, `playwright.config.ts` |
| Quick run command | `npx vitest run src/lib/session.test.ts src/components/generator` |
| Full suite command | `npm test && npm run typecheck && npm run lint` (+ `npm run e2e` at phase gate) |

### Phase Requirements → Test Map
| Req ID | Behavior | Type | Command / File |
|--------|----------|------|----------------|
| EDIT-04 | Editor renders the highlighted tokens of `code`, uses nightOwl in dark and nightOwlLight in light (style `backgroundColor` per theme) | unit | `code-view.test.tsx` |
| EDIT-04 | `readOnly` while busy: typing, Tab, Enter and Ctrl+Z do not change the value; Tab is not trapped (focus moves) | unit | `code-view.test.tsx` (fireEvent `keyDown` with `keyCode`) |
| EDIT-04 | During a stream the editor shows `parseCode(pending.text)` and is `readonly`; after the commit it is editable | integration | `generator-shell.test.tsx` (`hang` behavior) |
| EDIT-05 | Typing → the preview stub's `data-code` stays old until 500 ms, then equals the draft (`vi.useFakeTimers({ shouldAdvanceTime: true })` + `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`) | integration | `generator-shell.test.tsx` |
| EDIT-05 | Discard → preview reverts with no wait; the "Editado" badge and the transient item disappear | integration | `generator-shell.test.tsx` |
| EDIT-05 | With a draft, the preview stub has no "Preview: tentar de novo"; a manual current version also hides it; `canRegenerate` is false for a manual cursor | unit + integration | `session.test.ts`, `generator-shell.test.tsx` |
| EDIT-05 | `errorSource="user"` copy is shown on a runtime error / missing default export | unit | `sandbox-preview.test.tsx` |
| EDIT-06 | `COMMIT_MANUAL`: appends after the cursor, truncates later versions, cap + `droppedCount`, skips `hasDefaultExport`, no-op on equal code / pending / empty; `notice "manual"`, `savedManualId` lifecycle | unit | `session.test.ts` |
| EDIT-06 | Hook `send(text, draft)`: request `currentCode === draft`; versions end with manual then ai; `undo()` → manual version; empty text → no commit; too-large draft → manual kept + `too_large` error | unit | `use-generator-session.test.tsx` |
| EDIT-06 | Hook `undo(draft)` at v1 → v2 manual exists, cursor 0; `restore(id, draft)` earlier / same; `retry(draft)` uses the manual base | unit | `use-generator-session.test.tsx` |
| EDIT-06 | Shell: edit + Refinar → list shows `v2 Edição manual`, then v3; status contains "Edição salva como v2"; Desfazer enabled with a draft at v1; Ctrl+Z outside fields commits and undoes | integration | `generator-shell.test.tsx` |
| EDIT-06 | D-09: draft on v1 with v2 later → click v2 → dialog text; Cancelar keeps the draft; "Descartar edições e ir" → v2, no manual version | integration | `generator-shell.test.tsx` + `discard-draft-dialog.test.tsx` |
| EDIT-06 | Novo componente with 1 version + draft → confirm dialog opens | integration | `generator-shell.test.tsx` |
| EDIT-07 | Copiar writes the draft text (mock `navigator.clipboard.writeText`); Baixar uses `componentFilename(draft)`; the copy fallback selects the textarea | unit | `code-view.test.tsx` |
| EDIT-08 | `getByRole("textbox", { name: "Editor de código" })`; `aria-describedby` → the hint text "Esc e depois Tab para sair" (`toHaveAccessibleDescription`) | unit | `code-view.test.tsx` |
| EDIT-08 | Tab inserts 2 spaces; Shift+Tab unindents; Escape → Tab moves focus to the next element; Escape → Shift+Tab moves back; Escape, letter, Tab indents again; refocusing resets exit mode | unit | `code-view.test.tsx` (all smoke-proven patterns) |
| EDIT-08 | History reset: after a `code` prop change (new base), Ctrl+Z in the editor does not resurrect old text | unit | `code-view.test.tsx` |
| e2e (optional) | Keep the existing strings: `Pronto — v1/v2`, `Voltou para v1` (now substrings), `Copiar` / `Baixar`, `tab "Código"`, textbox names "Prompt" / "Descreva a mudança". Optional smoke: fill "Editor de código", wait for the iframe text, Refinar → body `currentCode` contains the edit | e2e | `e2e/generate.spec.ts` (full journey is Phase 9) |

### Sampling Rate
- **Per task commit:** quick run command above.
- **Per wave merge:** `npm test && npm run typecheck && npm run lint`.
- **Phase gate:** full suite + `npm run e2e` green before `/gsd:verify-work`. Manual checks: caret alignment in both themes, selection visibility, iOS zoom (A1).

### Wave 0 Gaps
- [ ] Name every unnamed `getByRole("textbox")` in `generator-shell.test.tsx` (P4) and repoint the `pre` scrollTop queries (`generator-shell.test.tsx:597,610`, `code-view.test.tsx:8-12`) to the scroll wrapper. Do this in the same task that introduces the editor, or the suite goes red.
- [ ] New `discard-draft-dialog.test.tsx` (clone of `new-component-dialog.test.tsx`).
- No framework install is needed.

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 / V3 / V4 | no | No auth in the app |
| V5 Input Validation | yes | User code is size-checked (`MAX_CODE_LENGTH`, client `use-generator-session.ts:42-45` + server 413). It is rendered only in `sandbox="allow-scripts"` (no `allow-same-origin`, `sandbox-preview.tsx:140`) via a JSON-encoded payload with `<` escaped (`preview-srcdoc.ts:36`) |
| V6 Cryptography | no | — |

| Pattern | STRIDE | Mitigation |
|---------|--------|------------|
| User-typed script in preview | Elevation (self-XSS) | Same opaque-origin sandbox as AI code; only the user's own session is affected |
| Oversized edited code sent to the model | DoS / cost | Existing client pre-check + server 413 apply to the manual base unchanged |
| Code injected into the parent DOM | Tampering | Highlight renders React text nodes (no `dangerouslySetInnerHTML`, since `highlight` returns ReactNode) |

## Sources

### Primary (HIGH)
- `node_modules/react-simple-code-editor/src/index.tsx` and `lib/index.d.ts` (0.14.1), read in full.
- Scratchpad smoke tests:
  - Vitest/jsdom: 10/10 passed, no console errors.
  - `next build` on Next 15.5.28: OK, route sizes recorded.
  - Playwright Chromium on `next start`: no console errors; geometry probe.
- `npm view react-simple-code-editor` (version, peers, time, unpacked size, scripts), the api.npmjs.org downloads endpoint, and `slopcheck -e npm`.
- `prism-react-renderer` dist `normalizeEmptyLines` / `useGetTokenProps` (empty-line token handling).
- Codebase files listed with line references above, plus `08-CONTEXT.md` and the approved `08-UI-SPEC.md`.

### Secondary
- `.planning/research/STACK.md:9-35,92-95` and `PITFALLS.md` #6, #12, #13 (earlier milestone research, consistent with these findings).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, from an empirical smoke test across jsdom, a Next production build and Chromium.
- Architecture: HIGH, from a reducer and hook design grounded in the current code. The eager-`stateRef` sequencing relies on documented `useReducer` queue ordering and a pure reducer.
- Pitfalls: HIGH for P1–P4 (reproduced), MEDIUM for P8–P9.

**Research date:** 2026-10-18
**Valid until:** 2026-11-17 (the library has been stable since 2024-07).
