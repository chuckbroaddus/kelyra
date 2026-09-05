# LATEX-A1: Architecture — GAUTH MathText helper

**Date:** 2026-09-04  
**Card:** `t_a20fed55`  
**Depends on:** P1 spec + R1 research  
**Status:** Architecture only — **no SQL**, no qa-loop.

---

## 0. Law

One helper, all GAUTH text surfaces. KaTeX only. Model HTML never mounted. No new tables. No `EXPO_PUBLIC_*`.

## 1. Module

`src/components/ui/MathText.tsx` (+ `MathText.web.tsx` if split is cleaner).

Pipeline:

1. `splitMathSegments(text)` → `{kind:'text'|'inline'|'display', raw}[]`
2. Text segments → RN `Text`
3. Math segments → `katex.renderToString(tex, OPTIONS)` 
4. Web: `div` + KaTeX CSS (`dangerouslySetInnerHTML` **only** on KaTeX output of that span)
5. Native: `WebView` (`react-native-webview`, already in app) with KaTeX CSS + HTML from step 3; height from content; `originWhitelist` none/https none — **no network**. Offline CSS/JS bundled.
6. On throw / empty: `Text` of `raw`

**OPTIONS (locked):** `trust: false`, `throwOnError: false`, `maxSize: 20`, `maxExpand: 1000`, `output: 'htmlAndMathml'` (a11y). `displayMode` from segment kind. `macros` empty object **per call** (do not share globalGroup).

## 2. Call sites (implement later)

- `ExplainDraftCard`
- Ask bubble body
- Practice Help panel
- Parent Explain view
- Teacher note display if it shows Explain copy

Do not add Ask tools. Do not change Edge prompts except optionally “you may use LaTeX `$...$`” (P2).

## 3. YAGNI

No `gauth_math` table. No MathJax. No native C++ math view. No SchoolMarm import.

## 4. Files/areas for the future loop

`src/components/ui/MathText.tsx`, tests `mathText.test.ts` (split + fallback, no DOM XSS strings with `<script>` surviving tokenize), `package.json` add `katex`, KaTeX CSS asset, existing WebView.

## 5. SQL

None.
