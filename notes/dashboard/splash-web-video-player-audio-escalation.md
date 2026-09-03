# ESCALATION: Web splash video scale/center + repeatable audio (CEO 2026-08-30)

## CEO dogfood (non-fullscreen browser window)
1. **Animation** is NOT centered and does NOT scale to the window. Still JPG + Sign in **are** centered — **only the video animation is wrong**.
2. **Audio:** heard on **first** page load; **second and later** loads play silent (no audio).

## QA root cause (escalated)

### Video layout (web)
`expo-av` web (`ExponentVideo.web.tsx`) renders an HTML `<video>` with:
```js
customStyle = { position: undefined, objectFit: resizeMode, overflow: 'hidden' }
```
That **clears `position: absolute`** from the video style after our full-bleed styles. The element then sizes like a raw media file (intrinsic 1920×1080 / 1080×1920) instead of covering the RN container — looks unscaled and off-center in a smaller browser window. Image still uses RN Image cover correctly → CEO sees still OK, video not.

`ResizeMode.COVER` may also not map cleanly to CSS `object-fit: cover` depending on enum value.

### Audio (web)
Browsers allow unmuted autoplay inconsistently. First visit may succeed; later visits are blocked. Code falls back to muted play + `awaitingGesture`, but if the user doesn’t tap (or state is wrong), they hear nothing. Module `splashSessionCompleted` also skips full replay within SPA session; full reload still needs a **repeatable** muted-start + explicit unmute path every time.

## Required architecture (web-first, escalate past expo-av quirks)

### A. Web splash video = real HTML5 player (recommended)
Add platform split:
- **`SplashVideo.web.tsx`** (or inline Platform.OS === 'web'): `createElement('video')` or RN-web video with **explicit CSS**:
  - `position: 'absolute'`, `top/left/right/bottom: 0` (or inset 0)
  - `width: '100%'`, `height: '100%'`
  - **`objectFit: 'cover'`**
  - `objectPosition: 'center'`
  - `playsInline`, no controls
  - Wire src from same bundled MP4 assets (resolve URI for web)
  - `onTimeUpdate` / `ended` to drive crossfade at 0.72 ratio (same as today)
  - mute/volume/play/pause API used by splash
- **Native:** keep expo-av Video (or expo-video) with existing cover behavior.

Do **not** rely on expo-av web `position: undefined` path for splash.

### B. Scale/center container
- Video wrapper remains absoluteFill of root.
- Root fills viewport on web (`flex:1`, width/height 100%, minHeight 100vh if needed).
- Animation must look correct in a **non-fullscreen** resized window (e.g. 900×700 and 1280×800).

### C. Audio every visit (web)
1. On web: **always start muted** (predictable), autoplay muted, show clear affordance **“Tap for sound”** (or equivalent) until unmuted.
2. First body tap while muted → unmute + volume 1 + continue playback (do not skip).
3. **Skip** stays a separate control.
4. On full page reload, same muted-start + tap-for-sound every time (no “lucky first load only”).
5. Native: keep playsInSilentModeIOS / attempt unmuted as appropriate.
6. If `splashSessionCompleted` prevents replay on client nav back to splash, that’s OK; **reload** must still get animation+sound path above.

### D. Keep
- CEO JPG still under video; crossfade off video; unified auth; centered CTA column; mobile portrait lock; no black end frame.

## Tests
- Web player uses objectFit cover + absolute fill (structural / web file exists).
- Web starts muted + tap unmutes; Skip separate.
- typecheck green.

## Acceptance
1. Non-fullscreen web window: splash **animation** centered and **cover-scaled** like the still.
2. Reload page 3×: each time can get sound via tap-for-sound if autoplay muted; first load not a one-off.
3. Still + Sign in remain centered.
4. 0 P0/P1.

## Constraints
- Class app only; no commit/push.
