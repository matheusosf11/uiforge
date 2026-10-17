---
phase: 03-export-examples-accessible-ux
plan: 01
subsystem: ui
tags: [react, clipboard, blob-download, example-prompts, vitest]
requires:
  - phase: 02
    provides: GeneratorShell, CodeView, PromptForm
provides:
  - EXAMPLE_PROMPTS (12 chips travados)
  - componentFilename(code) -> *.tsx
  - Chips de exemplo no PromptForm
  - Copiar/Baixar no header do CodeView (prop busy)
affects: [03-02, 03-03]
tech-stack:
  added: []
  patterns: [chips type=button com aria-pressed derivado de selectedId + value, feedback in-button sem toast]
key-files:
  created:
    - src/lib/example-prompts.ts
    - src/lib/example-prompts.test.ts
    - src/lib/download-filename.ts
    - src/lib/download-filename.test.ts
  modified:
    - src/components/generator/prompt-form.tsx
    - src/components/generator/prompt-form.test.tsx
    - src/components/generator/code-view.tsx
    - src/components/generator/generator-shell.tsx
key-decisions:
  - "Selecao do chip derivada de selectedId + igualdade com value; limpa explicitamente no submit"
  - "Falha de clipboard seleciona o pre visivel (sem execCommand)"
requirements-completed: [GEN-02, EDIT-02, EDIT-03]
duration: ~15min
completed: 2026-10-15
---

# Phase 3 Plan 01: Exemplos, Copiar e Baixar Summary

12 chips de exemplo preenchem o prompt sem enviar, e o CodeView ganha Copiar/Baixar (`{Nome}.tsx`) desabilitados sem codigo ou durante o streaming.

## Tasks

1. Funcoes puras `example-prompts` e `componentFilename` com testes (RED 845d638, GREEN fd6e4dd).
2. Chips no PromptForm (RED a partir do teste estendido, GREEN 5a3874b).
3. Copiar/Baixar no header do CodeView e prop `busy` no shell (19684f9).

## Verificacao

`npx tsc --noEmit`, `npx vitest run` (42 testes) e `npm run lint` verdes. Sem pacotes novos.

## Deviations from Plan

None - plan executed exactly as written. (Commit RED do Task 2 feito separadamente: test commit do prompt-form.test.tsx.)

## Known Stubs

None.

## Threat Flags

None. Mitigacoes T-03-01/02/04 aplicadas (regex de identificador + sufixo fixo, Blob text/plain, chips type=button com teste de onSubmit).

## Self-Check: PASSED
