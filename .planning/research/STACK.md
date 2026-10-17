# Technology Stack — v1.1 Refinamento Iterativo (additions only)

**Project:** UIForge
**Researched:** 2026-10-17
**Scope:** only what is NEW for v1.1. The v1.0 stack (Next 15.5, React 19, Tailwind v4, shadcn, AI SDK v7, Vitest, Playwright) is unchanged.

## Recommendation in one line

Add **one** runtime dependency: `react-simple-code-editor` (~70 KB unpacked, ~3 KB gzip, zero deps). Reuse the already-installed `prism-react-renderer` for highlighting. Add **no** state library, **no** diff library, **no** Monaco/CodeMirror. GIF is produced with tools already on the machine (Playwright 1.64 + ffmpeg), as a dev-only script, with no new package.

## New Runtime Dependency

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| react-simple-code-editor | ^0.14.1 | Editable code view | Textarea overlaid with a highlighted `<pre>`. Takes a `highlight(code) => ReactNode` prop, so it plugs straight into the existing `prism-react-renderer` `Highlight` and nightOwl/nightOwlLight themes. Keeps the existing theme-switch logic in `code-view.tsx`. Peer deps are `react >=16.8`, which covers React 19. |

Confidence: MEDIUM-HIGH. The version and peer deps are verified via npm. The last release was 2024-07, so the package is stable but not actively developed. Its API is tiny and has worked unchanged for years. A pre-merge smoke test on React 19.3 is still warranted (see Pitfalls below).

### Why not CodeMirror 6 or Monaco

| Option | Verdict | Reason |
|--------|---------|--------|
| **react-simple-code-editor** | CHOSEN | The use case is "let the user tweak a generated single-file component (~50-300 lines) before refining". It needs typing, Tab indent, native undo/redo and highlighting. It does not need LSP, folding, multi-cursor or autocomplete. It adds ~3 KB gzip, has no SSR issue (plain textarea and pre) and no `dynamic()` import. The native textarea is also the best option for accessibility and mobile. |
| @uiw/react-codemirror 4.25.12 (+ @codemirror/lang-javascript 6.2.5) | Runner-up | A good fallback if line numbers, bracket matching or real code folding become required. It is client-only (needs `"use client"`, ideally `next/dynamic`), the package alone is ~830 KB unpacked, and a total of ~100-150 KB gzip is expected (a rough figure, not measured). The night-owl theme needs an extra package. This is overkill for the milestone. |
| @monaco-editor/react 4.7.0 | REJECT | Loads from a CDN by default, runs workers, and weighs MBs. It needs CSP and Next config work. Its theming is separate from Tailwind. It is wildly oversized for a portfolio demo. |
| Plain `<textarea>` with no highlighting | Acceptable only as a fallback | It is the cheapest option, but it makes the editable view visually regress from the v1.0 highlighted view. |

Revisit trigger: if the user sees lag with more than ~1000 lines, or asks for line numbers, switch to CodeMirror. Isolate the editor behind a small `<CodeEditor value onChange />` component so the swap is local.

### Integration points (code-view.tsx)

- Replace the `<Highlight>` block with `<Editor value={code} onValueChange={...} highlight={c => <Highlight ...>} padding={12} />`. The `highlight` callback must return the token spans only, not a `<pre>`. Apply `style` from the chosen Prism theme (nightOwl / nightOwlLight) to the wrapper so the background and caret colors follow `next-themes`. Set the textarea caret color explicitly (`caretColor`) because it does not inherit the Prism theme.
- Props contract change: `CodeView` needs `onChange(code)` and `readOnly` or `disabled` while `busy` (streaming). Do not let the user edit while tokens are streaming, as the stream would overwrite or race with the edits.
- Keep the Copy/Download buttons reading from the `code` prop. They then export the edited code automatically.
- `preRef` fallback-select logic in `handleCopy` targets the `<pre>`. With the editor, select the textarea instead (`textarea.select()`), or keep a ref on the editor wrapper.
- Add `aria-label` via `textareaProps` or `textareaId`, since the textarea is the focusable element.
- Tab handling: the library traps Tab for indentation by default. Set `tabSize` and consider `ignoreTabKey` toggling (Esc to release), for keyboard-accessibility compliance.

## State and History (NO new library)

| Need | Approach | Why no library |
|------|----------|----------------|
| In-memory version history with undo | `useReducer` (or a small custom hook `useVersionHistory`) holding `{ versions: {id, code, prompt, source: "ai"\|"user-edit"}[], index }` | The shape is a linear stack with a pointer. Zundo, immer, use-undo and similar add dependencies for ~30 lines of pure reducer code that is trivially unit-testable in the existing Vitest setup. |
| Turn list (mini-chat) | Derive from `versions` (each version stores its instruction) | One source of truth, with no sync bugs between history and turn list. |
| Refinement request | `POST /api/generate` with `{ currentCode, instruction }`. Validate with the existing `zod` (v4) schema and add a length cap. | No new dependency. The model receives only code plus instruction, per the milestone decision. |
| Streaming | Keep the existing plain-text stream (`ai` v7 / `@ai-sdk/react` 4). | `useChat` message persistence is not needed. History is app-owned. |

