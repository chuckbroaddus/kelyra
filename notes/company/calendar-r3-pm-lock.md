# CAL-R3 — Calendar PM lock (hybrid)

**Date:** 2026-09-14  
**Author:** product-manager (Kelyra)  
**Card:** `t_6cfc3988` · Parent track: `t_b366690c`  
**CEO clarify:** A,A,A — overall **R3-C** views/motion; **lean** composer; **DROP** Reminders; **HOLD** CE-A / Desk / Diary  
**Options:** `notes/company/calendar-r3-ux-options.md` · delta `calendar-r3-delta-vs-current.md` · motion `calendar-r3-motion.md`  
**Prior law:** `notes/company/calendar-r2-pm-lock.md` (CAL-R2) — **still binding** except view-set / motion expansions locked here  
**Status:** BINDING product lock for R3 surface picks + stories/AC delta. Spec only — **no** app code, SQL, Edge, qa-loop, git, ui-design patch, or Eng staffing on this card.

**Parallel IQG:** QA Supervisor owns `notes/company/calendar-r3-intent.md`. Dual stamp required. CoS stops until Chuck **send**.

---

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: KELYRA Calendar (CAL-R3 hybrid)
Quality goals: R3-C views+motion; lean composer; CE-A hold; Desk intact; Calendar≠Diary; hats/twins; assign≠publish; hidden; sports opt-in; AI draft-then-Save; LF-A chips primary; ≤4 role tints; DATE-P1 only; RM multi-day stepper; no 6th tray; no Inbox; no rainbow
PM: APPROVED  date: 2026-09-14  profile-session: product-manager / t_6cfc3988
QA Supervisor: (leave for QAS)
Intent gaps remaining: none (PM side); QAS may still list intent gaps on calendar-r3-intent.md
```

**Dual stamp required before Architect / Engineering.** This card stamps PM only. **Do not staff Eng. Chuck must still send.**

---

## 0. Hybrid pick summary (binding)

| Lane | Lock | One-line |
|---|---|---|
| Views + motion | **R3-C** | Year spine; month grid/list; day hour-gutter timeline; denser week + phone week; pinch week↔multi-day + RM 3/5/7 stepper; sheet springs |
| Composer fields | **R3-A lean** | Title/dates/all-day/kind/category/body/AI banner/visibility; drop Reminder/Travel/URL/Attachments/Invitees; omit Alert/Repeat (no model editor) |
| Color / layer pick | **R3-C row + LF-A hold** | Composer “Calendar” row ≤4 role tints; **chips stay primary** (do **not** demote) |
| DATE | **DATE-P1 + skin** | Keep primitive; optional inline month skin only — no second date system |
| Calendars sheet | **MG-A + tint** | Keep verbs; role-tint dots; no Apple Inbox |
| Chrome / home / diary | **HOLD R2** | CE-A drawer; Desk not replaced; Calendar≠Diary; no 6th tray |

**Designer pack relationship:** Accepts R3-C view/motion shell with **explicit overrides**: lean composer (not R3-C rich fields); LF-A chips remain primary (reject R3-C chip demotion). No competing pack drawn by PM.

---

## 1. Why this hybrid (rationale)

### 1.1 Views/motion = R3-C (Chuck overall A)

1. CEO chose Apple density: year, month, multi-day pinch, motion bar from video.  
2. R3-A alone leaves year/multi-day gaps Chuck approved closing.  
3. R3-B stops short of multi-day; Chuck took full C on views.  
4. Desk risk managed by **HOLD CE-A** — year is Calendar destination, not Desk home.

### 1.2 Composer = R3-A lean (Chuck composer A)

1. Kelyra fields already cover school create job + AI draft-then-Save.  
2. Reminder tab **DROP** — Calendar≠Diary; no Reminders product.  
3. Travel/URL/Attachments/Invitees = fake scope without backend.  
4. Alert/Repeat: `recurrence_*` null v1 / no editor → **omit** (do not paint dead controls).

### 1.3 Color = R3-C row; chips stay primary

1. Composer Calendar row with ≤4 role tints matches Apple picker without rainbow.  
2. R3-C pack allowed chip demotion — **rejected** here: school language (“tests only”) stays LF-A primary.  
3. VZ-A + micro VZ-B still law; ban per-calendar unique bright hues.

### 1.4 DATE-P1 hold + optional skin

One date primitive law. Inline month expand is **skin** of DATE-P1 only — never a third picker.

### 1.5 Never (fail closed)

6th tray · Desk replacement · Diary on Calendar · Apple Inbox on Calendar · rainbow per-cal · auto-save AI · twin unlabeled merge.

---

## 2. Locked decision table (R3)

| # | Decision | PM lock | Notes |
|---|---|---|---|
| 1 | Chrome entry | **CE-A HOLD** | Drawer Calendar; teacher quiet Desk link; not tray |
| 2 | View pack | **VW-R3-C** (supersedes VW-A cut) | Year · Month · Day timeline · Week · Multi-day · Agenda list mode |
| 3 | Phone defaults | **Agenda primary** still | Year/Month/Week/Multi-day via in-Calendar switcher; must not steal Desk |
| 4 | Web defaults | **Week teacher; Month office** | All views available; denser week |
| 5 | Day structure | **Hour gutter + all-day + blocks** | Change from card-list DayColumn |
| 6 | Multi-day | **Pinch 7↔5↔3 + RM stepper** | M-PINCH-MULTIDAY enhancing; M-MULTIDAY-STEPPER essential |
| 7 | Layers | **LF-A HOLD primary** | ChipRow multi-select stays on-canvas; Calendars sheet secondary |
| 8 | Composer | **CR-A shell + lean fields** | Sheet/modal; AI banner; no Reminder tab |
| 9 | Composer color | **Calendar row ≤4 role tints** | Not unique hue per calendar |
| 10 | DATE | **DATE-P1** | Optional inline month skin only |
| 11 | Calendars sheet | **MG-A + tint dots** | Enable/Disable; Unsubscribe≠Delete; no Inbox |
| 12 | Hidden / publish | **DP-A HOLD** | Needs owns Publish; no Calendar Inbox |
| 13 | Motion | **R3-C catalog** | See §5; R2 bans still hold |
| 14 | Child / hats / sports / AI | **R2 HOLD** | CH-A; CAL-01…24 unchanged except CAL-16 |
| 15 | iCal / RSVP / rich recurrence | **Later** | Unchanged non-goal |

---

## 3. Comparison vs CAL-R2 (what changes / what holds)

### 3.1 Holds (fail closed — not reopened)

| Law | Status |
|---|---|
| CE-A drawer; no 6th tray | **Holds** |
| Desk not replaced; Calendar ≠ Diary | **Holds** |
| Hats; focused child; no twin unlabeled merge | **Holds** |
| Assign ≠ publish; hidden quizzes teacher-only; DP-A | **Holds** |
| Sports opt-in; Unsubscribe ≠ Delete | **Holds** |
| AI ⊆ visible + draft-then-Save; no class-create / student-insert | **Holds** |
| LF-A chips primary + Calendars sheet secondary | **Holds** (R3-C demotion **rejected**) |
| VZ-A + micro VZ-B; ≤4 role tints; ban rainbow | **Holds** |
| MG-A lifecycle verbs pure | **Holds** |
| DATE-P1 owns date entry | **Holds** (+ optional skin) |
| ST-A honest empty/loading/error/offline | **Holds** |
| Motion bans (shake/confetti/parallax/required shimmer) | **Holds** |
| iCal / RSVP / rich recurrence later | **Holds** |
| CAL-01…15, CAL-17…24 product laws | **Holds** |

### 3.2 What CAL-R3 **changes** (authorized)

| Change | Was (R2) | Now (R3) |
|---|---|---|
| **CAL-16 Views** | VW-A: phone Agenda+Day; web Week/Month/Day/Agenda; **no year** | **VW-R3-C:** add Year spine; dedicated Month grid/list; Day = hour-gutter timeline; denser Week + **phone Week**; Multi-day 3/5/7; Agenda remains list mode |
| **Phone view availability** | Week/Month overflow only | Year/Month/Week/Multi-day first-class **inside Calendar route** (still not tray) |
| **Day chrome** | Card rows | Timeline: hour gutter, all-day strip, timed blocks; Hidden badge stays |
| **Week chrome** | TeacherWeekGrid chips | Denser: all-day row + hour gutter when timed; phone Week primary-capable |
| **Motion** | R2 essential sheet/range/badge/skeleton | + M-YEAR-DRILL, M-MONTH-SCROLL, M-PINCH-MULTIDAY (enhancing), M-MULTIDAY-STEPPER (essential), sheet springs |
| **Composer presentation** | CR-A fields | Same lean fields; Apple-like hierarchy + springs; optional Calendar row tints |
| **Calendars sheet visual** | Toggles + ⋯ | + role-tint dots; optional Show all clarity; still no Inbox |
| **DATE skin** | DATE-P1 only | Optional inline month expand **skin** under Starts/Ends |

### 3.3 What CAL-R3 **does not** change

- Does not replace Desk with year/month home.
- Does not add system tray sixth slot.
- Does not ship Reminders tab or map Reminders → Diary.
- Does not ship Travel, URL, Attachments, Invitees, Alert, or Repeat editors.
- Does not demote category chips to a buried filter-only menu.
- Does not invent a second date-entry system.
- Does not move Publish product owner off Needs/To-Do.
- Does not authorize Eng or qa-loop from this card.

### 3.4 Rejected alternatives (this lock)

| Option | Disposition | Reason |
|---|---|---|
| R3-A only (no new views) | **Rejected** | CEO overall = R3-C |
| R3-B (year/month, no multi-day) | **Rejected as sole** | CEO took multi-day + pinch |
| R3-C rich composer fields | **Rejected** | CEO lean composer |
| R3-C chip demotion | **Rejected** | School chip language must stay primary |
| Apple Inbox on Calendar | **Banned** | Needs owns publish queue |
| Reminder tab any mapping | **Banned** | Calendar≠Diary |
| Per-calendar rainbow | **Banned** | A11y + clutter |
| Year as app home / Desk | **Banned** | TEACH-UX |

---

## 4. Product laws (CAL-R3 binding delta)

R2 **CAL-01…CAL-24** remain binding except **CAL-16** replaced below. New IDs are additive.

| Law ID | Lock |
|---|---|
| **CAL-16** | **Views VW-R3-C** (replaces R2 VW-A cut). Supported: **Year**, **Month** (grid and/or month+list), **Day** (hour-gutter timeline + all-day), **Week** (denser; phone + web), **Multi-day** (3/5/7 columns), **Agenda** (list mode). Phone default remains **Agenda** (school glance). Web defaults: teacher **Week**, office **Month**. Year/Month are Calendar-route destinations only — never Desk home, never tray tab. |
| **CAL-25** | **Year spine.** 2-col mini-months (or equivalent density), year title, Today, Calendars entry, event marks via **category/role dots only** (≤4 tints). Tap month → month/day (M-YEAR-DRILL). No Inbox glyph. |
| **CAL-26** | **Month grid/list.** Dedicated month continuum and/or month header + list hybrid. Agenda 14-day list may remain as Agenda mode. Must not replace Desk “today” job. |
| **CAL-27** | **Day timeline.** Hour gutter + all-day strip + timed blocks. DP-A Hidden badge on teacher rows. Swipe day = enhancing; buttons always available. |
| **CAL-28** | **Week density + phone Week.** Web week gains all-day row + hour labels when timed items exist. Phone Week is first-class (not overflow-only). Teacher web stays Week-led. |
| **CAL-29** | **Multi-day.** Pinch week↔multi-day (7↔5↔3 or 7↔5↔3↔5↔7) when motion OK. **Reduced-motion / a11y:** no pinch requirement — **stepper 3 / 5 / 7 days** always available (M-MULTIDAY-STEPPER essential). |
| **CAL-30** | **Composer lean (CR-A fields).** Keep: title, starts/ends (DATE-P1), all-day, kind, category, body/notes, AI “Review draft — not saved” banner, visibility caption, Save commits / Discard dirty. **Drop:** Reminder tab, Travel, URL, Attachments, Invitees. **Omit:** Alert and Repeat controls unless a real model+editor already ships (today: recurrence null v1 → omit). |
| **CAL-31** | **Composer Calendar row.** Optional layer/calendar pick with ≤4 role tints (Academic · School · Sport · Personal or product-equivalent). Never unique bright hue per calendar. Does not replace LF-A chips. |
| **CAL-32** | **LF-A chips primary (R3 override).** Category ChipRow + presets remain primary on-canvas. R3-C pack chip demotion is **out of lock**. Calendars sheet stays secondary management. |
| **CAL-33** | **DATE-P1 skin only.** Inline month expand under Starts/Ends is visual skin of DATE-P1. No third date system; no parallel Apple-only picker SoT. |
| **CAL-34** | **Calendars sheet — no Inbox.** Keep Enable/Disable, Unsubscribe≠Delete, search ≥8, “filters ≠ security” hint; add role-tint dots; optional explicit Show all. **No** Apple Inbox / publish queue on this sheet. |
| **CAL-35** | **Motion R3-C.** Essential set includes R2 essentials + year drill + month scroll + multi-day stepper + sheet springs. Pinch multi-day is enhancing (full motion only). Bans unchanged: M-ERROR-SHAKE, confetti, parallax, required shimmer, required save-check, auto-open Inbox. |
| **CAL-36** | **In-Calendar chrome only.** Today + view switcher live **inside** `/calendar` route. Must not be misread or implemented as system tray rewrite. |

---

## 5. Motion lock (R3-C)

Source of truth detail: `notes/company/calendar-r3-motion.md`. Binding class summary:

### 5.1 Essential (ship with surface; RM = instant/fade)

| ID | Trigger | RM substitute |
|---|---|---|
| M-SHEET-PRESENT / DISMISS | Composer, Calendars, menus | ≤120ms fade or hard cut |
| M-SHEET-DIRTY | Scrim/back while dirty | Instant confirm dialog; **no shake** |
| M-RANGE-SHIFT | Prev/Next day·week·agenda·multi-day | Instant swap + VO announce |
| M-BADGE-STATE | Hidden → published | Instant text swap |
| M-SKELETON | Loading | Static structure; no required shimmer |
| M-YEAR-DRILL | Tap mini-month/day | Hard cut to month/day |
| M-MONTH-SCROLL | Month continuum | Native scroll; no parallax title |
| M-MULTIDAY-STEPPER | 3/5/7 control | Instant column recount |
| Today jump (position) | Today control | Instant anchor (spring = enhancing) |

### 5.2 Enhancing (drop under RM)

M-TODAY spring · M-VIEW-SWITCH crossfade · M-FILTER-APPLY · M-DAY-SWIPE · M-DATE-INLINE · M-COLOR-POP · **M-PINCH-MULTIDAY**

### 5.3 Bans

M-ERROR-SHAKE · confetti/celebration on Save · M-PARALLAX-YEAR · M-SHIMMER-REQUIRED · M-SAVE-CHECKMARK-REQUIRED · M-AUTO-OPEN-INBOX

### 5.4 Gesture conflict

Tray swipe / drawer edge wins over day swipe. Multi-day pinch must not capture system gestures.

---

## 6. Quality goals (PM owns — R3 delta)

| # | Goal | Measurable intent |
|---|---|---|
| QG-1 | **Complete hats** | Teacher, student, parent, office each reach CE-A Calendar; dual-hat seat-correct on every new view. |
| QG-2 | **Full view lifecycle** | Open Year, Month, Day timeline, Week, Multi-day (3/5/7), Agenda; switch among them; Today; back; last-view prefs per seat+device. |
| QG-3 | **Multi-day a11y** | Pinch optional; stepper always; RM never requires pinch; VO announces column count / view name. |
| QG-4 | **Multiplicity** | Multi-class, multi-child, multi-team still correct on year dots and multi-day columns (no twin mash). |
| QG-5 | **Assign ≠ publish** | Hidden quiz dues never appear on family year/month/day/week/multi-day. |
| QG-6 | **AI safe** | Search ⊆ visible across views; add always lean CR-A draft; refuse over-scope. |
| QG-7 | **Calm chrome** | CE-A + in-route switcher; chips primary; ≤4 tints; no rainbow; no Inbox; Desk intact. |
| QG-8 | **Composer lean honesty** | No dead fields (Alert/Repeat/Travel/URL/Attachments/Invitees/Reminder). |
| QG-9 | **DATE one system** | Starts/Ends always DATE-P1; skin does not fork store format. |
| QG-10 | **States honest** | ST-A on every view including year empty year and multi-day empty range. |
| QG-11 | **Non-goals explicit** | Reminders, Inbox, 6th tray, Desk=year, Diary, iCal, rich recurrence — “not built” ≠ “done.” |

Happy-path-only (one hat, Agenda only, no multi-day RM, no year empty, published-only) = **REJECTED** stamp per IQG.

---

## 7. v1 scope · later · non-goals (R3)

### 7.1 R3 v1 surface (after dual stamp + Chuck send + architect + eng)

1. CE-A HOLD entry all hats  
2. **VW-R3-C** views: Year, Month grid/list, Day timeline, denser Week (phone+web), Multi-day 3/5/7, Agenda list  
3. Phone default Agenda; web Week (teacher) / Month (office)  
4. LF-A chips primary + Calendars sheet + role-tint dots (no Inbox)  
5. CR-A lean composer + AI draft-then-Save + optional Calendar row ≤4 tints  
6. DATE-P1 (+ optional inline month skin)  
7. DP-A Hidden + Needs Publish ownership  
8. Motion R3-C essentials + RM contract  
9. All R2 hat/twin/sport/AI/security laws  
10. ST-A / MG-A unchanged verbs  

### 7.2 Later (explicit)

| Feature | Why later |
|---|---|
| Rich recurrence / Alert editors | Model null v1; complexity |
| Travel, URL, Attachments, Invitees | No backend product |
| Apple Reminders product / Diary merge | Banned product collision |
| Calendar Inbox / publish queue | Needs owns Publish |
| iCal / Google two-way | OAuth + conflict |
| Chip demotion / filter-menu-only | Discoverability risk; reopen only with CEO |
| CH-C dual-pane parent | Power compare |
| CE-C tray tab | Only future CEO |
| Drag-reschedule on grid | Polish |
| Per-calendar custom colors beyond 4 roles | Rainbow ban |

### 7.3 Non-goals (fail closed — copy into Eng tickets)

- 6th teacher tray tab  
- Replace Desk Today/This week with Year or Month home  
- Diary / journal / Reminders tab on Calendar  
- Apple Inbox on Calendar  
- Travel, URL, Attachments, Invitees, Alert, Repeat UI without model  
- Per-calendar rainbow palette  
- Twin unlabeled merge  
- Auto-save AI drafts  
- Class create / student insert from Calendar or Ask  
- `is_staff` widen for family/hidden  
- Second date-entry primitive  
- Gesture theft of drawer/tray edges  
- Invent View-stroke glyphs without icons pipeline  

---

## 8. User stories + acceptance (delta vs R2 VW-A)

R2 §7 stories remain base law. Below are **new or replaced** IDs for R3 prove-out. Unlisted R2 stories (US-T-01, US-T-03… hats/lifecycle) still bind.

### 8.1 Replaced view story

**US-T-02 — Views (VW-R3-C)** *(replaces R2 US-T-02 VW-A)*  
As a **teacher on phone**, I land on **Agenda** with Day secondary; I can switch to **Year, Month, Week, Multi-day** inside Calendar without a tray tab. On **web**, Week is default with Day/Agenda/Month/Year/Multi-day available.  
**AC:**  
1. Phone default = Agenda (not Year as home).  
2. All VW-R3-C views reachable via in-Calendar switcher.  
3. Today jumps anchor in current view.  
4. Last view remembered per seat + device class (local prefs OK).  
5. Dual-hat seat switch rebuilds the active view scope (no cross-seat leak).  
6. No system tray sixth slot; back leaves Calendar to prior surface.

### 8.2 New view stories

**US-T-11 — Year spine (CAL-25)**  
As a **teacher/parent/office**, I open Year and scan mini-months with role/category dots.  
**AC:**  
1. Year shows mini-months + year title + Today + Calendars entry.  
2. Dots use ≤4 role/category tints — not unique hue per calendar.  
3. Tap month drills to Month or Day (RM = hard cut).  
4. **No Inbox** control.  
5. Family year never shows teacher-hidden quizzes.  
6. Parent year is **focused child** only (CH-A).  
7. Empty year range = ST-A honest empty, not fake dots.

**US-T-12 — Month grid/list (CAL-26)**  
As a **user**, I browse a dedicated Month grid and/or month+list hybrid.  
**AC:**  
1. Month continuum or month header + list works; title sticky without parallax.  
2. Selecting a day opens Day timeline or list for that day.  
3. Does not become Desk home.  
4. Filters (LF-A) apply; empty filtered state offers Clear.  
5. Office may default Month on web; teacher web still Week-led.

**US-T-13 — Day timeline (CAL-27)**  
As a **user**, Day shows hour gutter, all-day strip, and timed blocks (not card-only list).  
**AC:**  
1. All-day row separate from timed gutter.  
2. Teacher Hidden badge (DP-A) visible on hidden dues.  
3. Prev/Today/Next always available; swipe optional (enhancing).  
4. VO: time + title + category + visibility + source.

**US-T-14 — Week denser + phone Week (CAL-28)**  
As a **teacher on web**, Week shows denser all-day + hour structure; as a **user on phone**, Week is first-class.  
**AC:**  
1. Web Week not card-only chips without time structure when timed items exist.  
2. Phone Week available without “More-only” exile.  
3. Today ring/indicator present; category-primary marks hold (VZ-A).  
4. Class wall: 5th ≠ 3rd without All my classes.

**US-T-15 — Multi-day + RM stepper (CAL-29)**  
As a **parent/teacher**, I view 3, 5, or 7 day columns for conferences/games.  
**AC:**  
1. Stepper **3 / 5 / 7** always present and works with RM ON (no pinch required).  
2. Full motion may pinch week↔multi-day; RM disables pinch animation/requirement.  
3. Column recount announces view/column count to VO.  
4. Focused child / hat scope unchanged across column counts.  
5. Empty multi-day = ST-A; no insecure partial load.

**US-S-05 / US-P-06 — Student/Parent reach new views**  
As **student** or **parent**, I can open Year/Month/Day timeline/Week/Multi-day/Agenda under my seat rules.  
**AC:** Same visibility matrix as R2; parent requires CH-A focus before load; student never sees hidden quizzes; sport layers off until opt-in on every view.

**US-O-04 — Office year/month scan**  
As **office**, Year/Month help scan school holidays/early releases.  
**AC:** School events visible per matrix; no parent doctor notes; no homework firehose; no teacher personal.

### 8.3 Composer / DATE / color / sheet stories

**US-X-06 — Lean composer (CAL-30)** *(extends US-T-06 / CR-A)*  
As any hat with create rights, + opens lean Event sheet (phone) / modal (web).  
**AC:**  
1. Fields present: title, DATE-P1 starts/ends, all-day, kind, category, body, visibility caption.  
2. AI draft shows “Review draft — not saved”; Save required.  
3. **Absent:** Reminder tab, Travel, URL, Attachments, Invitees, Alert, Repeat.  
4. Dirty dismiss confirms; clean X closes; nothing persisted on Discard.  
5. Does not create class, insert student, or file Diary.

**US-X-07 — Composer Calendar row (CAL-31)**  
As a creator, I may pick calendar/layer via Calendar row with ≤4 role tints.  
**AC:**  
1. Row does not invent per-cal rainbow.  
2. Kind/category chips/fields still drive school language.  
3. LF-A ChipRow remains visible primary on main Calendar (CAL-32).  
4. Color never sole meaning channel (text labels remain).

**US-X-08 — DATE-P1 skin (CAL-33)**  
As a creator, expanding Starts/Ends may show inline month skin.  
**AC:**  
1. Value still commits through DATE-P1 rules/store.  
2. No second picker SoT; Clear/Cancel semantics unchanged.  
3. RM: instant expand OK.

**US-X-09 — Calendars sheet tint, no Inbox (CAL-34)**  
As any hat, Calendars sheet toggles layers with tint dots.  
**AC:**  
1. Enable/Disable ≠ Delete; Unsubscribe ≠ Delete (sport).  
2. Role-tint dots ≤4 roles.  
3. **No Inbox** control or publish queue.  
4. Search appears at ≥8 layers; presets + optional Show all.  
5. Hint remains: filters are not security.

**US-X-10 — Chips stay primary (CAL-32)**  
As a teacher, “tests only” (or Academic chip language) remains one-tap on main Calendar chrome.  
**AC:** ChipRow not hidden solely inside Calendars sheet or overflow filter menu as the only path.

### 8.4 Motion / chrome stories

**US-X-11 — Sheet springs + dirty (CAL-35)**  
As any hat, composer/Calendars present with spring (RM fade); dirty blocks silent dismiss.  
**AC:** M-SHEET-*; no error-shake; VO focuses sheet title on present.

**US-X-12 — In-Calendar switcher ≠ tray (CAL-36)**  
As a teacher, Today + view controls inside Calendar do not add tray destinations.  
**AC:** System tray still 5 slots; Calendar remains drawer CE-A entry; Desk Today/This week unchanged.

### 8.5 R2 stories still binding (no rewrite)

US-T-01, US-T-03…US-T-10; US-S-01…04; US-P-01…05; US-O-01…03; US-X-01…05; US-AI-01…02 — still AC law. Hidden, Publish, sport, NL refuse unchanged on new views.

---

## 9. Route shape (indicative — Eng may rename)

`/calendar` query extensions vs R2:

- `view=` `agenda` | `day` | `week` | `month` | `year` | `multiday`
- `days=` `3` | `5` | `7` when `view=multiday` (default 5 or last prefs)
- `classId=` optional teacher scope  
- `childId=` required when parent has 2+ before data load  
- `date=` ISO anchor (default today)  
- `q=` optional NL/search echo  
- `highlight=` optional item id  

Prefs may store last `view` + `days` per seat+device. Deep links must not escalate privilege.

---

## 10. Lifecycle · multiplicity addenda (R3)

### 10.1 Multiplicity checklist add

| Dimension | Required R3 behavior |
|---|---|
| **Views** | Every hat can reach each VW-R3-C view under seat rules |
| **Multi-day columns** | 3/5/7 independent of pinch; prefs OK |
| **Year dots** | Density at many layers uses role/category marks; never rainbow explosion |
| **Devices** | Phone Agenda default; web Week/Month defaults; all views on both classes where feasible |
| **RM** | Stepper + hard cuts; no pinch requirement |

### 10.2 Reverse / cancel add

| Action | Reverse |
|---|---|
| Enter multi-day | Switch to week/day/agenda; stepper back to 7 |
| Year drill to month | Back/up to year or switcher |
| Pinch column change | Stepper or reverse pinch; RM = stepper only |
| Open lean composer dirty | Discard confirm |
| Toggle Calendar row layer | Does not delete events |

---

## 11. Open issues residual · next

### 11.1 Resolved this lock (CEO 2026-09-14)

1. Overall pack = **R3-C** views/motion.  
2. Composer = **lean** (R3-A fields).  
3. Reminders tab = **DROP**; CE-A / Desk / Diary = **HOLD**.  
4. LF-A chips remain **primary** (override R3-C demotion).  
5. Alert/Repeat = **omit** (recurrence null v1; no fake controls).  
6. CAL-16 superseded by VW-R3-C; CAL-25…36 additive.

### 11.2 Still for architect / later (not PM blockers)

| # | Issue | Owner next |
|---|---|---|
| 1 | Year/month/multi-day component feasibility + perf on phone | software-architect after dual stamp + Chuck send |
| 2 | Exact multi-day column math / timezone edges | architect |
| 3 | Whether Month ships as grid-only, list hybrid, or both in one build slice | architect with designer tokens after send |
| 4 | Icon recipes for any new view chrome (no invent View-stroke) | eng via icons pipeline when staffed |
| 5 | Re-hide after publish still v1.1 OK | unchanged from R2 |
| 6 | Optional Show-all copy exact string | microcopy at eng |

### 11.3 IQG coordination

- PM stamp: **APPROVED** (this file).  
- QAS: write/complete `calendar-r3-intent.md` and stamp parent `t_b366690c`.  
- One REJECT = no Architect/Eng.  
- **After dual APPROVED:** CoS reports Chuck and **stops**.  
- **Hold Eng / qa-loop / bot-build until Chuck says send.**  
- **Do not** recommend staffing Engineering from this card.

---

## 12. Traceability

| Input | Use in this lock |
|---|---|
| CEO clarify A,A,A on `t_b366690c` | Hybrid picks §0 |
| `calendar-r3-ux-options.md` R3-C | Views/motion shell |
| R3-C chip demotion | **Rejected** → CAL-32 |
| R3-A composer lean | CAL-30 |
| `calendar-r3-delta-vs-current.md` | Line actions Keep/Add/Change/Drop |
| `calendar-r3-motion.md` | §5 motion classes |
| `calendar-r2-pm-lock.md` | Base laws; VW-A → VW-R3-C |
| `calendar-r2-architecture.md` recurrence null | Omit Alert/Repeat |
| DATE-P1 lock | CAL-33 skin only |

---

## 13. Handoff

- **OBJECTIVE:** Lock Chuck-approved R3 hybrid; stories/AC delta vs R2 VW-A; PM IQG stamp.  
- **CONTEXT:** CEO R3-C + lean composer + DROP Reminders + HOLD CE-A/Desk/Diary; designer packs + motion + delta.  
- **WORK PERFORMED:** Wrote binding `notes/company/calendar-r3-pm-lock.md`; PM APPROVED stamp; parent comment.  
- **VERIFICATION:** Hybrid lanes explicit; CAL-16 replaced; CAL-25…36 added; stories cover year/month/day/week/multiday/RM/lean composer/chips/DATE/Inbox ban; non-goals fail-closed; no Eng staffing recommended.  
- **RESULT:** PM APPROVED design stamp (awaiting QAS intent stamp).  
- **OPEN ISSUES:** §11.2; QAS parallel.  
- **ESCALATION NEEDED:** No (unless QAS REJECT).  
- **RECOMMENDED NEXT ACTION:** QAS completes `calendar-r3-intent.md` + stamps parent; CoS waits for dual stamp then **stops until Chuck send**. **Do not staff Engineering.**  
- **FILES:** `notes/company/calendar-r3-pm-lock.md`

---

**End of CAL-R3 PM lock.**
