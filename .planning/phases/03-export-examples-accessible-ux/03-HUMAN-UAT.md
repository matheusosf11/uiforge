---
status: partial
phase: 03-export-examples-accessible-ux
source: [03-VERIFICATION.md]
started: 2026-10-15T00:00:00Z
updated: 2026-10-15T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Gerar um componente real com Gemini e esperar o fim do stream
expected: Status muda de "Gerando…" para "Pronto" (anunciado via aria-live) e o preview renderiza sem precisar clicar em Parar
result: [pending]

### 2. Provocar falha no meio da geração (derrubar rede/abortar o provider após os primeiros tokens)
expected: fetch rejeita a leitura, aparece o alerta amigável com "Tentar de novo", "Pronto" não é anunciado e o preview não é promovido (código truncado fica só na aba Código)
result: [pending]

### 3. Provocar 429 real do Gemini e clicar em "Tentar de novo"
expected: Mensagem amigável de limite de uso em role=alert e o retry reenvia o último prompt
result: [pending]

### 4. Parar uma geração e reenviar rapidamente (WR-06)
expected: A nova geração não exibe erro falso nem "Pronto" da requisição antiga
result: [pending]

### 5. Leitor de tela, tema, abas mobile e download em Safari/Firefox
expected: Anúncios corretos nos estados Gerando/Pronto/erro, tema persistido no reload, layout responsivo com abas abaixo de 768px, arquivo baixado com nome adequado
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
