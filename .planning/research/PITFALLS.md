# Pitfalls Research

**Domain:** AI-powered React/Tailwind UI component generator ("v0 lite" — streaming codegen + live sandboxed preview)
**Researched:** 2026-10-15
**Confidence:** HIGH (core facts verified against Vercel, Gemini, Sandpack, and Vercel AI SDK official docs; a few UX/prompting items are MEDIUM — experience-based)

> Scope note: This is a no-auth portfolio demo on Vercel Hobby using Google Gemini (free tier) + Vercel AI SDK v5 + `@codesandbox/sandpack-react`. Pitfalls below are ordered by how likely they are to break the core generate→preview loop that the project lives or dies on.

## Critical Pitfalls

### Pitfall 1: Rendering LLM output as "code" without stripping markdown fences / prose

**What goes wrong:**
Gemini loves to wrap code in ```` ```tsx ```` fences and add a preamble ("Here's your component:") or a trailing explanation. If you pipe the raw stream straight into the Sandpack editor, the file starts with ` ```tsx ` and ends with ` ``` `, which is a syntax error, so the preview shows a red error for every single generation. Worse, during streaming you see *partial* fences (` `` ` then ` ```ts ` then ` ```tsx `) and partial prose, so naive mid-stream cleanup flickers or corrupts the code.

**Why it happens:**
Developers test with one "clean" response, see it work, and assume the model always returns bare code. It doesn't — fencing, language tags, and commentary are the *default* chat behavior, and they vary run to run.

**How to avoid:**
- Treat extraction as a dedicated, tested step — not an afterthought. Strip a leading ```` ```lang ```` fence and a trailing ```` ``` ```` fence; if no fence exists, use the raw text.
- Make extraction **streaming-safe and idempotent**: run the same normalizer on every accumulated chunk, and tolerate an unterminated trailing fence while streaming (only require the closing fence once `finish` fires).
- Prompt the model hard to return *only* code (see Pitfall 3) — but still parse defensively, because prompts are not a guarantee.
- Unit-test the extractor against fixtures: no fence, ```` ```tsx ````, ```` ```jsx ````, ```` ```react ````, leading prose, trailing prose, and a mid-stream partial fence.

**Warning signs:**
Preview errors on the first line (`Unexpected token`), backticks visible in the editor, flicker as tokens arrive, or "works sometimes" generations.

**Phase to address:**
The streaming + code-extraction phase (the phase that wires Gemini → stream → editor). This is foundational; everything downstream assumes clean code.

---

### Pitfall 2: Live preview breaks because SSR tries to render Sandpack on the server

**What goes wrong:**
`@codesandbox/sandpack-react` is a browser-only, CSS-in-JS (stitches) component. Importing it into a Server Component (the App Router default) throws build/runtime errors like `createContext is not a function`, `Cannot read properties of null (reading 'useState')`, or `window is not defined`. The app either won't build or crashes the moment the preview mounts.

**Why it happens:**
Next.js 15 App Router renders on the server by default. Developers drop `<Sandpack />` into a page/component without marking it client-only, and it tries to prerender server-side.

**How to avoid:**
- Put Sandpack behind a `"use client"` wrapper component, and load that wrapper with `next/dynamic` + `{ ssr: false }` from *another client component* (`ssr: false` is not allowed in a Server Component).
- Pin `@codesandbox/sandpack-react` to **>= 2.15.0**, which ships the required `"use client"` directive (older versions need a `patch-package` hack).
- To avoid a flash of unstyled Sandpack, inject its CSS via `getSandpackCssText()` inside `useServerInsertedHTML` (official App Router SSR guide pattern).

**Warning signs:**
`createContext is not a function`, `window is not defined` at build time, hydration mismatch warnings, or a preview that works in `next dev` but white-screens on Vercel.

**Phase to address:**
The live-preview / Sandpack integration phase. Lock in the client-only wrapper pattern before layering features on top.

---

### Pitfall 3: Generated component doesn't actually run in Sandpack (forbidden imports, no default export)

