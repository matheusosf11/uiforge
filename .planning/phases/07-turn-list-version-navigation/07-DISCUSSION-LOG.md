# Phase 7: Turn List & Version Navigation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-18
**Phase:** 7-Turn List & Version Navigation
**Areas discussed:** Onde e como a lista aparece, Turnos com erro, Restaurar e versões futuras, Conteúdo de cada item e o aviso de base, Destaque/esmaecidas/anúncio, Lista vazia/status/preview/texto longo

---

| Area | Question | Options | Selected |
|------|----------|---------|----------|
| Layout | Posição desktop | Entre a barra e o campo / Recolhível "Histórico" / Faixa compacta v1 v2 v3 | Entre a barra e o campo |
| Layout | Mobile | Mesma lista recolhida / Igual ao desktop / Só a barra | Mesma lista, recolhida por padrão |
| Layout | Ordem | Mais antigo em cima / Mais recente em cima | Mais antigo em cima |
| Erros | Tentativa falha na lista | Só a tentativa atual / Fica gravada / Não aparece | Só a tentativa atual |
| Erros | Parar | Some sem rastro / Item "interrompido" | Some sem rastro |
| Erros | Em andamento | Item "gerando…" / Só o status | Item "gerando…" no fim |
| Restaurar | Clicar esmaecida | Restaura normalmente / Não clicáveis | Restaura normalmente |
| Restaurar | Desfazer | Versão anterior à atual / Desfaz a navegação | Versão anterior à atual |
| Restaurar | Confirmação | Instantâneo / Confirmar ao refinar com futuras | Instantâneo |
| Restaurar | Retry do turno com erro | Só no banner / No item | Só no banner |
| Conteúdo | Item | vN + instrução truncada + status / + horário / 2 linhas | vN + instrução truncada + status |
| Conteúdo | Aviso de base | Linha acima do campo / No botão / Ambos | Linha acima do campo |
| Conteúdo | Foco após restaurar | Fica no item / Vai para o campo | Fica no item |
| Conteúdo | Numeração após limite | Número fixo / Renumerar | Número fixo |
| Extra | Teclado | Tab em cada item / Setas (roving) | Tab em cada item |
| Extra | Altura | ~5 itens / ~3 / Cresce | ~5 itens e rola |
| Extra | Chips ao restaurar | Da versão restaurada / Mantém | Da versão restaurada |
| Extra | Destaque atual | Fundo + borda + "atual" / Só fundo | Fundo + borda + "atual" |
| Extra | Futuras | Opacidade + texto SR / Opacidade + riscado | Opacidade + texto SR |
| Extra | Anúncio | Unificar "Voltou para vN" / "Versão N restaurada" | Unificar |
| Extra | Mobile recolher | Lembra na sessão / Fecha após restaurar | Lembra na sessão |
| Extra | Lista vazia | Só depois da v1 / Já na primeira geração | Só depois da v1 |
| Extra | Status | Lucide neutros + erro destrutivo / Coloridos / Só texto | Lucide neutros + erro destrutivo |
| Extra | Preview ao restaurar | Troca direto / "Atualizando…" | Troca direto |
| Extra | Texto longo | 1 linha + title/aria / 2 linhas no mobile | 1 linha + title/aria |
| Extra | Mais pontos | Atalhos Alt+↑/↓ / Copiar instrução / Animações / Nada | Nada, pode escrever |

## Claude's Discretion

- RESTORE action shape, selectors, component split, classes, max-height, disclosure implementation, session-bar wording, test layout, optional e2e extension.

## Deferred Ideas

None (offered and declined: Alt+↑/↓ shortcuts, reusing a turn's instruction, list animations).
