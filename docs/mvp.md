# Kelyra MVP — features, flows, stack

**Date:** 2026-08-12  
**Audience:** elementary / middle-school teachers, one teacher, 50–100 students  
**Sources:** `research/01`–`06`

Kelyra is the missing join, not another generator:

> voice / camera → right student record → named gap → short assigned practice → simple grade

One busy teacher, one class, this week’s work. No inspected 2026 product owns that loop.

---

## 1. Feature list (tightened)

### Must-have for MVP

Ship only what the core loop needs. If a teacher cannot photograph an exit ticket, have it land on Maya, see “place value,” assign 5 problems, and mark a score — it is not an MVP.

| ID | Feature | Why it must ship |
|---|---|---|
| M1 | **One class, typed roster** | The matcher only works against a small name list. First + last initial is enough. No photo-of-list, no SIS. |
| M2 | **Voice + camera capture, no form** | Hold record or snap a photo (then speak the name). Incomplete is fine. This is the only input a busy teacher will use. |
| M3 | **Auto-file by spoken name** | Transcript is matched to that class list. The photo is attributed by the spoken name, not by faces or OCR. |
| M4 | **Unassigned inbox** | No match → park it. Never invent a student. One tap to assign later. Without this, auto-file is unsafe. |
| M5 | **Student record that accepts fragments** | A student exists as soon as they are on the roster. Notes and photos attach even if nothing else is known. No IEP/contact schema in v1. |
| M6 | **Homework → AI named gaps, teacher approves** | After a student is confirmed, the model drafts 1–3 skill gaps and an optional score. One glance to accept, edit, or keep as a note. Nothing is a grade until the teacher taps Approve. |
| M7 | **Generate and assign a short practice set** | From one approved gap, generate 3–8 items for *this* skill. Teacher can tweak wording and assigns to that student. This is the product. |
| M8 | **Student to-do** | That student opens a class link, sees only their assigned set, and submits answers. Practice with no place to do it is theater. |
| M9 | **Simple grade book** | Teacher-only grid: students × a few columns (captured work + assigned practice). Score or mark after Approve. Draft vs done. No weights, no categories, no CSV yet. |
| M10 | **Phone captures; web reviews and assigns** | Mobile is record/camera/inbox. Web is student page, generate/assign, grade book. |

FERPA is a constraint on all of the above, not a feature: paid model tier, no training on student work, teacher Approve before a student sees anything.

### Should-have (right after launch)

Valuable once one teacher is actually using the loop. Do not block launch.

| ID | Feature | Why it waits |
|---|---|---|
| S1 | **Typed one-line note** | Voice/camera cover the loop. Type is a fallback when the room is quiet. |
| S2 | **Split one recording across students** (“New note, Priya…”) | Walk-around gold, but matching bugs multiply. Get one-student-per-capture right first. |
| S3 | **Line-item editing of generated practice** | v1 can regenerate or discard the set. Per-item editing is polish. |
| S4 | **Skill history on the student page** | Chronological attempts (Otus-style). MVP only needs current gap + latest score. |
| S5 | **Class heatmap** | “Who else has this gap?” Nice for grouping; not required to assign to one child. |
| S6 | **CSV export** | Needed when they trust the book. Not needed to start. |
| S7 | **Approve / mark done from the phone** | Web is enough for the first week. |
| S8 | **One-sentence parent note + weekly email** | Best-supported incentive, still not the loop. Student to-do is the only v1 signal: assigned / done / focus skill. |
| S9 | **Mark focus proficient or dismiss** | Close the Khan-style mission. Until then, teacher just stops assigning. |

### Later / nice-to-have

| ID | Feature | Why later |
|---|---|---|
| L1 | Photograph a class list, IEP, or 504 and extract fields | No education app does this cleanly. High-sensitivity PII. |
| L2 | SIS / OneRoster / Clever import and grade passback | Right model, wrong first customer. |
| L3 | LMS sync (Classroom / Canvas / Schoology) | Only works when already bound to an LMS assignment. |
| L4 | Multi-student packet split | Humans still type names after the split. |
| L5 | Offline capture queue | Hallway-correct; conflict-heavy. Online-only is fine. |
| L6 | Parent SMS | Evidence-backed, A2P cost and compliance. |
| L7 | Points, Gems, streaks, leaderboards | Weak academic evidence. Do not build a rewards engine. |
| L8 | Face match or OCR of a name on the page | No inspected product does this for freeform homework. |
| L9 | Full state-standards library / 500+ rubrics | Teacher-named skills are enough. |
| L10 | Student chat tutor | Adjacent product. Kelyra assigns short practice. |
| L11 | Extra student metadata (contacts, accommodations cards) | Attachments and notes cover “I need to remember this.” |
| L12 | Dedicated Document AI / Textract | $30 / 1k pages. Add only if the one model fails at lists. |
| L13 | Multi-class, multi-teacher, district admin | Single-teacher SKU first. |

### Explicitly out of scope for MVP

