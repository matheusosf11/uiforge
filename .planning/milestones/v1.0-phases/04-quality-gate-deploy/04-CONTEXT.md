# Phase 4: Quality Gate & Deploy - Context

**Gathered:** 2026-10-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver QUAL-01..05: the app is unit-tested (Vitest + RTL), covered by a Playwright e2e of the generate-to-preview flow, validated by GitHub Actions CI on every push, deployed publicly on Vercel with a shareable link, and documented by an interview-ready README. Also folded in by user decision: a best-effort per-IP rate limit (D-08..D-10) and the pending Phase 3 WR-08 preview color-scheme fix (D-17).

</domain>

<decisions>
## Implementation Decisions

### E2E without spending Gemini
- **D-01:** Playwright never calls real Gemini. A test-only env var (e.g. `UIFORGE_E2E_MOCK=1`) makes the route use the AI SDK's mock language model (`MockLanguageModelV*` from `ai/test` or equivalent) that streams a fixed, valid React + Tailwind component. Deterministic, free, no API key in CI.
- **D-02:** Mock is selected **only** when the test env var is set. It must be impossible to activate in production (env var never configured on Vercel; no request-controlled switch without it). The model selection lives next to `src/lib/ai/model.ts`.
- **D-03:** Scenario selection via prompt keyword: when mock mode is on, a prompt containing `__e2e_error__` makes the mock fail **mid-stream** (after some tokens); any other prompt streams the fixed component successfully.
- **D-04:** E2E scenarios (all required): (1) happy path — prompt → streamed code → status “Pronto” → preview iframe mounts the component; (2) mid-stream error → `role="alert"` with “Tentar de novo” → retry re-sends the last prompt; (3) Copiar / Baixar — clipboard content and downloaded filename `{ComponentName}.tsx`; (4) mobile viewport (< 768px) — tabs “Preview” | “Código” switch panels.
- **D-05:** Chromium only.
- **D-06:** E2E runs against the **production build**: Playwright `webServer` runs `next build && next start` with the mock env var set.

### CI (GitHub Actions)
- **D-07:** Triggers: push to any branch + pull_request. `concurrency` cancels superseded runs on the same ref.
- **D-07a:** Two parallel jobs: `check` (lint, `tsc --noEmit`, vitest, `next build`) and `e2e` (Playwright Chromium with mock). Node 22, npm cache, Playwright browser cache, upload Playwright report as artifact on failure.
- **D-07b:** Vitest coverage report (v8) generated but **no threshold gate**.
- **D-07c:** Pin Node 22 LTS via `engines` in package.json and `.nvmrc` so CI and Vercel match. npm (existing `package-lock.json`).

### Public demo protection (rate limit)
- **D-08:** Simple **in-memory** per-IP rate limit in the generate route: **5 generations / minute / IP**, sliding window. Values configurable via env with these defaults. IP from `x-forwarded-for` (first entry) / `x-real-ip`, with a fallback bucket.
- **D-09:** Documented as best-effort: memory is per serverless instance, so it limits casual abuse only, not distributed attacks. This is a partial, deliberate pull-forward of PLAT-01 (real distributed limit, e.g. Upstash, stays v2). PROJECT.md "Out of Scope: Rate limiting" must be updated to reflect this nuance.
- **D-10:** On limit: route returns HTTP 429 with error code `rate_limited` and a `Retry-After` header — **reuses** the existing Phase 3 friendly 429 alert + “Tentar de novo” (D-13/D-14 of Phase 3). No new UI copy.
- **D-11:** Production uses a **separate** Gemini API key from the dev key. Env var `GOOGLE_GENERATIVE_AI_API_KEY` is scoped to the Vercel **Production** environment only; Preview deployments have no key and fail gracefully with the existing friendly error.

### GitHub + Vercel
- **D-12:** Public GitHub repository; rename local branch `master` → `main` before first push. Repo creation (`gh repo create`), push, and any Vercel/GitHub settings are external actions — executor prepares everything, then **pauses for explicit user confirmation** before creating/pushing.
- **D-13:** Deploy through the **Vercel Git integration** (user imports the repo in the Vercel dashboard and sets the env var). GitHub Actions only validates; it does not deploy. Domain: default `*.vercel.app` (e.g. `uiforge-*.vercel.app`).
- **D-14:** Streaming function config: keep Node runtime and `maxDuration = 60` (already present in `src/app/api/generate/route.ts`); default region. Researcher should just confirm current Vercel Hobby limits still allow it.
- **D-15:** No branch protection — solo project, direct commits to `main`; CI status shown via README badge.
- **D-16:** Repo metadata: MIT `LICENSE`; GitHub "About" (description, topics like `nextjs`, `react`, `tailwindcss`, `ai`, `gemini`, `vercel-ai-sdk`, deploy URL) set via `gh` after the repo exists (external — confirm first); Open Graph / metadata in `src/app/layout.tsx` (title, description, `og:image`) so the link previews well on LinkedIn.

### Preview color-scheme (Phase 3 WR-08)
- **D-17:** Force the preview iframe to **always light**: `color-scheme: light` (replace `light dark` in `src/lib/preview-srcdoc.ts`). This **supersedes Phase 3 D-10's** "generated `dark:` utilities follow the iframe's own prefers-color-scheme": the preview is a consistent white product surface; native controls/scrollbars stay light. Update the related test.

