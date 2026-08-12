# Kelyra MVP — features, flows, stack

**Date:** 2026-08-12  
**Audience:** elementary / middle-school teachers, one teacher, 50–100 students  
**Sources:** `research/01`–`06`

Kelyra is the missing join, not another generator:

> voice / photo / short natural language → incomplete fragment → correct student record → gap analysis → short assigned practice → practical grade book → one-sentence parent signal

No inspected 2026 product owns that whole loop. MagicSchool / Brisk / Diffit / SchoolAI / CoGrader generate lessons and grades. Voice Assess / Pulse / TeachScribe auto-file spoken notes. Seesaw / Classroom / Khan own assign + grades. ClassDojo owns points. The wedge is **auto-filing + a closed practice loop**.

---

## 1. Prioritized MVP feature list

### Must-have

These ship together or the product is just another notes app or another grader.

| ID | Feature | Why it is MVP | Research basis |
|---|---|---|---|
| M1 | **Class-scoped roster** | Matcher only works against a small name list. Teacher picks the class once, then captures freely. | Voice Assess, TeachScribe MIS lists |
| M2 | **Form-free capture: voice, camera, short text** | No observation form. Tap record, snap photo, or type one line. Incomplete is valid. | Pulse, Voice Assess, TeachScribe |
| M3 | **Spoken-name auto-file** | Transcript is matched to the class list. “New note, Maya…” splits one take into per-student fragments. Photos are attributed by the spoken name over the media, not by faces or OCR. | Voice Assess media-first; no product matches photos by face/OCR |
| M4 | **Unassigned inbox** | If no name matches, park the fragment. Never invent a student. Teacher confirms or types a name later. | Gradescope Unassigned; CoGrader still requires a typed name |
| M5 | **Sparse student record** | Required: stable `studentId` + class. Everything else (notes, accommodations, IEP fragments, contacts, skills) is optional JSON that grows over time. | OneRoster optional blanks; Postgres `jsonb` |
| M6 | **Later confirmation, not a form up front** | After capture: review transcript, suggested student, suggested cleanup. Original audio/photo is preserved until the teacher accepts. Uncertain notes stay informal until published. | Voice Assess preview; FERPA sole-possession vs education record |
| M7 | **Homework photo → draft score + named gaps** | Once filed to a student (and optionally an assignment), one multimodal model drafts criterion comments / skill gaps. Teacher approves before anything is a grade. | CoGrader, Formative Luna, Class Companion |
| M8 | **Practical grade book** | Relational line items + results keyed to `studentId` + `assignmentId`. Teacher-only. Draft until Return. CSV export. | OneRoster Gradebook; Classroom publication gate |
| M9 | **Skill attempt history** | Every tagged attempt is kept. Student × skill cell opens as a chronological list (date, source, result). Last-color-only is not enough. | Otus standards history |
| M10 | **Generate + assign a short focus exercise** | From a named gap, generate 3–8 items that augment (not replace) the current unit. Teacher edits, then assigns to that student. Continues until the teacher marks the focus proficient or dismisses it. | Khan Readiness Mission; CoGrader heatmap → assign |
| M11 | **Web reports + assign** | Mobile = capture. Web = roster fields, grade book, skill trends, author/assign practice. Grade/return allowed on both. | Brightwheel split; Seesaw is the everything-everywhere outlier |
| M12 | **One-sentence parent progress note** | After Return: “Maya still needs practice on two-digit regrouping. 4 short problems assigned.” In-app / email first. Improvement-framed, not praise-only, not points. | Kraft & Rogers; Bergman & Chan |
| M13 | **FERPA-aware publication** | Student work, names, grades, notes are PII once school-maintained. Paid model tier (no training). Strip roster identifiers from model prompts when possible. Teacher approval before parent-visible or grade-book-visible. | 34 CFR §§ 99.3, 99.30, 99.31 |

### Nice-to-have (not MVP)

Do these only after one teacher can complete the loop above for a week without a spreadsheet.

