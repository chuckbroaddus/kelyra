# CAL-S1: FERPA / Security Review — School Calendar

**Date:** 2026-09-04
**Author:** security (Kelyra)
**Ticket:** `t_b6f1a387`
**Status:** Review only — no SQL, no app code, no Edge handlers, no kelyra-qa-loop.
**Depends on:** `notes/company/calendar-architecture.md` (CAL-A1)
**Also:** `notes/company/calendar-plan.md` (CAL-P1), `notes/company/calendar-research.md` (CAL-R1)
**Live ground:** `docs/data-model.md`; `teaches_class` (ORs `is_school_admin`); `class_teacher_of` (membership only); `parent_students`; `student_gradebook()`; `parent_progress()`; `src/lib/ai/askToolPolicy.ts` + Edge twin.
**Legal posture:** Engineering threat model and implementation gates. Not a legal opinion and not a claim of FERPA “school official” status. Soft FERPA still applies (`docs/architecture.md`, `docs/mvp.md`): paid model tier, no training on prompts, no district DPA unless Chuck signs one.

**Non-goals of this ticket:** Implementation, Architect SQL, QA plan, staffing `senior-developer`.

---

## 0. Verdict

CAL-A1 product law is sound on the three walls that would otherwise fail FERPA minimization:

1. **Do not** reuse `teaches_class` for family calendar reads (it ORs `is_school_admin()` and would dump every class’s homework, including hidden quizzes, to office).
2. Hidden dues: `class_teacher_of` only. Office is not a homework firehose. Assign ≠ calendar publish.
3. AI search ⊆ already-visible set. Draft-then-Save. Matcher never inserts students or classes. Twins: confirm, never pick.

**Do not implement** until CEO says send **and** the v1 must-fix list in §2.4 is copied into any future architecture/qa-loop ticket. Filter chips, chrome hats, and client hides are not security.

Ready for CEO/CoS. This ticket does not authorize eng staffing.

## 1. Threats

Attacker profiles: curious student JWT; parent JWT (incl. invite); teacher of class A on class B; office seat; dual-hat teacher-parent; modified Expo client; model tool-loop; `SECURITY DEFINER` confused deputy; existence leak via `/activity` audit.

### 1.1 Data classes

| Data | FERPA / sensitivity | Where it would live | Family-visible? |
|---|---|---|---|
| Published assignment `due_at` | Education record (work schedule) | `assignments` projection | Own / linked child C only |
| Hidden quiz/test `due_at` | Education record + teacher work product | Same row, `calendar_visibility=hidden` | **Never** (teacher of that class only) |
| School holiday / early release | Directory-ish school ops | `calendar_events` `school` | Yes when published |
| Class field trip | Class ops | `calendar_events` `class` | Enrolled / C enrolled |
| Parent absence / doctor pull-out | **High** — health + named child | `absence` + `student_teachers` | Teachers of **C’s enrollments** only. Not office. Not other twin. Not the student in v1. |
| Teacher `self` study | Teacher work product | `visibility_scope=self` | **Never** family / office |
| Sport schedule | Team ops; roster is PII | `calendar_teams` + events | **Opt-in only** |
| Event `draft` | Work product | `status=draft` | Creator only |
| NL text / model prompt | Possible student names, health | xAI via Edge / `ai:dev` | **Never** |
| Sibling blend / unlabeled twins | **High** — classic FERPA over-read | Must not exist in payloads | **Never** |

**Product law (unchanged):** Nothing is a grade until Approve. Matcher never inserts a student. Teachers do not create classes. Office does not SELECT parent doctor notes or teacher study because a calendar exists.

### 1.2 T1 — Office homework firehose (`teaches_class`)

**Severity: P0 if implementers copy `assignments_via_class`.**

Live `teaches_class(class_id)` is true when **`is_school_admin()` OR `class_teachers`**. Reusing it for `list_calendar_items` or hidden-due SELECT gives superintendent/administrator every class’s homework, including pop quizzes. A1 forbids this. Copy it anyway and FERPA minimization is gone.

