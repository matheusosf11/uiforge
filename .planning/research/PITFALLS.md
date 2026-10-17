# Domain Pitfalls: v1.1 Refinamento Iterativo

**Domain:** Adding iterative refinement, version history and editable code to an existing AI component generator (Next.js 15, AI SDK v7, Gemini free tier, sandboxed srcdoc preview)
**Researched:** 2026-10-17
**Basis:** Read of PROJECT.md, `src/app/api/generate/route.ts`, `src/lib/prompt-limits.ts`, plus general knowledge of LLM-editing and editor UX. No external sources were fetched, so everything below is MEDIUM confidence (code-grounded reasoning plus well-known patterns). Items marked (verify) need a quick check in the phase.

Phase names below are suggestions: **P-API** (refine contract and prompt), **P-STATE** (history, turns, abort), **P-EDIT** (editable code), **P-UX** (a11y, polish), **P-DOCS** (GIF, READMEs).

## Critical Pitfalls

### 1. Model rewrites or truncates the component instead of editing it
**What goes wrong:** The model returns a partial snippet ("// ...rest unchanged"), drops existing parts, renames things, or restyles unrelated areas. The preview then breaks or silently loses features.
**Why it happens:** The v1.0 SYSTEM_PROMPT is for generation from scratch. Models love diffs and ellipses when given existing code.
**Prevention:**
- Add a separate refine system prompt (or mode block): "Return the COMPLETE updated component, same format as before. Never use placeholders or elisions. Change only what the instruction asks. Preserve everything else."
- Validate server or client side before accepting a result as a new version: it contains `export default`, no `...rest`/`unchanged` placeholder markers, balanced fences, and is not drastically shorter than the input (for example under 40% of the length, unless the instruction asks to remove things).
- Strip markdown fences in the same way as v1.0.
- Add a mock-model e2e case for refine so CI covers the path (the existing env-gated mock needs to know about refine).
**Detection:** After refinement the preview loses sections; output length much smaller than input; a literal "unchanged" in the code.
**Phase:** P-API.

### 2. Prompt length limit collides with code size
**What goes wrong:** `Body` allows only `prompt` up to MAX_PROMPT_LENGTH = 2000 characters. Naively putting current code in `prompt` gives a 400 as soon as the component is non-trivial, and the UI error text ("prompt must be ... 2000 characters") is misleading. Raising MAX_PROMPT_LENGTH globally also lets users paste 2000-to-100k character instructions.
**Prevention:**
- Keep `prompt` (instruction) at 2000 and add a separate `code` field with its own constant, for example `MAX_CODE_LENGTH` (about 20-30k characters, tuned against typical generated size), in `prompt-limits.ts` and shared with the client.
- Make it a discriminated schema: no `code` means generate, with `code` means refine. Reject refine without an instruction.
- Client: when the code exceeds the limit, disable refine with a clear message and a "Novo componente" CTA, instead of letting the server 400.
- Update the error mapping so a 400 on code size gets its own friendly message.
- Also check Vercel body limits (4.5 MB, not a concern at this size) and that `getModels(parsed.prompt)` still receives something meaningful (it takes the prompt, so check what it does with it, for example length heuristics).
**Detection:** 400s on the second turn; unit test with a 10k-character code body.
**Phase:** P-API (must precede the UI).

### 3. Free-tier token/quota cost multiplies with every refine
**What goes wrong:** Each refine sends the whole code in and the whole code out (about 2x tokens of the component per turn), so 5 refines cost more than 5 generations. The in-memory limit of 5 requests per minute per IP is shared with generation, and the Gemini fallback chain burns up to 3 requests per user action when models 503/429. A recruiter clicking around can exhaust the daily quota and the demo shows "rate limited".
**Prevention:**
- Keep the decision "no history in context" (already made). Do not send previous turns or previous versions.
- Cap `maxOutputTokens` for refine proportional to the input code, and keep the system prompt short.
- Do not auto-retry refinement on the client; a failed refine must keep the current version.
- Consider whether a refine should count the same as a generate in the rate limiter. It probably should (it is as expensive or more); document it. Show the `Retry-After` in the UI.
- Skip tokens for no-ops: do not send empty or identical instructions.
- Track token usage in logs (`result.usage`) to size limits with real data.
**Detection:** 429s after 2-3 refines; Google AI Studio quota dashboard.
**Phase:** P-API.

