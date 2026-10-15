# Project Research Summary

**Project:** UIForge
**Domain:** AI-powered React/Tailwind UI component generator (streaming "v0 lite", Next.js 15 web app)
**Researched:** 2026-10-15
**Confidence:** HIGH

## Executive Summary

UIForge is a focused, **stateless streaming web app**: a prompt goes to Google Gemini via a server-side Route Handler, code streams back token-by-token, and the result renders live inside a sandboxed Sandpack iframe. There is no database, no auth, and no persistence — the entire backend is one `POST /api/generate` handler. Experts build this exact category (v0/bolt/Lovable "lite") with the Vercel AI SDK for streaming and an isolated iframe bundler for safe execution of untrusted model output. Because this is a **portfolio showcase first**, a feature is "worth it" when it either makes the generate→stream→preview loop feel fast and polished, or sends a strong engineering signal (streaming UX, sandbox security, tests/CI/deploy, accessibility) to a recruiter skimming for 20 seconds.

The recommended approach is prescriptive and low-ambiguity: **Next.js 15 App Router + React 19 + TypeScript 5.9 + Tailwind v4 + shadcn/ui**, with the AI call pinned to the **Vercel AI SDK v7 (`ai@7.0.141`) + `@ai-sdk/google@4.0.96`**, and the preview on **`@codesandbox/sandpack-react@2.20.0`**. For streaming, UIForge emits a *single block of code*, not a chat — so it should use the **plain text stream protocol** (`result.toTextStreamResponse()` on the server, `streamProtocol: 'text'` on the client), **not** the UI-message protocol. See "Reconciled Decision: Streaming" below — this is the one place the source research disagreed, and it is now resolved.

The core risks are all concentrated in the generate→preview loop and are well-understood: LLMs wrap output in markdown fences and leak prose (break extraction), Sandpack crashes if server-rendered (App Router default), Tailwind silently doesn't apply inside the iframe, generated code imports libraries the sandbox doesn't have, streaming truncates on Vercel without `maxDuration`, and the Gemini free tier returns 429s on a public link. Every one of these has a known, cheap mitigation; the job of the roadmap is to retire them in the right order (extraction + sandbox + streaming config *before* polish).

## Key Findings

### Recommended Stack

The stack is modern, recruiter-recognizable, and fully version-pinned against the live npm registry (2026-10-15). The project deliberately stays on **Next.js 15** (15.5.28) even though 16.x is `latest`, per PROJECT.md constraint. The AI layer is the Vercel AI SDK v7 line, which abstracts the provider so the documented Groq fallback is a one-line swap. The preview is Sandpack, which bundles editor + preview + iframe isolation in one package — the whole generate→preview loop in a single dependency.

**Core technologies:**
- **Next.js `15.5.28` + React `19.3.1` + TypeScript `5.9.3`** — App Router + Route Handlers are the idiomatic home for server-side LLM streaming. (Stay on TS 5.9; do **not** jump to TS 7.x yet.)
- **Tailwind CSS `4.3.3` + `@tailwindcss/postcss` + shadcn (CLI `4.21.5`)** — CSS-first config (no `tailwind.config.js`), shadcn targets v4, `tw-animate-css` replaces the deprecated `tailwindcss-animate`.
- **Vercel AI SDK `ai@7.0.141` + `@ai-sdk/google@4.0.96` + `zod@4.6.7`** — `streamText` with first-class token streaming; key read from `GOOGLE_GENERATIVE_AI_API_KEY` server-side only. (Optional `@ai-sdk/react@4.0.144` for `useCompletion`.)
- **`@codesandbox/sandpack-react@2.20.0`** — isolated iframe execution of untrusted code + CodeMirror editor; React 19 supported.
- **Supporting:** `next-themes@0.4.6` (dark mode, no FOUC), `motion@14.2.0` (import from `motion/react`, not `framer-motion`), `lucide-react`, `@tailwindcss/browser@4` (Tailwind runtime injected into the sandbox iframe).
- **Dev/CI:** Vitest `5.0.4` + `@vitejs/plugin-react@6` + jsdom + Testing Library (React 19 compatible), Playwright `1.64.1`, GitHub Actions (Node 22), Vercel deploy.

### Expected Features

UIForge wins on **focus and craft**, not scope — the funded competitors race toward full-stack breadth; a portfolio piece wins by doing one loop with production-grade polish.

