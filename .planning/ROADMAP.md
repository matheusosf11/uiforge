# Roadmap: UIForge

## Overview

UIForge takes a user from a natural-language prompt to a live, sandboxed React + Tailwind component in four coarse, vertically-sliced phases. We first build the end-to-end generate→stream loop (scaffold + streaming backend + client wire-up + code extraction) so a prompt produces clean code streaming into a code view. We then layer on the headline feature — the secure sandboxed live preview — followed by the export/examples/accessible-UX polish that makes the loop feel recruiter-grade, and finally the quality gate (tests, CI, public Vercel deploy, README) that is the project's biggest hiring signal. Risk is front-loaded: streaming config and code extraction are retired before preview, and polish/tests come last so they don't churn against an unstable loop.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Streaming Generation** - Prompt → clean React/Tailwind code streaming live into a code view (completed 2026-10-15)
- [x] **Phase 2: Sandboxed Live Preview** - Generated code renders safely in an isolated Sandpack iframe with Tailwind (completed 2026-10-15)
- [ ] **Phase 3: Export, Examples & Accessible UX** - Copy/download, example gallery, theme, responsive layout, accessible states & error recovery
- [ ] **Phase 4: Quality Gate & Deploy** - Tests, CI, public Vercel deploy, and documentation

## Phase Details

### Phase 1: Foundation & Streaming Generation

**Goal**: A user can type a component description and watch clean React + Tailwind code stream token-by-token into a code view
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: GEN-01, GEN-03, GEN-04, GEN-05, GEN-06, EDIT-01
**Success Criteria** (what must be TRUE):

  1. User can type a natural-language component description and submit it (including Cmd/Ctrl+Enter), with the input disabled while a generation is in progress
  2. Submitting a prompt generates a single self-contained React + Tailwind component via Google Gemini (Vercel AI SDK), streaming token-by-token into the code view in real time
  3. User can stop an in-progress generation and the UI returns to a ready state
  4. The code shown in the syntax-highlighted editor is clean and runnable — markdown fences and surrounding prose are stripped, even mid-stream

**Plans**: 4 plans

Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Scaffold Next.js 15 (App Router, src/, TS) + Tailwind v4 + shadcn/ui + next-themes base shell (Wave 1)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Streaming backend: lib/ai/model.ts + prompt.ts + app/api/generate/route.ts (streamText, Node runtime, maxDuration, text stream protocol) (Wave 2)
- [x] 01-03-PLAN.md — Code extraction: lib/parse-code.ts streaming-safe/idempotent fence+prose stripping + Vitest fixtures (Wave 2)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-04-PLAN.md — Client wire-up: GeneratorShell + PromptForm + CodeView with useCompletion (stop/loading/error) streaming into a syntax-highlighted code view (Wave 3)

**UI hint**: yes

### Phase 2: Sandboxed Live Preview

**Goal**: The generated component renders live inside a secure, isolated sandbox with Tailwind styling applied
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: PREV-01, PREV-02, PREV-03
**Success Criteria** (what must be TRUE):

  1. The generated component renders live inside a sandboxed Sandpack iframe and never executes in the host page
  2. Tailwind styling (including responsive and dark variants) applies correctly inside the preview
  3. When generated code fails to render, the preview shows a clear, non-blank error state

**Plans**: 2 plans

Plans:
**Wave 1**

- [x] 02-01-PLAN.md — SandboxPreview + CSS injection + mount-on-finish (PREV-01)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-02-PLAN.md — Tailwind-in-sandbox via externalResources + preview error state (PREV-02, PREV-03)

**UI hint**: yes

### Phase 3: Export, Examples & Accessible UX

**Goal**: The generate→preview loop becomes a polished, accessible, portfolio-grade experience with export and error recovery
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: GEN-02, EDIT-02, EDIT-03, UX-01, UX-02, UX-03, UX-04
**Success Criteria** (what must be TRUE):

  1. User can seed the prompt from a gallery of example prompts
  2. User can copy the generated code to the clipboard and download it as a file
  3. User can toggle a persisted light/dark theme, and the layout is responsive across mobile and desktop
  4. The UI communicates loading, empty, and error states accessibly (aria-live for streaming), and surfaces a friendly, retryable message when the API fails or rate-limits (429)

**Plans**: 3 plans

Plans:
**Wave 1**

- [x] 03-01-PLAN.md — Example-prompt gallery (12 chips) + Copiar/Baixar no CodeView

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 03-02-PLAN.md — Theme toggle (persisted, binary) + CodeView/preview theming + responsive Preview⇄Código tabs

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 03-03-PLAN.md — Friendly 429/API error with retry (route fullStream peek) + aria-live status

**UI hint**: yes

### Phase 4: Quality Gate & Deploy

**Goal**: The app is tested, continuously integrated, publicly deployed, and documented
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: QUAL-01, QUAL-02, QUAL-03, QUAL-04, QUAL-05
**Success Criteria** (what must be TRUE):

  1. Core code-extraction/parsing logic is covered by unit tests (Vitest + RTL)
  2. The generate-to-preview flow is covered by an end-to-end test (Playwright)
  3. CI runs lint, test, and build on every push (GitHub Actions)
  4. The app deploys publicly on Vercel with a working shareable link
  5. The README documents setup (Gemini API key), architecture, and key trade-offs (incl. the sandbox threat model)

**Plans**: TBD

Plans:

- [ ] 04-01: Vitest unit coverage (esp. parse-code) + Playwright e2e (prompt → code → preview mounts)
- [ ] 04-02: GitHub Actions CI (Node 22, lint/test/build) + public Vercel deploy with env var
- [ ] 04-03: README (setup, architecture, sandbox threat model, trade-offs, what was cut)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Streaming Generation | 4/4 | Complete    | 2026-10-15 |
| 2. Sandboxed Live Preview | 2/2 | Complete   | 2026-10-15 |
| 3. Export, Examples & Accessible UX | 2/3 | In Progress|  |
| 4. Quality Gate & Deploy | 0/3 | Not started | - |
