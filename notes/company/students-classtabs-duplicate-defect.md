# DEFECT disposition — Students pane duplicate ClassTabs

**DEFECT board card (binding disposition):** `t_fd8772ba`  
**PM prep / stories card:** `t_442c72fc`  
**PM dual-stamp card:** `t_f39fe21b`  
**QAS intent parent:** `t_d62d7902` · `notes/company/students-classtabs-duplicate-intent.md`  
**QAS dual-stamp (defect AC):** `t_a57a62ab`  
**Date:** 2026-09-17  
**Author:** product-manager  
**Feature stamp base:** CT-A ClassTabs morph · `notes/company/class-tabs-morph-spec.md` · layout host CT-09 / AC-CT-05  
**This defect SoT:** this file  
**Related:** CT-A persist ClassTabs in `class/[id]/_layout.tsx`; unit gate `src/lib/chrome/classTabs.test.ts` CT-09  
**Noun:** ClassTabs · Students (route `/class/{id}/setup`)  
**Designer:** Not required (no new chrome; restore single-host law)

---

## DESIGN STAMP (this defect correction)

```
DESIGN STAMP
Feature/bug: Students desk pane (`/class/{id}/setup`) must show exactly ONE ClassTabs row. Layout host already mounts ClassTabs; setup must stop mounting a second ClassTabs via Screen.collapse and must use pageChromeHosted like peer desk panes.
Quality goals: CEO live FoM Class → Students shows single tab row then roster (no stacked duplicate); CT-A remount-free single host holds on Students; peer desk panes stay single-host; Gradebook shelf collapse remains allowed without second ClassTabs; office on shared teacher setup stack fixed by same change; admin /admin/class card stays separate chrome (no ClassTabs invent); dual-hat Parent gains zero ClassTabs
PM: APPROVED  date: 2026-09-17  profile-session: product-manager / t_fd8772ba + t_442c72fc · notes/company/students-classtabs-duplicate-defect.md
QA Supervisor: APPROVED  date: 2026-09-17  profile-session: qa-supervisor / t_a57a62ab · notes/company/students-classtabs-duplicate-defect.md · intent notes/company/students-classtabs-duplicate-intent.md (t_d62d7902)
Intent gaps remaining: none
```

**Dual stamp:** **MET** (PM APPROVED + QA Supervisor APPROVED on defect AC + intent).  
**Eng:** CoS may ARM + staff Eng child of `t_fd8772ba` (`kelyra-qa-loop` vs AC-STU-CT-01…08 / SCD-01…09). PM/QAS do not implement `src/`. No git. No SQL. No designer pack. **Non-goal:** do not remove layout-hosted ClassTabs (CT-A).

**PM stamp meaning:** Binding **P1 / FIX-NOW** disposition + AC-STU-CT-* restore CT-A single-host law on Students. Does **not** staff Engineering.

**QA Supervisor stamp meaning:** Real-world intent complete (hats, entry, lifecycle, reverse, multiplicity, non-goals). AC-STU-CT-01…08 cover single ClassTabs; no CSS dual-mount hide; layout CT-A host preserved; gradebook non-ClassTabs collapse exception kept. Live root cause re-verified 2026-09-17: `setup.tsx` L877 still `collapse={<ClassTabs…/>}` without `pageChromeHosted`; `_layout.tsx` hosts ClassTabs; CT-09 lists setup. Does **not** staff Eng.

---

## DISPOSITION (binding)

```
Board card: t_fd8772ba
SEVERITY: P1
DISPOSITION: FIX-NOW
Reason: CEO live FoM Class tab row → Students shows a second ClassTabs row above the roster.
Primary Teach hat desk chrome; violates stamped CT-A layout host (ClassTabs once in
class/_layout; desk panes pageChromeHosted; no per-pane ClassTabs). Not polish —
duplicate primary navigation is unusable / confuses selected state and collapse physics.
CEO expects fix. IQG Phase 6: P1 → FIX-NOW. No exception. QAS recommended FIX-NOW.
CEO escalate: No (not production/legal/spend P0 override).
Next owner: Dual MET (t_a57a62ab QAS APPROVED). CoS ARM + Eng child of t_fd8772ba
(kelyra-qa-loop) against AC-STU-CT-01..08 / SCD-01..09 only.
No ui-ux-designer. Keep layout ClassTabs host.
```

