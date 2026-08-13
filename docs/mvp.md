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
| M1 | **One class + roster via voice, photo, or type** | Matcher needs a name list. Teacher creates the class and adds students by speaking names, photographing a printed list (confirm every name), or typing. No SIS. |
| M2 | **Voice + camera capture, no form** | Hold record or snap a photo (then speak the name). Incomplete is fine. This is the only input a busy teacher will use. |
| M3 | **Auto-file by spoken name** | Transcript is matched to that class list. The photo is attributed by the spoken name, not by faces or OCR. |
| M4 | **Unassigned inbox** | No match → park it. Never invent a student. One tap to assign later. Without this, auto-file is unsafe. |
| M5 | **Student record that accepts fragments** | A student exists as soon as they are on the roster. Notes and photos attach even if nothing else is known. No IEP/contact schema in v1. |
| M6 | **Homework → AI named gaps, teacher approves** | After a student is confirmed, the model drafts 1–3 skill gaps and an optional score. One glance to accept, edit, or keep as a note. Nothing is a grade until the teacher taps Approve. |
| M7 | **Generate and assign a short practice set** | From one approved gap, generate 3–8 items for *this* skill. Teacher can tweak wording and assigns to that student. This is the product. |
| M8 | **Student to-do** | That student opens a class link, sees only their assigned set, and submits answers. Practice with no place to do it is theater. |
| M9 | **Simple grade book** | Teacher-only grid: students × a few columns (captured work + assigned practice). Score or mark after Approve. Draft vs done. No weights, no categories, no CSV yet. |
| M10 | **Phone captures; web reviews and assigns** | Mobile is record/camera/inbox. Web is student page, generate/assign, grade book. |
| M11 | **Lightweight student/parent progress view** | Student: assigned / done / focus skill. Parent: same, plus the teacher-approved one-liner, via an invite link for that child only. No grade book, no points, no weekly email. |

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
| S8 | **Weekly parent email digest** | The invite-link view is enough for v1. A scheduled email is the next increment, not SMS. |
| S9 | **Mark focus proficient or dismiss** | Close the Khan-style mission. Until then, teacher just stops assigning. |

### Later / nice-to-have

| ID | Feature | Why later |
|---|---|---|
| L1 | Photograph an IEP or 504 and extract fields | High-sensitivity PII. Class-list names with confirm are in MVP; IEP fields are not. |
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

v1 requires network. One student per homework photo. IEP/504 photos are private attachments — do not extract fields.

```
[Create class] → [Add students: voice / photo of list / type]
        ↓
[Mobile: photo of work + spoken name] → [Match or Unassigned]
        ↓
[AI drafts 1–3 gaps + optional score] → [Teacher Approve]
        ↓
[Generate 3–8 items] → [Assign to that student]
        ↓
[Student to-do] → [Submit] → [Score on the same row]
        ↓
[Student + parent see: focus skill, assigned / done]
```

---

### Flow 1 — Add a class and students (voice, photo, or type)

The matcher is useless without names. Adding a student must be as cheap as capture: speak it, or photograph the list already on the wall / in the plan book. Every new name is a suggestion until the teacher confirms. Kelyra never invents a roster row.

**1a. Create the class (phone or web)**

1. Teacher signs in and taps **New class**.
2. Voice (preferred): hold Record — “Room 14 math” or “Third period science.”  
   Or type the class name. One field. No period/subject/grade form.
3. That class becomes the active class. All later capture uses it until they switch.

**1b. Add one student by voice (phone)**

1. In that class, tap **Add student** or just start recording from the class home: “Add Maya Chen.” / “New student, Jamal W.”
2. Kelyra transcribes, extracts a display name, and shows a confirm card: **Add “Maya Chen” to Room 14 math?**
3. If that name (or a close nickname) already exists, offer **Use Maya Chen** instead of creating a duplicate.
4. Teacher taps **Add**. Student now has a `studentId`. Record is empty except the name. That is enough.
5. Unclear audio (“add the new girl”) → no row created. Prompt: “Say the student’s name” or pick from the list. Do not guess a new person.

**1c. Add many students by photographing a printed list (phone)**

This is a roster bootstrap, not IEP extraction. One printed class list or seating chart with names.

