---
phase: 06-session-core-refine-loop
reviewed: 2026-10-17T00:00:00Z
depth: standard
files_reviewed: 19
files_reviewed_list:
  - src/app/api/suggest/route.ts
  - src/components/generator/generator-shell.tsx
  - src/components/generator/new-component-dialog.tsx
  - src/components/generator/prompt-form.tsx
  - src/components/generator/sandbox-preview.tsx
  - src/components/generator/session-bar.tsx
  - src/components/generator/use-generator-session.ts
  - src/components/generator/use-suggestions.ts
  - src/components/generator/use-undo-shortcut.ts
  - src/components/ui/alert-dialog.tsx
  - src/lib/ai/model.ts
  - src/lib/ai/prompt.ts
  - src/lib/ai/suggest-prompt.ts
  - src/lib/rate-limit.ts
  - src/lib/session.ts
  - src/lib/stream-generate.ts
  - src/lib/suggest.ts
  - e2e/generate.spec.ts
  - playwright.config.ts
findings:
  critical: 0
  warning: 5
  info: 8
  total: 13
status: issues_found
---

# Phase 6: Code Review Report

**Reviewed:** 2026-10-17
**Depth:** standard
**Files Reviewed:** 19
**Status:** issues_found

## Summary

I reviewed the Phase 6 source diff (`2c5dd23~1..HEAD`) against 06-CONTEXT.md and 06-UI-SPEC.md. The core state machine holds up. `sessionReducer` guards every request-scoped action by `pending.id`. ABORT, FAIL and COMMIT after a stop or a reset are no-ops. Truncation happens at COMMIT, not at START. The 20-version cap drops the oldest version and keeps ids monotonic. RESET keeps `nextVersionId`, so the version-id-keyed suggestion cache cannot collide across sessions. The hook's `reqIdRef` / `inFlightRef` / `AbortController` handling is consistent: stop followed by a new send cannot let the old request's `finally` clear the new one. `/api/suggest` delimits code as data (`neutralizeDelimiters`), caps the body and the code length before the limiter, uses a separate `suggest:` bucket, never logs code, and gates the mock behind `isE2EMock()` (env only, disabled on Vercel Production).

I found no blockers. The warnings are behavioral and spec deviations:
- The runtime-error "Tentar de novo" turns a first generation into a refine of broken code.
- Retrying from the banner leaves the prompt field filled after a commit.
- Focus after "Descartar e começar" probably does not land on the textarea.
- The `e.code === "KeyZ"` fallback fires undo on Ctrl+Y/Ctrl+W on non-QWERTY layouts.
- The client suggest timeout cuts off the server's second-model fallback.

## Warnings

### WR-01: Preview runtime-error retry refines the broken code instead of regenerating it (and turns a v1 retry into a refine)

**File:** `src/components/generator/generator-shell.tsx:255-265`
**Issue:** `onRegenerate={() => void session.send(committed.instruction)}` goes through `send`, which always uses `committedVersion(state)` as the base and sends `currentCode: base.code`. When the preview fails at runtime, the committed code is the broken one. So:
- **On v1:** the original generation prompt (e.g. "a pricing card") is sent as a refine instruction against the broken v1 code, not as a fresh `{ prompt }`-only generation. This is a regression from v1.0 "Gerar de novo" behavior, and Phase 5 required the `{prompt}`-only path to stay unchanged.
- **On vN (N > 1):** the instruction is applied a second time on top of the broken result, not re-sent against the same base (the parent version). The broken version stays in history and a new vN+1 is appended.

UI-SPEC row "Refine failure … re-sends the same instruction against the same base version" sets the expectation that retry targets the base. The reducer has no way to start from an explicit base, so the shell cannot do this today. No unit, integration or e2e test covers this path.
**Fix:** Let START/send accept an explicit base, then retry against the parent of the broken version (or without `currentCode` at v1):
```ts
// session.ts
| { type: "START"; id: number; instruction: string; baseId?: number | null }
// START: baseId: action.baseId !== undefined ? action.baseId : committedVersion(state)?.id ?? null
// use-generator-session.ts
const regenerate = useCallback(() => {
  const s = stateRef.current;
  const cur = committedVersion(s);
  if (!cur) return;
  const parent = s.cursor > 0 ? s.versions[s.cursor - 1] : null;
  return sendFrom(cur.instruction, parent); // parent === null -> no currentCode
}, []);
```
COMMIT already truncates to `baseIndex + 1`, so the broken version is replaced rather than kept.

