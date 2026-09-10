# ASK-P1: Publish-time pedagogy pack + Ask assignment context

**Date:** 2026-09-10  
**Author:** product-manager (Kelyra)  
**Card:** `t_8946c670` · Research SoT: ASK-R3 `notes/company/ask-assignment-context-assessment-research.md`  
**Also grounded in:** ASK-R1 `ask-agentic-skills-research.md`, ASK-R2 `ask-student-pedagogy-research.md`, GAUTH-S1 / `gauth-research.md` + `gauth-kelyra-*.md`, live `src/lib/ai/askPrompt.ts` (`AskLiveContext` today: role/class/student/screen — **no assignmentId**).  
**Status:** PM lock only — **no app code**, no SQL, no Edge, no kelyra-qa-loop, no git, no chrome drawings.  
**Chain:** this PM lock → `ui-ux-designer` option pack → PM choose/OK UI → Engineering (CoS staffs; not this card).

---

## 0. GO / NO-GO

| Decision | Verdict |
|---|---|
| **Ship this slice?** | **GO** |
| **Like it?** | **Yes.** Once-at-publish student-safe pedagogy pack + runtime Ask inject when assignment known is the right integrity/cost cut. |
| **Amend R3?** | Accept R3 with PM amendments below (confirm gate, dual-hat, twins, stale pack, parent explicit, tray empty). |
| **Stop chain?** | No. Staff designer next. **Do not** staff Engineering from this card. |

**Why GO (one paragraph):** Class context is already ~80% wired (ASK-R1); graded Ask is tutor-not-solver (ASK-R2); student never gets keys/`explain_draft` (GAUTH). Missing piece is **assignment-aware tutor depth without solver packs**. One AI pass at publish (~1× cost vs 25–125× per student/turn) + teacher confirm + soft student ground + parent explicit ask is high benefit, low theater. Per-assignment **answer** skills stay **out** (ASK-R1 harm).

---

## 1. One-line product law

| Surface | Job | What it is not |
|---|---|---|
| **Pedagogy pack** | Once-per-assignment/lesson **student-safe** tutor brief (objectives, misconceptions, hint depth, vocab; ≤~800 tokens) | Key, worked solution, “write this”, `explain_draft`, per-assignment solver skill |
| **Teacher confirm** | Preview/edit/confirm pack before it may inject into student Ask | Auto-live on first AI draft; silent re-publish without notice on material edit |
| **Ask inject** | When `assignmentId` known + pack **confirmed**, Edge attaches **safe slice** only | Always-on mega prompt; Help Edge merge; student-visible raw pack UI dump |
| **Student ground** | Soft “Looks like FoM 1.2 — tap if wrong” | Hard assume forever; vision of quiz photos as tutor |
| **Parent ground** | Explicit “Which assignment?” (co-teacher) | Soft assume; Approve; family SELECT of teacher-only fields |
| **Help Edge** | Teacher-controlled ladder (unchanged) | Collapsed into Ask |

---

## 2. Problem (why now)

Ask already injects class/seat/screen (`AskLiveContext`) and refuses student solve of graded work. It does **not** know which assignment the student is on, so tutor depth cannot match objectives, misconceptions, or allowed hint depth without either (a) per-turn re-assessment, (b) per-assignment answer skills, or (c) blind class-only chat. R3 chooses (d): **one publish-time pack**, teacher-confirmed, injected only when assignment context is known and correctable.

Without this slice, ASK-R2 “tutor don’t answer” stays generic; wrong-assignment context is as bad as a solver leak for integrity optics.

---

## 3. User stories

### 3.1 Teacher — publish / confirm pack

- **US-T1 Publish generate.** As a teacher who publishes or materially updates an assignment/lesson for a class I teach, I want Kelyra to run **one** AI pass that drafts a **student-safe pedagogy pack** (objectives, likely misconceptions, allowed hint depth, vocabulary; hard cap ~800 tokens) so Ask can tutor consistently without me writing a second curriculum doc.
- **US-T2 Preview before live.** As that teacher, I must **preview** the pack and **Confirm** (or edit then Confirm) before any student Ask may inject it. First AI draft is never silently live. Matches “nothing is a grade until Approve” spirit for AI side-effects.
- **US-T3 Edit fields.** As that teacher, I can edit student-safe fields and optional **teacher-only** notes (never injected to student Ask) before Confirm.
- **US-T4 Skip / off.** As that teacher, I can dismiss or leave pack **unconfirmed** — assignment still publishes; Ask falls back to class context only (no pack inject).
- **US-T5 Re-generate.** As that teacher, I can request re-generate after edits; new draft requires Confirm again; prior confirmed pack stays in use until new Confirm or explicit clear.
- **US-T6 Stale on material edit.** If I change title/body/objectives/key stems after a pack is confirmed, product marks pack **stale** and stops student inject until I re-confirm or clear. Soft banner on teacher side: pack needs review — not a grade block.
- **US-T7 No keys in pack.** Pack generation and storage **must not** put answer keys, worked solutions, or “write this” stems into the **student-safe** slice. Teacher may keep separate key flows (KEYGRADE / Explain) untouched.

