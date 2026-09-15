# CAL-R3 Delta vs current — CEO line-by-line review

**Date:** 2026-09-14  
**Card:** `t_c53154d6`  
**Audience:** Chuck (approve / reject / annotate lines). CoS presents.  
**Status:** Design delta only. **No PM stamp. No Eng. No pick locked.**

**How to read:** Each surface has Current Kelyra (file + behavior), Apple video (frame/research), then **R3-A / R3-B / R3-C** actions (`Keep` · `Add` · `Change` · `Drop`). Why + risk to hats / publish / Desk.  
**Pack definitions:** `calendar-r3-ux-options.md`.  
**R2 law still binding** until you change it.

**Legend — Proposed action**
- **Keep** — ship behavior stays
- **Add** — new surface or field
- **Change** — same job, different chrome/structure
- **Drop** — do not bring Apple piece into Kelyra

---

## 0. Global / chrome (all hats)

| Field | Current Kelyra | Apple video | R3-A | R3-B | R3-C | Why | Risk hats/publish/Desk |
|---|---|---|---|---|---|---|---|
| Entry | Drawer Calendar CE-A; quiet Desk link; not tray (`calendar.tsx` via chrome) | Native Calendar app tab | Keep CE-A | Keep CE-A | Keep CE-A | TEACH-UX: no 6th tray | **Desk risk if demoted** — all packs Keep |
| Seat / hats | `calendarSeatForChrome`; teacher Hidden badge | None | Keep | Keep | Keep | Product wall | Low if untouched |
| Child focus | CH-A chips when parent 2+ | None | Keep | Keep | Keep | Twin law | Low |
| System tray | 5 slots unchanged | N/A | Keep | Keep | Keep | CE-A | High if anyone Adds tray — **banned** |

---

## 1. Year view

| Field | Current Kelyra | Apple video | R3-A | R3-B | R3-C | Why | Risk |
|---|---|---|---|---|---|---|---|
| Year grid | **None** (R2 MVP cut: no year) | 2-col mini-months, year title, Today, search, +, Calendars + Inbox bottom (`t000s-year.jpg`) | **Drop** (defer) | **Add** year spine | **Add** year spine | Video opens here; school year scan | Medium: must not replace Desk “today” job |
| Year dots | N/A | Small colored dots under days | — | **Add** role/category dots only (≤4 tints) | **Add** same; ban per-cal rainbow | VZ-A/B | Low if tint cap held |
| Year chrome Inbox | N/A | Inbox glyph bottom | **Drop** | **Drop** | **Drop** | Needs owns publish queue; not Calendar Inbox | **Publish risk if Add** |

## 2. Month + list / month grid

| Field | Current Kelyra | Apple video | R3-A | R3-B | R3-C | Why | Risk |
|---|---|---|---|---|---|---|---|
| Month grid | None dedicated | Continuous month grid (`t004` pixels); month title; Today | **Drop** as view | **Add** | **Add** | Jump months without agenda scrub | Low–Med chrome stack |
| Month + list hybrid | AgendaList 14-day (`AgendaList.tsx`); toolbar “Next 2 weeks” | Day-header list + all-day rows (`t030`/`t062` pixels); research also describes month header + list | **Change** Agenda: optional week-strip header + denser rows | **Change** Agenda ↔ Month-list mode | **Change** list mode + Month | Agenda already closest Kelyra list | Low |
| Phone default | Agenda primary (`phoneView` default) | Year/Month heavy | **Keep** Agenda default | **Keep** Agenda *or* Month-list (PM later) | Apple-like Month/Year pressure — still **must not** steal Desk | School glance vs Apple home | Med if default = Year |

## 3. Day view

| Field | Current Kelyra | Apple video | R3-A | R3-B | R3-C | Why | Risk |
|---|---|---|---|---|---|---|---|
| Structure | `DayColumn.tsx`: heading + **card rows** (title, category, Hidden badge); not hour gutter | Timeline: hour gutter, all-day strip, timed blocks (`t010`/`t022` pixels) | **Change** → true timeline + all-day | **Change** same | **Change** same | Closest visual gap vs Apple | Low |
| Nav | Prev / Today label / Next GhostButtons | Swipe days; large day number; Today pill | **Change** chrome quieter + swipe optional | **Change** | **Change** | Match motion bar | Low |
| Hidden | DP-A badge on teacher | N/A | **Keep** | **Keep** | **Keep** | Law | Publish risk if Drop |