Integration notes:
- A user edit in the editor should create a version (debounced, or committed on blur or on "Refine") so undo does not step per keystroke. The textarea's own native undo handles keystroke-level undo.
- Prompt changes live in `src/lib/ai/prompt.ts` (currently modified in the working tree). Add a refine system prompt that says "return the full updated component, same contract". Reuse the existing code-extraction and validation pipeline unchanged.

## Demo GIF (dev tooling, no package)

| Tool | Version | Role | Why |
|------|---------|------|-----|
| Playwright (already installed) | ^1.64.1 | Drives a scripted demo run of the app (generate, refine, undo, edit) and records `video: 'on'` (WebM) | Already in the repo, deterministic, repeatable, no screen-recorder UI needed. Use a fixed viewport (e.g. 1280x720), `reducedMotion` as needed, and mock or fixture the `/api/generate` route to avoid API quota and nondeterministic output. |
| ffmpeg | 9.0.2 (already on this machine via winget `Gyan.FFmpeg`) | WebM to GIF (two-pass palette) | `ffmpeg -i demo.webm -vf "fps=12,scale=900:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse" docs/demo.gif`. The palette pass keeps the dark-theme colors readable and the size small. |
| ScreenToGif (manual alternative) | n/a | GUI recorder on Windows | Fine for a one-off recording, but not reproducible. Mention it as a fallback only. |

Confidence: MEDIUM. The ffmpeg palette recipe is standard. Playwright's `recordVideo` is documented. Not run end to end here.

Conventions:
- Put the script at `scripts/record-demo.mjs` (or a Playwright spec tagged `@demo`, excluded from `npm run e2e`). Output goes to `docs/demo.gif` (or `public/`), referenced from both READMEs (PT and EN).
- Target a GIF under ~5 MB for GitHub README rendering (low fps, ~900 px width, 15-25 s). If it is too big, ship an MP4 or WebM on a GitHub release or in the repo and link a poster frame instead.
- Do NOT add `ffmpeg-static`, `gifenc`, `puppeteer-screen-recorder` or similar to `package.json`. It is a one-time doc asset, not product code.

## What NOT to add

| Do not add | Reason |
|-----------|--------|
| Monaco / CodeMirror (this milestone) | Overkill for the use case. Bundle and complexity cost. See above. |
| Zustand / Redux / Jotai / zundo / immer | A linear history stack is a trivial reducer. |
| `diff` / `react-diff-viewer` | A diff view is not in the v1.1 scope, and the preview is the proof of change. Defer. |
| localStorage / IndexedDB persistence | The milestone says history is in-memory. Persistence also raises edge cases (quota, stale schema). |
| Prettier in the browser | It tempts "format on edit" but adds ~hundreds of KB. Not needed. |
| `useChat` conversation state for refinement | The model gets only code plus instruction, so a message array is the wrong abstraction. |
| New AI SDK features or models | Out of scope and already validated. |
| ffmpeg / gif npm packages | Use the system ffmpeg for a one-off asset. |

## Installation

```bash
npm install react-simple-code-editor
# No devDependencies required.
# GIF (one-off, uses existing tools):
#   npx playwright test scripts/record-demo --project=chromium   # produces .webm
#   ffmpeg -i demo.webm -vf "fps=12,scale=900:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse" docs/demo.gif
```

## Pitfalls specific to this stack choice (flag for implementation phases)

- react-simple-code-editor's last publish was 2024-07 and its types are bundled, so check that `import Editor from "react-simple-code-editor"` resolves correctly under ESM and Next 15 (a default-export interop quirk has been reported historically). Smoke-test it in the first plan and, if it breaks, fall back to a ~40-line custom overlay or to CodeMirror.
- The textarea and the `<pre>` overlay must use identical font, size, line height and padding, or the caret drifts from the text. Set them in one place via the `style` prop.
- Long lines: the library wraps with `white-space: pre-wrap` by default. Use `textareaClassName` / `preClassName` to make both `pre` (scroll) for code, or the caret misaligns.
- Vitest/jsdom: the textarea editor works with `@testing-library/user-event` (`type`, `clear`), which is far easier to test than CodeMirror's contenteditable (a known jsdom pain point). This is another reason for the choice.

## Sources

- npm registry, checked 2026-10-17: react-simple-code-editor 0.14.1 (peer react >=16.8, modified 2024-07-04, ~70 KB unpacked), @uiw/react-codemirror 4.25.12 (~827 KB unpacked), @codemirror/lang-javascript 6.2.5, @monaco-editor/react 4.7.0, prism-react-renderer 2.4.1, playwright 1.64.1. (HIGH for versions)
- Local environment: ffmpeg 9.0.2 found at the winget Gyan.FFmpeg path. (HIGH)
- Bundle-size estimates for CodeMirror and Monaco, and the ffmpeg palettegen recipe: training knowledge, not re-verified. (LOW-MEDIUM)
- Playwright video recording: https://playwright.dev/docs/videos (not fetched this session, MEDIUM)
