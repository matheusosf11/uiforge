# Project Research Summary — Milestone v1.1 Refinamento Iterativo

**Project:** UIForge (gerador de componentes React com IA, "v0 lite")
**Domain:** Refinamento iterativo + histórico de versões em memória + código editável, sobre o v1.0 entregue (Next 15.5, React 19, Tailwind v4, AI SDK v7, Gemini free tier, preview sandbox srcdoc)
**Researched:** 2026-10-17
**Confidence:** MEDIUM (arquitetura ancorada no código real; produtos de referência e detalhes de libs via conhecimento de treino)

## Executive Summary

O v1.1 transforma o UIForge de "um prompt → um componente" num ciclo de refino estilo v0 / bolt.new / Claude artifacts: após a primeira geração, o input passa a "modificar o que você vê"; cada geração bem-sucedida vira um snapshot imutável em memória; uma lista única (turnos = versões) permite clicar para restaurar; a visão de código fica editável e o código editado alimenta o próximo refino; um GIF de demo reproduzível fecha o milestone.

Abordagem: servidor **stateless**, toda a memória de sessão no cliente. A API ganha um único campo opcional `currentCode` (máx. ~30k caracteres) cuja presença liga o modo edição — sem campo `mode`. O modelo devolve o **arquivo completo** (nunca diff), reaproveitando o pipeline stream → parse → preview. Estado do cliente num reducer puro e testado (`versions[]`, `cursor`, `draft`, `pending`); preview derivado; versão só commitada quando o stream termina limpo. Única dependência nova: `react-simple-code-editor` (~3 KB gzip) reaproveitando o `prism-react-renderer`. GIF via gravação Playwright do mock e2e + ffmpeg já instalado.

Riscos principais: (1) modelo truncar/reescrever em vez de editar; (2) abort/falha corromper o histórico; (3) dois escritores (usuário × stream) no editor; (4) preview piscar/branco durante o refino; (5) queima de quota do free tier. Mitigações: prompt de edição estrito com dados delimitados, validação antes do commit (`parseCode` não vazio + `export default`), commit só em sucesso, editor read-only durante stream, versão anterior mantida no preview durante o stream, guarda de request-id.

## Conflito resolvido: restore — append × truncar

