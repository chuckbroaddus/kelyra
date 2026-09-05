# MATHUI-R1: Research — prose + inline math + lists in Ask

**Date:** 2026-09-04  
**Author:** chief-of-staff (paper trail; no specialist dispatch)  
**Card:** MATHUI-R1  
**Status:** Research only — **no app code**.

---

## 0. Live bug (CEO)

In Ask, mixed sentences + LaTeX are **not on one baseline** (equations sit like superscripts). Numbered lists wrap oddly; enumeration numbers are **not in one vertical column**. Worse in block/display. Looks like junk vs ChatGPT/Claude.

## 1. What Kelyra does today

`MathText.web.tsx` tokenizes `$` / `$$` then renders **siblings** in a RN `View` with `flexDirection: 'row'`, `flexWrap: 'wrap'`, `alignItems: 'baseline'`. Text is RN `Text`; math is a DOM `div` with KaTeX HTML.

That is **not** a paragraph. On `react-native-web`, `Text` is often a `div`. KaTeX `.katex` is `inline-block` with its own metrics. Flex items then sit on a flex baseline, not a CSS inline line-box — fractions/`\\sum` look **raised**. Newlines in model text (`1. foo\n2. bar`) are not a real `ol`; wrap is just flex-wrap of whole “1. …” chunks, so numbers don’t hang.

Native `MathText.tsx` WebView is a similar trap if each span is a separate WebView.

XSS law from LATEX-S1 still holds: never `dangerouslySetInnerHTML` the **whole** blob.

## 2. How serious chat UIs do it

Industry pattern (ChatGPT, Notion, Khan, markdown+KaTeX editors):

1. **Markdown (or a tiny subset)** → HTML/AST: paragraphs, `ol`/`ul`/`li`, code, **then** math.
2. **Inline math** (`$...$`) stays **inside** the paragraph as `<span class="katex">` with `vertical-align: baseline` / KaTeX default inline. Surrounding words are the same `p` text nodes, not flex siblings.
3. **Display math** (`$$...$$`) is a **block** between paragraphs (`display:block`, centered or left, `overflow-x: auto`). Never inline in the sentence.
4. **Lists:** real `ol` with `list-style-position: outside` (or padding-left + hanging indent) so numbers share one column; `li` body wraps independently. Nested lists allowed. Math inside `li` is still inline KaTeX.
5. One **document flow**, not a horizontal wrap of mixed Views.

KaTeX docs: inline vs display is the product distinction. Inline must live in the line; display must not.

Cited: katex.org/docs/options (inline line breaks after relations); unmarkdown.com/blog/katex-math-markdown (inline vs display); edtr.md KaTeX markdown 2026.

## 3. Recommendation

Replace the flex-wrap `MathText` **layout** (keep tokenize + KaTeX + XSS options) with a **prose renderer**:

1. Split into blocks (blank lines / `$$` display / numbered or bullet lines).
2. Paragraphs: one inline HTML/native text run with KaTeX **spans** inside, not flex children.
3. Lists: `ol`/`ul` (web) or equivalent RN rows with a **fixed-width marker column** + wrapping body.
4. Display math: full-width block below the paragraph.

Web-first (Ask is web-dense); native must not crash — same block model via Text nesting or one WebView **document**, not N WebViews.

Do **not** add MathJax. Do **not** dump unsanitized markdown HTML (XSS). Markdown subset only: paragraphs, lists, inline/display math, maybe `**bold**` later.

## 4. Not now

Full GFM, tables, mermaid, live TeX, changing GAUTH hats.

## 5. Surfaces to share the helper

Ask bubbles, ExplainDraftCard, Practice Help, parent Explain, teacher notes — **one** renderer everywhere GAUTH text shows.
