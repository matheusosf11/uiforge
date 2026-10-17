---
phase: 02-sandboxed-live-preview
verified: 2026-10-15T05:05:00Z
status: human_needed
score: 9/9 must-haves verified
overrides_applied: 0
human_verification:
  - test: "After a finished generation, inspect the Preview panel iframe"
    expected: "The parsed default-export component paints live inside a Sandpack iframe (not as host JSX). Empty state shows 'O preview aparece aqui depois de gerar.' During the stream, Sandpack is absent and copy is 'Gerando preview…'"
    why_human: "Code+tests prove the files map, mount gate, and isolation bans. Browser automation could not re-drive the controlled textarea this session; iframe paint is visual."
  - test: "Generate a component that uses Tailwind v4 utilities (e.g. bg-indigo-600, rounded, px-4, sm: variants)"
    expected: "Those utilities are visibly applied inside the iframe (indigo button, spacing, radius). The v3 Play CDN is not requested."
    why_human: "externalResources pins jsDelivr @tailwindcss/browser@4.3.3 per RESEARCH; host PostCSS cannot cross the iframe. Visual color/spacing cannot be proven from grep."
  - test: "Force a compile/runtime failure (invalid TSX) and a missing export default snapshot"
    expected: "Panel is not a blank iframe: Sandpack ErrorOverlay stays on, host role=alert shows useErrorMessage(), and missing default export shows 'O código gerado não exporta um componente padrão.' while Sandpack still mounts"
    why_human: "Overlay + banner wiring is in code; whether the iframe stays non-blank is a visual/runtime check. Playwright generate→preview is Phase 4 (QUAL-02)."
---

# Phase 2: Sandboxed Live Preview Verification Report

**Phase Goal:** The generated component renders live inside a secure, isolated sandbox with Tailwind styling applied
**Verified:** 2026-10-15T05:05:00Z
**Status:** human_needed
**Re-verification:** No — initial verification
**MVP note:** ROADMAP marks this phase `mode: mvp`, but the ROADMAP goal is not in `As a …, I want to …, so that ….` form (`gsd-sdk user-story.validate` → invalid). Plan 01/02 goals **are** valid user stories. User Flow Coverage is derived from those plan stories plus the ROADMAP outcome. This is a process discrepancy, not an implementation gap.

## User Flow Coverage

User story (Plan 01): As a visitor who described a UI component, I want to see the generated React component render live inside a secure isolated sandbox after generation finishes, so that I can verify the result without executing untrusted code on the host page.

User story (Plan 02): As a visitor who described a UI component, I want to see Tailwind styling applied inside the sandbox and a clear error when the generated code fails, so that the live preview is usable and never a blank iframe.

| Step | Expected | Evidence | Status |
|------|----------|----------|--------|
| Open app | Empty Preview dashed placeholder, no Sandpack | `generator-shell.tsx`: `previewCode` starts `null`; else-branch section `aria-label="Live preview"` + "O preview aparece aqui depois de gerar." | ✓ |
| Submit prompt | Stream stays in CodeView; Preview does not remount Sandpack per token | `isLoading` branch renders "Gerando preview…" only; `<SandboxPreview>` is not in the tree; `CodeView code={parsed}` still live-binds | ✓ |
| Stream finishes | Snapshot of `parseCode(completion)` mounts preview-only Sandpack | `wasLoading` + `setPreviewCode(parsed)`; `next/dynamic(..., { ssr: false })`; `<SandboxPreview code={previewCode} />` | ✓ (wired) |
| See live sandbox | Component runs only inside Sandpack iframe (`react-ts` `/Component.tsx` + `/App.tsx` wrapper) | `SandpackProvider template="react-ts"` + `files={buildSandpackFiles(code)}`; no `eval` / `new Function` / generated-HTML injection under `src/` | ✓ (wired; iframe paint = human) |
| Tailwind in iframe | v4 utilities (color, spacing, rounded, `sm:`) apply | `externalResources: ["https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.3.3"]`; zero `cdn.tailwindcss.com`; no host `@tailwindcss/browser` npm dep. `dark:` follows `prefers-color-scheme` (RESEARCH A2; host class pipe is Phase 3) | ✓ (wired; visual = human) |
| Error / missing default | Non-blank panel: overlay + host `role=alert`; Portuguese missing-default copy; Sandpack still mounts | `showSandpackErrorOverlay` (not false); `<PreviewErrorBanner />` inside provider (`useErrorMessage()` as text children); `hasDefaultExport` alert then provider still rendered | ✓ (wired; visual = human) |
| Outcome | Live isolated preview with Tailwind, never host-eval, never blank on failure | Isolation + CDN + error path all present and wired per RESEARCH | ✓ (implementation); live iframe = human |

