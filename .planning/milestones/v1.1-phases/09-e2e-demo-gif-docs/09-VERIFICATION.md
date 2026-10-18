---
phase: 09-e2e-demo-gif-docs
verified: 2026-10-18T12:00:00Z
status: passed
score: 15/15 must-haves verified (3 roadmap SCs + 12 plan truths)
overrides_applied: 0
---

# Phase 9: E2E, Demo GIF & Docs Verification Report

**Phase Goal:** The whole refine journey is proven by automated tests and showcased in a reproducible demo and up-to-date READMEs
**Verified:** 2026-10-18
**Status:** passed
**Re-verification:** No (initial verification)

## Goal Achievement

### Roadmap Success Criteria

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC1 | E2E passes generate → refine → undo → edit → refine-after-edit → failed refine keeps previous version, with the mock in refine mode and selectors updated for "Refinar" | VERIFIED | `e2e/journey.spec.ts`: one serial test runs all six steps. Refine request `postDataJSON().currentCode` contains `FixtureCard`, and after the edit it contains `__edited__`/`marca-journey`. The final states asserted are `Pronto — v1/v2/v3`, `Voltou para v1`, srcdoc `Refinado`/`EditedSeen`, `Edição manual` in the history list, and the `__e2e_error__` alert "Sua versão anterior foi mantida" with srcdoc, editor value and `v3 · 3 versões` unchanged. "Refinar" uses `exact: true`. Mock support was confirmed in `src/lib/ai/mock-model.ts` (`__e2e_error__`, `__edited__` → `EditedSeen`, `Refinado`). Run evidence comes from the orchestrator's isolated copy run on HEAD 99383f8 (13 passed). CI runs `npx playwright test`, which picks up `e2e/*.spec.ts`. |
| SC2 | `docs/demo.gif` (≤ ~3 MB) recorded from the deterministic mock, shows generate → refine → undo → manual edit, linked from both READMEs with alt text | VERIFIED | `docs/demo.gif` is tracked and 2,985,078 B (2.85 MiB, under 3 MiB). ffprobe: 960x540, 12 fps, 295 frames, 24.58 s. I pulled frames out of the GIF and looked at them: the prompt being typed (t=6 s), `Pronto — v2` with the `Refinado` preview and the chip instruction as v2 (t=14 s), and `Voltou para v1` with an `Editado` badge, an "Edição manual (rascunho)" row and the preview showing "Assinar agora" (t=23 s). The mock fixture is visible. EN alt text: `![UIForge demo: generate, refine, undo and edit the code](docs/demo.gif)`. PT alt text: `![Demonstração do UIForge: gerar, refinar, desfazer e editar o código](docs/demo.gif)`. |
| SC3 | Both READMEs (PT/EN) document iterative refinement, version history, editable code and the refine API contract | VERIFIED | Both files are 178 lines and their headings match 1:1. Features: refine, Novo componente, chips, history (restore, dimmed later versions, 20 cap, Ctrl/⌘+Z), editable code (Editado, draft, 500 ms, Edição manual, Esc then Tab). The API section covers `/api/generate { prompt, currentCode? }` and `/api/suggest`. |