### README
- **D-18:** Bilingual: `README.md` (English, canonical) + `README.pt-BR.md` (faithful translation, same structure/sections). Language switcher link at the top of both; diagrams and images shared.
- **D-19:** Media: a screenshot (light + dark host theme) generated by Playwright, plus a placeholder for a flow GIF (prompt → streaming → preview) that the user records after deploy.
- **D-20:** Interview-ready depth: live demo link + CI badge; setup (Node 22, `.env.local`, Gemini key from AI Studio); architecture with a mermaid diagram (client shell → `/api/generate` streaming → code parse → sandboxed `srcdoc` iframe); **sandbox threat model** (what `sandbox="allow-scripts"` without `allow-same-origin` isolates and what it does not — e.g. CPU/infinite loops, outbound network from the iframe, phishing-looking UI); trade-offs (Gemini free tier, srcdoc iframe vs Sandpack, in-memory rate limit, mock model in e2e, always-light preview); what was cut / v2 roadmap (auth, history, iterative refinement, distributed rate limit, multi-file); testing strategy; note that the UI is in Portuguese.

### Claude's Discretion
- Exact mock-model API (whichever the installed `ai@7` exposes) and the fixed component used by the mock.
- Rate-limit data structure and cleanup; env var names.
- Workflow file layout, cache keys, Playwright config details, screenshot automation.
- Mermaid diagram shape and README section order.
- Whether to remove now-unused Sandpack leftovers — only if verified unused; otherwise leave and note.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scope & requirements
- `.planning/ROADMAP.md` §Phase 4 — goal, success criteria, suggested plan split (04-01 tests, 04-02 CI + deploy, 04-03 README)
- `.planning/REQUIREMENTS.md` — QUAL-01..05; PLAT-01 (rate limit, v2 — partially pulled forward per D-08/D-09)
- `.planning/PROJECT.md` — constraints (free tier, Vercel, sandbox security), Out of Scope (needs nuance update for rate limit)

### Prior phase decisions
- `.planning/phases/03-export-examples-accessible-ux/03-CONTEXT.md` — D-10 (superseded by D-17 here), D-13/D-14 (429 alert reused by D-10 here), D-15 aria-live
- `.planning/phases/03-export-examples-accessible-ux/03-REVIEW.md` / `03-REVIEW-FIX.md` — WR-08 origin
- `.planning/phases/03-export-examples-accessible-ux/03-HUMAN-UAT.md` — pending manual checks; e2e scenarios D-04 automate parts of them
- `.planning/phases/02-sandboxed-live-preview/02-CONTEXT.md` — sandbox preview decisions (README threat model source)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/ai/model.ts` — single model export consumed by the route; natural injection point for the mock (D-01/D-02).
- `src/app/api/generate/route.ts` — already `runtime = "nodejs"`, `maxDuration = 60`, Zod schema with `MAX_PROMPT_LENGTH`, 429/502 via `failureResponse` + `isRateLimitError`; rate limit check goes before `streamText`.
- `src/lib/generate-error.ts` — error classification; 429 `rate_limited` code already mapped to friendly copy.
- `src/lib/preview-srcdoc.ts` — builds iframe `srcdoc`; contains `<meta name="color-scheme" content="light dark">` (D-17 change).
- `src/components/generator/sandbox-preview.tsx` — iframe with `sandbox="allow-scripts"` (threat model source).
- Existing Vitest suite (60 tests) incl. `src/lib/parse-code.test.ts`, `route.test.ts` — QUAL-01 mostly satisfied; extend for rate limit and mock selection.

### Established Patterns
- Vitest + jsdom + RTL, `@/` alias (`vitest.config.ts`, `vitest.setup.ts`); co-located `*.test.ts(x)`.
- UI copy in Portuguese; aria-live status “Gerando…”/“Pronto”; failures `role="alert"`.
- `.env.local` gitignored and never committed (verified) — safe to make repo public; `.env.example` documents the key.

### Integration Points
- No `.github/`, no Playwright, no `vercel.json`, no git remote yet; branch is `master`.
- Preview is a `srcdoc` iframe; `@codesandbox/sandpack-react` is still a dependency used only by `preview-error.tsx` / `sandpack-css.tsx` / `sandpack-files.ts` helpers — README must describe the actual architecture.
- `src/app/layout.tsx` `metadata` — extend for Open Graph (D-16).

</code_context>

<specifics>
## Specific Ideas

- Mock error keyword: `__e2e_error__`.
- Rate limit default: 5/min/IP, sliding window, 429 + `Retry-After`.
- External actions (create GitHub repo, push, set About, Vercel import/env) require explicit user go-ahead at execution time.

</specifics>

<deferred>
## Deferred Ideas

- Distributed/durable rate limiting (Upstash or similar) — PLAT-01, v2.
- Multi-browser e2e (Firefox/WebKit) — remains manual UAT (03-HUMAN-UAT item 5).
- Custom domain — later, if desired.
- Branch protection / required checks — not needed for solo project.

</deferred>

---

*Phase: 04-quality-gate-deploy*
*Context gathered: 2026-10-16*
