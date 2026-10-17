# Phase 2: Sandboxed Live Preview - Research

**Researched:** 2026-10-15
**Domain:** Secure in-browser live preview of untrusted AI-generated React + Tailwind v4 via CodeSandbox Sandpack in Next.js 15 App Router
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

**CRITICAL:** If CONTEXT.md exists from /gsd-discuss-phase, copy locked decisions here verbatim. These MUST be honored by the planner.

### Locked Decisions
- Use `@codesandbox/sandpack-react` for preview + in-iframe bundler (iframe sandbox, never host execution)
- Load Tailwind in the sandbox via `externalResources` (`@tailwindcss/browser@4`) so v4 utilities including `sm:` / `dark:` work
- Render preview only after stream finish (or on a stable snapshot) — do not remount Sandpack on every token
- Dynamic import Sandpack with `ssr: false`; inject Sandpack CSS via `getSandpackCssText` / `useServerInsertedHTML` if needed
- Keep `GeneratorShell` as the only client orchestrator; add a `SandboxPreview` presentational wrapper
- Error state must be non-blank when the generated component throws

### Claude's Discretion
- Layout of preview vs code (side-by-side desktop, stacked/tabs mobile) can follow existing two-pane shell
- Exact Sandpack template/files (`App.js` wrapper that default-imports the generated component) is planner/executor choice

### Deferred Ideas (OUT OF SCOPE)
- Copy/download, example gallery, theme toggle polish — Phase 3
- Tests/CI/deploy — Phase 4
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PREV-01 | Generated component renders live inside a sandboxed Sandpack iframe (never in the host page) | Compose `SandpackProvider` + `SandpackPreview` (preview-only). Execute generated TSX only as a file inside the iframe bundler. Never `eval` / `new Function` / `dangerouslySetInnerHTML` of generated JSX. |
| PREV-02 | Tailwind styling applies correctly inside the preview | Inject Tailwind v4 Play CDN via `options.externalResources: ["https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.3.3"]`. Do **not** use the v3 Play CDN `https://cdn.tailwindcss.com`. Host Tailwind does not reach the iframe. |
| PREV-03 | Preview shows a clear error state when generated code fails to render | Keep `showSandpackErrorOverlay={true}` **and** surface `useErrorMessage()` in a host `role="alert"` so the panel is never a blank iframe. Optional pre-mount guard for missing `export default`. |
</phase_requirements>

## Project Constraints (from .cursor/rules/)

No `.cursor/rules/` directory exists in this workspace. Honor CONTEXT.md locked decisions and existing Phase 1 patterns (`GeneratorShell` as sole client orchestrator; generated code rendered as text tokens in `CodeView`).

<architectural_responsibility_map>
## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Snapshot parsed code on stream finish | Browser / Client (`GeneratorShell`) | — | `useCompletion` already lives here. Preview must receive a **stable** string, not the in-flight stream. |
| Sandpack iframe + bundler | Browser / Client (`SandboxPreview`) | CDN / Static (CodeSandbox hosted bundler) | Untrusted code evaluation belongs in an isolated iframe, never in the Next.js origin. |
| Sandpack chrome CSS (stitches) | Frontend Server (SSR injection) | Browser / Client | `getSandpackCssText` + `useServerInsertedHTML` in root layout so Sandpack chrome is not unstyled when the client-only preview mounts. |
| Tailwind utilities inside preview | CDN / Static (`@tailwindcss/browser` in iframe `<head>`) | Browser / Client (iframe DOM) | Host PostCSS Tailwind never crosses the iframe boundary. The Play CDN scans classes in the iframe document. |
| Compile / runtime error UI | Browser / Client (iframe overlay + host alert) | — | Bundler errors stay in Sandpack; host `role="alert"` satisfies PREV-03 / UI-SPEC accessibility. |
| Generated-code display | Browser / Client (`CodeView`) | — | Already Phase 1. Preview must not replace the editor. |
| LLM generation | API / Backend (`/api/generate`) | — | Out of this phase. Preview only consumes `parseCode(completion)` after `isLoading` flips false. |
</architectural_responsibility_map>

<research_summary>
## Summary

