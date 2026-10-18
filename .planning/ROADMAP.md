# Roadmap: UIForge

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-10-17) · [archive](milestones/v1.0-ROADMAP.md)
- 🚧 **v1.1 Refinamento Iterativo** — Phases 5-9 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-4) — SHIPPED 2026-10-17</summary>

- [x] Phase 1: Foundation & Streaming Generation (4/4 plans) — completed 2026-10-15
- [x] Phase 2: Sandboxed Live Preview (2/2 plans) — completed 2026-10-15
- [x] Phase 3: Export, Examples & Accessible UX (3/3 plans) — completed 2026-10-15
- [x] Phase 4: Quality Gate & Deploy (8/8 plans) — completed 2026-10-16

</details>

### 🚧 v1.1 Refinamento Iterativo (In Progress)

- [x] **Phase 5: Refine API Contract & Edit Prompt** - Stateless `currentCode` contract, edit-mode prompt returning the full component, mock model extended for refine (completed 2026-10-17)
- [x] **Phase 6: Session Core & Refine Loop** - Pure session reducer plus shell that refines by default, keeps previous version on failure, undo, reset and shortcuts (completed 2026-10-18)
- [x] **Phase 7: Turn List & Version Navigation** - Accessible mini-chat list of turns that restores any version and shows the refine base (completed 2026-10-18)
- [x] **Phase 8: Editable Code View** - Syntax-highlighted editable code that live-updates preview and feeds the next refinement
 (completed 2026-10-18)
- [ ] **Phase 9: E2E, Demo GIF & Docs** - Full refine journey covered by e2e, recorded demo GIF, PT/EN READMEs updated

## Phase Details

### Phase 5: Refine API Contract & Edit Prompt
**Goal**: The API can refine an existing component: given current code plus an instruction it streams back the complete updated component, while old `{prompt}` clients keep working
**Depends on**: Nothing (first phase of v1.1; first reconcile uncommitted changes in `route.ts`, `prompt.ts`, `vitest.setup.ts`, `theme-provider.tsx`, `.env.example`)
**Requirements**: ITER-03, ITER-04
**Success Criteria** (what must be TRUE):
  1. A request with `{ prompt, currentCode }` streams back a complete updated component file (not a diff) that preserves everything not asked to change
  2. A request with only `{ prompt }` behaves exactly as in v1.0 (backward-compatible)
  3. A `currentCode` over the size limit (~30k chars) is rejected with a friendly message that offers "Novo componente"; the same limit constant is exported for the client
  4. Code containing instruction-like text inside `currentCode` is treated as data and does not override the system rules
  5. The env-gated mock model returns a deterministic refined output (and honors the error marker) in edit mode so e2e can exercise it
**Research flag**: YES. Real Gemini edit quality (truncation/rewrite thresholds) needs a manual pass with a real key; the mock does not validate it.
**Plans**: TBD

### Phase 6: Session Core & Refine Loop
**Goal**: After the first generation, users iterate on the component through refinements that never lose the last good version, can undo, and can start over
**Depends on**: Phase 5
**Requirements**: ITER-01, ITER-02, ITER-05, ITER-06, ITER-07, ITER-08, ITER-09, UX-05, QUAL-06
**Success Criteria** (what must be TRUE):
  1. After the first generation the input says "Refinar" and sends only current code + the new instruction; refine chips prefill an instruction
  2. While a refinement streams the preview keeps showing the previous version and swaps once only if the stream finishes cleanly with valid code (non-empty, `export default`)
  3. If a refinement fails or the user stops it, the previous version stays visible in code and preview, and "Tentar de novo" reuses the same base code
  4. User can undo to the previous version (button or shortcut outside the editor) and submit with Ctrl/Cmd+Enter
  5. "Novo componente" clears the session, asking for confirmation when there are multiple versions or manual edits
  6. Session logic (commit, undo, truncation, 20-version cap, abort/error, stale-chunk guard) is covered by unit tests, and the refine route by route tests
**Research flag**: YES. Confirm per-call `body` in `complete()` of the installed `@ai-sdk/react`, how `completion` resets, and how `SandboxPreview` receives partial code and handles runtime errors.
**Plans**: TBD
**UI hint**: yes

### Phase 7: Turn List & Version Navigation
**Goal**: Users see their session as a list of turns and can jump to any earlier version, understanding what the next refinement will build on
**Depends on**: Phase 6
**Requirements**: HIST-01, HIST-02, HIST-03, HIST-04, HIST-05
**Success Criteria** (what must be TRUE):
  1. User sees a list of turns with per-turn status (gerando / ok / erro) and the current version highlighted
  2. Clicking a turn restores that version in code and preview
  3. After a restore, later versions appear dimmed and the UI shows "Refinar a partir da vN"; refining then discards the versions after it
  4. Only the latest 20 versions are kept (oldest dropped)
  5. Screen-reader and keyboard users can use the list: semantic list, `aria-current` on the active version, descriptive restore labels, status announced via `aria-live`, focus managed after restore/reset