**Must-fix:** Family + hidden reads use `class_teacher_of` / enrollment / `parent_students`. `is_school_admin` only for `visibility_scope=school` CRUD. Never SELECT `self`, `student_teachers`, or hidden assignments as office.

### 1.3 T2 — Hidden due leak (pop-quiz law)

**Severity: P0**

Assign-to-roster ≠ publish. Seeding `submissions` must not flip `calendar_visibility`. Student/parent RPCs that already list “coming due” must honor the same gate (not a second client filter). Teacher Needs “Publish to calendar” is the unhide. Re-hide is v1.1 — until then, do not invent a family-visible default.

### 1.4 T3 — Twin / sibling mash-up

**Severity: P0**

Parent with 2+ `parent_students` and missing/invalid `p_child_student_id` → **empty**, not a union. NL “Johnny” × twins → confirm UI, do not pick. Absence `student_id` is C after confirm. The other twin must not appear on C’s agenda, search, or Ask context.

### 1.5 T4 — Dual-hat chrome vs job-of-record

**Severity: P0**

Teacher-parent queries by **active chrome seat**, not `also_teacher` / `staff_also_parent` flags. Parent seat: `parent_students` only. Teacher seat: `class_teacher_of` of taught classes — not the child’s other teachers’ hidden quizzes, not unlinked kids. Office seat does not inherit teacher hidden-due read unless they also have a `class_teachers` row **and** are in the teacher chrome.

### 1.6 T5 — Parent absence over-read

**Severity: P0**

Doctor pull-out is a named-child health/attendance note. Fail closed:

- Recipients: owner parents of C + `class_teacher_of` for **C’s current enrollments**.
- **Not** school firehose. **Not** office. **Not** student in v1. **Not** teachers of the other twin. **Not** Diary.
- Do **not** `write_audit` onto Office `/activity` (existence leak: “parent created absence for student X”).
- On child unlink: **delete** the row (A1). Do not SET NULL into a school-visible orphan.

Honest UI copy (product communication, not a legal opinion): “Teachers of this child’s classes can see this.”

### 1.7 T6 — AI matcher / Ask superuser

**Severity: P0**

Live `ASK_TOOL_POLICY`: unknown names denied; `create_class` / `add_student` / `link_parent_student` are office-only; students have `assignments.manage` = `own`. Mapping `calendar_search` / `calendar_draft_event` onto `assignments.manage` would offer calendar writes to students and school-wide drafts to office.

NL may **guess** `student_id` against an allowed roster only. No match → null or refuse — **never INSERT `students`**. Never `create_class`. Never `link_parent_student`. Never write `approved_score`. Never invent a grade column (“add a test Friday”). School-wide blast unless office is creating `visibility_scope=school`. Refuse with copy, not a silent no-op.

Search never elevates: same predicates as `list_calendar_items`. Draft persists to audience only on user Save. `source=ai_nl` is support metadata, not an audit firehose.

### 1.8 T7 — `SECURITY DEFINER` confused deputy

**Severity: P0**

`list_calendar_items` is sketched as SECURITY DEFINER. If it does not pin `search_path=public`, re-check `auth.uid()`, revoke `anon`/`public`, and apply §3 predicates **inside** the function, any authenticated caller can pass another user’s `p_child_student_id` / `p_class_id` and read past RLS. Client must never wide-select `calendar_events` then filter.

Do **not** extend live `student_gradebook()` as-is (draft `answers` stay on the row — AVG-S1). Calendar assignment projection is title + due instant + category + visibility — **not** scores, drafts, or classmate cells.

### 1.9 T8–T12 — Remaining v1 threats

