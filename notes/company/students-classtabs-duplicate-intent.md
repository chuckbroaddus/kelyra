# Students ClassTabs duplicate row — IQG real-world intent

**Date:** 2026-09-17  
**Author:** qa-supervisor (Kelyra)  
**Card:** `t_d62d7902` (intent) · dual-stamp `t_a57a62ab` · DEFECT board `t_fd8772ba` · PM prep `t_442c72fc`  
**Process:** `notes/company/INTENT_QUALITY_GATE.md`  
**CEO report:** 2026-09-17 — FoM **Students** tab shows **two** ClassTabs rows.  
**Disposition SoT:** `notes/company/students-classtabs-duplicate-defect.md` (AC-STU-CT-01…08 · P1 FIX-NOW · board `t_fd8772ba`)  
**Surviving SoT (do not reopen):**  
- CT-A host law: ClassTabs live in `src/app/class/[id]/_layout.tsx` so PersonTabs stays mounted across desk pane replaces (`class-tabs-morph-intent.md` · AC-CT-05 / CT-09).  
- `pageChromeHosted` on desk Screens skips duplicate top pad when layout already hosts tabs (`Screen.tsx`).  
- CLASS_TABS membership / morph / FoM look: `class-tabs-morph-spec.md` + appwide lock — **unchanged** by this card.  
**Status:** Design-stage IQG intent for a **user-facing bug correction**. **QA Supervisor DESIGN STAMP: APPROVED.** **PM DESIGN STAMP: APPROVED** (disposition + AC). **Dual stamp: MET.** **Not** Eng on stamp cards. **No** `src/` from QAS. **No** git. **No** chrome invention.

**Role:** Own real-world intent for single ClassTabs row on Students. Explicit **non-goal:** do **not** remove the layout-hosted row (CT-A persist). Fix is strip the **second** host on Students only (and any peer leftover), not move host back into panes.

---

## 0. Defect (as observed)

| Layer | Fact |
|---|---|
| Surface | Teach → Desk → **Fundamentals of Math** → ClassTabs **Students** (`/class/{id}/setup`) |
| Actual | **Two** ClassTabs rows painted (duplicate desk chrome) |
| Host A (keep) | `_layout.tsx` — `<CollapsingPageChrome><ClassTabs …/></CollapsingPageChrome>` when `isClassDeskTabsRoute` |
| Host B (remove) | `setup.tsx` — `<Screen … collapse={id ? <ClassTabs classId={id} /> : null}>` **without** `pageChromeHosted` |
| Peer desk panes | feed / index / assignments / parents / settings / gradebook / family / syllabus already use `pageChromeHosted` and do **not** mount `<ClassTabs` |
| Unit law already written | `classTabs.test.ts` **CT-09**: every listed desk pane **must** `pageChromeHosted` and **must not** match `/<ClassTabs\b/` — `setup.tsx` is on that list and currently **fails** the law in source |
| Morph prove-out foreshadow | `class-tabs-morph-proveout-objective.md` § inspect: “Confirm ClassTabs exported usage not duplicated inside Screen.collapse on desk panes” — this CEO report is that miss on Students |

**One-line law:** On Teach class desk, **exactly one** ClassTabs row is painted for every default desk pane including **Students**. Layout is the sole host (CT-A). Students must not re-host ClassTabs in `Screen.collapse`.

