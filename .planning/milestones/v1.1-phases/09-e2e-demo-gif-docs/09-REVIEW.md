---
phase: 09-e2e-demo-gif-docs
reviewed: 2026-10-18T12:00:00Z
depth: quick
files_reviewed: 8
files_reviewed_list:
  - e2e/journey.spec.ts
  - e2e/demo.spec.ts
  - e2e/screenshots.spec.ts
  - scripts/demo-gif.mjs
  - package.json
  - docs/README.md
  - README.md
  - README.pt-BR.md
findings:
  critical: 0
  warning: 4
  info: 7
  total: 11
status: issues_found
---

# Phase 9: Code Review Report

**Reviewed:** 2026-10-18T12:00:00Z
**Depth:** quick (with targeted spot-checks against source)
**Files Reviewed:** 8
**Status:** issues_found

## Summary

I reviewed the journey, demo and screenshot specs, the `demo:gif` script and npm script, and the three READMEs. I spot-checked every number and name in the READMEs against the code: `prompt-limits.ts` (2000 / 30_000), `suggest.ts` (5_000 / 9_000 / +3_000, max 4 suggestions, label 30, instruction 300, fallback labels), `rate-limit.ts` (defaults 5 and 10 per 60_000, env var names), both route files (413 checked before 429, 256_000-byte body cap, 500 missing key, 502 `generate_failed` / `suggest_failed`, `maxDuration` 60 / 30), `model.ts` (model ids and order), `session.ts` (`MAX_VERSIONS = 20`), the 500 ms debounce, the 1536px robot threshold, the vendored runtime versions, the CI job names (`check`, `e2e`), and the LICENSE / `.nvmrc` / `ci.yml` / `docs/*` link targets. All of them match. The EN and PT READMEs have the same structure (identical heading and bullet line layout) and the same numbers. `docs/demo.gif` is 2,985,078 bytes, under the 3 MiB cap.

Robot speech bubble collisions: the bubble text is rewritten ("Pronto! Esta é a v1.", "Voltou para v1."), so the demo spec's exact matchers at 1600px are safe. The journey spec's substring matchers are only safe because the default viewport (1280px) hides the robot (see WR-03). Iframe locators are scoped by `title="Live preview"` everywhere.

On Windows, the script passes ffmpeg its arguments as an array without a shell, using relative paths. A project path with spaces or accents ("Área de Trabalho") therefore never reaches a command line. A missing ffmpeg is caught by the `-version` probe, which prints a clear message. I found no blockers. The main problems are that the script overwrites `docs/demo.gif` in place and does not validate its env-var inputs.

## Warnings

### WR-01: demo-gif writes straight to the tracked `docs/demo.gif`, so a failed or oversized run destroys the committed asset

**File:** `scripts/demo-gif.mjs:96-110`
**Issue:** Each step of the size ladder writes pass 2 directly to `OUTPUT` (`docs/demo.gif`). Several things leave the committed GIF replaced by a broken or out-of-spec file, and the script still exits 1:
- ffmpeg fails partway (corrupt file, a Ctrl+C, a disk-full error);
- every step stays over 3 MB (the last, oversized attempt stays in place).

The only way back is `git checkout docs/demo.gif`.
**Fix:** Render to a temp file and replace the output only on success:
```js
const TMP = join("test-results", "demo", "demo.tmp.gif");
// pass 2 writes TMP instead of OUTPUT
size = statSync(TMP).size;
if (size <= MAX_BYTES) { copyFileSync(TMP, OUTPUT); break; }
```

### WR-02: Tuning env vars are not validated (NaN, 0 or negative values give broken ffmpeg filters)

**File:** `scripts/demo-gif.mjs:22-25,36,87`
**Issue:** `Number(process.env.DEMO_GIF_SPEED ?? 1.35)` turns `"abc"` into `NaN`, and `"0"` gives `setpts=PTS/0`. Bad values for `DEMO_GIF_START` and `DEMO_GIF_MAX` also flow into `-ss NaN` and `-t NaN`. These produce cryptic ffmpeg errors, or a 0 s or effectively unbounded input, instead of a clear message. Only `FLOOR` is clamped, and even `FLOOR` turns `NaN` into the string `NaN` (`Math.round(NaN)` is `NaN`, and `Math.max(0, NaN)` is `NaN`), which makes the `lutrgb` expression invalid.
**Fix:** Add a helper and use it for all four values:
```js
function num(name, def, { min = 0, gt = false } = {}) {
  const raw = process.env[name];
  const v = raw === undefined || raw === "" ? def : Number(raw);
  if (!Number.isFinite(v) || (gt ? v <= min : v < min)) fail(`${name} must be a number ${gt ? ">" : ">="} ${min} (got ${raw})`);
  return v;
}
const SPEED = num("DEMO_GIF_SPEED", 1.35, { gt: true });
```

