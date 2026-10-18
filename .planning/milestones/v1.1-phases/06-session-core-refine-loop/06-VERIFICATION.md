---
phase: 06-session-core-refine-loop
verified: 2026-10-17T23:00:00Z
status: human_needed
score: 6/6 roadmap success criteria verified (37/37 plan must-have truths)
overrides_applied: 0
human_verification:
  - test: "Run the manual real-key UAT for /api/suggest (06-UAT.md)"
    expected: "HTTP 200 with 1-4 pt-BR suggestions {label<=30, instruction}; suggest_usage log with model + count only; latency within the 9 s server budget"
    why_human: "Needs a real GOOGLE_GENERATIVE_AI_API_KEY and judgement of suggestion quality; mock mode bypasses the model"
  - test: "Refine a component in the browser (desktop and mobile width) and watch the preview while it streams"
    expected: "Preview keeps showing the previous version with the 'Atualizando…' badge, no blank or flashing iframe, single swap on 'Pronto — vN'; mobile tab never auto-switches"
    why_human: "Visual/real-time behavior; unit tests check srcDoc stability but not perceived flicker"
  - test: "Spot-check the REVIEW-FIX logic changes flagged 'requires human verification' (WR-02 prompt clear after banner retry, WR-03 textarea focus after confirming Novo componente, WR-05 suggest client timeout vs server chain)"
    expected: "Committed banner retry clears the prompt unless it was edited; after 'Descartar e começar' focus lands in the textarea; chips arrive from the fallback model without the client aborting first"
    why_human: "Focus management and network timing in a real browser/provider"
---

# Phase 6: Session Core & Refine Loop Verification Report

**Phase Goal:** After the first generation, users iterate on the component through refinements that never lose the last good version, can undo, and can start over
**Verified:** 2026-10-17T23:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | After the first generation the input says "Refinar" and sends only current code + the new instruction; refine chips prefill an instruction | VERIFIED | `generator-shell.tsx` sets `mode={refineMode ? "refine" : "generate"}` with `refineMode = versions.length > 0`; `prompt-form.tsx` renders "Refinar componente" / "Descreva a mudança" / "Refinar". `use-generator-session.ts` `run()` sends `{ prompt: instruction, currentCode: base.code }` only (no history); `streamGenerate` builds the payload from those two fields alone. Chips: `pick()` calls `onChange` + focus, no submit. Chips come from `useSuggestions` -> `/api/suggest`, with `fillWithFallback` / `FALLBACK_SUGGESTIONS`. |
| 2 | While a refinement streams the preview keeps the previous version and swaps once only on clean stream + valid code | VERIFIED | `SandboxPreview code={committed.code} updating={!!pending}`; `committed` only changes on reducer `COMMIT`, which runs `parseCode` + `hasDefaultExport` and turns empty/no-default output into an `invalid` error without touching versions. `streamGenerate` returns `ok:true` only after `done` and not aborted; mid-stream errors -> `reason:"stream"`. Server errors the body on error/abort/non-"stop" finishReason. `srcDoc` is memoized on `code`. |
| 3 | If a refinement fails or the user stops it, the previous version stays in code and preview, and "Tentar de novo" reuses the same base | VERIFIED | FAIL/ABORT/REJECT leave `versions`/`cursor` alone (`session.ts`); `codeForPanel` falls back to `committed.code` once `pending` clears. `retry()` resolves `error.baseId` and calls `run(error.instruction, base)`. Stop dispatches ABORT with no error banner (UI-SPEC row "Stopped by user: (empty)"); the prompt text stays (D-02), so re-submitting targets the unchanged committed base. Tests: shell "failed refine keeps text, version and retries with the same base", "Parar during refine keeps v1 and the typed text"; reducer "retry after FAIL reuses same baseId". |
| 4 | User can undo (button or shortcut outside the editor) and submit with Ctrl/Cmd+Enter | VERIFIED | `SessionBar` Desfazer disabled when `!canUndo \|\| busy`; `useUndoShortcut` listens on document, ignores input/textarea/select/contenteditable, open dialog, shift/alt, repeat and non-"z" logical keys. `PromptForm.handleKeyDown` submits on (meta\|ctrl)+Enter. Shell test "undoes via button and Ctrl+Z, but not inside the textarea". |
| 5 | "Novo componente" clears the session, asking for confirmation with multiple versions or manual edits | VERIFIED | `requestNew()`: `versions.length > 1` opens `NewComponentDialog` (base-ui AlertDialog, Cancel gets initial focus, Esc cancels); otherwise resets immediately. `RESET` clears versions/pending/error and keeps `nextVersionId`. Manual edits do not exist until Phase 8 (`source: "manual"` type reserved), so the "multiple versions" condition covers every case possible today. Tests: shell "...with 2 versions asks, Esc cancels, confirm resets" and "...single version resets immediately". |
| 6 | Session logic (commit, undo, truncation, 20-cap, abort/error, stale-chunk guard) has unit tests, and the refine route has route tests | VERIFIED | `src/lib/session.test.ts` (18 cases: commit valid/invalid/stale, FAIL, ABORT + stale chunk/commit, REJECT, UNDO, truncate-at-COMMIT, START not truncating, MAX_VERSIONS cap with monotonic ids, RESET); `stream-generate.test.ts` (8); `use-generator-session.test.tsx` (12). `src/app/api/generate/route.test.ts` "refine mode" block includes the backward-compatible `{prompt}`-only case ("modo generate identico ao v1.0"), blank/null currentCode, 30k/30_001 limits, 413 paths, privacy. `src/app/api/suggest/route.test.ts` (15). Re-run: 22 files / 241 tests pass. |

