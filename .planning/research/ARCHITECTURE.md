# Architecture Research

**Domain:** AI-powered React/Tailwind UI component generator (streaming "v0 lite") on Next.js 15 App Router
**Researched:** 2026-10-15
**Confidence:** HIGH

## Standard Architecture

UIForge is a **thin, stateless, client-streaming web app**. There is no DB, no auth, and no persistence. The only server responsibility is to proxy a prompt to Gemini and stream tokens back; everything else (editor, preview, copy/download, theming) is client-side. The architecture is a single request/response streaming loop with a sandboxed execution boundary.

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                       BROWSER (Client)                             │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐   ┌──────────────────────────────────────────┐  │
│  │ PromptForm   │   │          GeneratorShell ('use client')   │  │
│  │ + Example    │──▶│  useCompletion() hook (AI SDK)           │  │
│  │   Gallery    │   │   ├─ completion (streamed text)          │  │
│  └──────────────┘   │   ├─ isLoading / error / stop           │  │
│                     │   └─ parse code → feed editor + preview  │  │
│                     └───────┬───────────────────┬──────────────┘  │
│                             │                    │                 │
│               ┌─────────────▼──────┐   ┌─────────▼──────────────┐  │
│               │  CodeEditor        │   │  SandpackPreview       │  │
│               │  (CodeMirror /     │   │  (sandboxed iframe —   │  │
│               │   Sandpack editor) │   │   untrusted code runs  │  │
│               │  copy / download   │   │   HERE, never on host) │  │
│               └────────────────────┘   └────────────────────────┘  │
└─────────────────────────────┬──────────────────────────────────────┘
                              │ POST /api/generate (HTTP stream)
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                    NEXT.js SERVER (Vercel)                         │
├──────────────────────────────────────────────────────────────────┤
│  Route Handler  app/api/generate/route.ts  (runtime: nodejs)      │
│   ├─ validate prompt (zod)                                         │
│   ├─ build system prompt (component rules)                         │
│   ├─ streamText({ model: google('gemini-...'), ... })            │
│   └─ return streaming Response (token-by-token)                    │
└─────────────────────────────┬──────────────────────────────────────┘
                              │ Vercel AI SDK provider call
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│          EXTERNAL: Google Gemini API (free tier)                  │
│          key: GOOGLE_GENERATIVE_AI_API_KEY (server-only env)      │
└──────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `app/page.tsx` | Static shell, layout, mounts the generator. Server Component (no interactivity). | RSC, imports client `GeneratorShell` |
| `GeneratorShell` | Orchestrates the whole client flow: holds `useCompletion`, derives parsed code, wires editor ↔ preview. | `'use client'` component |
| `PromptForm` + `ExampleGallery` | Capture prompt text / seed from example cards; submit to the hook. | Client, controlled form |
| `app/api/generate/route.ts` | The ONLY server logic. Validates prompt, injects system prompt, calls Gemini via AI SDK, streams tokens. | Route Handler `POST` |
| `lib/ai/prompt.ts` | System prompt + model config (single source of truth for "what good output looks like"). | Pure module |
| `lib/parse-code.ts` | Strip markdown fences / preamble from the streamed text → clean component source. | Pure function |
| `CodeEditor` | Display streamed code read-only during generation; copy/download actions. | Sandpack `CodeEditor` or CodeMirror |
| `SandpackPreview` | Render the parsed component live inside a sandboxed iframe with Tailwind available. | `@codesandbox/sandpack-react` |
| `ThemeProvider` | Light/dark toggle (host app only — the preview iframe is independent). | `next-themes` |

