# CAL-R3 IQG — Real-world intent (hybrid R3-C + lean composer)

**Date:** 2026-09-14  
**Author:** qa-supervisor (Kelyra)  
**Card:** `t_0e246d9f` · Parent: `t_b366690c` · Process: `notes/company/INTENT_QUALITY_GATE.md`  
**Feature:** CAL-R3 — Apple Calendar iPhone UX quality on Kelyra Calendar (views/motion) while keeping school/family laws  
**Status:** Design-stage IQG intent. **QA Supervisor DESIGN STAMP: APPROVED.** Dual stamp still needs PM on `calendar-r3-pm-lock.md`. **No Eng until Chuck says send.** No app code / SQL / git on this card.

**CEO lock (2026-09-14):** Hybrid = **R3-C views/motion** + **lean composer** + **DROP Reminders** + **HOLD CE-A / Desk / Diary**.  
**SoT read:** `calendar-r3-{qas-brief,delta-vs-current,ux-options,motion,gaps,kelyra-current,video-benchmark,pm-brief}.md` · R2 law `calendar-r2-pm-lock.md` · frames/mockups under `notes/company/calendar-r3-*`.

---

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: CAL-R3 Calendar hybrid (R3-C views/motion + lean composer)
Quality goals: hats+dual-hat seat; CE-A entry; year/month/week/day/multiday+RM lifecycle; multiplicity; reverse/cancel; pinch≠RM-only; lean composer no Reminders; assign≠publish; hidden; sports; filters≠security; Desk/Diary/tray held
PM: (pending)  date:  profile-session:
QA Supervisor: APPROVED  date: 2026-09-14  profile-session: t_0e246d9f / qa-supervisor
Intent gaps remaining: none (must-include constraints in §0–§9; PM stories on lock file)
```

**QA Supervisor stamp meaning:** Option space covers real-world intent without inventing chrome. Hybrid lock + R2 holds specify hats, CE-A entry, full view lifecycle (incl. reverse/cancel + RM multi-day stepper), multiplicity, lean composer, and explicit non-goals. Not happy-path-only. This is **not** product-complete and does **not** authorize Eng.

---

## 0. Hybrid one-line law (binding for intent)

| Dimension | Lock | Not |
|---|---|---|
| **Views / motion** | **R3-C** — Year spine; Month grid/list; Day hour-gutter timeline; denser Week (+ phone Week); Multi-day pinch week↔3/5/7 + **RM stepper**; sheet springs | Year as Desk home; tray rewrite |
| **Composer** | **Lean (R3-A field set)** — title, dates DATE-P1, all-day, kind/category, body, AI draft-then-Save, visibility caption; optional Calendar layer row ≤4 role tints | Event\|Reminder tabs; Travel; URL; Attachments; Invitees; richer Alert/Repeat unless already in model |
| **Chrome** | **CE-A HOLD** — drawer Calendar all hats; teacher quiet Desk link; dual-hat by **active seat** | 6th tray; CE-C |
| **Desk / Diary** | **HOLD** — Desk owns Today/This week; Calendar ≠ Diary; no Reminders→Diary map | Diary tab on Calendar; Inbox Publish on Calendar |
| **Layers / color** | **LF-A chips primary** (do not demote); Calendars sheet secondary; ≤4 role tints; ban per-cal rainbow | Rainbow; chips deleted |
| **R2 product laws** | CAL-01…24 still hold except **VW-A view-set expansion** Chuck approved (year/month/multiday in) | Soften assign≠publish / hidden / sports / AI Save |

---

## 1. Hats — who uses CAL-R3

### 1.1 Teacher

| Intent | Specified? | Where |
|---|---|---|
| Open Calendar CE-A; seat=teacher scope (active class + school) | Yes | R2 US-T-01; CE-A hold |
| Scan load: Agenda/Day + **Year/Month/Week/Multi-day** without losing Hidden dues | Yes | R3-C views; DP-A keep |
| Create/edit class or personal via **lean** CR-A sheet; AI draft-then-Save | Yes | Lean composer; CAL-09 |
| Publish product stays Needs; badge DP-A; no Calendar Inbox | Yes | DROP Inbox; CAL-07 |
| Multi-class This class / All my classes; filters ≠ security | Yes | CAL-04; LF-A |
| Phone Week available; web Week denser + all-day/hour gutter | Yes | Delta §4; R3-C |

### 1.2 Student

| Intent | Specified? | Where |
|---|---|---|
| CE-A entry; published + own study only; no hidden quizzes | Yes | R2 US-S-*; CAL-06 |
| Same view spine (year/month/day/week/multiday) **read-scoped** | Yes | R3-C shell + hat walls |
| Lean composer: own study/personal only; no school-wide create | Yes | CAL-13 |
| Sport opt-in; Unsubscribe ≠ Delete | Yes | CAL-08; MG-A |

### 1.3 Parent

| Intent | Specified? | Where |
|---|---|---|
| CE-A; **CH-A focused child** before load when 2+ | Yes | CAL-03; twins fail closed |
| Views show **focused child only**; switch reloads + clears selection | Yes | R2 CH-A + R3 views |
| Absence/personal lean composer; visibility caption; not Diary | Yes | Lean CR-A; CAL-11 |
| Sport layer for focused child opt-in | Yes | CAL-08 |

### 1.4 Office / superintendent

| Intent | Specified? | Where |
|---|---|---|
| CE-A; school CRUD lean composer | Yes | R2 US-O-*; no firehose |
| Year/Month school-year scan (holiday / early release) | Yes | R3-C year/month Add |
| Teachers cannot delete school events | Yes | MG-A; CAL-14 |

### 1.5 Dual-hat (teacher+parent / office+parent)

| Intent | Specified? | Where |
|---|---|---|
| Calendar follows **active seat** only (CAL-20) | Yes | R2; CE-A hold |
| Teach/Office seat: teach/office scope — no parent child mash | Yes | Dual-hat by seat |
| Parent seat: CH-A child calendar — no teach hidden quizzes | Yes | Seat rebuild |
| Never merge trays; never invent dual-hat-only Calendar chrome | Yes | No invent chrome |

### 1.6 Signed-out / student non-goals

| Intent | Specified? |
|---|---|
| Signed-out: no Calendar surface | Yes — auth wall |
| Student school-wide create | **No — locked non-goal** |

---

## 2. Chrome entry (still CE-A)

| Hat | Entry | Must not |
|---|---|---|
| All signed-in hats | Drawer **Calendar** (CE-A) | 6th tray slot |
| Teacher | + quiet Desk text link “Calendar” (discoverability) | ClassTab / tray peer; Desk replaced by Year |
| Dual-hat | Same noun; **seat switch** rebuilds scope | Parent calendar on Teach seat |
| Inside Calendar only | Today + view switcher **route-local** (R3-C shell) | Misread as system tray rewrite |
| Publish / Inbox | **Needs owns Publish**; no Apple Inbox glyph on Calendar | Publish product moved onto Calendar |

**Chrome invent ban:** no new View-stroke glyphs on this card; icon recipes only if later Eng via `npm run icons`. Do not invent a sixth tray or Desk-year-home to “match Apple.”

---

## 3. Full lifecycle — views (start → change → finish)

### 3.1 View set (R3-C hybrid)

| View | Job | Start | Change | Finish / leave |
|---|---|---|---|---|
| **Year** | School-year scan; 2-col mini-months; ≤4 role/category dots | Open from view switcher; land **not** as app home | Scroll years; Today jump; tap month → Month/Day drill (M-YEAR-DRILL) | Leave via view switch or drawer back; does not replace Desk |
| **Month** | Grid and/or month+list hybrid | From year drill or switcher | Continuous scroll; title sticky; select day → Day | Same |
| **Agenda (list)** | School glance list (14-day heritage kept as list mode) | Phone **default remains Agenda** (school-safe; Year is spine not home) | Range prev/next; filters | Same |
| **Day** | Hour-gutter timeline + all-day strip + timed blocks + Hidden badge | From switcher / day tap | Swipe optional (enhancing); Prev/Today/Next essential | Same |
| **Week** | 7-col plan (web teacher primary-capable; phone Week available) | Web teacher default Week holds | Denser all-day + hour gutter; category-primary marks | Same |
| **Multi-day** | 3/5/7 columns for conferences / game stretches | From Week via pinch **or** stepper | Pinch full-motion; **RM: stepper only** | Return 7-day Week; prefs OK per seat+device |

**Must-include defaults (intent law):**  
1. Phone default = **Agenda** (or PM-locked Month-list) — **not Year as cold-start home**.  
2. Web teacher default = **Week**.  
3. Office may prefer Month/Year for school home scan — still CE-A entry, Desk untouched.  
4. Last view remembered per **seat + device class** (local prefs OK).

### 3.2 Layers / Calendars sheet lifecycle

```
open Calendars sheet → Enable/Disable layer (not Delete)
  → team row ⋯ Unsubscribe (confirm; ≠ Delete)
  → search when ≥8 layers
  → optional Show all; role-tint dots ≤4
  → dismiss; filters refresh views; never elevate RLS
