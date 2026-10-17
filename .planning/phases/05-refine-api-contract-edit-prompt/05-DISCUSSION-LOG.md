# Phase 5: Refine API Contract & Edit Prompt - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-17
**Phase:** 5-Refine API Contract & Edit Prompt
**Areas discussed:** Fidelidade da edição, Limite de tamanho e erro, Cota e rate limit, Validação no servidor, Mock/mensagens/prompt, Casos extras

---

## Fidelidade da edição

| Option | Description | Selected |
|--------|-------------|----------|
| Só no pedido | Mudança mínima, preserva o resto | ✓ |
| Pedido + ajustes coerentes | Ajusta o entorno | |
| Você decide | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Manter nome e estrutura | Nome do export e organização estáveis | ✓ |
| Livre se melhorar | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Aproximar dentro das regras | Igual à geração v1.0 | ✓ |
| Devolver código inalterado | | |

## Limite de tamanho e erro

| Option | Description | Selected |
|--------|-------------|----------|
| 30.000 caracteres | | ✓ |
| 15.000 caracteres | | |
| 50.000 caracteres | | |

| Option | Description | Selected |
|--------|-------------|----------|
| 413 + mensagem pt-BR | Frase fixa em generate-error.ts | ✓ |
| 400 genérico | | |

## Cota e rate limit do refino

| Option | Description | Selected |
|--------|-------------|----------|
| Conta igual, 5/min por IP | Um balde | ✓ |
| Limite maior compartilhado | | |
| Baldes separados | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Teto generoso nos dois modos | maxOutputTokens alto | ✓ |
| Só no refino | | |
| Sem teto | | |

## Validação no servidor

| Option | Description | Selected |
|--------|-------------|----------|
| Só no cliente | Fase 6 valida antes de salvar | ✓ |
| Servidor também | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Não bloquear encolhimento | Prompt estrito + desfazer | ✓ |
| Bloquear abaixo de X% | | |
| Você decide | | |

## Mock, mensagens e prompt

| Option | Description | Selected |
|--------|-------------|----------|
| Componente fixo com marcador | "Refinado" / "EditedSeen" | ✓ |
| Ecoar código com mudança | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Genérica adaptada ao modo | Frase própria no refino | ✓ |
| Mesma frase do v1.0 | | |

| Option | Description | Selected |
|--------|-------------|----------|
| System de edição + tags no user | HARD RULES + adendo; <current_code>/<instruction> | ✓ |
| Você decide | | |

## Casos extras

| Option | Description | Selected |
|--------|-------------|----------|
| currentCode vazio → gerar | | ✓ |
| Rejeitar com 400 | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Checklist manual com prompts fixos | UAT da fase | ✓ |
| Script automático | | |
| Os dois | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Logar só números | modo, modelo, tokens | ✓ |
| Não logar | | |

**Final:** user offered optional extra topics (instruction limit in refine mode; v1.0 generate prompt tweaks) and chose to proceed without them.

## Claude's Discretion

- Wording of edit addendum and pt-BR phrases; exact maxOutputTokens; 413 body token; helper extraction; mock component content.

## Deferred Ideas

None.