**Plans**: 5 plans

Plans:
- [x] 07-01-PLAN.md — Reducer RESTORE, stable numbering (droppedCount), selectors, IN-01 guard; hook restore()
- [x] 07-02-PLAN.md — PromptForm turnList slot + base notice; CodeView scrollResetKey
- [x] 07-03-PLAN.md — TurnList / TurnItem presentational components (disclosure, cap line, container scroll)
- [x] 07-04-PLAN.md — Shell wiring, stable-number session bar and status, integration tests
- [x] 07-05-PLAN.md — E2E counter strings + restore smoke, single Playwright run
**UI hint**: yes

### Phase 8: Editable Code View
**Goal**: Users can edit the generated code by hand, see the preview follow, and refine or export exactly what they edited
**Depends on**: Phase 7
**Requirements**: EDIT-04, EDIT-05, EDIT-06, EDIT-07, EDIT-08
**Success Criteria** (what must be TRUE):
  1. User can type in the syntax-highlighted code view (light/dark kept); it is locked while a generation streams
  2. After a ~500 ms pause the preview reflects the edit; invalid code shows the existing preview error state without breaking the app
  3. Refining after a manual edit uses the edited code as base and records an "Edição manual" version first, so undo returns to it
  4. Copy and download export the code currently shown, including manual edits
  5. The editor is keyboard-accessible: labelled, no Tab trap, Escape exits
**Research flag**: YES. Smoke test `react-simple-code-editor` with React 19 / Next 15 / nightOwl first (fallback: CodeMirror 6 via `next/dynamic`); check bundle budget.
**Plans**: 6 plans

Plans:
- [x] 08-01-PLAN.md — Reducer COMMIT_MANUAL + savedManualId + canRegenerate source rule; hook eager commitManual, draft-aware send/undo/restore/retry
- [x] 08-02-PLAN.md — Install react-simple-code-editor 0.14.1; CodeView editor host (a11y, exit mode, read-only lock, history reset, export); fix tests broken by the editor
- [x] 08-03-PLAN.md — SandboxPreview errorSource copy; turn list "rascunho" row + clickable current item; DiscardDraftDialog (D-09)
- [x] 08-04-PLAN.md — Shell draft wiring: editable CodeView, 500 ms debounced preview, badge/discard/draft row, regenerate gating, export of the draft
- [x] 08-05-PLAN.md — Shell commit-before-action: refine/undo/restore/retry with draft, D-09 dialog, Novo componente rule, composite status
- [x] 08-06-PLAN.md — E2E edit smoke + single guarded Playwright run and phase gate
**UI hint**: yes

### Phase 9: E2E, Demo GIF & Docs
**Goal**: The whole refine journey is proven by automated tests and showcased in a reproducible demo and up-to-date READMEs
**Depends on**: Phase 8
**Requirements**: QUAL-07, DOCS-01, DOCS-02
**Success Criteria** (what must be TRUE):
  1. E2E passes the journey generate → refine → undo → edit → refine-after-edit → failed refine keeps previous version, using the mock model in refine mode (existing selectors updated for "Refinar")
  2. `docs/demo.gif` (≤ ~3 MB), recorded from the deterministic mock, shows generate → refine → undo → manual edit and is linked from both READMEs with alt text
  3. Both READMEs (PT/EN) document iterative refinement, version history, editable code and the refine API contract
**Plans**: 3 plans

Plans:
- [ ] 09-01-PLAN.md — Refine journey e2e (e2e/journey.spec.ts), isolated Playwright run on port 3200
- [ ] 09-02-PLAN.md — Demo spec + demo:gif script (ffmpeg palette), docs/demo.gif, dark-only screenshots
- [ ] 09-03-PLAN.md — README.md / README.pt-BR.md for refine, history, editable code, API contract

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation & Streaming Generation | v1.0 | 4/4 | Complete | 2026-10-15 |
| 2. Sandboxed Live Preview | v1.0 | 2/2 | Complete | 2026-10-15 |
| 3. Export, Examples & Accessible UX | v1.0 | 3/3 | Complete | 2026-10-15 |
| 4. Quality Gate & Deploy | v1.0 | 8/8 | Complete | 2026-10-16 |
| 5. Refine API Contract & Edit Prompt | v1.1 | 2/2 | Complete    | 2026-10-17 |
| 6. Session Core & Refine Loop | v1.1 | 7/7 | Complete    | 2026-10-18 |
| 7. Turn List & Version Navigation | v1.1 | 5/5 | Complete    | 2026-10-18 |
| 8. Editable Code View | v1.1 | 6/6 | Complete    | 2026-10-18 |
| 9. E2E, Demo GIF & Docs | v1.1 | 0/3 | Planned | - |