```

### 3.3 Composer lifecycle (lean)

```
+ or edit or Ask draft → CR-A sheet/modal
  → fields: title, DATE-P1 start/end, all-day, kind/category, body
  → optional Calendar layer row (≤4 role tints) — chips stay primary on main surface
  → AI banner “Review draft — not saved” when draft
  → visibility caption by seat/kind
  → Save commits | X/Discard dirty → confirm | clean dismiss
  → no Reminder tab; no Travel/URL/Attachments/Invitees
```

---

## 4. Multiplicity

| Case | Intent law |
|---|---|
| Multi-child parent | CH-A focus required; every view + composer bind `child_student_id`; twins never unlabeled merge |
| Multi-class teacher | This class default; All my classes explicit; 5th ≠ 3rd |
| Multi-team sport | Opt-in per membership; Unsubscribe per team; events remain for others |
| Multi-device | Prefs per seat+device class; no cross-seat bleed |
| Multi-layer density | 2/5/10/20+ behaviors (search ≥8); VZ-A category-primary; ban rainbow |
| Multi-day columns | 3/5/7 only — not free-form N; RM stepper always available when multi-day ships |

---

## 5. Reverse / cancel / already-in-flow

| Flow | Reverse / cancel |
|---|---|
| Dirty composer | Scrim/back → confirm Keep editing / Discard (M-SHEET-DIRTY); **no shake** |
| Clean sheet | Dismiss / X |
| Saved event owner | Edit or Delete (confirm danger); non-owners cannot delete school |
| Hide / Publish (teacher) | DP-A badge; Publish via Needs deep-link; Hide keeps teacher-only; family never sees hidden |
| Layer Disable | Re-Enable; ≠ Delete event data |
| Unsubscribe team | Confirm; reverse = re-join/opt-in path (existing membership flows) — not silent re-add |
| Multi-day pinch | Reverse pinch or stepper back to 7 |
| Year/Month drill | Back / view switch; Today jump |
| AI draft | Discard drops draft; never auto-Save; never auto-Publish |
| Offline Save/Delete | Fail closed; no fake success (CAL-24) |

---

## 6. Pinch vs RM stepper (multi-day)

| Mode | Control | Motion class |
|---|---|---|
| Prefers normal motion | **Pinch** week grid 7↔5↔3 (M-PINCH-MULTIDAY) enhancing | Continuous + settle spring ≤250ms |
| Reduce Motion ON | **No pinch required** — **M-MULTIDAY-STEPPER** 3 / 5 / 7 essential | Instant or ≤120ms recount |
| Always (a11y) | Stepper **must exist** whenever multi-day ships — pinch never sole path | Essential control |
| Screen readers | Announce view name + column count on change | — |

**Ban:** multi-day only reachable by pinch; parallax year; error-shake; confetti on Save.

---

## 7. Composer lean (no reminder) — field law

| In (lean) | Out (non-goals this card) |
|---|---|
| Title | Event \| Reminder tabs |
| DATE-P1 start/end (optional inline month **skin** only — no second date system) | Travel time |
| All-day | URL |
| Kind / category (LF-A language) | Attachments |
| Body / notes | Invitees mesh |
| AI draft banner + Save gate | Alert/Repeat **unless already in data model** (if not, omit — no fake fields) |
| Visibility caption | Diary / journal body |
| Optional Calendar layer row ≤4 role tints | Per-calendar unique bright hue |

---

## 8. Explicit non-goals (not built ≠ done)

1. **Apple Reminders tab** — DROP; do not map to Diary  
2. **Diary on Calendar** — CAL-11 holds  
3. **6th tray / CE-C**  
4. **Desk replacement** (Year/Month as app home / Today shelf)  
5. **Calendar Inbox** owning Publish  
6. **Travel / URL / Attachments / Invitees** composer parity  
7. **iCal / Google two-way / RSVP mesh** (still later)  
8. **Rainbow per-calendar colors**  
9. **is_staff widen**, class-create, student-insert, twin merge, grade Approve from Calendar/Ask  
10. **Invent chrome** outside CE-A + route-local view chrome  
11. **SportsYou / consumer iCloud account model as product**  
12. **Error-shake / confetti / required shimmer / parallax**

---

## 9. Must-include behaviors (prove-out seeds — not Eng now)

1. Every hat opens Calendar via **CE-A** only; dual-hat seat-correct scopes.  
2. Year + Month + Day timeline + Week + Multi-day + Agenda list mode all exist per hybrid; phone cold-start ≠ Year-as-Desk.  
3. Hidden quiz stays teacher-only across **all** new views; family queries exclude.  
4. Assign ≠ publish unchanged when dues appear on timeline blocks.  
5. Parent twins: focus switch reloads year/month/week/day/multiday identically.  
6. Pinch multi-day works; **RM stepper** alone reaches 3/5/7.  
7. Lean composer: no Reminder tab; Save/Discard/dirty confirm; AI never auto-commits.  
8. Sports default off; Unsubscribe copy ≠ Delete.  
9. Filters/chips never reveal RLS-denied items.  
10. Non-goals above remain absent without being claimed “done.”

---

## 10. Gaps check (stamp gate)

| IQG question | Covered by option space? | Verdict |
|---|---|---|
| Hats + dual-hat | Yes — R2 matrix + seat SoT + R3 shell | Pass |
| Chrome entry | Yes — CE-A HOLD; no invent | Pass |
| Full lifecycle views | Yes — §3 + motion catalog | Pass |
| Multiplicity | Yes — §4 | Pass |
| Reverse/cancel | Yes — §5 | Pass |
| Pinch vs RM | Yes — §6 | Pass |
| Composer lean | Yes — §7 | Pass |
| Non-goals | Yes — §8 | Pass |
| Missing chrome forcing invent? | **No** — drawer + route-local switcher suffice | Pass — **do not REJECT** |

**Intent gaps remaining:** none for design-stage. PM must still land stories/AC on `calendar-r3-pm-lock.md` (parallel). Open product tension **resolved in intent law**: phone default Agenda (not Year home); LF-A chips stay primary (override raw R3-C chip demotion).

---

## 11. DITL IMPACT

```
DITL IMPACT
Change: CAL-R3 hybrid — add Year/Month/Week-phone/Multi-day+RM + day timeline polish + lean composer; CE-A/Desk/Diary hold; Reminders drop
Verdict: UPDATE_PLANS
Plans touched: DITL-T-01..T-05; DITL-P-01..P-03; DITL-O-01..O-07; DITL-S-01..S-03; DITL-DH-01..DH-02 — add CE-A Calendar entry + view-spine steps (year/month/day/week/multiday or Agenda default) where dated load is in the day job; dual-hat seat calendar scope
Cases touched: matching cases after plan rewrite (CoS files tracker; Chuck unblocks rewrite)
New DITL needed: no (absorb into existing role days; optional later calendar-heavy day only if Chuck wants dedicated spine drill)
Seed/artifacts: update seed if calendar fixtures missing for year dots / multi-day / hidden-across-views
Notes: Current ditl-plans/cases have ~zero Calendar coverage; R3 makes omission stale. Do not rewrite DITL on this card. CoS files sticky DITL-UPDATE tracker only.
```

---

## 12. Next (CoS / PM / Chuck)

1. **PM** stamps `calendar-r3-pm-lock.md` (stories/AC delta vs R2 VW-A) — parallel.  
2. **Dual stamp** (PM + this QAS APPROVED) → CoS reports Chuck.  
3. **Hold Engineering** until Chuck explicit **send**. No qa-loop / bot-build / architect implement from stamps alone.  
4. After send + implement terminal: QAS writes prove-out OBJECTIVE from §9; CoS staffs `qa-engineer`.  
5. CoS files `DITL-UPDATE:` sticky from §11 (no auto-unblock).

**Related:** parent `t_b366690c` · IQG `INTENT_QUALITY_GATE.md` · DITL `DITL_OS.md` · designer delta `calendar-r3-delta-vs-current.md` · motion `calendar-r3-motion.md`.
