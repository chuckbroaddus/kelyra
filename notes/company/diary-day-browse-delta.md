# DIARY-D1 — Journal day-browse — Keep / Add / Change / Drop vs current

**Date:** 2026-09-17  
**Card:** `t_220ada09`  
**Audience:** PM (pick) · QA Supervisor (IQG) · CoS  
**Status:** Design delta only. **No PM stamp. No Eng. No lock.**

**How to read:** **Current** = live Diary Journal (`src/app/diary.tsx`).  
**DB-A / DB-B / DB-C** = packs in `diary-day-browse-ux-options.md`.  
**Research input (do not restart):** `diary-day-browse-research.md` (`t_574b8816`).

**Legend**

- **Keep** — ship behavior stays  
- **Add** — new chrome / mode / indicator  
- **Change** — same job, different home or visual  
- **Drop** — remove from primary Journal chrome (data may remain)  
- **Look-only** — Calendar *visual kind* allowed as resemblance  
- **Function-out** — Calendar *product function* that must stay out of Diary  

---

## 0. Global / product bars (all packs)

| Field | Current | DB-A | DB-B | DB-C | Why | Risk |
|---|---|---|---|---|---|---|
| Product Diary | Own route | Keep | Keep | Keep | CEO products separate | Critical if merge |
| Product Calendar | Separate | Keep separate | Keep | Keep | no events on Diary | Critical |
| Calendar events on Journal | None | Keep none | Keep | Keep | research non-goal | Critical |
| Diary body on Calendar | None | Keep none | Keep | Keep | research non-goal | Critical |
| Journal segment | PersonTabs | Keep | Keep | Keep | IA | High if drop |
| Ledger segment | List + range + families | **Keep list+range** | Keep | Keep | research Journal-only browse | High if day-grid on Ledger |
| Student Diary | Closed | Keep closed | Keep | Keep | seat law | Critical |
| Parent multi-child chips | Present; fail-closed | Keep | Keep | Keep | twin law | Critical if mix |
| Teacher soft student pointer | Class/student chips | Keep (orthogonal) | Keep | Keep | not ACL | Med clutter |
| Teacher tray | No Diary sixth | Keep | Keep | Keep | chrome law | High if 6th |
| Office / staff entry | Hamburger | Keep | Keep | Keep | research hats | Low |
| Composer | Diary FormSheet | Keep | Keep | Keep | DATE-P1 separate | High if Calendar composer |
| DATE-P1 composer dates | Composer field | Keep out of browse | Keep | Keep | card scope | Med if dual UI fight |
| Privacy / FERPA note | On screen | Keep | Keep | Keep | owner-only | High if drop |
| Ask NL | Other card | Do not merge | Do not | Do not | `t_cecf2af0` | Scope |
| View-stroke glyphs | Recipes only | Placeholder OK; no invent | same | same | AGENTS | High if invent |
| Matcher / Approve laws | Untouched | Keep | Keep | Keep | MVP | — |

---

## 1. Journal date navigation (core delta)

| Field | Current | DB-A | DB-B | DB-C | Look-only vs function-out | Risk |
|---|---|---|---|---|---|---|
| From date TextField | Primary | **Change → demote** (disclosure / web) or Drop primary | **Drop** primary | **Drop** primary | — | Med power users |
| To date TextField | Primary | Same as From | Drop primary | Drop primary | — | Med |
| Apply filters button | Present | **Change** — auto-apply on day/strip change; Apply only if advanced left | Auto on select | Auto on mode/day | — | Low |
| Focused day concept | None (range only) | **Add** focused day | **Add** selected day | **Add** per mode | Look-only | Low |
| Week day strip | None | **Add** | Optional under month | Optional in Day mode | Look-only (Calendar day chrome *kind*) | Low |
| Month grid | None | No | **Add** | **Add** (Month chip) | Look-only MonthGrid *kind*; **function-out** event tints / CalendarItem | Med Eng bleed |
| Year grid | None | No | No | No (defer) | YearGrid *kind* out unless later | — |
| Day ◀ ▶ / Today | None | **Add** | **Add** | **Add** | Look-only | Low |
| Multi-day entry scroll | List in text range | **Add** stream around focus | **Add** agenda under/beside month | **Add** Days columns + agenda | Look-only scroll/pager *kinds* | Med density |
| MultiDayStepper 3/5/7 | None | No | No | **Add** (*kind*, entries not events) | Look-only stepper; **function-out** event columns | Med |
| View chips Day/Days/Month | None | No | No (optional List hide-grid only) | **Add** Journal-local chips | Look-only chip *kind*; **function-out** Calendar view prefs / week class grid | High misread |
| TeacherWeekGrid | None | No | No | **Drop-from-scope** (never) | **Function-out** | — |
| Hour timeline DayColumn | None | No | No | **No** (entry cards not hours) | **Function-out** timed events | High if copied |
| Empty day state | Skip empty days | **Add** empty + New entry | **Add** | **Add** | — | Low |
| Presence dots/counts | None | **Add** optional neutral | **Add** neutral on month | **Add** month + day headers | Look-only dots *shape*; **function-out** roleTint / dayTintSeeds / layers | Critical FERPA if wrong |
| Sort Newest/Oldest | Chips | Keep | Keep | Keep (may hide in single Day) | — | Low |
| Search field | Present | Keep | Keep | Keep | — | Low |
| Tag filter | TextField | Keep | Keep | Keep | — | Low |
| SectionHeader by `entry_date` | Present | **Change** → sticky multi-day headers | Keep kind in agenda | Keep kind | — | Low |

