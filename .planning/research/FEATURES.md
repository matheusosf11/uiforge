# Feature Research

**Domain:** AI-powered UI component generator (focused "v0 lite") — portfolio showcase web app
**Researched:** 2026-10-15
**Confidence:** HIGH

## Context Note

UIForge is a **portfolio showcase** first and a product second. That reframes feature value: a feature is "worth it" when it either (a) makes the core generate→stream→preview loop feel fast and polished, or (b) sends a strong engineering signal to a recruiter skimming for 10–20 seconds. Research confirms the 2026 hiring bar: *"Tutorial clones and AI-scaffolded apps now look identical to hiring managers. Depth, real deployment, and clear trade-off decisions are what separate you from the pack"* (Rockstar Developer University, 2026). The differentiators below are weighted accordingly.

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist in any AI component generator. Missing these = the demo feels broken or unfinished to a recruiter who has seen v0/bolt/Lovable.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Natural-language prompt input (textarea + submit) | The entire product entry point; every competitor leads with it | LOW | Submit on button + Cmd/Ctrl+Enter. Disable while generating. Character guard on client. |
| Streaming code output (token-by-token) | The "wow" of v0/bolt is watching code appear; static spinner-then-dump feels dated | MEDIUM | Vercel AI SDK `streamText` + `useChat`/`useCompletion`. Must handle partial/incomplete code gracefully. |
| Live sandboxed preview of the component | Core value is *seeing* it render, not just reading code; all three competitors show preview + code side by side | MEDIUM-HIGH | Sandpack (`@codesandbox/sandpack-react`) in an isolated iframe. Debounce re-render until a parseable snapshot exists. |
| Code view with syntax highlighting | Users expect to read the output; competitors universally use a VS Code-style view | LOW | Sandpack ships a CodeMirror editor + highlighting out of the box — reuse, don't build. |
| Copy to clipboard | Expected one-click action on every code block/generator | LOW | `navigator.clipboard` + visible "Copied!" confirmation. Already a requirement. |
| Download code (as `.tsx`) | Expected export action; users want the file | LOW | `Blob` + anchor download. Name file from component or prompt. |
| Example prompt gallery / starter prompts | Empty-prompt paralysis is real; competitors seed with examples ("What's Next?" guides) | LOW | 6–10 curated prompts as clickable chips that populate the input. Doubles as a guided demo path for recruiters. |
| Loading / empty / error states | A portfolio piece with no empty or error state reads as unfinished to engineers | MEDIUM | Skeleton/streaming state, first-run empty state (hero + gallery), explicit error UI with retry. See differentiator row for the a11y layer. |
| Responsive layout | Front-end role — a non-responsive UI generator is self-defeating | MEDIUM | Stacked/tabbed on mobile, split-pane (prompt+code / preview) on desktop. |
| Light / dark theme | Baseline polish signal in 2026 front-end portfolios; nearly every reference portfolio has it | LOW | `next-themes` + Tailwind `dark:` + shadcn tokens. Persist choice; avoid flash-of-wrong-theme (zero-flash). |
| Keyboard-accessible, semantic UI | Front-end hiring explicitly checks a11y; references call out "accessible, responsive front-end" | MEDIUM | Semantic landmarks, focus-visible, labelled controls. Elevated further in differentiators. |

### Differentiators (Competitive Advantage)

