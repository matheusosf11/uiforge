# Stack Research

**Domain:** AI-powered React/Tailwind UI component generator (Next.js web app, "v0 lite")
**Researched:** 2026-10-15
**Confidence:** HIGH (versions pinned against the live npm registry on 2026-10-15; AI SDK streaming + Gemini provider patterns verified against official ai-sdk.dev docs)

> All versions below were read from the npm registry (`npm view <pkg> version`) and official docs on the research date. The project **constrains itself to Next.js 15** even though Next.js 16.x is now the npm `latest` — this doc honors that constraint and pins the latest stable 15.x line.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | `15.5.28` (latest 15.x) | App Router framework, Route Handlers, RSC, deploy target | Project's chosen stack; App Router + Route Handlers are the idiomatic home for the server-side LLM call and streaming. Recruiters recognize it. (16.x exists but is out of scope.) |
| React | `19.3.1` | UI runtime | Required pairing for Next 15 (Next 15 ships against React 19). |
| React DOM | `19.3.1` | DOM renderer | Matches React. |
| TypeScript | `5.9.3` | Type safety | Stable, fully supported by Next 15 toolchain and all libraries below. **Do not jump to TS 7.x yet** (see "What NOT to Use"). |
| Tailwind CSS | `4.3.3` | Styling (host app + generated components) | v4 is current. CSS-first config (`@import "tailwindcss"`), no `tailwind.config.js` required, Oxide engine. shadcn/ui now targets v4. |
| @tailwindcss/postcss | `4.3.3` | Tailwind v4 PostCSS plugin | v4 moved the PostCSS integration into this dedicated package — this is the required wiring for Next.js. |
| Vercel AI SDK (`ai`) | `7.0.141` | `streamText`, streaming primitives | First-class token streaming, provider-agnostic, built by Vercel for exactly this Route-Handler-streaming use case. |
| @ai-sdk/google | `4.0.96` | Google Gemini provider for the AI SDK | Direct Gemini access via `GOOGLE_GENERATIVE_AI_API_KEY`; the `latest` tag is the v7-compatible line (see Version Compatibility). |
| @codesandbox/sandpack-react | `2.20.0` | Secure sandboxed live preview + code editor | Runs untrusted generated code inside an isolated iframe (never the host context). Ships bundler, CodeMirror editor, and preview as one package — exactly the generate→preview loop. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @ai-sdk/react | `4.0.144` | Client hooks (`useChat`, `useCompletion`) | Optional. Only if you prefer a hook over a hand-rolled `fetch`+reader. For single-shot code gen a plain fetch is simpler (see Gotchas). |
| zod | `4.6.7` | Schema validation | Validate the inbound request body in the Route Handler (`{ prompt }`), and any structured output. AI SDK v7 natively supports Zod 4. |
| shadcn (CLI) | `4.21.5` | Component scaffolding | `npx shadcn@latest init` / `add`. Generates accessible Radix-based components into your repo. Targets Tailwind v4 + React 19. |
| lucide-react | `1.57.0` | Icon set | Icons for the app shell (copy, download, theme toggle, etc.). shadcn's default icon library. |
| next-themes | `0.4.6` | Light/dark theme | Class-based theme switching with no flash; the standard for App Router dark mode. |
| motion | `14.2.0` | Animation (formerly `framer-motion`) | Streaming cursor, panel transitions, loading states. **Import from `motion/react`** — the library rebranded from `framer-motion`. |
| tailwind-merge | `3.7.0` | Class de-duplication | Pulled in by shadcn's `cn()` helper. |
| clsx | `2.1.1` | Conditional class names | Pulled in by shadcn's `cn()` helper. |
| class-variance-authority | `0.7.1` | Variant styling | Used by shadcn component variants. |
| tw-animate-css | `1.4.0` | Tailwind v4 animation utilities | shadcn v4 replacement for the deprecated `tailwindcss-animate`. |
| @tailwindcss/browser | `4.3.3` | Tailwind runtime for the **sandbox iframe** | Inject into the Sandpack preview so generated Tailwind classes actually render (see Gotchas). |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vitest `5.0.4` | Unit/component test runner | Vite-native, fast, Jest-compatible API. Use `environment: 'jsdom'`, `globals: true`. Pair with `@vitejs/plugin-react@6.1.2`. |
| @vitejs/plugin-react `6.1.2` | JSX/Fast-Refresh for Vitest | Required so Vitest can transform React components. |
| @testing-library/react `16.3.3` | Component testing | React 19 compatible. Pair with `@testing-library/jest-dom@7.0.1` matchers and `@testing-library/user-event`. |
| @testing-library/jest-dom `7.0.1` | DOM matchers | `toBeInTheDocument()` etc. Register via a Vitest setup file. |
| jsdom `30.1.2` | DOM environment for Vitest | Set as Vitest `environment`. |
| @playwright/test `1.64.1` | E2E testing | One happy-path e2e: type prompt → stream → preview renders. Run against `next build && next start` in CI. |
| ESLint (`eslint-config-next@15.5.28`) | Linting | Keep the Next-matched config version to avoid rule drift. |
| @types/react `19.3.0`, @types/node `26.6.5` | Types | Match the React 19 / Node runtime. |
| GitHub Actions | CI | Matrix: install → typecheck → lint → `vitest run` → `playwright test` → build. Use `actions/setup-node@v4` with Node 22. |
| Vercel | Hosting | Zero-config Next.js deploy; set `GOOGLE_GENERATIVE_AI_API_KEY` as an env var in project settings. |

