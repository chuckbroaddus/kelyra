# LATEX-Q1: Acceptance — GAUTH LaTeX display (not a Build send)

**Date:** 2026-09-04  
**Card:** `t_5ef566fd`  
**Depends on:** S1  
**Status:** Plan only. Implement remains `t_921408e0` after GATE `t_f94b0722`.

---

## 0. Good later

A future loop passes only if P0 rows have evidence (unit + one web screenshot or DOM assert). Developers do not self-certify. GATE still requires CEO yes.

## 1. P0 matrix

| ID | Check | Sev |
|---|---|---|
| D-01 | `$\\frac{1}{2}$` renders as fraction on **web** Explain | P0 |
| D-02 | Same on **native** (WebView helper) or documented native fallback = source, not crash | P0 |
| D-03 | `$$...$$` display math; unmatched `$` shows source | P0 |
| D-04 | Ask + Help + parent Explain use the same `MathText` | P0 |
| X-01 | Whole-blob HTML from model not mounted (S1-01) | P0 |
| X-02 | `trust: false`; htmlClass/includegraphics payload inert (S1-02/07) | P0 |
| X-03 | Parse error → Text source, no throw in composer/Explain (S1-04) | P0 |
| H-01 | Student G0 refuse unchanged | P0 |
| H-02 | parent_of / class_teacher_of unchanged | P0 |
| T-01 | Foreground from theme; no new IconName | P1 |

## 2. Non-acceptance

MathJax, CAS, Snap & Solve, LLM grades, blank hole on bad TeX, SchoolMarm package import, SQL.

## 3. Evidence later

`mathText.test.ts` for split/XSS strings; optional web smoke of ExplainDraftCard. No JWT needed for render unit tests.

## 4. GATE

`t_f94b0722` then IMPL `t_921408e0`. This Q1 is **not** a send.
