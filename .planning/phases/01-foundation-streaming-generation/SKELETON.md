# Walking Skeleton — UIForge

**Phase:** 1
**Generated:** 2026-10-15

## Capability Proven End-to-End

A user types a component description, submits it (click or Cmd/Ctrl+Enter), and watches clean React + Tailwind code stream token-by-token into a syntax-highlighted code view — powered end-to-end by a Next.js 15 Route Handler (`POST /api/generate`) that calls Google Gemini via the Vercel AI SDK and streams plain text back, with markdown fences/prose stripped even mid-stream.

This exercises the full stack the rest of the project builds on: client state + stream reader → HTTP streaming transport → server Route Handler → external LLM provider → pure code-extraction logic → UI render.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Next.js 15.5.x App Router + React 19 + TypeScript 5.9 (`src/`) | PROJECT.md constraint; App Router + Route Handlers are the idiomatic home for server-side LLM streaming. Stay on Next 15 (not 16). |
| Styling | Tailwind CSS v4 (`@import "tailwindcss"`, `@tailwindcss/postcss`, no `tailwind.config.js`) + shadcn/ui | v4 is CSS-first; shadcn targets v4 and gives accessible, recruiter-recognizable primitives. |
| Data layer | **None (stateless by design)** | No DB, no auth, no persistence. The "real read + write" of a classic skeleton is replaced by a real streaming API round-trip to Gemini. |
| AI transport | Vercel AI SDK v7 (`ai@7` + `@ai-sdk/google@4` + `zod@4`), **plain text stream protocol** (`result.toTextStreamResponse()` server / `useCompletion({ streamProtocol: 'text' })` client) | UIForge streams a single block of code, not a chat. Do NOT use `toUIMessageStreamResponse`. Raw `result.textStream` + `fetch`/reader is the version-robust fallback. |
| Model | `gemini-2.5-flash` via `GOOGLE_GENERATIVE_AI_API_KEY`, centralized in `src/lib/ai/model.ts` | One-line swap to a higher-headroom model or the Groq fallback. Key is server-only, never `NEXT_PUBLIC_`. |
| Route runtime | `export const runtime = 'nodejs'; export const maxDuration = 60;` | Node runtime avoids the Edge 25s first-byte rule; `maxDuration` prevents Vercel stream truncation (Hobby allows up to 300). |
| Code extraction | Pure, unit-tested `src/lib/parse-code.ts` (streaming-safe, idempotent fence/prose stripping) | The highest-value correctness-sensitive piece; isolated so it is testable without a browser. |
| Directory layout | `src/app/*` (shell + Route Handler), `src/components/generator/*` (client triangle), `src/components/ui/*` (shadcn), `src/lib/*` (pure logic) | Matches research ARCHITECTURE.md; groups the interactive streaming/editor core together, keeps `lib/` pure. |

## Stack Touched in Phase 1

- [x] Project scaffold (Next.js 15, TypeScript, Tailwind v4, ESLint, Vitest test runner, shadcn/ui)
- [x] Routing — one real route: `POST /api/generate` (streaming Route Handler)
- [x] "Data" layer — a real external round-trip: prompt → Gemini → streamed tokens back (replaces DB read/write for this stateless app)
- [x] UI — interactive prompt form (textarea + submit + stop + Cmd/Ctrl+Enter) wired to the streaming API, rendering into a live syntax-highlighted code view
- [x] Deployment — documented local full-stack run (`npm run dev`, key in `.env.local`). Public Vercel deploy is deferred to Phase 4 (QUAL-04).

## Out of Scope (Deferred to Later Slices)

- Sandboxed live preview (Sandpack iframe), Tailwind-in-iframe, preview error state → **Phase 2** (PREV-01/02/03)
- Copy/download, example-prompt gallery, theme toggle UI, responsive polish, accessible aria-live states, friendly 429 recovery → **Phase 3** (GEN-02, EDIT-02/03, UX-01..04)
- Playwright e2e, GitHub Actions CI, public Vercel deploy, README → **Phase 4** (QUAL-01..05)
- Iterative refinement, history, model selector, server-side rate limiting → **v2** (out of scope)

> Note: Phase 1 ships Vitest unit tests for `parse-code` (the risky piece) even though the formal unit-test requirement (QUAL-01) lands in Phase 4. The end-to-end proof for Phase 1 is manual (`npm run dev` + a real prompt) plus the `parse-code` unit suite; the automated Playwright e2e is intentionally deferred to Phase 4 so it does not churn against an unstable loop.

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its architectural decisions:

- **Phase 2:** The streamed code renders live inside a secure, isolated Sandpack iframe with Tailwind applied, and shows a clear error state on failure.
- **Phase 3:** The loop becomes polished and accessible — example gallery, copy/download, persisted theme, responsive layout, aria-live states, friendly retryable errors.
- **Phase 4:** The app is tested (Vitest + Playwright), continuously integrated (GitHub Actions), publicly deployed on Vercel, and documented (README incl. sandbox threat model).
