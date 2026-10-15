---
phase: 03-export-examples-accessible-ux
fixed_at: 2026-10-15T22:18:02Z
review_path: .planning/phases/03-export-examples-accessible-ux/03-REVIEW.md
iteration: 1
findings_in_scope: 10
fixed: 9
skipped: 1
status: partial
---

# Phase 03: Relatório de correções do code review

**Corrigido em:** 2026-10-15T22:18:02Z
**Review de origem:** .planning/phases/03-export-examples-accessible-ux/03-REVIEW.md
**Iteração:** 1

**Resumo:**
- Achados no escopo (critical + warning): 10
- Corrigidos: 9 (WR-09 entrou no mesmo commit do CR-01)
- Pulados: 1

**Validação final:** `npx vitest run` (8 arquivos, 60 testes passando), `npx tsc --noEmit` sem erros, `npm run lint` sem erros, `npm run build` concluído.

## Issues corrigidas

### CR-01: Stream de resposta nunca fecha (`pull` resolve sem `enqueue`/`close`)

**Arquivos modificados:** `src/app/api/generate/route.ts`, `src/app/api/generate/route.test.ts`
**Commit:** 47d07e5
**Correção aplicada:** O `pull()` agora repete `reader.read()` num `while (true)` até enfileirar um `text-delta`, fechar (`done`) ou encerrar por `error`/`abort`. As partes que não são texto (`text-start`, `text-end`, `start-step`, `finish-step`, `finish`, reasoning etc.) são ignoradas. Os nomes das partes foram conferidos em `node_modules/ai/dist/index.js` (ai 7.0.141). Antes da correção, os testes novos com a sequência real travaram (timeout de 1s). Depois dela, passaram.
**Status:** corrigido

### WR-09: Testes da rota não exercitam a sequência real do `fullStream`

**Arquivos modificados:** `src/app/api/generate/route.test.ts`
**Commit:** 47d07e5 (junto com CR-01)
**Correção aplicada:** O teste de sucesso agora usa `start, start-step, text-start, text-delta×2, text-end, finish-step, finish` e confere `"abcd"` com timeout de 1s. Também entrou um teste com partes neutras entre deltas. Os dois foram confirmados como falhando (timeout) no código antigo.
**Status:** corrigido

### WR-01: Erro depois do primeiro token vira "Pronto" com código truncado

**Arquivos modificados:** `src/app/api/generate/route.ts`, `src/app/api/generate/route.test.ts`, `src/components/generator/generator-shell.tsx`
**Commit:** 1832c2e
**Correção aplicada:** Quando chega `error`/`abort` ou o `read()` rejeita depois do primeiro delta, a rota agora chama `controller.error(new Error("generate_failed"))` em vez de `controller.close()`. No cliente, `callCompletionApi` (`ai/dist/index.js`) captura a rejeição do `processTextStream`, chama `onError` (o shell marca `failedRef` e mostra o alerta genérico com "Tentar de novo") e `complete()` resolve `undefined`, então "Pronto" não é anunciado. O efeito que promove o código para o preview passou a ignorar o resultado quando `failedRef.current` é true, para que o código truncado não seja renderizado. O teste da rota agora espera que `res.text()` rejeite.
**Status:** corrigido: requer verificação humana. Falta confirmar no navegador, com o servidor Next real, que um body com erro depois dos headers faz o `fetch` rejeitar a leitura (TypeError de rede) e o alerta aparece. O código truncado continua visível na aba Código (só o preview é suprimido).

### WR-02: Requisição ao provider não é cancelada

**Arquivos modificados:** `src/app/api/generate/route.ts`
**Commit:** a3e90b7
**Correção aplicada:** `streamText` passou a receber `abortSignal: req.signal`. Entrou um helper `cancelReader()`, chamado antes de cada retorno antecipado (erro no peek, exceção no peek, 502 por stream vazio/abort) e reaproveitado no `cancel()` e no caminho de erro do `pull`.
**Status:** corrigido

