# Dogfood QA Report

**Target:** Jacquee Ask (`http://localhost:8081/ask` web) vs Expo Go native (Chuck, portrait+landscape)  
**Date:** 2026-09-04  
**Scope:** GAUTH MathText — equations in Ask bubbles  
**Tester:** Hermes CoS (dogfood web + native code)

---

## Executive Summary

| Severity | Count |
|----------|-------|
| Critical | 1 |
| High | 0 |
| Medium | 0 |
| Low | 0 |
| **Total** | **1** |

**Overall:** Web Ask renders KaTeX (`X^n` → \(X^n\)). Native Expo Go still shows **no equations** (empty/off-screen blocks, no swipe). Root cause is native CSS **stripping all `@font-face`**, so KaTeX paints with missing `KaTeX_Main` / `KaTeX_Math` fonts → invisible glyphs.

---

## Issues

### Issue #1: Native Ask math is invisible (missing KaTeX fonts)

| Field | Value |
|-------|-------|
| **Severity** | Critical |
| **Category** | Visual / Functional |
| **URL** | Native Expo Go Ask; web `http://localhost:8081/ask` OK |

**Description:**  
PR #11 (`katexCssWithoutFontFace`) removed `@font-face` from the native WebView stylesheet because relative `fonts/KaTeX_*.woff2` URLs do not resolve under `about:blank`. KaTeX HTML still sets `font-family: KaTeX_Main, KaTeX_Math, …`. Those families never load → empty looking blocks. `scrollEnabled={false}` plus `overflow-x:hidden` on html/body also blocks panning.

**Steps to Reproduce:**
1. Sign in as Jacquee (teacher desk).
2. Open **Ask** on **phone** (portrait or landscape) with existing math thread (`X^n` / exponential).
3. Compare the same thread on **web**.

**Expected:** Inline/display math visible in the bubble, swipe if overflow.

**Actual:** Web shows typeset \(X^n\). Native: large empty slabs / no glyphs; cannot swipe inside the WebView.

**Screenshot (web — math present):**  
MEDIA:/Users/chuckbroaddus/projects/kelyra/notes/dashboard/mathui-native-qa/screenshots/ask-web-math-ok.png

**Console:** N/A on device. Code: `KATEX_MIN_CSS_NATIVE` in `katexMinCss.ts`; `MathText.tsx` `buildProseDocument` uses it.

**Fix direction:** Embed KaTeX woff2 as `data:` URLs in native CSS (offline, about:blank-safe), **or** force `.katex { font-family: Times, serif !important }` so glyphs paint without KaTeX faces. Keep XSS (no network font fetch). Width clamp + horizontal swipe stay.

---

## Testing notes

- Web Ask at localhost:8081: signed-in, math visible (evidence above).
- Native not driven from this Mac; Chuck’s device report + #11 font-face strip is the diagnosis.
- Not tested: parent Ask, Explain card on device.
