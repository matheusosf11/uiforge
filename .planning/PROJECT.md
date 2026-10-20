# UIForge

## What This Is

UIForge is an AI-powered UI component generator (a focused "v0 lite"): the user describes a component in natural language and the app generates self-contained React + Tailwind code in real time (streaming) and renders it live in a secure sandboxed preview, with an editor and copy/download actions. It is a portfolio showcase project built by and for front-end engineers to demonstrate modern web and AI-integration skills to recruiters at large companies.

## Current State

**v1.2 Ferramentas de Design completed 2026-10-18** (built outside GSD, recorded retroactively 2026-10-20; live in Production since 2026-10-19, commit `1ce5e99`). On top of the v1.1 refine loop (follow-up prompts, version history, hand-editable code), users can attach reference images, pick categorized examples, keep auto-saved local projects, diff versions, preview at device sizes in light/dark, and tweak styles in a visual editor. Rate limits can be shared across instances via optional Upstash Redis.

## Next Milestone Goals

Not defined yet — start with `/gsd-new-milestone`. Candidates: manual verification of v1.2 features, share links for sessions.

<details>
<summary>v1.1 milestone goal (archived)</summary>

**Goal:** After generating a component, the user refines it with follow-up prompts that edit the current component instead of regenerating from scratch.

**Target features:** refine-by-default with "Novo componente" reset; model context = current code + instruction only; in-memory version history; visible turn list; editable code view; demo GIF in both READMEs.

</details>

## Core Value

A user types a prompt and gets working, previewable React + Tailwind component code streamed back and rendered live — the generate-to-preview loop must feel fast, polished, and reliable.

## Requirements

### Validated

- ✓ User can describe a UI component in a text prompt and submit it — v1.0
- ✓ App generates a single self-contained React + Tailwind component via Google Gemini (free tier) using the Vercel AI SDK, falling back across Gemini models on 503/429 — v1.0
- ✓ Generated code streams token-by-token into a code view in real time — v1.0
- ✓ Generated component renders live in a secure sandboxed preview (allow-scripts-only srcdoc iframe, always light, self-hosted runtime) — v1.0
- ✓ User can copy and download the generated code — v1.0
- ✓ User can pick from a gallery of example prompts to seed generation — v1.0
- ✓ UI supports light/dark theme (dark-only since v1.1 by user decision), is responsive, and handles loading/empty/error states accessibly — v1.0
- ✓ Covered by unit tests (Vitest, 93) and e2e (Playwright), runs in CI (GitHub Actions), deploys publicly on Vercel — v1.0

- ✓ Iterative refinement: follow-up prompts edit the current component (current code + instruction); "Novo componente" starts over; model-generated suggestion chips — v1.1
- ✓ In-memory version history (undo, restore any version, 20-version cap) — v1.1
- ✓ Visible, accessible turn list (mini-chat of session prompts) — v1.1
- ✓ Editable code view; refinement builds on manual edits — v1.1
- ✓ Demo GIF (`docs/demo.gif`) linked from both READMEs; refine journey e2e — v1.1

- ✓ Reference images (up to 4) and draggable generator cards — v1.2
- ✓ Categorized example gallery and a design guide for the model — v1.2
- ✓ Auto-saved local projects (localStorage, 20 max) and version diff — v1.2
- ✓ Preview device sizes, light/dark preview, usage guide download — v1.2
- ✓ Visual style editor (colors, radius, spacing, text, borders, font) — v1.2
- ✓ Optional shared rate limits via Upstash (per-minute + per-day), cross-site/415 guards, CI secret scan — v1.2

### Active

(None — define with `/gsd-new-milestone`)

### Out of Scope

- User authentication / accounts — portfolio demo, keeps v1 simple and frictionless
- Server-side/cloud history of generations — local-only (localStorage) projects ship in v1.2; nothing is sent to a server
- Multi-file / full-project generation — v1 focuses on a single component

## Context

