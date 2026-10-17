# Feature Landscape: v1.1 Refinamento Iterativo

**Domain:** AI UI component generator (v0 lite). Scope: refinement, version history, turn list, editable code, demo GIF.
**Researched:** 2026-10-17
**Confidence:** MEDIUM. Based on known behavior of v0, bolt.new, Lovable and Claude artifacts (training knowledge, not re-verified against live products this session). The UX conventions are stable and widely shared, so confidence in the table stakes is higher than in the details.

## How the reference products behave (summary)

| Product | Refinement | Versions | Turn list | Code editing |
|---------|-----------|----------|-----------|--------------|
| v0 | Chat is the primary input after the first generation. Each follow-up edits the current output. | Each assistant turn creates a numbered version. A version picker and "revert" are available. | Chat sidebar with all turns. | Code is editable, and later prompts see the edits. |
| bolt.new / Lovable | Chat edits the project. Files are patched, not rewritten. | Per-message checkpoints with restore or revert. | Full chat history. | Built-in editor. Manual edits are included in later context. |
| Claude artifacts | Follow-ups update the same artifact in place. | Version selector (v1, v2, ...) on the artifact. Old versions are viewable and restorable. | Normal conversation. | Edits are possible in some modes. |

Common conventions:
- The input box defaults to "modify what you see". Starting over is a separate, explicit action ("New chat" or "New component").
- Every successful generation is an immutable snapshot. Restoring an old version does not delete newer ones, or it branches from the old one.
- Each turn pairs the user's instruction with the version it produced, so the turn list doubles as navigation.
- The preview always shows the selected version. During streaming it shows the previous good version, or a loading state, until the new code is complete.

## Table Stakes

| Feature | Why expected | Complexity | Dependencies on existing app / notes |
|---------|--------------|------------|--------------------------------------|
| Refine-by-default input after first generation | This is the core of the milestone. The placeholder and button copy must change ("Descreva a mudança") so the mode is obvious. | Med | Needs a client state machine (empty -> generated). Changes the `/api/generate` request to carry `currentCode` + `instruction`. Edits `src/lib/ai/prompt.ts` with a refine system prompt ("return the full updated component, change only what was asked"). Existing rate limit and Gemini fallback chain apply unchanged. |
| "Novo componente" reset | Escape hatch from refine mode. Without it the user is trapped. | Low | Clears the code, versions and turns. Ask for confirmation only if there are more than 1 version or manual edits (avoids accidental loss). |
| Model context = current code + instruction only | Already decided. It matches how Claude artifacts and v0 keep token use bounded. | Low | Server validates payload size (cap the code length, return 413 or 400) to protect the free tier. Do not send turn history. |
| Refinement returns the full component | Streaming a whole file keeps the existing stream-to-code-view and preview pipeline intact. Diff and patch formats are fragile. | Low | Reuses the v1.0 streaming path. Strip markdown fences exactly as v1.0 does. |
| Version snapshot on every successful generation | Basis for undo. Failed or aborted streams must NOT create a version. | Low-Med | Commit the version on stream finish only. Abort or error leaves the last good version selected. |
| Undo / go back to a previous version | Core ask of the milestone. Users expect to jump to any version, not only step back one. | Med | In-memory array in a reducer or context. Selecting a version updates the code view and preview. The next refinement builds on the selected version. |
| Clear indication of the current version (v1, v2, ...) | Without it, users lose track after undo. | Low | Badge or selected state in the version list. Accessible (`aria-current`). |
| Visible turn list (mini-chat) | Users need to see what they asked and what changed. | Med | Each item holds the prompt text, a status (streaming, done, error) and a link to its version. Auto-scroll to the latest item. Use `aria-live="polite"` for status. Handle the empty state. |
| Click a turn to restore its version | Convention in v0, bolt and Lovable. Merges the turn list and version history into one UI. | Low | Turn index maps to version index. This avoids building a separate version UI. |
| Editable code view | Expected in any "v0-like" tool. Users tweak a class or text by hand. | Med-High | v1.0 code view is read-only and streaming. Replace it with an editor (a plain `<textarea>` with a monospace font is the lightweight option; CodeMirror 6 or Monaco if syntax highlighting is wanted). Must be read-only while streaming. |
| Preview updates from edited code | Edits that don't show are confusing. | Med | Debounce (about 500-800 ms) before re-rendering the sandbox iframe so it isn't remounted on every keystroke. Reuse the existing srcdoc runtime and its 15 s watchdog. Compile errors from user edits must show in the existing error state, not crash. |
| Refinement uses edited code | Stated requirement. The source of truth is the editor content, not the last model output. | Low-Med | On submit, send the current editor value. Manual edits should create a version, or be tracked as a "dirty" working copy that is snapshotted when the user submits. Recommended: snapshot on refine submit as a "Edição manual" entry only if the code differs from the selected version. |
| Disable input and editing while streaming; offer Stop | Prevents race conditions on versions. | Low | A cancel button (AbortController) is cheap and expected. The AI SDK `stop` exists. |
| Loading, error and empty states for the new UI | v1.0 already made accessible states a standard. | Low | Reuse existing patterns. On a refinement error (429/503 after fallback), keep the previous version and show a retry. |
| Demo GIF in `docs/demo.gif`, linked from both READMEs | Explicit requirement, and the main portfolio artifact for recruiters. | Low | Should show: generate, refine twice, undo, manual edit. Keep it under about 5-8 MB and 10-20 s. Both READMEs (PT and EN) need the link. |

