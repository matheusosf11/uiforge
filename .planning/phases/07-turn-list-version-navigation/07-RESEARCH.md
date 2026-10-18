# Phase 7: Turn List & Version Navigation - Research

**Researched:** 2026-10-17
**Domain:** Codebase-internal React 19 UI and a pure reducer extension (no new libraries)
**Confidence:** HIGH. Every claim comes from reading the repo or probing the installed packages. There are no external sources.

## Summary

Phase 7 is a thin layer on the Phase 6 reducer (`src/lib/session.ts`). Most of the hard behavior already exists:
- truncation at COMMIT (`session.ts:114-118`);
- the 20-version cap (`session.ts:128`);
- undo and clearing the error (`session.ts:168-171`);
- the per-version suggestion cache, which refetches when the id changes (`use-suggestions.ts:34-87`, deps `[id]`).

Moving `cursor` is enough to restore a version. The hook's `send` already uses `committedVersion(state)` as the base (`use-generator-session.ts:96-99`), and COMMIT then discards the later versions. HIST-03's "refining discards them" therefore needs no new truncation logic.

The planner should add five things:
1. A `RESTORE { versionId }` action with a backward/forward notice.
2. A stable display-number model. **Do not use `version.id` directly** (see Pitfall 1).
3. Selectors for the number, the later-version range and the cap line.
4. IN-01 hardening in COMMIT.
5. Two presentational components (`turn-list.tsx`, `turn-item.tsx`) wired into a new `turnList` slot and a `baseNotice` prop on `PromptForm`.

The changed session-bar counter (`vN · M versões`) breaks about 10 existing string assertions in unit tests and 2 in e2e. Those must be updated in the same plan.

**Primary recommendation:** Add `droppedCount` to `SessionState` and derive the display number as `droppedCount + index + 1`. Add `RESTORE` with notice `"undo"` (backward) or `"forward"`. Keep every component presentational, with state derived in the shell. Scroll only the list container through `getBoundingClientRect` math, never `scrollIntoView`. Never `disable` the current item.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
Carried forward (locked earlier, do not re-ask):
- Versions live only in memory. Refining from an older version truncates the later ones at COMMIT, with no redo after a commit. Max 20 versions, oldest dropped (`MAX_VERSIONS`, already in `src/lib/session.ts`).
- Undo means cursor − 1 (Phase 6). It is disabled while streaming and at the first kept version. Ctrl/⌘+Z only works outside text fields.
- "Novo componente" asks for confirmation when there is more than one version, and the reset keeps the prompt text.
- Suggestion chips are cached per version id (`useSuggestions`).
- A single status `aria-live` region already exists in the shell ("Pronto — vN", "Refinando…", "Voltou para vN").
- Only one "Tentar de novo" button may exist at a time; WR-01 in Phase 6 established this.

