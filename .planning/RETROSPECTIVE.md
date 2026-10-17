# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-10-17
**Phases:** 4 | **Plans:** 17 | **Commits:** 125 over 3 days

### What Was Built
- Prompt → Gemini (Vercel AI SDK, plain text stream) → clean TSX streaming into a code view, with stop/retry and model fallback on 503/429
- Sandboxed live preview: Babel-in-iframe (`allow-scripts` only, srcdoc, always light) with Tailwind v4 browser runtime, now self-hosted
- Copy/download, example gallery, theme toggle, responsive tabs, aria-live status and friendly errors
- 93 Vitest tests, Playwright e2e with env-gated mock model, GitHub Actions CI, public Vercel deploy, bilingual README

### What Worked
- Coarse vertical slices: the generate→stream loop was proven in Phase 1 before any preview work
- Code review after each phase caught real bugs (stream closing as success on mid-stream error, stale request contaminating a new one, pull() stalls)
- Env-gated mock model made e2e deterministic and free in CI

### What Was Inefficient
- Sandpack (Phase 2) was built, then replaced by a srcdoc iframe; its HUMAN-UAT and VERIFICATION files went stale and stayed open until milestone close
- Pinned model IDs aged quickly (gemini-2.5-flash unavailable to new keys; fallback chain added after launch)
- SUMMARY one-liners were not filled consistently, so automated accomplishment extraction produced junk

### Patterns Established
- Preview runtime and generated code never run on the host page; sandbox invariant guarded by a test
- Third-party runtime assets are self-hosted under `public/` (CDNs get blocked by user extensions)
- Silent failure modes get a watchdog (15s preview load timeout) instead of a blank UI

### Key Lessons
1. Test the public deploy from a real user browser with extensions, not only headless: the jsDelivr block was invisible to automation and hit real visitors.
2. When a phase's approach is replaced, close or rewrite its verification artifacts at that moment.
3. Keep model IDs behind a fallback list from day one on free tiers.

### Cost Observations
- Model profile: balanced
- Notable: 3-day turnaround from config to public deploy

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Commits | Phases | Key Change |
|-----------|---------|--------|------------|
| v1.0 | 125 | 4 | Baseline: per-phase code review + UAT |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | 93 unit + e2e | — | self-hosted preview runtime |

### Top Lessons (Verified Across Milestones)

1. (to be confirmed by v1.1+)
