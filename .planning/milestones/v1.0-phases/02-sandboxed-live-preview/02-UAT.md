---
status: complete
phase: 02-sandboxed-live-preview
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md]
started: 2026-10-15T12:00:00Z
updated: 2026-10-15T20:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Teste de inicialização a frio
expected: Pare qualquer servidor de dev em execução e inicie do zero com `npm run dev`. O servidor sobe sem erros e http://localhost:3000 carrega a página do gerador (formulário de prompt, painel de código, painel de preview).
result: pass

### 2. Preview ao vivo após gerar
expected: Envie um prompt (ex.: "um botão verde de salvar"). Durante o streaming, o painel de preview mostra "Gerando preview…" e nenhum iframe. Quando o streaming termina, o componente aparece renderizado dentro do iframe branco "Live preview", abaixo do título "Preview".
result: pass

### 3. Classes do Tailwind visíveis no iframe
expected: O componente renderizado no iframe exibe o estilo do Tailwind — cores de fundo, padding, cantos arredondados, peso de fonte — e não HTML padrão sem estilo.
result: pass
note: confirmado pela captura de tela do teste 2 (bg verde, padding, rounded, font-semibold aplicados)

### 4. Estado de erro nunca em branco
expected: Quando o código gerado falha ao compilar/executar (ou não tem export default), o preview nunca fica em branco — aparece uma caixa vermelha de erro dentro do iframe E um alerta vermelho acima do iframe na página. Uma nova geração bem-sucedida limpa o alerta.
result: pass

## Notes

- Substitui 02-HUMAN-UAT.md: o preview foi refeito de Sandpack para um iframe srcdoc com sandbox (React 18.3.1 UMD + Babel standalone + @tailwindcss/browser@4.3.3), com erros reportados via postMessage.
- Dica para o teste 4: um prompt como "um componente que lança um erro ao renderizar" costuma disparar o erro.

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
