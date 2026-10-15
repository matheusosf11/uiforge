# Phase 2: Sandboxed Live Preview - Context

**Gathered:** 2026-10-15
**Status:** Ready for planning
**Mode:** Auto-generated from PROJECT.md + Phase 1 validation (discuss skipped — decisions already locked)

<domain>
## Phase Boundary

The generated component renders live inside a secure, isolated Sandpack iframe with Tailwind styling applied. Generated code never executes on the host page.

Requirements: PREV-01, PREV-02, PREV-03
</domain>

<decisions>
## Implementation Decisions

### Locked
- Use `@codesandbox/sandpack-react` for preview + in-iframe bundler (iframe sandbox, never host execution)
- Load Tailwind in the sandbox via `externalResources` (`@tailwindcss/browser@4`) so v4 utilities including `sm:` / `dark:` work
- Render preview only after stream finish (or on a stable snapshot) — do not remount Sandpack on every token
- Dynamic import Sandpack with `ssr: false`; inject Sandpack CSS via `getSandpackCssText` / `useServerInsertedHTML` if needed
- Keep `GeneratorShell` as the only client orchestrator; add a `SandboxPreview` presentational wrapper
- Error state must be non-blank when the generated component throws

### Claude's Discretion
- Layout of preview vs code (side-by-side desktop, stacked/tabs mobile) can follow existing two-pane shell
- Exact Sandpack template/files (`App.js` wrapper that default-imports the generated component) is planner/executor choice
</decisions>

<code_context>
## Existing Code Insights

- `src/components/generator/generator-shell.tsx` owns `useCompletion` + `parseCode(completion)`
- `src/components/generator/code-view.tsx` is the syntax-highlighted editor
- `src/lib/parse-code.ts` now leaves bare TSX (with inner ```) intact
- Phase 1 deps are in package.json except Sandpack — Phase 2 may add `@codesandbox/sandpack-react` (and CSS)
- System prompt already requires a single default-exported React + Tailwind component
</code_context>

<specifics>
## Specific Ideas

- Preview should feel like the product headline: generate → see it live
- Empty preview before first successful generate
- Do not execute generated code with `eval` / `new Function` / `dangerouslySetInnerHTML`
</specifics>

<deferred>
## Deferred Ideas

- Copy/download, example gallery, theme toggle polish — Phase 3
- Tests/CI/deploy — Phase 4
</deferred>