## Goal Achievement

### Observable Truths

Merged from ROADMAP Success Criteria (contract) plus unique PLAN `must_haves` (plans may add, never subtract). Plan restatements of SC1–SC3 keep ROADMAP wording.

| # | Truth | Status | Evidence |
| --- | ------- | ---------- | -------------- |
| 1 | The generated component renders live inside a sandboxed Sandpack iframe and never executes in the host page | ✓ VERIFIED | `SandboxPreview` composes `SandpackProvider` + `SandpackPreview` (`template="react-ts"`, `key={code}`). Files map puts generated TSX in hidden `/Component.tsx` and a wrapper `/App.tsx` that default-imports it — does **not** override `/index.tsx` or `/src/App.tsx`. `GeneratorShell` passes **`previewCode` only** (not live `parsed`) into `SandboxPreview`. Zero `eval(` / `new Function` / generated `dangerouslySetInnerHTML` under `src/` (only allowed `dangerouslySetInnerHTML` is `getSandpackCssText()` in `sandpack-css.tsx`). Sandpack client types register an `HTMLIFrameElement` bundler. Live Gemini POST `/api/generate` was confirmed to return clean default-exported Tailwind TSX this session. Iframe **paint** is human. |
| 2 | Sandpack is not in the React tree while the stream is in progress or before the first finished generation | ✓ VERIFIED | `generator-shell.tsx` ternary: `isLoading` → dashed loading section (no `SandboxPreview`); `previewCode` set && !`isLoading` → mount; else empty placeholder. `previewCode` starts `null` and is written only when `wasLoading` flips true→false. |
| 3 | Empty preview shows the dashed Portuguese placeholder; loading shows Gerando preview… | ✓ VERIFIED | Empty: `border-dashed` + exact string `O preview aparece aqui depois de gerar.` Loading: same chrome + `Gerando preview…`. Dynamic import `loading` fallback uses the same loading copy. |
| 4 | page.tsx stays an RSC host; next/dynamic ssr:false lives only in GeneratorShell | ✓ VERIFIED | `page.tsx` imports `GeneratorShell` only — zero `dynamic` / `ssr: false`. `generator-shell.tsx` has `import dynamic from "next/dynamic"` and `ssr: false`. SDK `verify.key-links` missed `ssr:\s*false` (YAML pattern over-escaped); **manual grep confirms WIRED**. |
| 5 | Sandpack chrome CSS is present in the document via getSandpackCssText + useServerInsertedHTML | ✓ VERIFIED | `sandpack-css.tsx`: `"use client"`, `useServerInsertedHTML` → `<style id="sandpack" dangerouslySetInnerHTML={{ __html: getSandpackCssText() }} />`. `layout.tsx` renders `<SandpackCss />` inside `<head>`. |
| 6 | Tailwind styling (including responsive and dark variants) applies correctly inside the preview | ✓ VERIFIED | Matches RESEARCH Pattern 3: pinned jsDelivr `@tailwindcss/browser@4.3.3` on `options.externalResources`. v4 Play CDN emits `sm:` media queries; `dark:` uses `prefers-color-scheme` (RESEARCH A2 / OQ1 — host `next-themes` class does **not** leak; class-based iframe dark is Phase 3, not a Phase 2 miss). No v3 CDN. Visual indigo/spacing = human. |
| 7 | The v3 Play CDN https://cdn.tailwindcss.com is never used | ✓ VERIFIED | Workspace grep of `*.ts`/`*.tsx`/`*.js`/`*.jsx`/`*.json` for `cdn.tailwindcss.com` → zero matches. `package.json` has no `"@tailwindcss/browser"` host dependency. |
| 8 | When generated code fails to render, the preview shows a clear, non-blank error state | ✓ VERIFIED | `showSandpackErrorOverlay` is present and **not** `{false}` (JSX boolean true). `PreviewErrorBanner` is first child **inside** `SandpackProvider`, calls `useErrorMessage()`, returns `null` when empty (success path, not a stub), otherwise `<p role="alert">{message}</p>` as text children. No host ErrorBoundary treated as sufficient. Visual overlay = human. |
| 9 | When the snapshot has no export default, the panel shows the Portuguese alert and still mounts Sandpack | ✓ VERIFIED | `hasDefaultExport` is `/export\s+default/` in `sandpack-files.ts`. `SandboxPreview` renders exact copy `O código gerado não exporta um componente padrão.` when false, then still renders `SandpackProvider`. Vitest: default function / `export default X` → true; named-only / empty → false (8/8 file tests green). Known miss `export { Foo as default }` is RESEARCH OQ3, accepted. |