| Field | Value |
|---|---|
| **Board DEFECT** | **`t_fd8772ba`** |
| **SEVERITY** | **P1** (confirmed) |
| **DISPOSITION** | **FIX-NOW** (binding this turn) |
| **SCHEDULE / DEFER / WONTFIX** | Rejected — CEO live + primary hat chrome |
| **P0?** | No — no wrong grade, data loss, or auth leak; chrome defect |
| **Stamp conflict?** | Yes vs CT-A AC-CT-05 + unit CT-09 (layout hosts ClassTabs; panes must not) |
| **Engineering after dual stamp?** | **Yes** — CoS ARM + Eng child of `t_fd8772ba`; not this PM card |

---

## Repro / code fact (grounded — no invent)

### CEO live

1. Teach seat → Fundamentals of Math (or any class) desk.  
2. ClassTabs → **Students**.  
3. **ACTUAL:** second ClassTabs row, then roster.  
4. **EXPECTED (stamped CT-A):** one ClassTabs row (layout host), then Students body (roster / setup).

### Static root cause

| Layer | Fact |
|---|---|
| `src/app/class/[id]/_layout.tsx` | Hosts `<ClassTabs classId={classId} />` inside `CollapsingPageChrome` when `isClassDeskTabsRoute(pathname)` — includes `/setup` (Students). Comment cites CT-A / AC-CT-05. |
| `src/app/class/[id]/setup.tsx` ~L13, L877 | Still `import { ClassTabs }` and `<Screen keyboard collapse={id ? <ClassTabs classId={id} /> : null}>` — **second mount**. Missing `pageChromeHosted`. |
| Peer desk panes | `index`, `feed`, `assignments`, `parents`, `settings`, `family`, `syllabus`, `gradebook` already use `pageChromeHosted` and do **not** mount `<ClassTabs`. |
| `gradebook.tsx` | `pageChromeHosted` + `collapse={collapsing}` for **GradebookViewTabs / syllabus warning only** — not a second ClassTabs. Keep that pattern. |
| `Screen.tsx` | Docs: `pageChromeHosted` = layout already hosts ClassTabs + top pad; `collapse` = in-page chrome — “Do not also place ClassTabs inside children when this is set.” |
| Unit CT-09 | `classTabs.test.ts` already asserts every listed desk pane (incl. `setup.tsx`) has `pageChromeHosted` and **no** `<ClassTabs\b`. **setup is currently out of law** vs that gate. |

### Why duplicate appears

Layout paints ClassTabs above the Stack. Setup’s `Screen.collapse` paints ClassTabs again inside CollapsingPageChrome on the page. User sees two rows.

---

## Hats / entry / lifecycle / non-goals

| Hat | Scope this defect |
|---|---|
| **Teach** (web + phone) | **In** — primary. Students ClassTabs once. |
| **Office** on teacher class desk `/class/{id}/setup` | **In** — same `setup.tsx` (`isOfficeRole` roster/add paths). Same single-host fix; do not fork office chrome. |
| **Office** `/admin/class/[id]` | **Audit only / non-goal for ClassTabs duplicate** — uses `officeClassPersonTabs` + local `PersonTabs`, **not** teacher `ClassTabs` layout host. Do **not** port ClassTabs into admin or invent a second stack. |
| **Parent / Student** | **Zero** ClassTabs from this work. |
| **Superintendent** | No discovery of Teach ClassTabs beyond shared primitives already in tree. |

**Entry:** ClassTabs Students (and any deep link to `/class/{id}/setup`).  
**Lifecycle:** Land on Students → one row → roster/setup body; leave to Feed/Assignments/etc. → still one layout-hosted row (no flash of double then single).  
**Reverse:** Back/replace away from setup does not leave orphan collapse ClassTabs.  
**Multiplicity:** Multi-class: each class desk still one ClassTabs host in that class layout.  
**Collapse physics:** Layout `CollapsingPageChrome` remains the ClassTabs hide/show brain on desk routes; setup must not run a second ClassTabs collapse stack.

