# MATHUI-A1: Architecture — prose renderer

**Date:** 2026-09-04  
**Status:** Architecture only — **no SQL**.

## Law

Keep `mathTextCore.ts` (split + KaTeX options). Change **layout only**. One helper used everywhere MathText is used today.

## Layout

1. `splitProseBlocks(text)` → paragraph | list | display-math.
2. Paragraph: **one** inline container. Web: `span`/`p` with text nodes + KaTeX `span.katex` (`display: inline`). Not RN `View` row-wrap of `Text` + `div`.
3. List: web `ol`/`ul`/`li` with hanging indent; native: marker `Text` in a fixed width + body `View`/`Text` wrap. Recurse MathText-inline inside items.
4. Display: existing KaTeX `displayMode: true` in a block `div`/`View`, `overflowX: auto`.
5. Native: prefer one document WebView per **bubble** if inline HTML is required; never one WebView per `$` span.

## Files

`mathTextCore.ts` (add block split), `MathText.web.tsx` (rewrite wrap), `MathText.tsx` (native), tests for list split + inline not wrapping as flex items. Call sites already import MathText — keep the API `children: string`.

## YAGNI

No new markdown library unless remark is needed for lists only — a small line-based list parser is enough for v1 (`^\d+\. `, `^[-*] `).