## Recommended Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout, ThemeProvider, fonts, global metadata
│   ├── page.tsx                # Server Component shell; renders <GeneratorShell/>
│   ├── globals.css             # Tailwind directives for the HOST app only
│   └── api/
│       └── generate/
│           └── route.ts        # POST handler: prompt -> streamText(Gemini) -> stream
│
├── components/
│   ├── generator/
│   │   ├── generator-shell.tsx # 'use client' — owns useCompletion + layout split
│   │   ├── prompt-form.tsx     # textarea + submit + stop button
│   │   ├── example-gallery.tsx # seed prompts (static data -> fills the form)
│   │   ├── code-editor.tsx     # streamed code view + copy/download
│   │   └── sandbox-preview.tsx # Sandpack provider (dynamic import, ssr:false)
│   ├── ui/                     # shadcn/ui primitives (button, textarea, card, tabs...)
│   └── theme/
│       ├── theme-provider.tsx  # next-themes wrapper
│       └── theme-toggle.tsx
│
├── lib/
│   ├── ai/
│   │   ├── model.ts            # google() provider + model id + maxDuration config
│   │   └── prompt.ts           # SYSTEM_PROMPT string (component generation rules)
│   ├── parse-code.ts           # fence-stripping / sanitising of streamed output
│   ├── sandpack-config.ts      # template, files builder, externalResources, options
│   └── examples.ts             # typed array of example prompts for the gallery
│
└── test/
    ├── parse-code.test.ts      # Vitest — the highest-value unit to test
    └── e2e/
        └── generate.spec.ts    # Playwright — prompt -> code appears -> preview mounts
```

### Structure Rationale

- **`app/api/generate/` is the entire backend.** Keeping it a single Route Handler makes the server surface auditable and keeps the API key server-only. No Server Actions needed (see Pattern 1).
- **`components/generator/` groups the interactive core** so the streaming/editor/preview triangle lives together. Everything here is client-side; `app/` stays mostly server.
- **`lib/` holds pure, testable logic** (`parse-code`, `prompt`, `sandpack-config`). Isolating `parse-code.ts` as a pure function is deliberate — it is the trickiest correctness-sensitive piece and the easiest to unit test without a browser.
- **`src/` prefix** matches Next.js 15 + shadcn/ui conventions and keeps config files at the repo root.

## Architectural Patterns

### Pattern 1: Route Handler for streaming (NOT a Server Action)

**What:** Expose `POST /api/generate` that calls `streamText` and returns a streaming HTTP response consumed by the AI SDK's `useCompletion` hook.
**When to use:** Any client that needs token-by-token text streamed into React state via the AI SDK UI hooks — exactly this project.
**Trade-offs:** Server Actions *can* stream (via `createStreamableValue` / `readStreamableValue` in RSC), but they don't integrate with `useCompletion`/`useChat`, give you less control over the raw stream, and are awkward for a "pure text out" use case. A Route Handler is the documented, idiomatic path for AI SDK streaming and keeps the transport a plain HTTP endpoint (easy to test with Playwright/curl). **Recommendation: Route Handler.**

**Example (verified against AI SDK v5 docs):**
```typescript
// app/api/generate/route.ts
import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { SYSTEM_PROMPT } from '@/lib/ai/prompt';

export const runtime = 'nodejs';     // provider SDK works on Node runtime
export const maxDuration = 30;        // allow up to 30s streaming on Vercel

export async function POST(req: Request) {
  const { prompt } = await req.json();
  const result = streamText({
    model: google('gemini-2.0-flash'), // free-tier model id
    system: SYSTEM_PROMPT,
    prompt,
  });
  // Simplest protocol for a single text completion:
  return result.toTextStreamResponse();
}
```
```tsx
// client (inside generator-shell.tsx)
'use client';
import { useCompletion } from '@ai-sdk/react';

const { completion, input, handleInputChange, handleSubmit, isLoading, stop, error } =
  useCompletion({ api: '/api/generate', streamProtocol: 'text' });
```
> Note: the AI SDK also offers the richer UI-message protocol (`createUIMessageStreamResponse` + default `useCompletion`). For UIForge, which streams a single block of code, the plain **text stream protocol** (`toTextStreamResponse()` + `streamProtocol: 'text'`) is simpler and sufficient.

### Pattern 2: Parse code out of the stream defensively (prompt + strip)

**What:** Two layers. (1) The **system prompt** forbids prose and markdown: "Return ONLY a single self-contained React + Tailwind component as TypeScript/TSX. No explanations, no markdown fences." (2) A **pure `parseCode()`** function still strips any leaked ```` ```tsx ```` / ```` ``` ```` fences and leading commentary, because LLMs leak fences even when told not to.
**When to use:** Always — never feed raw LLM text straight into Sandpack.
**Trade-offs:** Streaming means the code is *incomplete* mid-flight; show the raw/partial text live in the editor for UX, but only run `parseCode()` → Sandpack once streaming finishes (or debounce) to avoid mounting broken code on every token.

**Example:**
```typescript
// lib/parse-code.ts
export function parseCode(raw: string): string {
  const fenced = raw.match(/```(?:tsx?|jsx?|react)?\s*\n([\s\S]*?)```/);
  const body = fenced ? fenced[1] : raw;
  return body.trim();
}
```

### Pattern 3: Sandboxed preview via Sandpack with Tailwind over CDN

**What:** Render the generated component inside `@codesandbox/sandpack-react`, which executes untrusted code in an **isolated iframe** (CodeSandbox bundler), never in the host page's JS context. Tailwind is made available to the preview through `externalResources` (Tailwind Play CDN), so the generated `className`s just work without a build step in the sandbox.
**When to use:** Any time you run AI/user-authored code in the browser — this is the core security boundary of the project.
**Trade-offs:** The Play CDN is Tailwind v3 JIT-in-browser (fine for a preview, not for production bundles) and needs network access; it won't support custom `tailwind.config` plugins. For a portfolio preview that's an acceptable, standard trade-off. Load `sandbox-preview.tsx` via `next/dynamic` with `ssr: false` since Sandpack is browser-only.

**Example (verified against Sandpack docs):**
```tsx
// components/generator/sandbox-preview.tsx
'use client';
import { Sandpack } from '@codesandbox/sandpack-react';

