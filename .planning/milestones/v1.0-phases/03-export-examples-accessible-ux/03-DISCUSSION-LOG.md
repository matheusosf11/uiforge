# Phase 3: Export, Examples & Accessible UX - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-15
**Phase:** 3-Export, Examples & Accessible UX
**Areas discussed:** Galeria de exemplos, Copiar / baixar, Tema e mobile, Erros e aria-live

---

## Galeria de exemplos

| Option | Description | Selected |
|--------|-------------|----------|
| Fill only | Chip fills the prompt; user edits then Gerar | ✓ |
| Fill and submit | Chip fills and starts generation immediately | |
| 4 chips | Compact row of primitives | (initial, later superseded) |
| 12 chips | Full catalog, wrap on mobile | ✓ |
| Cards with title + description | Larger, more “product” | |
| Short label | “Botão”, “Card”, … full prompt in title/aria | ✓ |
| Full prompt on chip | Entire example text visible | |
| Selected until edit/generate | Highlight last chip | ✓ |
| No selected state | Fill only, no highlight | |
| No “Exemplos” heading | Chips self-explanatory | ✓ |
| Heading “Exemplos” | Small label above chips | |
| Wrap | Extra row on small screens | ✓ |
| Horizontal scroll | Single row, swipe | |
| Disable while generating | Same as textarea | ✓ |

**User's choice:** Start with 4 primitives, then asked what a chip is, then asked to see more options, then asked for **all 12**. Confirmed chips do not limit what Gemini can generate.
**Notes:** User wanted more examples for recruiter exploration; wrap + no heading to keep the shell clean.

---

## Copiar / baixar

| Option | Description | Selected |
|--------|-------------|----------|
| Button label “Copiado” ~2s | No toast | ✓ |
| Toast | Floating notice | |
| Filename = generated component | `SaveButton.tsx` | ✓ |
| Always `Component.tsx` | Predictable | (fallback only) |
| Fallback `Component.tsx` | If name missing | ✓ |
| Disable Baixar until named | | |
| Header of CodeView | Copiar then Baixar | ✓ |
| Below code / next to Gerar | | |
| Visible disabled without code | Recruiter sees the actions | ✓ |
| Hide until code exists | | |
| Icon + label | Copiar / Baixar | ✓ |
| Clipboard fail | Message + select code for Ctrl+C | ✓ |
| Enabled only after stream ends | Avoid half files | ✓ |
| `.tsx` extension | Matches generator output | ✓ |

**User's choice:** In-button copy feedback; generated filename with Component.tsx fallback; header actions; disabled empty/streaming.
**Notes:** User asked extra rounds on copy/download (extension, order) then moved on.

---

## Tema e mobile

| Option | Description | Selected |
|--------|-------------|----------|
| Toggle in header (right of title) | Always visible | ✓ |
| Next to Gerar | | |
| Light/dark only | No system option | ✓ |
| Light/dark/system menu | | |
| Preview canvas stays light | Host theme does not restyle iframe | ✓ |
| Preview follows host dark | | |
| Code highlight follows host theme | Light prism theme in light mode | ✓ |
| Code always nightOwl | | |
| Mobile tabs Preview ⇄ Código | Default Preview | ✓ |
| Keep stacked Preview then Code | Phase 2 UI-SPEC | |
| Prompt always below tabs | Not a third tab | ✓ |
| Prompt as third tab / prompt on top | | |
| Tab labels “Preview” / “Código” | | ✓ |
| Sun/moon icon + aria-label | | ✓ |

**User's choice:** Binary theme in header; preview stays a light product surface; mobile tabs with Prompt below.
**Notes:** User asked what chips were (clarified) and took extra theme/mobile questions (highlight theme, default tab, icon, prompt placement, tab labels).

---

## Erros e aria-live

| Option | Description | Selected |
|--------|-------------|----------|
| Retry re-sends last prompt | One click | ✓ |
| Retry only re-enables the form | | |
| Distinct 429 vs generic copy | Portuguese strings locked | ✓ |
| Single generic message | | |
| Alert above Preview/Code | Current column | ✓ |
| Alert on Prompt / both | | |
| aria-live status only | Not per-token; visible “Gerando…” / “Pronto” | ✓ |
| Live-announce the code stream | | |
| Stop is not an error | Return to ready | ✓ |
| Do not move focus to alert | role=alert is enough | ✓ |

**User's choice:** Retry resubmits; two error strings; polite visible status; no focus jump; Stop ≠ error.

---

## Claude's Discretion

User never picked “Você decide”. Discretion is limited to chip/button styling, filename regex, prism light theme choice, tablist markup, and 429 detection from the SDK error.

## Deferred Ideas

None — stayed in Phase 3. Phase 4 still owns tests/CI/deploy/README.
