# Phase 4: Quality Gate & Deploy - Pattern Map

**Mapped:** 2026-10-16
**Files analyzed:** 27 (new + modified)
**Analogs found:** 15 / 27 (the rest are greenfield infra: CI, Playwright, docs; use RESEARCH.md patterns)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/ai/model.ts` (modify: `getModel`, `isE2EMock`) | config/utility | request-response | itself (current 5 lines) | exact |
| `src/lib/ai/mock-model.ts` (new) | utility | streaming | `src/app/api/generate/route.test.ts` (fake fullStream) | partial |
| `src/lib/rate-limit.ts` (new) | utility | transform (pure, in-memory) | `src/lib/generate-error.ts` / `src/lib/download-filename.ts` (small pure libs) | role-match |
| `src/lib/rate-limit.test.ts` (new) | test | transform | `src/lib/generate-error.test.ts` / `src/lib/download-filename.test.ts` | role-match |
| `src/app/api/generate/route.ts` (modify) | controller | streaming | itself | exact |
| `src/app/api/generate/route.test.ts` (modify) | test | streaming | itself | exact |
| `src/lib/preview-srcdoc.ts` (modify L32) | utility | transform | itself | exact |
| `src/lib/preview-srcdoc.test.ts` (modify L36-41) | test | transform | itself | exact |
| `src/components/generator/sandbox-preview.tsx` (modify L56) | component | event-driven | itself | exact |
| `src/components/generator/sandbox-preview.test.tsx` (new) | test | request-response (RTL) | `src/components/generator/prompt-form.test.tsx` | exact |
| `vitest.config.ts` (modify) | config | n/a | itself | exact |
| `eslint.config.mjs`, `.gitignore`, `package.json` (modify) | config | n/a | themselves | exact |
| `src/app/layout.tsx` (modify: OG metadata) | config | n/a | itself (`metadata` L13-17) | exact |
| `src/app/opengraph-image.png` (new) | asset | n/a | none | none |
| `src/lib/has-default-export.ts` (+ Sandpack cleanup, optional) | utility | transform | `src/lib/sandpack-files.ts` (`hasDefaultExport`) | exact (move) |
| `playwright.config.ts` (new) | config | n/a | `vitest.config.ts` (structure only) | partial |
| `e2e/generate.spec.ts` (new) | test | e2e request-response/streaming | none in repo; locators from `prompt-form.test.tsx` | partial |
| `e2e/screenshots.spec.ts` (new) | test | file-I/O | none | none |
| `.github/workflows/ci.yml` (new) | config | batch | none (RESEARCH Pattern 8) | none |
| `.nvmrc`, `LICENSE`, `.env.example` (modify) | config | n/a | `.env.example` | exact (for env doc) |
| `README.md` / `README.pt-BR.md` (rewrite/new) | docs | n/a | current `README.md` is create-next-app boilerplate | none |
| `.planning/PROJECT.md` (modify L32) | docs | n/a | itself | exact |

## Pattern Assignments

### `src/lib/ai/model.ts` (config, request-response)

**Current code (entire file, lines 1-5):**
```typescript
import { google } from "@ai-sdk/google";

