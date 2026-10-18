---
phase: 05-refine-api-contract-edit-prompt
plan: 01
subsystem: api
tags: [prompt, mock, vitest, ai-sdk]
requires: []
provides:
  - buildSystem/buildUserPrompt edit and generate prompt builders
  - MAX_CODE_LENGTH, CODE_TOO_LARGE_MESSAGE, REFINE_ERROR_MESSAGE
  - mode-aware friendlyGenerateError
  - mock refine mode (REFINED_COMPONENT) and getModels(prompt, currentCode)
affects: [05-02 route wiring, phase 06 client]
tech-stack:
  added: []
  patterns: [shared HARD_RULES constant, delimiter-escaped data block in user message]
key-files:
  created: [src/lib/ai/prompt.test.ts]
  modified:
    - src/lib/prompt-limits.ts
    - src/lib/generate-error.ts
    - src/lib/generate-error.test.ts
    - src/lib/ai/prompt.ts
    - src/lib/ai/mock-model.ts
    - src/lib/ai/model.ts
    - src/lib/ai/model.test.ts
key-decisions:
  - "SYSTEM_PROMPT is now buildSystem('generate'); verified byte-identical to the previous literal (modulo CRLF)"
  - "Closing tag inside currentCode is escaped as <\\/current_code>"
  - "Mock slot comment {/*__EDITED_SLOT__*/} stays valid TSX when not replaced"
requirements-completed: [ITER-03, ITER-04]
duration: 10min
completed: 2026-10-17
---

# Phase 5 Plan 01: Refine library pieces Summary

Pure, tested server-side helpers for refine mode: edit/generate prompt builders with injection-safe delimiters, 30k code limit, pt-BR refine/size phrases, and a deterministic mock refine output.

## Tasks

1. Limits, error phrases, prompt builders - 3a0a2c3
2. Mock refine mode and getModels signature - 15696dd

## Verification

`npx vitest run src/lib` passes (79 tests); `npx tsc --noEmit` clean.

## Deviations from Plan

None - plan executed exactly as written. The route (`route.ts`) was not touched (plan 02).

## Known Stubs

None.

## Self-Check: PASSED