### WR-02: Banner "Tentar de novo" commit does not clear the prompt field (D-02)

**File:** `src/components/generator/generator-shell.tsx:106-110, 203`; `src/components/generator/use-generator-session.ts:93-97`
**Issue:** D-02 says the field clears when a refinement or generation is committed. Only `handleSubmit` clears it (`if (outcome === "committed") setPrompt("")`). The banner retry calls `void session.retry()` and drops the result. In the common flow (refine fails, the text is kept, the user clicks "Tentar de novo", the retry commits v2), the old instruction stays in the textarea. If the user then presses Ctrl+Enter, the same change is applied twice.
**Fix:**
```tsx
onClick={async () => {
  if ((await session.retry()) === "committed") setPrompt("");
}}
```
Only clear when the retried instruction equals the current field text, if you want to avoid wiping a freshly edited prompt. Add an integration test: retry, commit, field empty.

### WR-03: Focus after confirming "Novo componente" likely does not land on the textarea

**File:** `src/components/generator/generator-shell.tsx:112-117, 281-289`; `src/components/generator/new-component-dialog.tsx:33-36`
**Issue:** UI-SPEC section 3 requires "on confirm, move focus to the textarea". `onConfirm` calls `doReset()`, which calls `textareaRef.current?.focus()` synchronously, while the base-ui AlertDialog is still open and trapping focus (FloatingFocusManager, modal). On close, base-ui then applies `finalFocus={newBtnRef}`. But the reset just unmounted the SessionBar, so `newBtnRef.current` is `null`, which base-ui treats as "fall back to the default behavior" (return focus to the previously focused element, which is now detached). In practice focus ends up on `<body>` or gets pulled back by the trap, not on the textarea. The Esc/confirm integration test (`generator-shell.test.tsx:260`) does not check `document.activeElement` after confirm, so this is unverified.
**Fix:** Make the final focus depend on how the dialog closed, rather than focusing imperatively inside `onConfirm`:
```tsx
const confirmedRef = useRef(false);
<AlertDialogContent
  initialFocus={cancelRef}
  finalFocus={() => (confirmedRef.current ? textareaRef.current : newBtnRef.current)}
>
```
Alternatively, focus the textarea in `onOpenChangeComplete(false)`. Add a test asserting `expect(textarea).toHaveFocus()` after "Descartar e começar".

### WR-04: Undo shortcut fires on Ctrl+Y / Ctrl+W on QWERTZ / AZERTY layouts

**File:** `src/components/generator/use-undo-shortcut.ts:21`
**Issue:** `if (e.key.toLowerCase() !== "z" && e.code !== "KeyZ") return` accepts the event when *either* the logical key is "z" *or* the physical key is KeyZ. On QWERTZ (German), physical KeyZ produces "y", so Ctrl+Y (redo in most apps) triggers undo and gets `preventDefault()`. On AZERTY, physical KeyZ is "w", so Ctrl+W also triggers undo before the browser handles it. This conflicts with the spec ("Shift+Z (redo) is ignored", "preventDefault only when it acts" on Ctrl/⌘+Z).
**Fix:** Prefer the logical key. Fall back to `code` only when `key` is not a printable single character (e.g. IME / dead keys):
```ts
const k = e.key.length === 1 ? e.key.toLowerCase() : null;
if (k !== null ? k !== "z" : e.code !== "KeyZ") return;
```

### WR-05: Client suggest timeout (10 s) is shorter than the server's two-model chain (2 x 8 s)

**File:** `src/components/generator/use-suggestions.ts:12`; `src/app/api/suggest/route.ts:18, 85-111`
**Issue:** The server tries `gemini-3.5-flash-lite`, then `gemini-3.6-flash`, each with `timeout: 8000`. If the first model times out or is slow to fail (e.g. a 503 after several seconds), the second model has at most about 2 s before the client aborts at 10 s and stores the fallback list. So the D-05 fallback chain does almost nothing in the failure mode it exists for. Because the result is cached per version id, the generic chips stay for that version until reset. It also spends quota on a request whose answer is thrown away.
**Fix:** Keep server worst case below client budget. For example, `TIMEOUT_MS = 4500` per model (worst case about 9 s), or a total deadline:
```ts
const deadline = Date.now() + 9000;
// per model: timeout: Math.max(1000, deadline - Date.now())
```
Or raise `SUGGEST_TIMEOUT_MS` to about 18 s. Put the relationship in a shared constant or a comment.

