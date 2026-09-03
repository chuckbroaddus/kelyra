# Fix web splash audio — tap never unmutes (CEO 2026-08-30)

## Bug
CEO cannot hear audio on web at all anymore (regression after HTML5 SplashVideo.web).

## Root causes to fix
1. **Pointer events:** `SplashVideo.web.tsx` renders a real HTML `<video>` inside a RN `Pressable`. The video element **steals clicks**; `onVideoPress` / `unlockAudioIfNeeded` often never runs → muted forever.
2. **Initial mute state:** `awaitingGesture` starts `false`, so first paint may be `isMuted={false}` while web path intends muted autoplay — inconsistent with browser policy.
3. **Unmute must stay in the user-gesture stack:** `setIsMutedAsync(false)` + `volume=1` + `play()` must run **synchronously from the click/tap handler**, not only from a delayed async that loses the gesture (some browsers require unmute+play in the same tick as the click).
4. Ensure HTML video has audio tracks (assets already AAC — keep).

## Required fix
### SplashVideo.web.tsx
- Set CSS **`pointerEvents: 'none'`** (and `pointer-events: 'none'`) on the `<video>` so parent Pressable receives taps.
- Also support an optional `onUserActivate` / click passthrough if needed.
- When `setIsMutedAsync(false)` is called, set `el.muted = false` immediately; when playAsync, call `el.play()` and surface rejection.
- Default web: `muted` attribute true until parent clears it.
- Keep object-fit cover + absolute fill.

### SplashLanding.tsx (web)
- Initialize `awaitingGesture` to **true on web** so first frame is muted + tap-for-sound.
- Web start path: muted autoplay only (already mostly there).
- **Tap for sound:** on video area press while `awaitingGesture`, call unmute+volume+play **inline in the press handler** (await is OK if started from the handler without intervening awaits that drop the gesture — avoid await enableSplashAudioMode before unmute on web unlock).
- Keep “Tap for sound” / Sound on hint visible until unmuted.
- Skip remains separate control.
- If splash already completed (`splashSessionCompleted`), that’s expected silent still — CEO issue is during animation.

### Tests
- Web video has pointer-events none.
- Web awaitingGesture defaults true / muted start.
- Unlock path calls setIsMutedAsync(false) from press handler.

## Acceptance
1. Web: splash plays (muted ok).
2. Click/tap video body → **audio heard** every reload.
3. Skip still works without requiring sound first.
4. Cover layout unchanged.
5. 0 P0/P1.