**Current state (v1.2 live 2026-10-19):** 522 unit tests; v1.2 added +6,091 lines over v1.1. v1.1 (~11,500 LOC TS/TSX, 419 unit tests) v1.1 added the session reducer, `/api/suggest`, react-simple-code-editor, a three.js topology background and a Spline robot mascot (loaded on demand, >=1536px, motion allowed). Previously (v1.0 shipped 2026-10-17): ~2,700 LOC. Next.js 15.5 App Router, React 19, Tailwind v4, shadcn/ui, Vercel AI SDK v7 + @ai-sdk/google (gemini-3.8-flash primary). Live at https://uiforge-orlasup-project.vercel.app. Known issue found after launch and fixed: browser extensions blocking jsDelivr blanked the preview, so the preview runtime is now self-hosted. Since v1.1, refinements send only the current code + instruction (no prompt history).

- Target user: the project owner, a front-end developer building a portfolio to attract recruiters at large companies.
- AI must use a free tier: Google Gemini via Vercel AI SDK (Groq is a documented fallback).
- Live preview must run untrusted/generated code safely — the preview renders inside an isolated sandboxed srcdoc iframe, never on the main page.
- The project doubles as a conversation piece in interviews (streaming UX, sandboxed execution, modern RSC/App Router architecture).
- Requires a free Google AI Studio API key in `.env.local` as `GOOGLE_GENERATIVE_AI_API_KEY`.
- An approved implementation plan exists at `.cursor/plans/uiforge_portfolio_project_d031284c.plan.md`.

## Constraints

- **Tech stack**: Next.js 15 App Router + TypeScript + Tailwind CSS + shadcn/ui — modern stack recruiters recognize.
- **AI/Budget**: Must use a free LLM tier (Google Gemini) — no paid API required to run the demo.
- **Security**: Generated code executes only inside the sandboxed srcdoc iframe, never in the host app context.
- **Deployment**: Must deploy publicly on Vercel (free tier) with a shareable link for the portfolio.
- **Auth**: No login in v1.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Project: UIForge (AI component generator) | Best demonstrates front-end skill while using modern AI; recognizable product category | ✓ Good — shipped v1.0 |
| Google Gemini via Vercel AI SDK | Generous free tier + first-class streaming support | ✓ Shipped — model gemini-3.8-flash (2.5-flash unavailable to new keys, Phase 4) |
| Sandpack for live preview + editor | Safe sandboxed execution of generated code; professional tooling | ✗ Replaced by sandboxed srcdoc iframe; Sandpack removed in Phase 4 |
| Best-effort in-memory rate limit (5/min/IP) | Protect free-tier quota on public demo without infra | ✓ Shipped Phase 4; optional Upstash shared limit added in v1.2 (PLAT-01) |
| E2E with env-gated mock model | Deterministic, free CI without API key | ✓ Shipped Phase 4 (never active on Vercel Production) |
| Next.js 15 App Router + TypeScript | User's primary stack; modern RSC/Server Actions story | ✓ Good |
| No authentication in v1 | Keeps portfolio demo frictionless | ✓ Good |
| Self-host preview runtime (React/Babel/Tailwind) in public/ | jsDelivr blocked by ad/privacy extensions left preview blank for real users | ✓ Shipped 2026-10-17 with 15s load watchdog |
| Gemini model fallback chain (3.8-flash → 3.6-flash → 3.5-flash-lite) | Free-tier 503 "high demand" / per-model 429 | ✓ Good |
| Refine = stateless `currentCode` + instruction, full file back (no diffs, no history) | Keeps free-tier tokens low and output always a complete component | ✓ Good — v1.1 |
| Pure session reducer with 20-version cap and stable numbering (`droppedCount`) | Testable undo/restore/abort logic independent of React | ✓ Good — v1.1 |
| react-simple-code-editor + Prism instead of Monaco/CodeMirror | Tiny bundle, enough for one-file editing | ✓ Good — v1.1 (mobile/screen-reader manual checks pending) |
| Dark-only UI with decorative 3D (Spline robot, three.js background) | User preference; 3D gated to wide screens + motion allowed, loaded on demand | — Pending (watch bundle/perf on deploy) |
| Double-buffered preview iframe | Edits no longer flash a blank preview | ✓ Good — v1.1 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-10-20 after v1.2 milestone (recorded retroactively; v1.1 + v1.2 live in Production)*