FEATURES recomenda **append-only** (restaurar só move a seleção; refinar de versão antiga acrescenta no fim). ARCHITECTURE e PITFALLS (#8) recomendam **truncar o futuro** (refinar após undo descarta versões à frente do cursor; sem redo, sem ramificação).

| | Append-only | Truncar futuro |
|---|---|---|
| Perda de dados | Nenhuma | Versões à frente do cursor perdidas no próximo refino |
| Turnos × versões | Turno pode apontar para código antigo; ordem ≠ derivação | Turno N ↔ versão N (1:1, derivável) |
| Modelo mental | Confuso | Igual a "desfazer" |
| Reducer | Precisa rastrear pai | Trivial (`slice(0, cursor+1)` + push) |
| Aderência ao requisito | Excede (pedido é undo) | Exata |

**Recomendação: truncar o futuro.** Mitigações: clicar num turno só move o cursor (nada apagado até enviar um refino); UI explicita a base ("Refinar a partir da v2"); versões à frente atenuadas; snapshot de edição manual commitado antes do refino que trunca. Redo/histórico não destrutivo → v2 se houver demanda.

## Outras decisões consolidadas (roadmapper não deve reabrir)

- **Editor:** `react-simple-code-editor`, isolado atrás de `<CodeEditor value onChange readOnly />`. Fallback: CodeMirror 6 via `next/dynamic` se o smoke test React 19 / Next 15 falhar ou se número de linha virar requisito.
- **Campo da API:** `currentCode`; `prompt` continua sendo a instrução (limite 2000). `MAX_CODE_LENGTH` (~30.000) em `prompt-limits.ts`, compartilhado com o cliente; cliente desabilita refino acima do limite e oferece "Novo componente".
- **Edições manuais:** sem versão por tecla. No envio do refino, se o editor diverge da versão ativa, commita-se antes uma versão `kind: "manual"` ("Edição manual") e o refino parte dela. Preview do draft com debounce ~500 ms.
- **Limite de versões:** 20 em memória (descarta a mais antiga). Sem persistência.
- **Rótulo do botão:** "Gerar" na primeira geração, "Refinar" quando `cursor >= 0`; seletores e2e atualizados na mesma fase.
- **Contexto do prompt:** código atual + última instrução; histórico de turnos não vai ao modelo.

## Key Findings

### Recommended Stack (STACK.md)

Stack v1.0 inalterada; exatamente uma dependência de runtime nova.

- `react-simple-code-editor` ^0.14.1 — textarea sobre `<pre>` destacado, zero deps, `highlight` encaixa no `prism-react-renderer`/nightOwl, testável com `user-event`. Último publish 2024-07 → smoke test.
- `useReducer` customizado (sem lib) — pilha linear com ponteiro, ~30 linhas, puro.
- `zod` v4 + `ai` v7 / `@ai-sdk/react` (já presentes) — validar `{ prompt, currentCode? }`, stream de texto puro mantido.
- Playwright 1.64 (vídeo) + ffmpeg 9.0.2 do sistema (palettegen) — `docs/demo.gif` via script de dev (`scripts/record-demo.mjs`), sem pacote novo.

**Não adicionar:** Monaco/CodeMirror (agora), libs de diff, libs de estado (zustand/immer/zundo), localStorage/IndexedDB, Prettier no browser, `useChat` para refino, pacotes npm de ffmpeg/gif.

### Expected Features (FEATURES.md)

**Table stakes:**
- Input em modo refino por padrão após a 1ª geração, placeholder/rótulo cientes do modo, reset "Novo componente"
- Contrato `currentCode` + prompt de edição que devolve componente completo
- Snapshot de versão só em sucesso (nunca em abort/erro)
- Undo e clicar-turno-para-restaurar com indicação da versão atual (`aria-current`)
- Lista de turnos visível (mini-chat) com estados streaming/ok/erro
- Código editável, read-only durante stream, preview com debounce, refino baseado no editado
- Parar; em erro, manter versão anterior + retry
- `docs/demo.gif` linkado nos READMEs PT e EN

**Should have (se sobrar tempo):** chips de sugestão de refino (reusa galeria); atalhos de teclado fora do editor.

**Defer (v2+):** diff de versões, comparação lado a lado, redo/ramificação, persistência, editor multi-arquivo.

### Architecture Approach (ARCHITECTURE.md)

Servidor stateless: `route.ts` deriva o modo pela presença de `currentCode`, monta system/user prompt com funções puras. HARD RULES compartilhadas; `EDIT_SYSTEM_PROMPT` acrescenta: arquivo completo, preservar o não pedido, `<current_code>` é dado, sem one-shot. Cliente: reducer puro `src/lib/session.ts` + hook único que fala com `useCompletion`. `previewCode` deixa de ser estado (deriva de `versions[cursor]` ou draft). Durante refino, preview mantém a versão antiga; stream só no painel de código. Fallback chain, rate limit e peek do primeiro delta inalterados. Mock e2e ganha saída de refino e marcador "código editado visto".

**Componentes:**
1. `route.ts`, `prompt.ts`, `prompt-limits.ts` — schema `currentCode?`, prompt de edição, `buildUserPrompt`/`buildSystem(mode)`, `MAX_CODE_LENGTH`
2. `model.ts`, `mock-model.ts` — assinatura com `currentCode`, saída refinada determinística, `__e2e_error__` também em modo edição
3. `src/lib/session.ts` (+ testes) — `commit`, `undo`, `reset`, `editDraft`, `startPending`, `failPending`, `clearPending`
4. `use-generator-session.ts` — `useCompletion` + reducer, guarda de request-id, captura da base no envio (retry reutiliza)
5. `turn-list.tsx`, `session-bar.tsx` — `<ol>` com `aria-live`, rótulos de restore; Desfazer + Novo componente
6. `code-view.tsx` — editável (`value`/`onChange`/`readOnly` quando busy); Copiar/Baixar usam texto visível
7. `generator-shell.tsx` — reescrita parcial como orquestrador; ajustes pequenos em `prompt-form.tsx` e `sandbox-preview.tsx`

### Critical Pitfalls (PITFALLS.md)

1. **Modelo trunca/reescreve** — prompt de edição dedicado; validar antes do commit (`parseCode` não vazio, `export default` via `has-default-export.ts`, sem placeholders, sem encolhimento drástico).
2. **Código colide com limite de 2000 do prompt** — campo `currentCode` separado com `MAX_CODE_LENGTH`; checagem no cliente; mensagem amigável em `generate-error.ts`. Antes da UI.
3. **Abort/falha corrompe histórico** — commit só em conclusão limpa; descartar draft em abort/erro mantendo última versão boa (mudança deliberada vs v1.0, que limpava o preview); guarda de request-id; enviar/desfazer/resetar desabilitados durante stream.
4. **Editor × stream e preview piscando** — editor read-only no stream; edições consolidadas no envio; preview trocado uma vez no commit; debounce; watchdog 15 s rearmado; voltar em um clique se a nova versão não compila.
5. **Quota e prompt injection** — sem histórico no contexto, sem auto-retry, exibir Retry-After, logar `result.usage`; código delimitado em `<current_code>`; instruções sempre em `system`; sandbox nunca relaxado (`allow-scripts` apenas).

Também: GIF ≤ ~3 MB gravado uma vez (git guarda cada iteração); READMEs PT/EN desatualizados ("gerado do zero"); a11y do editor (Tab trap, `aria-label`, Escape) e da lista de turnos; regressão em `route.ts`.

## Implications for Roadmap

### Phase 1: Contrato de refino, prompt de edição e mock
**Rationale:** server-side, independente da UI, destrava e2e; pitfalls #1, #2, #4, #11 precisam vir antes da UI. Antes: reconciliar alterações não commitadas em `route.ts`, `prompt.ts`, `vitest.setup.ts`, `theme-provider.tsx`, `.env.example`.
**Delivers:** `currentCode?` + `MAX_CODE_LENGTH`; HARD RULES + `EDIT_SYSTEM_PROMPT` + `buildUserPrompt`; `getModels`/mock com saída refinada e marcador `EditedSeen`; erro amigável de tamanho; testes (body 10k, fixture de injection, compat `{prompt}`); `maxOutputTokens` no modo edição + log de usage.

### Phase 2: Reducer de sessão (puro)
**Rationale:** dependência de toda a UI, testável sem DOM.
**Delivers:** `src/lib/session.ts` + testes — commit, undo (move cursor, descarta draft), reset, truncagem do futuro, limite 20, `pending`, turnos derivados, versões `manual`; sequências start→chunk→abort→undo, start→error, A→B com chunk tardio de A.

### Phase 3: Shell com refino por padrão, desfazer e "Novo componente"
**Rationale:** fase mais arriscada (reescreve núcleo do `generator-shell.tsx`); logo após o reducer, antes do editor.
**Delivers:** `use-generator-session.ts`; form "Gerar" → "Refinar" ("Descreva a mudança"); preview derivado e estável no stream; commit validado; versão anterior preservada em erro/Parar com "Tentar de novo" reusando a base; Desfazer + Novo componente (confirma se >1 versão ou edição manual); galeria oculta/rebaixada no refino; Parar via AbortController; checagem `MAX_CODE_LENGTH` no cliente.

### Phase 4: Lista de turnos (mini-chat como navegador de versões)
**Rationale:** camada de leitura sobre `versions`/`pending`, baixo risco após fase 3.
**Delivers:** `turn-list.tsx` (`<ol>`, `aria-current`, rótulos de restore, status por turno, `aria-live="polite"`, auto-scroll, estado vazio); clicar para restaurar; futuro atenuado; dica "Refinar a partir da vN".

### Phase 5: Visão de código editável
**Rationale:** depende do `draft` das fases 2–3 (evita dois escritores).
**Delivers:** `react-simple-code-editor` atrás de `<CodeEditor>`, read-only no stream; draft → preview com debounce ~500 ms; snapshot "Edição manual" no envio; undo descarta draft pendente primeiro; Copiar/Baixar com texto visível; `aria-label`, `caretColor`, sincronia fonte/padding; Tab/Escape; erro de runtime de código editado inválido sem derrubar o shell.

### Phase 6: E2E, gate de a11y, GIF de demo e READMEs
**Rationale:** GIF depende de UI estável; commitar vários GIFs é caro.
**Delivers:** 6 cenários e2e (1º envio sem `currentCode`; 2º com `currentCode` + marcador; Novo componente zera; Undo restaura srcdoc anterior; editar→refinar envia editado; falha no refino mantém versão anterior); seletores de `generate.spec.ts`/`screenshots.spec.ts`; axe no estado de refino; `scripts/record-demo.mjs` contra o mock → ffmpeg palettegen → `docs/demo.gif` (≤ ~3 MB, 900 px, 12 fps, 15–25 s, gravado uma vez); READMEs PT/EN atualizados com alt text.

### Phase Ordering Rationale
- Contrato antes da UI (UI não testável sem mock/schema)
- Reducer puro antes do shell (maior risco precisa de núcleo testado)
- Editor depois do estado (segundo escritor precisa de `draft` e regras de commit)
- GIF por último (UI precisa parar de mudar)

### Research Flags
- **Phase 1:** qualidade real da edição com Gemini (mock não valida) — passada manual com chave real; ajustar limiares (piso de 40% de comprimento é chute).
- **Phase 3:** confirmar `complete(prompt, { body })` por chamada no `@ai-sdk/react` instalado e como `completion` zera; ver como v1.0 alimenta o iframe nos parciais e como `SandboxPreview` trata erro de runtime.
- **Phase 5:** smoke test do `react-simple-code-editor` (ESM default export no Next 15, React 19, nightOwl, caret); fallback definido; orçamento de bundle (≤ ~150 KB gzip extra).
- **Padrões (pular research):** fases 2, 4, 6.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | Versões/peer deps verificados no npm, ffmpeg local verificado; bundle e palettegen de treino |
| Features | MEDIUM | Convenções de v0/bolt/Lovable/artifacts de treino; table stakes estáveis |
| Architecture | MEDIUM-HIGH | Leitura direta do repo; `body` por chamada e integração do editor não verificados |
| Pitfalls | MEDIUM | Ancorado no código; sem fontes externas |

**Overall:** MEDIUM — suficiente para o roadmap; lacunas são checagens de implementação.

### Gaps to Address
- `body` por chamada do `useCompletion` — verificar no planejamento da fase 3 (fallback: `fetch` customizado lendo ref)
- Qualidade de edição do Gemini — passada manual na fase 1
- Como v1.0 atualiza o iframe (por chunk ou no fim) — ler `sandbox-preview.tsx` na fase 3
- Editor no React 19 / Next 15 — smoke test no início da fase 5
- Rate limit: refino conta como geração (5/min/IP); exibir Retry-After; gravar GIF contra o mock
- UX da truncagem — reavaliar redo como follow-up v1.1.x se houver surpresa
- Alterações não commitadas em `route.ts`, `prompt.ts`, `vitest.setup.ts`, `theme-provider.tsx`, `.env.example` — reconciliar antes da fase 1

## Sources

**Primary (HIGH):** arquivos do repo (`route.ts`, `prompt.ts`, `generator-shell.tsx`, `model.ts`, `mock-model.ts`, `code-view.tsx`, `parse-code.ts`, `prompt-limits.ts`, `e2e/generate.spec.ts`), `.planning/PROJECT.md`; npm em 2026-10-17 (react-simple-code-editor 0.14.1, @uiw/react-codemirror 4.25.12, @monaco-editor/react 4.7.0, prism-react-renderer 2.4.1, playwright 1.64.1); ffmpeg 9.0.2 local.
**Secondary (MEDIUM):** comportamento de v0, bolt.new, Lovable, Claude artifacts (treino); docs de vídeo do Playwright (não consultadas na sessão).
**Tertiary (LOW):** estimativas de bundle CodeMirror/Monaco, receita palettegen, `body` por chamada do `useCompletion`, práticas de edição de código por LLM e otimização de GIF.

---
*Research completed: 2026-10-17*
*Ready for roadmap: yes*