// Single source of truth for the model id — swap here for a higher-headroom model or the Groq fallback.
export const MODEL_ID = "gemini-2.5-flash";
export const model = google(MODEL_ID);
```
**Change:** drop the import-time `export const model`; export `isE2EMock()` and `getModel(prompt)` reading `process.env` at call time (RESEARCH Pattern 2). Keep the `MODEL_ID` comment/export. Guard: `UIFORGE_E2E_MOCK === "1" && VERCEL_ENV !== "production"`. Use dynamic `await import("./mock-model")` in the mock branch. Never `NEXT_PUBLIC_`.

---

### `src/lib/ai/mock-model.ts` (utility, streaming)

**Analog:** no direct one; part shapes come from the fake stream in `src/app/api/generate/route.test.ts` L16-27 and RESEARCH Pattern 1.

The route consumes `result.fullStream` and uses `value.type === "text-delta"` / `value.text` (route.ts L56-57, L93-94). The provider-level mock must emit `text-delta` with `delta` (the SDK maps it to `text`). Copy `MockLanguageModelV4` + `simulateReadableStream` from RESEARCH Pattern 1. Before coding, read the `finish` member of `LanguageModelV4StreamPart` in `node_modules/@ai-sdk/provider/dist/index.d.ts` (A9). For `__e2e_error__`, emit at least 2 `text-delta` parts before the `error` part (the route peeks the first delta; an earlier error becomes a 502). Fixed component: `export default function FixtureCard()`, hooks-free, only optional `import React`.

---

### `src/lib/rate-limit.ts` (utility, transform)

**Analog:** `src/lib/generate-error.ts` and `src/lib/prompt-limits.ts` (small pure modules, named exports, no classes). Use the implementation in RESEARCH Pattern 4 verbatim: `checkRateLimit(key, {max, windowMs}, now = Date.now())`, `clientIp(req)`, `getRateLimitConfig()` (env `RATE_LIMIT_MAX` default 5, `RATE_LIMIT_WINDOW_MS` default 60000, NaN fallback), `__resetRateLimit()`.

---

### `src/lib/rate-limit.test.ts` (test, transform)

**Analog:** `src/lib/parse-code.test.ts` / `generate-error.test.ts`. Test header convention used across the repo (route.test.ts L1-3, preview-srcdoc.test.ts L1):
```typescript
/// <reference types="vitest/globals" />
```
Globals (`describe/it/expect/vi/beforeEach`) are enabled in `vitest.config.ts`; do not import them. Pass `now` explicitly instead of fake timers. Call `__resetRateLimit()` in `beforeEach`.

---

### `src/app/api/generate/route.ts` (controller, streaming)

**Analog:** itself.

**Imports (L1-5, 8):** current `import { model } from "@/lib/ai/model";` becomes `import { getModel, isE2EMock } from "@/lib/ai/model";`; add `import { checkRateLimit, clientIp, getRateLimitConfig } from "@/lib/rate-limit";`. Keep the `@/` alias and ordering (ai, zod, then `@/lib/...`).

**Validation then guard order (L18-33):**
```typescript
let parsed;
try {
  parsed = Body.parse(await req.json());
} catch {
  return new Response(`Invalid request: ...`, { status: 400 });
}
if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
  return new Response("Missing GOOGLE_GENERATIVE_AI_API_KEY. ...", { status: 500 });
}
```
Insert the rate limit between the zod parse and the key check; change the key check to `if (!isE2EMock() && !process.env.GOOGLE_...)`. In `streamText`, use `model: await getModel(parsed.prompt)`.

**Rate-limit response (must match `failureResponse` body, L120-124):**
```typescript
function failureResponse(error: unknown) {
  return isRateLimitError(error)
    ? new Response("rate_limited", { status: 429 })
    : new Response("generate_failed", { status: 502 });
}
```
New: `new Response("rate_limited", { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } })`. The client maps `error.message === "rate_limited"` (generate-error.ts), so no UI change.

Keep `runtime = "nodejs"` and `maxDuration = 60` (L13-14).

---

### `src/app/api/generate/route.test.ts` (test, streaming)

**Analog:** itself.

**Mock to update (L152):** `vi.mock("@/lib/ai/model", () => ({ model: {} }));` becomes `vi.mock("@/lib/ai/model", () => ({ getModel: async () => ({}), isE2EMock: () => false }));`. For gating tests, make `isE2EMock` a `vi.fn` controlled per test.

**beforeEach (L172-176):**
```typescript
beforeEach(() => {
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = "k";
  state.parts = [];
  state.readError = undefined;
});
```
Add `__resetRateLimit()` here (otherwise the shared "unknown" bucket trips after 5 tests).

**Request helper (L165-170):** extend `req(body, headers?)` to pass `headers: { "x-forwarded-for": "1.2.3.4" }` for per-IP tests (6th request is 429 with `Retry-After`; another IP unaffected).

**Test style (L178-183), Portuguese titles, `await res.text()` assertions:**
```typescript
it("sem API key continua 500", async () => {
  delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const res = await POST(req({ prompt: "x" }));
  expect(res.status).toBe(500);
});
```
Add: mock mode without key does not 500; the `VERCEL_ENV=production` case (in a model unit test) returns false.

---

### `src/lib/preview-srcdoc.ts` / `.test.ts` (D-17)

**Source L32:** `<meta name="color-scheme" content="light dark" />` becomes `content="light"` (consider also `color-scheme: light` in the style block at L34).

**Test to update (test L36-41):**
```typescript
it("declares color-scheme light dark without forcing light only", () => {
  const srcdoc = buildPreviewSrcdoc(SAMPLE);
  expect(srcdoc).toContain('<meta name="color-scheme" content="light dark"');
  expect(srcdoc).toContain("background: #fff");
  expect(srcdoc).not.toContain("color-scheme: light;");
});
```
Rewrite the title and assertions to the always-light expectation (`content="light"`, no `light dark`).

### `src/components/generator/sandbox-preview.tsx` (D-17 follow-through)

**Change L56:** `style={{ colorScheme: "light dark" }}` becomes `style={{ colorScheme: "light" }}`. Security invariant line 54: `sandbox="allow-scripts"` (must never gain `allow-same-origin`).

### `src/components/generator/sandbox-preview.test.tsx` (new, RTL)

**Analog:** `src/components/generator/prompt-form.test.tsx` L1-8:
```typescript
/// <reference types="vitest/globals" />
import { render, screen } from "@testing-library/react";
import { PromptForm } from "@/components/generator/prompt-form";
```
Render `<SandboxPreview code="export default function A(){return <div/>}" />`, query the iframe via `screen.getByTitle("Live preview")` (the `section` also has `aria-label="Live preview"`, so do not use `getByLabelText`). Assert `getAttribute("sandbox") === "allow-scripts"` and not containing `allow-same-origin`, and `style.colorScheme === "light"`.

---

### `vitest.config.ts` (config)

**Current (L1-17):** `defineConfig({ plugins: [react()], resolve: { alias: { "@": ... } }, test: { environment: "jsdom", globals: true, setupFiles: ["./vitest.setup.ts"] } })`. Add inside `test`: `exclude: [...configDefaults.exclude, "e2e/**", ".next/**"]` (import `configDefaults` from `vitest/config`) and `coverage: { provider: "v8", reporter: ["text","html","lcov"], include: ["src/**/*.{ts,tsx}"], exclude: ["src/**/*.test.*","src/components/ui/**"] }` with no thresholds.

### `package.json`, `.gitignore`, `eslint.config.mjs`

- `package.json` scripts currently: `dev, build, start, lint ("eslint"), test ("vitest run")`. Add `typecheck`, `test:coverage`, `e2e`, `e2e:install`, `e2e:server` (`next build && next start -p 3100`), plus `"engines": {"node": "22.x"}`. devDependencies: `@playwright/test`, `@vitest/coverage-v8` (`^5.0.4`, matching vitest).
- `.gitignore` (L7-8 "testing" section has only `/coverage`): append `/playwright-report/`, `/test-results/`, `/blob-report/`, `/playwright/.cache/`.
- `eslint.config.mjs` ignores list (L473-479, `"node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts"`): add `"playwright-report/**"`, `"test-results/**"`, `"coverage/**"`.

### `src/app/layout.tsx` (metadata, D-16)

**Current L13-17:**
```typescript
export const metadata: Metadata = {
  title: "UIForge",
  description:
    "Gerador de componentes React + Tailwind com streaming em tempo real.",
};
```
Extend with `metadataBase` (from `VERCEL_PROJECT_PRODUCTION_URL`, fallback `http://localhost:3000`), `openGraph` (`type: "website"`, `locale: "pt_BR"`), `twitter: { card: "summary_large_image" }`. Keep Portuguese copy; the og:image comes from `src/app/opengraph-image.png`.