## Info

### IN-01: COMMIT silently wipes all history if `baseId` is not found

**File:** `src/lib/session.ts:109-113`
**Issue:** `findIndex` returning `-1` with a non-null `baseId` gives `slice(0, 0)`, which drops every version. This is unreachable today (nothing removes versions while `pending` is set, and RESET clears `pending`). Phase 7 (click-to-restore) and Phase 8 (manual edits) will add more actions, though, so this is a latent data-loss path.
**Fix:** `if (pending.baseId !== null && baseIndex === -1) return { ...state, pending: null, error: { kind: "failed", ... } }`, or treat the commit as stale.

### IN-02: Commit validity is computed twice (hook and reducer)

**File:** `src/components/generator/use-generator-session.ts:63-67`; `src/lib/session.ts:96-97`
**Issue:** The hook re-runs `parseCode` and `hasDefaultExport` to decide whether to return `"committed"`, separately from the reducer's decision. If the two drift (e.g. a validity rule is added only in the reducer), the shell clears the prompt for a rejected commit.
**Fix:** Export one `isCommittable(raw)` helper from `session.ts` and use it in both places.

### IN-03: Status text does not change once the 20-version cap is hit

**File:** `src/components/generator/generator-shell.tsx:92`
**Issue:** At the cap, every commit sets `cursor = 19`, so the polite `aria-atomic` region shows "Pronto — v20" again. Because the text does not change, screen readers do not re-announce later commits. Positional labels also renumber silently after eviction.
**Fix:** Use a stable per-session counter for the label, or force a re-announcement (clear the text, then set it).

### IN-04: Rate-limit overflow bucket and sweep are shared across generate and suggest configs

**File:** `src/lib/rate-limit.ts:23-29`
**Issue:** `__overflow__` is shared by both `getRateLimitConfig()` (max 5) and the suggest bucket (max 10). Under key saturation, automatic suggest calls use up generate quota and vice versa. The sweep also evicts keys using the *caller's* window, not the window those keys were recorded with. Each IP now holds two keys, so saturation comes twice as fast.
**Fix:** Prefix the overflow key with the bucket namespace (e.g. derive it from the `suggest:` prefix), or keep one Map per limiter instance.

### IN-05: Body is read fully before the byte cap when Content-Length is absent

**File:** `src/app/api/suggest/route.ts:36-49`
**Issue:** With chunked transfer and no Content-Length, `req.text()` buffers the whole body before the `MAX_BODY_BYTES` check. Vercel's platform body limit bounds this, so the risk is low, but the cap is not enforced by the route itself. The pattern is copied from `/api/generate`.
**Fix:** Read `req.body` with a counting reader and abort once the cap is passed. Extract it as a shared helper for both routes.

### IN-06: Rate-limit message produced via a synthetic Error

**File:** `src/components/generator/generator-shell.tsx:99-100`
**Issue:** `friendlyGenerateError(new Error("rate_limited"))` depends on the magic-string branch in `isRateLimitError`.
**Fix:** Use `RATE_LIMIT_MESSAGE` directly.

### IN-07: Focus is lost to `<body>` when the textarea becomes disabled or "Parar" unmounts

**File:** `src/components/generator/prompt-form.tsx:104, 167-171`
**Issue:** Submitting with Ctrl+Enter disables the focused textarea. When the stream ends, the focused "Parar" button unmounts. In both cases keyboard and screen-reader users lose their place. This is pre-existing v1.0 behavior, but it now happens on every refine.
**Fix:** Use `readOnly` + `aria-disabled` instead of `disabled` while busy, or restore focus to the textarea when `isLoading` turns false and focus is on `<body>`.

### IN-08: Coverage gaps

**File:** `e2e/generate.spec.ts:87-135`; `src/components/generator/generator-shell.test.tsx`
**Issue:** No tests cover:
- the runtime-error regenerate path (WR-01)
- clearing the field after a banner retry (WR-02)
- textarea focus after confirm (WR-03)
- non-QWERTY key handling (WR-04)
- a suggest response arriving after the version changed (only abort-on-change is implied)

The e2e refine smoke does not exercise the AlertDialog or Ctrl+Z, and its commit history notes it was "written, not yet run green".
**Fix:** Add the targeted unit/integration tests listed above and run the refine e2e green before closing the phase.

---

_Reviewed: 2026-10-17_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
