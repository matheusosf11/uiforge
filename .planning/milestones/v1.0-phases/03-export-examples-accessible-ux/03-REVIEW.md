---
phase: 03-export-examples-accessible-ux
reviewed: 2026-10-15T00:00:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - src/app/api/generate/route.test.ts
  - src/app/api/generate/route.ts
  - src/app/layout.tsx
  - src/app/page.tsx
  - src/components/generator/code-view.tsx
  - src/components/generator/generator-shell.tsx
  - src/components/generator/prompt-form.test.tsx
  - src/components/generator/prompt-form.tsx
  - src/components/generator/sandbox-preview.tsx
  - src/components/theme/theme-toggle.tsx
  - src/lib/download-filename.test.ts
  - src/lib/download-filename.ts
  - src/lib/example-prompts.test.ts
  - src/lib/example-prompts.ts
  - src/lib/generate-error.test.ts
  - src/lib/generate-error.ts
  - src/lib/preview-srcdoc.test.ts
  - src/lib/preview-srcdoc.ts
findings:
  critical: 1
  warning: 8
  info: 6
  total: 15
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-10-15
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

Revisei a rota `/api/generate` (agora com "peek" do `fullStream` para devolver 429/502), o shell do gerador (status `aria-live`, alerta amigável, "Tentar de novo", abas mobile), `CodeView` (copiar/baixar), chips de exemplo, toggle de tema e as libs auxiliares.

O problema mais grave está na rota: o `ReadableStream` montado à mão tem um `pull()` que, ao receber partes que não são `text-delta` (`text-end`, `finish-step`, `finish`, que o AI SDK v7 sempre emite), resolve sem chamar `enqueue` nem `close`. Pela especificação de Streams, o `pull` não é chamado de novo nesse caso, então a resposta **nunca fecha**. Reproduzi isso isoladamente no Node: o stream trava logo depois do último delta. Os testes passam só porque o mock emite apenas `text-delta`. Na prática, o cliente fica em "Gerando…" até o timeout da função (60s) ou até o usuário clicar em "Parar", e o preview nunca aparece pelo caminho normal.

Os outros achados: truncamento silencioso apresentado como "Pronto", requisição ao provider que não é cancelada, download frágil, nome de arquivo errado para `React.memo`, prompt longo demais virando erro genérico em loop, e algumas arestas de estado e acessibilidade.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: Stream de resposta nunca fecha (`pull` resolve sem `enqueue`/`close`)

**File:** `src/app/api/generate/route.ts:63-80`
**Issue:** Quando `reader.read()` devolve uma parte que não é `text-delta`, `error` nem `abort` (por exemplo `text-end`, `finish-step`, `finish`, `reasoning-*`, `source`), o `pull` retorna sem enfileirar nada. Pela especificação WHATWG Streams (`ReadableStreamDefaultControllerCallPullIfNeeded`), se o `pull` resolve sem `enqueue` e nada marcou `pullAgain`, ele não é chamado de novo. A leitura pendente do consumidor (o Next fazendo pipe do body) fica parada para sempre. O `streamText` do AI SDK v7 sempre emite `text-end` depois do último delta, seguido de `finish-step` e `finish` (confirmado em `node_modules/ai/dist/index.js`). Com isso, toda geração bem-sucedida trava depois do último token. O `processTextStream` do cliente nunca termina, `isLoading` fica `true`, o status mostra "Gerando…" indefinidamente, "Pronto" nunca aparece e o `SandboxPreview` nunca renderiza (só aparece se o usuário clicar em "Parar"). Reproduzi com um script mínimo no Node usando as partes `[text-delta, text-end, text-delta, finish-step, finish]`: o resultado foi "STALLED". O teste `sucesso faz streaming text/plain` passa só porque o mock não emite `text-end`/`finish`.
**Fix:** Repetir a leitura dentro do `pull` até enfileirar algo ou encerrar:
```ts
async pull(controller) {
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) { controller.close(); return; }
      if (value.type === "text-delta") {
        controller.enqueue(encoder.encode(value.text));
        return;
      }
      if (value.type === "error" || value.type === "abort") {
        controller.close();
        void reader.cancel().catch(() => {});
        return;
      }
      // outras partes (text-start/text-end/finish-step/finish/reasoning): continuar lendo
    }
  } catch {
    controller.close();
  }
},
```
Atualize também `route.test.ts` para usar a sequência real (`start`, `start-step`, `text-start`, `text-delta`..., `text-end`, `finish-step`, `finish`), assim a regressão fica coberta (ver WR-09).

## Warnings

### WR-01: Erro depois do primeiro token vira "Pronto" com código truncado

