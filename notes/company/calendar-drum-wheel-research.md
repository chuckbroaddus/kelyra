# Calendar Drum / Wheel Picker — Perf + Anti-Glitch Research (CAL-DRUM-R1)

**Date:** 2026-09-24  
**Author:** Chief of Staff / Grok Bot (Kelyra)  
**Status:** Ready for Chuck review  
**Revision:** R1  
**Cards:** `t_78363b5e`  
**Access date for all URLs below:** 2026-09-24 (America/Chicago)  
**Stack:** Expo + React Native (ios/android) + RN Web. Zero network for the picker.

**Related (do not rebuild):**  
- `notes/company/calendar-3d-wheel-spec.md` · `calendar-3d-wheel-intent.md` · `calendar-3d-wheel-pm-lock.md` · `calendar-3d-wheel-look-disposition.md`  
- Mockup: `notes/company/calendar-3d-wheel-mockups/index.html`  
- Live: `src/components/calendar/PeriodPager.tsx` · `PeriodLeaf.tsx` · `src/lib/calendar/periodWheel.ts` · `periodPager.ts`  
- Plan SoT: `notes/company/calendar-drum-wheel-plan.md`  
- Dated digest: `notes/research/2026-09-24-calendar-drum-wheel-report.md`  
- Playable prototype: `notes/research/calendar-drum-wheel-prototype.html`

**Constraints for this card:** Research + plan + offline HTML prototype only. No app code merge, no SQL, no Hermes AI staffing, no force-push.

**Missing prior docs (audited):** `notes/company/calendar-p6-drum-perf-eval.md` and `notes/company/calendar-p6-item2-research.md` do **not** exist on disk as of 2026-09-24. Perf notes live in `calendar-r3-perf-brief.md` (YearGrid) and inline code comments on SlotPool / ContentPolicy.

**CEO pain (2026-09-24):** ~9–11 cards live-rendered; center card text expands/changes on focus → glitchy/cheesy. Open to redesign. Example hypothesis (evaluate, **not** mandate): segment stitch (bg binder rings + gradient; top/middle/bottom labels by view) with pre-created segment assets.

**Stamp note:** Prior dual-stamp (PM `t_9cb5585d` + QAS `t_c28b495d`) locked **Set B hanging-ledger** as the period drum look. CEO now explicitly invites redesign for perf/feel. This research treats Set B as **departable** if fixed-geometry tiles win — but any ship look that leaves Set B requires a **restamp / written CEO override**, not silent drift. See look-disposition: dual stamp was binding until override.

---

## Executive summary

Live drum already has the right **motion skeleton** (SlotPool N=9, Reanimated worklets on native, pitch 78, spring snap, commit-on-rest). The cheese comes from **content policy mid-spin**:

1. **Nine live React trees** recompose every SlotPool rebound (`buildPeriodWindow` + `PeriodLeaf` remounts via `slotPoolKey(periodKey, slotIndex)`).  
2. **Center extras toggle** (`showCenterExtras`) mounts MonthHangingGrid (35 Text cells), expands week/day headers, and changes year font size — layout reflow on focus.  
3. **Silhouette path** swaps to `BlurOut` / `expo-blur` / CSS `filter: blur(6px)` for far tiles — heavy GPU/CPU during fling.  
4. **Web path** drives drag via React `setWebDragPx` every move → JS-thread layout each frame (native uses shared values; web does not).

**Verdict — lock architecture (A) Fixed-geometry recycled tiles + GPU transforms only during fling:**

- Recycle **7–9** slot hosts (prefer 7 on phone: center ±3).  
- Each slot = **precomposed tile** (View/Text or offscreen-rasterized bitmap) with **fixed box** 108×126 — never change text layout / line count / font size mid-spin.  
- Focus = **pre-drawn focus variant** or scale/opacity only — **never** mount MonthHangingGrid or expand captions until **after** snap rest (optional idle overlay).  
- Segment atlas stitch is a valid **P1 art pack** for binder rings/gradient chrome — not required for P0 anti-cheese.  
- Network budget: **0**. All labels from local date math already in `periodPager.ts`.

---

## A. Root-cause of current jank (cite code paths)

### A.1 SlotPool N=9 always mounted

