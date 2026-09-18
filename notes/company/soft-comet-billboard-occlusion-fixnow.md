# Soft FIX-NOW — comet ball + front/behind K (iPhone)

**Severity:** P1  
**Disposition:** FIX-NOW  
**Hermes:** `t_188517f4`  
**Why:** After Soft v8b verbatim host (#131), iPhone Soft comet head reads as a flat paper plate; comet never passes behind the K.

## Root cause

1. SoT ball is a flat disc + radial gradient kept camera-facing via CSS `.billboard` counter-`rotateY` under `preserve-3d`. **WKWebView flattens** that stack → edge-on disc (“paper”).
2. SoftMark native `overflow:'hidden'` + host `html,body{overflow:hidden}` clip gas/orbit overhang.
3. Letter/comet **DOM paint order** does not swap with orbit phase when 3D Z is flattened — comet always composites above the K.

## Binding approach (shipped)

- **Do not trust CSS billboard alone** on native WebView for the comet head.
- Drive comet head as **JS always-facing** 2D ellipse at **scene level** (outside `.ring-spin` / gimbal tilt), synced to SoT `yaw-rev` (2.45s, tilt 26°, cant 14°, r=0.41×letter). Face + Peek `gas-svg` stay SoT.
- **Front/behind K:** `data-soft-occlusion=phase-z` — toggle `.comet-front` / `.comet-behind` on `.scene` so gimbal+ball z-index goes behind letter on far arc and in front on near.
- SoftMark: `opaque={false}`; canvas `overflow:'visible'`; `ORBIT_PAD_FRAC` pads WebView so orbit is not cropped.
- Web Soft: still no RN `className`; no `Animated.loop` yaw.

## Acceptance

1. iPhone: comet head reads as a **ball** through full orbit.
2. iPhone: comet passes **behind** then **in front of** the K each revolution.
3. Tests lock `js-always` / `phase-z` / SoftMark opaque+overflow contract.
4. PR only — no merge until Chuck verifies on device.

## Non-goals

- Do not reinvent face/gas as bead SoftMark.
- Do not reopen Soft PNG scale cards.