- **D-01:** Desktop: the list sits between the session bar and the prompt field, in the left column. It is a mini-chat list with its own scroll and a max height of about 5 items, so the field and chips stay visible.
- **D-02:** Mobile: the same list, inside a disclosure "Histórico (N)" that is collapsed by default. Its open/closed state is remembered for the session, in memory only with no storage. "Novo componente" resets it.
- **D-03:** Order is oldest at the top and newest at the bottom, near the field. After each commit, undo or restore, the list scrolls so the current item is visible.
- **D-04:** The list appears only after v1 is committed, the same rule as the session bar. The first generation keeps the current flow. If the first generation fails there is no list, only the banner.
- **D-05:** Each item has three parts: the label "vN"; the instruction, on 1 line with an ellipsis (full text in `title` and in the accessible label); a status icon on the right. The v1 item shows the original prompt. No timestamps. The same truncation applies on mobile. Repeated prompts are separate items.
- **D-06:** Status icons come from lucide, neutral, and each has screen-reader text: ok `Check` in muted-foreground; gerando `Loader2` spinning, static under `prefers-reduced-motion`; erro `AlertTriangle` in the destructive color.
- **D-07:** The current version has a `bg-muted` background, a left border in the primary color and a small "atual" badge, so it never relies on color alone. It also carries `aria-current="true"`.
- **D-08:** Later versions after a restore are shown at about 50% opacity, with no strikethrough. Their accessible label adds that the version will be discarded when refining.
- **D-09:** While a turn streams, a transient "gerando…" item with its instruction appears at the end of the list. It becomes a "vN ✓" item on commit. All list items are disabled while streaming.
- **D-10:** A failed turn (any `SessionError`) shows as a transient item at the end with "⚠ erro". It is not a version and is not restorable. The item disappears on a successful retry, a new send, undo, restore or reset. The "Tentar de novo" button stays in the existing banner; the item only shows status.
- **D-11:** "Parar" leaves no trace: the "gerando…" item disappears and the text stays in the field (Phase 6 D-02).
- **D-12:** Clicking any version item restores it instantly, with no confirmation. Code panel and preview switch directly, with no "Atualizando…" badge, and the code panel scrolls to the top.
- **D-13:** Dimmed later versions are clickable and restore normally. This works as an implicit redo until a refinement is committed from an earlier version.
- **D-14:** "Desfazer" stays cursor − 1 from whatever version is current. Navigation history is not recorded.
- **D-15:** The base notice is a discreet line just above the textarea: "Refinar a partir da vN — vX a vY serão descartadas". For a single later version, the wording is adapted to name just that one. The notice is shown only when the current version is not the last one. The button label stays "Refinar".
- **D-16:** On restore, the suggestion chips switch to the restored version's chips. They come from the cache when present and are fetched otherwise.
- **D-17:** Version numbers are stable and come from the version id: v7 stays v7 forever. After the cap drops old versions, the list starts at a later number and shows a line "Versões mais antigas descartadas". The session bar changes from "vN de M" to "vN · M versões". Status and announcements use the stable number.
- **D-18:** The list is a semantic `<ol>` with an accessible name, for example "Histórico de versões". Each version is a regular `<button>` inside an `<li>`. Tab and Shift+Tab move between items; Enter or Space restores. No roving tabindex.
- **D-19:** After a restore, focus stays on the clicked item. Reset already focuses the textarea (Phase 6 WR-03).
- **D-20:** Announcements go through the existing status region. Use "Voltou para vN" for any move to an earlier version, by undo or restore. Use "Foi para vN" for a move to a later, dimmed version.

### Claude's Discretion
- Reducer action name and shape for restore (for example `RESTORE { versionId }`). How the restore notice and later-version range are derived (selectors in `session.ts`).
- Component split (for example `turn-list.tsx` and `turn-item.tsx`), exact Tailwind classes, the max-height value, and the disclosure implementation (native `<details>` or a button with `aria-expanded`).
- How the session bar adapts to the stable-number format, and the exact text of the "Versões mais antigas descartadas" line.
- Unit and integration test layout. Extending the e2e smoke is optional (the full journey is Phase 9).

### Deferred Ideas (OUT OF SCOPE)
None. The user declined extra navigation shortcuts (Alt+↑/↓), reusing a past turn's instruction and list animations for this phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HIST-01 | List of turns with per-turn status (gerando/ok/erro) and the current version highlighted | `deriveTurns`-style shell derivation from `versions`, `pending` and `error` (Pattern 3). TurnItem states follow UI-SPEC §4. |
| HIST-02 | Click a turn to restore that version in code and preview | `RESTORE` reducer (Pattern 1) plus hook `restore()`. The preview already follows `committed.code` (`generator-shell.tsx:268-278`). The code panel follows `committed.code` when not pending (`generator-shell.tsx:85-87`). |
| HIST-03 | Refining from older discards later; dimmed after restore; base notice | Truncation already exists (`session.ts:114-118`). Selector `laterRange` drives dimming and the notice (Pattern 2). |
| HIST-04 | Max 20 versions, oldest dropped | Already in `session.ts:128`. Add `droppedCount` so the numbering stays stable and the cap line shows. This also fixes IN-03. |
| HIST-05 | Semantic list, aria-current, descriptive labels, aria-live status, focus after restore/reset | `<ol aria-label>` with `<li><button>`, keyed by `version.id`. The current item is not disabled (Pitfall 2). Status texts come from notices. Reset focus already exists (`generator-shell.tsx:128-135`, `:303`). |
</phase_requirements>

## Project Constraints

- There is no `./CLAUDE.md` in the repo root [VERIFIED: `cat CLAUDE.md` returned nothing].
- Memory and user rules: write in pt-BR for user-facing copy. GSD runs autonomously.
- From CONTEXT/UI-SPEC:
  - No new npm deps.
  - Never `npx shadcn add`.
  - Fixed pt-BR phrases.
  - `motion-reduce:` variants.
  - `max-md:min-h-11` touch targets.
  - Only one status `aria-live` region.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Cursor move / restore / truncation / cap / numbering | Pure reducer `src/lib/session.ts` | — | All session rules live in one total function that is unit-tested (Phase 6 pattern) |
