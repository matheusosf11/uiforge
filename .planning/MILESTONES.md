# Milestones

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
