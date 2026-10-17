# Phase 3: Export, Examples & Accessible UX - Pattern Map

**Mapped:** 2026-10-15
**Files analyzed:** 14 (5 new, 9 modified)
**Analogs found:** 13 / 14 (only the fullStream peek in the route has no in-repo analog)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/example-prompts.ts` (new) | utility (static data) | transform | `src/lib/sandpack-files.ts` (const exports) | role-match |
| `src/lib/download-filename.ts` (new) | utility | transform | `src/lib/parse-code.ts` + `hasDefaultExport` in `src/lib/sandpack-files.ts:58-60` | exact |
| `src/lib/generate-error.ts` (new) | utility | transform | `src/lib/parse-code.ts` | role-match |
| `src/components/theme/theme-toggle.tsx` (new) | component (client) | event-driven | `src/components/theme/theme-provider.tsx` + `src/components/ui/button.tsx` | role-match |
| `src/components/generator/prompt-form.tsx` (mod) | component | request-response | itself | exact |
| `src/components/generator/code-view.tsx` (mod) | component | event-driven | itself | exact |
| `src/components/generator/generator-shell.tsx` (mod) | component (orchestrator) | streaming | itself | exact |
| `src/components/generator/sandbox-preview.tsx` (mod) | component | event-driven | itself | exact |
| `src/lib/preview-srcdoc.ts` (mod) | utility | transform | itself | exact |
| `src/app/api/generate/route.ts` (mod) | route | streaming | itself (plus AI SDK `fullStream`) | partial |
| `src/app/layout.tsx` (mod) | config | n/a | itself | exact |
| `src/app/page.tsx` (mod) | component (server) | n/a | itself | exact |
| `src/components/generator/prompt-form.test.tsx` (keep green) | test | n/a | itself | exact |
| `src/lib/preview-srcdoc.test.ts` (keep green) | test | n/a | itself | exact |

Suggested plan order (RESEARCH, serial): 03-01 = example-prompts, chips, download-filename, Copiar/Baixar. 03-02 = layout, theme-toggle, nightOwlLight, tabs, iframe color-scheme. 03-03 = generate-error, route peek, alert+retry, aria-live.

## Pattern Assignments

### `src/components/generator/prompt-form.tsx` (component, chips under textarea)

**Analog:** itself (lines 1-78). Chips go between `<Textarea>` (line 52-60) and the buttons row (line 61).

**Imports already present** (lines 3-6): `Button, buttonVariants` from `@/components/ui/button`, `cn` from `@/lib/utils`. Add `useState`, `EXAMPLE_PROMPTS`.

**Existing props to keep optional-compatible** (lines 8-14). The test harness (`prompt-form.test.tsx:16-22`) passes only `value/onChange/onSubmit/onStop/isLoading`, so any new prop must be optional.

**Raw button + buttonVariants pattern already used** (lines 62-68):
```tsx
<button type="submit" disabled={!canSubmit} className={cn(buttonVariants())}>
  Gerar
