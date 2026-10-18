---
phase: 09-e2e-demo-gif-docs
plan: 02
subsystem: docs
tags: [playwright, demo, gif, ffmpeg, screenshots]
requires: [mock model (UIFORGE_E2E_MOCK), dark-only layout, robot corner]
provides: [e2e/demo.spec.ts, scripts/demo-gif.mjs, npm run demo:gif, docs/demo.gif, dark-only docs/screenshot-dark.png]
affects: [DOCS-01]
tech-stack:
  added: []
  patterns: [DEMO=1 gated video spec, two-pass ffmpeg palette with size ladder, --convert-only reconversion, near-black floor filter to defeat animated-background frame churn]
key-files:
  created: [e2e/demo.spec.ts, scripts/demo-gif.mjs, docs/demo.gif]
  modified: [e2e/screenshots.spec.ts, package.json, docs/README.md, docs/screenshot-dark.png]
  deleted: [docs/screenshot-light.png]
decisions:
  - "The GIF is sped up 1.35x (DEMO_GIF_SPEED) because the real recording runs about 33 s (network, iframe mount and the 500 ms debounce); the output is 24.6 s, within D-05's 15-25 s"
  - "A near-black floor (lutrgb: channel < 26 -> 6, DEMO_GIF_FLOOR) flattens the faint animated topology lines and VP8 noise; without it even 720px/8fps/64 colours was 3.57 MB. The UI panels (#202020) and bright nodes are unaffected"
  - "Status waits in the demo use exact text because the robot bubble repeats the status ('Voltou para v1.') at 1600px"
metrics:
  duration: ~25min
  completed: 2026-10-18
---

# Phase 9 Plan 02: Demo GIF and Dark-only Screenshots Summary

A reproducible demo pipeline. `npm run demo:gif` records `e2e/demo.spec.ts` at 1600x900 against the mock: the prompt is typed key by key with the robot typing along, then generate, the "Cor mais forte" chip with Refinar, Desfazer, and a manual edit that turns "Acao" into "Assinar agora" while the preview updates. ffmpeg then converts the recording to `docs/demo.gif` (960px, at most 3 MB). The screenshot spec is now dark only.

## Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Demo spec, GIF script, npm script, dark-only screenshots, docs/README.md | 6640f2f | e2e/demo.spec.ts, scripts/demo-gif.mjs, package.json, e2e/screenshots.spec.ts, docs/README.md |
| 1 fix | Video options at file level | 8f8a05b | e2e/demo.spec.ts |
| 1 fix | Exact status text | dfc2003 | e2e/demo.spec.ts |
| 1 fix | GIF size: speed-up, floor filter, colour ladder | 85e88b0 | scripts/demo-gif.mjs, docs/README.md |
| 2 | Record and commit artifacts | de00ea9 | docs/demo.gif, docs/screenshot-dark.png, docs/screenshot-light.png (deleted) |

## Final GIF

- File: `docs/demo.gif`, **2,985,078 bytes (2.85 MB)**, 960x540, **12 fps**, **24.6 s**.
- Source: `test-results/demo/demo.webm`, 1600x900, 34.7 s.
- ffmpeg settings: input `-ss 1.5 -t 33.75`. Filters: `setpts=PTS/1.35, fps=12, scale=960:-1:flags=lanczos, format=rgb24, lutrgb=r/g/b='if(lt(val,26),6,val)'`.
  - Pass 1 builds the palette with `palettegen=max_colors=128:stats_mode=diff`.
  - Pass 2 applies it with `paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle`.
- Size ladder in this run: step 1 (960/12/256/bayer5) was 3.23 MB and over the limit, so step 2 (960/12/128/bayer3) was used at 2.85 MB.
- Frames checked visually at 2, 10, 16 and 24 s. They show, in order:
  - the prompt being typed, with the robot on screen;
  - v1 with FixtureCard and the "Pronto! Esta é a v1." bubble;
  - the undo to v1 with the history row dimmed;
  - the manual edit ("Editado" badge, "Edição manual (rascunho)") with "Assinar agora" in the preview.
- After the floor filter only the bright background nodes remain; the faint lines are gone.
- Seen in the frames: the page scrolls down a little after the chip and Refinar clicks, and the preview is blank white for a moment while the iframe remounts after undo. Neither blocks reading the flow.

## Verification

- Isolated copy used for the FINAL run: `C:\Users\mateu\AppData\Local\Temp\claude\C--Users-mateu-OneDrive--rea-de-Trabalho-projeto-portifolio\77b72327-b636-403a-84c1-43fa4f4640e3\scratchpad\e2e-run-0902c`. It is a git archive of dfc2003 with a node_modules junction, plus the 85e88b0 script copied in for the conversion only; that script is identical to the committed one, checked with diff.
- Playwright runs: 3 in total, all on port 3200 with no listener before each run:
  1. `e2e-run-0902`: `npm run demo:gif` failed at collection because `use({ video })` is not allowed in a describe.
  2. `e2e-run-0902b`: failed with a strict-mode match on "Voltou para v1" (the robot bubble repeats it).
  3. `e2e-run-0902c`: `DEMO=1 SCREENSHOTS=1 npx playwright test e2e/demo.spec.ts e2e/screenshots.spec.ts` gave **2 passed** (demo 34.1 s, screenshot 2.0 s).
- The GIF came from `npm run demo:gif -- --convert-only` in that copy, which does not run Playwright.
- `test -f docs/demo.gif && size <= 3145728 && test -f docs/screenshot-dark.png && test ! -f docs/screenshot-light.png`: OK.
- `npx vitest run`: 27 files, 418 tests passed. `npm run typecheck` and `npm run lint` are clean.
- `git diff` on package.json shows only the scripts block: a comma and the `"demo:gif": "node scripts/demo-gif.mjs"` line.
- ffmpeg is called as `ffmpeg` on PATH with an array of arguments and no shell. If it is missing, the script exits 1 with the "requires ffmpeg on PATH" message. Only `npx` on win32 uses `shell: true`, with constant arguments (T-09-03).

## Deviations from Plan

1. **[Rule 1 - Bug] `test.use({ video })` moved to file level** (8f8a05b). Playwright refuses video options inside a describe because they force a new worker.
2. **[Rule 1 - Bug] Exact status matches** (dfc2003). At 1600px the robot speech bubble repeats the status text.
3. **[Rule 3 - Blocking] GIF size** (85e88b0). The animated background changes almost every pixel on every frame, so even the smallest ladder step (720/8/64) was 3.57 MB. The plan-checker's colour/dither ladder plus `--convert-only`, `-ss` and `-t` were added. Two more steps were also needed:
   - a 1.35x speed-up, because the real run is 33 s and `-t 25` alone would cut the manual edit;
   - a near-black floor filter.
   Both can be tuned through env vars (`DEMO_GIF_SPEED`, `DEMO_GIF_FLOOR`, `DEMO_GIF_START`, `DEMO_GIF_MAX`).
4. **Combined final run.** The last Playwright run recorded the demo and took the screenshot in one invocation, and the conversion ran with `--convert-only`. This kept the plan within its 3-run limit.

## Notes for 09-03

- `README.md:18` and `README.pt-BR.md:18` still reference `docs/screenshot-light.png`, which is now deleted. Plan 09-03 must remove those lines (D-09) and link `docs/demo.gif` (D-08).

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: e2e/demo.spec.ts, scripts/demo-gif.mjs, docs/demo.gif, docs/screenshot-dark.png; docs/screenshot-light.png absent
- FOUND commits: 6640f2f, 8f8a05b, dfc2003, 85e88b0, de00ea9
