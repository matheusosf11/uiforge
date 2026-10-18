# Phase 8: Editable Code View - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.

**Date:** 2026-10-18
**Areas discussed:** Editor, Draft → version, Preview & invalid code, Signalling

| Area | Question | Options | Selected |
|------|----------|---------|----------|
| Editor | Library | react-simple-code-editor / Homemade / CodeMirror 6 | react-simple-code-editor |
| Editor | Tab | Tab indents, Esc frees Tab / Tab always leaves | Tab indents; Esc frees Tab |
| Editor | Line numbers | No / Yes | No |
| Editor | Mobile | Same editor in Código tab / Read-only on mobile | Same editor |
| Version | When the draft becomes a version | On refine or navigation / Only on refine / "Salvar versão" button | On refine or navigation |
| Version | Older version | Same rule as refine / Block | Same rule as refine |
| Version | No real change | Not a version / Any typing counts | Not a version |
| Version | Draft on older + click later | Confirm first / Block later items | Confirm first |
| Preview | Debounce | 500 ms / 800 ms | 500 ms |
| Preview | Invalid code | Existing error state / Keep last good + note | Existing error state |
| Preview | Refine broken draft | Allowed / Blocked | Allowed |
| Signalling | Indicator | Badge + "Descartar edições" / Badge only | Badge + "Descartar edições" |
| Signalling | List | Transient "Edição manual (rascunho)" / Nothing | Transient item |
| Signalling | Announcement | "Edição salva como vN" / None | "Edição salva como vN" |
| Signalling | Panel title | "Código" + "Editor de código" / Keep "Código gerado" | "Código" |

## Deferred Ideas
None.
