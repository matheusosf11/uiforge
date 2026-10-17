---
phase: 01-foundation-streaming-generation
plan: 03
subsystem: testing
tags: [vitest, parse-code, streaming, markdown-fences, tdd]

# Dependency graph
requires:
  - phase: 01-foundation-streaming-generation
    provides: Phase 1 test deps (vitest, jsdom, @vitejs/plugin-react, @testing-library/jest-dom) already installed
provides:
  - Pure streaming-safe parseCode extractor in src/lib/parse-code.ts
  - Vitest fixture suite covering fences, prose, mid-stream partials, empty, and idempotency
  - Vitest config (jsdom, globals, react plugin) plus jest-dom setup file
affects: [01-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Vitest 5 with environment jsdom, globals true, @vitejs/plugin-react
    - Defensive parseCode via /```(?:[a-zA-Z]+)?\s*\n?([\s\S]*?)(?:```|$)/ then trim
    - Test files use Vitest globals (no named vitest import) to avoid Windows dual-runtime

key-files:
  created:
    - vitest.config.ts
    - vitest.setup.ts
    - src/lib/parse-code.ts
    - src/lib/parse-code.test.ts
  modified: []

key-decisions:
  - "Used the plan's suggested regex so an unterminated fence is treated as end-of-string, not a missing closer"
  - "Vitest tests use globals instead of importing from 'vitest' to avoid the 5.0.4 Windows drive-letter dual-instance crash"

patterns-established:
  - "Pattern 5: parseCode is a pure total function — no eval, no Function, no dangerouslySetInnerHTML"
  - "Pattern 6: Vitest component/unit tests live next to source as *.test.ts and rely on globals + vitest.setup.ts"

requirements-completed: [GEN-06]

# Metrics
duration: 4min
completed: 2026-10-15
---

# Phase 1 Plan 03: Parse-Code Extractor Summary

**Streaming-safe idempotent parseCode strips markdown fences and surrounding prose, locked by 12 green Vitest fixtures**

## Performance

- **Duration:** 4 min
- **Started:** 2026-10-15T03:55:42Z
- **Completed:** 2026-10-15T03:59:46Z
- **Tasks:** 2/2
- **Files modified:** 4

## Accomplishments
- Vitest 5 configured with jsdom, globals, `@vitejs/plugin-react`, and `@testing-library/jest-dom/vitest` setup — `package.json` left untouched
- `parseCode(raw)` strips ```lang fences, leading/trailing prose, and unterminated mid-stream fences without throwing
- 12-fixture suite is green via `npx vitest run src/lib/parse-code.test.ts` and `npm test`, including idempotency over every fixture

## Task Commits

Each task was committed atomically:

1. **Task 1: Vitest configuration (jsdom + globals + react plugin)** - `484d457` (chore)
2. **Task 2 RED: failing parseCode fixture suite** - `22f37e4` (test)
3. **Task 2 GREEN: implement parseCode extractor** - `39e559b` (feat)

**Plan metadata:** pending (docs: complete plan)

_Note: TDD Task 2 produced two commits (test → feat). No refactor commit — the GREEN implementation was already the planned one-regex form._

## TDD Gate Compliance

- RED: `22f37e4` `test(01-03): add failing test for parseCode extractor` — suite failed on missing `./parse-code` module
- GREEN: `39e559b` `feat(01-03): implement parseCode extractor` — 12/12 tests passed
- REFACTOR: skipped (no cleanup beyond the Windows-globals workaround landed in GREEN)

## Files Created/Modified
- `vitest.config.ts` - jsdom environment, globals, react plugin, setupFiles
- `vitest.setup.ts` - registers `@testing-library/jest-dom/vitest` matchers
- `src/lib/parse-code.ts` - pure `parseCode` extractor (text only)
- `src/lib/parse-code.test.ts` - 12 fixtures: no-fence, tsx/jsx/react/ts/unlabelled, leading/trailing prose, unterminated, incomplete ``, idempotency, empty

## Decisions Made
- Implemented extraction with `/```(?:[a-zA-Z]+)?\s*\n?([\s\S]*?)(?:```|$)/` so mid-stream chunks without a closer still yield the code body
- Relied on Vitest `globals: true` for `describe`/`it`/`expect` instead of a named `vitest` import, so `npm test` works from Git Bash's lowercase `c:\` cwd on Windows
- Left `package.json` frozen (deps already installed in 01-01); did not add `"type": "module"` to silence Vite's future-native-loader warning

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Vitest 5 has no built-in `basic` reporter**
- **Found during:** Task 1 (Vitest configuration)
- **Issue:** `npx vitest run --reporter=basic` failed with `Failed to load custom Reporter from basic`.
- **Fix:** Verified with `npx vitest run --passWithNoTests` (Vitest 5 also exits 1 when zero test files exist). Config still matched the planned jsdom/globals/plugin/setup shape.
- **Files modified:** none
- **Verification:** Config greps passed; Vitest loaded jsdom + setup with 0 tests, exit 0 under `--passWithNoTests`
- **Committed in:** `484d457`

**2. [Rule 3 - Blocking] Vitest 5.0.4 Windows drive-letter dual-runtime crash**
- **Found during:** Task 2 GREEN (`describe()` threw `Cannot read properties of undefined (reading 'config')`)
- **Issue:** Git Bash cwd is `c:\...` (lowercase drive). Importing `{ describe, it, expect } from "vitest"` loads a second Vitest runtime whose `runner` is undefined (vitest#10692 / #10812). Cannot bump Vitest — `package.json` is frozen.
- **Fix:** Dropped the named `vitest` import and used config `globals: true` plus `/// <reference types="vitest/globals" />` so the worker injects the APIs from the original runtime.
- **Files modified:** `src/lib/parse-code.test.ts`
- **Verification:** `npx vitest run src/lib/parse-code.test.ts` and `npm test` both exit 0 with 12/12 passing from the lowercase cwd; `npx tsc --noEmit` passed
- **Committed in:** `39e559b`

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both keep the planned Vitest matrix and parseCode behavior working on this Windows/Git Bash environment. No scope creep.

## Issues Encountered
- Vite warns that ESM syntax in `vitest.config.ts` is unsupported by a future `configLoader: 'native'` default because `package.json` has no `"type": "module"`. Non-blocking today (config still loads). Left unfixed to honor the package.json freeze.

## Known Stubs
None — `parseCode` is fully implemented and wired to a green fixture suite.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Ready for 01-04 to `import { parseCode } from "@/lib/parse-code"` and run it on every streamed `completion` chunk
- `npm test` / `npx vitest run` is the unit-test entry; 01-04 RTL tests can reuse `vitest.config.ts` + `vitest.setup.ts`
- No blocker from this plan

## Verification Results

- `npx vitest run src/lib/parse-code.test.ts` — 12/12 passed
- `npm test` — 12/12 passed
- Idempotency fixture passed for all 11 inputs in `FIXTURES`
- No `eval` / `new Function` / `dangerouslySetInnerHTML` in `src/lib/parse-code.ts`

## Self-Check: PASSED

- Key artifacts exist on disk (`vitest.config.ts`, `vitest.setup.ts`, `src/lib/parse-code.ts`, `src/lib/parse-code.test.ts`, SUMMARY)
- Task commits found: `484d457`, `22f37e4`, `39e559b`
- Acceptance greps passed; `npx vitest run src/lib/parse-code.test.ts` and `npm test` both 12/12 green

---
*Phase: 01-foundation-streaming-generation*
*Completed: 2026-10-15*