---

## 2. Calendar function must stay out (all packs)

| Calendar function | Diary day-browse |
|---|---|
| Event create/edit/delete / EventComposer | **Out** — Diary composer only |
| CalendarsSheet / layer subscribe | **Out** |
| Category chips as event layers | **Out** |
| roleTint / multi-tint seeds | **Out** — neutral owner presence only |
| Hidden dues / DP-A badge | **Out** |
| Sports opt-in layers | **Out** |
| AI calendar_draft_event | **Out** (Ask calendar stays Calendar) |
| Assign ≠ publish school events | N/A on Journal |
| Import `CalendarItem` list into Journal | **Out** |
| Shared route / merged IA | **Out** |

| Look-only kind (allowed as resemblance) | Notes |
|---|---|
| Month / week cell grid | Numbers + selection + today emphasis |
| Day strip / pager | Focus movement |
| Multi-day stepper counts | Window size only |
| Agenda day headings + rows | Rows = journal entries |
| View segmented chips | Journal modes only; copy “Entries” not “Events” |
| Today jump | Same job |

---

## 3. Ledger (default all packs)

| Field | Current | DB-A | DB-B | DB-C | Why | Risk |
|---|---|---|---|---|---|---|
| Ledger list | Grouped by day | Keep | Keep | Keep | immutable log | Low |
| Ledger From/To text | Present | Keep | Keep | Keep | research | Low |
| Ledger family chips | Present | Keep | Keep | Keep | — | Low |
| Ledger class/student filters | Teacher-like | Keep | Keep | Keep | — | Low |
| Ledger export/copy CSV | Present | Keep | Keep | Keep | — | Low |
| Ledger month grid / strip | None | **Keep none** | Keep none | Keep none | Journal-only browse | High if add |
| RR-L Ledger day-browse | — | Rejected-risk only | same | same | not default pack | Scope |

---

## 4. Multiplicity / hats / chrome entry

| Field | Current | DB-A | DB-B | DB-C | Why | Risk |
|---|---|---|---|---|---|---|
| Parent 2 child chips | Above filters | **Keep above** day chrome | Keep above grid | Keep above view chips | identity > date | High if under |
| Fail-closed empty | Yes | Keep | Keep | Keep | twin law | Critical |
| Presence scoped to focused child | n/a | **Add** rule | Add | Add | no twin leak | Critical |
| Teacher pointer vs day chrome | Mixed in filter stack | Pointer **below** strip | Pointer under grid or disclosure | Pointer not a “layer” chip in view row | clutter | Med |
| Dual-hat seat | diarySeatForChrome | Keep | Keep | Keep | — | Low |
| Tray Diary slot | None | Keep none | Keep | Keep | no 6th | High |
| Hamburger Diary entry | Per seat | Keep | Keep | Keep | research | Low |
| Phone portrait pre-auth | Unrelated | Untouched | Untouched | Untouched | product bar | — |

---

## 5. Composer / create lifecycle

| Field | Current | DB-A | DB-B | DB-C | Why | Risk |
|---|---|---|---|---|---|---|
| New entry control | Existing Diary affordance | Keep + empty-day CTA | Keep + CTA | Keep + CTA | — | Low |
| Prefill `entry_date` | Composer state | **Change** — from focused/selected day when CTA | Same | Same | DATE-P1 still field UI | Low |
| Photos / STT | Composer | Keep | Keep | Keep | — | Low |
| Edit/delete entry | Diary | Keep | Keep | Keep | — | Low |

---

## 6. Implementation boundary (design intent for later Eng — not this card)

| Approach | DB-A | DB-B | DB-C |
|---|---|---|---|
| Preferred | Diary-local strip + list | Diary-local month primitive + agenda | Diary-local chips + modes |
| Thin shared date math | OK (`shiftDay`, ISO helpers) | OK | OK |
| Import calendar event UI modules | No | No | No |
| Fork visual CSS/layout | Minimal | Yes month | Yes multi mode |
| qa-loop / app code this card | **No** | **No** | **No** |

---

## 7. Pack pick matrix (PM use — still not a designer lock)

| If PM prioritizes… | Lean pack |
|---|---|
| Smallest Eng + clearest product split | DB-A |
| CEO month pick + multi-day scroll balance | DB-B |
| Max Calendar navigation kinds in Journal | DB-C |
| Ledger visual day chrome | None (reject RR-L unless research reopen) |

---

## 8. Mockups map

| File | Shows |
|---|---|
| `diary-day-browse-mockups/index.html` | Index |
| `db-a.html` | DB-A phone + web: strip, empty day, multi-day scroll, parent chips |
| `db-b.html` | DB-B phone + web: month pick, empty, scroll, parent chips |
| `db-c.html` | DB-C phone + web: chips/Days, empty, scroll, parent chips |

**RECOMMENDED NEXT ACTION:** PM pick among DB-A/B/C; QA Supervisor IQG; no Eng until dual stamp.
