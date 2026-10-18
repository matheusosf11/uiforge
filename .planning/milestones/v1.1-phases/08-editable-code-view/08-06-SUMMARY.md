---
phase: 08-editable-code-view
plan: 06
subsystem: e2e
tags: [e2e, playwright, editor]
requires:
  - "08-05 draft-aware handlers, composite status, 'Edição manual' versions"
provides:
  - "edit smoke e2e (preview debounce, refine currentCode, undo to the edit, clipboard, Esc+Tab exit)"
affects: []
tech-stack:
  added: []
  patterns:
    - "Wait for the /api/generate response, not transient badges, when the mock streams fast"
key-files:
  created: []
  modified:
    - e2e/generate.spec.ts
decisions:
  - "Ran Playwright from a git-archive export of HEAD in the scratchpad (node_modules junction). The user's own `next dev` (PID 23868, port 3000) shares this project's .next directory and breaks `next build`. No process was killed."
  - "The flaky 'Atualizando…' check in 'refine, then undo back to v1' is now a waitForResponse on /api/generate plus the existing 'Pronto — v2' and srcdoc checks"
metrics:
  duration: "~25 min"
  completed: 2026-10-18
  tasks: 2
  files: 1
---

# Phase 8 Plan 06: E2E edit smoke Summary

A new `edit smoke` describe in e2e/generate.spec.ts checks the editable code view under the mock model in Chromium. It covers three things.

- An edit reaches the preview srcdoc after the debounce. Refining afterwards sends a `currentCode` that contains the edit, the history records "Edição manual", reaching "Pronto — v3", and Desfazer goes back to v2, which still contains the edit.
- Copiar puts the edited text on the clipboard.
- Tab indents inside the editor. Escape and then Tab moves focus out. The editor's accessible description is "Esc e depois Tab para sair".

## Tasks

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | Edit smoke, selector audit, refine badge race fix | 946354a |
| 2 | Playwright run, timing fix, phase gate | f44100a |

## Verification

- Selector audit: no "Código gerado" or "Generated code" in the e2e. Status checks match substrings, with no `exact` on status texts.
- Playwright run 1 (`E2E_PORT=3200 timeout 540 npx playwright test --reporter=line`, in the project): the webServer `next build` failed with "Invariant: no direct app page entry found for /_not-found", so no tests ran. Cause: the user's `next dev` for this project (PID 23868, port 3000) writes the same `.next` directory.
- Playwright run 2 (same command, from an isolated export of HEAD at 946354a): **12 tests, 9 passed, 1 failed, 2 skipped** (the README screenshot specs). The failure was `edit smoke › edit updates the preview, refine uses the edit, undo returns to it`. The `toHaveAttribute("srcdoc", /marca-e2e/)` check found no iframe, because the SandboxPreview dynamic chunk was still on its "Gerando preview…" loading fallback. The test edited right after "Pronto — v1" without waiting for the preview to mount. Both other edit-smoke tests passed (clipboard, Esc+Tab), as did the hardened refine/undo test and every other existing test.
- Fix f44100a: before editing, the test now waits for the iframe srcdoc to match /FixtureCard/ (15 s), and the debounced /marca-e2e/ check has a 15 s timeout. **This fix was not run in Playwright** because of the two-run limit. Re-run it during /gsd:verify-work.
- Port 3200 was free before and after each run. Port 3100 belongs to the user's other app ("sistema RTG", PID 28676) and was not touched.
- `npx vitest run`: 409 passed (27 files). `npm run typecheck` and `npm run lint` are clean.

## Deviations from Plan

- [Rule 3 - Blocking] Playwright ran on port 3200 from an isolated export instead of 3100 in the project. The reasons are the port collision (as instructed) and the shared `.next` held by the user's dev server.
- [Rule 1 - Bug, test only] Hardened the racy "Atualizando…" assertion. Also added a wait for the preview to mount in the new edit smoke. Product src was not changed.

## Manual checks left for /gsd:verify-work

- Re-run Playwright to confirm the f44100a fix passes, with all 10 generate.spec tests green.
- Caret alignment and selection visibility in both themes.
- Soft-wrap of long lines.
- Mobile Código tab: editing works and there is no iOS focus zoom.

## Known Stubs

None.

## Self-Check: PASSED

- e2e/generate.spec.ts contains "Editor de código", "marca-e2e", "currentCode" and "not.toBeFocused"
- Commits 946354a and f44100a exist
