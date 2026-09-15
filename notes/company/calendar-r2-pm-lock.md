# CAL-R2 — Calendar PM lock

**Date:** 2026-09-12  
**Author:** product-manager (Kelyra)  
**Card:** `t_8259c570` · Parent track: `t_75faa4b6`  
**Options:** `notes/company/calendar-r2-ux-options.md` (+ motion · management · multical-viz · ux-spec-draft)  
**Prior law:** `notes/company/calendar-plan.md` (CAL-P1) — still binding unless §3 cites a change  
**Status:** BINDING product lock for Calendar surface choices + stories. Spec only — no app code, SQL, Edge, qa-loop, git, ui-design patch, or Eng staffing on this card.

**Parallel IQG:** QA Supervisor owns `notes/company/calendar-r2-intent.md`. Dual stamp required before Architect/Eng.

---

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: KELYRA Calendar (CAL-R2)
Quality goals: hat walls; focused child; assign≠publish; hidden teacher-only; sports opt-in; AI draft-then-Save; Desk not replaced; Calendar≠Diary; calm multi-cal; lifecycle verbs pure; a11y + reduced-motion
PM: APPROVED  date: 2026-09-12  profile-session: product-manager / t_8259c570
QA Supervisor: (leave for QAS)
Intent gaps remaining: none (PM side); QAS may still list intent gaps on calendar-r2-intent.md
```

**Dual stamp required before Architect / Engineering.** This card stamps PM only. Hold Eng until both APPROVED + Chuck send.

---

## 0. Binding pick summary

| Decision | Lock ID | One-line |
|---|---|---|
| Chrome entry | **CE-A** | Drawer-primary + quiet teacher Desk link; not 6th tray |
| Views phone/web | **VW-A** | Agenda-led phone · Week-led teacher web · Month OK office |
| Layers | **LF-A** | Category chips primary + Calendars sheet secondary |
| Create / edit | **CR-A** | Sheet composer (phone) / modal (web); AI same sheet |
| Child switcher | **CH-A** | Header person control; no twin merge; CH-C later |
| Draft / publish chrome | **DP-A** | Hidden badge + menu; Needs owns Publish product |
| Empty / states | **ST-A** | Calm honest empty / skeleton / fail-closed error |
| Management IA | **MG-A** | Calendars sheet toggles + row ⋯ + event ⋯ |
| Multi-cal viz | **VZ-A + micro VZ-B** | Category-primary + layer text; optional 4 role tints max |
| Motion essential | **see §2.10** | Sheet present/dismiss; range change; state badges; RM first |
| MVP view cut | **VW-A cut** | Phone Agenda+Day; web Week (teacher) / Month (office) + Day/Agenda |

**Designer rec relationship:** Accepts coherent pack CE-A+VW-A+LF-A+CR-A+CH-A+DP-A+ST-A; MG-A; VZ-A with VZ-B role-tint micro. No competing pack drawn.

---

## 1. Why these picks (rationale)

### 1.1 CE-A — Drawer-primary + quiet Desk link

1. **TEACH-UX / P1 §8.2:** Desk stays operational home (Today / This week / Needs). Calendar is **adjacent**, not a 6th tray peer.
2. **CE-C rejected:** tray/shelf destination fights “teacher simpler than today” and would force chrome growth without demoting something else.
3. **CE-B rejected as sole path:** work-context-only under-discovers school-wide events and forces separate office/parent paths; drawer noun stays the shared entry.
4. **Quiet Desk link (teacher only):** optional mute text “Calendar” near Desk chrome — discoverability without ClassTab pollution.

### 1.2 VW-A — Agenda phone · Week web

1. Matches **CAL-P1 §8** device split (phone capture/glance; web plan).
2. **VW-B rejected:** day-spine slows multi-week teacher planning and office holiday scan.
3. **VW-C rejected as teacher web default:** month-first weakens “this week load”; office may still land Month (hat override inside VW-A).
4. Phone never defaults Month; Week/Month live in overflow “Views”.

### 1.3 LF-A — Chips + Calendars sheet

1. Research + designer: school life speaks **categories**; sources (class/team/personal) need Apple-like **Calendars** toggles.
2. **LF-B rejected:** loses “tests only” chip language teachers/parents expect (Canvas-like).
3. **LF-C rejected:** weakest multi-team / personal vs school separation at scale.
4. Filters are **UX only** — never security (RLS remains SoT).

### 1.4 CR-A — Sheet composer

1. One chrome for manual + **AI draft-then-Save** (banner “Review draft — not saved”).
2. **CR-B** full-page deferred: heavier casual add; office can still use CR-A modal v1.
3. **CR-C** quick-add rejected for v1 primary: under-specifies audience; AI still needs sheet.
4. DATE primitive (DATE-P1) owns date fields inside the sheet — no third date UX.

### 1.5 CH-A — Header child control

1. Twin law is **structural**, not a filter chip (CH-B risks looking optional).
2. **CH-C** dual pane = later only; never unlabeled merge; phone stays single focus.
3. 2+ links → must focus before load (or empty prompt); 0 children → honest empty.

### 1.6 DP-A — Badge + quiet action

1. P1 §6: **Needs/To-Do owns Publish product**; calendar shows state and may deep-link same action.
2. **DP-B** section split breaks chronological agenda (reject as default).
3. **DP-C** Hidden chip can be turned off and “lose” drafts — badge keeps truth visible when items are in range.

### 1.7 ST-A · MG-A · VZ-A+micro

- **ST-A:** honest empty/loading/error/offline; no fake events; fail closed on partial insecure load.
- **MG-A:** verb families live in predictable places (layer toggle ≠ Delete ≠ Unsubscribe).
- **VZ-A + micro VZ-B:** category-primary marks + layer **text**; optional ≤4 role tints (Academic · School · Sport · Personal). **Hard ban:** unique bright hue per calendar.

### 1.8 Rejected packs (summary)

| Pack | Disposition | Reason |
|---|---|---|
| CE-C tray | Rejected v1 | Chrome growth vs TEACH-UX |
| CE-B sole | Rejected | Weak global/school discovery |
| VW-B / VW-C as sole | Rejected | Plan/scan mismatch vs P1 |
| LF-B / LF-C | Rejected | Language or scale too thin |
| CR-B / CR-C primary | Rejected v1 | Heavy or under-specified |
| CH-B / CH-C v1 | Rejected | Twin risk / complexity |
| DP-B / DP-C default | Rejected | Agenda break / hideable drafts |
| ST-B / ST-C | Rejected | Decorative or Desk blur |
| MG-B / MG-C sole | Rejected v1 | Heavy admin or weak discovery |
| VZ-C shapes primary | Rejected v1 | Impl + training cost |
| Per-cal rainbow | **Banned** | A11y + clutter |

---

## 2. Locked decision table (full)

| # | Decision | PM lock | Notes for designer / later ui-design |
|---|---|---|---|
| 1 | Chrome entry | **CE-A** | Drawer “Calendar” all hats; teacher quiet Desk link; dual-hat follows **active seat** |
| 2 | Phone defaults | **Agenda** primary, **Day** secondary | Week/Month in More/Views overflow |
| 3 | Web defaults | **Week** teacher; **Month** office school home; Student/Parent **Week or Agenda** | All four views available via tabs |
| 4 | Layers | **LF-A** | ChipRow multi-select + Calendars sheet/list; presets All academic · School only · My sports · Reset |
| 5 | Create/edit | **CR-A** | Sheet/modal; dirty dismiss confirms; Save commits; X/Discard drops draft |
| 6 | Child switcher | **CH-A** | Header control 2+; reload query; clear selection; never merge twins |
| 7 | Draft/publish UI | **DP-A** | Badge Hidden/Draft on teacher rows; menu Open · Publish to calendar (→ Needs) · Keep hidden |
| 8 | Empty/states | **ST-A** | Calm copy; skeleton; Retry; offline banner; no insecure partial |
| 9 | Management IA | **MG-A** | Sheet toggles = Disable/Enable; row ⋯ Unsubscribe/Manage; event ⋯ Delete/Hide/Publish |
| 10 | Multi-cal viz | **VZ-A + micro VZ-B** | Category mark + layer subtitle; ≤4 role tints optional; month counts at 10+ |
| 11 | Motion essential | M-SHEET-PRESENT/DISMISS; range change (RM instant/fade); publish badge state; skeleton structure; highlight outline | Enhancing: Today spring, view crossfade, filter fade — drop under RM |
| 12 | Motion ban | M-ERROR-SHAKE; confetti; parallax; shimmer-required; save check required | Do not ship |
| 13 | MVP views | Agenda+Day phone; Week/Month/Day/Agenda web | No year view v1 |
| 14 | Assign vs publish | **Independent** | Confirm P1 open #2: assign ≠ calendar publish |
| 15 | Default hide policy | **quiz/test/midterm/final → hidden**; homework/practice/lesson → published when `due_at` set | Confirm P1 open #1 |
| 16 | Sport | **Opt-in only**; default off | Unsubscribe ≠ Delete |
| 17 | AI NL | P1 §9 unchanged | Search ⊆ visible; add = draft-then-Save; no student/class insert |
| 18 | Desk | **Not replaced** | Today/This week stay Desk job |
| 19 | Diary | **Separate** | Calendar add ≠ diary entry |
| 20 | iCal / RSVP / rich recurrence | **Later** | Non-goals v1 |
| 21 | Icons | Name recipes only (`calendar`, `calendar-today`) | No invent View-stroke glyphs this lock |
| 22 | Tokens | `useTheme()` only | Touch ≥44pt; no color-only meaning |
| 23 | DATE | DATE-P1 primitive inside sheets | Calendar is viz surface, not date-entry primitive |
| 24 | UI lib | **Not locked here** | Hybrid UI spike later (architect/eng); data hybrid P1 stands |

---

## 3. Comparison vs CAL-P1 (what changes / what holds)

### 3.1 Holds (fail closed — not reopened)

| Law | Status |
|---|---|
| Hat walls; focused child; no twin unlabeled merge | **Holds** |
| Assign ≠ publish; hidden quizzes teacher-only | **Holds** (+ default hide policy locked §2 #15) |
| Sports opt-in; AI ⊆ visible + draft-then-Save | **Holds** |
| Desk not replaced; Calendar ≠ Diary | **Holds** |
| No `teaches_class` widen for family/hidden; no class-create / student-insert | **Holds** |
| iCal later; no Office homework firehose | **Holds** |
| Category model §3 P1; visibility matrix §4; default-on §5 | **Holds** |
| Hybrid data SoT (assignments projection + calendar_events) | **Holds** (architect may refine schema; product law unchanged) |
| Ask NL calendar ops = search + draft add only | **Holds** — parked Ask product not reopened |

### 3.2 What CAL-R2 **adds** (not contradictions)

| Addition | Why |
|---|---|
| Named option IDs (CE/VW/LF/CR/CH/DP/ST/MG/VZ) | Designer pack exists; P1 had IA sketches only |
| Management verb dictionary (Delete/Remove/Hide/Disable/Unsubscribe) | P1 incomplete lifecycle semantics (R2 gaps) |
| Multi-cal viz at 2/5/10/20+ + rainbow ban | Scale gap |
| Motion essential vs enhancing + reduced-motion | Apple benchmark gap |
| Explicit chrome CE-A (drawer + quiet Desk) | Refines P1 §8.2 “not 6th tray” into one ID |
| LF-A Calendars sheet | P1 chips-only sketch → full Apple-adapted layers |
| DP-A badge + Needs deep-link | Clarifies calendar-side vs product-owner Publish |
| ST-A state matrix | Empty/loading/error/offline spelled for IQG |
| Resolved P1 opens #1–2 (hide defaults; assign≠publish) | Were open issues; now locked |

### 3.3 What CAL-R2 **does not** change

- Does not replace Desk with month grid as home.
- Does not make Calendar a tray tab (CE-C).
- Does not ship iCal, RSVP, year view, or rich recurrence.
- Does not reopen Diary-on-calendar or car-rider.
- Does not authorize Eng or qa-loop from this card.

---

## 4. Product laws (CAL-R2 binding)

| Law ID | Lock |
|---|---|
| **CAL-01** | Calendar is one dated/span surface for the **active chrome seat**. Not Desk home, not Diary, not car-rider, not Office homework firehose. |
| **CAL-02** | **Hat walls.** Visibility follows P1 §4 matrix. Filters never elevate privilege. |
| **CAL-03** | **Focused child.** Parent queries bind `child_student_id`. Twins never unlabeled merge. CH-A switcher reloads + clears selection. |
| **CAL-04** | **Class wall.** Teacher default = active class + school; “All my classes” is explicit. 5th ≠ 3rd. |
| **CAL-05** | **Assign ≠ publish.** Seeding submissions does not publish due to family calendar. Independent controls. |
| **CAL-06** | **Hidden teacher-only.** `quiz`/`test`/`midterm`/`final` default **hidden** on family calendar; homework/practice/lesson default **published** when `due_at` set. Family never sees hidden. |
| **CAL-07** | **Publish product owner = Needs/To-Do.** Calendar DP-A shows badge + may deep-link Publish; same semantics as Needs card. |
| **CAL-08** | **Sports opt-in.** Sport layers off until join; Unsubscribe leaves membership; events remain for others. |
| **CAL-09** | **AI ⊆ visible + draft-then-Save.** NL search never elevates; NL add opens CR-A draft; Save required; refuse class-create, student-insert, grade Approve, twin merge, school blast (non-office). |
| **CAL-10** | **Desk not replaced.** Today / This week remain Desk operational shelf. |
| **CAL-11** | **Calendar ≠ Diary.** No journal prose on calendar; AI calendar add does not file Diary. |
| **CAL-12** | **No staff widen.** Never `teaches_class` / `is_staff` for family personal, parent absence, or hidden quiz reads. |
| **CAL-13** | **No class-create / student-insert** from calendar UI or AI. |
| **CAL-14** | **Lifecycle verbs pure.** Delete ≠ Remove ≠ Hide ≠ Disable ≠ Unsubscribe (management-ux dictionary). |
| **CAL-15** | **Chrome entry CE-A.** Drawer Calendar all hats; teacher quiet Desk link; not tray tab v1. |
| **CAL-16** | **Views VW-A.** Phone Agenda+Day; web Week (teacher) / Month (office); no year v1. |
| **CAL-17** | **Layers LF-A.** Category chips + Calendars sheet; presets; sport off default. |
| **CAL-18** | **Viz VZ-A+micro.** Category-primary + layer text; ≤4 role tints; ban per-calendar rainbow; color never sole channel. |
| **CAL-19** | **Motion.** Essential sheet + range change + state labels; reduced-motion instant/fade; no shake/confetti/parallax. |
| **CAL-20** | **Dual-hat seat SoT.** Teacher seat ≠ parent child calendar; actions follow active seat matrix. |
| **CAL-21** | **Assignment projection.** Calendar does not soft-delete dues; Open assignment for grade-book destroy path. |
| **CAL-22** | **iCal / external sync later.** Login + RLS only v1. |
| **CAL-23** | **Honest “who can see this”** on create/detail. |
| **CAL-24** | **Offline/error fail closed.** No fake success Delete/Save; no insecure partial leak of hidden items. |

---

## 5. Quality goals (PM owns)

| # | Goal | Measurable intent |
|---|---|---|
| QG-1 | **Complete hats** | Teacher, student, parent, office each have entry (CE-A) + scoped read; dual-hat seat-correct. |
| QG-2 | **Full lifecycle** | Create, edit, discard draft, hide/publish (teacher), delete (owner), disable layer, unsubscribe team — each with correct confirm and reverse where reversible. |
| QG-3 | **Multiplicity** | Multi-class teacher scope; multi-child parent focus; multi-team sport toggles; 2/5/10/20+ layer density behaviors (multical-viz). |
| QG-4 | **No twin / class leak** | Prove queries never mix siblings or non-taught classes without explicit control. |
| QG-5 | **Assign ≠ publish** | Hidden quiz due invisible to family until Publish; grade book may still exist. |
| QG-6 | **AI safe** | Search ⊆ visible; add always draft; refuse over-scope with copy. |
| QG-7 | **Calm chrome** | CE-A / VW-A / LF-A / VZ-A — Apple-adapted, not rainbow Office clone; Desk intact. |
| QG-8 | **A11y** | ≥44pt; VO labels time+title+category+visibility+source; RM honored; no color-only Hidden. |
| QG-9 | **States honest** | ST-A empty/loading/error/offline; skeleton not fake events. |
| QG-10 | **Non-goals explicit** | Year, iCal, RSVP, rich recurrence, Diary, car-rider, tray tab — “not built” ≠ “done.” |

Happy-path-only (one hat, one child, published-only, no unsubscribe) = **REJECTED** stamp per IQG.

---

## 6. v1 vs later · non-goals

### 6.1 v1 (ship when dual-stamped + Chuck send + architect + eng)

1. CE-A entry all hats + teacher quiet Desk link  
2. VW-A views (phone Agenda+Day; web Week/Month/Day/Agenda per hat defaults)  
3. LF-A chips + Calendars sheet + presets  
4. Visibility matrix + twin/class walls  
5. Published assignment dues projected; hidden teacher-only + DP-A + Needs Publish  
6. calendar_events CRUD school/class/personal/absence (hat-scoped)  
7. Sport opt-in read + Unsubscribe  
8. CR-A create/edit/delete own events  
9. CH-A parent switcher  
10. AI NL search + AI NL draft-add (P1 §9)  
11. ST-A states; MG-A menus; VZ-A(+B micro) marks  
12. Motion essential set + RM  
13. Honest visibility copy  

### 6.2 Later

| Feature | Why later |
|---|---|
| iCal / Google two-way | OAuth + conflict |
| Rich recurrence editor | Complexity |
| Sports RSVP / TeamSnap | Scope |
| CH-C dual-pane parent | Power compare |
| CE-C tray tab | Only if CEO demotes other chrome |
| CR-B full-page office power | After CR-A ships |
| Year view; drag-reschedule | Polish |
| Push suite per publish | Notification policy |
| Envelope E2E personal | Key custody |
| Office overload analytics | Privacy |

### 6.3 Non-goals (fail closed)

Copy into Eng tickets:

- Google/Outlook clone (rooms, free/busy, RSVP mesh)  
- Diary / journal on Calendar  
- Car-rider queue  
- Class create / student insert from Calendar or Ask  
- `is_staff` widen to personal/absence/hidden  
- Auto-publish every `due_at`  
- School-wide homework firehose to all parents  
- Twin unlabeled merge  
- Ask Approves grades  
- Public anonymous school calendar URL  
- Student creates school-wide events  
- Replace Desk Today/This week with month grid  
- Per-calendar rainbow palette  
- 6th teacher tray tab (unless future CEO CE-C)  
- Invent View-stroke glyphs without icons pipeline  

---

## 7. User stories + acceptance (updates vs P1)

P1 §7 stories remain base law. R2 **extends** with chrome IDs, lifecycle verbs, multiplicity, reverse/cancel, and dual-hat. New/updated IDs below are binding for prove-out.

### 7.1 Hats matrix (entry + primary jobs)

| Hat | Entry (CE-A) | Default scope | Create? | Notes |
|---|---|---|---|---|
| **Teacher** | Drawer + quiet Desk link | Active class + school | Class event, personal study; not school-wide | Hidden dues + Publish via Needs/DP-A |
| **Student** | Drawer (+ Work mirror OK) | Enrolled + school + own study | Own study/personal only | No hidden quizzes; no delete school |
| **Parent** | Drawer (+ home module OK) | **Focused child** | Absence/personal for that child | CH-A required 2+; no other families |
| **Office** | Drawer + school home CTA | School (+ school-marked) | School events CRUD | No homework firehose; no parent doctor notes |
| **Dual-hat** | Same noun; seat switch rebuilds | Active seat only | Seat matrix only | CAL-20 |
| **Signed-out** | None | — | — | Auth wall |

### 7.2 Teacher

**US-T-01 — Open calendar (CE-A)**  
As a **teacher**, I open Calendar from the drawer or quiet Desk link and see this class’s published + my hidden items for the range.  
**AC:**  
1. Drawer row name “Calendar”; Desk link does not add a ClassTab or tray tab.  
2. Default scope = active class + school; other classes hidden until “All my classes.”  
3. 5th-grade items never appear inside 3rd-grade scope without All.  
4. Back returns to prior surface.  
5. Dual-hat on Teach seat shows teach scope only.

**US-T-02 — Views (VW-A)**  
As a **teacher on phone**, I land on Agenda (Day secondary); on **web**, Week default with Day/Agenda/Month available.  
**AC:** Segment/tabs work; phone Week/Month only via More; Today jumps anchor; last view remembered per seat+device class (local prefs OK).

**US-T-03 — Filters (LF-A)**  
As a **teacher**, I multi-select category chips and toggle class layers in Calendars.  
**AC:** Chips + Calendars sheet; presets work; empty filtered → “Nothing matches” + Clear; prefs per seat; filters do not reveal hidden-to-family items to students (N/A on teacher seat for own hidden).

**US-T-04 — Due without family leak (CAL-05/06)**  
As a **teacher**, I set due on a pop quiz without family calendar visibility until Publish.  
**AC:** quiz/test default hidden; teacher calendar shows **Hidden** badge (DP-A); student/parent queries exclude; grade column may exist; assign does not flip publish.

**US-T-05 — Publish via Needs + calendar deep-link (DP-A, CAL-07)**  
As a **teacher**, Needs offers Publish to calendar; calendar row menu deep-links the same action.  
**AC:** Confirm copy: students/parents will see due; assignments/grades unchanged; badge → Published; To-Do clears; not Approve grade.

**US-T-06 — Create class event (CR-A)**  
As a **teacher**, I tap + and create a class event (e.g. field trip).  
**AC:** Sheet fields; visibility summary; Save commits to taught class only; Cancel/Discard dirty confirms; does not create class or enroll students.

**US-T-07 — Delete / cannot delete school (MG-A, CAL-14)**  
As a **teacher**, I delete my class event; I cannot delete office school events.  
**AC:** Delete confirm danger; school row Delete disabled + “Managed by office”; Disable school layer ≠ Delete.

**US-T-08 — Parent pull-out visible**  
As a **teacher**, I see absence/pull-out only for students in my classes.  
**AC:** Not school-wide; not other teachers’ only students; no edit/delete of parent-owned note.

**US-T-09 — NL search / add (CAL-09)**  
As a **teacher**, NL search returns ⊆ visible; NL add opens CR-A draft bound to class.  
**AC:** No cross-class leak; draft-then-Save; refuse student insert / class create.

**US-T-10 — Multi-class multiplicity**  
As a **teacher of 5+ classes**, I use This class / All my classes and Calendars toggles without rainbow overload.  
**AC:** VZ-A marks; at 10+ layers search appears; preset All academic restores calm.

### 7.3 Student

**US-S-01 — My agenda**  
As a **student**, I open Calendar (CE-A) and see school + published class work + my study.  
**AC:** No other students; no hidden quizzes; no teacher personal; sport off until opt-in.

**US-S-02 — Add study block (CR-A)**  
As a **student**, I add a personal study span.  
**AC:** Owner only; category study; not Diary; Delete own only.

**US-S-03 — Unsubscribe sport (CAL-08)**  
As a **student** on a team, I Leave team from Calendars row ⋯.  
**AC:** Confirm Unsubscribe copy; games remain for others; layer disappears from my defaults; not labeled Delete.

**US-S-04 — NL search**  
As a **student**, “what’s due Friday” ⊆ my published set.  
**AC:** Hat-scoped; no hidden.

### 7.4 Parent

**US-P-01 — Focused child (CH-A, CAL-03)**  
As a **parent** of twins, I must focus one child before items load.  
**AC:** Header switcher 2+; switch reloads `child_student_id`; clears highlight; Saydee events never under Sydnee; 1 child shows context; 0 → empty “No linked children.”

**US-P-02 — Doctor pull-out AI (CR-A, CAL-09)**  
As a **parent**, I NL-add “Johnny pulled out Tuesday 12pm doctor.”  
**AC:** Draft sheet; disambiguate child if needed; Save → me + teachers of Johnny’s classes only; not other twin; not school firehose; not Diary; visibility caption shown.

**US-P-03 — Filters + sport**  
As a **parent**, I hide homework chips and enable opted sport for focused child.  
**AC:** LF-A; sport off until child opted; Unsubscribe child-from-team confirm; prefs per child.

**US-P-04 — NL search**  
As a **parent**, search only focused-child visible items.  
**AC:** No other families; no teacher-hidden quizzes.

**US-P-05 — Reverse absence**  
As a **parent**, I edit or delete my absence note for the focused child.  
**AC:** Owner edit/delete; teachers stop seeing after delete on next load; offline delete refuses fake success.

### 7.5 Office

**US-O-01 — School CRUD**  
As **office**, I create/edit/delete school-wide events (holiday, early release).  
**AC:** All hats see per matrix; teachers cannot delete; CR-A modal OK v1.

**US-O-02 — No firehose**  
As **office**, default calendar is not every assignment in the building.  
**AC:** School + optional class directory events; no parent doctor notes; no teacher personal.

**US-O-03 — NL search school**  
As **office**, “early releases” filters school layer only.  
**AC:** Does not return parent absences or hidden quizzes.

### 7.6 Dual-hat · reverse · cancel

**US-X-01 — Seat switch (CAL-20)**  
As teacher+parent, Calendar follows **active seat**.  
**AC:** Teach seat = class scope; Parent seat = CH-A child; no silent cross-read; dirty draft prompts discard/block before seat switch.

**US-X-02 — Discard / cancel create**  
As any hat, I discard an unsaved CR-A draft.  
**AC:** Dirty → confirm Discard; clean X closes; nothing persisted; AI draft same path.

**US-X-03 — Disable layer reverse**  
As any hat, I turn a calendar layer off then on again.  
**AC:** Disable ≠ Delete; copy explains others unchanged; instant refilter; RM OK.

**US-X-04 — Publish reverse (v1 floor)**  
As a **teacher**, after Publish I at least have path documented; re-hide may be v1.1.  
**AC:** v1 minimum = publish once with audit fields; re-hide optional fast-follow — if not in v1, listed non-goal with Needs card still owning future toggle.

**US-X-05 — Deep link assignment**  
As a **teacher/student/parent**, “Show on calendar” focuses due day + highlight.  
**AC:** highlight id; RM = static outline; no privilege change.

### 7.7 AI refuse (cross-hat)

**US-AI-01 — Refuse over-scope**  
As any non-office user, “put on everyone’s calendar” is refused.  
**AC:** Clear refuse copy; office school create is explicit path only.

**US-AI-02 — Refuse student/class invent**  
As any user, NL never inserts students or creates classes.  
**AC:** Confirm-only existing entities; matcher law holds.

---

## 8. Lifecycle · multiplicity · reverse/cancel matrix

### 8.1 Verb × object (binding; from management-ux)

| Object | Delete | Hide | Disable layer | Unsubscribe | Notes |
|---|---|---|---|---|---|
| School event | Office | Office draft only | Any viewer | N/A | Teacher Delete disabled |
| Class event | Owner teacher | Creator draft | Any with layer | N/A | |
| Assignment due | Via assignment form only | Teacher hide/publish | N/A | N/A | No calendar soft-delete due |
| Sport team event | Coach/owner if allowed | — | Viewer | Member leave team | |
| Personal/study | Owner | — | Owner layer | N/A | |
| Absence | Owner parent(s) | — | — | N/A | |
| AI unsaved draft | **Discard** (not Delete) | — | — | — | |

### 8.2 Multiplicity checklist (IQG)

| Dimension | Required behavior |
|---|---|
| **Classes (teacher)** | This class default; All my classes explicit; per-class Calendars toggles |
| **Children (parent)** | CH-A focus; prefs per child; no mash-up empty |
| **Teams** | Opt-in list only; multi-team Disable/Unsubscribe independent |
| **Layers 2/5/10/20+** | multical-viz density; search ≥8; presets; never auto-enable all sports |
| **Devices** | Phone Agenda+Day; web Week/Month defaults per hat |
| **Dual-hat** | Seat rebuild; dirty draft resolve first |

### 8.3 Reverse / cancel

| Action | Reverse |
|---|---|
| Create Save | Edit or Delete (owner) |
| Draft dirty | Discard confirm → nothing saved |
| Disable layer | Enable again in Calendars |
| Unsubscribe team | Re-join opt-in flow later |
| Publish | v1 audit publish; re-hide = fast-follow if not v1 |
| Hide (keep) | Publish path |
| Filter tight | Clear filters |
| Child switch | Switch back; independent streams |
| Seat switch | Switch seat; scopes rebind |

### 8.4 Motion essential set (ship)

| ID | Class | RM |
|---|---|---|
| M-SHEET-PRESENT / DISMISS | Essential | Fade |
| M-RANGE-SWIPE (range change) | Essential* | Instant/fade (*motion enhancing; change required) |
| M-PUBLISH-FEEDBACK state label | Essential state | Instant text |
| M-SKELETON structure | Essential | Static blocks, no shimmer |
| M-EVENT-HIGHLIGHT outline | Essential under RM | Static outline |
| M-TODAY, M-VIEW-SWITCH, M-FILTER-REFLOW | Enhancing | Instant |
| M-ERROR-SHAKE, confetti, parallax, required shimmer | **Do not ship** | N/A |

---

## 9. Chrome entry · routes · dual-hat

### 9.1 Entry (CE-A)

| Hat | Primary | Secondary |
|---|---|---|
| Teacher | Drawer **Calendar** | Quiet Desk text link (not ClassTab, not tray) |
| Student | Drawer **Calendar** | Optional Work header mirror |
| Parent | Drawer **Calendar** | Optional home module “{Child} calendar” |
| Office | Drawer **Calendar** | School home management CTA |
| Dual-hat | Same labels | Query/scope follows **active seat** after switch |

### 9.2 Route shape (indicative — Eng may rename)

`/calendar` query:

- `view=` `agenda` | `day` | `week` | `month`
- `classId=` optional teacher scope
- `childId=` required when parent has 2+ before data load
- `date=` ISO anchor (default today)
- `q=` optional NL/search echo
- `highlight=` optional item id after deep link / publish

### 9.3 Dual-hat law

1. Chrome **seat is SoT** (same as DATE-09 / diary twin law).  
2. Teacher seat cannot exercise parent-only absence delete without switching to Parent seat (and ownership).  
3. No merged “family + class” unlabeled stream.  
4. Unsaved AI/manual draft: discard prompt before seat switch.

---

## 10. Open issues residual · next

### 10.1 Resolved this lock (were P1 opens)

1. Default hide: quiz/test/midterm/final **hidden**; homework/practice/lesson **published** when due set.  
2. Assign ≠ publish: **independent**.  

### 10.2 Still for architect / later (not PM blockers)

| # | Issue | Owner next |
|---|---|---|
| 1 | Exact schema field names / RPC shape | software-architect after dual stamp |
| 2 | Hybrid UI lib spike (RN calendars / web) | architect + eng spike — not this card |
| 3 | Co-teacher edit rights beyond owner | later if co-teach ships |
| 4 | Re-hide after publish in v1 vs v1.1 | default **v1.1 OK**; document in Eng if cut |
| 5 | Teacher clutter interviews | research gap; does not block stamp |
| 6 | Push notifications on publish | later policy pass |

### 10.3 IQG coordination

- PM stamp: **APPROVED** (this file).  
- QAS: write/complete `calendar-r2-intent.md` and stamp parent.  
- One REJECT = no Architect/Eng.  
- **Next after both APPROVED:** CoS staffs `software-architect` (data/sync/feasibility vs chosen UX). **Not** Eng until Chuck send.  
- **Hold:** Eng / qa-loop / bot-build until dual stamp + Chuck send.

---

## 11. Handoff

- **OBJECTIVE:** Choose designer options; lock stories/AC; PM IQG stamp.  
- **CONTEXT:** CAL-R2 designer packs + CAL-P1 laws + research R2.  
- **WORK PERFORMED:** Wrote `calendar-r2-pm-lock.md`; PRD + designer notify + parent stamp comment follow.  
- **VERIFICATION:** Every major option has one ID; stories cover hats/dual-hat/lifecycle/multiplicity/chrome/reverse; vs P1 explicit; stamp block present.  
- **RESULT:** PM APPROVED design stamp (awaiting QAS).  
- **OPEN ISSUES:** §10.2; QAS intent parallel.  
- **ESCALATION NEEDED:** No (unless QAS REJECT).  
- **RECOMMENDED NEXT ACTION:** QAS stamp; then CoS → software-architect; hold Eng until dual stamp + Chuck send.  
- **FILES:** `notes/company/calendar-r2-pm-lock.md`, `notes/company/calendar-r2-prd.md`, `notes/company/calendar-r2-pm-to-designer.md`