`periodWheel.ts` exports `WHEEL_VISIBLE_SLOTS = 9` and `WHEEL_SLOT_OFFSETS = [-4…+4]`. `PeriodPager` maps every offset through `renderSlot` → `PeriodLeaf` (`PeriodPager.tsx` ~L800–890). Spec preferred **5** visible; live grew to **9** for ±4 fling-clear / silhouette policy.

CEO “9–11 cards” matches: 9 SlotPool leaves + chrome/PersonTabs perception.

### A.2 Mid-fling content rebound = React remount

`useAnimatedReaction` truncates `-drag/pitch` and `runOnJS(updateVisualShift)` (`PeriodPager.tsx` ~L493–505). Window rebuild:

```ts
buildPeriodWindow({
  kind,
  anchor: shiftPeriodAnchor(kind, anchor, absorbedShift + visualShift, dayCount),
  dayCount,
})
```

Keys: `slotPoolKey(tile.key, slotIndex)` = `` `${periodKey}:${slotIndex}` ``. When period keys slide, React remounts leaf trees mid-coast — text measure + style recalculation while transforms still animate.

### A.3 Center text expand / “cheese”

`PeriodLeaf.tsx`:

| Kind | Idle / fling | Center + `showCenterExtras` |
|---|---|---|
| Year | side `'YY` / smaller type | `yearTextCenter` fontSize **26** vs side **28** (still layout swap) |
| Month | header + empty `monthStub` | mounts **`MonthHangingGrid`** — 7 DOW + **35 day Text** cells |
| Week | one header line | **two** lines (`range` + year) + `WeekDayStrip` (7 bordered cells) |
| Day | short mon | **two** header lines + large numeral |

`showCenterExtras` is forced **false** on pan grant / fling start and **true** on `onSpringRest` (`PeriodPager.tsx` ~L562, L718, L487). That post-snap mount of hanging grid is exactly the “center expands when focus lands” cheese. During fling, `wheelContentModeFor` still keeps **full** mode for `|distanceFromOrigin| ≤ 4` — so up to **9 full ledgers** paint while spinning, then extras pop on rest.

### A.4 Silhouette / blur cost

Far tiles use `SilhouetteLeaf` + `BlurOut` (`expo-blur` BlurView intensity 48 native; CSS filter blur on web). Blur during fling is a known fill-rate tax and fights the “mechanical drum” read.

### A.5 Web vs native transform driver asymmetry

- Native: `NativeSlotMotion` + `useAnimatedStyle` worklets — good.  
- Web: `WebSlotMotion` + `webDragPx` React state updated every `onPanResponderMove` — **every frame re-renders 9 slots on JS**. `will-change: transform` helps paint but not React reconciliation. Web snap is `Promise.resolve().then(onSpringRest)` — **no inertial spring** on web (instant jump to target).

### A.6 What is *not* the primary bug

- Geometry curves in `periodWheel.ts` (scale/opacity/rotateY) are fine and match SoT formulas.  
- Soft `WHEEL_MAX_FLING_SLOTS = 48` / inertial coast math is intentional (supersedes older CAL-3DW-07 max-3).  
- Zero network already — no fetch on the drum.

---

## B. Industry patterns