## 4. Week view

| Field | Current Kelyra | Apple video | R3-A | R3-B | R3-C | Why | Risk |
|---|---|---|---|---|---|---|---|
| Presence | Web only `TeacherWeekGrid.tsx` (7 day cols, today ring, item chips); phone no Week | Research: 7-col timeline + all-day; video also shows list-heavy frames | **Change** denser web week (all-day row, hour gutter if timed) | **Change** + phone Week in overflow | **Change** + phone Week primary-capable | Teacher plan job | Low if web stays Week-led |
| Hats overlay | Category on items | Color blocks | **Keep** category-primary marks | **Keep** | **Keep** | VZ-A | Low |

## 5. Multi-day view

| Field | Current Kelyra | Apple video | R3-A | R3-B | R3-C | Why | Risk |
|---|---|---|---|---|---|---|---|
| Multi-day columns | **None** | ~3–5 day columns via pinch from week (research; `t034` file is mislabeled composer) | **Drop** | **Drop** | **Add** pinch week↔multi-day | Density for ballgames / conferences | Med a11y; RM must degrade to stepper |
| Reduced motion | N/A | Pinch | — | — | **Change** pinch → button “3 days / 5 days / 7 days” under RM | a11y | Low if planned |

## 6. Calendars sheet

| Field | Current Kelyra | Apple video | R3-A | R3-B | R3-C | Why | Risk |
|---|---|---|---|---|---|---|---|
| Sheet | `CalendarsSheet.tsx`: toggles Enable/Disable; team ⋯ Unsubscribe; search ≥8; hint “not security” | Account sections, Show All, color dots (`t070` popover; calendars list frame mislabeled) | **Keep** verbs; **Change** row visual (role tint dot + name) | **Keep**+**Change** same | **Keep**+**Change**; optional account grouping later | MG-A verbs stay | Low |
| Sport unsubscribe | Unsubscribe ≠ Delete | N/A | **Keep** | **Keep** | **Keep** | CAL-08 | High if Delete conflated |
| Show All | Implicit presets | Show All | **Keep** presets | **Keep** | **Add** explicit Show all rows | Clarity | Low |

## 7. New event sheet (composer)

| Field | Current Kelyra | Apple video | R3-A | R3-B | R3-C | Why | Risk |
|---|---|---|---|---|---|---|---|
| Shell | `EventComposer.tsx` CR-A sheet phone / modal web | Full-screen dark sheet, X / check (`t034`/`t054` pixels) | **Change** presentational hierarchy only | **Change** | **Change** | Quality bar | Low |
| Tabs Event \| Reminder | Events only | Both tabs | **Drop** Reminder tab | **Drop** | **Drop** | Calendar≠Diary; no Reminders product | **High if Add→Diary bleed** |
| Fields now | Title, kind, category, all-day, start/end DATE-P1, body; AI “Review draft — not saved” | Title, location, all-day, starts/ends, travel, repeat, calendar, invitees, alert, attachments, URL, notes | **Keep** field set | **Add** optional Alert + simple Repeat **if** model supports; else Keep | **Add** Alert/Repeat/Notes polish; **Drop** Travel/URL/Attachments v1 unless trivial | Avoid fake fields | Med scope |
| AI banner | Keep draft-then-Save | None | **Keep** | **Keep** | **Keep** | CAL-09 | High if auto-save |
| Visibility caption | kind/seat caption | N/A | **Keep** | **Keep** | **Keep** | Hats | Low |

## 8. Date picker

| Field | Current Kelyra | Apple video | R3-A | R3-B | R3-C | Why | Risk |
|---|---|---|---|---|---|---|---|
| Control | DATE-P1 `DateInput` inside composer | Inline month grid expand under Starts/Ends (`t054`) | **Keep** DATE-P1 | **Keep** DATE-P1; optional inline grid **skin** if primitive allows | **Change** visual toward inline grid **without** third date system | One date primitive law | Med if second picker invented |