| `restore()` command | Hook `use-generator-session.ts` | — | Same place as `undo`/`reset`. The reducer guards busy. |
| Turn derivation, status text, base notice text, disclosure open state | Shell `generator-shell.tsx` | — | The shell already owns the status derivation (`:89-94`) and the UI-only state (`tab`, `confirmOpen`) |
| Rendering list/items, container scroll | `turn-list.tsx` / `turn-item.tsx` (client) | — | Presentational. Props only, so they are easy to test in isolation. |
| Code panel scroll-to-top | `code-view.tsx` | shell passes key | `preRef` already exists (`code-view.tsx:20`) |
| Chips per version | `use-suggestions.ts` (unchanged) | — | The effect on `[id]` already handles any cursor change |

## Standard Stack

No new packages. Use what is already installed:

| Library | Version (installed) | Use in this phase |
|---------|---------------------|-------------------|
| react | ^19.3.1 [VERIFIED: package.json] | `useLayoutEffect` for list scroll, `useState` for the disclosure |
| lucide-react | ^1.57.0 [VERIFIED: `node -e require('lucide-react')`] | `Check`, `Loader2`, `AlertTriangle`, `ChevronDown` (all exported. `LoaderCircle`/`TriangleAlert` exist too) |
| shadcn `Button` | `src/components/ui/button` | Disclosure trigger only. The items are plain `<button>`, like the chips in `prompt-form.tsx:139`. |
| vitest ^5.0.4, @testing-library/react ^16.3.3, user-event ^14.6.8, jsdom | [VERIFIED: package.json] | Unit and integration tests |
| @playwright/test ^1.64.1 | [VERIFIED] | Update the e2e strings only |

## Package Legitimacy Audit

Not applicable: this phase installs no external packages.

## Architecture Patterns

### Data flow

```
click TurnItem(vK) ──► session.restore(idK) ──► dispatch RESTORE
                                                     │  (no-op if pending / unknown / current)
                                                     ▼
                            state.cursor = indexOf(idK), error = null,
                            notice = idx < oldCursor ? "undo" : "forward"
                                                     │
            ┌───────────────┬────────────────────────┼─────────────────────┬──────────────────┐
            ▼               ▼                        ▼                     ▼                  ▼
   committed = versions[cursor]  status "Voltou/Foi para vN"  laterRange → dimming +   useSuggestions([id])   CodeView scrollTop=0
   → SandboxPreview code swap    (aria-live, existing <p>)      base notice text       cache hit or fetch     (scrollResetKey)
                                                                                        
next "Refinar" ──► send() base = committedVersion (restored) ──► START baseId=idK ──► COMMIT slices versions[0..K] + new
```

### Recommended file changes

```
src/lib/session.ts                 # + RESTORE, "forward" notice, droppedCount, selectors, IN-01 guard
src/lib/session.test.ts            # + RESTORE / numbering / laterRange / IN-01 cases
src/components/generator/
├── turn-list.tsx                  # NEW: disclosure + scroll region + cap line + <ol>
├── turn-item.tsx                  # NEW: one row (version button | transient div)
├── turn-list.test.tsx             # NEW: presentational tests (states, labels, cap, disclosure, scroll helper)
├── use-generator-session.ts       # + restore(versionId); "committed" result also checks base still exists
├── session-bar.tsx                # props {number, total}; "vN · M versões" / "· 1 versão"
├── prompt-form.tsx                # + turnList slot (after sessionBar), + baseNotice prop above textarea
├── code-view.tsx                  # + scrollResetKey prop → pre.scrollTop = 0
└── generator-shell.tsx            # wire it all; status uses stable numbers; historyOpen state
```

### Pattern 1: RESTORE action (reducer)

Insert this next to UNDO (`session.ts:168`). Extend `SessionNotice` (`session.ts:28`) with `"forward"`. Keep `"undo"` as the notice for every backward move. Then the shell keeps the single mapping `"undo" → "Voltou para vN"`, and the existing `notice).toBe("undo")` test (`session.test.ts:172`) stays valid.