| Pattern | How it stays smooth | Fit for Kelyra |
|---|---|---|
| **iOS UIPickerView** | Recycles row views via `viewForRow:reusing:`; only visible rows exist; selection indicator is chrome, not content reflow ([Apple docs](https://developer.apple.com/documentation/uikit/uipickerview)) | **Gold standard mental model** — recycle hosts; swap label props, don’t remount trees |
| **Android NumberPicker** | Fixed **3** selector indices; draws wheel in `onDraw`; fling/adjust `Scroller`s; does **not** create N views for N values ([AOSP NumberPicker.java](https://github.com/android/platform_frameworks_base/blob/master/core/java/android/widget/NumberPicker.java)) | Confirms: tiny recycle pool + paint/transform, not infinite React trees |
| **RN Reanimated + Gesture Handler** | Shared values + worklets; `Gesture.Pan` → velocity → `withSpring` snap on UI thread ([RNGH pan](https://docs.swmansion.com/react-native-gesture-handler/docs/legacy-gestures/pan-gesture/), community wheels e.g. [react-native-horizontal-wheel-picker](https://www.npmjs.com/package/react-native-horizontal-wheel-picker), [expo-horizontal-picker](https://github.com/fe-dudu/expo-horizontal-picker)) | **P0 driver** — keep Reanimated; migrate web off React-state drag; prefer RNGH 2 over PanResponder long-term |
| **Skia Atlas** | One texture + `useRSXformBuffer` transforms; single draw call ([Skia Atlas](https://shopify.github.io/react-native-skia/docs/shapes/atlas/)) | **P1/P2** if binder art needs sprite stamp; overkill for P0 text tiles |
| **FlashList** | Cell recycling for long lists ([Shopify FlashList](https://shopify.github.io/flash-list/)) | Wrong primary tool — drum is **~7–9 fixed slots**, not a long list; keep SlotPool |
| **CSS scroll-snap** | Browser owns momentum + snap (`scroll-snap-type` / `scroll-snap-align`) ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_scroll_snap/Basic_concepts)) | Good **web-only** fallback; native still needs Reanimated for rotateY/scale curves |
| **Prebaked atlases / sprites** | Rasterize chrome once; blit labels | Valid for binder rings; dated numerals stay local Text or glyph atlas |

---

## C. Segment / atlas stitch vs alternatives

CEO hypothesis: background binder rings + gradient; top/middle/bottom segments composed by view; pre-create segments and stitch at display.

| Approach | Pros | Cons | Verdict |
|---|---|---|---|
| **(A) Fixed-geometry recycled tiles + GPU transforms** (recommended) | Matches UIPicker/NumberPicker; kills mid-spin reflow; Expo-friendly; 0 network | May leave Set B “hanging grid on center” for idle-only | **P0 lock** |
| **(B) Segment atlas stitch** | Pretty binder art; shared bg; cheap focus by swapping focus strip | Art pipeline + memory; still need fixed layout boxes; risk of CAL-3DW-16 “no PNG atlas” restamp | **P1 optional** for chrome |
| **(C) Full Skia Canvas wheel** | Max GPU control | Eng cost; a11y/hit targets harder; web parity work | P2 if (A) insufficient |
| **(D) CSS scroll-snap strip (web) + Reanimated (native)** | Web inertia “free” | Dual implementation; 3D curves diverge | Acceptable hybrid, not first choice |
| **(E) Keep live Set B + only tune springs** | Small diff | **Does not** fix cheese (extras + remounts) | Reject as sole fix |
| **(F) Live MonthHangingGrid on every slot** | Rich | Worst perf | Reject |

**Segment stitch evaluation:** Valid as **art packaging** on top of (A). Precompose: `bg` (rings+gradient) + `headerStrip` + `bodyGlyph` + `footerStrip`. Stitch = layer three fixed rects inside 108×126 — **not** YMTW-dependent React layout thrash. Do **not** require stitch for P0.

---

## D. Perf budget (60fps; network ≈ 0)

| Budget | Target | How |
|---|---|---|
| Frame time | ≤16.6 ms (60fps) during fling | Transforms only on UI/compositor; no React setState per frame |
| JS during fling | Near-zero | Shared values; recycle props via worklet→JS only on **integer slot cross** (and even then: update **label props**, avoid remount) |
| Layout | **0 mid-spin** | Fixed width/height; tabular nums; no mount/unmount of grids |
| Blur | Off during fling | Opacity/scale only; silhouette = dimmed fixed tile, not BlurView |
| Memory | ≤9 tile bitmaps if rasterized; else ≤9 View trees | Prefer View/Text P0; rasterize chrome P1 |
| Network | **0** | Local `shiftPeriodAnchor` / captions only |
| Web | Match native inertia | Reanimated web or rAF + CSS transform; kill `setWebDragPx` per move |

---

## E. Recommended architecture (Expo ios / android / web)

```
PeriodDrum (gesture host)
  ├─ dragShared: SharedValue<number>   // native + web Reanimated
  ├─ SlotHost[i] i=0..N-1 (N=7 or 9)  // stable React keys by slot index ONLY
  │    ├─ outer: translateX + opacity (hit ≥56×56 unscaled)
  │    └─ inner: rotateY + scale
  │         └─ PeriodTileFixed
  │              ├─ always: fixed 108×126 chrome + primary label(s)
  │              └─ idle-only (post-snap, center): optional DetailOverlay
  └─ ContentModel: ring buffer of period keys; on integer cross, rewrite labels
```

**Laws:**

1. **Stable slot keys** = `slot-${i}` — never `periodKey` in React key during fling.  
2. **Fixed geometry** — same Text tree height for side and center during motion.  
3. **Focus variant** = CSS/RN opacity+scale **or** swap to prebuilt `focused` style without adding lines.  
4. **Detail overlay** (month grid, week strip) mounts **only** after `onSpringRest` and **dismounts** on next grant — never mid-spin.  
5. **Web** uses same shared-value path (Reanimated 3/4 web) or a single rAF loop writing `element.style.transform` — no React state per frame.  
6. **RM:** drop rotateY; keep scale/opacity/snap (existing law).

---

## F. Visual redesign that helps perf

| Option | Feel | Perf | Stamp |
|---|---|---|---|
| **F1 Fixed ledger plate** — one red header band + one body numeral/range; no hanging 35-grid on drum | Clean mechanical | Best | Departs Set B center grid → **needs CEO override / restamp** |
| **F2 Segment stitch binder** — rings+gradient bg; top month / mid day / bottom year by view | Distinctive | Good if fixed rects | New art; restamp |
| **F3 Keep Set B idle, strip mid-spin** — current leaf art at rest; fling uses compact fixed labels only | Familiar at rest | Good | Soft restamp: ContentPolicy change |
| **F4 Skia painted drum** | Max polish | Eng-heavy | Later |

**Recommendation:** **F1 or F3 for P0**; evaluate **F2** as P1 art if Chuck wants binder aesthetic. Prototype ships **F1 fixed tiles** + optional cheese mode to contrast.

---

## G. Phased plan (summary — detail in plan.md)

| Phase | Goal |
|---|---|
| **P0** | Kill cheese: fixed geometry; no mid-spin remount/reflow; web shared-value/rAF; silhouette without blur; recycle 7–9 |
| **P1** | Optional segment atlas chrome; RNGH 2; idle DetailOverlay polish; reduce visible to 7 if Chuck prefers |
| **P2** | Skia atlas only if metrics fail; restamp look if F2 ships |

---

## H. Sources (accessed 2026-09-24 CT)

1. https://developer.apple.com/documentation/uikit/uipickerview — UIPickerView recycle model  
2. https://developer.apple.com/documentation/uikit/uipickerviewdelegate/pickerview(_:viewforrow:forcomponent:reusing:) — `reusing` view  
3. https://github.com/android/platform_frameworks_base/blob/master/core/java/android/widget/NumberPicker.java — 3-selector wheel + Scroller fling  
4. https://docs.swmansion.com/react-native-gesture-handler/docs/legacy-gestures/pan-gesture/ — Pan / velocity  
5. https://www.npmjs.com/package/react-native-horizontal-wheel-picker — Reanimated horizontal wheel  
6. https://github.com/fe-dudu/expo-horizontal-picker — Expo + Reanimated snap picker  
7. https://shopify.github.io/react-native-skia/docs/shapes/atlas/ — Atlas + RSXform  
8. https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_scroll_snap/Basic_concepts — CSS scroll-snap  
9. https://shopify.github.io/flash-list/ — FlashList recycling (contrast tool)  
10. Live Kelyra: `PeriodPager.tsx`, `PeriodLeaf.tsx`, `periodWheel.ts`, `periodPager.ts` (read 2026-09-24)  
11. Prior SoT: `calendar-3d-wheel-spec.md`, `calendar-3d-wheel-intent.md`, `calendar-3d-wheel-pm-lock.md`, `calendar-3d-wheel-look-disposition.md`

---

## Recommendation lock

**Prefer precomposed fixed-geometry tiles + GPU transforms only during fling (recycle ~7–9 slots). Center focus = pre-drawn focus variant or scale/opacity — never change text layout mid-spin. Segment atlas stitch is valid P1 for binder art. Allow departing Set B hanging-ledger if Chuck confirms redesign; note prior dual-stamp conflict until restamp.**

Audit **confirms** (does not contradict) this lock: live jank is content/layout mid-spin, not missing springs.
