# Web splash / login QA scrub (2026-08-30)

**Target:** http://localhost:8081 signed-out `SplashLanding`  
**Platform:** Web (desktop browser)  
**Scope:** CEO-reported issues — alignment, video scale, Sign in position, audio  
**Also:** T40 mobile portrait lock landed (native only)

## Executive summary

| Severity | Count |
|----------|------:|
| P0/P1 (web login UX broken) | 4 |
| P2 | 2 |
| P3 | 1 |

Web pre-auth is not shippable as-is. Four user stories below.

---

## Findings (evidence from code + live surface)

### F1 — Sign in / form stack left-aligned (not centered) — **High / Visual**
**Evidence:** `footer` uses `alignItems: 'center'`, but `formBlock`, `ctaWrap`, and `hintWrap` set `alignSelf: 'stretch'` with `width: '100%'` and `maxWidth: 360`. On RN Web, a stretched child capped by `maxWidth` is typically **start-aligned (left)**, not centered. Matches CEO: “Sign in button is off to the left.”

**Expected:** Centered column ≤360px on all web widths.  
**Actual:** CTA/fields hug the left.

### F2 — Video / still do not reliably fill the browser window — **High / Visual**
**Evidence:** Media uses `mediaBox = { width, height }` from `useWindowDimensions()` plus `position: 'absolute', top: 0, left: 0`. On web, window dimensions can lag, exclude chrome, or disagree with the full viewport; `expo-av` Video often ignores partial style sizing and does not behave like `object-fit: cover` CSS. Still Image may letterbox or sit at wrong size while root is black.

**Expected:** Logo media covers the full visible viewport (cover), responsive on resize.  
**Actual:** Video doesn’t scale with the window (CEO).

### F3 — No audio on web — **High / Functional**
**Evidence:** Browsers block unmuted autoplay. Code path sets `awaitingGesture` and `isMuted={awaitingGesture}` then plays muted. Unmute only via `unlockAudioIfNeeded` after gesture — but mid-animation **tap prefers skip** (`skipSplash`) over audio unlock, so users who tap to “enable sound” instead skip the animation and never hear it. Natural play without tap stays muted for the whole clip.

**Expected:** Audible splash when policy allows; clear path to enable sound without destroying the experience.  
**Actual:** No audio (CEO).

### F4 — Overall alignment / layout “all off” on web — **High / UX**
**Composite of F1–F2** plus overlay footer (`justifyContent: 'flex-end'`) over full-bleed black root: when media doesn’t cover viewport, black bars + left column look broken. Safe-area insets on web are often 0; padding may not match design.

### F5 — expo-av deprecated on web/native — **P2 / Tech debt**
Console WARN to migrate to `expo-video` / `expo-audio`. May also improve web media sizing/audio APIs.

### F6 — Web not covered by mobile portrait lock — **P3 / By design**
T40 locks portrait on native phones only. Web landscape remains free (correct for now).

### F7 — Live smoke — **Partial**
Preview at `/` showed Sign in control present (post-complete or skip path). Full timed video scale/audio not instrumented in headless without Chrome remote-debug consent.

---

## User stories to fix (recommended backlog order)

### US-WEB-1 — Center the splash auth column on web (P0)
**As a** visitor on desktop web  
**I want** the Sign in button and credential fields centered in the viewport  
**So that** the login UI matches the brand splash and doesn’t look broken.

**Acceptance:**
- Footer column (fields + Sign in + office copy) is horizontally centered at all viewport widths ≥360px.
- `alignSelf: 'center'` (or equivalent) for form/cta/hint; no left-pinned maxWidth strip.
- Visual check at 1280×800 and 390×844 web.

### US-WEB-2 — Full-viewport cover for splash video + still on web (P0)
**As a** visitor on desktop web  
**I want** the splash video and hold still to cover the entire browser content area  
**So that** the logo isn’t tiny, cropped wrong, or floating on black empty space.

**Acceptance:**
- Still and video use true full-bleed cover (`absoluteFill` + width/height 100% of root, or measured root layout, not a stale window box alone).
- On window resize, media reflows without black gutters (except intentional letterboxing if cover can’t apply — prefer cover).
- Crossfade architecture preserved (JPG under, video opacity out).

### US-WEB-3 — Web splash audio that can actually play (P1)
**As a** visitor on web  
**I want** to hear the splash soundtrack when the browser allows  
**So that** the brand moment matches mobile.

**Acceptance:**
- Attempt unmuted autoplay once; if blocked, keep picture playing.
- First user gesture that is **not** an intentional skip should unmute (e.g. dedicated “tap for sound” or unmute on any non-skip chrome).
- Skip control remains available but does not have to be the only gesture target.
- Document autoplay policy limits in UI only if still blocked after gesture.

### US-WEB-4 — Web layout QA pass at two breakpoints (P1)
**As a** product owner  
**I want** splash login verified at desktop and mobile-web widths  
**So that** alignment regressions don’t ship.

**Acceptance:**
- Screenshot checklist 1280 and 390 after US-WEB-1/2.
- Button remains vertically stable when fields reveal (existing T39 intent) **and** stays centered.

### US-WEB-5 — (Optional) Migrate splash media to expo-video + expo-audio (P2)
**As a** developer  
**I want** splash off deprecated expo-av  
**So that** web media behavior and future SDK 54 stay supported.

---

## Mobile note (T40)
Portrait lock for pre-auth on native phones **landed** (`expo-screen-orientation`, unlock after sign-in). Does not fix web.

## Recommended next action
Ship **US-WEB-1 + US-WEB-2 + US-WEB-3** in one focused `kelyra-qa-loop` (web splash layout + audio). Then CEO dogfood on desktop Chrome.


## Escalation 2026-08-30 (CEO dogfood round 2)

- Animation not scaled/centered in non-fullscreen window; still+CTA OK.
- Audio first load only.
- RC: expo-av web sets position:undefined on <video>; object-fit unreliable.
- RC audio: unmuted autoplay flaky; need muted-start + tap-for-sound every visit.
- Stories: US-WEB-6 HTML5 cover player; US-WEB-7 repeatable web audio.