### 3.2 Student — Ask grounding

- **US-S1 Soft ground.** As a student on a lesson/assignment page (or practice deep-link with assignment id), when I open Ask, the product may **soft-assume** that assignment: chip/copy like “Looks like FoM 1.2 — tap if wrong.” I can correct without leaving Ask.
- **US-S2 Inject only if confirmed.** Pack injects into Ask runtime **only** when assignment is known, pack is **confirmed** (not draft/stale), and seat is student (or allowed practice path). Safe slice only.
- **US-S3 Tutor not solver.** Graded homework/quiz/exit ticket: Ask uses pack for Socratic / next-step / misconception depth per ASK-R2; still **refuses** final answer, key, or “here is what to write.” No partial answer on refuse.
- **US-S4 No pack dump.** I never see raw JSON pack, teacher-only notes, keys, or `explain_draft`. Model may use vocab/objectives implicitly; UI shows assignment **title** ground only.
- **US-S5 Empty / tray.** If I open Ask from tray/chrome with **no** page assignment, product does **not** hard-assume a pack. Class-only Ask or light “Working on a specific assignment?” — no silent wrong pack.
- **US-S6 Two live.** If two assignments are equally plausible, product asks which — never merge packs.
- **US-S7 Photo quiz.** Student photo of graded quiz/work → existing GAUTH refuse path; **no** vision tutor that solves from the photo. Pack does not override refuse.

### 3.3 Parent — co-teacher Ask

- **US-P1 Explicit ask.** As a parent (co-teacher), Ask does **not** soft-assume the child’s assignment. Product **explicitly asks** which assignment (or none) before pack inject.
- **US-P2 Co-teacher depth.** Once assignment chosen, parent may get fuller explain/solve per GAUTH parent seat — still never Approve, never other families, never twin bleed.
- **US-P3 No teacher-only SELECT.** Family path never reads `explain_draft`, draft keys, or teacher-only pack fields. Parent inject uses same **student-safe** slice (plus parent seat policy), not teacher preview blob.

### 3.4 Dual-hat / chrome seat / twins

- **US-D1 Dual-hat = chrome seat.** Active chrome seat drives Ask role guards and ground rules. Teacher-hat does not inherit parent soft/explicit mix-up; parent-hat does not get teacher Confirm tools.
- **US-D2 Child switcher.** Parent switching child clears or re-prompts assignment ground; never keep prior child’s assignmentId silently.
- **US-D3 Twins fail closed.** Saydee and Sydnee never share assignment ground, pack cache, or Ask thread context. Ambiguous twin → no pack inject until child is explicit.
- **US-D4 StudentId bound.** Pack inject for student seat requires bound student matches enrollment for that assignment’s class; else class-only / no pack.
- **US-D5 Office / super seat.** As office or superintendent, Ask never injects pedagogy packs, never soft-assumes assignments, and never requires a parent-style assignment card — ops chat only (IQG §6.1).
- **US-D6 Dual-hat office+teacher.** Confirm tools only on teacher seat + assignment detail; office seat does not inherit pack authoring.

### 3.5 Ops / integrity stories

- **US-I1 Help separate.** Help Edge ladder unchanged; may later **share** the same pack content, but UX and controls stay separate (no collapse).
- **US-I2 Cost once.** Generation is once per publish/update confirm cycle — not per student, not per Ask turn.
- **US-I3 Audit posture.** Confirm/clear/stale events are teacher-attributable facts (exact audit schema left to eng/security later); no student-facing audit dump.
- **US-I4 Re-ground (A).** After Just chatting / cleared ground, student and parent can Choose assignment again in-session; re-pick clears prior inject (IQG §6.2).
- **US-I5 Class switch clear.** Changing active class while Ask is open clears assignment ground and pack inject (IQG §6.3).
- **US-I6 Teacher Ask class-only.** Teacher-seat Ask does not inject student-safe packs; confirm surface is the author path (IQG §6.4).