**What goes wrong:**
The model returns "valid React" that still won't render in the Sandpack `react`/`react-ts` template: it imports `framer-motion`, `lucide-react`, `@/components/ui/button`, `next/image`, or `react-icons` (none installed); it uses a named export instead of a `default export`; it references `fetch`/external APIs; or it emits multiple components without a clear entry. Preview = module-not-found error, defeating the whole demo.

**Why it happens:**
LLMs default to "real-world" code with popular libraries and project-relative imports. The Sandpack sandbox is a minimal, dependency-free environment; the model doesn't know that unless you tell it and/or enforce it.

**How to avoid:**
- Put the constraints in the **system prompt explicitly**: single self-contained component; **default export**; **only** `react` (+ hooks) may be imported; **no external UI/icon/animation libraries**; **Tailwind utility classes only** (no CSS files, no styled-components); inline SVG instead of icon packs; no data fetching.
- Give the model a **one-shot example** of a correct, runnable component — few-shot beats instructions alone for format compliance.
- Add a lightweight **validation/guard pass** on the extracted code: detect disallowed `import` statements and the absence of a default export; surface a friendly "couldn't produce a runnable component, try rephrasing" instead of a raw stack trace.
- Optionally allow a curated dependency allow-list via Sandpack `customSetup.dependencies` if you *choose* to support (e.g.) `lucide-react` — but decide deliberately; don't let the model pick arbitrarily.

**Warning signs:**
Frequent `Module not found` / `Could not find module` in the preview, `default export` errors, or previews that only work for trivial prompts.

**Phase to address:**
The prompt-engineering phase (system prompt + few-shot) with a verification hook in the preview/validation phase.

---

### Pitfall 4: Tailwind classes have no effect inside the preview iframe

**What goes wrong:**
The generated component is full of `className="bg-indigo-600 ..."` but the preview renders unstyled. Your host app's Tailwind build does **not** reach inside the Sandpack iframe — the iframe is an isolated bundler (Parcel) with its own HTML. Also, external `<link>`/`<script>` placed in a Sandpack `index.html` are *not* passed through by the bundler, so the usual "just add the CDN tag" doesn't work.

**Why it happens:**
Developers assume Tailwind is global. In Sandpack, the preview is a separate runtime; it needs Tailwind injected into the iframe head specifically.

**How to avoid:**
- Inject Tailwind into the iframe via Sandpack's `options.externalResources`, e.g. `externalResources: ["https://cdn.tailwindcss.com"]` (Play CDN). This bypasses the bundler and lands in the iframe `<head>`.
- Know the tradeoff: the **Tailwind Play CDN is dev-only** and depends on a third-party network fetch at preview time (adds latency; offline = broken; also a tiny JIT compile cost in-iframe). For a portfolio demo that's acceptable; document it as a known limitation.
- Keep host-app Tailwind and preview Tailwind conceptually separate — don't expect your `tailwind.config` theme to apply inside the preview.

**Warning signs:**
Preview shows raw, unstyled HTML; styles work in your app's own UI but not inside the preview; classes like `sm:`/`dark:` do nothing in preview.

**Phase to address:**
The live-preview / Sandpack integration phase, alongside Pitfall 2.

---

### Pitfall 5: Streaming works locally but gets cut off / times out on Vercel

**What goes wrong:**
In `next dev` streaming is flawless; on Vercel, long generations get chopped mid-stream, the UI shows `Connection closed`, or logs show `FUNCTION_INVOCATION_TIMEOUT` (504). Also an Edge-runtime route must send its first byte within ~25s or streaming capability is lost.

**Why it happens:**
Each serverless function invocation has a max duration. Fluid Compute now defaults to 300s on all plans (including Hobby), which is generous — but if you set a *lower* `maxDuration`, or buffer the whole response instead of streaming, you can still hit the ceiling or starve the connection. Node vs Edge runtime behavior also differs.