### `.env.example`

Three lines today (comment + `GOOGLE_GENERATIVE_AI_API_KEY=`). Follow its comment style to document optional `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS`; do NOT document `UIFORGE_E2E_MOCK` as a prod setting (mention it as test-only).

### `.planning/PROJECT.md`

L32: `- Rate limiting (e.g. Upstash) — not required for a personal portfolio demo`. Reword to: best-effort in-memory per-IP limit shipped in Phase 4; distributed limit (Upstash) stays v2/PLAT-01. Also fix "Sandpack" wording if present.

### Sandpack cleanup (optional, isolated task after green)

Verified unused: `src/components/sandpack/sandpack-css.tsx`, `src/components/generator/preview-error.tsx`. The only live import is `sandbox-preview.tsx` L5: `import { hasDefaultExport } from "@/lib/sandpack-files";`. Move to `src/lib/has-default-export.ts`, port its test from `sandpack-files.test.ts`, delete the rest, `npm uninstall @codesandbox/sandpack-react`. Gate: `npm run lint && npx tsc --noEmit && npm test && npm run build`.

---

### `playwright.config.ts`, `e2e/generate.spec.ts`, `e2e/screenshots.spec.ts` (no repo analog)

Use RESEARCH Patterns 5-6 and "Screenshots for README". Locators confirmed in source (use these): textbox `getByRole("textbox", {name: "Prompt"})`, `getByRole("button", {name: "Gerar"})`, status text "Gerando…"/"Pronto", `role="alert"` + button "Tentar de novo", tabs "Preview"/"Código" (`md:hidden`), buttons "Copiar"/"Baixar", iframe `page.locator('iframe[title="Live preview"]')` (do not use label: two elements share "Live preview"). Config must set `webServer.env` `UIFORGE_E2E_MOCK=1` and `RATE_LIMIT_MAX=1000`, `command: "npm run e2e:server"`. Retry test: assert a second POST to `/api/generate` with the same `postDataJSON().prompt`, not success.