**Score:** 6/6 roadmap truths verified. All 37 plan frontmatter truths (06-01..06-07) checked against code; none failed.

### Plan must-have highlights

| Plan | Truths | Result | Notes |
|------|--------|--------|-------|
| 06-01 | 6 | VERIFIED | Reducer exports `MAX_VERSIONS, initialSessionState, sessionReducer, committedVersion, isBusy, canUndo`; COMMIT imports `parseCode`/`hasDefaultExport`. |
| 06-02 | 4 | VERIFIED | `/api/suggest`: 400/413/429/500/502, `suggest:` key prefix + `getSuggestRateLimitConfig`, code passed to `buildSuggestUser` (delimited), never logged; mock returns `MOCK_SUGGESTIONS`; `SUGGEST_MODEL_IDS` flash-lite first. |
| 06-03 | 4 | VERIFIED | `alert-dialog.tsx` on `@base-ui/react/alert-dialog`, imports `cn` from `@/lib/utils`; no new dependency. |
| 06-04 | 4 | VERIFIED | Generate mode keeps "Prompt"/"Gerar"/`EXAMPLE_PROMPTS`; refine mode shows 4 skeletons when `chips == null`; "Atualizando…" badge. |
| 06-05 | 5 | VERIFIED | `send` returns "committed" only for valid COMMIT of the current id; `stop` aborts + ABORT; too-large pre-check before fetch; suggestions keyed by version id, aborted on id change, silent fallback. |
| 06-06 | 10 | VERIFIED | Shell wires all hooks/components; status string single `aria-live` region ("Pronto — vN", "Voltou para vN", "Novo componente iniciado"); reset keeps prompt text; mobile tab state only changes on user action; too-large banner offers Novo componente and no retry. |
| 06-07 | 4 | VERIFIED | `e2e/generate.spec.ts` has "refine, then undo back to v1" and "refine failure keeps v1 and shows the alert"; existing specs intact; Playwright 6 passed / 2 skipped (caller-provided run on 7406a51, not re-run per instructions). `06-UAT.md` exists (pending). |

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/lib/session.ts` | VERIFIED | Pure reducer, used by `use-generator-session.ts` |
| `src/lib/stream-generate.ts` | VERIFIED | Used by `use-generator-session.ts` |
| `src/app/api/suggest/route.ts` | VERIFIED | Called by `use-suggestions.ts` |
| `src/lib/suggest.ts` | VERIFIED | Shared by route and hook |
| `src/components/ui/alert-dialog.tsx` | VERIFIED | Used by `new-component-dialog.tsx` |
| `src/components/generator/session-bar.tsx` | VERIFIED | Rendered by shell in refine mode |
| `src/components/generator/use-undo-shortcut.ts` | VERIFIED | Called by shell |
| `src/components/generator/new-component-dialog.tsx` | VERIFIED | Rendered by shell |
| `src/components/generator/prompt-form.tsx` | VERIFIED | Mode-aware |
| `src/components/generator/sandbox-preview.tsx` | VERIFIED | `updating` + `regenerateLabel` props |
| `src/components/generator/use-generator-session.ts` | VERIFIED | Used by shell |
| `src/components/generator/use-suggestions.ts` | VERIFIED | Used by shell |
| `src/components/generator/generator-shell.tsx` | VERIFIED | Orchestrator |
| `e2e/generate.spec.ts` | VERIFIED | Refine smoke specs |
| `.planning/phases/06-session-core-refine-loop/06-UAT.md` | VERIFIED | Manual checklist, status pending |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| session.ts | parse-code.ts / has-default-export.ts | COMMIT validation | WIRED |
| suggest/route.ts | rate-limit.ts | `checkRateLimit(\`suggest:${clientIp(req)}\`, getSuggestRateLimitConfig())` | WIRED |
| alert-dialog.tsx | @/lib/utils | `cn` import | WIRED |
| prompt-form.tsx | example-prompts.ts | `EXAMPLE_PROMPTS` in generate mode | WIRED |
| use-generator-session.ts | session.ts + stream-generate.ts | `useReducer(sessionReducer)` + `streamGenerate` | WIRED |
| use-suggestions.ts | /api/suggest | fetch + `SUGGEST_CLIENT_TIMEOUT_MS` abort timer | WIRED |
| generator-shell.tsx | use-generator-session.ts | hook | WIRED |
| generator-shell.tsx | sandbox-preview.tsx | `code={committed.code} updating={!!pending} regenerateLabel="Tentar de novo"` | WIRED |
| e2e spec | mock model / suggest mock | `UIFORGE_E2E_MOCK` outputs | WIRED |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
|----------|------|--------|-----------|--------|
| SandboxPreview | `committed.code` | reducer COMMIT from `/api/generate` stream | Yes | FLOWING |
| CodeView | `codeForPanel` | `pending.text` (CHUNK) or committed code | Yes | FLOWING |
| PromptForm chips | `chips` | `useSuggestions` -> `/api/suggest` (model / mock) with fallback | Yes | FLOWING |
| SessionBar | `cursor+1`, `versions.length` | reducer state | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Unit + route tests | `npx vitest run` | 22 files, 241 tests passed | PASS |
| Typecheck | `npx tsc --noEmit` | exit 0 | PASS |
| Lint | `npm run lint` | no output (clean) | PASS |
| E2E refine smoke | `npx playwright test` | 6 passed / 2 skipped (caller-provided, not re-run) | PASS (reported) |

### Probe Execution

Not applicable: no `scripts/*/tests/probe-*.sh` declared or present for this phase.

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| ITER-01 | Refine by default after first generation | SATISFIED | SC1 |
| ITER-02 | Undo within session | SATISFIED | SC4, reducer UNDO |
| ITER-05 | Accept only clean + valid result | SATISFIED | SC2 |
| ITER-06 | Novo componente with confirmation | SATISFIED | SC5 |
| ITER-07 | Failure/stop keeps previous version, retry same base | SATISFIED | SC3 |
| ITER-08 | Preview keeps previous version while streaming | SATISFIED (visual human check listed) | SC2 |
| ITER-09 | Refine suggestion chips prefill | SATISFIED | SC1, shell chip tests |
| UX-05 | Ctrl/Cmd+Enter submit, undo shortcut outside editor | SATISFIED | SC4 |
| QUAL-06 | Session unit tests + refine route tests | SATISFIED | SC6 |

No orphaned requirements: REQUIREMENTS.md maps exactly these 9 IDs to Phase 6 and all are claimed by plans.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (phase files) | - | TBD/FIXME/XXX/TODO/HACK | none found | - |
| `06-UAT.md` | "Verificacoes comuns" | mentions an 8 s timeout; code now uses 5 s per model / 9 s server budget / 12 s client (WR-05) | Info | Stale doc number only |
| working tree | - | `.env.example` has uncommitted SUGGEST_RATE_LIMIT_* doc lines | Info | Documentation-only; the orchestrator should commit or discard it |

### Human Verification Required

1. **/api/suggest real-key UAT (06-UAT.md)**: follow the checklist with a real key. Expected: 1-4 pt-BR suggestions, privacy-safe log, acceptable latency. Why human: needs a real provider and a judgement of suggestion quality. Non-blocking.
2. **Visual no-flash refine**: refine on desktop and mobile. Expected: previous preview plus "Atualizando…" badge, one swap on success, no tab auto-switch. Why human: perceived flicker.
3. **REVIEW-FIX logic changes (WR-02/03/05)**: check the prompt clearing after a committed banner retry, the textarea focus after confirming the dialog, and the suggestion timing on the fallback model. Why human: focus and network timing.

### Gaps Summary

No gaps. Every roadmap success criterion and plan truth is backed by wired, substantive code and passing tests. One reading to note: after the user clicks "Parar" there is no "Tentar de novo" button. This matches UI-SPEC ("Stopped by user: (empty)") and D-02: the instruction stays in the field and re-submitting targets the unchanged committed base, so ITER-07's intent holds. The status is human_needed only because of the pending manual UAT and visual checks.

---

_Verified: 2026-10-17T23:00:00Z_
_Verifier: Claude (gsd-verifier)_

## Update 2026-10-17: human verification

1. **/api/suggest real-key UAT**: DONE, passed 5/5 (see 06-UAT.md). A4 confirmed: structured output from flash-lite worked, no model fallback needed.
2. **Visual no-flash refine (desktop and mobile)**: partly covered. A real-key headless run went v1 → refine → v2 → Desfazer with correct chips and status. Perceived flicker and the mobile tab still need a quick look by the user. Non-blocking; deferred to the Phase 9 journey and GIF recording.
3. **WR-02/WR-03/WR-05 spot-check**: covered by new unit tests and the real-key run (suggestions arrived in about 1–4 s, inside the 12 s client timeout). Manual browser spot-check still open, non-blocking.