export function SandboxPreview({ code }: { code: string }) {
  return (
    <Sandpack
      template="react-ts"
      options={{ externalResources: ['https://cdn.tailwindcss.com'] }}
      files={{ '/App.tsx': code }}
    />
  );
}
```

## Data Flow

### Request Flow

```
[User types prompt / picks example]
    ↓ handleSubmit()
[GeneratorShell: useCompletion] ── POST /api/generate ──▶ [Route Handler]
                                                               ↓
                                                         streamText(google)
                                                               ↓
[completion state grows token-by-token] ◀── HTTP text stream ── [Gemini]
    ↓ (live)                                   ↓ (on finish)
[CodeEditor shows raw stream]        [parseCode(completion)]
                                               ↓
                                     [SandpackPreview files={{'/App.tsx': code}}]
                                               ↓
                                     [sandboxed iframe renders component]
```

### State Management

No global store is needed. All state is local to `GeneratorShell`:

```
useCompletion()  →  { completion, isLoading, error, stop }
       ↓ derive (useMemo)
  parsedCode  →  CodeEditor (display)  +  SandpackPreview (execute)
next-themes   →  host app light/dark (independent of preview iframe)
```

### Key Data Flows

1. **Generation loop:** prompt → `/api/generate` → Gemini stream → `completion` string → editor (live) → `parseCode` → Sandpack preview (on finish). This is the one flow that must feel fast and reliable.
2. **Example seeding:** gallery card click → fills `input` → optionally auto-submits → same generation loop.
3. **Copy/download:** `parsedCode` → clipboard API / Blob download. Pure client, no server round-trip.
4. **Error/loading:** `isLoading` drives skeletons + a `stop()` button; `error` drives an accessible error panel; empty state before first generation.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Current design is sufficient. Vercel free tier + Gemini free tier. No DB, no cache. |
| 1k-100k users | Add rate limiting (explicitly out of scope for v1 — Upstash when needed), handle Gemini free-tier quota/429s gracefully, consider caching popular example outputs. |
| 100k+ users | Move to a paid model tier / provider fallback (Groq is the documented fallback), add a queue/backpressure, and consider self-hosting the Sandpack bundler to control iframe costs. |

### Scaling Priorities

1. **First bottleneck: Gemini free-tier quota (429s).** Fix by surfacing a clean "try again" error state now, and adding rate limiting + provider fallback later.
2. **Second bottleneck: Vercel function duration / concurrency on long generations.** Fix by keeping `maxDuration` tight, streaming (already done), and constraining output length in the system prompt.

## Anti-Patterns

### Anti-Pattern 1: Executing generated code in the host page

**What people do:** `eval()`, `new Function()`, or a React `dangerouslySetInnerHTML` / live-render of the LLM output directly in the app.
**Why it's wrong:** Arbitrary untrusted code runs with full access to the host origin (cookies, same-origin requests, the DOM) — a serious XSS/exfiltration risk.
**Do this instead:** Always render in the Sandpack sandboxed iframe. The host app never executes generated code.

### Anti-Pattern 2: Mounting Sandpack on every streamed token

**What people do:** Pass the still-streaming `completion` straight into `<Sandpack files>` on each update.
**Why it's wrong:** Mid-stream code is syntactically incomplete → the bundler throws constantly, the iframe thrashes, and it's slow/janky.
**Do this instead:** Show the raw stream in the read-only editor during generation; only run `parseCode()` → Sandpack when `isLoading` flips to false (or on a debounce).

### Anti-Pattern 3: Reaching for a Server Action because it's "modern"

**What people do:** Implement streaming with a Server Action + `createStreamableValue` to show off RSC.
**Why it's wrong:** It doesn't pair with `useCompletion`, complicates the text-out use case, and is harder to test than an HTTP endpoint.
**Do this instead:** Use the Route Handler for streaming; it's the idiomatic AI SDK transport.

### Anti-Pattern 4: Exposing the Gemini key to the client

**What people do:** Call the model from a client component with a `NEXT_PUBLIC_` key.
**Why it's wrong:** Leaks the API key to anyone who opens devtools.
**Do this instead:** Keep `GOOGLE_GENERATIVE_AI_API_KEY` as a server-only env var read inside the Route Handler.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Google Gemini | `@ai-sdk/google` provider inside Route Handler via `streamText` | Server-only key; free tier has quota — handle 429s. Groq is a documented fallback provider (`@ai-sdk/groq`). |
| CodeSandbox bundler | Via `@codesandbox/sandpack-react` iframe (hosted bundler) | Needs outbound network from the browser; dynamic-import with `ssr:false`. |
| Tailwind Play CDN | `externalResources: ['https://cdn.tailwindcss.com']` injected into preview iframe | v3 in-browser JIT; no custom config/plugins. Preview-only, not the host app's Tailwind. |
| Vercel | Deploy target; env vars + `maxDuration` on the Route Handler | Free tier function limits apply to streaming duration. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Client `GeneratorShell` ↔ Route Handler | HTTP POST + streamed response (`useCompletion`) | The only network hop in the app. |
| `GeneratorShell` ↔ `SandboxPreview` | Props (`parsedCode`) | Preview runs in a separate iframe realm — strict trust boundary. |
| Route Handler ↔ `lib/ai/prompt.ts` | Direct import | System prompt is the contract for output shape. |
| `GeneratorShell` ↔ `lib/parse-code.ts` | Pure function call | Keep side-effect-free for unit testing. |

## Suggested Build Order

Dependencies flow left→right; each step is demoable on its own.

1. **Scaffold** — Next.js 15 (App Router, `src/`, TS), Tailwind, shadcn/ui, `next-themes`, base layout + static shell (`page.tsx`). *Unblocks everything.*
2. **Streaming backend** — `lib/ai/model.ts` + `lib/ai/prompt.ts` + `app/api/generate/route.ts` with `streamText`. Verify via `curl`/Playwright that tokens stream. *Core risk retired early.*
3. **Client streaming wire-up** — `GeneratorShell` + `PromptForm` with `useCompletion`; render raw stream to screen (loading/stop/error states). *End-to-end prompt→text works.*
4. **Code parsing** — `lib/parse-code.ts` (+ Vitest). Feed clean code into the `CodeEditor`. *The testable correctness piece.*
5. **Sandboxed preview** — `sandbox-preview.tsx` with Sandpack + Tailwind CDN, mounted on stream-finish. *The headline feature + security boundary.*
6. **Polish actions & UX** — copy/download, `ExampleGallery`, light/dark, responsive, empty/error/loading accessibility.
7. **Quality gate** — Vitest unit coverage, one Playwright e2e (prompt → code → preview mounts), GitHub Actions CI, Vercel deploy.

## Sources

- Vercel AI SDK — streaming text, `streamText`, `useCompletion`, route handlers (Context7 `/vercel/ai`, v5; `ai-sdk.dev` docs) — HIGH
- Sandpack — `customSetup`, `externalResources` (Tailwind CDN), `template`, `files`, `options` (Context7 `/codesandbox/sandpack`) — HIGH
- `@ai-sdk/google` Gemini provider + server-only key convention (`ai-sdk.dev` provider docs) — HIGH
- Next.js 15 App Router Route Handlers, `runtime`/`maxDuration`, dynamic import `ssr:false` (Next.js official docs) — HIGH
- Project context: `.planning/PROJECT.md` — HIGH

---
*Architecture research for: AI-powered React/Tailwind UI component generator (Next.js 15 App Router)*
*Researched: 2026-10-15*
