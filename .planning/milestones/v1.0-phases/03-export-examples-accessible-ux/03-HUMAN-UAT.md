---
status: complete
phase: 03-export-examples-accessible-ux
source: [03-VERIFICATION.md]
started: 2026-10-15T00:00:00Z
updated: 2026-10-16T13:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Gerar um componente real com Gemini e esperar o fim do stream
expected: Status muda de "Gerando…" para "Pronto" (anunciado via aria-live) e o preview renderiza sem precisar clicar em Parar
result: pass
note: confirmado pelo usuário em produção (2026-10-16, fase 4 / 04-HUMAN-UAT teste 1)

### 2. Provocar falha no meio da geração (derrubar rede/abortar o provider após os primeiros tokens)
expected: fetch rejeita a leitura, aparece o alerta amigável com "Tentar de novo", "Pronto" não é anunciado e o preview não é promovido (código truncado fica só na aba Código)
result: pass
note: coberto pelo cenário 2 do e2e Playwright (e2e/generate.spec.ts, mock `__e2e_error__`), verde no CI

### 3. Provocar 429 e clicar em "Tentar de novo"
expected: Mensagem amigável de limite de uso em role=alert e o retry reenvia o último prompt
result: pass
note: Playwright (Chromium, Firefox, WebKit) contra build de produção local com mock e rate limit real (5/janela) — 6ª geração → HTTP 429, alerta "Muitas tentativas…", sem "Pronto"; após a janela, "Tentar de novo" reenvia o mesmo prompt e conclui com "Pronto". 429 do provedor Gemini usa o mesmo caminho (rate_limited), coberto por testes unitários.

### 4. Parar uma geração e reenviar rapidamente (WR-06)
expected: A nova geração não exibe erro falso nem "Pronto" da requisição antiga
result: pass
note: Playwright nos 3 navegadores — primeira resposta atrasada 1,5s, Parar no meio, reenvio imediato; nenhum alerta no main, "Pronto" e preview vêm da nova geração.

### 5. Leitor de tela, tema, abas mobile e download em Safari/Firefox
expected: Anúncios corretos nos estados Gerando/Pronto/erro, tema persistido no reload, layout responsivo com abas abaixo de 768px, arquivo baixado com nome adequado
result: pass
note: Playwright em Chromium, Firefox e WebKit (motor do Safari) — região aria-live="polite" anuncia "Gerando…"→"Pronto"; tema persiste após reload; em 390px as abas Preview/Código alternam painéis, setas movem o foco (roving tabindex) e o prompt continua visível; download sai como FixtureCard.tsx. Limitação: escuta com leitor de tela real (NVDA/VoiceOver) não foi automatizada — a semântica ARIA foi verificada.

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none]