**Non-goals**

- No ClassTabs inventory / noun / icon change.  
- No tray redesign. No Students route rename.  
- No admin `/admin/class` redesign.  
- No Gradebook shelf removal.  
- No app-wide PersonTabs rewrite.  
- No designer option pack.

---

## Implement acceptance criteria (Eng — after dual stamp only)

Named for CoS → `kelyra-qa-loop`. Restore CT-A single-host law. Do not invent chrome.

### AC-STU-CT-01 — Exactly one ClassTabs on Students (binding)

1. Teach seat, web ≥720 and web <720 and phone: open class desk → ClassTabs **Students** (`/class/{id}/setup`).  
2. Exactly **one** ClassTabs / PersonTabs desk row is painted.  
3. No second tab row between layout chrome and roster/setup body.  
4. Selected Students state matches single row (one highlight / morph target).

### AC-STU-CT-02 — setup.tsx host law

1. `src/app/class/[id]/setup.tsx` must **not** render `<ClassTabs` (import removed if unused).  
2. Students `Screen` must set **`pageChromeHosted`** (same as feed/index/assignments/…).  
3. Students must **not** pass `collapse={<ClassTabs …/>}`.  
4. `collapse` on setup remains unset unless a **non-ClassTabs** in-page chrome is later stamped (none required this fix).

### AC-STU-CT-03 — Desk pane audit (regression lock)

1. All class desk panes that show ClassTabs via layout remain single-host:  
   `index`, `feed`, `setup` (Students), `assignments`, `gradebook`, `parents`, `settings`, and any other `isClassDeskTabsRoute` pane in tree.  
2. None of those panes mount `<ClassTabs`.  
3. `gradebook` may keep non-ClassTabs `collapse` (GradebookViewTabs / warning) **with** `pageChromeHosted`.  
4. Unit gate CT-09 in `src/lib/chrome/classTabs.test.ts` must **pass** (layout hosts ClassTabs; listed panes `pageChromeHosted` + no per-pane ClassTabs). Do not weaken the test to greenwash setup.

### AC-STU-CT-04 — Layout host preserved (CT-A)

1. `class/[id]/_layout.tsx` continues to host the sole ClassTabs for desk routes (`isClassDeskTabsRoute` + `CollapsingPageChrome`).  
2. Switching Students ↔ Feed ↔ Assignments ↔ … does not remount a second ClassTabs on setup and does not reintroduce per-pane ClassTabs.  
3. AC-CT-05 remount-free intent holds: layout-mounted row stays the morph host.

### AC-STU-CT-05 — Padding / collapse physics

1. With `pageChromeHosted`, Students body does not double-apply top pad / `contextReserve` under a missing second row (no huge empty gap where the duplicate was, and no content underlap under the single row).  
2. ClassTabs leave/return with existing chrome.visible / CollapsingPageChrome behavior still works on Students (one chrome stack).  
3. No new sticky orphan ClassTabs when scrolling Students.

### AC-STU-CT-06 — Hats

1. **Teach** web + phone: AC-STU-CT-01…05.  
2. **Office** user on `/class/{id}/setup` (shared setup screen): same single ClassTabs row; office add/roster affordances unchanged.  
3. **Admin** `/admin/class/[id]`: unchanged office PersonTabs card — **no** teacher ClassTabs added; no duplicate introduced there either.  
4. Parent / Student: zero ClassTabs from this fix.

### AC-STU-CT-07 — Non-goals / blast radius

1. Do not change CLASS_TABS membership, labels, or icons.  
2. Do not move ClassTabs into tray or hamburger.  
3. Do not “fix” by hiding one row with CSS while both still mount.  
4. Do not remove layout host and return to per-pane-only ClassTabs (would rebreak CT-A morph remount).  
5. Touch list preferred: `setup.tsx` (+ drop unused ClassTabs import); verify CT-09; only touch peers if audit finds another `<ClassTabs` straggler.