| ID | Feature | Why later |
|---|---|---|
| N1 | Photograph a printed class list / IEP / 504 and extract fields | No education app does this. Needs a caller-defined schema + confirm every field. First roster = type names or CSV. |
| N2 | SIS / OneRoster / Clever import and grade passback | Right model (sourcedId), wrong first customer (individual teacher). |
| N3 | LMS sync (Classroom / Canvas / Schoology) | Auto-write only works when already bound to an LMS assignment + known ID. |
| N4 | Multi-student packet split | CoGrader can try; humans still Combine/Split and type names. Costly and error-prone. |
| N5 | Offline capture queue (SQLite → sync) | Correct for hallway capture; adds conflict rules. Online-only is acceptable for v1. |
| N6 | Parent SMS | Best evidence, but A2P 10DLC + per-segment fees. Email / in-app first. |
| N7 | ClassDojo-style points, Gems, streaks | Weakest evidence for academic outcomes. Don’t build a rewards engine. |
| N8 | Face match or OCR of a name on the page | No inspected product does this reliably for freeform homework. |
| N9 | Full state-standards library / 500+ rubrics | Start with teacher-named skills + a few built-in elementary math/ELA foci. |
| N10 | Student chat tutor / Space | Adjacent (SchoolAI, Khanmigo). Kelyra assigns short practice, it does not become the tutor. |
| N11 | District admin, multi-teacher, row-level SIS security | Single-teacher SKU first. |
| N12 | Dedicated Document AI / Textract extractors | $30 / 1k pages. Add only if multimodal extraction of lists/IEPs fails. |

### Explicit non-goals for MVP

- Replacing the district SIS or becoming the grade book of record for the school.
- Auto-publishing AI grades to students or parents.
- Live merge of the same grade cell on phone and browser (no CRDT).
- Training models on student work.

---

## 2. Core user flows

Identity rule used in every flow: a fragment is not a record until it has a **stable `studentId`**. Matching is **class roster + spoken or confirmed name**. Assignment-linked work also needs **`assignmentId`**.

```
[Mobile capture] → [Match or Unassigned] → [Teacher confirm]
        ↓
[Sparse student record] ← optional metadata (notes, IEP bits, contacts)
        ↓
[If homework / assessment] → [AI draft score + named gaps] → [Approve]
        ↓
[Grade book result] + [Focus skill]
        ↓
[Web: generate 3–8 items] → [Assign to that student]
        ↓
[Student does practice] → [New attempt on skill history]
        ↓
[One-sentence parent note after Return]
```

### A. Teacher mobile capture

**A1. First-run roster (once per class)**

1. Create class (“Room 14, Math”).
2. Add students by short names (first + last initial is enough). CSV optional.
3. Photographing a printed list is *not* required for MVP; if offered later, every extracted name lands in Unassigned until confirmed.

**A2. Hallway / desk voice note**

1. Open the class (or last-used class is already selected).
2. Hold Record. Speak naturally: “Jamal is guessing on regrouping. New note, Priya finished early and helped the table.”
3. On release: transcript + suggested split + suggested students.
4. Teacher glances, taps Save. Each fragment writes to that student’s record immediately, even if nothing else is known.
5. No name recognized → Unassigned, still saved.

**A3. Photo of work, then speak**

1. Snap homework / exit ticket / quiz (one student per shot for MVP).
2. Speak: “This is Mateo’s exit ticket, still lining up place value.”
3. Photo + transcript attach to Mateo. If the teacher also says a score or “put this on the fractions quiz,” bind to that assignment if it exists; otherwise create a draft assignment titled from the utterance or “Untitled capture, Aug 12.”
4. AI runs only after a student is confirmed. Draft: 2–4 named gaps + optional score + 1 Glow / 1 Grow. Teacher edits and Approves, or keeps as a note only.

**A4. Short natural language (when talking is awkward)**

- Type: “Sofia IEP extra time 1.5x” or “need a parent email for Jordan.”
- Same matcher, same Unassigned fallback, same sparse merge.

**A5. Review on the phone (light)**

- Inbox: Unassigned + “draft grades awaiting Return.”
- Teacher can Return a single item from the phone (same as Classroom). Deep reports wait for the web.

**Offline (v1):** require network for Save. Queueing is N5.

### B. Teacher web: reports, grade book, assign

**B1. Class home**

- Roster with sparse completeness (how much we know).
- Unassigned count.
- Skill heatmap: which named gaps are common this week (CoGrader pattern).
- Assignments with draft vs returned counts.