- Replacing the district SIS or becoming the school’s official grade book of record
- Auto-publishing AI grades to students or parents
- Attendance, behavior points, or ClassDojo-style incentives
- Full IEP / 504 management
- Live merge of the same grade cell on phone and browser
- Training models on student work
- A second AI vendor (separate STT, OCR, or LLM) unless the one model is proven inadequate

---

## 2. Core user flows

Identity rule: a fragment is not a record until it has a **stable `studentId`**. Matching is **class roster + spoken or confirmed name**. Assigned practice also needs **`assignmentId`**.

```
[Mobile: record or photo + name]
        ↓
[Match to roster or Unassigned]
        ↓
[If homework] → [AI drafts 1–3 gaps + optional score] → [Teacher Approve]
        ↓
[Simple grade book] + [Generate 3–8 items] → [Assign to that student]
        ↓
[Student to-do] → [Submit] → [Score on the same row]
```

### A. Teacher mobile capture

**A1. First-run roster (once)**  
Create class. Type student names (first + last initial). Done.

**A2. Voice note**  
Class already selected. Hold Record: “Mateo is still lining up place value.” On release: suggested student → glance → Save. No name → Unassigned.

**A3. Photo of work**  
One student per shot. Snap, then speak the name (and optionally the issue). Photo files to that student. AI runs only after confirm. Teacher Approves gaps/score on the web (S7 moves this to the phone).

**A4. Inbox**  
Unassigned items. One tap to pick the student.

v1 requires network.

### B. Teacher web

**B1. Student page** — timeline of today’s captures, current gap, latest score.  
**B2. Approve** — draft gaps + optional score; accept / edit / note-only. Approve writes the grade-book cell.  
**B3. Assign practice** — pick one gap → generate 3–8 items → assign to that student.  
**B4. Grade book** — students × captured work + practice. Draft vs done. No export yet.

### C. Student (MVP)

Class link + roster name. To-do is the assigned set only. After the teacher Approves, they see the focus skill and whether practice is done. No leaderboard. No parent account in v1 (that is S8).

---

## 3. Recommended technical approach and AI stack

Grounded in `research/04` and `research/06`. Cost-conscious default for one teacher, not a locked vendor contract.

### Client

- **One TypeScript app: Expo (preferred) or Capacitor.** iOS + Android + web.
- **Mobile:** record, camera, inbox.
- **Web:** student page, generate/assign, grade book.
- **Voice:** send audio to the one multimodal model. No second STT vendor.
- **Offline:** skip.

### Data

- **Postgres** (Supabase): `users`, `classes`, `enrollments`, `assignments`, `submissions`, `line_items`, `results`.
- **`students.metadata jsonb`** only as a bag for later; v1 does not build a metadata UI.
- **Grade book ≠ JSON.** One result per student per line item.
- **Fragments:** audio/photo, transcript, matcher confidence, nullable `student_id`, `unassigned | confirmed | approved`.
- **Publication gate:** draft until teacher Approve. Students only see approved work.

### Hosting

| Piece | Default | Cost (one teacher) |
|---|---|---|
| Expo EAS | Free | $0; $19/mo if build limits bite |
| Supabase | Free, then Pro | $0 (pauses after 1 idle week) or **$25/mo** always-on |
| Push | FCM | $0 / message (needed once S8 exists) |
| App stores | Apple + Play | $99/year + $25 once |

### AI — one model

One paid multimodal API: transcribe, guess the spoken name against the provided roster, draft gaps/score, generate 3–8 items.

Public 2026 pricing: **Gemini 3.5 Flash-Lite** was the cheapest all-in-one meter; **gpt-5-nano** if the turn is text-only. Do not add Speech-to-Text or Document AI Form Parser ($30/1k pages) unless that model fails.

Every call: inject this class’s first names + media + a short JSON schema. Persist output as draft. Teacher Approve mutates the record.

### FERPA (constraint, not a feature)

Teacher is the customer. Paid model tier, no training. Prefer de-identified names in prompts when quality allows. Do not claim district school-official status without a signed DPA.

---

## 4. Key risks and open questions

1. **Spoken-name accuracy** in a noisy room, nicknames, two Mayas. No vendor publishes this.
2. **No-name utterances** must feel saved, not lost (Unassigned).
3. **One-student-per-photo** — will teachers reject that?
4. **Approve must be one glance** or capture dies.
5. **Practice quality** must match this week’s method. Unvalidated.
6. The **closed loop** (photo → gap → assigned practice → same grade row) is not documented in any existing product.
7. **AI monthly cost is unpublished.** Need a visible meter.
8. **IEP photos** are high-sensitivity; treat accidental IEP shots as private attachments, do not extract.

---

## Suggested build order

1. Class + typed roster + voice capture + spoken-name match + Unassigned.
2. Photo + speak-the-name, same matcher.
3. Student page + Approve gaps/score + simple grade book.
4. Generate 3–8 items + assign + student to-do.
5. Then should-haves: typed notes, split recording, skill history, parent sentence, CSV.
6. Then later items only if a real teacher asks.
