# Requirements: UIForge

**Defined:** 2026-10-17
**Milestone:** v1.1 Refinamento Iterativo
**Core Value:** A user types a prompt and gets working, previewable React + Tailwind component code streamed back and rendered live — the generate-to-preview loop must feel fast, polished, and reliable.

## v1.1 Requirements

Requirements for this milestone. Each maps to roadmap phases. IDs continue from v1.0 (ITER-01/02 promoted from v2).

### Iterative Refinement

- [x] **ITER-01**: User can refine the current component with a follow-up instruction; after the first generation the prompt input refines by default (button/placeholder change from "Gerar" to "Refinar")
- [x] **ITER-03**: Refinement sends only the current code + the new instruction to the model (no prompt history), via an optional `currentCode` field with its own size limit (~30k chars); oversized code shows a friendly message offering "Novo componente"
- [x] **ITER-04**: The model returns the complete updated component (not a diff), preserving everything not requested; the current code is treated as data, not instructions
- [x] **ITER-05**: A refined result is only accepted as a new version if the stream completes cleanly and the code is valid (non-empty, has `export default`)
- [x] **ITER-06**: User can start over with "Novo componente", which clears the session (confirms first if there are multiple versions or manual edits)
- [x] **ITER-07**: If a refinement fails or the user stops it, the previous version stays visible in code and preview, and a retry reuses the same base code
- [x] **ITER-08**: While a refinement streams, the preview keeps showing the previous version and swaps once on success (no blank/flashing preview)
- [x] **ITER-09**: In refine mode, user can click suggestion chips (e.g. "deixar em dark mode", "adicionar ícone") to prefill a refinement instruction

### Version History & Turns

- [x] **ITER-02**: User can undo to the previous version within the session (in memory, no persistence)
- [x] **HIST-01**: User sees a list of turns (prompts sent this session, mini-chat style) with per-turn status (gerando / ok / erro) and the current version highlighted
- [x] **HIST-02**: User can click a turn to restore that version in code and preview
- [x] **HIST-03**: Refining from an older version discards the versions after it; those versions appear dimmed after a restore and the UI shows the base ("Refinar a partir da vN")
- [x] **HIST-04**: Session history keeps at most 20 versions (oldest dropped)
- [x] **HIST-05**: Turn list is accessible: semantic list, `aria-current` on the active version, descriptive restore labels, status announced via `aria-live`, focus managed after restore/reset

### Editable Code

- [x] **EDIT-04**: User can edit the code directly in the code view (syntax-highlighted, light/dark themes kept); editing is locked while a generation streams
- [x] **EDIT-05**: Manual edits update the live preview after a short debounce (~500 ms); invalid edited code shows the existing preview error state without breaking the app
- [x] **EDIT-06**: Refining after manual edits uses the edited code as the base and records it as an "Edição manual" version first (so undo can return to it)
- [x] **EDIT-07**: Copy and download export the code currently shown (including manual edits)
- [x] **EDIT-08**: Code editor is keyboard-accessible (labelled, no Tab keyboard trap, Escape exits)

### Keyboard Shortcuts

- [x] **UX-05**: User can submit with Ctrl/Cmd+Enter and undo a version with a shortcut outside the editor (not conflicting with the editor's native undo)

### Quality & Docs

- [x] **QUAL-06**: Session/version logic is covered by unit tests (commit, undo, truncation, cap, abort/error, stale-chunk guard) and the refine API contract by route tests (backward-compatible `{prompt}` body)
- [ ] **QUAL-07**: E2E covers generate → refine → undo → edit → refine-after-edit → failed refine keeps previous version, using the env-gated mock model extended for refine mode
- [ ] **DOCS-01**: A demo GIF (`docs/demo.gif`, ≤ ~3 MB) recorded from the deterministic mock shows generate → refine → undo → manual edit, linked from both READMEs with alt text
- [ ] **DOCS-02**: Both READMEs (PT/EN) document iterative refinement, version history, editable code, and the refine API contract

## Future Requirements

Deferred. Tracked but not in this milestone's roadmap.

### History

- **HIST-F1**: Redo / non-destructive version history (branching or append-only)
- **HIST-F2**: Visual diff between versions / side-by-side compare

### Platform

- **PLAT-01**: Distributed rate limiting (e.g. Upstash)
- **PLAT-02**: Model selector (Gemini / Groq / others)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Sending conversation history to the model | Decided: current code + instruction only — keeps free-tier token use low and behavior predictable |
| Diff/patch model output | Fragile with Flash-class models; breaks the stream → parse → preview pipeline |
| Persisting sessions (localStorage/IndexedDB/server) | Not needed for the demo loop; history is in-memory only |
| Heavy IDE editor (Monaco) / multi-file editing | Bundle cost; single-component focus |
| User authentication / accounts | Portfolio demo stays frictionless |
| Running edited code outside the sandbox iframe | Security: edited code is still untrusted; sandbox stays `allow-scripts` only |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ITER-03 | Phase 5 | Complete |
| ITER-04 | Phase 5 | Complete |
| ITER-01 | Phase 6 | Complete |
| ITER-02 | Phase 6 | Complete |
| ITER-05 | Phase 6 | Complete |
| ITER-06 | Phase 6 | Complete |
| ITER-07 | Phase 6 | Complete |
| ITER-08 | Phase 6 | Complete |
| ITER-09 | Phase 6 | Complete |
| QUAL-06 | Phase 6 | Complete |
| UX-05 | Phase 6 | Complete |
| HIST-01 | Phase 7 | Complete |
| HIST-02 | Phase 7 | Complete |
| HIST-03 | Phase 7 | Complete |
| HIST-04 | Phase 7 | Complete |
| HIST-05 | Phase 7 | Complete |
| EDIT-04 | Phase 8 | Complete |
| EDIT-05 | Phase 8 | Complete |
| EDIT-06 | Phase 8 | Complete |
| EDIT-07 | Phase 8 | Complete |
| EDIT-08 | Phase 8 | Complete |
| DOCS-01 | Phase 9 | Pending |
| DOCS-02 | Phase 9 | Pending |
| QUAL-07 | Phase 9 | Pending |

**Coverage:**
- v1.1 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0 ✓

---
*Requirements defined: 2026-10-17*
*Last updated: 2026-10-17 after initial definition*