---

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: STUDENTS CLASSTABS DUPLICATE — FoM Students (/setup) paints two ClassTabs rows; layout host stays (CT-A); strip setup collapse ClassTabs + pageChromeHosted parity
Quality goals: Exactly one ClassTabs row on Students web+phone; other desk panes stay single-row; layout host persist; §9.6 collapse physics unchanged; dual-hat Parent zero ClassTabs; office Students not broken; no CLASS_TABS membership/morph reopen
PM: APPROVED  date: 2026-09-17  profile-session: product-manager / t_f39fe21b (design stamp) + t_442c72fc (AC prep) + t_fd8772ba (P1 FIX-NOW) · notes/company/students-classtabs-duplicate-intent.md · students-classtabs-duplicate-defect.md (AC-STU-CT-01…09 / SCD-01…09)
QA Supervisor: APPROVED  date: 2026-09-17  profile-session: t_d62d7902 intent + t_a57a62ab dual-stamp / qa-supervisor · notes/company/students-classtabs-duplicate-intent.md · defect notes/company/students-classtabs-duplicate-defect.md
Intent gaps remaining: none
```

**Dual stamp:** **MET.**

**PM stamp meaning:** Stories + AC cover SCD-01..09 and quality goals. Binding disposition on DEFECT `t_fd8772ba` = **P1 / FIX-NOW**. Explicit non-goal: do **not** remove layout-hosted ClassTabs. Office admin Students stays a separate surface unless a separate defect. Does **not** staff Eng or touch `src/`.

**QA Supervisor stamp meaning:** Real-world intent is fully specified for hats, chrome entry, lifecycle, multiplicity, reverse/cancel, and explicit non-goals. AC-STU-CT-01…09 map SCD-01…09 (single row; setup host law; desk audit; layout CT-A preserved; padding/collapse; hats; detail push/pop; no CSS dual-mount hide; CT-09/LIVE verify). Engineering may be staffed by **CoS only** after dual MET. Does **not** staff Eng, ditl-scribe EXEC, or qa-engineer LIVE from this card. Does **not** authorize deleting layout ClassTabs.

---

## 1. Hats

| Hat | Single ClassTabs on Students? | Notes |
|---|---|---|
| **Teacher (Teach seat)** | **Yes — primary** | FoM + any class desk; web ≥720 and phone |
| **Teacher + parent dual-hat (Teach seat)** | **Yes** | Same as teacher on Teach seat |
| **Teacher + parent dual-hat (Parent seat)** | **N/A / No** | Parent gains **zero** class desk ClassTabs (morph stamp survives) |
| **Parent (non-teacher)** | **No** | No Teach desk |
| **Student** | **No** | `StudentClassTabs` is a different control — out of scope |
| **Office / Super on admin class card** | **Separate surface** | `admin/class/[id]` uses `officeClassPersonTabs` / local PersonTabs — **not** Teach `ClassTabs` in class `_layout`. Do **not** “fix” office by touching Teach layout host. If office ever shows a double row, file a **separate** defect — not this stamp’s primary AC |
| **Substitute / co-teacher** | **Yes** on own Teach seat | Same single-row law |
| **Signed-out / foreign class** | **No** | |

**Dual-hat acceptance:** Teach → Students shows one row. Seat switch to Parent never leaves Parent with sticky ClassTabs. Parent → Teach → Students restores **one** row only.

---

## 2. Entry (chrome)

| Affordance | Where | Expected chrome |
|---|---|---|
| ClassTabs **Students** | Teach class desk row (layout-hosted) | Navigate to `/class/{id}/setup`; **one** ClassTabs row remains (Students selected) |
| Tray / drawer Class → setup | Teach structure path landing Students/setup | Same single row once on desk |
| Deep link `/class/{id}/setup` | Direct | Layout shows tabs (`isClassDeskTabsRoute`); Screen does **not** add a second ClassTabs |
| Other ClassTabs keys | Feed, Today, Assignments, Gradebook, Parents, Settings, Needs | **Stay single-row** (regression bar) |

**Not entry / not this fix:** Moving ClassTabs back into per-pane `collapse`; removing layout host; changing Students route key; renaming Students; office admin card chrome redesign.

---

## 3. Full lifecycle

### 3.1 Start — land Students

```
Teach seat → Desk → class (FoM) → ClassTabs Students
  → /class/{id}/setup
  → exactly ONE ClassTabs row painted (layout host)
  → Students selected; roster / office add UI as today
