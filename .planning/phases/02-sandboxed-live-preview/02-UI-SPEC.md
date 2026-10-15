# Phase 2 UI-SPEC — Sandboxed Live Preview

**Status:** Locked for planning
**Surfaces:** Home generator (existing two-pane shell)

## Layout

- Desktop (`md+`): keep two columns. Left = Prompt. Right = stack of Preview (primary) + Code (secondary), or Preview above Code in the same column.
- Mobile: Preview first, then Code, then Prompt actions remain reachable.

## Preview panel

- Title: "Preview"
- `aria-label="Live preview"`
- Empty: dashed placeholder, copy "O preview aparece aqui depois de gerar."
- Loading (stream in progress): skeleton / muted "Gerando preview…" — do not mount Sandpack until the stream finishes
- Ready: Sandpack iframe fills the panel (min-height ~16rem)
- Error: visible `role="alert"` inside the panel, not a blank iframe

## Constraints

- Generated code runs only inside the Sandpack iframe
- Tailwind utilities must be visible in the preview (buttons, colors, spacing)
- No new marketing pages
