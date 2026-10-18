# UIForge

## What This Is

UIForge is an AI-powered UI component generator (a focused "v0 lite"): the user describes a component in natural language and the app generates self-contained React + Tailwind code in real time (streaming) and renders it live in a secure sandboxed preview, with an editor and copy/download actions. It is a portfolio showcase project built by and for front-end engineers to demonstrate modern web and AI-integration skills to recruiters at large companies.

## Current Milestone: v1.1 Refinamento Iterativo

**Goal:** After generating a component, the user refines it with follow-up prompts that edit the current component instead of regenerating from scratch.

**Target features:**
- Refine-by-default after first generation, with a "Novo componente" reset
- Model context = current code + instruction only (no prompt history, keeps free-tier token use low)
- In-memory version history (undo to earlier versions; no persistence)
- Visible turn list (mini-chat of session prompts)
- Editable code view; refinement builds on user edits
- Demo GIF linked from both READMEs

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
- ✓ UI supports light/dark theme, is responsive, and handles loading/empty/error states accessibly — v1.0
- ✓ Covered by unit tests (Vitest, 93) and e2e (Playwright), runs in CI (GitHub Actions), deploys publicly on Vercel — v1.0

### Active

- [x] Iterative refinement: after the first generation, a follow-up prompt edits the current component (current code + instruction sent to the model); "Novo componente" starts from scratch — validated in Phase 6 (session reducer, refine-by-default form, undo + Ctrl/Cmd+Z, AlertDialog reset, model-generated suggestion chips via `/api/suggest`)
- [x] In-memory version history within the session (go back to a previous version) — validated in Phases 6–7 (undo, restore any version, 20-version cap with stable numbering)
- [x] Visible list of turns (prompts sent in the session, mini-chat style) — validated in Phase 7 (accessible turn list, gerando/erro status, restore, base notice)
- [x] Editable code: user edits in the code view and refinement uses the edited version — validated in Phase 8 (react-simple-code-editor, 500 ms preview debounce, "Edição manual" versions committed before refine/undo/restore)
- [ ] Demo GIF (`docs/demo.gif`) linked from both READMEs

### Out of Scope

- User authentication / accounts — portfolio demo, keeps v1 simple and frictionless
- Persistent history of generations — not needed for the core demo loop
- Distributed rate limiting (e.g. Upstash, PLAT-01) — out of scope / v2. A best-effort in-memory per-IP limit (5 generations/minute, per serverless instance) ships in Phase 4 as a partial, deliberate pull-forward
- Multi-file / full-project generation — v1 focuses on a single component

## Context

**Current state (v1.0 shipped 2026-10-17):** ~2,700 LOC TypeScript/TSX. Next.js 15.5 App Router, React 19, Tailwind v4, shadcn/ui, Vercel AI SDK v7 + @ai-sdk/google (gemini-3.8-flash primary). Live at https://uiforge-orlasup-project.vercel.app. Known issue found after launch and fixed: browser extensions blocking jsDelivr blanked the preview, so the preview runtime is now self-hosted. Each prompt is generated from scratch (no conversation context).

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
| Best-effort in-memory rate limit (5/min/IP) | Protect free-tier quota on public demo without infra | ✓ Shipped Phase 4; distributed limit stays v2 (PLAT-01) |
| E2E with env-gated mock model | Deterministic, free CI without API key | ✓ Shipped Phase 4 (never active on Vercel Production) |
| Next.js 15 App Router + TypeScript | User's primary stack; modern RSC/Server Actions story | ✓ Good |
| No authentication in v1 | Keeps portfolio demo frictionless | ✓ Good |
| Self-host preview runtime (React/Babel/Tailwind) in public/ | jsDelivr blocked by ad/privacy extensions left preview blank for real users | ✓ Shipped 2026-10-17 with 15s load watchdog |
| Gemini model fallback chain (3.8-flash → 3.6-flash → 3.5-flash-lite) | Free-tier 503 "high demand" / per-model 429 | ✓ Good |

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
*Last updated: 2026-10-18 — Phase 8 (editable code view) complete; site is dark-only by user decision*
