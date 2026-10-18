---
phase: 08-editable-code-view
reviewed: 2026-10-18T05:33:57Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - src/lib/session.ts
  - src/components/generator/use-generator-session.ts
  - src/components/generator/code-view.tsx
  - src/components/generator/use-debounced-draft.ts
  - src/components/generator/generator-shell.tsx
  - src/components/generator/sandbox-preview.tsx
  - src/components/generator/turn-item.tsx
  - src/components/generator/turn-list.tsx
  - src/components/generator/discard-draft-dialog.tsx
  - e2e/generate.spec.ts
  - package.json
  - src/components/generator/robot-corner.tsx
  - src/components/generator/robot-corner-scene.tsx
  - src/components/generator/robot-status.ts
  - src/components/generator/use-showcase-enabled.ts
  - src/components/background/topology-background.tsx
  - src/components/ui/topology-field.tsx
  - src/components/ui/splite.tsx
  - src/app/layout.tsx
  - src/app/page.tsx
findings:
  critical: 0
  warning: 7
  info: 8
  total: 15
status: issues_found
---

# Phase 8: Code Review Report

**Reviewed:** 2026-10-18T05:33:57Z
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

Scope: the Phase 8 diff (`51feb3f~1..HEAD`), covering the editor host, the draft lifecycle, COMMIT_MANUAL, debounce, preview gating, turn list draft row, the D-09 dialog and the e2e smoke. I also did a lighter pass over the decorative additions from the same window (robot mascot, topology backdrop). The diffs in `src/components/theme/theme-provider.tsx` and `vitest.setup.ts` are uncommitted and outside this range, so I did not review them.

The core draft lifecycle holds up when traced:
- **Commit-before-action.** Refine, undo, restore, retry and reset all commit the draft first. The eager `stateRef` update in `commitManual` is consistent with how React applies queued reducer actions. The handlers clear the draft explicitly, so a second Desfazer cannot create a duplicate manual version.
- **COMMIT_MANUAL.** Truncation, the cap, `droppedCount` and the "no `export default` check" rule are correct.
- **Read-only key guard.** It blocks every key path in react-simple-code-editor 0.14.1 that rewrites the value (I checked against `node_modules/.../lib/index.js`). It never intercepts Tab, Ctrl+C or Ctrl+A.
- **Exit mode.** It works as specified.
- **Undo history reset.** It is keyed on `id:nextVersionId:cursor`, which correctly separates commit-then-undo from the pre-commit state.
- **Debounce.** It is a correct trailing debounce with a synchronous null pass-through.
- **Copy and download.** Both export the value the editor shows.

No blockers. The warnings are:
- the documented-but-wrong P7 cap edge, which lands the user on the wrong version;
- focus loss when Escape is pressed in the read-only editor;
- the editor and hint unmounting at the start of every stream, which contradicts the streaming-state contract;
- a racy clipboard e2e assertion;
- three issues in the decorative layer: no reduced-motion gating on the full-screen WebGL backdrop, a CDN script without SRI, and the robot overwriting the user's prompt.

## Warnings

### WR-01: Restoring the oldest version with a draft at the 20-version cap lands on the manual version instead

**File:** `src/components/generator/generator-shell.tsx:229-243` (with `src/lib/session.ts:240-258`, `src/components/generator/use-generator-session.ts:191-197`)
**Issue:** The failure needs three conditions: 20 versions, the cursor on the last one, and a draft. If the user then clicks the oldest item, `handleRestore` takes the commit path (`idx < cursor`, so the D-09 dialog does not open). `COMMIT_MANUAL` appends the draft and the cap evicts `versions[0]`, which is exactly the restore target. `RESTORE` then finds index -1 and does nothing. The user asked for v1 (or v(dropped+1)) and ends up on the new manual version. The status reads only "Edição salva como v21", and the clicked item disappears from the list. RESEARCH P7 accepted this, and a reducer test pins it as a no-op, but the user-visible result still ignores what the user asked for, silently.
**Fix:** Detect the eviction in the shell and take a non-destructive path. Either ask with the D-09 dialog (the target would be deleted), or restore without committing:
```tsx
const evictsTarget =
  dirty && idx === 0 && versions.length === MAX_VERSIONS && cursor === versions.length - 1;
if (dirty && (idx > cursor || evictsTarget)) {
  // D-09 dialog: "Ir para a vX descarta essas edições."
  ...
  return;
}
```

### WR-02: Escape in the read-only editor blurs it and drops focus to `<body>`

