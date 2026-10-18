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

## Milestone: v1.1 — Refinamento Iterativo

**Shipped:** 2026-10-18 (local; push/deploy pending)
**Phases:** 5 | **Plans:** 23 | **Commits:** ~175 over 2 days

### What Was Built
- Stateless refine API (`currentCode` + instruction → full component) with size limit, injection-safe framing and truncation detection
- Session reducer with undo/restore, 20-version cap, accessible turn list and suggestion chips (`/api/suggest`)
- Editable code view feeding the next refinement; double-buffered preview
- Journey e2e, reproducible demo GIF pipeline, PT/EN READMEs; dark-only UI with topology background and interactive robot mascot

### What Worked
- A pure reducer first (Phase 6) made Phases 7–8 mostly UI wiring with strong unit coverage (93 → 419 tests)
- Running e2e from an isolated `git archive` copy on its own port avoided clashing with the user's dev servers
- Code review + fixer after every phase kept warnings from piling up

### What Was Inefficient
- `gsd-sdk` STATE commands and summary extraction often failed or produced junk; STATE/MILESTONES fixed by hand
- Decision-coverage gate only reads `must_haves.truths`, so plans needed D-ids repeated there
- Out-of-flow UI requests (robot, background, dark-only) landed mid-milestone and later forced test scoping fixes (status region vs robot bubble)

### Patterns Established
- Status assertions scoped to the `[aria-live="polite"][aria-atomic="true"]` region
- Decorative 3D is aria-hidden, lazy-loaded and gated by width + reduced-motion
- `E2E_PORT` + isolated copies for e2e when local ports are busy

### Key Lessons
1. Model UI/state logic as a pure reducer before building components on it.
2. Keep decorative layers out of the accessibility tree and out of test selectors from day one.
3. Verify a third-party 3D scene's API (e.g. `setZoom`) against the actual scene before designing around it.

### Cost Observations
- Model profile: balanced
- Notable: a large part ran autonomously overnight with the user's authorization

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Commits | Phases | Key Change |
|-----------|---------|--------|------------|
| v1.0 | 125 | 4 | Baseline: per-phase code review + UAT |
| v1.1 | ~175 | 5 | Code review + auto-fixer per phase; isolated e2e runs |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | 93 unit + e2e | — | self-hosted preview runtime |
| v1.1 | 419 unit + journey e2e | — | react-simple-code-editor (small) |

### Top Lessons (Verified Across Milestones)

1. Per-phase code review catches real bugs before they compound (v1.0, v1.1).
2. Automated GSD extraction (summaries/state) needs manual review at milestone close (v1.0, v1.1).