**B2. Student record**

- Timeline of fragments (voice, photo, notes), newest first.
- Optional metadata cards (accommodations, contacts) — empty is fine.
- Skill history table + sparkline (Otus pattern).
- Active focus plan, if any.
- Grade book row for this class.

**B3. Approve AI analysis**

1. Open a captured assignment set.
2. See per-student draft score, comments, named gaps.
3. Edit / override / reject.
4. Return. Only then: write `Result` to the grade book, update skill attempts, enable parent note.

**B4. Create and assign a focus exercise**

1. From a student gap or the class heatmap, choose one skill (“two-digit regrouping”).
2. Generate 3–8 short items aligned to *this week’s* unit language (teacher can paste a textbook page or type the topic). Exercises augment, they do not replace the core lesson.
3. Teacher edits items, sets a short due window.
4. Assign to one student or a small group. Each gets a `StudentSubmission` keyed by `courseId` / `assignmentId` / `userId`.
5. Practice results write new skill attempts. Focus stays open until the teacher marks Proficient or Dismisses (Khan Mission analog, teacher-gated).

**B5. Grade book**

- Rows = students, columns = line items (assignments + returned practice).
- Draft vs Returned is visible. Students/parents never see drafts.
- Export CSV. No live SIS overwrite in MVP.

### C. Student and parent views

**Student (minimal)**

- Sign-in with a class code + roster name the teacher already created (not a free-typed identity). Duplicate first names force last initial.
- To-do: assigned focus exercises only.
- After Return: the Glow/Grow the teacher approved — not the raw AI draft.
- No public leaderboard.

**Parent (minimal)**

- Invite link tied to that student only.
- Sees: returned comments, active focus skill, and the latest one-sentence “what to work on.”
- Does not see the grade book, drafts, or other children.
- Weekly digest email is enough for MVP; SMS is N6.

---

## 3. Recommended technical approach and AI stack

Grounded in `research/04` and `research/06`. This is the cost-conscious default for one teacher, not a locked vendor contract.

### Client

- **One TypeScript app: Expo (preferred) or Capacitor.** iOS + Android + web. Flutter web is a poor fit for document-heavy reports.
- **Mobile:** record, camera, inbox, Return.
- **Web:** grade book, skill trends, generate/assign, roster metadata.
- **Camera:** first-party plugin (device + web file picker).
- **Voice:** send audio to the multimodal model for transcription + name extraction. Expo Speech is TTS only; do not add a second STT vendor in v1.
- **Offline:** skip for MVP. If added, SQLite queue for captures only; refuse assignment send / Return offline.

### Data

- **Postgres** (Supabase): relational `users`, `classes`, `enrollments`, `assignments`, `submissions`, `line_items`, `results`.
- **`students.metadata jsonb`** for sparse, growing fields (GIN on existence/containment).
- **Grade book ≠ JSON.** OneRoster-shaped `lineItems` + `results`, each result keyed to student + line item.
- **Fragments table:** raw audio/photo URLs, transcript, matcher confidence, `student_id` nullable, `status` = unassigned | confirmed | published.
- **Publication gate:** `draft` → teacher `returned`. Parent/student queries only `returned`.
- **Conflicts:** last timestamp wins on results; never overwrite a teacher-edited grade with a later model write (`pending_manual` if the teacher already touched it).

### Hosting and notifications

| Piece | Default | Cost (one teacher) |
|---|---|---|
| Expo EAS | Free | $0; $19/mo if build limits bite |
| Supabase | Free, then Pro | $0 (pauses after 1 idle week) or **$25/mo** always-on |
| Storage | Supabase Storage | photos/audio inside the 1–100 GB plan |
| Push | Firebase Cloud Messaging | $0 / message |
| Email digest | Resend / Postmark | pennies; do this before SMS |
| App stores | Apple + Play | $99/year + $25 once |

### AI — one model, not a pile of vendors

Use **one paid multimodal API** for: transcribe voice, read a homework photo, extract spoken names against the provided roster, draft gaps/comments, and generate 3–8 practice items.

