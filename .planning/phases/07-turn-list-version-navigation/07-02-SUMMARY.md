---
phase: 07-turn-list-version-navigation
plan: 02
subsystem: generator-ui
tags: [prompt-form, code-view, a11y, history]
requires: []
provides:
  - "PromptForm turnList?: ReactNode slot (between sessionBar and title)"
  - "PromptForm baseNotice?: string | null (#refine-base-notice, aria-describedby)"
  - "CodeView scrollResetKey?: number | null (scroll-to-top on change)"
affects: [generator-shell (07-03 wires the props)]
tech-stack:
  added: []
  patterns: ["optional slot props", "key-driven effect for imperative scroll reset"]
key-files:
  created:
    - src/components/generator/code-view.test.tsx
  modified:
    - src/components/generator/prompt-form.tsx
    - src/components/generator/prompt-form.test.tsx
    - src/components/generator/code-view.tsx
decisions:
  - "Base notice is a plain p (no aria-live/role); announced only via textarea aria-describedby (single status region, HIST-05)"
  - "scrollResetKey defaults to null and the effect is a no-op for null, so existing callers are unaffected"
metrics:
  duration: "~4min"
  completed: 2026-10-18
  tasks: 2
  files: 4
---

# Phase 7 Plan 02: PromptForm slots and CodeView scroll reset Summary

PromptForm gains an optional `turnList` slot and a `baseNotice` line (`#refine-base-notice`, wired into the textarea `aria-describedby`), and CodeView gains `scrollResetKey`, which scrolls the code `pre` to the top whenever a non-null key changes.

## Tasks

| Task | Name | Commits | Files |
| ---- | ---- | ------- | ----- |
| 1 | PromptForm turnList slot and base notice | 19fb141 (test), cd87728 (feat) | prompt-form.tsx, prompt-form.test.tsx |
| 2 | CodeView scrollResetKey | 58053f2 (test), 70b30f3 (feat) | code-view.tsx, code-view.test.tsx |

## Verification

- `npx vitest run`: 23 files, 260 tests passed
- `npm run typecheck`: clean
- `npm run lint`: clean
- `grep -c aria-live src/components/generator/prompt-form.tsx` -> 0

## Deviations from Plan

None - plan executed exactly as written.

## TDD Gate Compliance

RED and GREEN commits exist for both tasks. In RED, the "omits notice when null/missing" and two of the three scroll cases passed early. That was expected, since they guard behavior that already worked (no notice, no reset). The tests that check the new behavior failed until it was implemented.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: src/components/generator/code-view.test.tsx
- FOUND commits: 19fb141, cd87728, 58053f2, 70b30f3