**How to avoid:**
- Actually **stream** — return `result.toUIMessageStreamResponse()` (or `toTextStreamResponse()`) from `streamText`; don't `await` the full text and return it in one shot.
- Set an explicit route segment config, e.g. `export const maxDuration = 60;` (Hobby allows up to 300; values above 300 require Pro/Enterprise and will be rejected on Hobby).
- Start sending data promptly (the model's first tokens count as "response started"); avoid heavy pre-stream work.
- Prefer the Node.js runtime for the AI route unless you have a specific reason for Edge; if on Edge, remember the 25s first-byte rule.

**Warning signs:**
`Connection closed`, truncated code only on production, 504s in Vercel logs, long "thinking" with nothing streamed yet.

**Phase to address:**
The streaming phase (route handler config) and again at the deployment/CI phase (verify on a real Vercel URL, not just local).

---

### Pitfall 6: Executing untrusted generated code without a real sandbox boundary

**What goes wrong:**
The whole premise is running model-generated (i.e., untrusted) code. If that code ever executes in the host page's context — e.g., via `eval`, `new Function`, `dangerouslySetInnerHTML`, or a non-sandboxed iframe — generated code could read the DOM, hit your origin's cookies/storage, exfiltrate the API key path, or XSS your portfolio. Sandpack mitigates this *only if* used as intended (isolated iframe).

**Why it happens:**
Under time pressure people "temporarily" render code with `eval`/`Function` to get a preview faster, intending to swap in Sandpack later — and it ships.

**How to avoid:**
- **Never** evaluate generated code in the host context. Always render through Sandpack's iframe (which runs the bundle in an isolated frame).
- Keep the Gemini API key strictly **server-side** (route handler reads `process.env.GOOGLE_GENERATIVE_AI_API_KEY`); never expose it to the client or put it in a `NEXT_PUBLIC_` var. Generated code must never be able to reach the key.
- Rely on the iframe `sandbox` isolation; don't poke holes (e.g., don't give the preview same-origin + allow-scripts in a way that reaches your app).
- Treat *displayed* code as data too: when you echo generated code in your own (non-Sandpack) UI, render it as text in a `<pre>`/syntax highlighter, never as HTML.

**Warning signs:**
Any `eval(`, `new Function(`, or `dangerouslySetInnerHTML` touching model output; API key visible in client bundle/network tab; preview rendered inline instead of in an iframe.

**Phase to address:**
The live-preview phase (architecture decision) and a dedicated security review before deploy.

---

### Pitfall 7: Gemini free-tier rate/quota limits with no graceful handling

**What goes wrong:**
Gemini free tier is tight: `gemini-2.5-flash` ≈ **10 RPM / 250k TPM / 250 RPD**; `gemini-2.5-flash-lite` ≈ 15 RPM / 1,000 RPD; `gemini-2.0-flash` ≈ 15 RPM. A public portfolio link shared with recruiters (or a demo click-spam) blows past 10 RPM fast and returns **429**. Without handling, the UI just spins or shows a cryptic error — the exact worst impression during an interview.

**Why it happens:**
Developers test alone (well under limits) and never see 429. Free-tier numbers also shift and are now surfaced per-project in Google AI Studio rather than a fixed published table.

**How to avoid:**
- Handle **429 explicitly** with a friendly, specific message ("High demand right now — try again in a moment") and, ideally, a short client-side backoff/disable-submit.
- Pick the model deliberately: `gemini-2.5-flash-lite` or `gemini-2.0-flash` give more headroom (15 RPM, higher RPD) than `2.5-flash` if quality is acceptable; document the choice.
- Guard the request path: disable the submit button while a generation is in flight (prevents accidental RPM burn from double-clicks) and consider a tiny debounce.
- Keep the Groq fallback documented (PROJECT.md notes it) so the demo can switch providers if Gemini quota is exhausted on a big day.
- Verify current limits in Google AI Studio before relying on any number here — they change.

**Warning signs:**
`429`, `RESOURCE_EXHAUSTED`, generations failing only when multiple people use the link, daily failures after ~250 requests.

**Phase to address:**
The AI integration phase (error taxonomy + model choice) and the error-states/UX phase (friendly messaging).

---

### Pitfall 8: Hydration mismatch from theme (light/dark) + client-only widgets

**What goes wrong:**
Light/dark theming read from `localStorage`/`prefers-color-scheme` on the client produces different markup than the server render → React hydration mismatch warnings, a flash of the wrong theme (FOUC), and occasionally a broken first paint around the Sandpack wrapper.