### Plan Must-Have Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| D-01 | One serial journey test covering all six steps (v2/v3 numbering corrected to match the reducer) | VERIFIED | `test.describe.configure({ mode: "serial" })` with a single test. The numbering matches the corrected CONTEXT D-01 (commit 47132dd). |
| D-02 | generate.spec.ts and the existing conventions are reused; the smoke spec is not modified | VERIFIED | The last commit to `e2e/generate.spec.ts` is 6e617f7 (phase 08), so phase 9 did not touch it. The journey uses the IFRAME constant, exact role names and `Refinar` with exact: true. screenshots.spec.ts was intentionally changed for D-09 and WR-03. |
| D-03 | Only final states and network requests are asserted, with no transient badges | VERIFIED | `waitForRequest`/`waitForResponse` + `postDataJSON`. The spec contains no "Atualizando…" assertion. |
| P1-4 | The journey and generate.spec pass together on E2E_PORT=3200 | VERIFIED | Orchestrator evidence: isolated run, 13 passed. `playwright.config.ts` reads `E2E_PORT` (default 3100). |
| D-04 | demo.spec is DEMO=1 gated with video; `demo:gif` uses a two-pass palettegen/paletteuse; ffmpeg is a system tool with a clear error when absent | VERIFIED | `test.skip(process.env.DEMO !== "1")`, `video: { mode: "on" }`. The `package.json` `demo:gif` script runs `node scripts/demo-gif.mjs`. The script probes `ffmpeg -version` and fails with an install hint, then runs palettegen (stats_mode=diff) and paletteuse. ffmpeg is not in dependencies. |
| D-05 | Dark theme, prompt typed key by key, generate, chip refine, undo, manual edit with the preview updating, about 15-25 s | VERIFIED | `pressSequentially(..., { delay: 45 })`, the "Cor mais forte" chip, Desfazer, and "Assinar agora" typed over "Acao" in the editor. The GIF is 24.6 s and the frames confirm each step. |
| D-06 | 1600x900 viewport, about 960 px wide, 10-12 fps, ≤ 3 MB, and a ladder that lowers the settings when over | VERIFIED | `test.use({ viewport: 1600x900 })`. The GIF is 960 px at 12 fps and 2.85 MiB. The LADDER steps down colours, fps and width, and `docs/demo.gif` is replaced only when a step fits under the cap (WR-01 fix). |
| D-07 | Never waits on Spline or three.js | VERIFIED | The demo waits only on status text (`getByText`, exact) and the preview iframe/frameLocator. |
| D-09 | Screenshots are dark-only and screenshot-light.png is deleted | VERIFIED | `docs/` contains only demo.gif, README.md and screenshot-dark.png. `screenshot-light.png` is not tracked, and neither README references it. screenshots.spec captures a single dark image. |
| D-08 | GIF at the top of the Demo section in both READMEs with the exact alt texts, and the placeholder removed | VERIFIED | Line 16 of both files, directly under the "Demo" heading. No commented placeholder remains. |
| D-10 | READMEs cover refine, Novo componente, chips, history, editable code, and the dark-only UI with the topology background and robot | VERIFIED | Feature bullets on lines 26-33 of both files. |
| D-11 | API contract numbers match the code | VERIFIED | The README numbers match the code. Details are in the cross-check below. |
| D-12 | Testing/roadmap/architecture/env vars updated in both READMEs; `.env.example` not edited in phase 9 | VERIFIED | The Testing strategy section covers the journey spec, E2E_PORT, DEMO=1 and SCREENSHOTS=1, and the Architecture section covers session.ts, the suggest route and code-view. The env list includes SUGGEST_RATE_LIMIT_*. The working-tree change to `.env.example` was already there before this phase (it is listed in git status at session start) and is not a phase-9 commit. |

**Score:** 15/15 truths verified

### README Facts vs Code (D-11)

