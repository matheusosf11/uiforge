# Phase 7: Turn List & Version Navigation - Context

**Gathered:** 2026-10-18
**Status:** Ready for planning

<domain>
## Phase Boundary

UI on top of the Phase 6 session reducer. Users see their session as a mini-chat list of turns (one item per committed version, plus a transient "gerando…" or "erro" item for the turn in progress), can click any version to restore it in code and preview, and understand what the next refinement will build on. After a restore, later versions are dimmed. A notice reads "Refinar a partir da vN — vX a vY serão descartadas". Committing a refinement from there drops the later versions; that truncation is already in the reducer. The 20-version cap is kept, with stable version numbers. The list is fully accessible.

Requirements: HIST-01, HIST-02, HIST-03, HIST-04, HIST-05.

Out of this phase: editable code and "Edição manual" versions (Phase 8; the list must render a `source: "manual"` version gracefully but nothing creates one yet), full e2e journey, GIF and READMEs (Phase 9). No persistence, no deleting or renaming versions, no diff view.
</domain>

<decisions>
## Implementation Decisions

### Carried forward (locked earlier — do not re-ask)
- Versions live only in memory. Refining from an older version truncates the later ones at COMMIT, with no redo after a commit. Max 20 versions, oldest dropped (`MAX_VERSIONS`, already in `src/lib/session.ts`).
- Undo means cursor − 1 (Phase 6). It is disabled while streaming and at the first kept version. Ctrl/⌘+Z only works outside text fields.
- "Novo componente" asks for confirmation when there is more than one version, and the reset keeps the prompt text.
- Suggestion chips are cached per version id (`useSuggestions`).
- A single status `aria-live` region already exists in the shell ("Pronto — vN", "Refinando…", "Voltou para vN").
- Only one "Tentar de novo" button may exist at a time; WR-01 in Phase 6 established this.

### Placement & layout
- **D-01:** Desktop: the list sits between the session bar and the prompt field, in the left column. It is a mini-chat list with its own scroll and a max height of about 5 items, so the field and chips stay visible.
- **D-02:** Mobile: the same list, inside a disclosure "Histórico (N)" that is collapsed by default. Its open/closed state is remembered for the session, in memory only with no storage. "Novo componente" resets it.
- **D-03:** Order is oldest at the top and newest at the bottom, near the field. After each commit, undo or restore, the list scrolls so the current item is visible.
- **D-04:** The list appears only after v1 is committed, the same rule as the session bar. The first generation keeps the current flow. If the first generation fails there is no list, only the banner.

### Turn items
- **D-05:** Each item has three parts:
  - the label "vN";
  - the instruction, on 1 line with an ellipsis (full text in `title` and in the accessible label);
  - a status icon on the right.

  The v1 item shows the original prompt. No timestamps. The same truncation applies on mobile. Repeated prompts are separate items.
- **D-06:** Status icons come from lucide, neutral, and each has screen-reader text:
  - ok: `Check` in muted-foreground;
  - gerando: `Loader2` spinning, static under `prefers-reduced-motion`;
  - erro: `AlertTriangle` in the destructive color.
- **D-07:** The current version has a `bg-muted` background, a left border in the primary color and a small "atual" badge, so it never relies on color alone. It also carries `aria-current="true"`.
- **D-08:** Later versions after a restore are shown at about 50% opacity, with no strikethrough. Their accessible label adds that the version will be discarded when refining.

### Transient turns (in progress / failed / stopped)
- **D-09:** While a turn streams, a transient "gerando…" item with its instruction appears at the end of the list. It becomes a "vN ✓" item on commit. All list items are disabled while streaming.
- **D-10:** A failed turn (any `SessionError`) shows as a transient item at the end with "⚠ erro". It is not a version and is not restorable. The item disappears on a successful retry, a new send, undo, restore or reset. The "Tentar de novo" button stays in the existing banner; the item only shows status.
- **D-11:** "Parar" leaves no trace: the "gerando…" item disappears and the text stays in the field (Phase 6 D-02).

### Restore & later versions
- **D-12:** Clicking any version item restores it instantly, with no confirmation. Code panel and preview switch directly, with no "Atualizando…" badge, and the code panel scrolls to the top.
- **D-13:** Dimmed later versions are clickable and restore normally. This works as an implicit redo until a refinement is committed from an earlier version.
- **D-14:** "Desfazer" stays cursor − 1 from whatever version is current. Navigation history is not recorded.
- **D-15:** The base notice is a discreet line just above the textarea: "Refinar a partir da vN — vX a vY serão descartadas". For a single later version, the wording is adapted to name just that one. The notice is shown only when the current version is not the last one. The button label stays "Refinar".
- **D-16:** On restore, the suggestion chips switch to the restored version's chips. They come from the cache when present and are fetched otherwise.

### Numbering & cap
- **D-17:** Version numbers are stable display numbers: v7 stays v7 forever, including after the cap drops older versions. They are NOT the raw internal `version.id`, which keeps counting across resets and regenerations. Use a `droppedCount` in the session state plus the index (`droppedCount + index + 1`), so a new session starts at v1 again. After a refine from an older version discards the later ones, the new version takes the next number. After the cap drops old versions, the list starts at a later number and shows a line "Versões mais antigas descartadas (limite de 20)", shown when `droppedCount > 0`. The session bar changes from "vN de M" to "vN · M versões". Status and announcements use the stable number.