## 9. Color / calendar picker

| Field | Current Kelyra | Apple video | R3-A | R3-B | R3-C | Why | Risk |
|---|---|---|---|---|---|---|---|
| Picker | Kind/category chips in composer; layers in Calendars sheet | Popover dots Home/Work/Family + Gmail (`t070`) | **Change** optional role-tint on layer row only | **Add** composer “Calendar” row → layer list with ≤4 role tints | **Add** same popover pattern | Ban unique bright hue per calendar | Med a11y if rainbow creeps |
| Category chips primary | LF-A ChipRow always on screen | Color = calendar identity | **Keep** chips primary | **Keep** | **Change** chips may demote to filter menu | School language (“Academic”) | Med discoverability if demoted |

## 10. Motion (summary — full file `calendar-r3-motion.md`)

| Field | Current Kelyra | Apple video | R3-A | R3-B | R3-C | Why | Risk |
|---|---|---|---|---|---|---|---|
| Sheet present/dismiss | Modal/overlay | Spring slide-up | **Change** spring + RM fade | **Change** | **Change** | Essential quality | Low |
| Pinch week↔multi-day | None | Pinch | **Drop** | **Drop** | **Add** + RM stepper | Enhancing unless C | a11y |
| Year↔month drill | None | Tap month | **Drop** | **Add** | **Add** | Nav | Low |
| Error shake / confetti | Banned R2 | N/A | **Drop** | **Drop** | **Drop** | Calm | — |

## 11. Reminders tab

| Field | Current Kelyra | Apple video | R3-A | R3-B | R3-C | Why | Risk |
|---|---|---|---|---|---|---|---|
| Reminder product | None on Calendar; Diary separate | Event \| Reminder tabs | **Drop** | **Drop** | **Drop** | Reminders ≠ Diary; do not merge | **Critical if mapped wrong** |
| Map option | — | — | No map | No map | No map (or future standalone — not this card) | Explicit | — |

## 12. Filters, badges, AI, sports (Kelyra-only keep)

| Field | Current | Apple | All packs | Why | Risk |
|---|---|---|---|---|---|
| CATEGORY_CHIPS + presets | `filters.ts` LF-A | None | **Keep** (C may demote UI, not delete model) | School language | Med only if C hides too deep |
| Hidden badge DP-A | Teacher rows | None | **Keep** | Assign≠publish; Needs owns Publish | High if Drop |
| Sports opt-in | Default off | N/A | **Keep** | CAL-08 | High if default on |
| Ask draft open composer | Phase E park | None | **Keep** | draft-then-Save | High if auto-commit |

---

## 13. CEO quick matrix (one glance)

| Surface | R3-A | R3-B | R3-C |
|---|---|---|---|
| Year | Drop | Add | Add |
| Month grid | Drop | Add | Add |
| Day timeline polish | Change | Change | Change |
| Week denser | Change | Change | Change |
| Multi-day | Drop | Drop | Add |
| Calendars sheet | Keep+tint | Keep+tint | Keep+tint |
| Composer fields | Keep lean | Lean+ | Richer−Travel/URL |
| DATE-P1 | Keep | Keep | Keep (skin OK) |
| Color picker | Tint only | Add layer row | Add popover pattern |
| Reminder tab | Drop | Drop | Drop |
| CE-A / Desk / Diary | Keep | Keep | Keep |

---

## 14. Frame correction appendix

See `calendar-r3-ux-options.md` frame note. Do not treat filename alone as ground truth.

---

## 15. Approval block (for Chuck)

```
CAL-R3 CEO REVIEW
Date:
Year view:        Approve A-drop / B-add / C-add / other: ____
Month:            ____
Day timeline:     ____
Week:             ____
Multi-day:        ____
Calendars sheet:  ____
Composer fields:  ____
Date picker:      ____
Color picker:     ____
Motion pack:      ____
Reminders tab:    DROP (required) / other: ____
CE-A/Desk/Diary:  HOLD (required) / other: ____
Overall pack lean (non-binding note): R3-A / R3-B / R3-C / hybrid: ____
Send to PM lock?  NO until explicit yes
```

**Next:** CoS presents this file. Hold PM + Engineering.