### WR-03: Substring status matchers in the journey and screenshot specs collide with the robot bubble whenever the robot renders

**File:** `e2e/journey.spec.ts:48` (and `:29,42,73`), `e2e/screenshots.spec.ts:186`
**Issue:** `page.getByText("Voltou para v1")` is a substring match, and the robot bubble says `Voltou para v1.`. On a viewport of 1536px or more with motion allowed, two elements match, Playwright raises a strict-mode violation, and the test fails. The same goes for `getByText("Pronto")` in the screenshot spec against the bubble `Pronto! Esta é a v1.`. The tests pass today only because they inherit the 1280px Desktop Chrome viewport. This is an implicit dependency. It breaks if someone bumps the viewport, reuses these helpers in the 1600px demo spec, or changes the screenshot viewport to show the mascot.
**Fix:** Scope status assertions to the status region, or use `exact: true` as `demo.spec.ts` already does:
```ts
const status = page.getByRole("status"); // or the region that renders {status}
await expect(status).toHaveText("Voltou para v1");
```

### WR-04: The demo selection does not guard `indexOf("Acao")` returning -1

**File:** `e2e/demo.spec.ts:61-66`
**Issue:** If the mock fixture's button label changes, `start` is `-1`, and `setSelectionRange(-1, 3)` silently selects the wrong range (browsers clamp it to 0). "Assinar agora" then gets typed over the start of the code. The test fails only 15 s later, with a confusing "Assinar agora not visible" timeout, or it records a GIF showing broken code.
**Fix:**
```ts
const start = await editor.evaluate((el) => {
  const ta = el as HTMLTextAreaElement;
  const i = ta.value.indexOf("Acao");
  if (i >= 0) { ta.focus(); ta.setSelectionRange(i, i + 4); }
  return i;
});
expect(start, "mock fixture must contain the 'Acao' label").toBeGreaterThanOrEqual(0);
```

## Info

### IN-01: Missing accent in the language switcher link

**File:** `README.md:1`, `README.pt-BR.md:1`
**Issue:** The link text reads "Portugues (BR)"; it should be "Português (BR)".
**Fix:** Add the accent in both files.

### IN-02: `srcdocBefore ?? ""` hides a null capture

**File:** `e2e/journey.spec.ts:92`
**Issue:** If `getAttribute` returned null, the assertion would compare against `""` instead of failing at the point of capture.
**Fix:** Add `expect(srcdocBefore).not.toBeNull()` before the comparison, then use `srcdocBefore!`.

### IN-03: Serial mode on a file with a single test is a no-op

**File:** `e2e/journey.spec.ts:15`
**Issue:** `test.describe.configure({ mode: "serial" })` has no effect with one test, and the comment in D-01 suggests it guards something.
**Fix:** Remove it, or keep it with a comment that it is there for future steps.

### IN-04: `--convert-only` depends on a file Playwright deletes

**File:** `scripts/demo-gif.mjs:7,19`, `docs/README.md`
**Issue:** `test-results/` is Playwright's `outputDir`, which is wiped at the start of every run. Any later `npm run e2e` deletes `demo.webm`, so `--convert-only` fails with "missing ...".
**Fix:** Save the video outside `test-results` (for example `.demo/demo.webm`, gitignored), or document the limitation.

### IN-05: `shell: true` combined with an args array

**File:** `scripts/demo-gif.mjs:70-74`
**Issue:** Node 24 deprecates passing args together with `shell: true` (DEP0190). The args are constant, so there is no injection risk, but a warning will appear.
**Fix:** On win32, spawn `"npx.cmd"` without a shell, or pass a single command string.

### IN-06: Relative paths assume the cwd is the repo root

**File:** `scripts/demo-gif.mjs:19-21,81`, `e2e/demo.spec.ts:74`
**Issue:** Running `node demo-gif.mjs` from `scripts/` would look for `test-results/` and `docs/` in the wrong place. `npm run` sets the cwd correctly.
**Fix:** Resolve paths from `fileURLToPath(new URL("..", import.meta.url))`.

### IN-07: Journey version numbering differs from CONTEXT D-01

**File:** `e2e/journey.spec.ts:65-79`
**Issue:** D-01 describes "Edição manual v3 then v4". The spec, which matches the reducer (committing an edit made from v1 discards v2), asserts that the manual edit is v2 and the refine is v3. The code is right and the planning text is stale.
**Fix:** Update D-01, or add a note in the SUMMARY, so the traceability stays accurate.

---

_Reviewed: 2026-10-18T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: quick_