**Score:** 9/9 truths verified (live iframe paint / Tailwind color / error overlay still need a human pass; they do not fail implementation coverage)

### Required Artifacts

gsd-sdk `verify.artifacts` — Plan 01: 4/4 passed; Plan 02: 3/3 passed. Manual L1–L4 below.

| Artifact | Expected | Status | Details |
| -------- | ----------- | ------ | ------- |
| `src/lib/sandpack-files.ts` | react-ts files map + `hasDefaultExport` | ✓ VERIFIED | Exists, substantive. Exports `COMPONENT_PATH`, `APP_PATH`, `APP_WRAPPER`, `buildSandpackFiles`, `hasDefaultExport`. Wired by `sandbox-preview.tsx` and tests. |
| `src/lib/sandpack-files.test.ts` | Vitest contract | ✓ VERIFIED | 8/8 passed (`npx vitest run src/lib/sandpack-files.test.ts`). Covers hidden `/Component.tsx` + `/App.tsx`, no `/src/App.tsx`/`/index.tsx`, four `hasDefaultExport` cases. |
| `src/components/generator/sandbox-preview.tsx` | Preview-only Sandpack + Tailwind CDN + error wiring | ✓ VERIFIED | `"use client"`; Provider+Preview (no `<Sandpack>` preset, no `SandpackCodeEditor`); `externalResources` pin; `PreviewErrorBanner`; overlay on; missing-default alert. Wired via `next/dynamic` from `GeneratorShell`. |
| `src/components/sandpack/sandpack-css.tsx` | Official App Router stitches CSS | ✓ VERIFIED | `getSandpackCssText` + `useServerInsertedHTML`. Wired in `layout.tsx` `<head>`. |
| `src/components/generator/generator-shell.tsx` | snapshot + `ssr:false` mount gate | ✓ VERIFIED | `previewCode` / `wasLoading`; dynamic import; empty/loading/ready table. Orchestrator of preview. |
| `src/components/generator/preview-error.tsx` | `useErrorMessage()` host banner | ✓ VERIFIED | `"use client"`; `role="alert"`; text children. Wired as child of `SandpackProvider`. |
| `src/app/layout.tsx` | `<SandpackCss />` in `<head>` | ✓ VERIFIED | Import + render confirmed. ThemeProvider preserved. |
| `package.json` / lock | Sandpack 2.20.0 only new preview dep | ✓ VERIFIED | `"@codesandbox/sandpack-react": "^2.20.0"`; lock resolved `2.20.0`. No direct `sandpack-client`, `sandpack-themes`, or host `@tailwindcss/browser`. |

### Key Link Verification

