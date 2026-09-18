# Soft v8b FIX-NOW — verbatim SoT host extract (CEO 2026-09-17)

**Severity:** P1  
**Disposition:** FIX-NOW  
**Why:** PR #130 claimed SoT port but shipped a **simplified rebuild**. Mobile Soft still ≠ Soft v8b HTML. Missing Peek gas (`feGaussianBlur` + `stroke-dasharray`), gas plane `rotateX(90deg)`, blush, mouth clipPath, full face SVG filters.

## Goal

Replace `assets/brand/soft-v8b-host.html` + `softV8bHostHtml.ts` with a **verbatim extract** from `notes/company/working-k-avatar-soft-v8b.html` (one working `.av` avatar + required CSS). Do **not** reinvent gas/face.

## Binding approach

1. Parse SoT HTML; keep CSS for scene/av/idle-png/breathe/face/look/lids/mouth/gimbal/ring-spin/gas-svg/billboard/wobble/yaw-rev/blink/glance (+ reduced-motion).
2. Keep **one** avatar markup block (prefer `.is-on` / working card structure from SoT) including **exact** gas-svg with feGaussianBlur layers and face SVG (blush, glasses, pupils, mouth clipPath).
3. Strip demo chrome (cards, buttons, lede, math). Size via `--s`. Toggle working with `.is-on` / `.av.is-on` as SoT.
4. SoftMark.web + SoftMark native WebView keep loading this host — fix host content, not another bead SoftMark.
5. PR only; no merge until Chuck verifies iPhone Soft ≈ Soft v8b HTML.

## Acceptance

- Host contains: `feGaussianBlur`, `stroke-dasharray`, `rotateX(90deg)` on gas, blush, clipPath (grep gate).
- Side-by-side iPhone Soft ≈ Soft v8b HTML preview.
- Web still no className on RN View; no Animated.loop rotate hang.

## Non-goals

- Do not “simplify” gas into radialGradient.
- Do not reopen Soft PNG scale cards.
