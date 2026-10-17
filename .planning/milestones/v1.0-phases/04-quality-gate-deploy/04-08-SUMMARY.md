---
phase: 04-quality-gate-deploy
plan: 08
subsystem: infra
tags: [vercel, deploy, readme, github-about]
requires: [04-06, 04-07]
provides:
  - public Vercel production deploy at https://uiforge-orlasup-project.vercel.app
  - READMEs with real live demo URL and CI badge
affects: []
key-files:
  created: []
  modified: [README.md, README.pt-BR.md, src/lib/ai/model.ts]
key-decisions:
  - "Vercel project in team orlasup-project; Vercel Authentication disabled so the demo is public"
  - "GitHub About applied (description, homepage, topics) with user approval"
  - "metadataBase left unchanged: it uses VERCEL_PROJECT_PRODUCTION_URL (og:image resolves to https://uiforge-ashen.vercel.app/..., HTTP 200), not localhost"
requirements-completed: [QUAL-04, QUAL-05]
duration: n/a
completed: 2026-10-16
---

# Phase 4 Plan 08: Vercel deploy and README finalisation Summary

Public Vercel production deploy with the Gemini key set, GitHub About configured, and both READMEs pointing at the real demo URL and CI badge; CI green.

## Tasks
1. Vercel import and Production key: done by the user (URL https://uiforge-orlasup-project.vercel.app, HTTP 200).
2. About decision: user approved; `gh repo edit` applied description, homepage and topics (nextjs, react, tailwindcss, ai, gemini, vercel-ai-sdk).
3. README placeholders replaced (OWNER/REPO -> matheusosf11/uiforge, DEPLOY_URL -> production URL) in both READMEs; lint, typecheck and 82 tests pass; commit efbf4fe pushed; CI run 38856047265 succeeded; smoke: site HTTP 200, og:image present.

## Deviations from Plan
**[Rule 3 - Blocking] Model switch** (orchestrator commit ac7dcd0): Google returned 404 "models/gemini-2.5-flash is no longer available to new users" for the new production key. MODEL_ID changed to gemini-3.8-flash in src/lib/ai/model.ts and READMEs. Orchestrator verified POST /api/generate on production returned HTTP 200 with a streamed component.

## Pending
- Acceptance item "user confirmed a real generation in the browser" is still to be collected from the user by the orchestrator.

## Self-Check: PASSED
