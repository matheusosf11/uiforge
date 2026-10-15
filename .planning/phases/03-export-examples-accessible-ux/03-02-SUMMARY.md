---
phase: 03-export-examples-accessible-ux
plan: 02
subsystem: ui
tags: [next-themes, theme-toggle, tabs, responsive, color-scheme, prism]
requires:
  - phase: 03-01
    provides: CodeView com Copiar/Baixar, GeneratorShell com prop busy
provides:
  - ThemeToggle binario (claro/escuro) persistido, sem opcao system
  - Highlight do CodeView por tema (nightOwlLight/nightOwl)
  - Isolamento color-scheme do iframe de preview
  - Abas mobile Preview | Codigo com paineis sempre montados
affects: [03-03]
tech-stack:
  added: []
  patterns: [tablist manual com roving tabindex, mounted guard para temas, max-md:hidden em vez de desmontar]
key-files:
  created:
    - src/components/theme/theme-toggle.tsx
  modified:
    - src/app/layout.tsx
    - src/app/page.tsx
    - src/components/generator/code-view.tsx
    - src/components/generator/sandbox-preview.tsx
    - src/lib/preview-srcdoc.ts
    - src/lib/preview-srcdoc.test.ts
    - src/components/generator/generator-shell.tsx
key-decisions:
  - "Tema theme='system' salvo e coagido para dark via efeito no ThemeToggle"
  - "Paineis das abas nunca desmontados (max-md:hidden) para nao recarregar o iframe"
requirements-completed: [UX-01, UX-02]
duration: ~15min
completed: 2026-10-15
---

# Phase 3 Plan 02: Tema, Highlight e Abas Mobile Summary

Toggle sol/lua no header com tema binario persistido (next-themes, `enableSystem={false}`), highlight do codigo acompanhando o tema do host, preview isolado com `color-scheme: light dark` e abas Preview/Codigo no mobile com prompt sempre abaixo.

## Tasks

1. ThemeToggle + layout/page (b637327).
2. Meta color-scheme no srcdoc + style no iframe + nightOwlLight no CodeView (RED test commit, GREEN 152016a).
3. Tablist mobile e paineis tabpanel sempre montados no GeneratorShell (d47016d).

## Verificacao

`npx tsc --noEmit`, `npx vitest run` (43 testes), `npm run lint` e `npm run build` verdes. Sandbox do iframe (`allow-scripts`) e listener de postMessage intactos. Verificacao manual (persistencia no reload, abas em <768px) nao executada em navegador.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None. Mitigacoes T-03-05 a T-03-07 aplicadas (coercao de system, sandbox inalterado, listener inalterado).

## Self-Check: PASSED