</button>
```
Chip: copy this form but `type="button"` (mandatory: inside the `<form>`), `buttonVariants({ variant: "outline", size: "sm" })`, `disabled={isLoading}`, `aria-pressed`, `title`, `aria-label`. Container `mt-3 flex flex-wrap gap-2`. Selected state: add `bg-primary text-primary-foreground` via `cn`.

**Selection clearing:** keep `selectedId` state in `PromptForm`. Clear when `value !== example.prompt` (derive: `selected = EXAMPLE_PROMPTS.find(e => e.id === selectedId && e.prompt === value)`) and in `handleSubmit` / `handleKeyDown` Ctrl+Enter path (lines 25-40) via `setSelectedId(null)` before `onSubmit()`.

**Disabled while busy:** textarea uses `disabled={isLoading}` (line 57); chips use the same flag.

---

### `src/lib/example-prompts.ts` (utility, static data)

**Analog:** `src/lib/sandpack-files.ts` lines 1-4 (plain `export const` module, no imports). Use the exact `EXAMPLE_PROMPTS = [...] as const` array in RESEARCH "Pares travados da galeria" (12 entries, ids botao/card/badge/input/toggle/navbar/modal/empty/pricing/avatar/alert/tabs; text is verbatim D-04).

---

### `src/lib/download-filename.ts` (utility, transform)

**Analog:** `src/lib/sandpack-files.ts:58-60` and `src/lib/parse-code.ts` (pure string function, regex constants at top, JSDoc, no throw).

```ts
export function hasDefaultExport(code: string): boolean {
  return /export\s+default/.test(code);
}
```
```ts
// parse-code.ts style: module-level regex const, then one exported pure fn
const BARE_CODE_START = /.../;
export function parseCode(raw: string): string { ... }
```
Implement `componentFilename(code)` using the DECLARED / CLASS_NAME / ALIAS regexes from RESEARCH Pattern 3; fallback `"Component.tsx"`. Do not reuse `hasDefaultExport` for naming. Colocate a `*.test.ts` only if desired (existing convention: `parse-code.test.ts` next to source with `/// <reference types="vitest/globals" />`).

---

### `src/components/generator/code-view.tsx` (component, Copiar/Baixar + theme-aware highlight)

**Analog:** itself (lines 1-42).

**Current theme hard-code to replace** (line 16):
```tsx
<Highlight code={code} language="tsx" theme={themes.nightOwl}>
```
Replace with `mounted && resolvedTheme === "light" ? themes.nightOwlLight : themes.nightOwl` (`useTheme` from `next-themes`; mounted guard via `useState/useEffect`, see RESEARCH "Highlight conforme o host").

**Header to extend** (lines 12-14): currently `<h2 className="mb-2 text-sm font-medium text-muted-foreground">Código gerado</h2>`. Wrap in `flex items-center justify-between gap-2`; right side holds `Button variant="outline" size="sm"` Copiar (Copy/Check icon) then Baixar (Download icon), `disabled={busy || !code.trim()}`. New optional prop: `CodeView({ code, busy })`.

**Pre ref for selection fallback** (lines 18-24): add `ref={preRef}` to the `<pre>`; on clipboard failure use `window.getSelection()` + `Range.selectNodeContents(preRef.current)`. Keep `{...getLineProps}`/`getTokenProps` untouched.

**Handlers:** `try { await navigator.clipboard.writeText(code); label "Copiado" 2s via setTimeout (clear on unmount) } catch { select pre; label "Não foi possível copiar" }`. Download: `Blob` + `URL.createObjectURL` + `<a download={componentFilename(code)}>` + `revokeObjectURL` (RESEARCH Pattern 3). `code` is the already-parsed TSX passed by the shell.

---

### `src/components/theme/theme-toggle.tsx` (component, client, event-driven)

**Analogs:** `src/components/theme/theme-provider.tsx` (client component wrapper, lines 1-11) and `src/components/ui/button.tsx` (`Button` with `size="icon"` line 27).

```tsx
"use client";
import { ThemeProvider as NextThemesProvider } from "next-themes";
```
Pattern: `"use client"`, `useTheme()` from `next-themes`, mounted guard, `Button variant="outline" size="icon"` with `aria-label` ("Ativar tema claro" when current is dark, "Ativar tema escuro" when light), `Sun` on dark / `Moon` on light (lucide-react). Pre-mount: same-size `disabled` `aria-hidden` button. Migrate `theme === "system"` to `setTheme("dark")` in an effect. Toggle: `setTheme(resolvedTheme === "light" ? "dark" : "light")`.

---

### `src/app/layout.tsx` (config)

**Analog:** itself, line 32:
```tsx
<ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
```
Change to `enableSystem={false}` (optionally `disableTransitionOnChange`). Keep `suppressHydrationWarning` on `<html>` (line 28).

---

### `src/app/page.tsx` (server component, header)

