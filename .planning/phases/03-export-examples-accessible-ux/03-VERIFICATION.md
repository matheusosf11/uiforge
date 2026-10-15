---
phase: 03-export-examples-accessible-ux
verified: 2026-10-15T00:00:00Z
status: gaps_found
score: 3/4 must-haves verified
overrides_applied: 0
gaps:
  - truth: "A interface comunica loading/erro de forma acessível (aria-live) e o fluxo gerar -> pronto -> preview completa com sucesso (UX-03, UX-04 e loop gerar->preview da meta da fase)"
    status: failed
    reason: "CR-01: em src/app/api/generate/route.ts o pull() do ReadableStream só enfileira em text-delta. Para text-end/finish-step/finish retorna sem enqueue nem close; pela spec de Streams o pull não é re-invocado e a resposta nunca fecha. Toda geração bem-sucedida trava após o último token: status fica em 'Gerando…', 'Pronto' nunca é anunciado, preview não renderiza (só após 'Parar'). Testes de rota não detectam porque o mock só emite text-delta (WR-09)."
    artifacts:
      - path: "src/app/api/generate/route.ts"
        issue: "pull() (linhas ~63-80) retorna sem enqueue/close para partes não-text-delta"
      - path: "src/app/api/generate/route.test.ts"
        issue: "mock não emite text-end/finish-step/finish; falsa garantia"
    missing:
      - "Fazer o pull() repetir reader.read() em loop até enfileirar um delta ou encerrar (close em done/error/abort)"
      - "Atualizar route.test.ts com a sequência real do fullStream (start, start-step, text-start, text-delta..., text-end, finish-step, finish) e asserir res.text() com timeout"
  - truth: "Erro do provider após o primeiro token é sinalizado ao usuário (UX-04)"
    status: partial
    reason: "WR-01: falha no meio da geração fecha o stream com 200; o cliente mostra 'Pronto' com código truncado, sem alerta nem retry."
    artifacts:
      - path: "src/app/api/generate/route.ts"
        issue: "controller.close() em error/abort pós-primeiro-token"
    missing:
      - "Usar controller.error() para o cliente acionar onError e exibir alerta com 'Tentar de novo'"
human_verification: []
---

# Fase 3: Export, Exemplos e UX Acessível - Relatório de Verificação

**Meta da fase:** O loop gerar -> preview vira uma experiência polida, acessível e de nível portfólio, com exportação e recuperação de erros.
**Status:** gaps_found
**Re-verificação:** Não (verificação inicial)

## Verdades observáveis (Success Criteria do ROADMAP)

| # | Verdade | Status | Evidência |
|---|---------|--------|-----------|
| 1 | Galeria de exemplos semeia o prompt | VERIFICADO | `src/lib/example-prompts.ts` + `prompt-form.tsx` mapeia `EXAMPLE_PROMPTS` em chips (linhas 7, 27, 70) |
| 2 | Copiar e baixar o código | VERIFICADO (com ressalvas WR-03/04/07) | `code-view.tsx` tem botões "Copiar"/"Baixar"; `download-filename.ts` existe com testes |
| 3 | Tema claro/escuro persistido + layout responsivo | VERIFICADO (código) | `ThemeProvider` em `layout.tsx`, `ThemeToggle` em `page.tsx`, abas Preview/Código em `generator-shell.tsx`; aparência visual não checada programaticamente |
| 4 | Estados acessíveis (aria-live) e erro amigável/retentável (429) | FALHOU | Existem `aria-live="polite"`, `role="alert"`, "Tentar de novo" e 429/502 no peek inicial. Porém o caminho de sucesso nunca fecha o stream (CR-01), então "Pronto" nunca é anunciado e o fluxo não conclui |

**Pontuação:** 3/4

## Análise do CR-01 (BLOCKER)

Confirmado lendo `route.ts`: o `pull()` chama `reader.read()` uma vez; se a parte não é `text-delta`, `error` ou `abort`, retorna sem `enqueue`/`close`. O AI SDK emite `text-end`, `finish-step` e `finish` após o último delta, então a resposta nunca fecha em gerações bem-sucedidas. Efeitos:

- UX-03: o anúncio "Pronto" (`setFinished(true)` só após o `complete()` resolver) nunca ocorre; a região aria-live fica em "Gerando…".
- Loop gerar -> preview (meta da fase): `isLoading` permanece true; o preview só aparece depois de "Parar".
- UX-04: o caminho de erro inicial (429/502) funciona, mas o caminho feliz está quebrado, o que anula o valor da fase.
- A revisão reproduziu o travamento isolado no Node; o orquestrador confirmou pela leitura do código. Não executei o servidor nesta verificação.

## Warnings relevantes aos requisitos

| ID | Requisito | Impacto |
|----|-----------|---------|
| WR-01 | UX-04 | Falha no meio da geração aparece como "Pronto" com código truncado (gap parcial registrado) |
| WR-05 | UX-04 | Prompt > 2000 chars gera erro genérico em loop de retry (sem maxLength) |
| WR-06 | UX-03 | Corrida Parar + novo envio pode mostrar erro falso |
| WR-03 | EDIT-03 | Download frágil (revoke síncrono, âncora fora do DOM) em Safari/Firefox |
| WR-04 | EDIT-03 | `React.memo(Card)` gera `React.tsx` |
| WR-07 | EDIT-02 | Estado "Não foi possível copiar" não reseta |
| WR-08 | UX-01 | Preview com color-scheme dark sobre fundo branco fixo |
| WR-02 | UX-04 | Requisição ao provider não cancelada (sem abortSignal) |
| WR-09 | - | Testes da rota não cobrem a sequência real (causa de CR-01 passar despercebido) |

Esses warnings não bloqueiam isoladamente, exceto WR-01 (registrado como gap parcial).

## Cobertura de requisitos

| Requisito | Plano | Status | Evidência |
|-----------|-------|--------|-----------|
| GEN-02 | 03-01 | SATISFEITO | chips de exemplo em `prompt-form.tsx` |
| EDIT-02 | 03-01 | SATISFEITO (WR-07 menor) | botão Copiar em `code-view.tsx` |
| EDIT-03 | 03-01 | SATISFEITO (WR-03/04 menores) | botão Baixar + `download-filename.ts` |
| UX-01 | 03-02 | SATISFEITO | ThemeProvider/ThemeToggle ligados |
| UX-02 | 03-02 | SATISFEITO (código) | abas responsivas no shell |
| UX-03 | 03-03 | BLOQUEADO | aria-live existe, mas "Pronto" inalcançável (CR-01) |
| UX-04 | 03-03 | PARCIAL | 429/502 iniciais ok; sucesso trava (CR-01); truncamento disfarçado (WR-01) |

Todos os 7 IDs do ROADMAP aparecem nos frontmatters dos planos (03-01: GEN-02, EDIT-02, EDIT-03; 03-02: UX-01, UX-02; 03-03: UX-03, UX-04). Nenhum requisito órfão. Observação: REQUIREMENTS.md marca UX-03/UX-04 como Complete, o que está incorreto enquanto CR-01 existir.

## Anti-padrões

| Arquivo | Padrão | Severidade |
|---------|--------|-----------|
| `src/app/api/generate/route.ts` ~63-80 | `pull()` sem enqueue/close em ramo alcançável | BLOCKER |
| `src/app/api/generate/route.test.ts` | mock irreal esconde regressão | Aviso |

## Resumo das lacunas

Um único defeito raiz (CR-01) quebra o caminho feliz de geração e, com ele, UX-03 e UX-04 e a meta da fase. Correção pequena (loop dentro do `pull`), mais atualização do teste de rota para a sequência real. Recomenda-se também tratar WR-01 junto (usar `controller.error`). Rodar `/gsd:plan-phase --gaps` para um plano de fechamento; depois re-verificar, incluindo um teste manual de geração real com Gemini (status "Pronto" e preview renderizado).

---

_Verificado: 2026-10-15_
_Verificador: Claude (gsd-verifier)_