### Accessibility & keyboard
- **D-18:** The list is a semantic `<ol>` with an accessible name, for example "Histórico de versões". Each version is a regular `<button>` inside an `<li>`. Tab and Shift+Tab move between items; Enter or Space restores. No roving tabindex.
- **D-19:** After a restore, focus stays on the clicked item. Reset already focuses the textarea (Phase 6 WR-03).
- **D-20:** Announcements go through the existing status region. Use "Voltou para vN" for any move to an earlier version, by undo or restore. Use "Foi para vN" for a move to a later, dimmed version.

### Claude's Discretion
- Reducer action name and shape for restore (for example `RESTORE { versionId }`). How the restore notice and later-version range are derived (selectors in `session.ts`).
- Component split (for example `turn-list.tsx` and `turn-item.tsx`), exact Tailwind classes, the max-height value, and the disclosure implementation (native `<details>` or a button with `aria-expanded`).
- How the session bar adapts to the stable-number format, and the exact text of the "Versões mais antigas descartadas" line.
- Unit and integration test layout. Extending the e2e smoke is optional (the full journey is Phase 9).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 6 (session core this phase builds on)
- `.planning/phases/06-session-core-refine-loop/06-CONTEXT.md`: session decisions (truncate at COMMIT, cap, undo, chips, status texts)
- `.planning/phases/06-session-core-refine-loop/06-UI-SPEC.md`: established visual and copy contract (session bar, status texts, badge, chips)
- `.planning/phases/06-session-core-refine-loop/06-REVIEW.md` and `06-REVIEW-FIX.md`: WR-01 (retry base, single retry button) and WR-03 (focus after reset). IN-01 (COMMIT with an unknown baseId wipes history) and IN-03 (status at the cap) become relevant now.
- `.planning/phases/06-session-core-refine-loop/06-VERIFICATION.md`

### Milestone research
- `.planning/research/ARCHITECTURE.md`: reducer, hook and shell integration
- `.planning/research/PITFALLS.md`: #9 turns/versions desync, #5 abort corrupting history, #7 preview flashing

### Requirements & roadmap
- `.planning/REQUIREMENTS.md`: HIST-01..HIST-05
- `.planning/ROADMAP.md` §Phase 7: 5 success criteria
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/session.ts` holds the pure reducer:
  - `Version {id, code, instruction, source}`;
  - `Pending {id, instruction, baseId, text}`;
  - `SessionError {kind, instruction, baseId}`;
  - `cursor`, `nextVersionId`, `notice` (`committed`/`undo`/`reset`), `MAX_VERSIONS = 20`;
  - selectors `committedVersion`, `isBusy`, `canUndo`.

  RESTORE and the related selectors and notice are added here.
- `src/components/generator/use-generator-session.ts`: the hook exposing send, retry, regenerate, stop, undo and reset. A `restore(versionId)` is added here.
- `src/components/generator/session-bar.tsx`: "vN de M", "Desfazer", "Novo componente" (toolbar). It switches to stable numbering.
- `src/components/generator/generator-shell.tsx`: left column with session bar, form and chips; status aria-live region; mobile Preview/Código tabs.
- `src/components/generator/use-suggestions.ts`: per-version cache; it already handles undo, so restore follows the same path.
- `src/components/generator/prompt-form.tsx`: textarea and refine labels. The base notice line goes right above the textarea.
- `lucide-react` icons and shadcn `Button` from `src/components/ui/`.

### Established Patterns
- Fixed pt-BR user-facing phrases; one status aria-live region; `motion-reduce:` variants; `max-md:min-h-11` touch targets.
- Vitest and RTL unit/integration tests (`generator-shell.test.tsx` has 11+ shell cases). Playwright e2e uses the env-gated mock (`UIFORGE_E2E_MOCK=1`).
- Panels use `bg-card`. The dark theme has the LoomDraft canvas background.

### Integration Points
- The shell's left column, between `SessionBar` and `PromptForm`.
- The status text derivation in the shell, which needs the new "Foi para vN" notice and stable numbers.
- The e2e refine smoke (`e2e/generate.spec.ts`) asserts "Pronto — v2" and "Voltou para v1". Keep those strings.
</code_context>

<specifics>
## Specific Ideas

- Item: "v2 · deixar em modo escuro" plus an icon. Current item: left primary border, `bg-muted`, "atual" badge.
- Notice above the field: "Refinar a partir da v2 — v3 a v5 serão descartadas".
- Mobile disclosure label: "Histórico (N)".
- Cap line: "Versões mais antigas descartadas".
- Announcements: "Voltou para vN" (earlier) and "Foi para vN" (later).
</specifics>

<deferred>
## Deferred Ideas

None. The user declined extra navigation shortcuts (Alt+↑/↓), reusing a past turn's instruction and list animations for this phase.
</deferred>

---

*Phase: 07-turn-list-version-navigation*
*Context gathered: 2026-10-18*
