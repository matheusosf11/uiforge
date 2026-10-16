# Phase 4: Quality Gate & Deploy - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-16
**Phase:** 04-quality-gate-deploy
**Areas discussed:** E2E sem gastar o Gemini, GitHub + Vercel, Proteger a demo pública, README de portfólio, CI, WR-08, Streaming na Vercel, Proteção da branch, Licença/metadados, Mock cenário, Preview env, README sync, Node

---

## E2E sem gastar o Gemini

| Option | Description | Selected |
|--------|-------------|----------|
| Modelo falso | MockLanguageModel via env de teste | ✓ |
| Interceptar no navegador | page.route com stream fake | |
| Gemini real | Secret no CI, não determinístico | |

**Escopo:** caminho feliz + erro/Tentar de novo + Copiar/Baixar + mobile (abas) — usuário marcou todos (incl. "só caminho feliz"); interpretado como todos os cenários.
**Browsers:** Só Chromium ✓ (vs. Chromium + Firefox + WebKit).
**Cenário do mock:** palavra-chave `__e2e_error__` no prompt ✓ (vs. header de teste, você decide).

## GitHub + Vercel

| Option | Description | Selected |
|--------|-------------|----------|
| Público, branch main | Renomeia master → main | ✓ |
| Público, mantém master | | |
| Eu crio manualmente | | |

**Deploy:** Integração Git da Vercel ✓ (vs. CLI via Actions, CLI manual).
**Domínio:** *.vercel.app ✓ (vs. domínio próprio).
**Preview env:** só Production tem a chave ✓ (vs. Production + Preview).

## Proteger a demo pública

| Option | Description | Selected |
|--------|-------------|----------|
| Aceitar o risco | Documentar, PLAT-01 v2 | |
| Kill switch por env | 503 "demo pausada" | |
| Rate limit em memória | Por IP, best-effort | ✓ |

**Limite:** 5/min por IP ✓ (vs. 10/min + 50/dia, você decide).
**UI ao bloquear:** reusa alerta 429 ✓ (vs. mensagem distinta).
**Chave prod:** separada da de dev ✓.
**Notes:** Claude avisou que o limite é por instância serverless (aproximado) e antecipa parte do PLAT-01.

## README de portfólio

**Idioma:** Bilíngue ✓ (vs. inglês, português). **Sync:** EN canônico, PT tradução fiel ✓.
**Mídia:** GIF do fluxo + screenshot ✓. **Profundidade:** entrevista-ready ✓.

## CI

**Gatilho:** push em qualquer branch + PR ✓. **Jobs:** check + e2e em paralelo ✓. **Alvo e2e:** build de produção ✓. **Cobertura:** relatório sem gate ✓. **Node:** 22 LTS ✓.

## Extras

**WR-08:** forçar preview sempre claro ✓ (vs. seguir prefers-color-scheme, deixar como está).
**Streaming:** Node + maxDuration 60 ✓ (já presente no código).
**Branch:** sem proteção ✓.
**Metadados:** MIT + About do GitHub + Open Graph ✓.

## Claude's Discretion

- API exata do mock, componente fixo, estrutura do rate limit, nomes de env, layout do workflow/Playwright, forma do diagrama, limpeza de restos do Sandpack.

## Deferred Ideas

- Rate limit distribuído (PLAT-01, v2); e2e multi-browser; domínio próprio; branch protection.