```

### 3.2 Change — switch away and back

```
Students → Feed | Assignments | Gradebook | Parents | Settings | Today | Needs
  → still exactly one ClassTabs row on each pane
  → return to Students → still exactly one row (no second host remounted)
```

**Must:** Layout ClassTabs stays mounted across pane replaces (CT-A / AC-CT-05). Students Screen does not inject a second instance on enter.

### 3.3 Change — scroll / collapse (§9.6)

```
On Students with single ClassTabs row
  → scroll leave/return with CollapsingPageChrome + chrome.visible
  → one row collapses/returns with tray physics
  → never “two rows half-collapsed”
```

### 3.4 Finish / leave desk

```
Leave class desk (tray Desk, another class, seat switch)
  → ClassTabs unmount with class stack as today
  → no orphan second row
```

### 3.5 Reverse / cancel

- Back from student detail `/class/{id}/student/{studentId}`: detail may hide desk tabs (`isClassDeskTabsRoute` false); return to setup → **one** row again.  
- Cancel enroll / close sheets: chrome row count unchanged.  
- No “fix” that breaks selected-tab highlight or setParams navigation.

---

## 4. Multiplicity

| Dimension | Rule |
|---|---|
| **Classes** | Each class stack has its own layout host; switching class never stacks two hosts from prior class |
| **Panes** | All default desk panes share **one** host; Students is not a special double-host exception |
| **Devices** | Web ≥720 and phone ~390: still exactly one row (density may differ; count does not) |
| **Office + Teach** | Opening office admin Students and Teach Students in different hats must not cross-inject ClassTabs |

---

## 5. Explicit non-goals

1. **Do not remove** layout-hosted ClassTabs (`_layout.tsx` CT-A persist).  
2. Do not reopen CLASS_TABS membership, morph 1–9, hug/reserve, or appwide PersonTabs lock.  
3. Do not move NT-A inbox job tabs or FloatingTabTray.  
4. Do not rewrite office `admin/class/[id]` PersonTabs unless a separate CEO defect names it.  
5. Do not change roster/enroll product behavior beyond chrome host parity.  
6. Do not Eng/SQL/git from this IQG stamp card.  
7. Do not treat CT-09 unit green alone as product-complete without LIVE single-row prove-out after fix.

---

## 6. Must-include behaviors (build acceptance when dual-stamped)

| ID | Behavior |
|---|---|
| **SCD-01** | FoM Students shows **exactly one** ClassTabs row (web + phone). |
| **SCD-02** | Layout remains the ClassTabs host (`_layout` + CollapsingPageChrome). |
| **SCD-03** | `setup.tsx` does **not** render `<ClassTabs` (no collapse host of ClassTabs). |
| **SCD-04** | `setup.tsx` uses `pageChromeHosted` like peer desk panes (no double top pad). |
| **SCD-05** | Peer panes (feed, index, assignments, gradebook, parents, settings, family, syllabus) remain single-row — no regression to per-pane ClassTabs. |
| **SCD-06** | CT-09 (or successor static) passes on the served tree after fix. |
| **SCD-07** | §9.6 leave/return still works on Students with the **single** layout row. |
| **SCD-08** | Dual-hat Parent seat never gains ClassTabs from this fix. |
| **SCD-09** | Student detail push/pop does not leave a double row on return to Students. |

---

## 6b. PM stories + SCD → AC map (binding — `t_f39fe21b`)

Implement bar lives in `notes/company/students-classtabs-duplicate-defect.md`. Eng must satisfy **both** SCD law and AC-STU-CT-*. No thinner slice. No designer pack.

### Stories

**US-SCD-01.** As a Teach user on FoM (or any class desk), when I open ClassTabs **Students**, I see **exactly one** ClassTabs row and then the roster/setup body — never two stacked rows (web ≥720, web <720, phone).

**US-SCD-02.** As a Teach user, when I switch Students → Feed | Today | Assignments | Gradebook | Parents | Settings | Needs and back, ClassTabs stays a **single layout-hosted** row with no double flash.

**US-SCD-03.** As a Teach user scrolling Students, §9.6 leave/return collapse works on the **one** layout ClassTabs row — never two half-collapsed rows.

**US-SCD-04.** As a dual-hat teacher on **Parent** seat, I gain **zero** ClassTabs from this fix; Teach → Students restores one row only.

**US-SCD-05.** As office/super on **admin** class card (`/admin/class/[id]`), this fix does **not** rewrite my PersonTabs surface. Shared Teach `/class/{id}/setup` (if office uses it) inherits the same single-host law without forked chrome.

**US-SCD-06.** As Parent (non-teacher) or Student, I still do not receive Teach ClassTabs (`StudentClassTabs` out of scope).

**US-SCD-07.** As a Teach user, when I open a student detail from Students and return, I still see **exactly one** ClassTabs row on setup.

### SCD → AC map

| Intent | Eng AC | Must prove |
|---|---|---|
| **SCD-01** one row Students web+phone | **AC-STU-CT-01** | Exactly one ClassTabs/PersonTabs desk row on `/setup`; one selected highlight |
| **SCD-02** layout sole host CT-A | **AC-STU-CT-04** | `_layout.tsx` keeps ClassTabs; **do not remove** layout host |
| **SCD-03** setup no `<ClassTabs` | **AC-STU-CT-02** | `setup.tsx` does not render/import ClassTabs for collapse |
| **SCD-04** setup `pageChromeHosted` | **AC-STU-CT-02** + **AC-STU-CT-05** | Peer pad parity; no double top pad / underlap |
| **SCD-05** peer panes stay single-row | **AC-STU-CT-03** | feed/index/assignments/gradebook/parents/settings/family/syllabus remain no per-pane ClassTabs |
| **SCD-06** CT-09 green | **AC-STU-CT-03** + **AC-STU-CT-08** | Do not weaken CT-09; setup must pass existing law |
| **SCD-07** §9.6 single-row collapse | **AC-STU-CT-05** | One chrome stack leave/return on Students |
| **SCD-08** dual-hat Parent zero | **AC-STU-CT-06** | Parent seat never gains ClassTabs from this fix |
| **SCD-09** student detail push/pop | **AC-STU-CT-09** | Return to setup → still one row (no double) |

**Explicit non-goal (PM lock):** Do **not** remove layout-hosted ClassTabs (`_layout` CT-A persist). Strip the **second** host on Students only (plus any peer straggler). Do **not** CSS-hide a dual mount. Office admin Students = separate surface unless a distinct CEO defect names shared bug.

---

## 7. DEFECT (board filing)

```
Title: DEFECT [P1]: FoM Students paints duplicate ClassTabs rows
SEVERITY: P1
PARENT: t_d62d7902
REPRO:
  1. Teach seat → Desk → Fundamentals of Math (or any class)
  2. ClassTabs → Students
  3. Observe two ClassTabs rows
