# MATHUI-P1: Spec — Ask/GAUTH prose + math + lists

**Date:** 2026-09-04  
**Status:** Spec only — no app code.

## Job

Ask (and every GAUTH text surface) must read like a serious AI chat: **sentences and inline math on one baseline**; **numbered lists with a straight number column** and wrapping bodies; display math on its own block.

## Must

- Inline `$...$` / `\(...\)` sit in the sentence (not superscripted, not a new flex row).
- Display `$$...$$` / `\[...\]` is a block; may scroll horizontally; not mixed into the sentence line.
- Numbered and bullet lists: markers aligned; body wraps; math inside items still inline.
- Same helper on Ask, Explain, Help, teacher notes, parent Explain.
- XSS: LATEX-S1 still — tokenize math; never innerHTML the whole model blob.
- Fallback: bad TeX → source text. No blank holes.
- Theme tokens. No new IconName. Hats unchanged.

## Non-goals

MathJax, full GFM/tables, CAS, Snap & Solve, SQL.

## Acceptance (product)

CEO can read a parent Ask answer with “let \(x=2+2\)” on one line and a 1./2./3. derivation without junk wrap.