---

## 4. Acceptance criteria

### 4.1 P0 (must ship with slice)

| ID | Sev | Pass |
|---|---|---|
| **ASK-P0-01** | P0 | **GO law:** Pedagogy pack is student-safe only (objectives, misconceptions, allowed_hint_depth, vocabulary; ≤~800 tokens). No key, worked solution, submission text, or `explain_draft` in student-safe slice. |
| **ASK-P0-02** | P0 | AI draft at publish/update is **not** injectable until teacher **Confirm**. Unconfirmed = Ask class-context only. |
| **ASK-P0-03** | P0 | Student Ask injects pack **only** when `assignmentId` is known for this session ground **and** pack status = confirmed. |
| **ASK-P0-04** | P0 | Student UX offers soft ground + **tap-to-correct** wrong assignment; correcting clears pack inject for prior id. |
| **ASK-P0-05** | P0 | Parent seat: **explicit** assignment confirm before pack inject; no soft-assume. |
| **ASK-P0-06** | P0 | Tray/direct Ask with no page assignment: **no hard-assume** pack. |
| **ASK-P0-07** | P0 | Twins fail closed: no cross-child assignmentId or pack. |
| **ASK-P0-08** | P0 | Dual-hat: chrome seat is SoT for role policy; no seat merge. |
| **ASK-P0-09** | P0 | Family/student paths cannot SELECT teacher-only pack fields or `explain_draft`. |
| **ASK-P0-10** | P0 | Graded student Ask still refuses final answer/key/“write this” even when pack present (ASK-R2 + GAUTH). |
| **ASK-P0-11** | P0 | Material assignment edit marks pack **stale**; student inject stops until re-confirm or clear. |
| **ASK-P0-12** | P0 | Help Edge remains a separate product surface (not merged into Ask). |
| **ASK-P0-13** | P0 | Generation is once-per-assignment confirm cycle, not per student / per Ask turn. |
| **ASK-P0-14** | P0 | Student photo-of-quiz path does not become a vision solver; refuse stays. |
| **ASK-P0-15** | P0 | Office seat and superintendent seat: zero pack inject, no soft chip, no parent assignment card (IQG-OFF-*). |
| **ASK-P0-16** | P0 | Confirm/Clear/Skip only on teacher assignment detail under teacher seat; dual-hat office+teacher must switch seat to author. |

### 4.2 P1 (same epic preferred; can trail UI polish)

| ID | Sev | Pass |
|---|---|---|
| **ASK-P1-01** | P1 | Teacher can edit pack fields pre-confirm and re-generate with Confirm gate again. |
| **ASK-P1-02** | P1 | Teacher can clear pack (off) without unpublishing assignment. |
| **ASK-P1-03** | P1 | Two-ambiguous-assignments prompt (“Which assignment?”) before inject. |
| **ASK-P1-04** | P1 | Soft ground chip shows human title (e.g. FoM 1.2), not raw UUID. |
| **ASK-P1-05** | P1 | Parent child-switch clears assignment ground and re-prompts. |
| **ASK-P1-06** | P1 | Stale teacher banner: pack needs review — non-blocking for grades/publish of work itself. |
| **ASK-P1-07** | P1 | Token/size guard: pack over cap is truncated or rejected at confirm with teacher-visible reason. |
| **ASK-P1-08** | P1 | Practice (non-graded) may use deeper scaffolding from pack depth field; still no submission answer paste. |
| **ASK-P1-09** | P1 | After Just chatting / cleared ground, student sees durable **Choose assignment**; parent card returns; re-pick clears prior inject (IQG-RG-*). |
| **ASK-P1-10** | P1 | Class switch while Ask open clears assignmentId/ground and drops pack inject; student chip updates/hides; parent card re-prompts (IQG-CL-*). |
| **ASK-P1-11** | P1 | Teacher-seat Ask never injects pack (class-only); attachment-only edits do not auto stale-mark. |

### 4.3 Explicit fail cases (P0)

| Fail | Expected |
|---|---|
| Confirmed pack contains key-like content that slipped generation | Teacher confirm UI must not be the only line of defense long-term; product law forbids student-safe key fields. Eng/security: strip/reject patterns — detail later. PM bar: student never receives key fields by schema. |
| Wrong child + right assignment title | Deny inject; twins fail closed. |
| Teacher dual-hat browsing as parent | Parent explicit rules apply under parent seat. |
| Unconfirmed pack | Zero student inject. |