**Why it happens:**
The server can't know the user's stored theme, so naive theme logic renders light on the server and dark on the client (or vice versa). Combined with `ssr: false` Sandpack, timing gets subtle.

**How to avoid:**
- Use an established approach: `next-themes` with `suppressHydrationWarning` on `<html>`, or a tiny inline pre-hydration script that sets the class before React mounts.
- Keep the Sandpack subtree client-only (already required by Pitfall 2) so theme-dependent preview chrome doesn't fight hydration.
- Gate any `window`/`localStorage` reads behind `useEffect`.

**Warning signs:**
`Hydration failed because the server rendered HTML didn't match the client`, a visible theme flash on load, console warnings on every refresh.

**Phase to address:**
The UI/theming phase (and reconfirmed in the polish/accessibility phase).

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Regex-only "grab everything between first and last fence" extractor | Fast to write | Breaks on no-fence output, nested backticks, mid-stream partials; silent corruption | MVP only, *with* unit-test fixtures (Pitfall 1) |
| Rendering preview via `eval`/`new Function` "for now" | Instant preview without wiring Sandpack | Security hole; near-impossible to retrofit safely; defeats the demo's selling point | **Never** |
| Hardcoding model name as a string literal in several files | Quick | Switching to flash-lite or the Groq fallback becomes a find-replace hunt | Acceptable if centralized in one config/env |
| Letting the model import any library and adding deps reactively | Fewer "module not found" today | Unbounded sandbox deps, slow/broken previews, unpredictable quality | Acceptable only with an explicit curated allow-list |
| Skipping the `maxDuration` export (rely on defaults) | Less config | Surprise truncation if defaults change or you move to Edge | Acceptable short-term; set it before deploy (Pitfall 5) |
| Tailwind Play CDN in the preview | Zero build setup, works instantly | Dev-only tool, network-dependent, not production-grade | Acceptable for a portfolio demo — document it |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Vercel AI SDK v5 (`streamText`) | Returning `await result.text` (buffers whole response) or using removed v4 helpers | Return `result.toUIMessageStreamResponse()` / `toTextStreamResponse()`; use `@ai-sdk/google` + `google('gemini-2.5-flash')` |
| Google Gemini key | Prefixing with `NEXT_PUBLIC_` or using it client-side | Server-only `GOOGLE_GENERATIVE_AI_API_KEY`; read in the route handler; add to Vercel env vars (not just `.env.local`) |
| Sandpack + Next 15 App Router | Importing `<Sandpack/>` in a Server Component | `"use client"` wrapper + `dynamic(..., { ssr: false })`; Sandpack >= 2.15.0 |
| Sandpack + Tailwind | Adding CDN `<script>` in `index.html` and expecting it to load | Use `options.externalResources: ["https://cdn.tailwindcss.com"]` (bundler strips index.html external tags) |
| Vercel deploy | Forgetting to set env vars in the Vercel dashboard | Configure `GOOGLE_GENERATIVE_AI_API_KEY` in Project Settings → Environment Variables for Production/Preview |
| Edge vs Node runtime | Choosing Edge for the AI route then hitting the 25s first-byte rule / lib incompatibility | Default to Node runtime for the AI route unless Edge is specifically required |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Re-mounting Sandpack / rebuilding the bundle on every streamed token | Preview flickers, CPU spikes, janky stream | Stream into the *editor* text; only (re)build the preview on stream `finish` (or debounced), not per chunk | Immediately, on any non-trivial component |
| No concurrency guard on submit | Multiple in-flight calls burn the 10 RPM budget → 429 | Disable submit while streaming; debounce example-prompt clicks | As soon as more than one user, or a double-click |
| Full React re-render of a huge code string each token | Typing/stream lag as code grows | Append to an accumulator and throttle editor state updates | Long components (a few hundred lines) |
| Tailwind Play CDN JIT compiling in-iframe on every preview | Slight delay before styles appear, network dependency | Accept for demo; or precompile a static Tailwind CSS for the iframe if you need speed | Noticeable under slow network / many previews |
| Relying on free-tier RPD (250) for a public link | Demo "dies" later in the day with 429s | Use higher-RPD model (flash-lite) + friendly error + Groq fallback | After ~250 requests/day on 2.5-flash |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Running generated code in the host page (`eval`/`Function`/inline) | Arbitrary code execution, DOM/cookie/key access, XSS on your portfolio | Execute only inside the Sandpack iframe; never in host context |
| Exposing the Gemini API key to the client | Key theft, quota abuse, surprise bill if upgraded to paid | Server-only env var; key never leaves the route handler |
| Rendering generated code as HTML in your own UI | Stored/reflected XSS via model output | Render code as *text* (syntax highlighter / `<pre>`), never `dangerouslySetInnerHTML` |
| No input length / size cap on prompts | Token/quota abuse, oversized requests, cost/timeout risk | Cap prompt length client+server; reject empty/oversized input |
| Trusting that "Sandpack is sandboxed" without checking iframe sandbox attrs | Weakened isolation if same-origin + allow-scripts is misconfigured | Keep default Sandpack isolation; don't grant the preview access to the host origin |
| Open, unauthenticated, un-throttled public endpoint | Anyone can drain your free quota or rack up cost if later on paid tier | Accept for a demo, but add basic client guards; document that no server rate-limiting exists (out of scope per PROJECT.md) |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No loading/streaming affordance | User thinks it's frozen during model latency | Show streaming tokens live + a visible "generating…" state; stream *into view* immediately |
| Raw error stack / blank preview on failure | Looks broken, kills recruiter impression | Friendly, specific error states (429, timeout, invalid-code) with a retry and an example prompt |
| Empty first screen with no guidance | User doesn't know what to type | Example-prompt gallery to seed generation (already a requirement) — make it one-click |
| Preview error shown with no code visibility | User can't tell if gen failed or code is wrong | Always show the (cleaned) code even when the preview errors, so the artifact is still usable/copyable |
| Copy/download that silently fails or copies fenced text | User pastes broken code elsewhere | Copy the *cleaned* code; confirm with a toast; download with a sensible `.tsx` filename |
| No focus management / keyboard support / aria on states | Inaccessible; fails the "polished" bar you're demonstrating | Manage focus on results, label controls, announce loading/error via `aria-live`, ensure responsive layout |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Code extraction:** Often missing partial-fence / no-fence handling — verify against fixtures incl. mid-stream chunks and prose-wrapped output.
- [ ] **Sandpack preview:** Often missing the `ssr:false` client-only wrapper — verify it builds and renders on a real Vercel deploy, not just `next dev`.
- [ ] **Tailwind in preview:** Often missing `externalResources` — verify utility classes actually style the iframe, including `sm:`/`dark:` variants.
- [ ] **Streaming on Vercel:** Often missing `maxDuration` + true streaming — verify a long generation doesn't truncate on production.
- [ ] **Rate limits:** Often missing 429 handling — verify the UI degrades gracefully when quota is hit (simulate by spamming).
- [ ] **API key:** Often missing in Vercel env (only in local `.env.local`) — verify production reads the key and it's not in the client bundle.
- [ ] **Generated-code validity:** Often missing default-export/forbidden-import guard — verify a broad set of prompts produce runnable components, not just the demo prompt.
- [ ] **Theme/hydration:** Often missing `suppressHydrationWarning`/pre-hydration script — verify no hydration warnings and no theme flash.
- [ ] **Accessibility:** Often missing `aria-live` on loading/error + focus management — verify keyboard-only and screen-reader flows.
- [ ] **Error-first testing:** Often only the happy path is tested — verify empty prompt, oversized prompt, model 429, and invalid-code preview all behave.

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Fenced/partial code shown in editor | LOW | Add/fix the normalizer + fixtures; re-run across sample prompts |
| Sandpack SSR crash | LOW–MEDIUM | Wrap in `"use client"` + `dynamic(ssr:false)`; bump to >= 2.15.0; add `getSandpackCssText` injection |
| Tailwind unstyled in preview | LOW | Add `options.externalResources: ["https://cdn.tailwindcss.com"]` |
| Streaming truncated on Vercel | LOW | Set `export const maxDuration`, ensure you return the stream response, pick Node runtime |
| `eval`-based preview shipped | HIGH | Re-architect preview onto Sandpack iframe; audit for key/DOM exposure; security review |
| 429 storms during a demo | MEDIUM | Switch model to flash-lite / Groq fallback; add backoff + submit lock; add friendly messaging |
| Model emits unrunnable code (bad imports) | MEDIUM | Strengthen system prompt + few-shot; add import/default-export guard with user-friendly fallback |
| Hydration/theme flash | LOW | Adopt `next-themes` + `suppressHydrationWarning` or inline pre-hydration script |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Markdown-fence / partial-token extraction (P1) | Streaming + code-extraction phase | Unit tests pass on fence/no-fence/prose/partial fixtures |
| Sandpack SSR crash (P2) | Live-preview integration phase | Builds + renders on a real Vercel deploy; no `createContext`/`window` errors |
| Unrunnable generated code (P3) | Prompt-engineering phase (+ validation hook) | Broad prompt set yields runnable, default-exported, dependency-free components |
| Tailwind not applied in iframe (P4) | Live-preview integration phase | Utility classes incl. `sm:`/`dark:` style the preview |
| Streaming truncation/timeout on Vercel (P5) | Streaming phase (+ deploy/CI phase) | Long generation streams fully on production; no 504/`Connection closed` |
| Untrusted code execution + key exposure (P6) | Live-preview phase (+ security review) | No `eval`/inline exec; key absent from client bundle; preview is iframe-isolated |
| Gemini free-tier rate limits (P7) | AI integration + error-states/UX phase | Simulated 429 shows friendly recoverable state; model/RPD choice documented |
| Hydration/theme flash (P8) | UI/theming phase (+ polish/a11y phase) | No hydration warnings; no theme FOUC; a11y states announced |