Phase 2 is a **client-only execution boundary**, not a new backend. Install `@codesandbox/sandpack-react@2.20.0` (current npm `latest`, published 2025-02-14; React 19 peer range includes this project's `react@^19.3.1`). Compose **preview-only** Sandpack (`SandpackProvider` + `SandpackPreview`) — do not use the all-in-one `<Sandpack>` preset, which also mounts a CodeMirror editor that would duplicate Phase 1 `CodeView`.

The `react-ts` template in **2.20.0** uses `/App.tsx` + `/index.tsx` (not `/src/App.tsx`). Put AI output in `/Component.tsx` and keep a tiny `/App.tsx` wrapper that default-imports it so the template entrypoint always has a default export named `App`. Inject Tailwind v4 with `externalResources` pointing at the official Play CDN (`@tailwindcss/browser@4.3.3` on jsDelivr). Do **not** put a `<script>` in `/public/index.html` as the primary mechanism — the Parcel bundler strips external tags from that file.

Mount Sandpack only after stream finish: keep streaming in `CodeView`, snapshot `parseCode(completion)` when `isLoading` becomes false, then pass that snapshot as `files`. For SSR: `next/dynamic(..., { ssr: false })` **must** live in `GeneratorShell` (already `'use client'`), never in `page.tsx`. `getSandpackCssText` is **still exported and still needed** in 2.20.0 — the package still depends on `@stitches/core`. Pair it with a host `role="alert"` driven by `useErrorMessage()` so PREV-03 cannot degrade to a blank iframe.

**Primary recommendation:** Add `@codesandbox/sandpack-react@2.20.0`. Snapshot parsed TSX on stream finish. Render it in a dynamically imported (`ssr: false`) `SandboxPreview` using `template="react-ts"`, `/Component.tsx` + `/App.tsx` wrapper, `externalResources` for `@tailwindcss/browser@4.3.3`, official `SandpackCss` injection in `layout.tsx`, and a non-blank error path (`ErrorOverlay` + host `role="alert"`).
</research_summary>

<standard_stack>
## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@codesandbox/sandpack-react` | **2.20.0** (npm `latest`; published 2025-02-14) | Preview chrome + iframe client | Locked decision. Peer: `react` / `react-dom` `^16.8 \|\| ^17 \|\| ^18 \|\| ^19`. Pulls `@codesandbox/sandpack-client@^2.19.8` automatically. Exports `getSandpackCssText`, `SandpackProvider`, `SandpackPreview`, `ErrorOverlay`, `useErrorMessage`. |
| `@codesandbox/sandpack-client` | 2.19.8 (transitive) | Bundler protocol / iframe client | Do **not** add as a direct dependency. Types (`SandpackError`) flow through sandpack-react. |
| `@tailwindcss/browser` | **4.3.3** (CDN, not a host install) | Tailwind v4 runtime inside the iframe | Official Play CDN. Host already uses `tailwindcss@4` via PostCSS; that CSS does not enter the iframe. |

### Already in the repo (do not re-install for this phase)

| Library | Installed | Role in Phase 2 |
|---------|-----------|-----------------|
| `next` | 15.5.28 | App Router, `next/dynamic`, `useServerInsertedHTML` |
| `react` / `react-dom` | ^19.3.1 | Host + Sandpack peer |
| `@ai-sdk/react` | ^4.0.145 | `useCompletion` — snapshot `completion` when `isLoading` is false |
| `prism-react-renderer` | ^2.4.1 | Existing `CodeView` (keep; do not replace with Sandpack editor) |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None extra | — | — | Do **not** add `@codesandbox/sandpack-themes` (built-in `theme="dark"` matches `defaultTheme="dark"`). Do **not** `npm install @tailwindcss/browser` in the host — CONTEXT locked CDN via `externalResources`. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Sandpack iframe | `react-live` | Lighter, but historically executed closer to the host; weaker TS/bundling story. Locked out. |
| Sandpack iframe | `eval` / `new Function` / Babel-in-page | Instant preview, **XSS on the portfolio origin**. Forbidden. |
| `externalResources` | `<script>` in `/public/index.html` | Bundler does **not** pass those tags through. Use only as optional export-to-CodeSandbox belt; live preview **must** use `externalResources`. |
| v4 `@tailwindcss/browser` | v3 `https://cdn.tailwindcss.com` | Official Sandpack docs still show the v3 URL. That will **not** compile v4 utilities (`size-*`, `@theme` colors, etc.) that Gemini is likely to emit. Locked out. |
| `<Sandpack>` preset | Composed Provider + Preview | Preset also mounts CodeMirror. Phase 1 already has `CodeView`. Compose preview-only. |
| `template="react"` (`/App.js`) | `template="react-ts"` (`/App.tsx`) | Generated output is TSX (system prompt). Use `react-ts`. |

**Installation:**

```bash
npm install @codesandbox/sandpack-react@2.20.0
```

**Version verification (2026-10-15):**

```text
npm view @codesandbox/sandpack-react version   → 2.20.0
npm view @codesandbox/sandpack-react peerDependencies
  { react: '^16.8.0 || ^17 || ^18 || ^19', react-dom: same }
npm view @codesandbox/sandpack-client version → 2.19.8
npm view @tailwindcss/browser version         → 4.3.3
```

`getSandpackCssText` is a public export of 2.20.0 (`export { getCssText as getSandpackCssText } from "./styles"`). `@stitches/core@^1.2.6` is still a runtime dependency — CSS-in-JS injection is **not** obsolete. [VERIFIED: npm registry + unpkg 2.20.0 `dist/index.d.ts`]
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### System Architecture Diagram

```
[User prompt] → GeneratorShell.useCompletion
                      │
                      ├─(tokens, isLoading=true)──► CodeView (text only; no Sandpack)
                      │
                      └─(isLoading false + parsed TSX)
                                │
                                ▼
                    snapshot previewCode (stable string)
                                │
          ┌─────────────────────┴─────────────────────┐
          │  next/dynamic SandboxPreview, ssr:false   │
          │  (NOT mounted during stream / empty)      │
          └─────────────────────┬─────────────────────┘
                                │
                                ▼
                  SandpackProvider (template=react-ts)
                    files: /Component.tsx = snapshot
                           /App.tsx = wrapper import
                    options.externalResources = Tailwind v4 browser
                                │
                    ┌───────────┴────────────┐
                    ▼                        ▼
            SandpackPreview iframe    PreviewErrorBanner
            (CodeSandbox bundler)     (useErrorMessage → role=alert)
                    │
                    ▼
            iframe <head> loads
            @tailwindcss/browser@4.3.3
                    │
          ┌─────────┴──────────┐
          │ success            │ compile/runtime error
          ▼                    ▼
     styled component     ErrorOverlay (iframe) + host alert
```

Layout (UI-SPEC, Claude's discretion — follow existing two-pane shell):

```
Desktop md+:  [ PromptForm | Preview (primary)
                           | CodeView (secondary) ]
Mobile:       Preview → CodeView → Prompt remains reachable
```

Empty: dashed placeholder *"O preview aparece aqui depois de gerar."*
Loading: skeleton *"Gerando preview…"* — **Sandpack not in the tree**.
Ready: iframe `min-h-64`, `aria-label="Live preview"`.

### Recommended Project Structure

```
src/
├── app/
│   ├── layout.tsx                 # add <SandpackCss /> (official App Router pattern)
│   └── page.tsx                   # stays RSC host of GeneratorShell — do NOT dynamic() here
├── components/
│   ├── generator/
│   │   ├── generator-shell.tsx    # snapshot previewCode on stream finish; dynamic import preview
│   │   ├── sandbox-preview.tsx    # 'use client' SandpackProvider + Preview + error banner
│   │   ├── preview-error.tsx      # useErrorMessage() → role="alert"
│   │   ├── code-view.tsx          # unchanged (text tokens)
│   │   └── prompt-form.tsx        # unchanged
│   └── sandpack/
│       └── sandpack-css.tsx       # getSandpackCssText + useServerInsertedHTML
└── lib/
    └── sandpack-files.ts          # pure: wrap generated TSX into react-ts files map
```

### Pattern 1: Client-only dynamic import (ssr: false) from GeneratorShell

**What:** `ssr: false` is **illegal in Server Components** on Next.js 15. `page.tsx` is an RSC. `GeneratorShell` is already `'use client'` — that is the only legal place for `next/dynamic(..., { ssr: false })`.
**When to use:** Always for Sandpack. Even 2.15.0+ ships `"use client"`; the bundler still needs `window` / iframe APIs. Skipping `ssr: false` risks `window is not defined` / `createContext is not a function` at build.

```tsx
// Source: https://nextjs.org/docs/app/guides/lazy-loading
// Must live in a Client Component (generator-shell.tsx), NEVER page.tsx
"use client";
import dynamic from "next/dynamic";

const SandboxPreview = dynamic(
  () =>
    import("@/components/generator/sandbox-preview").then(
      (m) => m.SandboxPreview,
    ),
  {
    ssr: false,
    loading: () => (
      <p className="text-sm text-muted-foreground">Gerando preview…</p>
    ),
  },
);
```

### Pattern 2: Wrap generated default-export TSX so react-ts can render it

**What:** 2.20.0 `react-ts` files are `/App.tsx`, `/index.tsx`, `/public/index.html`, `/styles.css`, `tsconfig.json`. `/index.tsx` default-imports `./App` and `createRoot`s it. Dumping a component named `PricingCard` into `/App.tsx` **does work** (default export is nameless at the import site), but a dedicated wrapper is the locked discretion and is more robust if the model emits `export default function App` **and** extra helpers, or if we want padding/chrome around the artifact.
**When to use:** Always. Keep generated source as `/Component.tsx` (`hidden: true`). `/App.tsx` only imports it.

```tsx
// Source: pattern aligned with Sandpack files API
// https://sandpack.codesandbox.io/docs/getting-started/usage
// Template paths verified from @codesandbox/sandpack-react@2.20.0 SANDBOX_TEMPLATES["react-ts"]

export const COMPONENT_PATH = "/Component.tsx";
export const APP_PATH = "/App.tsx";

export const APP_WRAPPER = `import Component from "./Component";

export default function App() {
  return (
    <div className="min-h-screen bg-white p-6 text-slate-900">
      <Component />
    </div>
  );
}
`;

export function buildSandpackFiles(code: string) {
  return {
    [COMPONENT_PATH]: { code, hidden: true },
    [APP_PATH]: { code: APP_WRAPPER, hidden: true },
  };
}
```

Do **not** use `/src/App.tsx` — that was the pre-unification `react-ts` layout and causes “nothing renders / duplicate App.tsx tabs” (sandpack issues #250 / #281, fixed by unifying to `/App.tsx`).

### Pattern 3: Tailwind v4 inside the iframe via externalResources

**What:** Official Sandpack “Static External Resources” injects URLs into the iframe `<head>`, bypassing Parcel. Official Tailwind v4 Play CDN is `@tailwindcss/browser` on jsDelivr — **not** `cdn.tailwindcss.com`.
**When to use:** Always for PREV-02. Pin **4.3.3** (matches host `tailwindcss@4` / npm latest).

```tsx
// Source: https://sandpack.codesandbox.io/docs/getting-started/usage#static-external-resources
// Tailwind URL: https://tailwindcss.com/docs/installation/play-cdn
const TAILWIND_BROWSER =
  "https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.3.3";

<SandpackProvider
  template="react-ts"
  theme="dark"
  files={buildSandpackFiles(code)}
  options={{
    externalResources: [TAILWIND_BROWSER],
    autorun: true,
    initMode: "immediate", // we only mount after stream finish — don't wait for lazy IO
    recompileMode: "delayed",
    classes: { "sp-wrapper": "h-full", "sp-layout": "h-full" },
  }}
>
```

`dark:` variants: Play CDN default is `prefers-color-scheme`. Host `next-themes` `class="dark"` does **not** leak into the iframe. That is acceptable for Phase 2 (theme polish is Phase 3). `sm:` / `md:` work because they are media queries in generated CSS.

### Pattern 4: Stream-finish snapshot (do not remount per token)

**What:** Mid-stream TSX is syntactically invalid. Feeding it to Sandpack thrashes the bundler and flashes ErrorOverlay on every token.
**When to use:** Always (locked).

```tsx
// GeneratorShell — snapshot, don't live-bind `parsed` into Sandpack
const parsed = useMemo(() => parseCode(completion), [completion]);
const [previewCode, setPreviewCode] = useState<string | null>(null);
const wasLoading = useRef(false);

useEffect(() => {
  if (isLoading) {
    wasLoading.current = true;
    return;
  }
  if (wasLoading.current) {
    wasLoading.current = false;
    setPreviewCode(parsed.trim() ? parsed : null);
  }
}, [isLoading, parsed]);
```

Mount rules:

| State | Sandpack in tree? | Panel UI |
|-------|-------------------|----------|
| `previewCode === null` && !isLoading | No | Empty dashed placeholder |
| `isLoading` | No | Skeleton / "Gerando preview…" |
| `previewCode` set && !isLoading | Yes | Iframe + error banner |

Use a `key={previewCode}` **or** incrementing generation id on the provider so a new generation gets a clean bundler, not a stale HMR of broken modules.

### Pattern 5: SSR CSS injection — still required on 2.20.0

**What:** Sandpack chrome (layout, overlay, buttons) is stitches CSS-in-JS. `next/dynamic ssr:false` skips server HTML for the preview **but** the first client paint can still be unstyled unless CSS is already in the document. Official App Router guide is unchanged and the export still exists.
**When to use:** Always. Put the official `SandPackCSS` helper in `layout.tsx`. This `dangerouslySetInnerHTML` is **library CSS**, not generated JSX — allowed.

```tsx
// Source: https://sandpack.codesandbox.io/docs/guides/ssr
"use client";

import { getSandpackCssText } from "@codesandbox/sandpack-react";
import { useServerInsertedHTML } from "next/navigation";

export function SandpackCss() {
  useServerInsertedHTML(() => (
    <style
      id="sandpack"
      dangerouslySetInnerHTML={{ __html: getSandpackCssText() }}
    />
  ));
  return null;
}
```

### Pattern 6: Non-blank error state (PREV-03)

**What:** `SandpackPreview` defaults `showSandpackErrorOverlay={true}` and renders `ErrorOverlay` (“Something went wrong” + message) via `useErrorMessage()`. UI-SPEC also requires a visible `role="alert"` **in the panel**. The overlay lives in Sandpack chrome (not guaranteed to expose `role="alert"` to the host a11y tree). Do both.
**When to use:** Always.

```tsx
// Source: https://sandpack.codesandbox.io/docs/advanced-usage/hooks (useSandpack / error)
// useErrorMessage exported from @codesandbox/sandpack-react@2.20.0
"use client";
import { useErrorMessage } from "@codesandbox/sandpack-react";

export function PreviewErrorBanner() {
  const message = useErrorMessage();
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </p>
  );
}
```

Keep `showSandpackErrorOverlay={true}` (default). Set `showOpenInCodeSandbox={false}` — UI-SPEC is a preview panel, not an export affordance (export is Phase 3).

Optional pre-mount guard (recommended, cheap): if snapshot has no `export default`, show the host alert *"O código gerado não exporta um componente padrão."* and still skip or still mount — mounting will produce a bundler error either way. Prefer showing the Portuguese alert **and** mounting so ErrorOverlay is not blank.

A **host** React error boundary around `SandboxPreview` is optional extra defense for Sandpack chrome crashes; it cannot catch errors **inside** the iframe. Do not treat a host ErrorBoundary as sufficient for PREV-03.

### Anti-Patterns to Avoid

- **`eval` / `new Function` / `dangerouslySetInnerHTML` of generated JSX:** Executes untrusted LLM output on the portfolio origin. Forbidden. (CSS injection of `getSandpackCssText()` is the sole allowed `dangerouslySetInnerHTML`.)
- **Passing `parsed` into Sandpack while `isLoading`:** Bundler error storm; jank. Snapshot on finish only.
- **`<Sandpack>` preset:** Duplicate editor vs `CodeView`; extra CodeMirror JS.
- **`next/dynamic ssr:false` in `page.tsx`:** Next 15 build error. Move into `GeneratorShell`.
- **v3 Tailwind Play CDN inside the iframe:** Will not style v4-class output.
- **Relying on `/public/index.html` `<script>` for Tailwind:** Parcel strips it; preview stays unstyled (sandpack#624 / #640).
- **Overwriting `/index.tsx` or changing `customSetup.entry`:** Template entry must remain the file that `createRoot`s `App`.
- **`showSandpackErrorOverlay={false}` without a replacement:** Blank iframe — PREV-03 fail.
- **Installing sandbox deps reactively** (`lucide-react`, `framer-motion`): System prompt forbids those imports. Do not paper over them with `customSetup.dependencies` in v1.
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| In-browser TSX bundling | Babel + iframe `srcdoc` + custom HMR | `@codesandbox/sandpack-react` | Module graph, React Refresh, error protocol, iframe isolation already solved |
| Untrusted code execution | `eval` / `new Function` / `React.createElement` from parsed AST | Sandpack iframe only | XSS / cookie / origin access |
| Tailwind-in-iframe | Copying `globals.css` into Sandpack files | `externalResources` + `@tailwindcss/browser@4.3.3` | Host CSS is a built subset; generated class names are unknown at host build time |
| Preview error UI | Custom postMessage error bus | `ErrorOverlay` + `useErrorMessage()` | Bundler already forwards compile/runtime errors |
| Sandpack chrome CSS | Copying stitches output by hand | `getSandpackCssText()` | Official SSR API; still current in 2.20.0 |
| Syntax highlighting of generated code | Sandpack `SandpackCodeEditor` | Existing `CodeView` | Phase 1 already ships prism-react-renderer; dual editors fight layout |

**Key insight:** The hard problems in this phase are **isolation**, **incomplete-stream TSX**, and **Tailwind not being global**. Sandpack + snapshot-on-finish + Play CDN are the standard answers. A custom iframe is a security and bundler project, not a Phase 2 task.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Mounting Sandpack on every streamed token
**What goes wrong:** Preview flashes red errors; CPU spikes; iframe reloads.
**Why it happens:** `files={{ "/App.tsx": parsed }}` re-renders with incomplete TSX.
**How to avoid:** Snapshot `parsed` only when `isLoading` transitions to false. Do not put Sandpack in the tree during loading/empty.
**Warning signs:** ErrorOverlay flickering while tokens arrive in `CodeView`.

### Pitfall 2: SSR / App Router crash
**What goes wrong:** `createContext is not a function`, `window is not defined`, build fails on Vercel.
**Why it happens:** Sandpack imported from an RSC, or `ssr: false` used in `page.tsx`. Fixed `"use client"` directive landed in **2.15.0**; still combine with `ssr: false` from a Client Component.
**How to avoid:** Pin `>= 2.15.0` (use 2.20.0). Dynamic import from `GeneratorShell`. Inject CSS via `SandpackCss`.
**Warning signs:** Works in `next dev`, white-screen or failed `next build`.

### Pitfall 3: Unstyled preview (wrong Tailwind injection)
**What goes wrong:** Buttons/spacing/colors missing inside the iframe.
**Why it happens:** Host Tailwind is a different document. `index.html` scripts are stripped. v3 CDN does not emit v4 utilities.
**How to avoid:** `externalResources` + jsDelivr `@tailwindcss/browser@4.3.3`. Verify a `bg-indigo-600` button is visibly indigo.
**Warning signs:** Unstyled HTML; classes in `CodeView` but not in preview.

### Pitfall 4: Wrong react-ts file path
**What goes wrong:** Default “Hello world” template renders, or a blank preview.
**Why it happens:** Older docs/issues used `/src/App.tsx`. 2.20.0 template main file is `/App.tsx`.
**How to avoid:** Override `/App.tsx` and `/Component.tsx` only. Do not set `customSetup.entry` away from `/index.tsx`.
**Warning signs:** Two `App.tsx` tabs; preview ignores generated code.

### Pitfall 5: Blank error (PREV-03 miss)
**What goes wrong:** Broken generation shows an empty iframe.
**Why it happens:** Overlay disabled, or error stays inside iframe without a host alert.
**How to avoid:** Leave overlay on; render `PreviewErrorBanner` with `role="alert"` using `useErrorMessage()`.
**Warning signs:** White/empty preview when `CodeView` clearly has invalid TSX.

### Pitfall 6: Missing default export / forbidden imports
**What goes wrong:** `Module not found` / `does not contain a default export`.
**Why it happens:** Model ignores the system prompt (already requires default export + `react` only).
**How to avoid:** Wrapper import makes the *entry* always default-export `App`. If `/Component.tsx` has no default export, show the Portuguese alert. Do not add extra sandbox dependencies in this phase.
**Warning signs:** Frequent module-not-found on non-trivial prompts.

### Pitfall 7: Host theme vs iframe theme
**What goes wrong:** Recruiter toggles (Phase 3) host dark mode; preview still follows OS `prefers-color-scheme`.
**Why it happens:** Separate documents. Not a Phase 2 blocker (theme polish deferred).
**How to avoid:** Document it. Use `theme="dark"` for Sandpack chrome to match `defaultTheme="dark"`. Do not try to pipe `next-themes` class into the iframe this phase.
**Warning signs:** Sandpack chrome light while host is dark.

### Pitfall 8: Confusing CSS injection with “executing generated HTML”
**What goes wrong:** Reviewer flags `dangerouslySetInnerHTML` in `SandpackCss`.
**Why it happens:** Same API, different payload.
**How to avoid:** Only inject `getSandpackCssText()` (known stitches CSS). Never inject `completion` / `parsed` as HTML.
**Warning signs:** Any `dangerouslySetInnerHTML={{ __html: parsed }}`.
</common_pitfalls>

<code_examples>
## Code Examples

Verified patterns from official sources:

### Compose preview-only Sandpack (no editor)

```tsx
// Source: https://sandpack.codesandbox.io/docs/advanced-usage/components
"use client";

import {
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
} from "@codesandbox/sandpack-react";
import { PreviewErrorBanner } from "@/components/generator/preview-error";
import { buildSandpackFiles } from "@/lib/sandpack-files";

const TAILWIND_BROWSER =
  "https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.3.3";

export function SandboxPreview({ code }: { code: string }) {
  return (
    <section
      aria-label="Live preview"
      className="flex min-h-64 flex-col rounded-xl border border-border bg-card p-4"
    >
      <h2 className="mb-2 text-sm font-medium text-muted-foreground">
        Preview
      </h2>
      <SandpackProvider
        key={code}
        template="react-ts"
        theme="dark"
        files={buildSandpackFiles(code)}
        options={{
          externalResources: [TAILWIND_BROWSER],
          autorun: true,
          initMode: "immediate",
          recompileMode: "delayed",
        }}
      >
        <PreviewErrorBanner />
        <SandpackLayout className="min-h-64 flex-1">
          <SandpackPreview
            showOpenInCodeSandbox={false}
            showSandpackErrorOverlay
            showNavigator={false}
          />
        </SandpackLayout>
      </SandpackProvider>
    </section>
  );
}
```

`SandpackLayout` with a **single** child still applies theme tokens and min-height. If the two-column layout fights the panel, wrap `SandpackPreview` in a `div` with `min-h-64` instead — preview will still bundle because **Preview is what starts the bundler**. [CITED: sandpack.codesandbox.io/docs/advanced-usage/components]

### Official App Router CSS injection in layout

```tsx
// Source: https://sandpack.codesandbox.io/docs/guides/ssr
// app/layout.tsx — add next to existing ThemeProvider tree
import { SandpackCss } from "@/components/sandpack/sandpack-css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <SandpackCss />
      </head>
      <body>{/* existing ThemeProvider + children */}</body>
    </html>
  );
}
```

### GeneratorShell mount gate (illustrative)

```tsx
// Not from Sandpack docs — Phase 1 shell + UI-SPEC states
{isLoading ? (
  <div className="min-h-64 rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
    Gerando preview…
  </div>
) : previewCode ? (
  <SandboxPreview code={previewCode} />
) : (
  <div className="min-h-64 rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
    O preview aparece aqui depois de gerar.
  </div>
)}
```

Keep `CodeView` always showing `parsed` (including mid-stream). Preview is the only gated surface.
</code_examples>

<sota_updates>
## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tailwind v3 Play CDN `https://cdn.tailwindcss.com` (still in Sandpack usage docs example) | `@tailwindcss/browser` on jsDelivr | Tailwind v4 Play CDN | Phase 2 **must** use the v4 URL or generated v4 classes will not style |
| `react-ts` files under `/src/App.tsx` | `/App.tsx` + `/index.tsx` at sandbox root | sandpack PR #268 (template unification) | Override `/App.tsx`, not `/src/App.tsx` |
| Manual `'use client'` patch / `patch-package` | `"use client"` shipped in dist | sandpack-react **2.15.0** | Still combine with `next/dynamic ssr:false` |
| All-in-one `<Sandpack>` for editor+preview | Composed Provider + Preview when a host editor exists | Always available | Matches Phase 1 `CodeView` |
| Execute AI JSX with `react-live` / `eval` | Isolated Sandpack iframe | Current security baseline | Locked |

**Deprecated/outdated:**

- **v3 Tailwind Play CDN in this project:** Replaced by `@tailwindcss/browser@4`. Sandpack's own usage page still demos the v3 URL — ignore that example for UIForge.
- **Putting CDN tags only in `/public/index.html`:** Known-not-to-work for live preview (bundler strips tags).
- **sandpack-react &lt; 2.15.0:** Missing `"use client"`; App Router broken without a patch.

**Still current (do not skip):**

- `getSandpackCssText` + `useServerInsertedHTML` — stitches still in 2.20.0. [VERIFIED: npm deps + unpkg types]
</sota_updates>

<assumptions_log>
## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Pinning jsDelivr `@4.3.3` (vs floating `@4`) is the right CDN URL shape | Standard Stack / Pattern 3 | If jsDelivr path 404s, preview is unstyled — executor can fall back to `https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4` (official docs URL). |
| A2 | `prefers-color-scheme` is enough for PREV-02 `dark:` variants in Phase 2 | Pattern 3 | Class-based `dark:` (matching `next-themes`) will not apply inside the iframe until Phase 3. Responsive `sm:` is unaffected. |
| A3 | `/Component.tsx` + `/App.tsx` wrapper is preferable to dumping code into `/App.tsx` | Pattern 2 | Discretion area. Dumping into `/App.tsx` also works if the model always default-exports. Wrapper is safer. |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.
</assumptions_log>

<open_questions>
## Open Questions

1. **Should iframe `dark:` follow host `next-themes`?**
   - What we know: Separate documents; Play CDN defaults to `prefers-color-scheme`. Theme toggle is Phase 3.
   - What's unclear: Whether recruiters will judge preview vs host theme mismatch in Phase 2.
   - Recommendation: Do **not** solve in Phase 2. Use Sandpack `theme="dark"` for chrome. Document the iframe/host split.

2. **Self-host `@tailwindcss/browser` vs CDN?**
   - What we know: CONTEXT locked `externalResources`. Official install is the jsDelivr script. Offline / blocked CDN = unstyled preview.
   - What's unclear: Recruiter networks blocking jsDelivr.
   - Recommendation: Follow the lock (CDN). If preview is unstyled in verification, first check Network for the script; only then consider copying the file into `public/`.

3. **Pre-check `export default` vs rely on Sandpack?**
   - What we know: System prompt already requires default export; models still leak named-only exports (PITFALLS P3).
   - What's unclear: False positives on unusual export syntax (`export { Foo as default }`).
   - Recommendation: Lightweight `/export\s+default/` test for the Portuguese alert; still mount Sandpack so overlay is not blank.
</open_questions>

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next 15 build | ✓ | v24.21.0 (project targets 22 LTS; ≥18.18 OK) | — |
| npm | Install sandpack-react | ✓ | 11.19.0 | — |
| `@codesandbox/sandpack-react` | Preview | ✗ (not in package.json yet) | add 2.20.0 | **Blocking** — `npm install` in Wave 0 / first plan |
| CodeSandbox hosted bundler (browser network) | Iframe compile | runtime-only | — | None — preview cannot work fully offline |
| jsDelivr `@tailwindcss/browser@4.3.3` | PREV-02 | runtime-only | 4.3.3 | Official unpinned `@4` URL; do not fall back to v3 CDN |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Live generate→preview demo | workspace-dependent | — | Phase 1 already fail-fast 500; preview can still be verified with a **fixture TSX string** without a key |

**Missing dependencies with no fallback:**

- `@codesandbox/sandpack-react` must be installed before implementation.
- Browser must reach the CodeSandbox bundler origin and jsDelivr for a styled live preview.

**Missing dependencies with fallback:**

- Gemini key: not required to unit-test `buildSandpackFiles` or to mount Sandpack with a hardcoded sample component.

## Security Domain

> `security_enforcement` is not set to `false` in `.planning/config.json` (absent = enabled).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth in v1 |
| V3 Session Management | no | Stateless demo |
| V4 Access Control | no | No user roles |
| V5 Input Validation | yes | Prompt already Zod-validated in `/api/generate`. Treat generated code as **untrusted data** in the host (text in `CodeView` only). |
| V6 Cryptography | no | No new crypto |

### Known Threat Patterns for Sandpack + LLM codegen

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via generated JSX in host origin | Tampering / Elevation | Execute **only** in Sandpack iframe. Ban `eval`, `new Function`, `dangerouslySetInnerHTML` of `parsed`/`completion`. |
| Generated code reading host cookies / `localStorage` | Information disclosure | Iframe origin isolation (Sandpack default). Do not weaken sandbox flags. |
| API key exfiltration from generated code | Information disclosure | Key remains server-only (`GOOGLE_GENERATIVE_AI_API_KEY`). Generated code never runs on the host and cannot read server env. |
| CSS injection vs HTML injection confusion | Tampering | Only `getSandpackCssText()` may use `dangerouslySetInnerHTML`. |
| Supply-chain / CDN script in iframe | Tampering | Pin `@tailwindcss/browser@4.3.3` on jsDelivr; do not load arbitrary model-supplied URLs as `externalResources`. |
| Open generate endpoint abuse | Denial of service | Out of scope (Phase 3/v2). Do not add rate limiting here. |

**Verification grep (planner must include):** no `eval(`, `new Function(`, or `dangerouslySetInnerHTML` whose HTML is generated code.

<sources>
## Sources

### Primary (HIGH confidence)
- npm registry `npm view @codesandbox/sandpack-react@2.20.0` — version, time (2025-02-14), peerDeps React 19, dependency `@stitches/core`, transitive `sandpack-client@2.19.8` [VERIFIED: npm registry]
- unpkg `@codesandbox/sandpack-react@2.20.0/dist/index.d.ts` — `getSandpackCssText` still exported; `SANDBOX_TEMPLATES["react-ts"]` files `/App.tsx`, `/index.tsx` [VERIFIED: unpkg]
- https://sandpack.codesandbox.io/docs/guides/ssr — App Router `useServerInsertedHTML` + `id="sandpack"` [CITED]
- https://sandpack.codesandbox.io/docs/getting-started/usage — `files`, `template`, `externalResources` [CITED]
- https://sandpack.codesandbox.io/docs/advanced-usage/components — `SandpackPreview` starts the bundler; `showSandpackErrorOverlay` [CITED]
- https://sandpack.codesandbox.io/docs/advanced-usage/hooks — `useSandpack().error`; compose custom chrome [CITED]
- https://tailwindcss.com/docs/installation/play-cdn — official v4 script `https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4` [CITED]
- https://nextjs.org/docs/app/guides/lazy-loading — `ssr: false` **only** in Client Components [CITED]
- GitHub codesandbox/sandpack#1152 — `"use client"` fix in 2.15.0 [CITED]
- GitHub ErrorOverlay.tsx (main) — overlay copy “Something went wrong”; uses `useErrorMessage()` [CITED]
- Existing repo: `generator-shell.tsx`, `02-CONTEXT.md`, `02-UI-SPEC.md`, `package.json` [VERIFIED: codebase]

### Secondary (MEDIUM confidence)
- GitHub sandpack#624 / #640 — `index.html` tags stripped; `externalResources` is the live-preview path [CITED: GitHub issues; matches official usage docs]
- GitHub sandpack#250 / #281 / PR #268 — `react-ts` path unification to `/App.tsx` [CITED]
- unpkg Play CDN vs jsDelivr reliability (tailwindcss discussion #17216) — prefer jsDelivr [CITED]
- Tesslate Builder-Lite — industry pattern: generated `Component.tsx` rendered by `App.tsx` wrapper + Tailwind v4 CDN [CITED: GitHub README]

### Tertiary (LOW confidence - needs validation)
- Whether class-based `dark:` can be enabled in-iframe without `type="text/tailwindcss"` (sandpack#974) — not required for Phase 2 if `prefers-color-scheme` is accepted [ASSUMED for Phase 3]
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: `@codesandbox/sandpack-react` 2.20.0 in Next.js 15 App Router
- Ecosystem: Tailwind v4 Play CDN (`@tailwindcss/browser`), stitches SSR CSS, existing `useCompletion` shell
- Patterns: snapshot-on-finish, `/Component.tsx` wrapper, preview-only composition, host+overlay errors
- Pitfalls: per-token remount, v3 CDN, RSC `ssr:false`, blank iframe, wrong template paths

**Confidence breakdown:**
- Standard stack: HIGH — npm versions + unpkg exports verified 2026-10-15
- Architecture: HIGH — official Sandpack + Next.js docs; template paths verified in 2.20.0 types
- Pitfalls: HIGH — official issues (#1152, #624, #250) + project PITFALLS.md cross-check
- Code examples: HIGH for SSR/dynamic/externalResources (official); MEDIUM for the exact `/Component.tsx` wrapper (discretion, Tesslate-aligned)

**Research date:** 2026-10-15
**Valid until:** 2026-11-14 (30 days — sandpack-react 2.x is slow-moving; Tailwind CDN URL is the volatile bit)

**Nyquist validation:** skipped — `.planning/config.json` has `workflow.nyquist_validation: false`.
</metadata>

---

*Phase: 02-sandboxed-live-preview*
*Research completed: 2026-10-15*
*Ready for planning: yes*