gsd-sdk Plan 02: 3/3 verified. Plan 01: 3/4 SDK-verified; 1 false-negative (see #1).

| From | To | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| `generator-shell.tsx` | `sandbox-preview.tsx` | `next/dynamic(..., { ssr: false })` after `isLoading` false | ✓ WIRED | Manual: `ssr: false` + named `SandboxPreview` import + mount only when `previewCode && !isLoading`. SDK pattern `ssr:\\s*false` did not match the source `ssr: false`. |
| `sandbox-preview.tsx` | `sandpack-files.ts` | `files={buildSandpackFiles(code)}` | ✓ WIRED | Import + call on Provider. |
| `layout.tsx` | `sandpack-css.tsx` | `<SandpackCss />` in `<head>` | ✓ WIRED | SDK + grep. |
| `sandpack-css.tsx` | `getSandpackCssText()` | `useServerInsertedHTML` style#sandpack | ✓ WIRED | Payload is library CSS only. |
| `sandbox-preview.tsx` | jsDelivr `@tailwindcss/browser@4.3.3` | `options.externalResources` | ✓ WIRED | Exact URL constant `TAILWIND_BROWSER`. |
| `preview-error.tsx` | `useErrorMessage` | child of `SandpackProvider` | ✓ WIRED | Hook in banner; banner rendered inside Provider. |
| `sandbox-preview.tsx` | `preview-error.tsx` | `<PreviewErrorBanner />` | ✓ WIRED | First child inside Provider, sibling above `SandpackLayout`. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `SandboxPreview` | `code` prop | `previewCode` ← `parseCode(completion)` on `isLoading` true→false ← `useCompletion({ api: "/api/generate" })` | Yes — live Gemini was confirmed to return clean default-exported Tailwind TSX; not hardcoded fixture in UI | ✓ FLOWING |
| `SandboxPreview` files | `buildSandpackFiles(code)` | generated snapshot + static `APP_WRAPPER` | Yes — component source is the snapshot; wrapper is intentional chrome | ✓ FLOWING |
| iframe Tailwind | `externalResources[0]` | pinned jsDelivr URL (not model-supplied) | CDN script at runtime (network); URL is real and pinned | ✓ FLOWING |
| `PreviewErrorBanner` | `message` | `useErrorMessage()` Sandpack context | Bundler compile/runtime string; `null` when healthy is the success path | ✓ FLOWING |
| `CodeView` | `parsed` | live `parseCode(completion)` (ungated) | Mid-stream tokens continue independently of preview snapshot | ✓ FLOWING |

No HOLLOW_PROP: `<SandboxPreview code={previewCode} />` is only rendered when `previewCode` is a non-empty string.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| `buildSandpackFiles` + `hasDefaultExport` contract | `npx vitest run src/lib/sandpack-files.test.ts` | 8/8 passed | ✓ PASS |
| Module exports | node ESM import of `sandpack-files.ts` | `COMPONENT_PATH=/Component.tsx`, `APP_PATH=/App.tsx`, wrapper imports Component, `hasDefaultExport` true/false as specified | ✓ PASS |
| Sandpack pin / no forbidden deps | lockfile + `package.json` | resolved `2.20.0`; no direct sandpack-client/themes; no host `@tailwindcss/browser` | ✓ PASS |
| Isolation grep | `eval(` / `new Function` / `cdn.tailwindcss.com` under src | zero matches | ✓ PASS |
| Live iframe paint / Tailwind color | browser generate→preview | not re-driven this session | ? SKIP → human |

Step 7b: skipped starting a server. Runnable unit entry point (Vitest) passed.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| PREV-01 | 02-01 | Generated component renders live inside a sandboxed Sandpack iframe (never in the host page) | ✓ SATISFIED | Isolation + snapshot mount + preview-only composition (truths 1–5) |
| PREV-02 | 02-02 | Tailwind styling applies correctly inside the preview | ✓ SATISFIED | `externalResources` v4 pin; v3 CDN absent (truths 6–7). Visual confirmation is human, not a coverage miss |
| PREV-03 | 02-02 | Preview shows a clear error state when generated code fails to render | ✓ SATISFIED | Overlay on + host `role=alert` + missing-default Portuguese alert while still mounting (truths 8–9) |

No orphaned REQUIREMENTS.md IDs for Phase 2. GEN-02 / EDIT-02 / UX-* are Phase 3. QUAL-02 (Playwright generate→preview) is Phase 4.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `src/components/generator/preview-error.tsx` | 7 | `return null` when `useErrorMessage()` is empty | ℹ️ Info | Success path, not a stub |
| `src/components/generator/generator-shell.tsx` | 41 | `previewCode` initial `null` | ℹ️ Info | Intentional unmount until first finished generation |
| `src/lib/sandpack-files.test.ts` | — | Tests files map only; do not mount `SandpackPreview` | ℹ️ Info | Misleading-if-overread: unit tests do not prove iframe paint. QUAL-02 is Phase 4 |
| `src/components/generator/preview-error.tsx` | — | No RTL test for the banner | ℹ️ Info | Plan 02 marked RTL optional; hook wiring is grep-verified |
| iframe `dark:` | — | Follows `prefers-color-scheme`, not host `next-themes` class | ℹ️ Info | RESEARCH A2 / OQ1; Phase 3 theme polish |

Inversion (3 ways this could still look wrong despite green tests): (1) jsDelivr `@4.3.3` 404 → unstyled iframe — only a visual/network check catches it; (2) files-map tests pass while bundler fails on real Gemini TSX — live POST was confirmed clean default-export TSX this session; (3) `showSandpackErrorOverlay` as a boolean attribute is equivalent to `{true}` — confirmed not `{false}`.

Confirmation-bias pass: (1) partial — class-based `dark:` matching host theme is **not** in this phase (RESEARCH); (2) misleading test — `sandpack-files.test.ts` never renders an iframe; (3) untested error path — no RTL for `PreviewErrorBanner`. None of these fail the phase goal given RESEARCH + QUAL-02 deferral.

Chesterton: `dangerouslySetInnerHTML` in `SandpackCss` is the locked stitches injection (T-02-03), not generated HTML. `APP_WRAPPER` hardcoded chrome is Pattern 2, not a hollow fixture.

### Human Verification Required

### 1. Live iframe after generate

**Test:** Open the app, submit a prompt (Phase 1 generate UI already validated). Wait for the stream to finish.
**Expected:** During the stream, Preview shows "Gerando preview…" and no Sandpack iframe. After finish, a Sandpack iframe paints the parsed component. Before the first generate, dashed copy is "O preview aparece aqui depois de gerar."
**Why human:** Browser automation could not re-drive the controlled textarea this session. Code proves the mount gate; paint is visual.

### 2. Tailwind utilities inside the iframe

**Test:** Generate (or inspect) a component using `bg-indigo-600`, spacing, `rounded`, and an `sm:` variant.
**Expected:** Those utilities are visibly applied inside the iframe. Network should request `cdn.jsdelivr.net/npm/@tailwindcss/browser@4.3.3`, not `cdn.tailwindcss.com`.
**Why human:** Host Tailwind never crosses the iframe; only a rendered preview proves PREV-02 visually.

### 3. Non-blank error panel

**Test:** Cause invalid TSX (and separately a named-only export without `export default`).
**Expected:** ErrorOverlay + host `role="alert"` (bundler message). Missing default: Portuguese alert **and** Sandpack still mounted — not a blank iframe.
**Why human:** Overlay/banner existence is coded; blank-vs-visible is a runtime visual check. Playwright is Phase 4.

### Gaps Summary

No implementation gaps. All 9 must-have truths, all planned artifacts, and all key links are present, substantive, and wired. Data flows from `/api/generate` → `parseCode` → `previewCode` snapshot → `buildSandpackFiles` → Sandpack iframe, with Tailwind injected via pinned `externalResources` and errors surfaced via overlay + host alert.

Remaining work is **human visual confirmation** of iframe paint, Tailwind color, and non-blank overlay — not missing code. QUAL-02 will automate generate→preview in Phase 4.

---

_Verified: 2026-10-15T05:05:00Z_
_Verifier: Claude (gsd-verifier)_