**File:** `src/app/api/generate/route.ts:72-75`, `src/components/generator/generator-shell.tsx:84-91`
**Issue:** Se o provider falha no meio da geração, a rota fecha o stream normalmente com status 200. O cliente recebe um `result` não vazio, chama `setFinished(true)` (anuncia "Pronto" via `aria-live`) e passa o código truncado para o preview e para o Copiar/Baixar. O comentário chama isso de "limitação aceita", mas para o usuário uma falha aparece como sucesso, sem alerta e sem "Tentar de novo".
**Fix:** Sinalizar o truncamento dentro do protocolo de texto. Uma opção é `controller.error(new Error("generate_failed"))` no lugar de `controller.close()`: o `processTextStream` rejeita, o `useCompletion` chama `onError` e o shell mostra o alerta genérico. Outra opção é anexar um sentinel conhecido que o cliente remove e trata como falha.

### WR-02: Requisição ao provider não é cancelada (sem `abortSignal`, reader abandonado)

**File:** `src/app/api/generate/route.ts:29, 44, 50, 53`
**Issue:** O `streamText` é chamado sem `abortSignal: req.signal`. Se o cliente aborta antes do primeiro delta ("Parar" logo no início), o loop de peek continua consumindo o provider (e a cota). Nos retornos antecipados (`failureResponse`, 502 por `abort`/stream vazio), o `reader` não é cancelado. A antiga `toTextStreamResponse()` propagava o cancelamento pelo body; a nova implementação só faz isso depois que o `ReadableStream` existe.
**Fix:** `streamText({ model, system: SYSTEM_PROMPT, prompt: parsed.prompt, abortSignal: req.signal })` e chamar `void reader.cancel().catch(() => {})` antes de cada `return` antecipado (ou num `finally` controlado por flag).

### WR-03: Download frágil: âncora fora do DOM e `revokeObjectURL` síncrono

**File:** `src/components/generator/code-view.tsx:66-74`
**Issue:** `URL.revokeObjectURL(url)` roda logo depois de `a.click()`. Em alguns navegadores (Safari, versões do Firefox) o download começa de forma assíncrona e o blob já foi revogado, o que gera um download que falha ou sai vazio. A âncora também nunca é anexada ao documento, e versões do Firefox ignoram `click()` em elementos desanexados.
**Fix:**
```ts
document.body.appendChild(a);
a.click();
a.remove();
setTimeout(() => URL.revokeObjectURL(url), 0);
```

### WR-04: `componentFilename` gera `React.tsx` / `Object.tsx` para expressões com membro

**File:** `src/lib/download-filename.ts:4, 15-16`
**Issue:** `ALIAS` (`/export\s+default\s+([A-Z][\w$]*)\s*;?/`) não exige que o identificador termine o statement. `export default React.memo(Card)` vira `React.tsx`, e `export default Object.assign(Root, {...})` vira `Object.tsx`. São padrões comuns em código gerado. O teste cobre só `memo(Button)` com inicial minúscula.
**Fix:** Ancorar o alias ao fim do statement: `/export\s+default\s+([A-Z][\w$]*)\s*(?:;|$)/m`, e acrescentar casos de teste para `React.memo(Card)` e `Object.assign(...)`.

### WR-05: Prompt acima de 2000 caracteres vira erro genérico em loop

**File:** `src/components/generator/prompt-form.tsx:60-68`, `src/app/api/generate/route.ts:10-20`
**Issue:** O servidor rejeita prompts com mais de 2000 caracteres (400), mas a `Textarea` não tem `maxLength` nem validação. O cliente mostra "Falha ao gerar o componente. Tente novamente." e "Tentar de novo" reenvia exatamente o mesmo prompt, que falha de novo. O usuário não tem como descobrir a causa.
**Fix:** Adicionar `maxLength={2000}` na `Textarea` (e de preferência um contador), compartilhando a constante com o schema Zod. Outra opção é mapear o 400 para uma mensagem específica em `friendlyGenerateError`.

### WR-06: Corrida entre "Parar" e novo envio contamina a nova geração

**File:** `src/components/generator/generator-shell.tsx:74-118`
**Issue:** `stoppedRef`/`failedRef` são compartilhados entre requisições. Se o usuário clica em "Parar" e envia de novo antes de a IIFE anterior terminar, `send` reseta `stoppedRef.current = false`. A IIFE antiga então resolve com `null` (AbortError), passa pelo `if (stoppedRef.current) return`, marca `failedRef.current = true` e mostra `GENERIC_ERROR_MESSAGE` durante a nova geração. A nova geração, mesmo bem-sucedida, não chega a "Pronto" porque `failedRef` está `true`. A janela é estreita, mas real.
**Fix:** Usar um id de requisição: `const id = ++requestIdRef.current;` e, na IIFE, `if (id !== requestIdRef.current) return;` antes de qualquer `setState`/ref.

### WR-07: Estado "Não foi possível copiar" nunca volta para "Copiar"

