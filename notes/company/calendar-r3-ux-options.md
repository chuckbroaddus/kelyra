# CAL-R3 UX option packs — Apple video quality vs Kelyra chrome

**Date:** 2026-09-14  
**Card:** `t_c53154d6` · Designer only  
**Status:** Options for CEO/CoS review. **Do not pick here. Do not lock. Do not Eng.**

**Inputs:** `calendar-r3-video-benchmark.md`, `calendar-r3-kelyra-current.md`, `calendar-r3-gaps.md`, frames in `calendar-r3-iphone-frames/`, shipping `src/app/calendar.tsx` + `src/components/calendar/*`.  
**Still law until Chuck changes it (R2):** hats, twins, assign≠publish, hidden quizzes, CE-A (not 6th tray), Desk not replaced, Calendar≠Diary, sports opt-in, AI draft-then-Save, LF-A chips primary + Calendars sheet secondary, DP-A Hidden badge.

**Benchmark:** Apple Calendar iPhone **dark mode** quality + functionality from the video — not SportsYou chrome. Keep all Kelyra school/family function.

---

## Job of this surface (shared)

Calendar is the **dated / span** surface for the active seat: scan load, open an item, filter layers, create/edit with Save. It is **not** Desk home, not Diary, not Needs Publish product owner, not a tray tab.

---

## Shared non-goals (all packs)

- No 6th tray slot; no Desk replacement with month/year home.
- No Reminders product tab merged to Diary; no twin unlabeled merge.
- No invent View-stroke glyphs; icon recipes only if later Eng.
- No app code / SQL / qa-loop from this card.
- No “PM should pick A” language — tradeoffs only below.

---

## Pack index

| Pack ID | Stance name | Apple closeness | Kelyra chrome weight |
|---|---|---|---|
| **R3-A** | Polish in place | Visual + motion bar; same view set | Full R2 chrome stays primary |
| **R3-B** | Phone year spine | Year + month grid/list added | R2 laws + chips; defaults shift carefully |
| **R3-C** | Apple density shell | Year / multi-day / rich sheets | Laws held as overlays; chrome thinned |

---

## Pack R3-A — Polish in place

### Stance
Keep the **R2 view set and IA** (phone Agenda+Day; web Week+Agenda+Day; CE-A drawer; LF-A chips; CR-A sheet). Raise **visual density, timeline chrome, and sheet motion** to the Apple video bar without new view products.

### Before → after
| | Before (ship) | After (this pack) |
|---|---|---|
| Phone views | Agenda / Day chips | Same. Day gains hour gutter + all-day strip (Apple day structure). Agenda keeps 14-day list; optional compact week-strip header. |
| Web views | Week / Agenda / Day | Same. Week gains all-day row + hour labels closer to t030s structure. |
| Year / multi-day | None | Still none |
| Layers | ChipRow + Calendars sheet | Same primary; sheet rows gain optional ≤4 role-tint dots (VZ-B already allowed) |
| Composer | Title, dates DATE-P1, all-day, kind/category, body, AI banner | Same fields; Apple-like sheet hierarchy + spring present/dismiss; no Event\|Reminder tabs |
| Chrome | Chip-heavy header | Quieter chrome: view segmented control; chips one row; Calendars icon-entry (no new glyphs invent — reuse calendar name) |

### Constraints honored
CE-A, VW-A, LF-A, CR-A, CH-A, DP-A, Desk, Calendar≠Diary, hats/twins/hidden.

### Explicit non-goals
Year view, pinch multi-day, Travel/Attachments/URL/Invitees parity, Reminders tab, tray entry.

### Tradeoffs
- **Strong:** Lowest product risk; ships quality bar without reopening R2 view cut.
- **Weak:** Still no year scan / multi-day density Apple users expect from the video.
- **Risk to hats/publish/Desk:** Low.

### Recommendation label only
**Recommendation only (not a lock):** Best default if Chuck wants video *feel* without expanding MVP views.

---

## Pack R3-B — Phone year spine

### Stance
Add **Year** and **Month grid / month+list** on phone as navigation spine (Apple t000 / t004 / t010), while **defaults** stay school-safe: phone can still land Agenda or Month-list (pick at PM later — not here). Web keeps Week-led teacher. Multi-day deferred. Kelyra chips + laws stay primary.

### Before → after
| | Before | After |
|---|---|---|
| Year | Missing | 2-col mini-months, year title, Today, Calendars entry, event dots (not rainbow per-cal) |
| Month | Missing as dedicated view | Month grid (t004-like continuous) and/or month header + list (t010 / agenda hybrid) |
| Day | DayColumn = card list, not true timeline | True day timeline (hour gutter, all-day, blocks) |
| Week | Web TeacherWeekGrid only | Phone Week optional in Views overflow; web Week denser |
| Multi-day | None | Out of pack (defer) |
| Composer | CR-A fields | + optional Alert / simple Repeat row only if data exists; still no Reminder tab |
| Color | Layer via sheet | Composer calendar row with role-tint / layer pick (not unique hue per calendar) |