### `.github/workflows/ci.yml` (no repo analog; there is no `.github/`)

Use RESEARCH Pattern 8 (checkout@v7, setup-node@v7, cache@v6, upload-artifact@v7; `node-version-file: .nvmrc`; jobs `check` and `e2e`; `concurrency` group `ci-${{ github.ref }}`). `check` runs `npm ci`, `npm run lint`, `npx tsc --noEmit` (or `npm run typecheck`), `npm run test:coverage`, `npm run build`. No `GOOGLE_*` secret anywhere.

### README (D-18..D-20)

Existing `README.md` is untouched create-next-app boilerplate ("This is a Next.js project bootstrapped with create-next-app"); replace entirely. Architecture facts to document (from code): preview is `srcdoc` iframe, `sandbox="allow-scripts"` (sandbox-preview.tsx L54), Tailwind/React/Babel from jsdelivr CDN (preview-srcdoc.ts L33), `postMessage` types `uiforge-preview-error`/`uiforge-preview-ready` (sandbox-preview.tsx L15, L18), route streams plain text via `streamText` (route.ts L76-117). Sandpack is no longer used at runtime.

## Shared Patterns

### Request-time env reads (never import-time)
**Source:** `src/app/api/generate/route.ts` L28 (`process.env.GOOGLE_GENERATIVE_AI_API_KEY` read inside the handler)
**Apply to:** `getModel`, `isE2EMock`, `getRateLimitConfig`

### Error response contract
**Source:** `src/app/api/generate/route.ts` L120-124 and `src/lib/generate-error.ts`
**Apply to:** rate-limit 429 (body exactly `rate_limited`), key 500, 502 `generate_failed`. Keep plain-text bodies; the client classifies by message/status.

### Vitest conventions
**Source:** `vitest.config.ts`, `route.test.ts` L1-3
`/// <reference types="vitest/globals" />` at top, co-located `*.test.ts(x)`, `@/` alias, `// @vitest-environment node` for route tests, Portuguese test titles in the route test and English in lib tests (match the file you extend).

### Security invariant
`sandbox="allow-scripts"` without `allow-same-origin`; the new RTL test guards it; the E2E mock flag must never be reachable on Vercel Production (`VERCEL_ENV` guard).

### UI copy
Portuguese. No new UI strings for rate limit (D-10).

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `.github/workflows/ci.yml` | config | batch | No `.github/` exists; use RESEARCH Pattern 8 |
| `playwright.config.ts`, `e2e/*.spec.ts` | config/test | e2e | No Playwright yet; use RESEARCH Patterns 5-6 |
| `src/app/opengraph-image.png` | asset | n/a | No images besides default `public/*.svg` |
| `README.md`, `README.pt-BR.md`, `LICENSE`, `.nvmrc` | docs/config | n/a | Boilerplate README only |

## Metadata

**Analog search scope:** whole repo excluding `.planning`, `node_modules`, `.next` (47 tracked files)
**Files scanned:** about 14 read in full or in part
**Pattern extraction date:** 2026-10-16
**Note:** `src/components/generator/generator-shell.tsx` was not re-read; locators are taken from RESEARCH.md "verified in source".
