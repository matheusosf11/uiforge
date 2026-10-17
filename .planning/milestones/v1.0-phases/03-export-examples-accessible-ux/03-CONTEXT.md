# Phase 3: Export, Examples & Accessible UX - Context

**Gathered:** 2026-10-15
**Status:** Ready for planning

<domain>
## Phase Boundary

The generate→preview loop becomes a polished, accessible, portfolio-grade experience: example-prompt gallery, copy/download of generated TSX, persisted light/dark theme, responsive layout (mobile Preview⇄Código tabs), and friendly retryable API/429 errors with aria-live status.

Requirements: GEN-02, EDIT-02, EDIT-03, UX-01, UX-02, UX-03, UX-04

Out of scope for this phase: tests/CI/Vercel/README (Phase 4); auth; history; iterative refinement; rate-limiting infrastructure.

</domain>

<decisions>
## Implementation Decisions

### Example gallery (GEN-02)
- **D-01:** 12 compact chips below the prompt textarea. Short labels only; full prompt in `title` / accessible name. No “Exemplos” heading.
- **D-02:** Click fills the prompt only — does **not** auto-submit. User can edit, then Gerar.
- **D-03:** Selected chip stays highlighted until the user edits the prompt or generates. Chips wrap on small screens. Chips are disabled while a generation is in flight (same as the textarea).
- **D-04:** Locked labels + prompts (Portuguese):
  - Botão — botão primário com ícone
  - Card — card de produto com imagem, preço e botão comprar
  - Badge — badge de status (sucesso, alerta, erro)
  - Input — campo de busca com ícone à esquerda
  - Toggle — interruptor de notificações com rótulo
  - Navbar — barra de navegação com logo e links
  - Modal — diálogo de confirmação com Cancelar e Confirmar
  - Empty — estado vazio com ilustração e botão de ação
  - Pricing — card de plano com preço, lista de benefícios e CTA
  - Avatar — avatar com nome, cargo e status online
  - Alert — alerta de erro com ícone e botão fechar
  - Tabs — abas de perfil, com conteúdo em cada uma
- Gallery chips are starters only. They do **not** limit what Gemini can generate.

### Copy / download (EDIT-02, EDIT-03)
- **D-05:** Both actions live in the “Código gerado” panel header: Copiar (left), then Baixar (right). Icon + visible label.
- **D-06:** Buttons are visible but disabled when there is no code, and stay disabled while streaming. Enabled only after Gerar finishes.
- **D-07:** Copy: `navigator.clipboard.writeText` of the **parsed** TSX. Button label becomes “Copiado” for ~2s. If clipboard is blocked, button shows “Não foi possível copiar” and the code in CodeView is selected so the user can Ctrl+C.
- **D-08:** Download: `{ComponentName}.tsx`. If no clear `export default function Name` (or equivalent), fall back to `Component.tsx`. Always `.tsx`.

### Theme and responsive layout (UX-01, UX-02)
- **D-09:** Theme toggle in the page header, to the right of the UIForge title. Light **or** dark only (no “system” option). Default remains dark. Icon is sun/moon with aria-label “Ativar tema claro” / “Ativar tema escuro”. Persist via existing `next-themes`. Set `enableSystem={false}` so the toggle is a strict binary.
- **D-10:** Host theme does **not** restyle the live preview canvas. Preview iframe stays a light product surface (white background). Generated `dark:` utilities still follow the iframe’s own `prefers-color-scheme`, not the host class.
- **D-11:** CodeView syntax highlighting **does** follow the host theme (light theme when the app is light; dark when dark). Today it is hard-coded `themes.nightOwl`.
- **D-12:** Desktop (`md+`): keep two columns — Prompt | Preview stacked above Code. Mobile: **tabs** “Preview” | “Código”, default tab Preview. Prompt + gallery + Gerar stay **always visible below** the tab panel (not a third tab).

### Errors and accessibility (UX-03, UX-04)
- **D-13:** API/429 alert sits above Preview/Code in the right column (same place as today’s error). Includes a **Tentar de novo** button that immediately re-sends the last prompt.
- **D-14:** Distinct Portuguese copy:
  - 429: “Muitas tentativas. Espere um pouco e tente de novo.”
  - Other failures: “Falha ao gerar o componente. Tente novamente.”
