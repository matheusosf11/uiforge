---
phase: 01-foundation-streaming-generation
reviewed: 2026-10-15T04:20:00Z
depth: standard
files_reviewed: 17
files_reviewed_list:
  - src/app/page.tsx
  - src/app/layout.tsx
  - src/app/globals.css
  - src/app/api/generate/route.ts
  - src/lib/utils.ts
  - src/lib/parse-code.ts
  - src/lib/parse-code.test.ts
  - src/lib/ai/model.ts
  - src/lib/ai/prompt.ts
  - src/components/theme/theme-provider.tsx
  - src/components/ui/button.tsx
  - src/components/ui/textarea.tsx
  - src/components/generator/code-view.tsx
  - src/components/generator/prompt-form.tsx
  - src/components/generator/generator-shell.tsx
  - vitest.config.ts
  - next.config.ts
findings:
  critical: 1
  warning: 4
  info: 4
  total: 9
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-10-15T04:20:00Z
**Depth:** standard
**Files Reviewed:** 17
**Status:** issues_found

## Summary

Reviewed the Phase 1 walking skeleton: streaming `POST /api/generate`, `parseCode`, and the client generate loop (`GeneratorShell` → `PromptForm` / `CodeView`). Transport wiring is sound (`useCompletion` sends `{ prompt }` with `streamProtocol: "text"`, matching `toTextStreamResponse()`). Generated code is rendered as Prism tokens, not HTML. The Gemini key stays server-side.

The blocking defect is in `parseCode`: any ` ``` ` in the accumulated text is treated as a markdown fence, so unfenced TSX that contains a code-fence string (a realistic UIForge prompt) is truncated into non-runnable garbage. Several robustness gaps remain around Stop/abort, double-submit, and the 2000-character contract.

## Critical Issues

### CR-01: `parseCode` treats any ` ``` ` as a markdown fence

**File:** `src/lib/parse-code.ts:6-8`
**Issue:** GEN-06 requires: if no wrapping markdown fence exists, return the trimmed raw text. The implementation searches for the first ` ``` ` anywhere:

```ts
const match = raw.match(/```(?:[a-zA-Z]+)?\s*\n?([\s\S]*?)(?:```|$)/);
const body = match?.[1] ?? raw;
```

That matches interior fences inside otherwise-unfenced TSX. A realistic generation such as:

```tsx
export default function Editor() {
  const [md, setMd] = useState("```js\nconsole.log(1)\n```");
  return <textarea value={md} onChange={(e) => setMd(e.target.value)} />;
}
```

returns only `console.log(1)` — the component is discarded. Mid-stream, a lone trailing ` ``` ` in unfenced source yields `""`. The 12 fixtures never include unfenced input that contains triple backticks, so the suite stays green.

This will ship broken code into Phase 2's Sandpack preview for prompts like "markdown editor", "code block", or "syntax highlighter".

**Fix:** Only strip when an opening fence is at the start of the string (or after a newline / leading prose), with an optional language tag. Otherwise return `raw.trim()`. Guard interior ` ``` ` in source:

```ts
export function parseCode(raw: string): string {
  const open = /(?:^|\n)```(?:[a-zA-Z]+)?\r?\n/;
  const openMatch = open.exec(raw);
  if (!openMatch) {
    const startFence = raw.match(/^```(?:[a-zA-Z]+)?[ \t]*\r?\n?/);
    if (!startFence) return raw.trim();
    const after = raw.slice(startFence[0].length);
    const closeAt = after.search(/\r?\n```/);
    return (closeAt === -1 ? after : after.slice(0, closeAt)).trim();
  }
  const after = raw.slice(openMatch.index + openMatch[0].length);
  const closeAt = after.search(/\r?\n```/);
  return (closeAt === -1 ? after : after.slice(0, closeAt)).trim();
}
```

Add fixtures: unfenced component whose source contains `"```js\n...\n```"` must round-trip unchanged; wrapping fences around that same component must still extract the full TSX.

## Warnings

### WR-01: Stop does not abort the Gemini request

**File:** `src/app/api/generate/route.ts:28-30`
**Issue:** `useCompletion().stop()` aborts the browser fetch (GEN-05 UI returns to ready), but `streamText` is called without `abortSignal: req.signal`. The Node handler keeps the provider call alive until Gemini finishes or `maxDuration` hits. Repeated Stop+resubmit still burns free-tier RPM (T-01-10 claimed submit-lock as the mitigation; the in-flight provider work is not cancelled).

**Fix:**

```ts
const result = streamText({
  model,
  system: SYSTEM_PROMPT,
  prompt: parsed.prompt,
  abortSignal: req.signal,
});
return result.toTextStreamResponse();
```

### WR-02: Submit is not serialized — Ctrl/Cmd+Enter repeat can fire parallel generations

**File:** `src/components/generator/generator-shell.tsx:27-44`, `src/components/generator/prompt-form.tsx:24-33`
**Issue:** The only in-flight guard is React `isLoading`. `callCompletionApi` sets loading via SWR mutate (async relative to the current event). Keyboard `keydown` repeats while Ctrl/Cmd+Enter is held. `useCompletion` also does not abort the previous request when a new `complete()` starts — it only replaces `abortControllerRef`, so `stop()` aborts the latest call and the earlier Gemini request continues.

T-01-10 / "disabled while busy" does not hold across that race.

**Fix:** Ignore `event.repeat` in `PromptForm`, and lock submit with a ref before `complete()`:

```ts
function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
  if (event.repeat) return;
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && canSubmit) {
    event.preventDefault();
    onSubmit();
  }
}
```

```ts
const inFlightRef = useRef(false);

