# Calendar drum

## Sub-features

The period drum on Calendar (the card wheel above Day List). Drag, fast flick, one tap on a side card, Day List scrolling the drum live, and a cold web load. Every check runs on web and on iPhone. Regressions this guards: `a4fdfa70` (one tap counted twice, drum snapped back on web), #226 / #227 / #229 and `1907510e` (drum follows Day List live, forward and back), `2b07dd91` (web crash at startup in the drum worklets).

## How to get to it (user POV)

Sign in as the teacher persona. Open Calendar. The tab label is `Calendar`. The route is `/calendar`. Stay on the default view so Day List sits under the drum.

## Driving it with ui-drive

`Drive: /calendar click=[aria-label=Calendar]`

```bash
node scripts/ui-drive.mjs --surface both --persona teacher --seat teacher --route /calendar --click '[aria-label=Calendar]' --ids ac-cal-drum-1 --out /tmp/kelyra-ui-drive-calendar-drum.json
```

The Drive click only lands on Calendar. `ui-drive` has no drag or swipe, so the gestures below run after it, in the same QA Chrome (9223) tab and the same booted simulator. Phone gestures use `idb ui swipe` and `idb ui tap` with the simulator udid. Do not use cliclick or DeviceHub. Add `--motion-video /tmp/kelyra-cal-drum.mov` when a phone recording is wanted.

## Selectors

- Drum: `testID="cal-drum"`. Web `[data-testid=cal-drum]`, phone AXIdentifier `cal-drum`. Its label is `Period wheel <caption>`. The caption is the period at center, so read it before and after each gesture.
- Cards: the center card is `[aria-label="Go to today"]`. Side cards are `[aria-label=Previous]` and `[aria-label=Next]` (`Earlier` / `Later` on Agenda).
- Day List: `testID="cal-day-list"`. Web `[data-testid=cal-day-list]`, phone AXIdentifier `cal-day-list`. Its label is `Day activity list`.

## Checks

Sample the drum caption every 100 ms during and for 1.5 s after each gesture. Record every caption seen and the screenshot path.

1. Drag. Press on the drum, move about one card width left over 400 ms, release. Pass: the caption moves forward by exactly one period and stays there.
2. Fast flick. Swipe the drum about two card widths in under 120 ms. Pass: the caption keeps changing after release (it coasts), then holds one value for 1 s. The captions only move in the flick direction. Seeing the start caption again after it changed is snap-back, and that fails.
3. One tap. Tap `[aria-label=Next]` once. Pass: the caption moves forward by exactly one period and stays. Two periods, or a return to the start caption, fails (`a4fdfa70`).
4. Day List follows. Scroll Day List forward by about three day headers over 1 s, hold, then scroll back the same distance. Pass: the caption changes while the finger is still down, not only after release, and it ends on the start caption after scrolling back (#226, #227, #229, `1907510e`).
5. Cold web load. Web only. Open `/calendar` in a new tab with cache disabled and read the console. Pass: `[data-testid=cal-drum]` renders and the console has no `ReferenceError`, no `Cannot access ... before initialization`, and nothing naming `WHEEL_MAX_FLING_SLOTS` or `periodPager` (`2b07dd91`).

## Gotchas

The drum label changes with every move, so select on `cal-drum`, not on the label text. A narrow browser is not the phone; `Surface: both` needs the simulator run. On web the drum takes pointer events: a mouse drag through CDP `Input.dispatchMouseEvent` works, and a flick is the same drag with the moves packed into under 120 ms. Do not slow the drum or edit `PeriodPager.tsx` to make a check pass. A failed check is a product finding.