| Claim | Code | Match |
|-------|------|-------|
| prompt ≤ 2,000 | `MAX_PROMPT_LENGTH = 2000` (src/lib/prompt-limits.ts) | yes |
| code ≤ 30,000 | `MAX_CODE_LENGTH = 30_000` | yes |
| body > 256,000 B → 413 | `MAX_BODY_BYTES = 256_000` in both routes | yes |
| 413 checked before the rate limit | route.ts: the 413 on line 65 comes before the 429 on line 71 | yes |
| 429 `rate_limited` + Retry-After, 500 missing key, 502 `generate_failed`/`suggest_failed` | generate/suggest route.ts | yes |
| RATE_LIMIT defaults 5 / 60000; SUGGEST 10 / 60000 | src/lib/rate-limit.ts | yes |
| suggest: 5 s per model, 9 s budget, 12 s client | src/lib/suggest.ts | yes |
| ≤ 4 suggestions, label ≤ 30, instruction ≤ 300 | `MAX_SUGGESTIONS/LABEL/INSTRUCTION` | yes |
| fallback list (Modo escuro, Mais espaçamento, Adicionar ícone, Animação no hover) | `FALLBACK_SUGGESTIONS` | yes |
| models 3.8-flash → 3.6-flash → 3.5-flash-lite; suggest 3.5-flash-lite → 3.6-flash | src/lib/ai/model.ts | yes |
| maxDuration 60 / 30 | the two route.ts files | yes |
| 20-version cap, 500 ms debounce | `MAX_VERSIONS = 20`, `useDebouncedDraft(..., 500)` | yes |
| E2E_PORT default 3100 | playwright.config.ts | yes |

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `e2e/journey.spec.ts` | VERIFIED | 103 lines and contains `__e2e_error__` and `currentCode`. It is picked up by testMatch and CI. |
| `e2e/demo.spec.ts` | VERIFIED | Gated by DEMO and spawned by demo-gif.mjs. |
| `scripts/demo-gif.mjs` | VERIFIED | Contains palettegen, validated env vars and a temp output. It is wired to `npm run demo:gif`. |
| `docs/demo.gif` | VERIFIED | 2.85 MiB, 960x540, 12 fps. Tracked and linked from both READMEs. |
| `docs/screenshot-dark.png` | VERIFIED | Tracked and linked from both READMEs. |
| `README.md` / `README.pt-BR.md` | VERIFIED | Both link docs/demo.gif, and their contents match section for section. |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| journey.spec.ts | POST /api/generate body.currentCode | waitForRequest + postDataJSON | WIRED |
| package.json | scripts/demo-gif.mjs | `"demo:gif": "node scripts/demo-gif.mjs"` | WIRED |
| scripts/demo-gif.mjs | e2e/demo.spec.ts | `npx playwright test e2e/demo.spec.ts` with DEMO=1 | WIRED |
| README.md | docs/demo.gif | markdown image with the exact EN alt text | WIRED |
| README.pt-BR.md | docs/demo.gif | markdown image with the exact PT alt text | WIRED |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| GIF size, dimensions and length | `ffprobe docs/demo.gif` | 2985078 B, 960x540, 12/1 fps, 24.58 s | PASS |
| GIF shows the refine flow | ffmpeg frame extraction at 6/14/23 s, inspected visually | typing → v2 Refinado → v1 + manual edit "Assinar agora" | PASS |
| Unit suite | `npx vitest run` | 27 files, 418 tests passed | PASS |
| Typecheck | `npm run typecheck` | clean | PASS |
| Lint | `npm run lint` | clean | PASS |
| E2E (journey, smoke, screenshots, demo) | not run (per instructions) | orchestrator isolated run: 13 passed on 99383f8 | PASS (external evidence) |

### Probe Execution

Not applicable: the phase declares no probe scripts.

### Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
|-------------|-------------|--------|----------|
| QUAL-07 | 09-01 | SATISFIED | journey.spec.ts plus the mock refine and error modes (SC1) |
| DOCS-01 | 09-02, 09-03 | SATISFIED | docs/demo.gif ≤ 3 MB, from the mock, shows the flow, linked from both READMEs with alt text (SC2) |
| DOCS-02 | 09-03 | SATISFIED | Both READMEs document refinement, history, editable code and the API contract (SC3) |

No orphaned requirements: REQUIREMENTS.md maps only QUAL-07, DOCS-01 and DOCS-02 to Phase 9. Their checkboxes there still say "Pending", which is bookkeeping for the orchestrator.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (phase files) | - | TBD/FIXME/XXX/TODO/HACK | none found | - |
| e2e/journey.spec.ts | ~92 | `srcdocBefore ?? ""` (review IN-02, left by choice) | Info | A null capture would weaken the assertion, but srcdoc is asserted non-null earlier in practice |
| e2e/journey.spec.ts | 18 | serial mode on a single test (IN-03) | Info | No-op |
| scripts/demo-gif.mjs | - | `--convert-only` depends on test-results (IN-04); relative paths need the repo-root cwd (IN-06) | Info | Documented, and `npm run` always starts from the repo root |

### Human Verification Required

None blocking. Optional: open the README on GitHub once after pushing to confirm the 2.85 MB GIF autoplays inline. I already checked the frame content above.

### Gaps Summary

No gaps. Every roadmap success criterion and plan must-have is backed by code. The GIF meets the size cap and shows the required flow, both READMEs match each other and the code, and the quality gates pass. Review findings IN-02/03/04/06 are informational and were left out of scope on purpose.

---

_Verified: 2026-10-18_
_Verifier: Claude (gsd-verifier)_