1. Teacher taps **Add students → Photo of list**.
2. They photograph the list (or pick an existing image). One page for MVP.
3. The model returns a list of suggested names only (no IDs, grades, or other fields).
4. Confirm screen: a checklist of those names, all selected. Teacher unchecks garbage (“Period 2”, “Present”), fixes a misspelling in place, or taps **Add missing** and types one name.
5. **Add N students** creates one roster row per checked name. Already-on-roster names are skipped and marked “already here.”
6. Low-confidence lines stay unchecked. Teacher must opt in. Nothing is added silently.

**1d. Type a name (fallback)**

On phone or web: **Add student**, one name field, Save. Same duplicate check as 1b.

**1e. Mid-year add**

Same as 1b/1d at any time. A student who appears only in a homework photo is **not** auto-created. That photo goes to Unassigned (Flow 2). Teacher adds them first, then files the photo.

---

### Flow 2 — Capture and analyze homework

One piece of work, one student, then speak the name. Analysis does not run until the student is confirmed.

**2a. Photograph the work (phone)**

1. Active class is already selected (last used).
2. Teacher taps the shutter. One student per shot. They can shoot a stack by repeating this loop; Kelyra does not split a page of many papers.
3. Immediately after the shot, hold Record (or the mic is already open): “This is Mateo’s exit ticket, still lining up place value.”
4. If they skip speaking, the photo is saved to **Unassigned** with no analysis. It is not lost.

**2b. Match**

1. Transcript + class roster → suggested student + confidence.
2. High confidence (clear “Mateo” and one Mateo): auto-select, show a 2-second chip — **Mateo — tap to change**. Teacher can walk to the next desk.
3. Low confidence or two Mateos: stay on a pick list. Teacher taps one name. Photo does not file until they do.
4. No name in the transcript: **Unassigned**. Inbox shows the photo thumbnail + transcript. One tap assigns a student later.

**2c. Analyze (after a student is attached)**

1. The model sees the image plus a short schema. It does **not** get parent contacts or IEP text.
2. It returns a draft on that student’s record:
   - 1–3 named gaps (e.g. “two-digit regrouping”)
   - optional score / mark if the page looks like scored work
   - one short teacher-facing note (Glow/Grow is fine; not shown to the student yet)
3. Status = **Draft**. Grade book cell is empty or gray. Student and parent see nothing.
4. If the photo is blank, unreadable, or not student work: no gaps, status stays **Note only**. Teacher can still keep the photo on the record.

**2d. Inbox (phone, also on web)**

- Unassigned photos/notes.
- Drafts waiting for Approve (so the teacher knows analysis is ready).
- Approve itself is on the web in v1 (S7 moves it to the phone).

**2e. Voice-only observation (no photo)**

Same match rules. “Jamal guessed on the quiz.” Files as a note on Jamal. No gap draft unless the teacher later attaches work or asks to analyze from the note. Keeps capture cheaper than skipping it.

---

### Flow 3 — Review gaps and assign practice

This is the web flow. The teacher sits down after class.

**3a. Open the class**

Class home shows:

- How many drafts are waiting
- How many items are Unassigned
- Students with a current drafted or approved gap

No heatmap required.

**3b. Review one student’s work**

1. Open the student (from the draft list or the roster).
2. See: the photo, the transcript, drafted gaps, optional score, the short note.
3. Teacher can:
   - **Approve** as-is
   - edit a gap label or the score, then Approve
   - drop to **Note only** (keep the photo, no grade, no practice)
   - send back to Unassigned if it is the wrong kid
4. Approve writes the grade-book cell for that capture and sets **current focus skill** to the first approved gap (teacher can pick a different one on the same screen).
5. Student still sees nothing until practice is assigned, except the approved focus skill if the teacher wants it visible. Default: visible after Approve.

**3c. Generate practice**

1. On that student, tap **Practice for “two-digit regrouping.”**
2. Optional one-liner from the teacher: “Use the textbook method, not stacks of ten.” If they say nothing, generate from the gap name + the homework photo as context.
3. Model returns 3–8 short items (not a new unit). Preview on one screen.
4. Teacher **Assign**, **Regenerate**, or **Discard**. No per-item editor in v1 (that is S3).
5. Assign creates an `assignmentId` + one submission for that student only. Due date defaults to tomorrow; teacher can change it.