function handleSubmit() {
  const prompt = input.trim();
  if (!prompt || isLoading || inFlightRef.current) return;
  inFlightRef.current = true;
  stoppedRef.current = false;
  setSubmitError(null);
  void (async () => {
    try {
      const result = await complete(prompt);
      if (!stoppedRef.current && !(result ?? "").trim()) {
        setSubmitError((current) => current ?? FALLBACK_ERROR);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : FALLBACK_ERROR);
    } finally {
      inFlightRef.current = false;
    }
  })();
}
```

### WR-03: Client does not enforce the 2000-character prompt cap

**File:** `src/components/generator/prompt-form.tsx:41-52`
**Issue:** The Route Handler rejects `prompt` longer than 2000 (`src/app/api/generate/route.ts:9`). The textarea has no `maxLength`, and `canSubmit` is only `value.trim() !== ""`. A paste of 2001+ characters enables Gerar, then fails with a 400 whose English body is shown as `role="alert"`. The UI contract and the API contract disagree.

**Fix:**

```tsx
<Textarea
  maxLength={2000}
  /* ...existing props... */
/>
```

Optionally disable submit when `value.trim().length > 2000` and show a remaining-character hint. Keep the zod max as the server-side backstop.

### WR-04: Validation `catch` maps every failure to a prompt-length 400

**File:** `src/app/api/generate/route.ts:13-20`
**Issue:** `await req.json()` and `Body.parse` share one `catch`. Invalid JSON, a non-object body, a missing `prompt` key, and a 2001-character prompt all return *"prompt must be a non-empty string of at most 2000 characters."* T-01-03 also claims size is capped by zod, but the entire JSON is parsed before `.max(2000)` runs — a huge payload is still fully materialized.

**Fix:** Distinguish JSON parse vs schema errors, and fail fast on oversized bodies:

```ts
const contentLength = Number(req.headers.get("content-length") ?? 0);
if (contentLength > 8_000) {
  return new Response("Invalid request: payload too large.", { status: 413 });
}

let json: unknown;
try {
  json = await req.json();
} catch {
  return new Response("Invalid request: body must be JSON.", { status: 400 });
}

const parsed = Body.safeParse(json);
if (!parsed.success) {
  return new Response(
    "Invalid request: prompt must be a non-empty string of at most 2000 characters.",
    { status: 400 },
  );
}
```

Also consider `z.string().trim().min(1).max(2000)` so whitespace-only prompts are rejected the same way the client already trims.

## Info

### IN-01: Geist Sans is loaded but never applied

**File:** `src/app/layout.tsx:6-8`, `src/app/globals.css:10-12`
**Issue:** `next/font` sets `--font-geist-sans` on `<body>`, but `@theme inline` maps `--font-sans: var(--font-sans)` (self-reference) and never reads `--font-geist-sans`. `--font-mono: var(--font-geist-mono)` is wired, so the code view can use Geist Mono while the UI falls back to the user-agent sans.

**Fix:** `--font-sans: var(--font-geist-sans);`

### IN-02: Code view ignores the host theme

**File:** `src/components/generator/code-view.tsx:16`
**Issue:** `themes.nightOwl` is always used. `ThemeProvider` defaults to dark with `enableSystem`, so a light system preference still shows a dark editor on a light card. Full theme polish is Phase 3 (UX-01); worth swapping with `themes.github` / `nightOwl` from `useTheme()` when that work starts.

**Fix:** Pick the Prism theme from `resolvedTheme` once the toggle ships.

### IN-03: Duplicate `aria-label="Prompt"`

**File:** `src/components/generator/prompt-form.tsx:36-43`
**Issue:** Both the `<section>` and the `<Textarea>` use `aria-label="Prompt"`. Screen readers may announce the name twice. The section label plus a textarea `aria-label` (or a visible `<label htmlFor>`) should not duplicate.

**Fix:** Keep `aria-label="Prompt"` on the section (Phase 1 shell contract) and use `id` + `<label htmlFor>` for the textarea, or drop the textarea's `aria-label`.

### IN-04: Vitest has no `@/` alias

**File:** `vitest.config.ts:4-10`
**Issue:** `parse-code.test.ts` imports relatively, so the suite passes. Component tests that import `@/components/...` or `@/lib/...` (Phase 4 QUAL-01) will fail to resolve until `resolve.alias` (or `vite-tsconfig-paths`) is added.

**Fix:** Mirror `tsconfig` paths:

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
```

---

_Reviewed: 2026-10-15T04:20:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
