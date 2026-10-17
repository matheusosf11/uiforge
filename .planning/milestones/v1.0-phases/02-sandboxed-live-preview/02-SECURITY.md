---
phase: 02
slug: sandboxed-live-preview
status: verified
threats_open: 0
asvs_level: 1
created: 2026-10-15
---

# Phase 02 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

> **Escopo da auditoria:** verificado contra a working tree **não commitada** de 2026-10-15, em que o preview Sandpack (planejado em 02-01/02-02) foi substituído por um `<iframe sandbox="allow-scripts" srcDoc>` (`src/lib/preview-srcdoc.ts`). Se essa mudança for descartada ou alterada, refaça `/gsd-secure-phase 2`.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Host React tree → iframe srcdoc | TSX gerado pelo LLM (não confiável) entra só como string JSON-escapada dentro do srcdoc; executado apenas no iframe de origem opaca | Código não confiável |
| iframe `<head>` ← jsDelivr | Tailwind 4.3.3, React/ReactDOM 18.3.1, Babel standalone 7.28.5 em URLs fixas e hardcoded | Código de terceiros (sem SRI) |
| iframe → host (postMessage) | Apenas texto de erro / sinal de "ready" | Texto não confiável, renderizado como texto |
| GeneratorShell → /api/generate | Inalterado da Fase 1; chave Gemini só no servidor | Prompt do usuário / stream de texto |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-02-01 | Elevation of Privilege / Tampering | TSX gerado na origem do host | mitigate | Nenhum eval/`new Function`/`dangerouslySetInnerHTML` do código gerado no host; o único `new Function` (`preview-srcdoc.ts:78`) está dentro da string srcdoc e roda só no iframe de origem opaca (`sandbox-preview.tsx:52-57`). *Redação atualizada: o grep-ban literal do plano está obsoleto.* | closed |
| T-02-02 | Information Disclosure | Código gerado × cookies/localStorage do host | mitigate | `sandbox="allow-scripts"` sem `allow-same-origin` (`sandbox-preview.tsx:54`) → origem opaca; host nunca renderiza o componente gerado; chave Gemini só server-side (`api/generate/route.ts:21`) | closed |
| T-02-03 | Tampering | `SandpackCss` dangerouslySetInnerHTML | mitigate | Payload continua sendo só `getSandpackCssText()` (`sandpack-css.tsx:10`); componente agora órfão | closed |
| T-02-04 | Denial of Service | Remount do preview por token | mitigate | `previewCode` só é definido na transição isLoading→false (`generator-shell.tsx:45-55`); `srcDoc` memoizado por código (`sandbox-preview.tsx:8`) | closed |
| T-02-05 | Spoofing | `ssr:false` | mitigate | `next/dynamic` ssr:false só em `generator-shell.tsx`; `page.tsx` é RSC sem dynamic | closed |
| T-02-06 | Tampering | Scripts externos do iframe | mitigate | Tailwind fixado em `@tailwindcss/browser@4.3.3/dist/index.global.js` (`preview-srcdoc.ts:32`); todas as URLs são constantes; sem `cdn.tailwindcss.com` (teste `preview-srcdoc.test.ts:33`) | closed |
| T-02-07 | Tampering | Texto do banner de erro | mitigate | Host renderiza `{runtimeError}` como texto React; iframe usa `textContent` (`preview-srcdoc.ts:61`) | closed |
| T-02-08 | Information Disclosure | Preview em branco no erro | mitigate | `fail()` mostra o erro no iframe e envia ao host `role="alert"`; alerta de export default ausente mantém o iframe montado. UAT teste 4 passou. | closed |
| T-02-09 | Elevation of Privilege | Execução de JSX quebrado no host | mitigate | Falhas capturadas no try/catch + `window.onerror` do iframe; só uma string atravessa para o host | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

**Teste de escape do srcdoc:** `JSON.stringify(...).replace(/</g, "\\u003c")` (`preview-srcdoc.ts:25`) — payload `</script><script>alert(1)</script><!--` não fecha a tag `<script>` nem abre comentário (verificado executando `buildPreviewSrcdoc`).

---

## Unregistered Flags (follow-up, não bloqueiam)

Superfícies novas do iframe srcdoc que não estão no registro planejado. Não foram aceitas formalmente; registre-as ao planejar a próxima fase:

1. **Spoofing do canal postMessage** — listener em `sandbox-preview.tsx:13-22` não verifica `event.source === iframe.contentWindow`; qualquer janela pode forjar/limpar o alerta (impacto baixo, texto puro). Sugestão: checar `event.source`.
2. **Scripts CDN sem SRI** — React, ReactDOM e Babel (`preview-srcdoc.ts:52-54`) fixados por versão mas sem `integrity`. Impacto limitado ao iframe opaco.
3. **Sem CSP no srcdoc** — código gerado pode fazer requisições de rede de saída (sem acesso a segredos do host).
4. **`unhandledrejection` não capturado** no iframe — erros assíncronos podem não aparecer no alerta.
5. **Código órfão** — `src/components/sandpack/sandpack-css.tsx`, `src/components/generator/preview-error.tsx` e possivelmente a dependência `@codesandbox/sandpack-react` não são mais usados.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|

No accepted risks.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-10-15 | 9 | 9 | 0 | gsd-security-auditor (working tree não commitada) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-10-15
