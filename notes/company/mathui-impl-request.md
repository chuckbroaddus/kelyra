# MATHUI-IMPL — prose + inline math + lists (CEO GATE send 2026-09-04)

CEO Chuck completed MATHUI-GATE. SuperGrok daily 0%; grok-bot remaining_daily ~0.5% — **CEO override** if ARM DEFER.

Paper:
- notes/company/mathui-research.md
- notes/company/mathui-spec.md
- notes/company/mathui-architecture.md
- notes/company/mathui-security.md
- notes/company/mathui-acceptance.md

Epic t_a72b474b stays parked (do not parent).

## Bug
MathText.web is RN View flexDirection row wrap of Text + KaTeX div → inline math looks superscripted; "1. 2. 3." is not a real list.

## Must
Keep mathTextCore tokenize + KaTeX XSS options (trust false, throwOnError false, maxSize 20).
Rewrite layout:
- Paragraphs: one inline flow; KaTeX spans inside the sentence (web: p/span, not flex siblings).
- Display $$ / \\[ \\] : block, overflow-x auto.
- Lists: ol/ul hanging indent (web); native fixed-width marker column + wrapping body.
- Same MathText API; wire already at Ask, Explain, Help, notes.
- Tests L-01…L-06 + LATEX S1-01…07 still pass.
- No SQL. No MathJax. No ask_user_question. Student G0 unchanged.

## Acceptance
Inline math on baseline; list numbers in one column; XSS P0; PR URL.
