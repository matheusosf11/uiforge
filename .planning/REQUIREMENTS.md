# Requirements: UIForge

**Defined:** 2026-10-15
**Core Value:** A user types a prompt and gets working, previewable React + Tailwind component code streamed back and rendered live.

## v1 Requirements

### Prompt & Generation

- [ ] **GEN-01**: User can type a natural-language description of a UI component and submit it
- [ ] **GEN-02**: User can seed the prompt from a gallery of example prompts
- [ ] **GEN-03**: App generates a single self-contained React + Tailwind component via Google Gemini using the Vercel AI SDK
- [ ] **GEN-04**: Generated code streams token-by-token into the code view in real time
- [ ] **GEN-05**: User can stop an in-progress generation
- [ ] **GEN-06**: App extracts clean, runnable code from the model output (strips markdown fences and prose)

### Live Preview

- [ ] **PREV-01**: Generated component renders live inside a sandboxed Sandpack iframe (never in the host page)
- [ ] **PREV-02**: Tailwind styling applies correctly inside the preview
- [ ] **PREV-03**: Preview shows a clear error state when generated code fails to render

### Code & Export

- [ ] **EDIT-01**: User can view the generated code in a syntax-highlighted editor
- [ ] **EDIT-02**: User can copy the generated code to the clipboard
- [ ] **EDIT-03**: User can download the generated code as a file

### UX & Accessibility

- [ ] **UX-01**: User can toggle light/dark theme (persisted)
- [ ] **UX-02**: UI is responsive across mobile and desktop
- [ ] **UX-03**: UI communicates loading, empty, and error states accessibly (aria-live for streaming)
- [ ] **UX-04**: App surfaces a friendly error with retry when the API fails or rate-limits (429)

### Quality & Delivery

- [ ] **QUAL-01**: Core logic (code extraction/parsing) is covered by unit tests (Vitest + RTL)
- [ ] **QUAL-02**: The generate-to-preview flow is covered by an e2e test (Playwright)
- [ ] **QUAL-03**: CI runs lint, test, and build on every push (GitHub Actions)
- [ ] **QUAL-04**: App deploys publicly on Vercel with a shareable link
- [ ] **QUAL-05**: README documents setup (Gemini API key), architecture, and key trade-offs

## v2 Requirements

### Iteration

- **ITER-01**: User can refine a generated component with a follow-up instruction
- **ITER-02**: User can view/restore a history of previous generations

### Platform

- **PLAT-01**: Rate limiting to protect the public deployment (e.g. Upstash)
- **PLAT-02**: Model selector (switch between Gemini / Groq / others)

## Out of Scope

| Feature | Reason |
|---------|--------|
| User authentication / accounts | Portfolio demo; keeps v1 frictionless |
| Persistent generation history | Not core to the demo loop (deferred to v2) |
| Iterative chat-style refinement | Adds state/complexity; deferred to v2 |
| Rate limiting infrastructure | Not needed for a personal portfolio demo (v2) |
| Multi-file / full-project generation | v1 focuses on a single component |
| Backend database / persistence | Stateless single-loop app by design |
| Figma import | Out of scope for v1 |

## Traceability

Mapped during roadmap creation (2026-10-15).

| Requirement | Phase | Status |
|-------------|-------|--------|
| GEN-01 | Phase 1 | Pending |
| GEN-03 | Phase 1 | Pending |
| GEN-04 | Phase 1 | Pending |
| GEN-05 | Phase 1 | Pending |
| GEN-06 | Phase 1 | Pending |
| EDIT-01 | Phase 1 | Pending |
| PREV-01 | Phase 2 | Pending |
| PREV-02 | Phase 2 | Pending |
| PREV-03 | Phase 2 | Pending |
| GEN-02 | Phase 3 | Pending |
| EDIT-02 | Phase 3 | Pending |
| EDIT-03 | Phase 3 | Pending |
| UX-01 | Phase 3 | Pending |
| UX-02 | Phase 3 | Pending |
| UX-03 | Phase 3 | Pending |
| UX-04 | Phase 3 | Pending |
| QUAL-01 | Phase 4 | Pending |
| QUAL-02 | Phase 4 | Pending |
| QUAL-03 | Phase 4 | Pending |
| QUAL-04 | Phase 4 | Pending |
| QUAL-05 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 21 total
- Mapped to phases: 21 (100%)
- Unmapped: 0

---
*Requirements defined: 2026-10-15*
*Last updated: 2026-10-15 after initial definition*