### WR-03: Download frágil

**Arquivos modificados:** `src/components/generator/code-view.tsx`
**Commit:** 7e0dae0
**Correção aplicada:** A âncora agora é anexada ao `document.body` antes do `click()` e removida logo depois. `URL.revokeObjectURL` passou para `window.setTimeout(..., 0)`.
**Status:** corrigido

### WR-04: `componentFilename` gera `React.tsx` / `Object.tsx`

**Arquivos modificados:** `src/lib/download-filename.ts`, `src/lib/download-filename.test.ts`
**Commit:** 65838f1
**Correção aplicada:** `ALIAS` virou `/export\s+default\s+([A-Z][\w$]*)\s*(?:;|$)/m`. Foram adicionados testes para `React.memo(Card);` e `Object.assign(Root, { Item });` (ambos caem em `Component.tsx`) e para um alias sem ponto e vírgula no fim da linha (`Card.tsx`).
**Status:** corrigido

### WR-05: Prompt acima de 2000 caracteres vira erro genérico em loop

**Arquivos modificados:** `src/lib/prompt-limits.ts` (novo), `src/app/api/generate/route.ts`, `src/components/generator/prompt-form.tsx`, `src/components/generator/prompt-form.test.tsx`
**Commit:** f190d61
**Correção aplicada:** A constante `MAX_PROMPT_LENGTH = 2000` ficou em `src/lib/prompt-limits.ts`, um arquivo novo criado para compartilhá-la sem depender de `@/lib/ai/prompt`, que é mockado nos testes da rota. O schema Zod e a mensagem 400 usam a constante. A `Textarea` ganhou `maxLength` e um contador visível "N/2000 caracteres", ligado por `aria-describedby`. Há um teste novo para o `maxLength` e o contador.
**Status:** corrigido

### WR-06: Corrida entre "Parar" e novo envio contamina a nova geração

**Arquivos modificados:** `src/components/generator/generator-shell.tsx`
**Commit:** 1157b84
**Correção aplicada:** Foi criado o `requestIdRef`. `send` incrementa o id e a IIFE só mexe em refs/estado (`failedRef`, `setFriendly`, `setFinished`, `setInFlight`) se `id === requestIdRef.current`. `handleStop` também incrementa o id, invalidando a requisição em andamento.
**Status:** corrigido: requer verificação humana. É lógica de estado concorrente e não tem teste automatizado.

### WR-07: Estado "Não foi possível copiar" nunca volta para "Copiar"

**Arquivos modificados:** `src/components/generator/code-view.tsx`
**Commit:** 2189aa7
**Correção aplicada:** O reset de 2s foi extraído para `scheduleCopyReset()`, que agora também roda no caminho de falha.
**Status:** corrigido

## Issues puladas

### WR-08: `color-scheme: light dark` com fundo branco fixo deixa controles nativos escuros sobre branco

**Arquivo:** `src/lib/preview-srcdoc.ts:32-35`, `src/components/generator/sandbox-preview.tsx:56`
**Motivo:** A correção sugerida (forçar `color-scheme: light`) contraria a decisão travada D-10 (03-CONTEXT.md): "Generated `dark:` utilities still follow the iframe's own `prefers-color-scheme`". O 03-02-PLAN proíbe explicitamente `color-scheme: light` sozinho, porque apagaria os `dark:` gerados, e `preview-srcdoc.test.ts` garante isso. A alternativa (fundo/cor do canvas seguindo o esquema) contraria a outra metade de D-10 (canvas sempre branco). Isso pede uma decisão de produto, não uma correção mecânica.
**Issue original:** Com SO/navegador em modo escuro, os controles nativos do componente gerado (inputs, selects, scrollbars) aparecem escuros sobre o fundo branco fixo, com contraste ruim.

---

_Corrigido em: 2026-10-15T22:18:02Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteração: 1_
