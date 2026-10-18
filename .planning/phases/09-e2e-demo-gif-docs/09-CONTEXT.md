# Phase 9: E2E, Demo GIF & Docs - Context

**Gathered:** 2026-10-18 (auto mode: the user authorized autonomous work overnight; recommended options chosen, listed below for review)
**Status:** Ready for planning

<domain>
## Phase Boundary

Close milestone v1.1 with three things:

1. One end-to-end journey test of the whole refine loop on the deterministic mock.
2. A reproducible demo GIF (`docs/demo.gif`) recorded from the mock.
3. Both READMEs (EN `README.md`, PT `README.pt-BR.md`) updated for refine, history, editable code and the refine/suggest API contract.

Requirements: QUAL-07, DOCS-01, DOCS-02.

Out of scope: new product features, deploy and push. The user will push/deploy; nothing is pushed in this phase.
</domain>

<decisions>
## Implementation Decisions

### Carried forward / user decisions made outside the GSD flow (do not re-ask)
- The site is **dark-only**. The theme toggle was removed and `forcedTheme="dark"` is set in `src/app/layout.tsx` (user request, 2026-10-18).
- A decorative interactive 3D robot (Spline) sits in the bottom-left corner on viewports ≥ 1536px with motion allowed. It mirrors the status, shows white speech bubbles, types along while the user writes and suggests a prompt on click.
- The background is the TopologyField three.js iframe: dark only, skipped for reduced motion, SRI-pinned.
- `E2E_PORT` env var selects the e2e server port (default 3100). Ports 3000 and 3100 may be taken by the user's other local servers. Run e2e with `E2E_PORT=3200`.
- The mock model is env-gated (`UIFORGE_E2E_MOCK=1`). It returns FixtureCard, a "Refinado" variant for refine, and a `__e2e_error__` prompt for failures.

### E2E journey (QUAL-07)
- **D-01:** Add a new spec, `e2e/journey.spec.ts`, with ONE serial test that runs: generate → refine (v2) → undo (back to v1) → manual edit (draft) → refine after the edit (the request's `currentCode` contains the edit; "Edição manual" v3 then v4) → a failed refine via `__e2e_error__` keeps the previous version (code and preview unchanged, alert shown).
- **D-02:** Keep the existing smoke specs as they are. The journey reuses the same selector conventions:
  - the IFRAME constant for the preview;
  - exact role names;
  - status text matched as a substring;
  - "Refinar" exact.
- **D-03:** No timing-racy assertions on transient badges. Assert final states and network requests instead.

### Demo GIF (DOCS-01)
- **D-04:** Record the demo with a Playwright script gated like the screenshots spec. Use `e2e/demo.spec.ts`, skipped unless `DEMO=1`, with `recordVideo` against the mock server. Then convert to GIF with ffmpeg using a two-pass palette (`palettegen`/`paletteuse`).
  - ffmpeg is installed on the user's machine but is NOT a project dependency. Document "requires ffmpeg on PATH" and add an npm script such as `demo:gif` (a small Node script under `scripts/`) that runs the spec and the conversion.
- **D-05:** Flow shown, all in the dark theme:
  1. type a prompt; the robot types along on wide viewports;
  2. generate;
  3. refine with a chip or an instruction;
  4. undo;
  5. a manual edit in the code editor, with the preview updating.

  Keep it short, about 15–25 s. Add small pauses so each step is readable.
- **D-06:** Viewport 1600×900 so the robot mascot appears. Output about 960px wide at 10–12 fps. Target ≤ 3 MB; if over, lower the fps or width. The output is `docs/demo.gif`.
- **D-07:** External assets (the Spline scene and three.js from cdnjs) load during recording. If they fail to load, the demo still works without them; do not block on them.

### READMEs (DOCS-02)
- **D-08:** In both READMEs, put the GIF at the top of the Screenshots/Demo section. Use alt text "Demonstração do UIForge: gerar, refinar, desfazer e editar o código" (PT) and "UIForge demo: generate, refine, undo and edit the code" (EN). Replace the commented placeholder.
- **D-09:** Screenshots become dark only:
  - update `e2e/screenshots.spec.ts` to capture only dark;
  - regenerate `docs/screenshot-dark.png`;
  - remove `docs/screenshot-light.png` and its README references.
- **D-10:** Feature sections to document:
  - refine-by-default after v1, the "Novo componente" reset and suggestion chips;
  - the version history list (restore, dimmed later versions, the 20-version cap, Ctrl/⌘+Z);
  - the editable code (draft, "Edição manual", Esc then Tab);
  - the dark-only UI with the topology background and the 3D robot mascot (one short line).
- **D-11:** API contract section:
  - `POST /api/generate` takes `{ prompt, currentCode? }`. With `currentCode`, refine mode returns the full updated component, as a plain text stream. Limits are 2,000 prompt chars and 30,000 code chars; errors are 413 `code_too_large`, 429 with `Retry-After`, and 502.
  - `POST /api/suggest` takes `{ code }` and returns `{ suggestions: [{label, instruction}] }`. It has its own rate-limit bucket (`SUGGEST_RATE_LIMIT_MAX`/`_WINDOW_MS`), a 5 s per-model timeout inside a 9 s server budget (client waits 12 s), and falls back to a fixed pt-BR list.
  - Use the actual numbers from the code (`src/lib/prompt-limits.ts`, `src/lib/suggest.ts`, the route files). Never invent them.
- **D-12:** Update these sections for v1.1:
  - Testing strategy: the journey spec, `E2E_PORT`, `DEMO=1`, `SCREENSHOTS=1`;
  - What was cut / roadmap;
  - Architecture: the session reducer, `/api/suggest`, the code editor;
  - env vars: add the `SUGGEST_RATE_LIMIT_*` lines to `.env.example` documentation. The user's uncommitted `.env.example` already has these lines, so DO NOT edit or stage `.env.example`; just document them in the README.

  Both READMEs must stay equivalent in content.

### Claude's Discretion
- Exact journey assertions, demo script pacing, ffmpeg parameters, README wording and section order (keep the existing structure).
</decisions>

<canonical_refs>
## Canonical References

- `.planning/ROADMAP.md` §Phase 9 — success criteria
- `.planning/REQUIREMENTS.md` — QUAL-07, DOCS-01, DOCS-02
- `e2e/generate.spec.ts`, `e2e/screenshots.spec.ts`, `playwright.config.ts` — existing e2e conventions
- `src/lib/ai/mock-model.ts`, `src/lib/suggest.ts`, `src/lib/prompt-limits.ts`, `src/app/api/generate/route.ts`, `src/app/api/suggest/route.ts` — contract facts
- `README.md`, `README.pt-BR.md` — current docs (v1.0)
- `.planning/phases/08-editable-code-view/08-CONTEXT.md`, `.planning/phases/07-turn-list-version-navigation/07-CONTEXT.md`, `.planning/phases/06-session-core-refine-loop/06-CONTEXT.md` — feature behavior to document
</canonical_refs>

<deferred>
## Deferred Ideas

None.
</deferred>

---

*Phase: 09-e2e-demo-gif-docs*
*Context gathered: 2026-10-18 (auto)*