```ts
// session.ts
export type SessionNotice = "committed" | "undo" | "forward" | "reset" | null;
// SessionAction: | { type: "RESTORE"; versionId: number }

case "RESTORE": {
  if (state.pending !== null) return state;                 // D-09 all items disabled while streaming
  const index = state.versions.findIndex((v) => v.id === action.versionId);
  if (index === -1 || index === state.cursor) return state;  // unknown / current → same reference
  return {
    ...state,
    cursor: index,
    error: null,                                             // D-10 erro item disappears on restore
    notice: index < state.cursor ? "undo" : "forward",       // D-20
  };
}
```

Do **not** truncate in RESTORE. D-13 (implicit redo) needs the later versions to survive until COMMIT.

### Pattern 2: Stable numbering and derived selectors

D-17 wants numbers that never change. `version.id` **cannot** be shown directly (Pitfall 1). Add `droppedCount: number` to `SessionState`, with `0` in `initialSessionState`.

In COMMIT, count the cap shifts (`session.ts:128`):

```ts
let dropped = 0;
while (versions.length > MAX_VERSIONS) { versions.shift(); dropped++; }
return { ..., droppedCount: state.droppedCount + dropped };
```

RESET sets `droppedCount: 0` and keeps `nextVersionId` (the existing test at `session.test.ts:214-224` stays).

```ts
export function versionNumber(state: SessionState, index: number): number {
  return state.droppedCount + index + 1;
}
export function currentNumber(state: SessionState): number | null {
  return state.cursor >= 0 ? versionNumber(state, state.cursor) : null;
}
/** Later versions after the cursor (dimmed + "serão descartadas"); null when cursor is last. */
export function laterRange(state: SessionState): { from: number; to: number } | null {
  const last = state.versions.length - 1;
  if (state.cursor < 0 || state.cursor >= last) return null;
  return { from: versionNumber(state, state.cursor + 1), to: versionNumber(state, last) };
}
export function hasDroppedVersions(state: SessionState): boolean {
  return state.droppedCount > 0;
}
```

Why the numbers are stable. A version's index changes in exactly one case: a cap eviction. That eviction shifts every index by 1 and bumps `droppedCount` by 1, so the number stays the same. Truncation only removes versions after the base.

The result matches the existing tests and e2e:
- regenerating vN yields vN again. Its parent is index N-2, so the new version lands at the same index (`generator-shell.test.tsx:232-233`).
- undo to v1 and refine yields "v2 again" (`generator-shell.test.tsx:266-268`).
- IN-03 goes away, because the status at the cap reads `Pronto — v21`, `v22`… and so changes on every commit.

### Pattern 3: Turn derivation in the shell (pure, no new state)

```ts
const later = laterRange(state);          // dim items with index > cursor
const transient =
  pending ? { kind: "gerando", instruction: pending.instruction }
  : error && versions.length > 0 ? { kind: "erro", instruction: error.instruction }
  : null;
```

- The list renders when `versions.length >= 1` (D-04, `refineMode` at `generator-shell.tsx:56`).
- Stop: ABORT clears `pending`/`error` (`session.ts:152-155`), so the transient item disappears (D-11). Nothing extra is needed.
- Retry and new sends: START sets `error: null` and sets `pending` (`session.ts:78-92`), so the erro item becomes a gerando item.

The status text replaces `generator-shell.tsx:90-94`:

```ts
const n = currentNumber(state);
if (pending) status = committed ? "Refinando…" : "Gerando…";
else if (notice === "committed") status = `Pronto — v${n}`;
else if (notice === "undo") status = `Voltou para v${n}`;
else if (notice === "forward") status = `Foi para v${n}`;
else if (notice === "reset") status = "Novo componente iniciado";
```

Base notice text, computed in the shell and passed to `PromptForm` as `baseNotice: string | null`:
- `later.from === later.to` gives `Refinar a partir da v${n} — v${from} será descartada`;
- otherwise `… — v${from} a v${to} serão descartadas`.

It stays visible while pending, because the cursor cannot move and truncation happens only at COMMIT.

### Pattern 4: Container-only scroll (D-03)

`useLayoutEffect` in `TurnList` with deps `[cursor, versions.length, transientKind, open]`. It targets the transient `<li>` if one exists, otherwise the current item. Keep the math in a pure exported helper so it is testable with fake rects:

```ts
export function scrollIntoContainer(container: HTMLElement, el: HTMLElement) {
  const c = container.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  if (r.top < c.top) container.scrollTop -= c.top - r.top;
  else if (r.bottom > c.bottom) container.scrollTop += r.bottom - c.bottom;
}
```