- **D-15:** `aria-live="polite"` announces **status only** (“Gerando…”, “Pronto”) — never each stream token. Status text is **visible** (reuse/extend existing “Gerando preview…”), not screen-reader-only. Failures use `role="alert"`. Do **not** move keyboard focus to the alert.
- **D-16:** Stop is not an error — UI returns to ready with no failure message.

### Claude's Discretion
- Chip styling (reuse `buttonVariants` vs a small dedicated chip). Lucide icons for Copiar/Baixar/theme.
- How to parse the default-export identifier for the download filename (regex is fine).
- Which prism-react-renderer light theme pairs with `nightOwl`.
- Exact tab markup (`role="tablist"`) as long as labels stay “Preview” / “Código”.
- Mapping SDK/network errors to 429 vs generic (status code or message match).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope
- `.planning/ROADMAP.md` — Phase 3 goal, success criteria, planned 03-01 / 03-02 / 03-03 split
- `.planning/REQUIREMENTS.md` — GEN-02, EDIT-02, EDIT-03, UX-01, UX-02, UX-03, UX-04
- `.planning/PROJECT.md` — portfolio demo, no auth, Portuguese UI implied by current shell

### Prior phases
- `.planning/phases/02-sandboxed-live-preview/02-CONTEXT.md` — preview isolation; copy/download was deferred here
- `.planning/phases/02-sandboxed-live-preview/02-UI-SPEC.md` — desktop two-column / mobile order (this phase **overrides** mobile stack with Preview⇄Código tabs)
- `.planning/phases/01-foundation-streaming-generation/01-04-PLAN.md` — GeneratorShell / PromptForm / CodeView / useCompletion

### Current preview implementation (post-Phase-2 hotfix)
- `src/components/generator/sandbox-preview.tsx` — sandboxed **srcdoc** iframe (`sandbox="allow-scripts"`), **not** the remote Sandpack bundler
- `src/lib/preview-srcdoc.ts` — transpile generated TSX inside the iframe; do not execute generated code on the host
- Do **not** reintroduce `@codesandbox/sandpack-react` for copy/download or theme

No external product specs — requirements fully captured in decisions above.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PromptForm` — owns the textarea + Gerar/Parar; gallery chips belong under the textarea here (or a sibling fed by the same `prompt` / `onChange` / `busy`)
- `CodeView` — syntax-highlighted `<pre>`; attach Copiar/Baixar in its header; `parsed` code is already fence-stripped
- `ThemeProvider` (`next-themes`, `attribute="class"`, `defaultTheme="dark"`, currently `enableSystem`) in `src/app/layout.tsx`
- `buttonVariants` / shadcn `Button` — copy, download, retry, chips, theme toggle
- `lucide-react` already in package.json
- `parseCode` + `hasDefaultExport` — reuse for copy payload and download filename

### Established Patterns
- `GeneratorShell` is the only client orchestrator (`useCompletion`, local prompt state, `busy = isLoading || inFlight`)
- UI copy is Portuguese
- Grid already uses `min-w-0` so long code does not blow the preview column
- Preview mounts only after stream finish (`previewCode` snapshot)

### Integration Points
- Header in `src/app/page.tsx` — add theme toggle
- `GeneratorShell` error `<p role="alert">` — add retry + 429 copy + live status
- CodeView always uses `themes.nightOwl` — must become theme-aware
- Layout `enableSystem` must become `false` to match D-09

</code_context>

<specifics>
## Specific Ideas

- Gallery is a recruiter convenience, not a catalog of supported components.
- Copy feedback is in-button (“Copiado”), never a toast.
- Preview canvas stays a light “product” surface even when the host is dark — that is intentional, not a bug.
- Mobile tabs are Preview | Código only; Prompt never becomes a tab.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. Tests, CI, Vercel, README remain Phase 4.

</deferred>

---

*Phase: 3-Export, Examples & Accessible UX*
*Context gathered: 2026-10-15*
