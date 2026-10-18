# Milestones

## v1.1 Refinamento Iterativo (Completed: 2026-10-18 — not yet pushed/deployed)

**Delivered:** After the first generation, follow-up prompts refine the current component (current code + instruction), with in-memory version history, an accessible turn list, a hand-editable code view and a recorded demo GIF.

**Phases completed:** 5 phases (5–9), 23 plans
**Timeline:** 2026-10-17 → 2026-10-18 (2 days, ~175 commits)
**Code:** `src/` + `e2e/` grew by ~9,000 lines (62 files); ~11,500 LOC TS/TSX total
**Tests:** 419 Vitest unit tests; Playwright e2e incl. the full refine journey

**Key accomplishments:**

- Stateless refine contract: `POST /api/generate` accepts `{ prompt, currentCode? }` and streams the full updated component; 30k-char code limit (413), prompt-injection-safe framing, `finishReason` check against truncated output
- Pure session reducer (commit/undo/restore/abort/error, 20-version cap with stable numbering): refinements never lose the last good version; "Novo componente" reset with confirmation; Ctrl/⌘+Enter and Ctrl/⌘+Z
- Model-generated refine suggestion chips via `POST /api/suggest` (own rate-limit bucket, timeouts, pt-BR fallback list)
- Accessible turn list with restore, dimmed later versions and "Refinar a partir da vN"
- Editable syntax-highlighted code (react-simple-code-editor + Prism): debounced live preview, "Edição manual" versions that refinement builds on; double-buffered preview iframe (no blank flash on edits)
- Dark-only UI with a three.js topology background and an interactive Spline robot mascot; journey e2e, `npm run demo:gif` (ffmpeg) → `docs/demo.gif`, PT/EN READMEs with the API contract

**Known deferred items at close:** 5 (see STATE.md Deferred Items) — manual checks only (screen reader, mobile, visual); no open product work.

---

## v1.0 MVP (Shipped: 2026-10-17)

**Delivered:** Prompt → React + Tailwind code streamed live from Gemini → rendered in a sandboxed iframe preview, publicly deployed with tests and CI.

**Phases completed:** 4 phases, 17 plans
**Timeline:** 2026-10-15 → 2026-10-17 (3 days, 125 commits)
**Code:** ~2,700 LOC TypeScript/TSX in `src/` + `e2e/`
**Live:** https://uiforge-orlasup-project.vercel.app · https://github.com/matheusosf11/uiforge

**Key accomplishments:**

- Streaming generation: Gemini via Vercel AI SDK (plain text stream), fence/prose stripping mid-stream, stop/retry, and fallback across Gemini models on 503/429 before the first token
- Sandboxed live preview: generated TSX transpiled with Babel inside an `allow-scripts`-only srcdoc iframe (always light), Tailwind v4 browser runtime, non-blank error states with "Gerar de novo"
- Preview runtime self-hosted under `public/preview-runtime/` after ad/privacy blockers that block jsDelivr left the preview blank; 15s load watchdog with "Recarregar preview"
- Polished, accessible UX: copy/download, example prompt gallery, light/dark theme, responsive tabs, aria-live status and friendly error recovery
- Quality gate: 93 Vitest unit tests, Playwright e2e with an env-gated mock model, GitHub Actions CI, per-IP in-memory rate limit, bilingual README

**Known deferred items at close:** 5 (see STATE.md Deferred Items) — only `docs/demo.gif` is real pending work; the rest are verification files already covered by later UATs.

---