- Include `open` in the deps. On mobile the region is `display:none` while collapsed (all rects are 0, so the call is a harmless no-op). It must scroll on open.
- Do not use `scrollIntoView`. It scrolls ancestors and the page (UI-SPEC §2). It is also `undefined` in jsdom, so calling it throws in tests [VERIFIED: jsdom probe, `typeof p.scrollIntoView === "undefined"`].

### Pattern 5: Code panel scroll-to-top (D-12)

Add `scrollResetKey?: number | null` to `CodeView`, with `useEffect(() => { if (key != null && preRef.current) preRef.current.scrollTop = 0 }, [key])`.

From the shell, pass `scrollResetKey={!pending && (notice === "undo" || notice === "forward") ? committed?.id : null}`. Consecutive restores always change `committed.id`, so the effect fires on each one. The `<pre>` persists across code changes (`code-view.tsx:123-140`), so the ref stays valid. jsdom keeps an assigned `scrollTop`, so this is testable [VERIFIED: probe returned 500 after the set].

### Pattern 6: PromptForm slots

- Add `turnList?: ReactNode`, rendered right after `{sessionBar}` (`prompt-form.tsx:90`), before the `h2`.
- Add `baseNotice?: string | null`, rendered as `<p id="refine-base-notice" className="mb-2 text-xs text-muted-foreground">` between the `h2` (`:91-93`) and the `<form>`. The UI-SPEC places it "between the h2 and the textarea", so either inside the form before the `Textarea` or before the `<form>` works.
- The textarea gets `aria-describedby={baseNotice ? "refine-base-notice prompt-char-count" : "prompt-char-count"}` (replacing `:106`). No live region.

### Pattern 7: Hook

```ts
const restore = useCallback(
  (versionId: number) => dispatch({ type: "RESTORE", versionId }), []);
```

The reducer guard covers busy: START is already in the queue before any click can dispatch. Return it beside `undo`.

### Anti-Patterns to Avoid

