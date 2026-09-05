# MATHUI-S1: Security — prose renderer

**Date:** 2026-09-04  
**Status:** Review only.

Layout must **not** regress LATEX-S1-01…08.

| ID | Rule |
|---|---|
| M-01 | Still never `dangerouslySetInnerHTML` on the whole Ask/Explain blob |
| M-02 | List/paragraph HTML is **our** tags (`p`,`ol`,`li`,`span`) + KaTeX output of math spans only |
| M-03 | Model `1. <script>` is text, not HTML |
| M-04 | `trust: false`, maxSize/maxExpand unchanged |
| M-05 | Native WebView (if one-per-bubble): no navigation, no model-injected JS |
| M-06 | Do not log full bubble HTML |

Hats/refuse walls unchanged.