Not required to function, but these are where a portfolio project earns the interview. Each is chosen to be a **talking point** in a 20-minute project walkthrough.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Secure sandboxed execution of untrusted LLM code | *The* senior-level talking point: "I never execute generated code in the host context — it runs inside an isolated Sandpack iframe." Shows security thinking | MEDIUM | Already a core constraint. Document the threat model (XSS, token theft, DOM access) in the README — recruiters reward explicit trade-off reasoning. |
| Polished streaming UX (stop button, live code scroll, skeleton) | Elevates basic streaming into a product-grade feel; differentiates from "spinner → dump" clones | MEDIUM | `AbortController`/SDK `stop()`. Auto-scroll code as tokens arrive. `aria-live="polite"` region so streaming is announced to screen readers (rare = standout). |
| Preview viewport switcher (mobile / tablet / desktop widths) | Makes the "responsive" story visible and interactive; a recruiter-friendly interaction with zero backend | LOW-MEDIUM | Constrain the Sandpack iframe width via preset buttons. High demo value, low cost. |
| Regenerate / retry with graceful error recovery | "Production hygiene: graceful degradation" is an explicit recruiter signal in reference projects | MEDIUM | Distinguish network error, model error, rate-limit, and malformed-output. Retry button + fallback provider (Groq) story. |
| Automated tests + CI + public deploy | The single biggest 2026 differentiator: *"real deployment and documentation"* separate real engineers from scaffolded clones | MEDIUM | Vitest unit + Playwright e2e of the generate→preview loop, GitHub Actions CI badge, live Vercel link. Already a requirement — surface it loudly in README. |
| Tab toggle: Preview ⇄ Code (with deep-link/state) | Mirrors the professional v0/bolt/Lovable "right panel" pattern; clean IA | LOW | shadcn `Tabs`. Keep both mounted to preserve Sandpack state when toggling. |
| "Open in StackBlitz / CodeSandbox" export | Lets a reviewer take the output live in one click — memorable, low cost | LOW | URL-based project export. Nice-to-have; add only after core loop is solid. |
| Command/shortcut affordances (Cmd+Enter submit, Esc to stop) | Small senior polish touches reviewers notice | LOW | Keep minimal — a full command palette is scope creep for v1. |
| Strong README + architecture diagram + trade-off notes | Documentation is repeatedly cited as what makes a project "move the needle"; recruiters read the repo | LOW | Explain streaming, sandbox isolation, free-tier model choice, and what was deliberately cut. This *is* a feature for this audience. |
| First-class accessibility (focus management, reduced-motion, contrast) | Most clones skip it; doing it well is a direct front-end hiring signal | MEDIUM | `prefers-reduced-motion`, focus trap-free flow, AA contrast in both themes, `aria-live` for stream + errors. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem valuable but hurt a focused v1 portfolio piece. All align with PROJECT.md "Out of Scope" — documented here to prevent scope creep.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| User authentication / accounts | "Real apps have login" | Adds friction to the demo, no value without persistence, burns build time on non-differentiating plumbing | No login in v1. A recruiter should hit the demo and generate in 5 seconds. |
| Persistent generation history / saved projects | "Users want to revisit outputs" | Requires a database, data model, and auth to be meaningful; pure overhead for a single-loop demo | Download/copy covers "keep the output." Optional: ephemeral in-session list (v1.x) with zero backend. |
| Iterative refinement / chat follow-ups ("make it blue") | v0/Lovable do conversational editing | Turns a focused generator into a chat app — large jump in prompt/state complexity, dilutes the clean demo | Single-shot generation in v1. Edit directly in the Sandpack editor if needed. Defer conversational mode to v2. |
| Multi-file / full-project generation | bolt/Lovable scaffold whole apps | Explodes the sandbox, preview, and prompt complexity; competes head-on with funded tools instead of showing focused craft | Single self-contained component is the deliberate, defensible scope. |
| Rate limiting (Upstash etc.) | "Protect the API key / prevent abuse" | Real concern at scale, but infra overhead for a personal demo; free-tier quotas already cap exposure | Rely on provider free-tier limits + a server-side key never exposed to the client. Note it as a documented "what I'd add for production." |
| Backend database / managed backend | "Full-stack looks impressive" | No feature in v1 needs persistence; adds deploy complexity and attack surface | Stateless generate endpoint. The impressive full-stack signal comes from streaming + sandbox + CI, not a DB. |
| Figma import / design-to-code | v0/bolt/Lovable all support it | Each relies on heavy paid conversion pipelines (Anima, plugins); impossible to match on a free tier | Prompt-to-code only. Example gallery delivers the "guided input" benefit cheaply. |
| Model/temperature/framework selector UI | "Give users control / show config" | Config surface area without demo payoff; most reviewers won't touch it and it risks broken combos | Pick one strong default (Gemini free tier, React+Tailwind). Mention Groq fallback in README, not UI. |
| Auth-gated sharing / team collaboration | "Collaboration is a product feature" | Depends on auth + backend + realtime; far outside a single-component demo | A public shareable Vercel URL already covers "share." |

## Feature Dependencies