**File:** `src/components/generator/code-view.tsx:204-209`
**Issue:** In read-only mode `handleKeyDown` returns without calling `preventDefault` on Escape. The library's `handleKeyDown` then runs `e.currentTarget.blur()`. When a keyboard user presses Escape in the editor during streaming, or before v1 once streaming code is present, focus leaves the page flow and lands on `document.body`. The next Tab starts again from the top of the document. RESEARCH Pattern 2 explicitly lists "blur" among the behaviours the read-only guard must block ("P1: block the library's own edits/undo/blur"). The implementation dropped that part, and no test covers Escape while read-only (the "never intercepts Tab, Escape" test only asserts that Escape is not prevented).
**Fix:** In read-only mode, prevent the default of Escape too. It has no other native meaning in a textarea, and Tab already passes through because `ignoreTabKey` is set:
```tsx
if (readOnly) {
  if (e.key === "Escape" || rewritesValue(e)) e.preventDefault();
  return;
}
```
Then add a test: read-only, focus the editor, press Escape, and assert the editor is still focused.

### WR-03: The editor and its hint unmount at the start of every generation or refine

**File:** `src/components/generator/code-view.tsx:106`, `src/components/generator/generator-shell.tsx:123-125`
**Issue:** On START, `pending.text` is `""`, so `editorValue = parseCode("") = ""`. The same happens for a partial fence such as "```tsx\n". With `readOnly` true, `showEditor = code !== "" || !readOnly` is false, so the editor, its label and the "Esc e depois Tab para sair" hint unmount and the placeholder "O código gerado aparecerá aqui." shows up. Both remount on the first chunk. UI-SPEC §2 requires the streaming state to keep the editor and the hint rendered ("stays, avoids layout shift"). It also requires `readOnly` rather than `disabled` "so focus is not lost when a refine starts". The remount throws away the textarea, so any focus is lost, and the panel flickers on every refine.
**Fix:** Keep the editor mounted while a refine streams. Show the placeholder only for the empty, pre-v1 case:
```tsx
// shell: hold the committed code until the first parsed chunk arrives
const streamed = pending ? parseCode(pending.text) : "";
const editorValue = pending
  ? (streamed || committed?.code || "")
  : (draftCode ?? committed?.code ?? "");
```
Alternatively, pass an explicit `hasContent`/`empty` prop to CodeView instead of inferring it from `code !== ""`.

### WR-04: The e2e "Copiar exports the edited code" test reads the clipboard before the write resolves

**File:** `e2e/generate.spec.ts:220-221`
**Issue:** `click()` returns once the click has been dispatched, not when `navigator.clipboard.writeText` resolves inside `handleCopy`. The test calls `readText()` right away, so under load it can read the previous clipboard contents and fail intermittently. The same pattern already exists at line 58. The new test copies it, so both are flaky in the same way.
**Fix:** Wait for the observable success state before reading:
```ts
await page.getByRole("button", { name: "Copiar" }).click();
await expect(page.getByRole("button", { name: "Copiado" })).toBeVisible();
const text = await page.evaluate(() => navigator.clipboard.readText());
```

### WR-05: The topology backdrop ignores `prefers-reduced-motion` and runs on phones (regression from LoomDraft)

**File:** `src/components/background/topology-background.tsx:9-19`, `src/components/ui/topology-field.tsx:153-175`
**Issue:** `TopologyBackground` mounts a full-screen WebGL iframe whenever the theme is dark. The iframe runs an unconditional `requestAnimationFrame` loop that rotates the scene and pulses the nodes, with antialias on and pixel ratio up to 2. The `LoomDraft` it replaces froze on a still frame under reduced motion (`loom-draft.tsx`: `reducedMotion === true || ... systemReduced`). `useShowcaseEnabled`, which the robot uses in the same change, explicitly gates on `(prefers-reduced-motion: no-preference)` and on width. This is an accessibility regression (WCAG 2.3.3 animation from interactions, and vestibular triggers from large moving backgrounds). It also costs constant GPU and battery on mobile.
**Fix:** Gate the mount on motion preference, and on mobile if wanted. Alternatively, pass a flag into the srcdoc that renders a single frame:
```tsx
const motionOk = useMediaQuery("(prefers-reduced-motion: no-preference)");
if (!mounted || resolvedTheme !== "dark" || !motionOk) return null;
```
In the srcdoc, render once and skip `animate()` when `matchMedia('(prefers-reduced-motion: reduce)').matches`.

### WR-06: three.js is loaded from cdnjs without Subresource Integrity

**File:** `src/components/ui/topology-field.tsx:55`
**Issue:** `<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js">` has no `integrity` and no `crossorigin`. A compromised or replaced CDN response runs arbitrary script on every dark-theme page view. The opaque-origin sandbox (`sandbox="allow-scripts"`) limits the blast radius: there is no parent DOM, cookie or storage access. The iframe can still run anything, for example crypto-mining, network beacons, or drawing deceptive content behind the transparent UI. The project also has no CSP in `next.config.ts` to back this up. The script is pinned to r128, so an SRI hash is cheap.
**Fix:** Add the published SRI hash and `crossorigin="anonymous"`, or better, self-host the file under `/public` (or bundle it) so no third-party script runs:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"
        integrity="sha512-…" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
