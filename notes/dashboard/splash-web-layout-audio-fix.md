# Web splash fix: US-WEB-1 + US-WEB-2 + US-WEB-3 (CEO 2026-08-30)

QA report: `notes/dashboard/qa-web-splash/report.md`

## Ship these three user stories in one pass

### US-WEB-1 — Center the splash auth column on web (P0)
**Bug:** Sign in / fields sit on the **left**.  
**Cause:** `formBlock` / `ctaWrap` / `hintWrap` use `alignSelf: 'stretch'` + `maxWidth: 360` under a centered footer — on RN Web the capped strip is start-aligned.  
**Fix:** Horizontally **center** the auth column (e.g. `alignSelf: 'center'` with `width: '100%'` + `maxWidth: 360`, or footer `alignItems: 'center'` without stretch override). CTA, fields, and office footer share one centered column. Keep vertical stable position when fields reveal (T39).

### US-WEB-2 — Full-viewport cover for video + still on web (P0)
**Bug:** Video doesn’t scale to the browser window; black gutters / wrong size.  
**Fix:** Full-bleed **cover** for still and video inside root:
- Prefer `StyleSheet.absoluteFillObject` with `width/height: '100%'` of root (flex 1), not only a one-shot `useWindowDimensions` box that can lag or mismatch the layout viewport.
- On web especially, ensure root fills the window (`flex: 1`, minHeight 100% / 100vh if needed for web).
- `resizeMode: cover` (Image + Video).
- Preserve crossfade architecture: CEO JPG always under; video opacity 1→0 then unmount; never hold black video frame.
- Resize must keep cover.

### US-WEB-3 — Web splash audio can play (P1)
**Bug:** No audio on web.  
**Cause:** Autoplay policy + muted fallback; tap prefers **skip** over unmute.  
**Fix:**
- Still attempt unmuted autoplay once.
- If muted fallback: keep video playing muted; **first tap on video** should **unmute and continue** (not skip) when `awaitingGesture` / muted-for-autoplay.
- **Skip** remains available via a distinct control OR long-press/double-tap/second tap policy — CEO still wants skip, but sound must not be impossible. Preferred UX:
  - While muted-for-policy: first tap = unmute (show brief “Sound on” optional).
  - After unmuted (or on native): tap = skip to still + CTA + form as today.
  - Or: small “Skip” text button once CTA would show / always corner skip — simplest clean split: **corner Skip** + body tap unmutes when muted.
- Pick the cleanest split that satisfies: audio reachable on web + skip still works.
- Native audio path stays working (`playsInSilentModeIOS` etc.).

## Keep
- CEO JPG stills (`kelyra_splash_still_*.jpg`)
- Crossfade at ~0.72 ratio
- Unified auth, neon button, office footer with form
- Mobile portrait lock pre-auth (T40) — do not regress
- No second sign-in screen

## Tests
- Update splashLanding tests for center alignment (alignSelf center / no left stretch trap), full-bleed styles, web unmute vs skip behavior structure.
- typecheck green.

## Acceptance
1. Web desktop: centered Sign in column.
2. Web: video/still cover the viewport; resize OK.
3. Web: user can hear splash audio after policy-friendly gesture without being forced to skip-only.
4. Skip still works.
5. 0 P0/P1 from loop.