```
Natural-language prompt input
    └──requires──> Streaming code output (AI SDK + Gemini endpoint)
                        └──requires──> Live sandboxed preview (Sandpack)
                                            └──requires──> Code view (Sandpack editor)
                                                                └──enables──> Copy / Download
                                                                └──enables──> Preview viewport switcher
                                                                └──enables──> Open in StackBlitz/CodeSandbox

Example prompt gallery ──enhances──> Prompt input (seeds generation, guided demo)

Loading / empty / error states ──requires──> Streaming code output (states derive from stream lifecycle)
    └──enhances──> Regenerate / retry

Light/dark theme ──enhances──> Preview (theme must propagate into the Sandpack iframe, not just the host)

Accessibility (aria-live) ──requires──> Streaming code output (live region announces stream + errors)

Automated tests + CI ──requires──> stable generate→preview loop (e2e asserts the full path)

Iterative refinement ──conflicts──> single-shot stateless generation (different state model; v2)
Persistent history ──conflicts──> "no auth / no backend" constraint (needs storage identity)
```

### Dependency Notes

- **Preview requires streaming → the stream must emit valid, mountable code.** Debounce the Sandpack re-render until the streamed buffer parses, or you get a flashing/error-y preview mid-stream. This is the trickiest integration point in the project.
- **Light/dark theme enhances preview in a non-obvious way:** toggling the host theme must also theme the sandboxed iframe (pass theme into the Sandpack template), or the preview looks disconnected from the app.
- **Accessibility depends on streaming:** the a11y win (screen-reader announcement of generation progress and errors) only exists because output is streamed — pair them in the same phase.
- **Tests depend on a stable loop:** write the Playwright e2e only after the generate→stream→preview path is stable, or the test churns constantly.
- **Iterative refinement conflicts with single-shot design:** adding it later means a state-model change (conversation history), so cutting it now is a clean boundary, not a shortcut.

## MVP Definition

### Launch With (v1)

The focused showcase. Everything here directly serves the generate→stream→preview loop or a core recruiter signal.

- [ ] Natural-language prompt input (+ Cmd/Ctrl+Enter, disabled-while-busy) — the entry point
- [ ] Example prompt gallery — removes empty-input paralysis, guides the demo
- [ ] Streaming code generation via Vercel AI SDK + Google Gemini — the headline "wow"
- [ ] Live sandboxed preview in Sandpack iframe — the core value + security story
- [ ] Code view with syntax highlighting (Sandpack editor) — reading the output
- [ ] Copy + Download (`.tsx`) — taking the output with you
- [ ] Preview ⇄ Code tab toggle + preview viewport switcher — professional IA + responsive proof
- [ ] Loading / empty / error states with retry — production hygiene signal
- [ ] Light/dark theme (host + propagated into preview) — baseline polish
- [ ] Responsive, accessible UI (aria-live stream/errors, focus-visible, AA contrast) — front-end hiring signal
- [ ] Stop-generation button — streaming-UX polish, low cost
- [ ] Vitest unit + Playwright e2e + GitHub Actions CI + public Vercel deploy — the top 2026 differentiator
- [ ] Strong README (architecture, sandbox threat model, trade-offs, what was cut) — recruiters read the repo

### Add After Validation (v1.x)

Low-cost enhancements once the core loop is proven and shipped.

- [ ] "Open in StackBlitz / CodeSandbox" export — trigger: core loop stable, want extra shareability
- [ ] Ephemeral in-session generation list (no backend) — trigger: users regenerate often and lose prior output
- [ ] OG/social meta + animated hero — trigger: optimizing the shared-link first impression

### Future Consideration (v2+)

Defer until there's a reason beyond "competitors have it." Each crosses a scope boundary (state model, auth, or backend).