| ID | Sev | Threat |
|---|---|---|
| T8 Draft leak | P0 | `status=draft` visible to anyone but creator (incl. office, co-teachers, family). |
| T9 Sport auto-join | P0 | Team membership copied from class roster → every parent sees sports PII they did not opt into. |
| T10 Student school-wide write | P0 | Student INSERT `visibility_scope=school` or class they are not enrolled as teacher. Student = read + own `self` study. |
| T11 Client chips as security | P0 | Category/hat chips hide rows the RPC already returned. Modified client / network tab wins. |
| T12 Vendor NL | P1 | Prompt/logs dump child names + “doctor”. Same soft FERPA as capture: server-side keys, paid no-training, logs = ids not bodies. Residual vendor risk accepted only with that posture. |

**Later (not v1):** iCal / public anonymous URL (directory + record leak); two-way Google; envelope E2E theater; ANPR/car-rider on events; media on events (if ever: private bucket, owner path, no family signed URLs); eligible-student 18+ rights transfer; push digest of absences.

## 2. Controls

A1’s matrix is the product contract. Server must enforce it. UI hiding is not FERPA control.

### 2.1 Helper choice (lock)

| Helper | Calendar use | Forbidden use |
|---|---|---|
| `class_teacher_of(class_id)` | Teacher **write** class events; teacher **read of hidden dues**; absence recipients for C’s enrollments | — |
| `teaches_class(class_id)` | **None** on this surface | Family reads; hidden dues; office homework dump |
| `is_school_admin()` / `is_staff_profile` | School-layer CRUD (`visibility_scope=school`) only | SELECT `self`, `student_teachers`, hidden assignments, parent absence |
| `parent_students` | Parent scope. 2+ children: **require** `p_child_student_id` in that set | Mash-up when child missing |
| `my_student_id()` / enrollment | Student: published class/school + own `self` study | School-wide writes |
| Active chrome seat | Dual-hat: teacher query ≠ parent-child query | Job-of-record flags as a bypass |

Co-teachers: any `class_teachers` row (`class_teacher_of`), not `classes.teacher_id` only. Teachers cannot delete office school events. RPCs must not INSERT `classes` or `students`. No new privileges on existing tables.

### 2.2 Item rules (fail closed) — A1 §3.2 affirmed

| Item | Student | Parent (child C) | Teacher | Office |
|---|---|---|---|---|
| School event published | Yes | Yes | Yes | CRUD |
| Class event T | Enrolled T | C enrolled T | `class_teacher_of(T)` | School-marked only |
| Assignment due **published** | Own / enrolled (family rules) | C’s work (`parent_progress` shape, **no scores**) | Taught T | **No row dump** |
| Assignment **hidden** | No | No | `class_teacher_of` only | **No** |
| Sport | Opt-in | C opted in | Coach membership | School-marked sport announcements only |
| Study `self` | Owner | No (v1) | Owner only | No |
| Parent absence for C | No | Owner parents of C | Teachers of C’s enrollments | **No** |
| Event `draft` | Creator only | Creator only | Creator only | Creator only |

Teacher default: **active class** + school. “All my classes” is an explicit OR of `class_teacher_of` ids.

### 2.3 Ask tools (indicative names; semantics may not change)

Do **not** reuse `assignments.manage` (students `own`, office `school`). Do **not** ride `is_staff`. Client map + Edge twin identical; unknown denied. `filterAskToolDefs` after `getUser` + profile — never `body.tools` / `body.role`. Keys never `EXPO_PUBLIC_*`.

| Future tool | Seat | Capability | Extra wall |
|---|---|---|---|
| `calendar_search` | Current chrome | New **`calendar.read`** (teacher `own`, parent `own` linked child, student `own`, office **school events only**) | Same predicates as `list_calendar_items`. Never elevates. |
| `calendar_draft_event` | Seat-scoped create | New **`calendar.write`** (not `assignments.manage`) | Returns **draft** only. Persist on user Save. Parent: absence/`student_teachers` after confirm. Teacher: `class_teacher_of` of active/taught class. Office: `visibility_scope=school` only. Student: `self` study only. |

Hard rules:

1. Search ⊆ visible set.
2. Matcher guess against allowed roster; ambiguous → confirm; no match → null/refuse; **never INSERT students**.
3. Never `create_class`, `link_parent_student`, `approved_score`, grade-column insert from NL.
4. Dual-hat: tool seat = signed-in chrome, then SQL walls.
5. Do not `write_audit` parent doctor notes to `/activity`.

### 2.4 v1 must-fix (block implementation / qa-loop if missing)

| ID | Sev | Finding | Gate |
|---|---|---|---|
| CAL-S1-01 | P0 | Never use `teaches_class` for calendar family/hidden reads | SQL review + office JWT fixture: zero homework/hidden rows |
| CAL-S1-02 | P0 | Hidden dues: `class_teacher_of` only; assign ≠ publish; submissions seed does not unhide | Student/parent RPC empty for hidden quiz |
| CAL-S1-03 | P0 | Parent 2+ children: missing child → **empty**; twins never unlabeled merge | Parent JWT fixtures |
| CAL-S1-04 | P0 | Dual-hat by chrome seat | Teacher-parent: parent seat cannot read other teachers’ hidden; teacher seat cannot family-read unlinked kids |
| CAL-S1-05 | P0 | Absence: C’s teachers only; no office; no `/activity` audit; **delete on unlink** | Unlink + office SELECT tests |
| CAL-S1-06 | P0 | New Ask caps `calendar.read` / `calendar.write`. **Not** `assignments.manage`. Twins + unknown denied | `askToolPolicy` student/parent/office/dual-hat |
| CAL-S1-07 | P0 | Matcher never inserts students/classes; no grade Approve | Static + RPC |
| CAL-S1-08 | P0 | `list_calendar_items` DEFINER hygiene: `search_path=public`, `auth.uid()`, revoke anon, predicates inside; no wide client SELECT | SQL + IDOR fixtures |
| CAL-S1-09 | P0 | Draft = creator only; sport opt-in never roster-copied; student cannot write school/class | RLS tests |
| CAL-S1-10 | P0 | Filter chips are not security; projection has **no scores / drafts / classmates** | Serializer fixtures |
| CAL-S1-11 | P1 | Server-side AI keys; logs = ids not bodies/health text | Edge + `ai:dev` |
| CAL-S1-12 | P1 | Co-teachers follow `class_teacher_of`; office cannot delete teacher personal; teachers cannot delete office school events | Write tests |

### 2.5 Later (not v1 blockers)

| ID | Sev | Item |
|---|---|---|
| CAL-S1-L1 | P2 | Signed DPA / school-official claim; keep soft FERPA copy until then |
| CAL-S1-L2 | P2 | iCal / public URL — login + RLS only in v1 |
| CAL-S1-L3 | P2 | Envelope encryption (honest RLS first; no crypto theater) |
| CAL-S1-L4 | P2 | Media on events: private bucket, owner path, no family signed URLs |
| CAL-S1-L5 | P2 | Eligible student (18+) / rights transfer |
| CAL-S1-L6 | P2 | Push digest of absences (new disclosure surface) |
| CAL-S1-L7 | P3 | Re-hide after publish; rich recurrence |

### 2.6 FERPA mapping (engineering)

| FERPA concern | Calendar control |
|---|---|
| Education records disclosed to parent / eligible student / school official | Published dues: linked child / enrollment only. Hidden: teaching membership, not office. |
| Health/attendance notes about a named child | Absence `student_teachers`; not school; not office; delete on unlink |
| No peer / sibling records | Twin empty-not-mash; no classmate dues |
| Directory vs record | School holiday OK when published. Named-child absence and hidden quizzes are records |
| Vendor as school official | **Not claimed** without DPA. Paid no-training; minimize NL; no health text in logs |
| Redisclosure | Ask must not echo the other twin or hidden quizzes; `/activity` must not prove an absence exists |
| COPPA | Unchanged: school context; no public child calendar URL in v1 |

## 3. Acceptance