**File:** `src/components/generator/code-view.tsx:53-63`
**Issue:** O caminho de falha define `copyState = "failed"` sem timeout. O botão fica preso em "Não foi possível copiar" mesmo depois de novas gerações (o estado não reseta quando `code` muda).
**Fix:** Agendar o mesmo reset de 2s no `catch` e/ou resetar `copyState` num `useEffect` dependente de `code`.

### WR-08: `color-scheme: light dark` com fundo branco fixo deixa controles nativos escuros sobre branco

**File:** `src/lib/preview-srcdoc.ts:32-35`, `src/components/generator/sandbox-preview.tsx:56`
**Issue:** O documento do iframe declara `color-scheme: light dark`, mas `html, body` têm `background: #fff; color: #0f172a` fixos. Com SO/navegador em modo escuro, o esquema usado no iframe é o escuro: inputs, selects, checkboxes e scrollbars nativos do componente gerado aparecem escuros sobre fundo branco, com contraste ruim. Isso contradiz a intenção da Fase 03 de manter o preview legível.
**Fix:** Como o canvas é sempre claro, declarar `<meta name="color-scheme" content="light" />` e `style={{ colorScheme: "light" }}` no iframe. Se a ideia for suportar tema escuro no preview, o fundo e a cor do texto precisam seguir o esquema.

### WR-09: Testes da rota não exercitam a sequência real do `fullStream`

**File:** `src/app/api/generate/route.test.ts:13-24, 74-85`
**Issue:** O mock só emite `start`, `text-delta` e `error`. Por isso a suíte passa apesar de CR-01: nenhuma parte "neutra" (`text-start`, `text-end`, `finish-step`, `finish`) aparece depois do primeiro delta. O teste dá uma falsa garantia sobre o caminho de sucesso, que é o principal.
**Fix:** No teste de sucesso, usar `[{type:"start"},{type:"start-step"},{type:"text-start"},{type:"text-delta",text:"ab"},{type:"text-delta",text:"cd"},{type:"text-end"},{type:"finish-step"},{type:"finish"}]` e verificar `await res.text() === "abcd"` com timeout curto.

## Info

### IN-01: `catch` inalcançável em `send`

**File:** `src/components/generator/generator-shell.tsx:92-97`
**Issue:** `callCompletionApi` captura todos os erros internamente (AbortError devolve `null`, o resto chama `onError` e resolve `undefined`). `complete()` nunca rejeita, então o bloco `catch` é código morto e duplica a lógica de `onError`.
**Fix:** Remover o `catch` ou documentar que ele existe só como defesa.

### IN-02: `RATE_LIMIT_PATTERN` é amplo demais

**File:** `src/lib/generate-error.ts:8`
**Issue:** Qualquer mensagem com "quota" ou um "429" isolado (por exemplo erros de configuração de projeto/billing do Google, como "quota project not set") é classificada como rate limit. O servidor responde 429 e o usuário é orientado a "esperar", quando o problema é de configuração.
**Fix:** Preferir `statusCode === 429` / `RESOURCE_EXHAUSTED` e restringir o fallback por regex.

### IN-03: `aria-label` em inglês numa UI pt-BR

**File:** `src/components/generator/code-view.tsx:78`, `src/components/generator/generator-shell.tsx:218, 230`, `src/components/generator/sandbox-preview.tsx:30, 53`
**Issue:** "Generated code" e "Live preview" são lidos em inglês por leitores de tela com `lang="pt-BR"`, o que destoa dos títulos visíveis ("Código gerado", "Preview").
**Fix:** Usar "Código gerado" e "Pré-visualização".

### IN-04: `role="tabpanel"` no desktop sem tablist visível; faltam Home/End

**File:** `src/components/generator/generator-shell.tsx:120-126, 172-176, 210-246`
**Issue:** No desktop (`md:`) a tablist fica `display:none`, mas os painéis continuam com `role="tabpanel"` e `aria-labelledby` apontando para abas ocultas, o que gera uma semântica confusa. O teclado também não trata Home/End, previstos no padrão APG de tabs.
**Fix:** Aplicar `role`/`aria-*` só no layout mobile (por exemplo via `matchMedia`) e tratar Home/End.

### IN-05: Listener de `message` não valida a origem

**File:** `src/components/generator/sandbox-preview.tsx:13-21`
**Issue:** Qualquer janela (outro iframe, opener) pode postar `uiforge-preview-error`/`ready` e alterar o alerta exibido. O risco é baixo, porque o texto é escapado pelo React.
**Fix:** Guardar uma ref do iframe e checar `event.source === iframeRef.current?.contentWindow`.

### IN-06: Painel de preview usa `isLoading` em vez de `busy`

**File:** `src/components/generator/generator-shell.tsx:216`
**Issue:** No intervalo entre `setInFlight(true)` e `isLoading` virar `true`, o painel mostra o preview antigo enquanto o status já diz "Gerando…". É inconsistente com o resto do componente, que usa `busy`.
**Fix:** Usar `busy` na condição.

---

_Reviewed: 2026-10-15_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