```

### WR-07: Clicking the robot overwrites whatever the user typed in the prompt field

**File:** `src/components/generator/robot-corner.tsx:67-85,171-179`
**Issue:** `fillPrompt` sets the field value unconditionally through the native setter and dispatches `input`. A half-written prompt or refine instruction is replaced with a random example, and there is no undo beyond the browser's textarea undo, which a programmatic `value` set usually breaks. The robot is a 190×360 px click target in the corner, so accidental clicks are plausible. The busy guard relies on `mood`, which is polled every 300 ms. During that window, a click right after Refinar can still overwrite the field while a refine streams; the field is not `disabled` in refine mode.
**Fix:** Only prefill an empty field. Otherwise just show the suggestion in the bubble:
```ts
if (!field || field.disabled || field.value.trim() !== "") return null; // speak the tip instead
```
Also check the real busy state, for example a `[aria-busy]` attribute or the status text, synchronously in `handleClick` instead of relying on the polled mood.

## Info

### IN-01: Discard keeps the library's undo stack, so Ctrl+Z after discard and typing brings back the discarded draft

**File:** `src/components/generator/code-view.tsx:121-135`, `src/components/generator/generator-shell.tsx:461`
**Issue:** `historyKey` does not change on discard. After Descartar edições, if the user types one character and presses Ctrl+Z, the library restores `stack[offset-1]`, which is the last draft state, not the base. UI-SPEC says "do not promise more", so this is within contract. It may still surprise users.
**Fix:** If wanted, include a discard counter in `historyKey`. Otherwise document the behaviour in the UI-SPEC notes.

### IN-02: The error copy and regenerate gating switch on the first keystroke, before the preview shows the draft

**File:** `src/components/generator/generator-shell.tsx:426-439`
**Issue:** `errorSource` and the `onRegenerate` gating key off `dirty`, but the preview keeps rendering the committed (AI) code for 500 ms. If the AI code was broken, the first keystroke immediately changes the message to "Seu código tem um erro…" and hides "Tentar de novo", even though the error shown is still the AI's.
**Fix:** Derive both from "the preview is showing the draft" (`previewCode !== committed.code`), not from `dirty`.

### IN-03: An empty or whitespace-only draft becomes a manual version, and refining it silently switches to generate mode

**File:** `src/lib/session.ts:240-258`, `src/components/generator/use-generator-session.ts:55`
**Issue:** COMMIT_MANUAL accepts `""`. The refine then sends `currentCode: ""`. The API treats that as generate mode (`route.ts:67`), so the instruction ("deixe azul") is used as a fresh prompt and the result is appended as a child of the empty version.
**Fix:** Either reject whitespace-only drafts in COMMIT_MANUAL (and treat them as "no draft"), or skip `currentCode` and use `baseId` semantics consistently. Document whichever you choose.

### IN-04: The stale-draft effect lists an unused dependency

**File:** `src/components/generator/generator-shell.tsx:116-119`
**Issue:** The body never reads `hasPending`, but it is in the dependency list. That suggests an intent ("drop on pending") the code does not implement.
**Fix:** Remove it, or implement and test the intended behaviour.

### IN-05: The mobile editor font is 16px, not the locked 12px

**File:** `src/components/generator/code-view.tsx:303`
**Issue:** `max-md:text-base` deviates from UI-SPEC typography ("Code … 12px"). RESEARCH P8 offered it as an optional fix for iOS zoom. Both layers inherit it, so the caret stays aligned.
**Fix:** Record the decision in the phase summary or UI-SPEC so the visual contract matches the code.

### IN-06: `e2e:server` no longer pins port 3100

**File:** `package.json:15`
**Issue:** `next start -p 3100` became `next start`. Playwright injects `PORT`, but running `npm run e2e:server` by hand now serves on 3000 while the config expects 3100 (or `E2E_PORT`).
**Fix:** `"e2e:server": "next build && next start -p ${PORT:-3100}"`, or note the change in the README.

### IN-07: The robot depends on the status DOM and on exact copy

**File:** `src/components/generator/robot-corner.tsx:115-132`, `src/components/generator/robot-status.ts:7-30`
**Issue:** The robot polls `[aria-live="polite"][aria-atomic="true"]` and `[role="alert"]`, and regex-matches the pt-BR copy. It treats any alert, including the preview's user-code error, as an error mood. Any copy or markup change breaks it silently, and only `robot-status` unit tests cover the mapping.
**Fix:** Expose a small `data-generator-status` attribute (idle/working/done/error/nav) on the status region and read that instead.

### IN-08: An oversized draft is committed before being rejected, leaving "Novo componente" as the only offered action

**File:** `src/components/generator/use-generator-session.ts:119-134`
**Issue:** D-10 says the `MAX_CODE_LENGTH` pre-check still applies. Here the draft is saved first, then REJECT shows `CODE_TOO_LARGE_MESSAGE` with only a "Novo componente" button. Desfazer still works, so this is recoverable and intended (it is tested). The banner just does not mention it.
**Fix:** Optionally mention Desfazer or editing the code in the too-large banner when the current version is manual.

---

_Reviewed: 2026-10-18T05:33:57Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
