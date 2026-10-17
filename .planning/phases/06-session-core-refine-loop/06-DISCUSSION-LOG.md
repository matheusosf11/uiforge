# Phase 6: Session Core & Refine Loop - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-17
**Phase:** 6-Session Core & Refine Loop
**Areas discussed:** Virada Gerar → Refinar, Chips de sugestão, Desfazer e Novo componente, Feedback durante o refino, Extras

---

## Virada Gerar → Refinar

| Question | Options | Selected |
|----------|---------|----------|
| Formulário | Botão e placeholder mudam / Campo compacto estilo chat | Botão e placeholder mudam |
| Campo após envio | Limpa ao concluir com sucesso / Limpa ao enviar / Mantém sempre | Limpa ao concluir com sucesso |
| Galeria | Substituída pelos chips de refino / Galeria fica abaixo dos chips | Substituída pelos chips |

## Chips de sugestão

| Question | Options | Selected |
|----------|---------|----------|
| Origem | Lista fixa genérica (recomendado) / Gerados pelo modelo | **Gerados pelo modelo** (user overrode recommendation) |
| Clique | Preenche o campo / Envia direto | Preenche o campo |
| Quando | Automático após cada versão / Sob demanda | Automático |
| Cota | Balde separado e leve / Mesmo balde | Balde separado e leve |
| Falha | Cai para lista fixa / Esconde | Cai para lista fixa |
| Formato | 4 / 6 / 3 chips | 4 chips curtos pt-BR |
| Carregando | Esqueleto / Lista fixa e troca | Esqueleto |

## Desfazer e Novo componente

| Question | Options | Selected |
|----------|---------|----------|
| Posição | Barra da sessão no topo do prompt / Barra do preview / Ao lado do Refinar | Barra da sessão no topo |
| Atalho | Ctrl/⌘+Z fora de campos / Alt+Z | Ctrl/⌘+Z fora de campos |
| Confirmação | AlertDialog próprio / confirm() nativo | AlertDialog próprio |
| Reset e texto do campo | Mantém o texto / Limpa tudo | Mantém o texto |

## Feedback durante o refino

| Question | Options | Selected |
|----------|---------|----------|
| Painel de código | Código novo ao vivo / Código anterior até terminar | Código novo ao vivo |
| Mobile | Mantém aba atual / Vai para Código e volta | Mantém aba atual |
| Sucesso | Status "Pronto — vN" + aria-live / Destaque no preview | Status + aria-live |

## Claude's Discretion

- Reducer/hook layout, version ids, action names; fallback chip texts; suggest prompt and limits; useCompletion vs custom hook; badge/session bar styling.

## Deferred Ideas

None.
