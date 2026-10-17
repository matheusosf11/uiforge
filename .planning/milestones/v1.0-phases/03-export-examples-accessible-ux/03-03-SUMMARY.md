---
phase: 03-export-examples-accessible-ux
plan: 03
subsystem: api
tags: [ai-sdk, fullStream, rate-limit, aria-live, error-handling]
requires:
  - phase: 03-02
    provides: GeneratorShell com abas e coluna direita
provides:
  - isRateLimitError e friendlyGenerateError (duas frases fixas)
  - Rota /api/generate devolvendo HTTP 429/502 antes do stream
  - Status aria-live, alerta amigavel e Tentar de novo no GeneratorShell
affects: []
tech-stack:
  added: []
  patterns: [peek do fullStream ate o primeiro text-delta, frases fixas sem error.message]
key-files:
  created:
    - src/lib/generate-error.ts
    - src/lib/generate-error.test.ts
    - src/app/api/generate/route.test.ts
  modified:
    - src/app/api/generate/route.ts
    - src/components/generator/generator-shell.tsx
key-decisions:
  - "Erro tardio apos o primeiro byte apenas fecha o stream (status 200 ja enviado)"
  - "Retry reenvia lastPromptRef (ultimo prompt enviado), sem cooldown"
requirements-completed: [UX-03, UX-04]
duration: ~10min
completed: 2026-10-15
---

# Phase 3 Plan 03: Erros amigaveis, retry e status acessivel Summary

429 do provider Gemini chega ao cliente como HTTP 429 via peek de `fullStream`, a UI mostra apenas duas frases fixas em pt-BR com botao "Tentar de novo" e uma unica regiao aria-live anuncia somente "Gerando…"/"Pronto".

## Tarefas

1. Classificador `generate-error.ts` (TDD): commit 227a4f9
2. Rota com peek de fullStream 429/502 (8 testes): commit 44db3f5
3. Shell com status aria-live, alerta + retry, Parar sem erro: commit 17c3652

## Deviations from Plan

None - plan executed exactly as written. (Nota: o campo do delta em `fullStream` nesta versao do AI SDK e `text`, nao `delta`.)

## Verificacao

`npx vitest run` (57 testes), `npx tsc --noEmit`, `npm run lint` e `npm run build` verdes. Verificacao manual de 429 real nao executada.

## Known Stubs

None.

## Self-Check: PASSED