**3d. After assign**

- Student to-do gets the set (Flow 4).
- Grade book gains a practice column for that set, empty until the student submits (or the teacher marks it).
- Teacher can assign the same generated set to one more student from this screen (pick another name). Building a class-wide packet is later.

**3e. When the student submits**

Answers land on that submission. Model may draft a practice score; teacher Approves it the same way as homework. Result writes to the same grade-book row. Current focus skill stays until the teacher stops assigning (S9 adds Proficient / Dismiss).

---

### Flow 4 — Student and parent progress view

Lightweight. No points, no leaderboard, no weekly email, no grade-book grid.

**4a. Student**

1. Teacher copies a **class link** (also a short code). First visit: pick their roster name. Two students with the same first name show last initial.
2. Home is only:
   - current focus skill (after teacher Approve)
   - practice to-do (items + submit)
   - last practice: **Done** or **Not started**
3. They do not see drafts, other students, or the teacher grade book.
4. Submit locks the attempt. They cannot edit after submit. Teacher can still change the approved score.

**4b. Parent**

1. From the student page, teacher taps **Invite parent** and sends a link (Messages, email, whatever they already use). Link is bound to that `studentId` only.
2. Parent opens the link, confirms a simple sign-in (email magic link is enough).
3. They see one screen:
   - child’s name and class
   - current focus skill
   - practice status: assigned / done
   - the one teacher-approved sentence, if any (“Still working on regrouping. Five problems assigned.”)
4. They do not see: drafts, scores, the photo of the work, the grade book, or any other child.
5. If the teacher has not Approved yet, the parent view is empty except the child’s name. Silence is correct.

**4c. What “progress” means in v1**

Assigned → Done on the current focus skill. That is the signal. Trends, streaks, and weekly mail wait.

---

## 3. Recommended technical approach and AI stack

Grounded in `research/04` and `research/06`. Cost-conscious default for one teacher, not a locked vendor contract.

### Client

- **One TypeScript app: Expo (preferred) or Capacitor.** iOS + Android + web.
- **Mobile:** new class, add student (voice/photo of list), record, camera, inbox.
- **Web:** student page, generate/assign, grade book, parent invite.
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

One paid multimodal API: transcribe, extract names from a photographed class list, guess the spoken name against the provided roster, draft gaps/score, generate 3–8 items.

Public 2026 pricing: **Gemini 3.5 Flash-Lite** was the cheapest all-in-one meter; **gpt-5-nano** if the turn is text-only. Do not add Speech-to-Text or Document AI Form Parser ($30/1k pages) unless that model fails.

Every call: inject this class’s first names + media + a short JSON schema. Persist output as draft. Teacher Approve mutates the record.

### FERPA (constraint, not a feature)

Teacher is the customer. Paid model tier, no training. Prefer de-identified names in prompts when quality allows. Do not claim district school-official status without a signed DPA.

---

## 4. Key risks and open questions

1. **Spoken-name accuracy** in a noisy room, nicknames, two Mayas. No vendor publishes this.
2. **No-name utterances** must feel saved, not lost (Unassigned).
3. **Class-list photo quality** — printed lists, handwriting, and extra column junk. Confirm-every-name is mandatory; still unvalidated.
4. **One-student-per-photo** — will teachers reject that?
5. **Approve must be one glance** or capture dies.
6. **Practice quality** must match this week’s method. Unvalidated.
7. The **closed loop** (photo → gap → assigned practice → same grade row) is not documented in any existing product.
8. **AI monthly cost is unpublished.** Need a visible meter.
9. **IEP photos** are high-sensitivity; treat accidental IEP shots as private attachments, do not extract.

---

## Suggested build order

1. Create class + add students (voice, photo-of-list with confirm, type).
2. Homework photo + spoken-name match + Unassigned.
3. Student page + Approve gaps/score + simple grade book.
4. Generate 3–8 items + assign + student to-do.
5. Parent invite link (focus skill + assigned/done).
6. Then should-haves: typed notes, split recording, skill history, weekly email, CSV.