---

## 5. Integrity matrix — student-safe vs teacher-only

| Field / artifact | Teacher preview | Student Ask inject | Parent Ask inject | Family SQL/API |
|---|---|---|---|---|
| objectives[] | Yes | Yes (safe slice) | Yes (safe slice) after explicit ground | Via safe view only |
| likely_misconceptions[] | Yes | Yes | Yes after ground | Safe view only |
| allowed_hint_depth | Yes | Yes | Yes after ground | Safe view only |
| vocabulary[] | Yes | Yes | Yes after ground | Safe view only |
| assignment title (display) | Yes | Soft chip only | Explicit picker labels | Title ok if enrolled |
| assignmentId (runtime ground) | n/a | Session ground | Session ground after confirm | Not a dump |
| teacher internal_notes | Yes | **Never** | **Never** | **Never** |
| draft_key_stems / keys / worked solutions | Separate key flows only — **not** pack safe slice | **Never** | Parent co-teacher may solve via seat policy, **not** by reading stored key pack | **Never** SELECT keys as pack |
| explain_draft | Teacher Explain flow | **Never** | **Never** | **Never** (GAUTH) |
| pack status draft/confirmed/stale | Yes | Only confirmed injects | Only confirmed + explicit ground | Status not required client-side for students |

**RLS product law (for later eng/security, not designed here):** student-safe view strips teacher-only keys; Edge `ask-assistant` attaches safe slice only; chrome passes `assignmentId` into live context when known.

**Hint depth enum (product):** `"next-step" | "conceptual" | "scaffolding"` maps to ASK-R2 techniques. Graded work clamps to non-answer behaviors regardless of depth.

---

## 6. Non-goals (this slice)

| Non-goal | Why |
|---|---|
| Per-assignment **answer/solver** skills | ASK-R1 harmful; integrity |
| Collapsing Help Edge into Ask | Separate control surfaces; share pack content later optional |
| Student vision tutor on quiz photos | GAUTH refuse; no T1 vision solve |
| Per-student or per-Ask-turn re-assessment | Cost 25–125×; variance |
| Auto-live pack without Confirm | Teacher gate required |
| Engineering / SQL / Edge / qa-loop on this card | Chain stops at PM → Design |
| PM drawing chrome option packs | `ui-ux-designer` owns options |
| Parent Approve / grade write | Never |
| Twin merge / shared Ask memory | Fail closed |
| Student-visible raw pack inspector | Title chip only |
| Changing GAUTH parent co-teacher law | Locked |
| Author studio full skill authoring MVP | Later; this is class-app publish pack |
| Git ship | devops-release only, never this card |

---

## 7. Designer brief — what must be optioned

**PM does not design.** `ui-ux-designer` builds option packs. PM will choose later. Surfaces that need options:

### 7.1 Teacher confirm surface (required options)

1. **Where it lives** after publish/update: inline on assignment publish success vs dedicated “Ask tutor brief” panel on assignment detail vs modal gate before leaving publish.
2. **Confirm / Edit / Re-generate / Skip / Clear** control set — hierarchy and destructive clarity (Clear vs Skip).
3. **Draft vs confirmed vs stale** status presentation (badge/banner) without looking like a grade state.
4. **Field editor** for objectives / misconceptions / depth / vocab — compact for phone + web teacher desk.
5. **Teacher-only notes** affordance clearly separated from student-safe fields (visual wall, not just label).
6. **Empty generation failure** and over-cap states.

### 7.2 Student “Looks like FoM 1.2” chip (required options)

1. Placement relative to Ask composer / thread header.
2. Soft-assume copy variants (short).
3. Tap-to-correct flow: switcher list vs clear-to-none vs “not this assignment.”
4. No-assignment tray empty state (do not invent a default pack).
5. Ambiguous two-assignment chooser.
6. Confirmed-pack-absent fallback (class-only) — quiet, not error theater.

### 7.3 Parent explicit confirm (required options)

1. Explicit ask pattern before first pack-using turn (modal / inline / first-message system).
2. Child switcher interaction with assignment ground reset.
3. “None / just chatting” path.
4. Co-teacher copy that does not sound like student soft-assume.

### 7.4 Wrong / empty / stale states (required options)

1. Student corrected away from assignment.
2. Pack stale mid-session (drop inject; optional quiet notice — not scary).
3. Unconfirmed pack (no student UI about missing pack).
4. Twin ambiguity (fail closed messaging).

### 7.5 Designer must NOT