### Constraints honored
Hats, twins, assign≠publish, hidden badge, CE-A, Desk, Diary split, sports opt-in, AI draft-then-Save. LF-A chips remain; year dots use **category/role** marks not per-calendar rainbow.

### Explicit non-goals
Pinch week↔multi-day; full Apple field dump (Travel, Attachments, URL); Reminders=Diary; 6th tray; Desk = year home.

### Tradeoffs
- **Strong:** Matches the video’s opening spine (year → month → day) parents/teachers recognize.
- **Weak:** More Eng surface; risk of phone chrome stack (child + views + chips + year).
- **Risk to hats/publish/Desk:** Medium if Year becomes “home” — must stay drawer Calendar destination, Desk untouched.

### Recommendation label only
**Recommendation only:** Strong if Chuck prioritizes Apple *navigation* parity on phone while holding R2 product laws.

---

## Pack R3-C — Apple density shell

### Stance
Closest shell to the video: Year, Month, Day timeline, Week, **Multi-day (pinch)**, Calendars sheet, rich New Event sheet motion/fields that map cleanly — with Kelyra laws as **overlays** (Hidden badge, child header, AI draft banner, category language). Chips may move secondary (Calendars sheet + filter menu) to clear vertical space.

### Before → after
| | Before | After |
|---|---|---|
| View set | Agenda/Day phone; Week/Agenda/Day web | Year · Month · Day · Week · Multi-day (~3–5 cols) + Agenda kept as list mode |
| Gestures | Chip taps + Prev/Next | Pinch week↔multi-day; swipe day; sheet springs |
| Layers | Chips always visible | Chips collapse into filter / Calendars; presets remain |
| Composer | Lean CR-A | Event-only sheet (drop Reminder tab); map Alert/Repeat/Notes; Travel/URL/Attachments = later or omit |
| Bottom chrome | Kelyra Screen + tray elsewhere | Apple-like Today + view switcher **inside Calendar only** — still not system tray rewrite |

### Constraints honored
Still: no Diary merge, no tray sixth, Desk not replaced, hats/twins/hidden/assign≠publish/sports/AI Save. Reminders tab = **Drop** (map nothing to Diary).

### Explicit non-goals
Consumer iCloud account model as product; SportsYou branding; rainbow calendars; Publish product moved onto Calendar.

### Tradeoffs
- **Strong:** Highest fidelity to video quality bar and functionality density.
- **Weak:** Highest Eng + a11y cost; chip demotion risks “tests only” language discoverability; multi-day pinch fights reduced-motion.
- **Risk to hats/publish/Desk:** Higher chrome-pressure risk if bottom Today/view chrome is misread as tray; must stay route-local.

### Recommendation label only
**Recommendation only:** Only if Chuck explicitly wants near-Apple phone shell and accepts larger scope after delta line-approve.

---

## Cross-pack comparison (tradeoffs, not a pick)

| Dimension | R3-A Polish | R3-B Year spine | R3-C Density shell |
|---|---|---|---|
| New views | 0 | Year + Month | Year + Month + Multi-day |
| Phone default tension | Low (Agenda stays) | Medium (Month vs Agenda) | High (Apple defaults vs school glance) |
| Chip row | Stays primary | Stays primary | May demote |
| Composer | Hierarchy only | + few rows | Richer sheet |
| Motion | Sheet + day polish | + year/month transitions | + pinch multi-day |
| Eng size | S | M | L |
| Law risk | Low | Medium | Medium–High (chrome misread) |

---

## Frame note (research honesty)

Some files under `calendar-r3-iphone-frames/` are **mislabeled vs pixels**:

| File | Actual content (vision) |
|---|---|
| t000s-year.jpg | Year 2-col mini-months ✓ |
| t004s-year-scroll.jpg | Month grid continuous (Sep→Oct), not year scroll |
| t010s-month-list.jpg | Day timeline (timed blocks) |
| t022s-day.jpg | Day empty timeline |
| t030s-week.jpg | Agenda-style list (day headers + all-day rows) |
| t034s-multiday.jpg | New Event sheet (not multi-day grid) |
| t042s-calendars-list.jpg | Location search sheet (not calendars list) |
| t054s-new-event.jpg | New Event date expanded |
| t062s-new-event-date.jpg | Agenda list far-future |
| t070s-calendar-picker.jpg | Calendar color popover (Home/Work/Family) ✓ |

Benchmark prose + these corrected reads drive options. True multi-day pinch is described in research notes even when the `t034` file is the composer.

---

## Related deliverables

- Line-by-line CEO file: `notes/company/calendar-r3-delta-vs-current.md`
- Motion: `notes/company/calendar-r3-motion.md`
- Optional mockups: `notes/company/calendar-r3-mockups/`

**Next (not this card):** CoS shows Chuck. Hold PM stamp and Engineering until yes.