HAT / ROLE: Teacher (Teach seat); dual-hat on Teach seat
EXPECTED (stamped design): Exactly one ClassTabs row; layout sole host (CT-A); setup pageChromeHosted without ClassTabs collapse
ACTUAL: Layout ClassTabs + setup.tsx Screen.collapse ClassTabs → double row
EVIDENCE: CEO 2026-09-17; src/app/class/[id]/_layout.tsx hosts ClassTabs; src/app/class/[id]/setup.tsx collapse={<ClassTabs…/>} without pageChromeHosted; peers pageChromeHosted; CT-09 forbids per-pane ClassTabs including setup
DISPOSITION: FIX-NOW (PM binding t_fd8772ba 2026-09-17) — primary Teach lifecycle chrome miss vs CT-A host law
Board DEFECT: t_fd8772ba · SoT: notes/company/students-classtabs-duplicate-defect.md (AC-STU-CT-01..08)
```

**Severity rationale (QAS):** P1 — stamped CT-A single mounted row missing on a **primary** Teach desk pane (Students). Not P0 (no data loss / wrong child). Not P2 (no mere secondary hat).  
**PM disposition (binding):** **SEVERITY P1 · DISPOSITION FIX-NOW** on `t_fd8772ba`. Eng only after dual stamp MET → CoS ARM + Eng child of defect.

---

## 8. DITL IMPACT

```
DITL IMPACT
Change: Teach class desk Students (/setup) must paint exactly one ClassTabs row (layout host only); strip duplicate setup collapse ClassTabs; peers stay single-row; CT-A layout persist
Verdict: UPDATE_PLANS
Plans touched: DITL-T-02 (web class desk paths — Students/setup chrome); DITL-T-04 (academic day — Students roster via ClassTabs); DITL-DH-01 (dual-hat Parent zero ClassTabs; Teach Students single-row)
Cases touched: none
New DITL needed: no
Seed/artifacts: none
Notes: UPDATE_PLANS only — cheap ditl-scribe language that Students is single-row under layout host; do NOT rewrite NT-A inbox beats; no EXEC from this IMPACT. Cite notes/company/ditl-testplans.md. Morph CT-A DITL (prior UPDATE_PLANS) remains; this is a bug-correction delta on Students pane chrome count.
```

---

## 9. Eng shape (advisory only — not a build card)

When dual stamp MET and CoS staffs Eng (after ARM as required):

1. `setup.tsx`: remove `ClassTabs` import/usage from `Screen.collapse`; set `pageChromeHosted` (keep other Screen props as needed).  
2. Do **not** remove `_layout.tsx` ClassTabs.  
3. Confirm no other desk pane reintroduced `<ClassTabs`.  
4. Green CT-09 + LIVE FoM Students web+phone single row.  
5. `kelyra-qa-loop` for implementation QA; then QAS prove-out OBJECTIVE → CoS staffs `qa-engineer`.

---

## 10. Checklist (this card)

- [x] Intent file `notes/company/students-classtabs-duplicate-intent.md`
- [x] Hats / entry / lifecycle / multiplicity / reverse / non-goals
- [x] Explicit non-goal: layout CT-A host **persist**
- [x] DESIGN STAMP QA Supervisor **APPROVED**
- [x] DESIGN STAMP PM **APPROVED** (disposition AC-STU-CT-01…08)
- [x] Dual stamp **MET** (`t_a57a62ab`)
- [x] DITL IMPACT **UPDATE_PLANS** (no EXEC)
- [x] DEFECT disposition P1 FIX-NOW (`t_fd8772ba`)
- [x] No `src/` · no git from stamp cards

---

## 11. Handoff

**WORK PERFORMED:** IQG Phase 1–2 QAS intent + dual-stamp for duplicate Students ClassTabs.  
**VERIFICATION:** Re-read `_layout.tsx` host, `setup.tsx` L877 collapse ClassTabs without pageChromeHosted, peer `pageChromeHosted` panes, CT-09 setup list, PM AC-STU-CT-01…08 vs intent SCD-01…09.  
**RESULT:** QAS APPROVED; PM APPROVED; dual stamp **MET**.  
**OPEN ISSUES:** none for design stamp. Eng not started.  
**ESCALATION NEEDED:** No.  
**RECOMMENDED NEXT ACTION:** CoS ARM GRANT + staff Engineering `kelyra-qa-loop` vs AC-STU-CT-01…08 only. After loop terminal → QAS prove-out OBJECTIVE → CoS staffs `qa-engineer`. Staff `ditl-scribe` UPDATE_PLANS (no EXEC).

*End intent — t_d62d7902 + t_a57a62ab QA Supervisor APPROVED 2026-09-17; PM APPROVED t_fd8772ba/t_442c72fc; dual MET; DITL IMPACT UPDATE_PLANS; layout CT-A host persist; no app code on stamp.*
