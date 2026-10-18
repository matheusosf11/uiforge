---
phase: 05-refine-api-contract-edit-prompt
reviewed: 2026-10-17T00:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - src/app/api/generate/route.ts
  - src/app/api/generate/route.test.ts
  - src/lib/ai/prompt.ts
  - src/lib/ai/prompt.test.ts
  - src/lib/ai/model.ts
  - src/lib/ai/model.test.ts
  - src/lib/ai/mock-model.ts
  - src/lib/prompt-limits.ts
  - src/lib/generate-error.ts
  - src/lib/generate-error.test.ts
findings:
  critical: 0
  warning: 4
  info: 2
  total: 6
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-10-17
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

No blockers found. The 413 path runs before the rate limiter. The generate system prompt is byte-identical to the one at 5987298 (HEADER + HARD_RULES + ONE_SHOT + FOOTER concatenates to the original text). The usage log carries only mode, model id and token counts, so no prompt or code leaks. Stream error handling cannot double-close: a `close()` that throws after a client cancel is caught, and `error()` on a closed stream is a no-op. The mock is correct. The warnings below cover the case where content-length is absent, the delimiter escape, and whitespace-only prompts.

## Warnings

### WR-01: Content-length early reject is bypassable (absent or chunked body is unbounded)

**Status: FIXED (b40a9bc)** - body read as text and byte-checked; header fast-reject kept; 413 stays before limiter.

**File:** `src/app/api/generate/route.ts:28-31`
**Issue:** `Number(null)` is `0`, so a missing header skips the guard. A chunked request or one with a lying header then goes to `await req.json()`, which buffers the whole body before any size check. The post-parse 413 only covers `currentCode`. The "defense in depth" intent of `MAX_BODY_BYTES` is not met, and this runs before the rate limiter, so it consumes no quota.
**Fix:** Read the body as text with a byte cap, then parse it.
```ts
const raw = await req.text();
if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return new Response("code_too_large", { status: 413 });
const json = JSON.parse(raw); // inside the try
```
For a true streaming cap, read `req.body` with a counting reader. Also treat an unparsable header explicitly instead of via `Number(null) === 0`.

### WR-02: Delimiter escaping is exact-case and exact-string only

**Status: FIXED (5f7f087)** - regex neutralizes current_code and instruction tags (case-insensitive, whitespace-tolerant) in code and prompt; generate mode unchanged.

**File:** `src/lib/ai/prompt.ts:60`
**Issue:** Only the literal `</current_code>` is neutralized. `</CURRENT_CODE>`, `</current_code >` and `</current_code\n>` pass through, as do fake `<instruction>` blocks inside the code. The data block can still be closed or spoofed. The replacement `<\/current_code>` also alters user code that the model may echo back verbatim, which puts the escaped text into the output. The prompt (the instruction) is not escaped either, so a `</instruction>` in it is not neutralized.
**Fix:** Use a case- and whitespace-tolerant regex that covers both tags, e.g. `/<(\/?)(current_code|instruction)(\s*>)/gi` → `<$1​$2$3`, or use a random per-request boundary token. Add tests for the case and whitespace variants.

### WR-03: Whitespace-only prompt passes validation

**Status: FIXED (e54d0b6)** - prompt refined with trim check (400 in both modes).

**File:** `src/app/api/generate/route.ts:20`
**Issue:** `z.string().min(1)` accepts `"   "`. In edit mode this sends an empty `<instruction>` to the model, which costs quota for a meaningless request. Whitespace-only `currentCode` is handled (D-08), but the prompt gets no equivalent treatment.
**Fix:** `z.string().refine((s) => s.trim().length > 0).max(MAX_PROMPT_LENGTH)`, or `.trim().min(1)`. Check the client first, in case it already trims.

### WR-04: Size limits mix bytes and characters

**Status: FIXED (dbe5a5d)** - MAX_BODY_BYTES = 256_000 with documented derivation.

**File:** `src/app/api/generate/route.ts:15,45`, `src/lib/prompt-limits.ts:5`
**Issue:** `MAX_CODE_LENGTH` is 30,000 UTF-16 units and `MAX_BODY_BYTES` is 200,000 bytes. JSON escapes such as `é` or `\n` and 3-4 byte characters can push a legitimate 30k-character body over 200k bytes. The user would get a 413 from the header guard even though the code is under the limit. The worst case is about 30k × 6 bytes = 180k, plus the prompt (2000 × 6 = 12k) = 192k. That is close to the limit, so it is fragile and not documented.
**Fix:** Derive `MAX_BODY_BYTES` from the two constants (e.g. `(MAX_CODE_LENGTH + MAX_PROMPT_LENGTH) * 6 + 1024`) and add a comment.

## Info

### IN-01: `finish` usage log is skipped on every non-finish termination

**File:** `src/app/api/generate/route.ts:106-119`
**Issue:** Client cancel and mid-stream error log no usage, so billing visibility is incomplete in those cases. The `finish` part is also cast ad hoc (`as { totalUsage?... }`) instead of using the SDK type.
**Fix:** Optional. Log in a `finally`/cancel path with `null` counts, and type the part properly.

### IN-02: `RATE_LIMIT_PATTERN` is broad

**File:** `src/lib/generate-error.ts:12`
**Issue:** `/quota/i` and `/\b429\b/` match any message that contains them, e.g. a 502 body mentioning "quota exceeded for project" or an id containing 429. A real failure can then be shown as a rate limit. This predates the phase but now also affects refine messages.
**Fix:** Prefer `statusCode` checks; limit the regex to `RESOURCE_EXHAUSTED` and `rate limit`.

---

_Reviewed: 2026-10-17_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
