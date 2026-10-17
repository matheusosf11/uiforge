---
phase: 06-session-core-refine-loop
plan: 04
subsystem: ui
tags: [prompt-form, sandbox-preview, refine-mode, suggestion-chips]
requires: []
provides:
  - "PromptForm optional props: mode, chips, sessionBar, textareaRef"
  - "SandboxPreview optional props: updating, regenerateLabel"
affects: [06-06]
tech-stack:
  added: []
  patterns: ["optional props with v1.0 defaults", "merged external + internal textarea ref"]
key-files:
  created: []
  modified:
    - src/components/generator/sandbox-preview.tsx
    - src/components/generator/sandbox-preview.test.tsx
    - src/components/generator/prompt-form.tsx
    - src/components/generator/prompt-form.test.tsx
key-decisions:
  - "Generate mode keeps the selectedId highlight logic; refine mode highlights by value === prompt"
  - "Example gallery now wrapped in role=group aria-label=Exemplos"
requirements-completed: []
duration: 8min
completed: 2026-10-17
---

# Phase 6 Plan 04: Refine-aware PromptForm and SandboxPreview Summary

PromptForm gains a refine mode (texts, suggestion chips that prefill and focus without submitting, 4 aria-busy skeleton chips, sessionBar slot, textareaRef) and SandboxPreview gains a non-live "Atualizando…" badge plus configurable retry label, with the iframe never remounting.

## Tasks
1. SandboxPreview updating badge + regenerateLabel: 757a761
2. PromptForm refine mode, chips, skeletons: f0b20d3

## Verification
- vitest src/components/generator: 31 passed (existing tests unchanged)
- npm run typecheck and npm run lint: clean

## Deviations from Plan
None - plan executed exactly as written.

## Threat Flags
None. Chip labels/prompts render as React text and attributes only; click only prefills (T-06-13).

## Known Stubs
None.

## Self-Check: PASSED