## Differentiators

Not required, but valuable for a portfolio. Each is optional.

| Feature | Value proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Keyboard shortcuts (Ctrl+Z / Ctrl+Shift+Z at app level for versions, Ctrl+Enter to submit) | Polish that recruiters notice. | Low-Med | Conflicts with the editor's native undo. Scope version-undo to focus outside the editor. |
| Mark manual edits as their own version/turn ("Edição manual") | Honest history that matches the data sent to the model. | Low | Included in the recommendation above. |
| Version diff view (before / after) | Shows what the model changed. A strong visual in the demo. | High | Needs a diff library. Defer. |
| Suggested refinement chips ("Torne responsivo", "Adicione modo escuro") | Reduces blank-page friction in refine mode. Mirrors the example gallery. | Low | Reuse the gallery component and styling. |
| Compare previews side by side | Visual wow. | High | Defer. |
| Active version restore as a new version (non-destructive) vs truncating the future | Restoring v2 when v4 exists, then refining, should not silently lose v3/v4. | Med | Recommended simple model: append-only list. Restore only moves the selection. Refining from an old version appends a new version at the end (linear, no branching tree). |

## Anti-Features

| Anti-Feature | Why avoid | What to do instead |
|--------------|-----------|--------------------|
| Sending full chat history to the model | Contradicts the decision to keep free-tier tokens low. The history is also redundant, since the current code carries the state. | Send current code + latest instruction only. |
| Diff or patch output from the model (search/replace blocks) | Fragile with Flash-class models, with a high failure rate and a complex apply step. | Have the model return the full component. |
| Persistence (localStorage, DB) of versions | Out of scope. Adds migration, privacy and size questions. | In-memory only. State is lost on reload, and the UI should not imply otherwise. |
| Branching version tree | Over-engineered for a demo. | Linear append-only list. |
| Heavy embedded IDE (full Monaco with LSP, multi-file tabs) | Bundle size hurts performance, and it is off-scope (single component). | A light editor: textarea, or CodeMirror 6 if highlighting is wanted. |
| Executing edited code in the host page | Violates the security constraint. | All edited code continues to render only in the sandboxed srcdoc iframe. |
| Live preview on every keystroke without debounce | Iframe thrash, flicker and CPU cost. | Debounce. |
| Auto-applying model output while the user is mid-edit | Silent loss of user work. | Lock the editor during streaming. Snapshot manual edits before sending. |
| Auth-gated history or sharing links | Out of scope. | None. |

## Feature Dependencies

```
Refine mode (state machine + API payload change)
  -> Version snapshots (commit on stream finish)
       -> Undo / restore version
       -> Turn list (each turn links to a version)
            -> Click-turn-to-restore
  -> Editable code view
       -> Debounced preview from edited code
       -> Manual-edit snapshot before refine (needs version snapshots)
"Novo componente" reset -> clears versions + turns + code
Demo GIF -> requires all of the above to be finished and stable (do last)
```

Existing v1.0 pieces affected: `src/app/api/generate/route.ts` (accepts `currentCode`, validates size), `src/lib/ai/prompt.ts` (refine prompt), the streaming code view (becomes editable but locked while streaming), the srcdoc preview (accepts edited code, debounce), the example gallery (only applies to the empty state, so hide it or demote it in refine mode), and the e2e mock model (needs a deterministic refine response so Playwright can assert version and turn behavior).

## MVP Recommendation

Build in this order:
1. Refine API contract + refine prompt + refine-by-default UI + "Novo componente" (the core loop).
2. Version history (append-only, committed on finish) with undo/restore, merged with the turn list (a single click-to-restore list).
3. Editable code view with debounced preview, and edited code used in refinement (snapshot as "Edição manual").
4. Tests (reducer unit tests, e2e with the mock model), then the demo GIF and README links.

Defer: diff view, side-by-side compare, keyboard shortcuts, suggestion chips (take the chips only if there is spare time, since they are cheap).

## Sources

- Product behavior of v0 (v0.dev), bolt.new, Lovable and Claude artifacts: training knowledge, MEDIUM confidence. Not re-verified live this session.
- `.planning/PROJECT.md` for existing scope and constraints (HIGH confidence).