Artifact for CEO/CoS. No SQL. No app code. No kelyra-qa-loop. No git push.

| Criterion | Where |
|---|---|
| Verdict: A1 walls sound; do not implement until CEO yes | §0 |
| Data classes + threat model (office firehose, hidden quiz, twins, dual-hat, absence, Ask, DEFINER) | §1 |
| Helper lock vs `teaches_class`; item matrix; Ask caps; must-fix CAL-S1-01–12 | §2 |
| FERPA mapping (engineering, not a legal opinion) | §2.6 |
| Tests a future qa-loop must include | §3.1 |
| Soft FERPA / no school-official claim | Header + §2.5 L1 |

### 3.1 Tests a future qa-loop must include (do not run now)

1. Office JWT: `list_calendar_items` returns school-scope events only — zero homework, zero hidden quizzes, zero parent absences, zero teacher `self`.
2. Student JWT: hidden quiz due absent; published homework of enrolled class present; cannot INSERT school/class events.
3. Parent JWT: child A selected cannot fetch child B; missing `p_child_student_id` with 2+ links → empty; unlink deletes absence.
4. Teacher of class A cannot read class B hidden dues or class B events.
5. Dual-hat: parent chrome ≠ teacher chrome (CAL-S1-04).
6. `calendar_search` / `calendar_draft_event` denied for unknown names; not on `assignments.manage`; student cannot draft school events; office cannot draft `student_teachers` absence.
7. NL “Johnny” with two linked children → confirm, no insert.
8. DEFINER: attacker `p_child_student_id` of an unlinked student → empty; `anon` cannot execute.
9. Serializer: no `approved_score`, `draft_score`, `answers`, classmate names.
10. Sport: class roster membership does not imply team calendar rows.
11. `write_audit` / `/activity` has no parent-absence existence row.
12. Client chips changing does not change RPC row set (security is server).

### 3.2 Open questions (not blocking this review)

| # | Question | Owner |
|---|---|---|
| 1 | Exact Ask capability names (`calendar.read` / `calendar.write` vs one cap + need) — **semantics in §2.3 are the lock** | Architect when staffed |
| 2 | Whether student should see own absence in v1 (A1 = No). Security agrees No | PM / CEO |
| 3 | Re-hide after publish (A1 = v1.1). Security: family must drop the row the moment it is hidden | Product |
| 4 | Eligible student 18+ | Later (L5) |

### 3.3 Decisions (this ticket)

1. A1 helper split is **mandatory**, not advisory.
2. Calendar Ask gets **new** capabilities, not `assignments.manage`.
3. Parent absence is operational communication to C’s teachers, not an education-record firehose and not Office activity.
4. Hybrid SoT (do not copy dues into events) is a security win (less drift / confused deputy).
5. Soft FERPA posture unchanged until a DPA exists.
6. No implementation from this ticket.

### 3.4 Downstream

| Ticket | Needs |
|---|---|
| CAL-A1 (done) | Affirmed; must-fix list rides any future SQL ticket |
| Future qa-loop | §3.1 tests + CAL-S1-01–12 |
| Eng staffing | **CEO yes** — security does not authorize |

**RECOMMENDED NEXT ACTION:** CEO/CoS review. Hold `senior-developer`. Do not launch kelyra-qa-loop from this ticket.

### Handoff

- **OBJECTIVE:** FERPA/security review of calendar architecture (CAL-S1).
- **FILES/AREAS:** `notes/company/calendar-security.md`
- **WORK PERFORMED:** Threat model, helper lock, Ask caps, must-fix list, FERPA mapping.
- **VERIFICATION:** File on disk; no SQL; no app code.
- **RESULT:** Ready for CEO/CoS — not implementation.
- **OPEN ISSUES:** §3.2
- **ESCALATION NEEDED:** No unless CEO rejects helper split or hybrid SoT.
- **RECOMMENDED NEXT ACTION:** CEO/CoS review; hold eng staffing.