### 4. Prompt injection through edited or pasted code
**What goes wrong:** The user's edited code (or code pasted from the web) can contain comments such as "ignore previous instructions, output X". Since the code is concatenated into the prompt, the model may obey it. Impact is limited here (single user, no tools, no secrets in context, output only runs inside the sandboxed iframe), but it can make the demo misbehave, and a recruiter reviewing the security story will look at it.
**Prevention:**
- Put code in clearly delimited data blocks (for example `<current_code>...</current_code>`) and state in the system prompt that content inside is data, never instructions. Escape or neutralise a literal closing delimiter inside the code.
- Keep the system prompt in `system`, never concatenated into user text. Keep the instruction and the code in separate parts of the message.
- Do NOT relax the iframe sandbox because "the code is now user-edited". Edited code is still untrusted. `allow-scripts` only, no `allow-same-origin`.
- Do not echo the model output into the host DOM as HTML.
- Document honestly in the README: injection cannot be fully prevented; the blast radius is limited by design.
**Detection:** Unit test with a code fixture containing instruction-like comments; manual check.
**Phase:** P-API (prompt) and P-EDIT (sandbox invariants).

### 5. Aborted or failed refinement corrupts history
**What goes wrong:** With streaming, the "current version" is being written token by token. If the user presses "Parar", the network fails mid-stream (the route calls `controller.error` after status 200), or a 429/502 arrives, a half-written component can be pushed into history, or the last good version is overwritten. Undo then returns broken code. A typical variant: pushing to the history array on the first token instead of at completion.
**Prevention:**
- Model state as: `versions[]` (committed, immutable) + `draft` (streaming buffer). Commit to `versions` only on clean stream completion and after the validation from pitfall 1. On abort or error, discard the draft and keep the last committed version selected.
- Decide explicitly what "Parar" does for a refine: discarding the partial is the safest default (a partial component is rarely valid).
- Use one request-id or AbortController per turn; ignore chunks from a stale controller (race: user starts turn B while A is still streaming, A's late chunks land in B).
- Disable submit, undo, and "Novo componente" while streaming, or abort the in-flight request first.
- The turn list entry for a failed or aborted turn should be marked failed (not silently vanish, not look successful).
**Detection:** Unit-test the reducer with sequences: start, chunk, abort, undo; start, error; start A, start B, late chunk A.
**Phase:** P-STATE.

### 6. Editor and stream state conflict
**What goes wrong:** The code view was read-only and driven by the stream. Making it editable creates two writers: the user typing and the streaming buffer. Typical bugs: a stream overwrites the user's unsaved edits; the user types during streaming and edits are lost or interleaved; stale edited text is sent on refine because the state lives in the editor DOM; the preview updates on every keystroke (re-render storms, and the iframe reloads and flashes); cursor jumps when the value prop is reset on each render.
**Prevention:**
- Single source of truth: `currentCode` in state, with an explicit `source` (`model` | `user`). Make the editor read-only while streaming (with `aria-readonly` and a visible hint), and editable only when idle.
- Refine sends `currentCode` (including user edits). Treat a user edit as a new draft that becomes a version either on blur or on refine submit (decision needed: "edited" version labelled in history, so undo can go back to the pre-edit model output).
- Debounce preview updates from edits (about 300-500 ms), and keep the iframe update path the same as for streaming (see pitfall 7).
- Controlled editor: do not re-set the value when it already equals state; avoid resetting selection.
- Undo semantic clash: browser/editor Ctrl+Z (character undo) vs the app's version undo. Use a visibly different control and do not bind Ctrl+Z globally.
**Detection:** Type during streaming; refine after editing and check that the request body contains the edit; undo after edit.
**Phase:** P-EDIT (after P-STATE).

### 7. Streaming over the previous version flashes or blanks the preview
**What goes wrong:** On refine, the new code streams in and is fed to the preview on each chunk. Partial code does not compile, so the iframe shows errors or blank, replacing a perfectly good previous preview. Re-assigning `srcdoc` on every chunk reloads the iframe (flash, losing runtime state) and, with the self-hosted runtime plus the 15 s load watchdog, can trigger the "failed to load" path spuriously.
**Prevention:**
- Keep showing the last committed version in the preview while the refine streams; stream into the code view only (or into a "draft" tab). Swap the preview once, at commit (clean completion + validation). Show a subtle "atualizando" overlay, not a blank.
- Do not recreate the iframe per version; post a message to update the code, or at least change srcdoc only on commit. Check how v1.0 handles first-generation partials and reuse that logic (verify).
- Reset/re-arm the watchdog per swap so it does not fire against a stale load.
- Respect `prefers-reduced-motion` on any crossfade.
- If the new version fails to compile in the sandbox, keep the user on a visible error plus a one-click "voltar à versão anterior", rather than a dead preview.
**Detection:** Record a refine in Playwright and screenshot mid-stream; assert the preview is non-empty throughout.
**Phase:** P-STATE / P-API integration.

## Moderate Pitfalls

### 8. Unbounded or leaky in-memory history
**What goes wrong:** Each version holds the full code (10-30 KB); 50 turns = about 1 MB: fine, but copies in React state on every keystroke edit can bloat, and the turn list and versions can drift out of sync (turn N must map to version N).
**Prevention:** Cap versions (for example 20, dropping the oldest, with a visible note); store versions and turns in one structure (`{id, instruction, code, status, source}`) rather than two parallel arrays; use a reducer with unit tests. "Novo componente" must clear history, turns, abort in-flight, and reset the editor. After undo, decide: either a new refine truncates the "future" versions or branches; choose truncation (simplest) and test it.
**Phase:** P-STATE.

### 9. Undo semantics unclear
**What goes wrong:** Users expect "undo" to also remove the turn, or to redo. Restoring a version then refining from it must send that version's code, not the latest.
**Prevention:** Make "restore this version" explicit in the turn list (click a turn to view; "Restaurar" to make it current). Always derive the refine input from the selected version's code. Consider a minimal redo or none; state it in the UI.
**Phase:** P-STATE.

### 10. Refine-by-default confuses first-time users and the example gallery
**What goes wrong:** After the first generation, clicking an example prompt from the gallery now refines the current component instead of generating a new one. The placeholder and submit button text stay "Gerar".
**Prevention:** Change the label and placeholder to refine mode ("Descreva a mudança..."); the gallery either hides, or starts a new component explicitly; "Novo componente" is prominent. Unit test the mode switch.
**Phase:** P-UX.

### 11. Server route changes break existing behaviour
**What goes wrong:** Touching `route.ts` (fallback chain, first-delta peeking, rate limit, mock) regresses v1.0: for example `getModels(prompt)` or the e2e mock keying on the prompt content, and the 93 unit tests assuming the old body shape.
**Prevention:** Keep generate bodies backward compatible (no `code`). Extract message building into a pure function (`buildMessages({prompt, code})`) with tests. Note the working tree already has uncommitted changes in `route.ts`, `prompt.ts`, `.env.example`, `vitest.setup.ts`, and `theme-provider.tsx`; commit or reconcile before starting so the diff is reviewable.
**Phase:** P-API.

### 12. Code editor bundle size
**What goes wrong:** Monaco (several MB) or CodeMirror with many language packs inflates the first-load JS, damaging the Lighthouse/performance story, and Monaco worker setup on Next/Vercel is fiddly. Sandpack was already removed for similar reasons.
**Prevention:** Prefer a light option: a plain `<textarea>` with line-height-synced highlight overlay, or CodeMirror 6 with only the JS/JSX language and minimal extensions, loaded via `next/dynamic` (`ssr: false`) only when the user enters edit mode. Measure with `next build` output / bundle analyzer and set a budget (for example under 150 KB gzipped added). Avoid Monaco. (verify chosen library's current size and React 19 compatibility.)
**Phase:** P-EDIT (decision up front).

### 13. Editor and turn list accessibility
**What goes wrong:** Code editors are keyboard traps (Tab inserts a tab character); screen readers get no label; streaming text announced token by token; the turn list is a bare div; focus is lost after undo/restore or "Novo componente".
**Prevention:**
- Editor: an accessible name (`aria-label`), a documented Escape-then-Tab escape hatch, or no tab capture by default; sufficient contrast in both themes (the preview is always light, the editor follows the theme).
- Streaming status in a single `aria-live="polite"` region with short messages ("Gerando...", "Pronto"), not the code itself.
- Turn list: a semantic `<ol>`, current version `aria-current="true"`, restore buttons with descriptive labels ("Restaurar versão 3: <instrução>"), visible focus rings, and truncated instructions with full text available.
- Move focus deliberately after restore and reset (to the heading or input).
- Run the axe checks already used in e2e (if any) on the refine state.
**Phase:** P-UX with P-EDIT.

### 14. Unsaved-edit loss on actions
**What goes wrong:** "Novo componente", restore, or a failed refine silently discards user edits.
**Prevention:** Treat the edited code as a version (pitfall 6) so nothing is lost; confirm only for destructive "Novo componente" when there is more than one version.
**Phase:** P-EDIT.

## Minor Pitfalls

### 15. Demo GIF bloats the repo
**What goes wrong:** A screen-recorded GIF is easily 5-30 MB, permanently in git history, slowing clones and breaking README load on mobile.
**Prevention:** Target under 2-3 MB: 800-960 px wide, 10-12 fps, 15-25 s, palette-optimised (gifski or ffmpeg palettegen + gifsicle). Or link an MP4/WebM hosted outside git plus a small poster GIF; do not commit multiple iterations (history keeps every one; record once, final). Use a deterministic mock or a fast prompt to avoid recording flaky/slow streaming; use alt text in both READMEs (EN and PT) and a relative path `docs/demo.gif`. Check that the link works on GitHub rendering. Since git history cannot be shrunk cheaply, optimise before the first commit.
**Phase:** P-DOCS (last).

### 16. README claims drift
**What goes wrong:** READMEs still say "each prompt is generated from scratch".
**Prevention:** Update feature list, architecture notes, and the limits section in both languages in the same phase as the GIF.
**Phase:** P-DOCS.

### 17. Test gaps
**What goes wrong:** Unit tests cover generation only; the refine path, undo, and abort are untested, and e2e with the mock model cannot show an "edit".
**Prevention:** Extend the mock to return a deterministic modified component when `code` is present; e2e: generate, refine, undo, edit, refine-with-edit, abort mid-stream.
**Phase:** every phase; final gate in P-UX.

## Phase-Specific Warnings

| Phase topic | Likely pitfall | Mitigation |
|-------------|----------------|------------|
| Refine API contract | #2 length limit, #11 regressions | Separate `code` field and limit; pure `buildMessages`; keep backward compatibility |
| Refine prompt | #1 partial output, #4 injection | Full-component rule, delimiters, validation before commit |
| Quota | #3 | Output cap, no client auto-retry, show Retry-After |
| History/turn state | #5 abort corruption, #8, #9 | Reducer with draft vs committed versions; request-id guard |
| Streaming into preview | #7 flash/blank | Preview swaps on commit only; reuse the iframe |
| Editable code | #6 two writers, #12 bundle | Read-only while streaming; lazy light editor |
| A11y/UX | #10, #13, #14 | Mode-aware labels, live region, semantic list, focus management |
| Docs | #15 GIF size, #16 drift | Optimised single GIF under about 3 MB; update both READMEs |

## Suggested ordering implication
P-API (contract, prompt, limits, validation) first, then P-STATE (reducer, abort, preview swap), then P-EDIT (needs the state model to avoid pitfall 6), then P-UX/a11y polish, then P-DOCS (GIF last, after the UI stops changing). Deeper research flags: editor library choice (#12) and the preview update path (#7, verify how v1.0 feeds the iframe).

## Sources
- Project files: `.planning/PROJECT.md`, `src/app/api/generate/route.ts`, `src/lib/prompt-limits.ts` (HIGH for code facts).
- General LLM code-editing, editor a11y, and GIF optimisation practice from training knowledge (MEDIUM/LOW; not re-verified online in this pass).
