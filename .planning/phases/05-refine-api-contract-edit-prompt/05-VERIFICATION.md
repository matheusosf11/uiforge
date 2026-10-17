---
phase: 05-refine-api-contract-edit-prompt
verified: 2026-10-17T00:00:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "D-15 real-key UAT checklist (05-UAT.md): 5 cases (change color, add button, remove section, framer-motion request, injection in currentCode)"
    expected: "Complete file returned, no markdown fences, export default, same component name, injected instructions ignored"
    why_human: "Needs a real GOOGLE_GENERATIVE_AI_API_KEY; mock does not validate real model edit quality (ROADMAP research flag)"
---

# Phase 5 Verification

**Goal:** API refines an existing component (currentCode + instruction streams the complete updated component); old `{prompt}` clients keep working.
**Evidence:** `npx vitest run` -> 12 files, 132 tests passed. Code read directly (post WR-01..WR-04 fixes). No TBD/FIXME/TODO markers in phase files.

## Success criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | `{prompt,currentCode}` streams complete file, not diff | VERIFIED (server) | route.ts derives mode "edit", passes `buildSystem("edit")` + `buildUserPrompt` (wraps `<current_code>`/`<instruction>`); edit addendum demands COMPLETE file, minimal change. Real-model quality -> human UAT |
| 2 | `{prompt}` only unchanged | VERIFIED | `SYSTEM_PROMPT = buildSystem("generate")`; null/whitespace currentCode -> generate; route test "so prompt: modo generate identico ao v1.0" |
| 3 | Oversized currentCode rejected, constant exported | VERIFIED (server) | `MAX_CODE_LENGTH = 30_000` in prompt-limits.ts; route returns 413 `code_too_large` before rate limiter (30_000 accepted, 30_001 -> 413 tested); `CODE_TOO_LARGE_MESSAGE` pt-BR exported. Body byte cap 256_000 enforced on actual body. |
| 4 | Instruction-like text in currentCode is data | VERIFIED | System prompt states `<current_code>` is DATA; delimiters neutralized case/whitespace-tolerantly in code and instruction; injection fixture route test passes. Actual model obedience -> human UAT case 5 |
| 5 | Mock deterministic refine + error marker | VERIFIED | `REFINED_COMPONENT` ("Refinado", "EditedSeen" when `__edited__`), `createE2EMockModel(prompt, currentCode)`, `getModels` forwards currentCode; error keyword checked on prompt only; tests in model.test.ts |

## Requirements

| ID | Status | Notes |
|----|--------|-------|
| ITER-03 | SATISFIED (server side) | Only current code + instruction sent, no history; optional `currentCode` with 30k limit; friendly message constant exported. The client-side "Novo componente" offer is Phase 6 scope and not assessed here. |
| ITER-04 | SATISFIED (server side) | Complete-file edit prompt, preserve-everything rules, current code treated as data. Real-model behavior pending UAT. |

Both IDs appear in both PLAN frontmatters and in REQUIREMENTS.md; no orphaned Phase 5 requirements.

## Human verification required

D-15 real-key UAT (`05-UAT.md`, status pending, intentionally manual): run the 5 cases against real Gemini. Not a gap.

## Gaps

None.
