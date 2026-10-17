---
phase: 03-export-examples-accessible-ux
verified: 2026-10-15T23:00:00Z
status: human_needed
score: 4/4 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 3/4
  gaps_closed:
    - "CR-01: pull() do ReadableStream nunca fechava em sucesso"
    - "WR-01: erro apos o primeiro token aparecia como 'Pronto'"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Gerar um componente real com Gemini e esperar o fim do stream"
    expected: "Status muda de 'Gerando…' para 'Pronto' (anunciado via aria-live) e o preview renderiza sem precisar clicar em Parar"
    why_human: "Depende de servidor Next real e do provider; os testes usam mock do fullStream"
  - test: "Provocar falha no meio da geracao (derrubar rede/abortar o provider apos os primeiros tokens)"
    expected: "fetch rejeita a leitura, aparece o alerta amigavel com 'Tentar de novo', 'Pronto' nao e anunciado e o preview nao e promovido (codigo truncado fica so na aba Codigo)"
    why_human: "Comportamento de body com erro apos os headers no Next/navegador nao e coberto por testes automatizados"
  - test: "Provocar 429 real do Gemini e clicar em 'Tentar de novo'"
    expected: "Mensagem amigavel de limite de uso em role=alert e retry reenvia o ultimo prompt"
    why_human: "Requer cota real do provider"
  - test: "Parar uma geracao e reenviar rapidamente (WR-06)"
    expected: "A nova geracao nao exibe erro falso nem 'Pronto' da requisicao antiga"
    why_human: "Logica de estado concorrente sem teste automatizado"
  - test: "Leitor de tela (NVDA/VoiceOver) nos estados Gerando/Pronto/erro, alternancia de tema, abas em viewport mobile, download em Safari/Firefox"
    expected: "Anuncios corretos, tema persistido, layout responsivo, arquivo baixado com nome adequado"
    why_human: "Aparencia visual, leitor de tela e navegadores reais"
---

# Fase 3: Export, Exemplos e UX Acessivel - Relatorio de Verificacao

**Meta da fase:** O loop gerar -> preview vira uma experiencia polida, acessivel e de nivel portfolio, com exportacao e recuperacao de erros.
**Verificado:** 2026-10-15
**Status:** human_needed
**Re-verificacao:** Sim, apos correcoes do code review (commits 47d07e5..2189aa7). Lacunas anteriores: CR-01 (stream nunca fecha em sucesso) e WR-01 (erro no meio do stream mostrado como sucesso).

## Fechamento das lacunas anteriores

| Lacuna | Status | Evidencia no codigo |
|--------|--------|---------------------|
| CR-01 | FECHADA | `src/app/api/generate/route.ts` linhas 76-104: `pull()` executa `while (true)` com `reader.read()`; ignora partes nao-texto (`text-end`, `finish-step`, `finish`...), enfileira em `text-delta` e retorna, e chama `controller.close()` quando `done`. O travamento descrito deixou de existir. |
| WR-09 (causa raiz de CR-01 passar despercebido) | FECHADA | `route.test.ts` linhas 76-106: mock emite a sequencia real (`start, start-step, text-start, text-delta x2, text-end, finish-step, finish`) e asserta `"abcd"` com timeout de 1s; outro teste com partes neutras entre deltas. |
| WR-01 | FECHADA no codigo (confirmacao em navegador pendente) | `route.ts` linhas 92-99: `error`/`abort` pos-primeiro-token chama `controller.error(new Error("generate_failed"))`; teste (linhas 114-123) espera `res.text()` rejeitar. No cliente, `generator-shell.tsx`: `onError` marca `failedRef` e mostra alerta; `send` so chama `setFinished(true)` se `!failedRef.current`; o efeito (linha 75) nao promove `parsed` ao preview quando `failedRef.current`. |

Execucao propria: `npx vitest run` -> 8 arquivos, 60/60 testes passando.

## Verdades observaveis (Success Criteria do ROADMAP)

| # | Verdade | Status | Evidencia |
|---|---------|--------|-----------|
| 1 | Galeria de exemplos semeia o prompt (GEN-02) | VERIFICADO | `example-prompts.ts` + chips em `prompt-form.tsx` |
| 2 | Copiar e baixar o codigo (EDIT-02, EDIT-03) | VERIFICADO | `code-view.tsx` (Copiar com reset de 2s tambem na falha, WR-07; download com ancora no DOM e revoke assincrono, WR-03); `download-filename.ts` ancorado ao fim do statement (WR-04) com testes |
| 3 | Tema claro/escuro persistido e layout responsivo (UX-01, UX-02) | VERIFICADO (codigo) | `ThemeProvider`/`ThemeToggle`; abas `role=tablist` com `md:hidden` e paineis `max-md:hidden` em `generator-shell.tsx`. Visual exige humano |
| 4 | Estados acessiveis (aria-live) e erro amigavel/retentavel (UX-03, UX-04) | VERIFICADO (codigo) | Caminho feliz agora fecha o stream (CR-01); `aria-live="polite"` com "Gerando…"/"Pronto"; `role="alert"` + "Tentar de novo"; 429/502 no peek inicial; falha tardia via `controller.error`; `maxLength` + contador de 2000 caracteres (WR-05); `requestIdRef` protege contra corrida Parar/reenvio (WR-06); `abortSignal: req.signal` + `cancelReader` (WR-02) |

**Pontuacao:** 4/4

## WR-08 (pulado intencionalmente)

Conflita com a decisao travada D-10 (03-CONTEXT.md): as utilities `dark:` geradas seguem o `prefers-color-scheme` do iframe e o canvas e sempre branco. Afeta apenas o contraste de controles nativos do componente gerado em SO escuro. Nao quebra nenhum dos 7 requisitos nem os Success Criteria (UX-01 trata do tema da aplicacao). E decisao de produto, nao lacuna. Registrado como observacao, nao bloqueia.

## Cobertura de requisitos

| Requisito | Plano | Status | Evidencia |
|-----------|-------|--------|-----------|
| GEN-02 | 03-01 | SATISFEITO | chips de exemplo |
| EDIT-02 | 03-01 | SATISFEITO | Copiar + reset de estado |
| EDIT-03 | 03-01 | SATISFEITO | Baixar + nome de arquivo correto |
| UX-01 | 03-02 | SATISFEITO (visual: humano) | ThemeProvider/Toggle |
| UX-02 | 03-02 | SATISFEITO (visual: humano) | abas responsivas |
| UX-03 | 03-03 | SATISFEITO (leitor de tela: humano) | "Pronto" agora alcancavel |
| UX-04 | 03-03 | SATISFEITO (429 real e falha tardia: humano) | peek 429/502, controller.error, retry |

Os 7 IDs de ROADMAP/REQUIREMENTS aparecem nos frontmatters dos planos. Nenhum requisito orfao.

## Anti-padroes

Busca por `TBD|FIXME|XXX` em `src`: nenhuma ocorrencia. O blocker anterior em `route.ts` foi removido. Sem novos stubs.

## Resumo

As duas lacunas da verificacao anterior estao fechadas no codigo e cobertas por testes com a sequencia real do stream. Restam apenas confirmacoes que dependem de navegador, leitor de tela e provider real (lista em `human_verification`), por isso o status e `human_needed` e nao `passed`.

---

_Verificado: 2026-10-15 (re-verificacao)_
_Verificador: Claude (gsd-verifier)_