## Sources

- Vercel Functions limits & max duration (Hobby 300s default/max; `FUNCTION_INVOCATION_TIMEOUT`; Edge 25s first-byte): https://vercel.com/docs/functions/limitations , https://vercel.com/docs/functions/configuring-functions/duration , https://vercel.com/changelog/higher-defaults-and-limits-for-vercel-functions-running-fluid-compute — HIGH
- Vercel AI SDK v5: Gemini guide, Next.js App Router route handler, stream protocols, `streamText` reference, Vercel timeout troubleshooting (`maxDuration`): https://ai-sdk.dev/v5/cookbook/guides/gemini , https://ai-sdk.dev/v5/docs/getting-started/nextjs-app-router , https://ai-sdk.dev/v5/docs/ai-sdk-ui/stream-protocol , https://ai-sdk.dev/v5/docs/troubleshooting/timeout-on-vercel — HIGH
- Google Gemini API rate limits (free-tier RPM/TPM/RPD; limits now surfaced in AI Studio and subject to change): https://ai.google.dev/gemini-api/docs/rate-limits , https://ai.google.dev/gemini-api/docs/pricing — HIGH (exact free-tier numbers MEDIUM: Google no longer publishes a fixed table; verify in AI Studio)
- Sandpack SSR guide (App Router `"use client"`, `getSandpackCssText`, `useServerInsertedHTML`) + known issues (`createContext is not a function`, fix in 2.15.0): https://sandpack.codesandbox.io/docs/guides/ssr , https://github.com/codesandbox/sandpack/issues/1093 , https://github.com/codesandbox/sandpack/issues/1152 — HIGH
- Next.js lazy loading / `ssr:false` only in Client Components: https://nextjs.org/docs/app/guides/lazy-loading — HIGH
- Sandpack `externalResources` for Tailwind + bundler not passing index.html external tags: https://sandpack.vercel.app/docs/getting-started/usage , https://github.com/codesandbox/sandpack/pull/147 , https://github.com/codesandbox/sandpack/issues/624 — HIGH
- Tailwind Play CDN (development-only): https://tailwindcss.com/docs/installation/play-cdn — HIGH
- UX/prompting/accessibility pitfalls — practitioner experience with streaming LLM codegen apps ("v0 lite" category) — MEDIUM

---
*Pitfalls research for: AI-powered React/Tailwind UI component generator (UIForge)*
*Researched: 2026-10-15*