- Invent solver UI, key reveal, or Help merge.
- Redesign full Ask chrome IA beyond ground/confirm slices.
- Pick the final option (PM chooses after pack).
- Re-research pedagogy (ASK-R1/R2/R3 SoT).

### 7.6 Evidence designer may cite

- ASK-R3 §5–6 (grounding UX comparison).
- ASK-R2 technique names only as depth labels, not new chrome.
- Existing teacher desk patterns in `docs/ui-design.md` (match IA; do not expand MVP).

---

## 8. Live context delta (product requirement, not eng design)

**Today (`askPrompt.ts`):** `AskLiveContext` = role, displayName, handle, classId, className, classCount, studentId, screen.

**This slice adds product need:**

| Live field | Rule |
|---|---|
| `assignmentId` | Set when navigation/page/deep-link knows assignment; cleared on correct-away, child switch, seat switch, tray-no-page, **class switch**, re-pick / Choose assignment. |
| `assignmentTitle` (display) | Human label for chip; never sole security boundary. |
| Pack attach | Server-side when id known + confirmed + seat rules; client does not trust self-supplied pack body. **Never** for office/superintendent seats; **never** for teacher-seat Ask (confirm surface only). |

Navigation sources (product intent): lesson player, assignment page, practice tray item, notification deep link. Tray shell alone ≠ assignment.

---

## 9. R3 amendments locked by PM

| R3 item | PM lock |
|---|---|
| One AI pass at publish/update | **Yes** |
| Student-safe pack ≤~800 tokens, no key | **Yes** |
| Teacher preview/confirm | **Yes — mandatory before inject** |
| Inject when assignmentId known | **Yes + confirmed + seat rules** |
| Student soft assume | **Yes** |
| Parent explicit | **Yes** |
| Tray no hard-assume | **Yes** |
| Help separate | **Yes** |
| Teacher-only fields | Allowed in teacher store; **never** student/parent inject |
| Stale on material edit | **Yes** (PM add) |
| Dual-hat chrome seat | **Yes** (PM add) |
| Twins fail closed | **Yes** (PM add) |

---

## 10a. IQG amendments (2026-09-10 · t_67da4743)

Full intent + stamp: `notes/company/ask-iqg-intent.md`. A-Filing UI lock unchanged. A/B/C not reopened.

### Office / superintendent (P0)

- Office seat + superintendent seat Ask: **no** pedagogy-pack inject, **no** student soft chip, **no** parent-style assignment card. Ops/school/class chat only.
- Confirm / Clear / Skip / Re-generate only on **teacher** assignment detail (teacher seat).
- Dual-hat office+teacher: switch to teacher seat to author/confirm; office Ask does not inherit pack tools or soft-assume.

### Re-ground after clear (P1) — pick **(A)**

- Durable in-session re-ground for **student and parent** after Just chatting / cleared chip — not leave/re-enter-only friction.
- Student: mute **Choose assignment** composer-adjacent when no ground.
- Parent: empty-state **Which assignment?** card returns (or equivalent durable control).
- Re-pick always clears prior inject before new inject.
- **Designer required:** CoS staffs micro fold into ui-design §12.6 only.

### Class switch (P1)

- Active class change while Ask open clears `assignmentId`/ground and drops pack inject.
- Student chip updates or hides; parent card re-prompts if pack path desired.

### Optional locks closed

- Teacher-seat Ask: **no** pack inject (class-only).
- Attachment-only edit: does **not** auto stale-mark (title/body/objectives/key stems still do).

### DESIGN STAMP (PM line)

```
PM: APPROVED  date: 2026-09-10  profile-session: t_67da4743 / product-manager
```

QA Supervisor re-stamp still required. Engineering gate = both APPROVED (+ designer fold for §6.2 A).

---

## 10. Handoff

| Field | Value |
|---|---|
| **OBJECTIVE** | PM lock GO on publish-time pedagogy pack + Ask assignment context |
| **RESULT** | `notes/company/ask-assignment-context-pm.md` |
| **GO/NO-GO** | **GO** |
| **ESCALATION NEEDED** | No — CoS staffs designer |
| **RECOMMENDED NEXT ACTION** | Chief of Staff: staff `ui-ux-designer` option pack against §7 designer brief. **Do not** staff Engineering until PM chooses/OKs a UI option. |
| **Out of this card** | No src/, SQL, qa-loop, git ship, designer option drawing by PM |

**CEO note:** PM likes the slice. Proceed Design → PM UI OK → Engineering.

---

*End ASK-P1 PM lock.*