### AC-STU-CT-08 — Verification (implement loop)

1. Static: CT-09 green; ripgrep class desk for `<ClassTabs` only in `_layout.tsx` (plus ClassTabs.tsx itself / tests).  
2. LIVE Teach FoM: Class → Students → one row; switch away and back → still one row.  
3. Optional LIVE: office role on same setup route if fixture exists — one row.  
4. No git/SQL from unstated scope.

---

## Stories (minimal — defect correction)

**US-STU-CT-01.** As a Teach user on FoM, when I open ClassTabs Students, I see one ClassTabs row and then the roster — never two stacked ClassTabs rows.

**US-STU-CT-02.** As a Teach user, when I leave Students for Feed and return, ClassTabs stays a single layout-hosted row (no double flash).

**US-STU-CT-03.** As office on the teacher class setup stack, I get the same single ClassTabs row; my add-student affordances still work.

**US-STU-CT-04.** As Parent/Student, I still do not receive Teach ClassTabs from this fix.

---

## Eng guidance (CoS → implement card; do not code here)

Preferred minimal fix:

1. In `setup.tsx`: remove `ClassTabs` from `collapse`; add `pageChromeHosted` to `Screen` (mirror `parents.tsx` / `settings.tsx`: e.g. `<Screen keyboard pageChromeHosted>`).  
2. Remove unused `ClassTabs` import.  
3. Run `classTabs.test.ts` CT-09 (and any related chrome tests).  
4. LIVE FoM Students.  
5. If any other desk file still has `<ClassTabs`, fix under AC-STU-CT-03 same PR — do not leave stragglers.

Out of scope: admin class card redesign; tray; inventory; morph timing.

---

## CoS next actions

1. Accept disposition **P1 / FIX-NOW** on **`t_fd8772ba`** as binding.  
2. Let dual-stamp cards complete (`t_f39fe21b` PM line on intent; `t_a57a62ab` QAS on AC).  
3. After dual **MET**: ARM GRANT + create **Eng child of `t_fd8772ba`** (`senior-developer` or `fast-coder` → `kelyra-qa-loop`) against **AC-STU-CT-01…08** / intent **SCD-01…09** only. Eng shape: intent §9 + this note Eng guidance.  
4. Do not staff designer. Do not ask PM for src/. Do **not** remove `_layout` ClassTabs.  
5. Staff `ditl-scribe` UPDATE_PLANS if not already (`t_fb931026` if live).  
6. After loop terminal → QAS prove-out OBJECTIVE → CoS staffs `qa-engineer`.

---

## Binding refs

- CEO live: FoM Class → Students duplicate tab row  
- QAS intent: `notes/company/students-classtabs-duplicate-intent.md` (SCD-01..09)  
- CT-A: `notes/company/class-tabs-morph-spec.md` (AC-CT-05)  
- Layout host: `src/app/class/[id]/_layout.tsx`  
- Straggler: `src/app/class/[id]/setup.tsx` L877 `collapse={<ClassTabs…/>}` without `pageChromeHosted`  
- Gate: `src/lib/chrome/classTabs.test.ts` CT-09  
- Screen API: `src/components/ui/Screen.tsx` `pageChromeHosted` / `collapse`  
- DEFECT board: `t_fd8772ba` · PM prep: `t_442c72fc` · PM stamp: `t_f39fe21b`

---

## FILE COMPLETE

**FILE COMPLETE.** Board disposition **`t_fd8772ba`**: **SEVERITY P1 · DISPOSITION FIX-NOW**. PM DESIGN STAMP **APPROVED**. QA Supervisor DESIGN STAMP **APPROVED** (`t_a57a62ab`). Dual stamp **MET**. No app code on stamp cards. CoS next: ARM + Eng child of `t_fd8772ba`.

Hermes: DEFECT `t_fd8772ba` · PM prep `t_442c72fc` · QAS dual `t_a57a62ab` · disposition SoT: `notes/company/students-classtabs-duplicate-defect.md` · intent: `notes/company/students-classtabs-duplicate-intent.md`