**Analog:** itself, lines 7-13. Header is `<header className="flex flex-col gap-1">` with `<h1>` and `<p>`. Change to: a `flex items-center justify-between gap-3` row containing `<h1 className="text-2xl font-semibold tracking-tight">UIForge</h1>` and `<ThemeToggle />`, then the existing caption `<p>` below. Stays a Server Component; import only the client toggle.

---

### `src/components/generator/generator-shell.tsx` (orchestrator: tabs, status, alert+retry, lastPrompt)

**Analog:** itself (lines 1-136).

**Current error path to replace** (lines 23, 34-36, 41, 66-72, 97-104):
```tsx
const FALLBACK_ERROR = "Falha ao gerar o componente. Tente novamente.";
onError(err) { setSubmitError(err.message || FALLBACK_ERROR); },
const visibleError = error?.message || submitError;
```
Replace with `friendlyGenerateError(err)` from `src/lib/generate-error.ts`; never render `error.message`. Store a `friendly` string state; render only one of the two D-14 phrases.

**Stop-is-not-error guard to preserve** (lines 60, 66, 79-83):
```tsx
stoppedRef.current = false;
...
if (!stoppedRef.current && !(result ?? "").trim()) { setSubmitError(...) }
...
function handleStop() { stoppedRef.current = true; stop(); setInFlight(false); }
```
Set `stoppedRef` before `stop()` (as now). Add `lastPromptRef.current = nextPrompt` in `handleSubmit` after the guard (line 59); `retry()` calls the same send path with `lastPromptRef.current`, clearing the error first.

**Finish detection to hook "Pronto"** (lines 45-55, `wasLoading` effect): set status to `"Pronto"` there only when parsed is non-empty, no error, and not stopped; `"Gerando…"` when `busy`; `""` otherwise.

**Layout to change** (lines 86-96, 130-132): currently prompt wrapper is `order-3 ... md:order-1`, right column `order-1 ... md:order-2`. Keep it. Inside right column order: live status `<p aria-live="polite" aria-atomic="true">` (always mounted), alert block, `md:hidden` tablist, then Preview and Code panels with `role="tabpanel"` and `cn(tab !== "x" && "max-md:hidden")`. Never unmount the panels (iframe reload).

**Existing alert styling to reuse** (lines 98-103):
```tsx
<p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
```
Split: wrapper `div` with those classes, `<p role="alert">` phrase only, sibling `<Button type="button" variant="outline" onClick={retry}>Tentar de novo</Button>`. No `.focus()`.

**Dynamic preview + placeholders** (lines 10-21, 105-129): keep. Placeholder `<p>`s ("Gerando preview…", "O preview aparece aqui depois de gerar.") stay without `aria-live`.

**CodeView call** (line 131): `<CodeView code={parsed} />` becomes `<CodeView code={parsed} busy={busy} />`.

---

### `src/lib/generate-error.ts` (utility, transform)

**Analog:** `src/lib/parse-code.ts` (pure, tolerant, no throw). Content per RESEARCH Pattern 7: `isRateLimitError(error)` (uses `APICallError` from `ai`; regex `/\b429\b|RESOURCE_EXHAUSTED|rate limit|quota/i`) and `friendlyGenerateError(error)` returning the two locked D-14 strings; also treat `error.message === "rate_limited"` as 429. The route can import `isRateLimitError` from here to avoid duplication.

---

### `src/app/api/generate/route.ts` (route, streaming)

**Analog:** itself (lines 1-31). Keep validation and key check unchanged:
```ts
const Body = z.object({ prompt: z.string().min(1).max(2000) });
... return new Response("Invalid request: ...", { status: 400 });
... return new Response("Missing GOOGLE_GENERATIVE_AI_API_KEY...", { status: 500 });
```
Replace lines 28-30:
```ts
const result = streamText({ model, system: SYSTEM_PROMPT, prompt: parsed.prompt });
return result.toTextStreamResponse();
```
with a `fullStream` peek (RESEARCH Pattern 7 steps 2-7): read parts until first `text-delta`/`error`/end; `error` with rate-limit -> `new Response("rate_limited", { status: 429 })`; other error or empty -> `new Response("generate_failed", { status: 502 })`; else a `ReadableStream` that re-emits the first delta and the rest as `text/plain; charset=utf-8` (TextEncoder). This is the only file with no in-repo analog for the stream-peek; follow RESEARCH. Use plain-text `Response` bodies with explicit `status`, matching the existing 400/500 style.

