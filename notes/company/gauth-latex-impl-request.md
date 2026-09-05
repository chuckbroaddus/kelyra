# LATEX-IMPL — MathText KaTeX (CEO GATE send 2026-09-04)

CEO Chuck completed LATEX-GATE. Implement GAUTH LaTeX display. SuperGrok daily remaining 0% — **grok-bot** `kelyra-bot-build-loop`.

Paper (follow; do not invent a second engine):
- `notes/company/gauth-latex-research.md`
- `notes/company/gauth-latex-spec.md`
- `notes/company/gauth-latex-architecture.md`
- `notes/company/gauth-latex-security.md`
- `notes/company/gauth-latex-acceptance.md`

Epic `t_921408e0` stays parked (do not parent this worker). GATE `t_f94b0722`.

## Must

- Add `katex` to class-app. One `src/components/ui/MathText` helper.
- Split `$...$` `$$...$$` `\(...\)` `\[...\]`. KaTeX `renderToString` with `trust: false`, `throwOnError: false`, `maxSize: 20`, `maxExpand: 1000`. Empty macros per call. No `globalGroup`.
- Web: KaTeX HTML only on math spans. Native: existing `react-native-webview`, offline, no model HTML blob.
- Fallback: original source as Text. Never blank. Never `dangerouslySetInnerHTML` on whole Explain/Ask/Help body.
- Wire ExplainDraftCard, Ask bubbles, Practice Help panel, parent Explain if present.
- Tests: S1-01…07, unmatched `$`, `\\htmlClass` inert, G0 refuse unchanged.
- Theme from `useTheme()`. No new IconName. No SQL. No EXPO_PUBLIC_*.

## Out

MathJax, CAS, MathLive, SchoolMarm import, cheat-wall changes, grok-tts.

## Constraints

do not use grok-build; never launch Mac grok / Build loops  
no ask_user_question  
Preserve dirty tree. PR expected. Hermes owns merge.

## Acceptance

P0 D-01…X-03 from Q1. bot-build passed or escalated. PR URL in close summary.