**Runtime:** Node.js 22 LTS (Next 15.5 requires ≥18.18; AI SDK quickstart recommends Node 22+; Vercel's current default is Node 22).

## Installation

```bash
# Scaffold (choose App Router + TypeScript + Tailwind + ESLint when prompted)
npx create-next-app@15 uiforge

# Core AI + preview
npm install ai@7 @ai-sdk/google@4 zod@4 @codesandbox/sandpack-react@2

# UI / UX
npm install next-themes@0.4 lucide-react motion
# (shadcn adds: tailwind-merge, clsx, class-variance-authority, tw-animate-css)
npx shadcn@latest init

# Tailwind runtime that will be injected INTO the sandbox preview
npm install @tailwindcss/browser@4

# Optional: AI SDK React hooks (only if using useCompletion instead of raw fetch)
npm install @ai-sdk/react@4

# Dev / test
npm install -D vitest@5 @vitejs/plugin-react@6 jsdom@30 \
  @testing-library/react@16 @testing-library/jest-dom@7 @testing-library/user-event \
  @playwright/test@1
npx playwright install --with-deps chromium
```

## Integration Notes & Gotchas (the part that saves hours)

### 1. Vercel AI SDK — streaming code from a Route Handler (HIGH)
Keep the LLM call **server-side only** in a Route Handler. The AI SDK v7 `streamText` result exposes `textStream`, which is both an `AsyncIterable` and a `ReadableStream`, so you can return it directly:

```ts
// app/api/generate/route.ts
import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { z } from 'zod';

export const runtime = 'nodejs';   // safe default; edge also works
export const maxDuration = 30;      // allow longer streams on Vercel

const Body = z.object({ prompt: z.string().min(1).max(2000) });

export async function POST(req: Request) {
  const { prompt } = Body.parse(await req.json());

  const result = streamText({
    model: google('gemini-2.5-flash'),
    system: 'Return ONLY a single self-contained React + Tailwind component. No prose, no markdown fences.',
    prompt,
  });

  // textStream is a ReadableStream — return it as plain text (verified in v7 reference)
  return new Response(result.textStream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
```

- `result.toTextStreamResponse()` is a convenience that typically does the same thing; the raw `textStream` return above is the version-robust form I verified against the v7 reference. (MEDIUM on the exact convenience method name; HIGH on the `textStream`/`ReadableStream` approach.)
- **Do NOT use `useChat` here** — this is single-shot code generation, not a chat. Either read the stream with a plain fetch, or use `useCompletion` from `@ai-sdk/react`.

Client (no extra deps):

```ts
const res = await fetch('/api/generate', {
  method: 'POST',
  body: JSON.stringify({ prompt }),
});
const reader = res.body!.getReader();
const decoder = new TextDecoder();
let code = '';
for (;;) {
  const { done, value } = await reader.read();
  if (done) break;
  code += decoder.decode(value, { stream: true });
  setCode(code);          // token-by-token into the editor
}
```

### 2. Google Gemini model + key (HIGH on key/provider, MEDIUM on exact model)
- Env var is **`GOOGLE_GENERATIVE_AI_API_KEY`** (read automatically by `@ai-sdk/google`). Put it in `.env.local` and in Vercel project settings. Never expose it to the client.
- **Model:** `gemini-2.5-flash` is the recommended free-tier-friendly default (fast, cheap, documented). Fallbacks/lighter options: `gemini-2.5-flash-lite`, `gemini-2.0-flash`. Newer `gemini-3.5-flash` / `gemini-3-flash-preview` are also available via the provider but free-tier eligibility shifts over time — **verify the current free-tier model list in Google AI Studio before committing.** (MEDIUM: free-tier model availability is the single most volatile fact in this doc.)
- Documented fallback provider: `@ai-sdk/groq` (Llama models) — same `streamText` call, swap the model factory. Keep it behind an env flag.

### 3. Sandpack — making Tailwind render inside the sandbox (MEDIUM–HIGH)
Sandpack runs the generated component in its **own isolated iframe bundler** — your host app's Tailwind build does **not** reach it. To make generated Tailwind classes render, inject the Tailwind v4 browser runtime into the sandbox's `index.html` via the `files` prop:

```tsx
<Sandpack
  template="react-ts"
  files={{
    '/public/index.html': `<!doctype html><html><head>
      <script src="https://unpkg.com/@tailwindcss/browser@4"></script>
    </head><body><div id="root"></div></body></html>`,
    '/App.tsx': generatedCode,
  }}
  options={{ showTabs: true }}
/>
```

- Use `@tailwindcss/browser@4` (the v4 CDN/browser build), **not** the old v3 `https://cdn.tailwindcss.com` script. (This is the #1 integration gotcha.)
- Sandpack ships its own CodeMirror editor (`SandpackCodeEditor` / `SandpackPreview` when composing manually), so you don't need a separate editor like Monaco.
- Sandpack-react `2.20.0` declares a React `^16.8 || ^17 || ^18 || ^19` peer range → React 19 is supported.
- The iframe is the security boundary. **Never** `eval`/render generated code in the host app.

### 4. Tailwind v4 + shadcn/ui setup (HIGH)
- v4 is CSS-first: in `app/globals.css` use `@import "tailwindcss";` and define tokens with `@theme` — there is **no `tailwind.config.js`** by default.
- PostCSS config uses `@tailwindcss/postcss` (not the old `tailwindcss` + `autoprefixer` plugin pair).
- `npx shadcn@latest init` detects v4 and wires `components.json`, the `cn()` helper, and `tw-animate-css`. Do not hand-install `tailwindcss-animate` (deprecated for v4).

### 5. next-themes in App Router (HIGH)
Wrap the app in a `"use client"` `ThemeProvider` with `attribute="class"` and add `suppressHydrationWarning` to `<html>` to avoid the hydration mismatch warning.

### 6. motion vs framer-motion (HIGH)
Install `motion` and import from `motion/react` (e.g. `import { motion } from 'motion/react'`). `framer-motion` is the legacy package name for the same project.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Vercel AI SDK (`ai`) | Google `@google/genai` SDK directly | If you never need provider-swapping or the SDK's streaming helpers. AI SDK wins here for the Groq fallback + Route-Handler streaming ergonomics. |
| @ai-sdk/google (Gemini) | @ai-sdk/groq (Llama 3.x) | Fallback when Gemini free-tier quota is exhausted; already a documented project fallback. |
| @codesandbox/sandpack-react | `react-live`, raw `iframe srcdoc` | `react-live` for a tiny single-expression preview with no bundler; raw iframe only if you must minimize deps. Sandpack wins for multi-file, bundling, editor, and isolation. |
| Plain fetch stream reader | `useCompletion` (`@ai-sdk/react`) | Use `useCompletion` if you want built-in `isLoading`/`stop`/error state for free. Raw fetch keeps the dep surface smaller. |
| next-themes | hand-rolled theme context | Only if you want zero deps; next-themes handles FOUC + system preference for free. |
| Vitest | Jest | Jest only in a legacy project already standardized on it. For a 2026 Vite/RSC project, Vitest is the default. |
| Sandpack CodeMirror editor | Monaco Editor | Monaco if you need VS Code-grade editing/intellisense. Overkill for a read-mostly preview. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Next.js **Pages Router** | Legacy; no RSC/Route-Handler streaming story recruiters look for | App Router + Route Handlers |
| `framer-motion` package name | Renamed to `motion`; imports changed to `motion/react` | `motion` |
| Tailwind v3 config (`tailwind.config.js`, `tailwindcss` PostCSS plugin, `autoprefixer`) | v4 is CSS-first with `@tailwindcss/postcss` | Tailwind v4 + `@tailwindcss/postcss` |
| `tailwindcss-animate` | Deprecated for Tailwind v4 | `tw-animate-css` (shadcn v4 default) |
| v3 Tailwind Play CDN (`https://cdn.tailwindcss.com`) inside the sandbox | Won't drive v4 utilities | `@tailwindcss/browser@4` injected into the sandbox iframe |
| Legacy AI SDK v3/v4 APIs (`StreamingTextResponse`, `OpenAIStream`, `experimental_StreamData`) | Removed in v5+; training data still suggests them | v7 `streamText` + `textStream` / `toTextStreamResponse()` |
| Running generated code in the host app (`eval`, `new Function`, dangerouslySetInnerHTML) | Executes untrusted LLM output in your origin | Sandpack isolated iframe only |
| TypeScript 7.x | Brand-new native-port major; ecosystem/types (Next, @types/react) still target TS 5 | TypeScript 5.9.x |
| Exposing the Gemini key client-side / calling Google from the browser | Leaks the API key | Keep the call in a server Route Handler with the env var |
| State libs (Redux/Zustand) for v1 | No shared/persistent state in scope (no auth, no history) | React local state + the stream reader |

## Stack Patterns by Variant

**If free-tier Gemini quota becomes a problem during the demo:**
- Add `@ai-sdk/groq` and switch the model factory behind an env flag.
- Because the AI SDK abstracts the provider, only the one `model:` line changes.

**If you want richer editing (not just preview):**
- Use `SandpackProvider` + `SandpackCodeEditor` + `SandpackPreview` composed manually instead of the all-in-one `<Sandpack>`, giving you control over layout, tabs, and the console.

**If the single-component constraint relaxes later:**
- Sandpack already handles multiple files via the `files` map — multi-file generation is a natural extension, not a rewrite.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `next@15.5.28` | `react@19.3.1`, `react-dom@19.3.1`, `@types/react@19.3.0` | Next 15 is built against React 19. Keep React + types in lockstep. |
| `ai@7.0.141` | `@ai-sdk/google@4.0.96`, `@ai-sdk/react@4.0.144`, `zod@4.6.7` | The `latest` dist-tags of these provider/UI packages are the v7-aligned line. **Do not mix** an `ai@7` with an `ai-v5`/`ai-v6`-tagged provider build. |
| `tailwindcss@4.3.3` | `@tailwindcss/postcss@4.3.3`, `shadcn@4.21.5`, `tw-animate-css@1.4.0` | All v4-aware. shadcn CLI detects v4 automatically. |
| `@codesandbox/sandpack-react@2.20.0` | `react@19` | Peer range `^16.8 || ^17 || ^18 || ^19`; React 19 OK. |
| `vitest@5.0.4` | `@vitejs/plugin-react@6.1.2`, `jsdom@30.1.2`, `@testing-library/react@16.3.3`, `@testing-library/jest-dom@7.0.1` | Standard 2026 Vitest component-test matrix; RTL 16 is React 19 compatible. |
| `motion@14.2.0` | `react@19` | Import from `motion/react`. |

## Sources

- npm registry via `npm view <pkg> version dist-tags` (2026-10-15) — exact current versions for every package above (HIGH).
- https://ai-sdk.dev/docs/getting-started/nextjs-app-router — AI SDK v7 Route Handler + `streamText` + client wiring (HIGH).
- https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai — `@ai-sdk/google` provider, `GOOGLE_GENERATIVE_AI_API_KEY`, Gemini model list/capability table (HIGH on provider/key; MEDIUM on which models are free-tier eligible).
- https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text — confirmed `textStream` is an `AsyncIterableStream`/`ReadableStream` in v7 (HIGH).
- `.planning/PROJECT.md` — project constraints (Next 15, Gemini free tier, Sandpack isolation, no auth, Vercel).

---
*Stack research for: AI-powered React/Tailwind UI component generator (UIForge)*
*Researched: 2026-10-15*