- **Disabling the current item** (`disabled={isCurrent}`): the clicked button becomes current, and a disabled button drops focus to `<body>`, which violates D-19. Make the click a no-op in the handler instead (`if (!isCurrent) onRestore(id)`), or rely on the reducer returning the same state.
- **Index keys** (`key={i}`): after a cap eviction, every row would remount and focus would be lost. Use `key={version.id}`. The transient row uses a constant key such as `"transient"`.
- **Storing turns in a separate array** (PITFALLS #9): derive everything from `versions`, `pending` and `error`.
- **Using `versions[0].id > 1` for the cap line** (the UI-SPEC §2 wording): ids survive RESET (`session.ts:178`), so after one "Novo componente" the cap line would show at v1. Use `hasDroppedVersions(state)`.
- **A second `aria-live`** inside the list or the notice: UI-SPEC §8 allows only one region.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Truncate on refine-from-old | New logic in RESTORE or START | Existing COMMIT slice (`session.ts:114-118`) | It is already tested (`session.test.ts:183-193`, `:195-200`) |
| Chips on restore | Restore-specific fetch | `useSuggestions` effect on `[id]` | Cache hit, provisional refetch and abort on change are already handled (`use-suggestions.ts:34-87`) |
| Preview swap | Remount or placeholder | `SandboxPreview code=` prop (`srcDoc` memo on `[code]`) | The same path undo already uses |
| Reset focus | New focus code | Existing `requestNew` / `confirmFocusRef` (`generator-shell.tsx:128-135`, `:303`) | WR-03 is already covered |
| Ctrl+Z with focus on an item | Special case | `useUndoShortcut` already allows non-text targets (`use-undo-shortcut.ts:26-29`) | Buttons are not in `TEXT_FIELD_SELECTOR` |

## Common Pitfalls

### Pitfall 1: "Number = version.id" breaks after reset and after truncation
**What goes wrong:** `RESET` keeps `nextVersionId` (`session.ts:178`, by design for the cache keys, test `session.test.ts:222`). After one "Novo componente", the first version would read "v3". Truncation creates gaps (v1, v3), and regenerating v2 would show "Pronto — v3". This breaks `generator-shell.test.tsx:232` and `:268`.
**How to avoid:** Use `droppedCount + index + 1` (Pattern 2). Ids stay internal (React keys, cache keys, RESTORE payload).
**Note:** this is a deliberate reading of D-17. "v7 stays v7 forever" holds, but the number is not literally the id. See A1.

### Pitfall 2: Focus lost after restore
**What goes wrong:** the focused element is detached or disabled. Causes: index keys, a conditional wrapper around the current item that changes the element type, or `disabled` on the current item.
**How to avoid:** use the same `<button>` element type for every version state, `key={v.id}`, and do not disable the current item. Test with `expect(btn).toHaveFocus()` after `user.click(btn)`. Re-query the button by its new name ("v1, versão atual: …") and assert that it is the same node.

### Pitfall 3: Disabling items while busy
D-09 disables all items while streaming. Focus cannot be inside the list at that moment, because streaming starts from the form, the banner or the preview retry, so this is safe. Do not add opacity for the disabled state (UI-SPEC §4).

### Pitfall 4: Restore during an error clears the retry
RESTORE sets `error: null`, so the banner and "Tentar de novo" disappear (D-10 says the erro item disappears on restore). This is intended. Retry's base fallback (`use-generator-session.ts:107-111`) stays untouched.

### Pitfall 5: IN-01 becomes reachable once restore exists (defense in depth)
RESTORE is blocked while pending, so nothing removes versions during a stream today. Still harden COMMIT (`session.ts:114-118`):

```ts
if (pending.baseId !== null && baseIndex === -1) {
  return { ...state, pending: null,
    error: { kind: "failed", instruction: pending.instruction, baseId: null }, notice: null };
}
```

Mirror the check in the hook so it does not return `"committed"` (which clears the field, `generator-shell.tsx:109`) when the reducer rejected the commit. In `run`, the result is `valid && (base === null || stateRef.current.versions.some(v => v.id === base.id))`. The hook already duplicates the validity check (IN-02), so this follows the same pattern.

### Pitfall 6: Preview "Tentar de novo" on a restored middle version
`regenerate` uses parent = `versions[cursor-1]` (`use-generator-session.ts:122-128`). COMMIT then truncates every later version, matching the base notice that is already visible. When cursor is 0 and the cap has dropped versions, base is null, so `kept=[]` and the number stays `droppedCount+1`, which is acceptable. This is documented and needs no change. It is worth one reducer test.

### Pitfall 7: Test strings that must change (counter format, D-17)
| File:line | Old | New |
|-----------|-----|-----|
| `session-bar.test.tsx:27` | `v3 de 5` | `v3 · 5 versões` (plus a singular case `v1 · 1 versão`) |
| `generator-shell.test.tsx:142, 174, 194, 220, 233, 248, 263, 274, 292, 310` | `vN de M` | `vN · M versões` / `v1 · 1 versão` |
| `e2e/generate.spec.ts:111` | `v2 de 2` | `v2 · 2 versões` |
| `e2e/generate.spec.ts:132` | `v1 de 1` | `v1 · 1 versão` |

Strings that must stay unchanged:
- `Pronto — v1`/`Pronto — v2` (`e2e:93,108,122`, shell helpers `:124-126`)
- `Voltou para v1` (`e2e:114`, shell `:262,279`)
- `Refinando…`, `Atualizando…`, `Tentar de novo`, `Desfazer`, `Novo componente`, `Refinar` (exact)

Collision check:
- RTL `getByRole` name matching is exact for strings. The shell tests use `/Desfazer/` and `/Novo componente/` regexes, and the test instructions ("um card", "azul", "verde", "mais") contain neither, so the new item labels do not collide.
- Playwright `getByRole("button", { name: "Desfazer" })` (`e2e:113`) is a substring match. The item labels ("Restaurar v1: … Concluída.") do not contain it.
- Keep the visible transient word lowercase `gerando…`. `getByText("Gerando…")` is exact and case-sensitive, so it will not double-match the status during the first generation, and the list is absent then anyway.

### Pitfall 8: Mobile disclosure state and reset
`historyOpen` is a `useState(false)` in the shell. `doReset` (`generator-shell.tsx:122-126`) must call `setHistoryOpen(false)`. Commit, undo and restore must not touch it. jsdom ignores `max-md:hidden`, so the list stays queryable in the unit tests whatever the toggle state. Test `aria-expanded` and `aria-controls`, not visibility.

## Code Examples

Turn item (version branch), following the UI-SPEC §4 labels:

```tsx
<button
  type="button"
  aria-current={isCurrent ? "true" : undefined}
  aria-label={
    isCurrent ? `v${n}, versão atual: ${text}. Concluída.`
    : isLater ? `Restaurar v${n}: ${text}. Concluída. Será descartada ao refinar.`
    : `Restaurar v${n}: ${text}. Concluída.`
  }
  title={text}
  disabled={busy}
  onClick={() => { if (!isCurrent) onRestore(id); }}
  className={cn("group flex h-8 w-full min-w-0 items-center gap-2 rounded-md border-l-2 border-transparent px-2 text-left text-xs max-md:min-h-11 hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 outline-none disabled:pointer-events-none disabled:cursor-default",
    isCurrent && "bg-muted border-primary")}
>
```

Here `text` is `version.source === "manual" ? "Edição manual" : version.instruction`. Dimmed later items: `opacity-50 group-hover:opacity-100 group-focus-visible:opacity-100` on the text and the icon only.

## State of the Art

| Old (Phase 6) | New (Phase 7) | Impact |
|---------------|---------------|--------|
| Index display `cursor + 1` of `versions.length` (06-RESEARCH:214) | `droppedCount + index + 1` | Fixes IN-03; numbers are stable at the cap |
| Notice `"committed" \| "undo" \| "reset"` | Adds `"forward"` | New "Foi para vN" text |
| `SessionBar position/total` → `vN de M` | `number/total` → `vN · M versões` | Test strings change (Pitfall 7) |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | D-17 "come from the version id" is satisfied by a stable display number (`droppedCount + index + 1`) rather than the raw `id`, because the raw id shows v3 after reset and gaps after truncation | Pattern 2 / Pitfall 1 | If the user truly wants raw ids, gaps (v1, v3) appear, numbering continues after reset, and `generator-shell.test.tsx:232,268` change. Low risk: the literal reading contradicts the e2e expectation "Pronto — v2" after undo + refine. |
| A2 | Code-panel scroll-to-top is keyed to navigation notices only, not to commit | Pattern 5 | Minor UX: if a scroll-to-top on commit is also wanted, key it to `committed.id` alone |

## Open Questions

1. **The cap line copy.** The UI-SPEC says "Versões mais antigas descartadas (limite de 20)" and CONTEXT says "Versões mais antigas descartadas". Recommendation: use the UI-SPEC text (it is approved), via `MAX_VERSIONS` interpolation.

## Environment Availability

Skipped: there are no external dependencies. Vitest, RTL, jsdom and Playwright are already installed.

## Validation Architecture

(`workflow.nyquist_validation` is `false` in `.planning/config.json`. The section is included because the orchestrator asked for it.)

| Property | Value |
|----------|-------|
| Framework | Vitest 5 + RTL 16 + user-event 14 (jsdom); Playwright 1.64 for e2e |
| Config | `vitest.config.ts` (excludes `e2e/**`), `vitest.setup.ts` (jest-dom) |
| Quick run | `npx vitest run src/lib/session.test.ts src/components/generator` |
| Full suite | `npm test` then `npm run e2e` (needs `UIFORGE_E2E_MOCK=1` per playwright config) |

### Requirement → test map

| Req | Behavior | Type | Test location / case |
|-----|----------|------|----------------------|
| HIST-01 | Items `v1..vN` in order, oldest first; current has `aria-current="true"` + "atual" | component | `turn-list.test.tsx`: "renders versions oldest-first with current marked" |
| HIST-01 | Transient gerando item (Loader2, `Gerando: {txt}`) while pending; erro item on error; none after ABORT | component + shell | `turn-list.test.tsx` "transient gerando/erro"; shell: hang refine → `getByText("gerando…")`, Parar → gone; `behaviors=["error"]` → `Erro: azul` |
| HIST-01 | Items disabled while busy | shell | "disables list items while streaming" (`behaviors.push("hang")`) |
| HIST-02 | RESTORE moves cursor, clears error, notice undo/forward; no-op when pending/unknown/current (same ref) | unit | `session.test.ts`: "RESTORE moves cursor…", "RESTORE ignored while pending / unknown / current" |
| HIST-02 | Click v1 → preview `data-code` = v1 code, status `Voltou para v1`; click v2 → `Foi para v2` | shell | "restores a version by clicking a turn" (uses `twoVersions`; preview stub `data-code`) |
| HIST-02 | Code pre `scrollTop` reset to 0 on restore | component/shell | set `pre.scrollTop = 500`, click item → expect 0 |
| HIST-02 | Chips switch to restored version's (cache, no refetch for cached id) | shell | count `/api/suggest` calls before/after restore to v1 (cached) — unchanged |
| HIST-03 | `laterRange` null at last; `{from,to}` after restore | unit | `session.test.ts` "laterRange" |
| HIST-03 | Later items dimmed with "Será descartada ao refinar." label; base notice singular/plural; textarea `aria-describedby` includes `refine-base-notice` | component + shell | `turn-list.test.tsx`; `prompt-form.test.tsx` "renders baseNotice and describedby"; shell: 3 versions → restore v1 → `Refinar a partir da v1 — v2 a v3 serão descartadas` |
| HIST-03 | Refine after restore truncates; notice gone; new version numbered v2 | shell + unit | shell: restore v1, refine → `Pronto — v2`, `v2 · 2 versões`, no v3 item; existing `session.test.ts:183` |
| HIST-04 | Cap 20; `droppedCount` increments; numbers stable (v2..v21); status `Pronto — v21` | unit | extend `session.test.ts:202` ("caps…") with `droppedCount === 1`, `versionNumber(s,0) === 2`, `currentNumber === 21` |
| HIST-04 | Cap line shown iff `droppedCount > 0`; RESET resets to 0 | component + unit | `turn-list.test.tsx` "cap line"; extend RESET test |
| HIST-04 | IN-01: COMMIT with unknown baseId keeps versions and sets error | unit | `session.test.ts` "COMMIT with unknown baseId does not wipe history" |
| HIST-05 | `<ol>` named "Histórico de versões", `listitem`s, buttons with exact labels | component | `getByRole("list", { name: "Histórico de versões" })`, `within(list).getAllByRole("listitem")` |
| HIST-05 | Focus stays on clicked item after restore (same node) | shell | `user.click(btn)` → `expect(btn).toHaveFocus()`; `btn` now has `aria-current` |
| HIST-05 | Mobile disclosure `aria-expanded`/`aria-controls`, `Histórico (N)`, collapsed again after reset | component + shell | toggle test; reset → `aria-expanded="false"` |
| HIST-05 | Ctrl+Z with focus on an item undoes; focus kept | shell | focus item → `{Control>}z{/Control}` → `Voltou para v1` |
| HIST-05 | Scroll helper only adjusts the container | unit | `turn-list.test.tsx` `scrollIntoContainer` with stubbed `getBoundingClientRect` |
| D-17 | Session bar `v3 · 5 versões` / `v1 · 1 versão` | component | `session-bar.test.tsx` |
| — | e2e smoke stays green | e2e | `e2e/generate.spec.ts` with lines 111/132 updated; optional: click `Restaurar v1` → `Voltou para v1` |

### Sampling
- Per task: quick run. Per plan or wave: `npm test` plus `npx tsc --noEmit` plus `npm run lint`. Phase gate: full suite plus e2e.

### Wave 0 gaps
- `src/components/generator/turn-list.test.tsx` (new).
- No framework installs are needed.

## Security Domain

| ASVS | Applies | Control |
|------|---------|---------|
| V5 Input validation / output encoding | yes (instruction text rendered in the list and in `title`/`aria-label`) | React text escaping only. Never `dangerouslySetInnerHTML`. |
| V2/V3/V4/V6 | no | No auth, session, access control or crypto surface. Data stays in memory, with no persistence (CONTEXT). |

Threat: user or AI text in labels counts as Tampering/XSS. React escapes it, so no new risk. Restore adds no network calls apart from the existing `/api/suggest` fetch for an uncached version.

## Sources

### Primary (HIGH)
- Repo files read in this session: `src/lib/session.ts`, `session.test.ts`, `use-generator-session.ts`, `use-suggestions.ts`, `session-bar.tsx`, `prompt-form.tsx`, `generator-shell.tsx`, `generator-shell.test.tsx`, `code-view.tsx`, `sandbox-preview.tsx`, `use-undo-shortcut.ts`, `e2e/generate.spec.ts`, `package.json`, `vitest.config.ts`
- Phase docs: 07-CONTEXT, 07-UI-SPEC, 06-REVIEW (IN-01, IN-03, WR-01), 06-01-PLAN / 06-RESEARCH (the `nextVersionId` rationale)
- Runtime probes: lucide exports; jsdom `scrollTop` is writable and `scrollIntoView` is undefined

## Metadata
- Stack: HIGH (no changes). Architecture: HIGH (derived from the code). Pitfalls: HIGH (string and line references verified).
- Valid until: the next change to `session.ts` or the shell.