**Must have (table stakes):**
- Natural-language prompt input (+ Cmd/Ctrl+Enter, disabled while busy) — the entry point.
- Streaming code output token-by-token — the "wow"; static spinner-then-dump feels dated.
- Live sandboxed preview (Sandpack iframe) + code view with syntax highlighting (Sandpack's CodeMirror).
- Copy + download (`.tsx`), example-prompt gallery (kills empty-input paralysis), loading/empty/error states.
- Responsive layout, light/dark theme, keyboard-accessible semantic UI.

**Should have (competitive differentiators — the interview talking points):**
- Secure sandboxed execution of untrusted LLM code (document the threat model in the README) — *the* senior-level signal.
- Polished streaming UX: stop button, auto-scroll, `aria-live="polite"` announcements.
- Preview ⇄ Code tab toggle + viewport switcher (mobile/tablet/desktop) — makes "responsive" interactive.
- Graceful error recovery (distinguish network / model / 429 / malformed-output) + retry.
- Automated tests + CI + public Vercel deploy + strong README — repeatedly cited as the single biggest 2026 differentiator separating real engineers from scaffolded clones.

**Defer (v2+):**
- Iterative/conversational refinement ("make it blue") — new state model; conflicts with single-shot design.
- Persistent history + auth — needs a database + identity; no demo value in v1.
- Multi-file generation, Figma import, server-side rate limiting — explode scope or need paid pipelines.

### Architecture Approach

A thin, stateless, client-streaming single-loop app. `app/page.tsx` is a static Server Component shell; a `"use client"` `GeneratorShell` owns all state (no global store needed) and orchestrates the editor↔preview triangle; the only server logic is the Route Handler that validates the prompt (zod), injects the system prompt, calls `streamText`, and streams tokens back. Pure, testable logic (`parseCode`, system prompt, Sandpack config) lives in `lib/`. Sandpack is dynamically imported with `ssr: false`.

**Major components:**
1. **`app/api/generate/route.ts`** — the entire backend: validate → system prompt → `streamText(google(...))` → streaming Response.
2. **`GeneratorShell` (client)** — holds the stream hook, derives parsed code, wires editor + preview, drives loading/stop/error states.
3. **`lib/parse-code.ts` (pure)** — strips markdown fences/prose from streamed text; the highest-value unit-test target.
4. **`SandboxPreview`** — Sandpack isolated iframe (the security boundary) with Tailwind injected; **`CodeEditor`** shows the live stream + copy/download.

### Critical Pitfalls

1. **Markdown fences / prose in output (P1)** — never pipe raw stream into Sandpack. Build a tested, streaming-safe, idempotent extractor; tolerate unterminated fences mid-stream, only require the closing fence on `finish`. Unit-test against fence/no-fence/prose/partial fixtures.
2. **Sandpack SSR crash (P2)** — it's browser-only; put it behind `"use client"` + `dynamic(..., { ssr: false })` (called from a client component), pin `>= 2.15.0`, inject CSS via `getSandpackCssText()` + `useServerInsertedHTML`.
3. **Generated code won't run in the sandbox (P3)** — the model imports `framer-motion`/`lucide-react`/`@/components/...` or uses a named export. Enforce in the system prompt (single self-contained component, **default export**, only `react`, Tailwind classes only, inline SVG, no fetch) + one-shot example + a guard pass that detects disallowed imports/missing default export.
4. **Tailwind doesn't apply inside the iframe (P4)** — the iframe is isolated and the Sandpack bundler strips `<script>`/`<link>` tags from `index.html`. Inject via `options.externalResources` (see Reconciled Decision: Tailwind-in-sandbox).
5. **Streaming truncates/times out on Vercel (P5)** — set `export const maxDuration` (Hobby allows up to 300s), actually return the stream (don't `await` the full text), prefer the Node runtime, and verify on a real Vercel URL, not just `next dev`.
6. **Gemini free-tier 429s on a public link (P7)** — handle 429 with a friendly recoverable message + submit lock/backoff; pick a higher-headroom model for a public demo; keep the Groq fallback documented.

---

## Reconciled Decisions (version/API discrepancies resolved)

The three research files were written against different AI SDK doc versions, producing surface-level contradictions. STACK.md is the **authoritative source for versions and API shape** because it pinned every package against the live npm registry on the research date and explicitly verified the v7 streaming reference; ARCHITECTURE.md and PITFALLS.md were written against the older **AI SDK v5** docs. Reconciliation below.

### Reconciled Decision: Streaming (PRIMARY) — PRESCRIPTIVE

**The disagreement:**
- STACK.md → AI SDK **v7** (`ai@7.0.141`, `@ai-sdk/google@4.0.96`); return the raw `result.textStream` (a `ReadableStream`), with `toTextStreamResponse()` noted as the convenience equivalent.
- ARCHITECTURE.md → AI SDK **v5**; `result.toTextStreamResponse()` + client `useCompletion({ streamProtocol: 'text' })`; model `gemini-2.0-flash`.
- PITFALLS.md → AI SDK **v5**; `result.toUIMessageStreamResponse()` (or `toTextStreamResponse()`); model `gemini-2.5-flash`.

**The resolution — use this, exactly:**
- **Packages/versions:** `ai@7.0.141`, `@ai-sdk/google@4.0.96`, `zod@4.6.7`. Optionally `@ai-sdk/react@4.0.144`. **Do not mix an `ai@7` core with a v5/v6-tagged provider build** — install the `latest` tags of the `@ai-sdk/*` packages, which are the v7-aligned line.
- **Protocol:** UIForge streams a **single block of code, not a chat** → use the **plain text stream protocol**. Do **not** use `toUIMessageStreamResponse()` — the UI-message protocol is for multi-part chat messages and adds needless complexity here.
- **Server (Route Handler):** return **`result.toTextStreamResponse()`** from `streamText`. (Returning the raw `result.textStream` as a `text/plain` `Response` is an equivalent, slightly lower-level fallback if the helper name ever drifts.) Set `export const runtime = 'nodejs'` and `export const maxDuration = 60`.
- **Client:** use **`useCompletion({ api: '/api/generate', streamProtocol: 'text' })`** from `@ai-sdk/react@4` — it gives `completion`, `isLoading`, `stop`, and `error` for free, which the stop-button + error-state features need. A hand-rolled `fetch` + `getReader()` loop is the smaller-dependency alternative if you want to drop `@ai-sdk/react`.

```ts
// app/api/generate/route.ts  — AI SDK v7
import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { z } from 'zod';
import { SYSTEM_PROMPT } from '@/lib/ai/prompt';

export const runtime = 'nodejs';
export const maxDuration = 60; // Hobby allows up to 300

const Body = z.object({ prompt: z.string().min(1).max(2000) });

export async function POST(req: Request) {
  const { prompt } = Body.parse(await req.json());
  const result = streamText({
    model: google('gemini-2.5-flash'),
    system: SYSTEM_PROMPT,
    prompt,
  });
  return result.toTextStreamResponse();
}
```

> **Open question (flag for planning):** STACK.md rates the *exact convenience method name* as MEDIUM confidence and the raw `textStream` return as HIGH. During the streaming phase, verify `toTextStreamResponse()` against the installed `ai@7.x` types in one 5-minute spike; if the helper name differs, fall back to returning `result.textStream` directly. Also confirm `useCompletion`'s option surface (`streamProtocol: 'text'`) in `@ai-sdk/react@4` — it was documented against v5 and should be re-verified against the installed version.

### Reconciled Decision: Tailwind-in-sandbox (SECONDARY)

A second, integration-critical discrepancy: STACK.md says use the **Tailwind v4** runtime (`@tailwindcss/browser@4`) and that the old v3 Play CDN (`https://cdn.tailwindcss.com`) "won't drive v4 utilities", but its example injects it via an `index.html` `<script>`. ARCHITECTURE.md and PITFALLS.md both use the **v3 Play CDN** via `options.externalResources` — and PITFALLS correctly warns that the Sandpack bundler **strips `<script>`/`<link>` from `index.html`**.

**Resolution — combine the correct half of each:** inject the **Tailwind v4 browser build** through **`options.externalResources`** (the method that actually reaches the iframe `<head>`), not via an `index.html` script tag and not the v3 CDN:

```tsx
options={{ externalResources: ['https://unpkg.com/@tailwindcss/browser@4'] }}
```

> **Open question (flag for planning):** confirm during the live-preview phase that `@tailwindcss/browser@4` loads cleanly via `externalResources` and that `sm:`/`dark:` variants render. If it misbehaves, the documented stopgap is the v3 Play CDN (`https://cdn.tailwindcss.com`) — accept the v3/v4 utility mismatch as a known demo limitation.

### Reconciled Decision: Gemini model id

STACK.md defaults to `gemini-2.5-flash` (quality); PITFALLS.md recommends `gemini-2.5-flash-lite`/`gemini-2.0-flash` for more RPM/RPD headroom on a public link; ARCHITECTURE.md used `gemini-2.0-flash`. **Resolution:** default to `gemini-2.5-flash`, but **centralize the model id in one `lib/ai/model.ts` config** so switching to a higher-headroom model (or the Groq fallback) for the public demo is a one-line change. Free-tier model eligibility is the single most volatile fact in the research — **verify the current free-tier list in Google AI Studio before committing** (open question).

---

## Implications for Roadmap

Based on combined research, the suggested phase structure follows the architecture's dependency-ordered build order, front-loading the risky generate→preview loop so core risk is retired before polish.

### Phase 1: Scaffold & Design System
**Rationale:** Unblocks everything; nothing can stream or preview without the shell.
**Delivers:** Next.js 15 (App Router, `src/`, TS) + Tailwind v4 + shadcn/ui + `next-themes` + base layout/static shell.
**Addresses:** Light/dark theme foundation, responsive shell (table stakes).
**Avoids:** Tailwind v3-vs-v4 setup confusion (P: use `@tailwindcss/postcss`, no `tailwind.config.js`), hydration/theme flash groundwork (P8: `suppressHydrationWarning`).

### Phase 2: Streaming Backend
**Rationale:** The core technical risk (streaming + provider wiring) — retire it early and verify via `curl`/Playwright before any UI.
**Delivers:** `lib/ai/model.ts` + `lib/ai/prompt.ts` + `app/api/generate/route.ts` with `streamText`, `maxDuration`, Node runtime.
**Uses:** `ai@7` + `@ai-sdk/google@4` + `zod@4`; **plain text stream protocol** (`toTextStreamResponse()`).
**Avoids:** Streaming truncation on Vercel (P5), key exposure (P6 — server-only env var).

### Phase 3: Client Streaming Wire-up + Code Extraction
**Rationale:** Makes end-to-end prompt→text work and isolates the trickiest correctness piece as a pure, tested function.
**Delivers:** `GeneratorShell` + `PromptForm` with `useCompletion({ streamProtocol: 'text' })` (stop/loading/error), `lib/parse-code.ts` + Vitest fixtures.
**Implements:** Streaming code output + stop button (table stakes + differentiator).
**Avoids:** Markdown-fence / partial-token corruption (P1 — the foundational pitfall).

### Phase 4: Sandboxed Preview
**Rationale:** The headline feature and the security boundary; depends on clean extracted code from Phase 3.
**Delivers:** `sandbox-preview.tsx` (dynamic `ssr:false` Sandpack) rendering on stream-finish, Tailwind v4 injected via `externalResources`.
**Implements:** Live sandboxed preview + code view (table stakes).
**Avoids:** Sandpack SSR crash (P2), Tailwind-not-applied (P4), unrunnable generated code (P3 via prompt + guard), host-context execution (P6), re-mount-per-token thrash (debounce/finish-only).

### Phase 5: UX Polish & Accessibility
**Rationale:** Converts a working loop into a recruiter-grade showcase; low-risk, high-signal.
**Delivers:** Copy/download, example-prompt gallery, Preview⇄Code tabs + viewport switcher, loading/empty/error states with retry, `aria-live` announcements, light/dark propagation, responsive layout.
**Implements:** Remaining table-stakes + polished-streaming/graceful-recovery/a11y differentiators.
**Avoids:** 429 UX (P7 — friendly recoverable messaging), hydration/theme flash (P8), UX pitfalls (blank-preview-on-error → always show cleaned code).

### Phase 6: Quality Gate & Deploy
**Rationale:** The single biggest 2026 differentiator; must come after a stable loop so the e2e test doesn't churn.
**Delivers:** Vitest unit coverage (esp. `parse-code`), one Playwright e2e (prompt → code → preview mounts), GitHub Actions CI (Node 22), public Vercel deploy with env var set, strong README (architecture + sandbox threat model + trade-offs + what was cut).
**Avoids:** "works in dev, breaks on Vercel" (P5 verified on a real URL), missing production env var (P6), happy-path-only testing (verify empty/oversized prompt, 429, invalid-code preview).

### Phase Ordering Rationale

- **Dependencies flow left→right** per ARCHITECTURE's build order: shell → backend stream → client wire-up + extraction → preview → polish → quality gate. Each phase is independently demoable.
- **Risk is front-loaded:** streaming config (P5) and code extraction (P1) are retired before the preview (P2/P3/P4) layers on top; polish and tests come last so they don't churn against an unstable loop.
- **Grouping follows architecture boundaries:** the interactive streaming/editor/preview triangle (`components/generator/`) is built across Phases 3–4; pure `lib/` logic is isolated for testing; the single Route Handler is the whole of Phase 2.

### Research Flags

Phases likely needing deeper research during planning (`/gsd-research-phase`):
- **Phase 2 (Streaming Backend):** Verify `ai@7` streaming API shape against installed types — `toTextStreamResponse()` method name (STACK MEDIUM), `useCompletion` option surface (documented against v5). Low-effort spike, high leverage.
- **Phase 4 (Sandboxed Preview):** Confirm `@tailwindcss/browser@4` via `externalResources` renders v4 utilities incl. `sm:`/`dark:`; Sandpack SSR CSS-injection pattern (`getSandpackCssText`/`useServerInsertedHTML`) against the installed `sandpack-react@2.20`.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Scaffold):** Well-documented Next 15 + Tailwind v4 + shadcn flow (shadcn CLI auto-detects v4).
- **Phase 5 (UX Polish):** Established shadcn/`next-themes`/a11y patterns.
- **Phase 6 (Quality Gate):** Standard 2026 Vitest + Playwright + GitHub Actions + Vercel matrix.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Versions pinned against the live npm registry (2026-10-15); AI SDK v7 + Gemini provider verified against official ai-sdk.dev docs. |
| Features | HIGH | Clear table-stakes/differentiator split from multiple current (2026) competitor comparisons + recruiter-signal sources; aligns with PROJECT.md scope. |
| Architecture | HIGH | Idiomatic single-loop Route-Handler design verified against AI SDK + Sandpack + Next 15 docs; code examples were written against AI SDK **v5** — reconciled to v7 above. |
| Pitfalls | HIGH | Core facts verified against Vercel/Gemini/Sandpack/AI SDK docs; a few UX/prompting items MEDIUM (experience-based); written against AI SDK **v5** — reconciled above. |

**Overall confidence:** HIGH

### Gaps to Address

- **AI SDK v7 API surface (from v5-era examples):** `toTextStreamResponse()` name and `useCompletion({ streamProtocol: 'text' })` options — verify against installed `ai@7` / `@ai-sdk/react@4` types in a Phase 2 spike; fall back to returning raw `result.textStream` if needed.
- **Tailwind-in-sandbox method:** confirm `@tailwindcss/browser@4` via `externalResources` in Phase 4; v3 Play CDN is the documented stopgap.
- **Gemini free-tier model availability + limits:** the most volatile fact — verify the current free-tier list and RPM/RPD in Google AI Studio before committing a model id; centralize the id so swapping (incl. Groq fallback) is one line.
- **Sandpack SSR CSS injection:** confirm the `getSandpackCssText()` + `useServerInsertedHTML` pattern on a real Vercel deploy (not just `next dev`) to avoid flash-of-unstyled-Sandpack.

## Sources

### Primary (HIGH confidence)
- npm registry (`npm view <pkg> version dist-tags`, 2026-10-15) — exact pinned versions for the entire stack.
- https://ai-sdk.dev/docs/getting-started/nextjs-app-router + /docs/reference/ai-sdk-core/stream-text — AI SDK **v7** Route Handler, `streamText`, `textStream`/`ReadableStream`, client wiring.
- https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai — `@ai-sdk/google`, `GOOGLE_GENERATIVE_AI_API_KEY`, Gemini model table.
- https://sandpack.codesandbox.io/docs/guides/ssr + Sandpack issues #1093/#1152/#624, PR #147 — App Router `"use client"` + `ssr:false`, `externalResources`, bundler strips `index.html` external tags, fix in 2.15.0.
- https://vercel.com/docs/functions/limitations + /configuring-functions/duration — `maxDuration`, `FUNCTION_INVOCATION_TIMEOUT`, Edge 25s first-byte.
- https://ai.google.dev/gemini-api/docs/rate-limits — free-tier RPM/TPM/RPD (now surfaced per-project in AI Studio).
- Next.js official docs — App Router Route Handlers, `runtime`/`maxDuration`, `dynamic(ssr:false)` only in Client Components.
- `.planning/PROJECT.md` — scope, constraints, out-of-scope decisions.

### Secondary (MEDIUM confidence)
- AI SDK **v5** docs (ai-sdk.dev/v5/...) — informed ARCHITECTURE.md and PITFALLS.md examples; superseded by v7 per the reconciliation above.
- 2026 competitor comparisons (lovable.dev, arte.itlibra.com, toolchase.com, superframeworks.com) — v0/bolt/Lovable feature matrix.
- Recruiter-signal sources (Rockstar Developer University 2026; reference portfolio repos) — differentiator weighting.

### Tertiary (LOW confidence)
- Exact Gemini free-tier numbers — Google no longer publishes a fixed table; treat the cited RPM/RPD as approximate and verify in AI Studio.

---
*Research completed: 2026-10-15*
*Ready for roadmap: yes*