Public 2026 pricing in the research pass: **Gemini 3.5 Flash-Lite** (~$0.30 / $2.50 per 1M in/out; audio ~$0.0006/min) is the cheapest all-in-one meter. **gpt-5-nano** is cheaper if the turn is text-only. Do **not** add Google Speech-to-Text, Document AI Form Parser ($30/1k pages), or a second LLM unless accuracy fails.

**Prompt contract (every call):**

1. Server injects only `{roster first names for this class}` + the media + a short schema.
2. Strip SIS IDs, parent contacts, and full IEP text unless that field is the point of the call.
3. Model returns JSON: `{segments: [{studentGuess, confidence, text, gaps[], score?}]}`.
4. Persist the raw model output as a draft. Teacher accept is what mutates the record.

There is **no published monthly AI total** for 50–100 students. Keep the meter visible in the teacher settings. Prefer class-set batching (one homework set per call) over per-photo chatter.

### FERPA path for an individual-teacher MVP

1. Teacher is the customer. Account ToS: we act under the teacher’s direction; student data is used only to provide the service; **not used to train models**.
2. Use the **paid** model tier (no training). Never send student PII to a free consumer endpoint.
3. Prefer **de-identified** model calls (roster nicknames + student codes, not legal names) when quality allows.
4. Draft vs published implements the sole-possession vs education-record fork: unpublished teacher notes can stay teacher-only; published notes/grades are education records.
5. Parent access is per-child, authenticated, no directory dump.
6. Do not claim district school-official status until a signed DPA exists. A click-through by one teacher may not bind the school.

---

## 4. Key risks and open questions

Must validate before calling the MVP “done,” or before spending on N-items.

### Product / UX

1. **Spoken-name accuracy in a noisy elementary room**, nicknames (“Sammy” / “Samantha”), and two Mayas in one class. No vendor publishes this matcher. Need a classroom tape test.
2. **What happens when no name is spoken.** Pulse files incomplete remarks; Voice Assess does not say. Unassigned must feel safe, not like data loss.
3. **One-student-per-photo vs pile of papers.** Multi-student split is explicitly deferred; will teachers reject that constraint?
4. **Will teachers confirm drafts?** Every successful analog requires a human accept. If confirm is more than one glance, capture dies.
5. **Practice quality.** Generated items must match *this week’s* method, not a generic worksheet. Unvalidated. Teacher edit has to be faster than writing from scratch.
6. **Parent note tone.** Evidence favors “what to improve”; elementary families may hear that as deficit. Need copy tests.

### Technical

7. **No closed-loop analog.** Nobody documents web-generated exercise → later phone photo → same assignment id without an LMS object or a typed name. We are inventing that join.
8. **Expo has no official STT.** Audio → multimodal API adds latency and a network dependency on every note.
9. **Web SQLite is alpha.** Online-only v1 avoids this; offline later is two code paths.
10. **Supabase Free pauses** after a week idle — breaks parent email cron. Budget $25/mo Pro as soon as anyone besides the teacher depends on the app.

### Cost

11. **AI monthly cost is unknown.** Photo-heavy classes could surprise. Need a meter + a per-teacher cap before onboarding a second teacher.
12. **SMS looks cheap until A2P.** Stay on email until a teacher asks.

### Legal / trust

13. **Individual-teacher FERPA posture is soft.** Vendor marketing ≠ ED determination. School-official + direct control is unclear without a district DPA.
14. **IEP / 504 photos are high-sensitivity PII.** Keep extraction out of MVP; if a teacher photographs an IEP as “a document,” treat it as a private attachment, not something to send wholesale to a model.
15. **On-device-only vs school-maintained** changes whether notes are education records. MVP is cloud-synced, so assume they are.

### Competitive

16. **Teachers Tally / Hey Jotty remain unverified.** Recheck before treating them as analogs.
17. **If Khan or CoGrader ships the closed plan loop,** the wedge shrinks to auto-file + camera. Watch those two.

---

## Suggested build order

1. Class + roster + fragment capture (voice/text) + spoken-name match + Unassigned.
2. Photo + speak-over-media, same matcher.
3. Teacher confirm UI + sparse student timeline.
4. Draft AI gaps/score + Approve/Return + grade book + skill attempts.
5. Generate 3–8 items + assign + student to-do.
6. Parent one-sentence view + weekly email.
7. Then, and only then: list/IEP extract, offline queue, SIS, SMS.
