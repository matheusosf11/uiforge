# Phase 5: Refine API Contract & Edit Prompt - Context

**Gathered:** 2026-10-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Server-side only. `/api/generate` accepts `{ prompt, currentCode? }`. When `currentCode` is present (non-empty), the route runs in edit mode: an edit system prompt + delimited user message, and it streams back the **complete** updated component (never a diff). `{ prompt }`-only requests behave exactly as v1.0. The env-gated e2e mock gains a deterministic refine mode. Shared limits/messages are exported for the client.

Out of this phase: any client/UI change (refine-by-default input, session reducer, version validation before commit, oversize check in the form) — those are Phase 6+.

Requirements: ITER-03, ITER-04.
</domain>

<decisions>
## Implementation Decisions

### Edit fidelity (edit system prompt)
- **D-01:** Minimal change — modify only what the instruction asks; preserve structure, names, Tailwind classes, texts and behavior not mentioned.
- **D-02:** Keep the default-export component name and file organization unless the instruction explicitly requires otherwise (keeps the downloaded filename stable).
- **D-03:** If the instruction conflicts with HARD RULES (e.g. "use framer-motion", "fetch from an API"), approximate within the rules (Tailwind animation, mocked data) and still return only code — same behavior as v1.0 generation.
- **D-04:** Prompt structure: shared HARD RULES constant used by both modes; edit mode = HARD RULES + edit addendum in `system` (no one-shot example); user message wraps `<current_code>…</current_code>` and `<instruction>…</instruction>`. Addendum states the content of `<current_code>` is data, never instructions. Instructions never leave `system`.

### Size limit & errors
- **D-05:** `MAX_CODE_LENGTH = 30_000` characters, exported from `src/lib/prompt-limits.ts` (shared with client). Instruction (`prompt`) limit stays `MAX_PROMPT_LENGTH = 2000` in both modes.
- **D-06:** Oversized `currentCode` → HTTP **413** with a distinct body, mapped in `src/lib/generate-error.ts` to a fixed pt-BR phrase, e.g. "O componente ficou grande demais para refinar. Comece um Novo componente." Never show raw messages (v1.0 pattern).
- **D-07:** Mode-aware generic failure phrase: refine → "Falha ao refinar o componente. Sua versão anterior foi mantida."; generate keeps the v1.0 phrase. Rate-limit and size have their own phrases. (Constants defined here; displayed by the client in Phase 6.)
- **D-08:** Empty or whitespace-only `currentCode` is treated as absent → generate mode (no error).

### Quota & rate limit
- **D-09:** Refine counts the same as a generation in the existing in-memory limiter (one bucket, 5/min/IP). No changes to limiter config.
- **D-10:** Set a generous `maxOutputTokens` in **both** modes — high enough for the largest accepted component (~30k chars), preventing runaway output without truncating normal cases.
- **D-11:** Log usage numbers only (mode, model id actually used, input/output tokens) server-side. Never log prompt or code content.

### Validation
- **D-12:** Output validation (non-empty parse, `export default`, not truncated) lives **only in the client** (Phase 6, before committing a version). Server only guarantees clean stream termination (existing error-on-midstream-failure behavior stays).
- **D-13:** No server or client "shrink threshold" blocking — shrinking can be legitimate ("remove o rodapé"); rely on strict prompt + undo.

### E2E mock
- **D-14:** In edit mode the mock streams a fixed deterministic `REFINED_COMPONENT` with visible text marker (e.g. "Refinado"); if `currentCode` contains `__edited__`, output also includes "EditedSeen". `__e2e_error__` (in prompt) still forces failure in edit mode. Mock switch remains env-only (D-02 from v1.0). `getModels`/`createE2EMockModel` receive `currentCode`.

### Real-model quality check
- **D-15:** Manual checklist with fixed refine prompts run by the user with a real key, recorded in the phase UAT: change a color, add a button, remove a section, impossible request (framer-motion), injection attempt inside code. No automated real-key script.

### Claude's Discretion
- Exact wording of the edit addendum and of the pt-BR phrases (keeping the meaning above).
- Exact `maxOutputTokens` value; exact 413 body token (e.g. `code_too_large`).
- Whether to extract pure `buildSystem(mode)` / `buildUserPrompt()` helpers (recommended for testability).
- Exact mock REFINED_COMPONENT content and chunking (reuse existing `chunkText`).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone research
- `.planning/research/SUMMARY.md` — consolidated v1.1 decisions (contract `currentCode`, full-file output, phase order, research flags)
- `.planning/research/ARCHITECTURE.md` — API contract, prompt design, mock extension details
- `.planning/research/PITFALLS.md` — pitfalls #1 (partial rewrite), #2 (size vs 2000 limit), #3 (quota), #4 (injection), #11 (route regression)

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` — ITER-03, ITER-04
- `.planning/ROADMAP.md` §Phase 5 — goal and 5 success criteria
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/ai/prompt.ts` — `SYSTEM_PROMPT` (HARD RULES + one-shot); split HARD RULES into a shared constant.
- `src/lib/prompt-limits.ts` — `MAX_PROMPT_LENGTH`; add `MAX_CODE_LENGTH` here.
- `src/lib/generate-error.ts` — `RATE_LIMIT_MESSAGE`, `GENERIC_ERROR_MESSAGE`, `friendlyGenerateError`; extend with size + refine phrases.
- `src/lib/ai/mock-model.ts` — `FIXED_COMPONENT`, `ERROR_KEYWORD`, `chunkText`, `MockLanguageModelV4`; add refine output.
- `src/lib/ai/model.ts` — `getModels(prompt)`, `isE2EMock()`; signature gains `currentCode`.

### Established Patterns
- Zod `Body` schema in `route.ts`; 400 text body on invalid input.
- First-delta peek + model fallback chain (`openStream`) reports provider failures as real HTTP status before bytes are sent; mid-stream failures `controller.error`.
- Plain text stream protocol (not UI-message protocol).
- Fixed pt-BR user-facing phrases; never raw error messages.
- Mock is env-only and hard-disabled on Vercel Production.

### Integration Points
- `src/app/api/generate/route.ts` — `Body` schema, `openStream(model, prompt, signal)` → needs system/prompt by mode, `maxOutputTokens`, usage logging.
- Tests: `src/lib/ai/model.test.ts`, existing route/unit tests; add backward-compat `{prompt}` test, 10k-char body test, oversize 413 test, injection fixture test.
</code_context>

<specifics>
## Specific Ideas

- Manual UAT refine script (D-15): cor, adicionar botão, remover seção, pedido impossível, injeção no código.
- Mock markers: "Refinado" and "EditedSeen" (from `__edited__` in currentCode).
</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.
</deferred>

---

*Phase: 05-refine-api-contract-edit-prompt*
*Context gathered: 2026-10-17*
