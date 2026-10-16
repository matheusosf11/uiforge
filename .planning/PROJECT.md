# UIForge

## What This Is

UIForge is an AI-powered UI component generator (a focused "v0 lite"): the user describes a component in natural language and the app generates self-contained React + Tailwind code in real time (streaming) and renders it live in a secure sandboxed preview, with an editor and copy/download actions. It is a portfolio showcase project built by and for front-end engineers to demonstrate modern web and AI-integration skills to recruiters at large companies.

## Core Value

A user types a prompt and gets working, previewable React + Tailwind component code streamed back and rendered live — the generate-to-preview loop must feel fast, polished, and reliable.

## Requirements

### Validated

- ✓ User can describe a UI component in a text prompt and submit it — Phase 1
- ✓ App generates a single self-contained React + Tailwind component via Google Gemini (free tier) using the Vercel AI SDK — Phase 1
- ✓ Generated code streams token-by-token into a code view in real time — Phase 1
- ✓ User can copy and download the generated code — Validated in Phase 3: Export, Examples & Accessible UX
- ✓ User can pick from a gallery of example prompts to seed generation — Validated in Phase 3: Export, Examples & Accessible UX
- ✓ UI supports light/dark theme, is responsive, and handles loading/empty/error states accessibly — Validated in Phase 3 (human UAT pending in 03-HUMAN-UAT.md)

### Active

- [ ] Generated component renders live in a secure sandboxed preview (sandboxed srcdoc iframe)
- [ ] Project is covered by unit tests (Vitest) and an e2e test (Playwright), runs in CI (GitHub Actions), and deploys publicly on Vercel

### Out of Scope

- User authentication / accounts — portfolio demo, keeps v1 simple and frictionless
- Persistent history of generations — not needed for the core demo loop
- Iterative refinement ("change the color") — deferred to a later version
- Distributed rate limiting (e.g. Upstash, PLAT-01) — out of scope / v2. A best-effort in-memory per-IP limit (5 generations/minute, per serverless instance) ships in Phase 4 as a partial, deliberate pull-forward
- Multi-file / full-project generation — v1 focuses on a single component

## Context

- Target user: the project owner, a front-end developer building a portfolio to attract recruiters at large companies.
- Primary stack chosen: React + Next.js 15 (App Router) with TypeScript.
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
| Project: UIForge (AI component generator) | Best demonstrates front-end skill while using modern AI; recognizable product category | — Pending |
| Google Gemini via Vercel AI SDK | Generous free tier + first-class streaming support | — Pending |
| Sandpack for live preview + editor | Safe sandboxed execution of generated code; professional tooling | — Pending |
| Next.js 15 App Router + TypeScript | User's primary stack; modern RSC/Server Actions story | — Pending |
| No authentication in v1 | Keeps portfolio demo frictionless | — Pending |

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
*Last updated: 2026-10-15 after Phase 3 completion*
