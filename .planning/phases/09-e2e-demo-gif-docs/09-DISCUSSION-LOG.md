# Phase 9: E2E, Demo GIF & Docs - Discussion Log

> **Audit trail only.**

**Date:** 2026-10-18
**Mode:** auto. The user authorized autonomous work overnight ("prossiga o projeto … só pare se precisar realmente de mim"). The orchestrator chose the recommended options; review them in 09-CONTEXT.md.

| Area | Decision (auto) | Alternatives not chosen |
|------|-----------------|-------------------------|
| E2E journey | New `e2e/journey.spec.ts` with one serial test | Extending generate.spec.ts |
| GIF recording | Playwright `recordVideo` under `DEMO=1` + ffmpeg two-pass palette | Manual screen recording; a new npm GIF encoder dependency |
| GIF viewport | 1600×900 (robot visible), about 960px output, 10–12 fps, ≤ 3 MB | 1280 (no robot) |
| Screenshots | Dark only (site is dark-only) | Keep the stale light screenshot |
| README scope | Features + API contract + testing + architecture + env, PT/EN in parity | Minimal GIF-only update |