---

### `src/components/generator/sandbox-preview.tsx` (iframe color-scheme)

**Analog:** itself, lines 52-57:
```tsx
<iframe
  title="Live preview"
  sandbox="allow-scripts"
  srcDoc={srcDoc}
  className="h-80 w-full max-w-full rounded-lg border border-border bg-white"
/>
```
Add `style={{ colorScheme: "light dark" }}`. Do not touch `sandbox`, `postMessage` listener (lines 11-24), or the per-panel `role="alert"` for runtime errors (lines 36-51).

---

### `src/lib/preview-srcdoc.ts` (srcdoc head)

**Analog:** itself, lines 29-47. Add `<meta name="color-scheme" content="light dark" />` right after the viewport meta (line 31). Keep `background: #fff; color: #0f172a;` (line 34). `preview-srcdoc.test.ts` assertions (Tailwind CDN URL, `const __Generated = function Button()`, `type: "uiforge-preview-error"`) must stay valid; an extra assertion for the meta can follow the `toContain` style at lines 29-34.

---

## Shared Patterns

### Button styling (chips, Copiar, Baixar, retry, toggle)
**Source:** `src/components/ui/button.tsx` lines 5-40 (`buttonVariants`: `variant` default/outline/secondary/ghost/destructive/link; `size` default/xs/sm/lg/icon...). Use `Button` for real buttons, `className={cn(buttonVariants({...}))}` on raw `<button>` (precedent: `prompt-form.tsx:62-68`). SVG icons auto-size via `[&_svg:not([class*='size-'])]:size-4` (size sm = 3.5).

### Client component + path alias convention
**Source:** all components use `"use client";` first line, `@/` alias imports, `cn` from `@/lib/utils`, Portuguese UI strings, English `aria-label` on landmark sections ("Prompt", "Generated code", "Live preview") that existing code/tests rely on. Do not rename those.

### Panel card styling
**Source:** `code-view.tsx:10`, `sandbox-preview.tsx:31`: `rounded-xl border border-border bg-card p-4`, heading `mb-2 text-sm font-medium text-muted-foreground`, `min-w-0` to avoid blowing the grid.

### Destructive alert styling
**Source:** `generator-shell.tsx:98-103` and `sandbox-preview.tsx:37-43` (`rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive`).

### Pure lib modules
**Source:** `src/lib/parse-code.ts`, `src/lib/sandpack-files.ts`. Pure functions, no DOM, tests colocated as `*.test.ts` with `/// <reference types="vitest/globals" />` and `describe/it/expect` (see `preview-srcdoc.test.ts:1-26`).

### Test constraint
`prompt-form.test.tsx` finds the submit with `getByRole("button", { name: "Gerar" })` (exact string) and the textbox by name `"Prompt"`. Chip accessible names (`"Botão: botão primário com ícone"`) must not equal "Gerar" or "Prompt"; chips must be `type="button"`.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| Stream-peek logic in `src/app/api/generate/route.ts` | route | streaming | No existing code consumes `fullStream` or builds a custom `ReadableStream` Response; use RESEARCH Pattern 7 |
| Tablist markup in `generator-shell.tsx` | component | event-driven | No Tabs component or tablist exists; use RESEARCH Pattern 5 (manual `role="tablist"`, roving tabIndex, arrow keys) |
| Live-region status `<p aria-live>` | component | event-driven | No aria-live usage in repo; use RESEARCH Pattern 6 |

## Metadata

**Analog search scope:** `src/app`, `src/components`, `src/lib` (full tracked tree, 14 source files)
**Files scanned:** 17 read in full
**Pattern extraction date:** 2026-10-15
