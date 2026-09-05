# LATEX-S1: Security — GAUTH LaTeX / XSS

**Date:** 2026-09-04  
**Card:** `t_29f3d0a6`  
**Depends on:** A1  
**Status:** Review only — no code.

---

## 0. Threat

Explain/Ask/Help strings are **model output** (and teacher edits). Mounting them as HTML is XSS. KaTeX `\includegraphics` / `\htmlClass` / `\href{javascript:...}` are the known unsafe commands. Error HTML that echoes TeX can also XSS if not escaped.

Does **not** change GAUTH cheat walls (`parent_of`, `class_teacher_of`, student refuse). Display-only.

## 1. Must-fix (P0) — LATEX-S1-01…08

| ID | Rule |
|---|---|
| S1-01 | Never `dangerouslySetInnerHTML` (or WebView `html:`) on the **whole** model blob |
| S1-02 | KaTeX `trust: false` always. No `trust: true` flag from client |
| S1-03 | Tokenize first; KaTeX only math spans |
| S1-04 | `throwOnError: false`; parse failures render as **Text**, not KaTeX error HTML |
| S1-05 | `maxSize` ≤ 20em; `maxExpand` ≤ 1000 |
| S1-06 | Native WebView: no `file:` / no navigation / JS only for KaTeX layout if required; no `injectedJavaScript` from model |
| S1-07 | No `\\htmlClass` / `\\href` / `\\url` / `\\includegraphics` effective (trust false) — test a payload |
| S1-08 | Do not log full student page + TeX in Edge logs |

P1: shared `macros` object / `globalGroup` (macro persistence across students). Keep per-call empty macros.

## 2. Future loop tests

- `<script>alert(1)</script>` in Explain body stays text
- `$\\htmlClass{x}{y}$` does not set a class
- Unmatched `$` shows source
- Student G0 refuse still has no vision

## 3. Non-goals

CSP on supabase.co lesson-host. FERPA of math content (already capture-scoped). TTS.