- [ ] Iterative refinement / conversational editing — why defer: new state model; competes with v0/Lovable's core strength
- [ ] Persistent history + accounts — why defer: requires auth + database; no demo value in v1
- [ ] Multi-file / multi-component generation — why defer: explodes sandbox + preview complexity
- [ ] Figma / design import — why defer: needs paid conversion pipelines, incompatible with free-tier constraint
- [ ] Server-side rate limiting / abuse protection — why defer: infra overhead; document as "production next step"

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Prompt input + submit | HIGH | LOW | P1 |
| Streaming code generation | HIGH | MEDIUM | P1 |
| Sandboxed live preview | HIGH | HIGH | P1 |
| Code view + syntax highlighting | HIGH | LOW | P1 |
| Copy / download | HIGH | LOW | P1 |
| Example prompt gallery | MEDIUM | LOW | P1 |
| Loading / empty / error states + retry | HIGH | MEDIUM | P1 |
| Light / dark theme (host + preview) | MEDIUM | LOW | P1 |
| Responsive + accessible UI | HIGH | MEDIUM | P1 |
| Preview ⇄ Code tabs + viewport switcher | MEDIUM | LOW | P1 |
| Stop-generation button | MEDIUM | LOW | P1 |
| Tests + CI + public deploy | HIGH (recruiter) | MEDIUM | P1 |
| README + architecture/trade-off docs | HIGH (recruiter) | LOW | P1 |
| Open in StackBlitz/CodeSandbox | MEDIUM | LOW | P2 |
| Ephemeral in-session history | LOW | LOW | P2 |
| OG meta + hero polish | MEDIUM | LOW | P2 |
| Iterative refinement | HIGH | HIGH | P3 |
| Persistent history + auth | LOW (for v1) | HIGH | P3 |
| Multi-file generation | MEDIUM | HIGH | P3 |
| Figma import | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | v0.dev (Vercel) | bolt.new | Lovable | UIForge (our approach) |
|---------|-----------------|----------|---------|------------------------|
| Prompt → output | UI components + full Next.js apps | Full-stack app (code-first) | Full-stack app (chat-driven) | **Single self-contained React+Tailwind component** (deliberate focus) |
| Streaming | Yes | Yes | Yes | Yes — token-by-token, with stop + a11y live region |
| Live preview | Yes | Yes (in-browser Node + terminal) | Yes | Yes — **Sandpack iframe**, security-first isolation |
| Code editor | Built-in VS Code-style (paid) | Edit in Code view | Code + Visual Edits | Sandpack CodeMirror editor (free, read/edit) |
| Export | Copy / deploy to Vercel | Export / deploy to .bolt.host | GitHub sync / publish | **Copy + download `.tsx`** (+ optional StackBlitz export in v1.x) |
| Component library | shadcn/ui + Tailwind default | Framework-agnostic | React + managed backend | shadcn/ui + Tailwind (matches v0's recognized quality) |
| Backend / DB | API routes + DB integrations | Bolt Database / SQLite | Lovable Cloud (Supabase) | **None — stateless by design** |
| Auth | SSO (enterprise) | SSO | Built-in auth | **None in v1** (frictionless demo) |
| Iterative editing | Prompt/code changes | Prompt/code + terminal | Visual Edits + chat | **Single-shot in v1** (deferred to v2) |
| Deploy | One-click Vercel | One-click .bolt.host | One-click publish | Public Vercel link + CI badge |

**Positioning takeaway:** UIForge deliberately competes on *focus and craft*, not scope. The funded tools race toward full-stack breadth; a portfolio piece wins by doing one loop — describe → stream → safely preview → export — with production-grade polish (tests, CI, a11y, documented sandbox security). That contrast is itself the strongest interview narrative.

## Sources

- Lovable vs Bolt vs v0 comparison — https://lovable.dev/guides/lovable-vs-bolt-vs-v0 (MEDIUM; vendor-authored but detailed feature matrix)
- v0 vs Bolt vs Lovable, 2026 — https://arte.itlibra.com/en/articles/v0-vs-bolt-vs-lovable-ai-app-builders-2026 (MEDIUM; current, dated 2026)
- v0 vs Lovable vs Bolt head-to-head, 2026 — https://toolchase.com/blog/v0-vs-lovable-vs-bolt/ (MEDIUM; current)
- Lovable vs Bolt vs v0, 2026 — https://superframeworks.com/compare/lovable-vs-bolt-vs-v0 (MEDIUM)
- Hands-on comparison of AI web-app builders (UI layout patterns) — https://www.whitespace.ch/insights/blog/ai-powered-web-app-builders/ (MEDIUM)
- 12 Developer Portfolio Project Ideas for 2026 (recruiter signals) — https://rockstardeveloperuniversity.com/developer-portfolio-project-ideas/ (MEDIUM; informs differentiator weighting)
- Reference AI portfolio projects (production-hygiene signals: streaming, tests, CI, a11y, graceful degradation) — github.com/psjprajna/web-portfolio, anjotadena.com, github.com/pranjalmax/pranjal-portfolio, github.com/Sefayet-Alam/Portfolio (MEDIUM)
- PROJECT.md (UIForge scope, constraints, out-of-scope decisions) — internal (HIGH)

---
*Feature research for: AI-powered UI component generator (portfolio showcase)*
*Researched: 2026-10-15*
