# CAL-R3 Designer brief — Apple Calendar video vs Kelyra (Chuck must approve)

**Date:** 2026-09-14  
**Do not implement. Do not research. Do not pick. Do not staff Eng.**  
Chuck must **see exactly what we would change** vs current Kelyra Calendar before any send.

## Inputs
- Frames: `notes/company/calendar-r3-iphone-frames/`
- Research: `calendar-r3-video-benchmark.md`, `calendar-r3-kelyra-current.md`, `calendar-r3-gaps.md`
- Current code: `src/app/calendar.tsx`, `src/components/calendar/*`
- R2 lock still law until Chuck changes it: hats, twins, assign≠publish, hidden quizzes, CE-A not 6th tray, Desk not replaced, Calendar≠Diary

Benchmark = **Apple Calendar iPhone dark mode** (not SportsYou). Quality bar + functionality from the video; keep all Kelyra school/family function.

## Deliverables (incremental writes)
1. `notes/company/calendar-r3-ux-options.md` — 2–3 named option packs (how close to Apple vs how much Kelyra chrome). Do not pick.
2. `notes/company/calendar-r3-delta-vs-current.md` — **the CEO review file**. Table every surface:
   - Current Kelyra (file + behavior)
   - Apple video
   - Proposed change (Keep / Add / Change / Drop)
   - Why
   - Risk to hats/publish/Desk
   Year, month+list, day, week, multi-day, calendars sheet, new-event sheet, date picker, color picker, motion (pinch week↔multiday, sheet springs), Reminders tab (map or drop).
3. `notes/company/calendar-r3-motion.md` — video-like transitions: trigger, duration, spring, reduced-motion. Classify Essential vs enhancing.
4. Optional HTML mockups under `notes/company/calendar-r3-mockups/` comparing **current vs proposed** for phone year / week / day / multi-day / new event. Standalone **explicit light-on-dark colors** (no `var(--foreground)`). Small files.

## Constraints
No app code, SQL, qa-loop, git. No “PM should pick A”. Tradeoffs only.  
Do not invent View-stroke glyphs.  
Reminders in Apple ≠ Kelyra Diary; do not merge Diary onto Calendar.

## Acceptance
Delta file is something Chuck can approve line-by-line. Next: CoS shows Chuck; **no PM stamp / no Eng** until he says yes.

## Next
CoS presents delta to CEO. Hold PM lock and Engineering.
