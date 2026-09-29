# Finish list

Status: current

Chuck accepted these marks on 2026-09-22. Edit a mark in the table if it is wrong. `Status: current` is what lets the company staff a `prove` or `finish` row. Set the line back to `Status: draft` to stop that spend.

Marks:

- `prove` — the product is in the repo and a prior release stamp or screen exists. The next work is a fresh proof, not a new feature.
- `finish` — a named gap is still open inside work already started.
- `wait-chuck` — the next step is a decision or a mock-up only he can give.
- `leave` — parked, plan-only, or outside this period.

This draft was read from the repo on 2026-09-22. It is not a certification that any screen works. Nothing here was driven on a phone or in a browser for this page.

The spend order, once this file is `current`, is in `CURRENT_OUTCOME.md`. A card that spends against a row puts the id in the title, for example `FL-05 Prove batch I4 on the phone`.

| ID | Mark | Feature | Evidence on 2026-09-22 | Next step |
|---|---|---|---|---|
| FL-01 | finish | Car rider line | `ride-iqg-release.md` (2026-09-10) approved with no open P0/P1. That note named `dismissal_parent_leave` as unapplied. A read-only catalog check on 2026-09-22 found `public.dismissal_parent_leave(p_line_id uuid)` on project `aohibokgilxhqwmupdfv`. Nothing was applied in that check. | Prove check-in, parent leave, and release on the phone. Release is an office seat or a K-2 curb-duty profile, not a parent deep-link to /ride (WONTFIX t_a9b540c3). The live function is no longer the blocker. |
| FL-02 | prove | Class setup | Office can create a class (`createClass` in `src/lib/classes/api.ts`). A teacher has no Create class control (`createClass.security.test.ts`). Roster voice, photo, and type live on `src/app/class/[id]/setup.tsx` for the office seat only (`docs/ui-design.md` §13.8). Creating a person is office-only (`roster.add` help; Ask `add_student`). | Prove office creates a class, then office adds and confirms students by voice, photo, or type. Teacher on a taught class sees the enrolled roster and Message these students, and does not get Add students. Do not treat a missing teacher Create class control or a missing teacher Add students control as a defect. PM restamp 2026-09-23 (`t_ac881281`). |
| FL-03 | prove | Student setup | Same setup screen, plus `src/app/class/[id]/student/[studentId].tsx`. | Prove rename, confirm, and that the student signs in and sees only their own work. |
| FL-04 | prove | Parent setup | `createParent`, `addParentToClass`, `linkChild`, and `createParentInvite` are in `src/lib/parents/api.ts`. Screens: `src/app/class/[id]/parents.tsx` and `parent/[parentId].tsx`. `src/app/join.tsx` only redirects to sign-in. | Prove add, link, and a parent session that sees one child. The proof has to show how the parent actually gets in, because `/join` is not an invite page. |
| FL-05 | finish | Capture to grade | `batch-ingest-iqg-release.md` (2026-09-14) rejected the BATCH-v1 stamp. I4, phone, dual width, size, camera, and I5 retry were still unproven. Hot folder and Drive stay out. | Phone gate: `bash scripts/prove-fl05-phone.sh`, then the simulator stack. Camera: `node scripts/prove-fl05-camera.mjs` on port 9223. Retry: `node scripts/fl05-retry-fixture.mjs` (no class batch). |
| FL-06 | prove | Grade book and family view | `avg-iqg-release.md` (2026-09-10) recorded no open P0/P1. | Prove a teacher-approved score is what the student and parent see, and that the draft is not. |
| FL-07 | wait-chuck | Comments home | Drafts can hold a `teacherNote`. `docs/mvp.md` M11 stops the parent view at a teacher-approved one-liner and leaves the weekly email out. | Design options for papers, grade book, and what the student and parent are told. Stop at a mock-up. |
| FL-08 | finish | Calendar defects | Blocked board cards: `DEFECT [P0]: Calendar translateZ invalid transform (Expo Go red screen)` and `DEFECT [P0]: PeriodPager tile.key of undefined (wheel slots)`. | Fix those two inside the look already shipped. Do not start the 3D wheel from this row. |
| FL-09 | leave | Calendar wheel and CAL-R5 | Chuck cancelled this row on 2026-09-24. He finished the calendar with Grok Bot and said it is where he wants it. | Do not staff. Do not ask for a wheel mock-up or a parent-card send. |
| FL-10 | prove | Diary | `diary-iqg-release.md` (2026-09-10) recorded no open P0/P1. | Prove save-in-composer. Ask NL stays parked. |
| FL-11 | prove | Ask | `ask-iqg-release.md` (2026-09-10) recorded no open P0/P1. `notes/research/ask-screen-context/` does not unlock engineering. | Prove the Ask that shipped. Leave screen-context dark. |
| FL-12 | prove | Teacher chrome | `teach-ux-iqg-release.md` (2026-09-10) recorded no open P0/P1. | Prove the current trays. A new arrangement needs a mock-up. |
| FL-13 | leave | Photo answer-key grading | `photo-key-grading-acceptance.md` is plan only. `src/lib/keygrade/` exists. | Do not build. Promote the row to `finish` if this period should include it. |
| FL-14 | leave | Lesson plans, class landing, new math UI | `lesson-plan-acceptance.md`, `class-landing-acceptance.md`, and `mathui-acceptance.md` are plan only. | Do not build. |
| FL-15 | leave | Author studio | Strategy note 2026-09-14: the Author track stays sticky until Chuck. | Do not staff. |
| FL-16 | leave | Parked product locks | Ask NL, hot folder, Drive, `kelyra.app` DNS, app stores, attendance, and PPT-to-practice are existing locks. Assigned board cards `[PPT]` and `[ATTEND]` are HOLD. | Do not staff. |
| FL-17 | prove | Messages and notifications | Screens exist under `src/app/messages/` and `src/app/notifications/`. This pass found no release stamp. | Prove after the setup rows. |
| FL-18 | prove | Gauth and math rendering | `gauth-iqg-release.md` and `math-iqg-release.md` (2026-09-10) recorded no open product P0/P1. | Prove only if a later pass fails. The open `[IQG-GAUTH-Q1]` retro card is not this row. |
| FL-19 | finish | Ingest storage path | Chuck sent this on 2026-09-22 from the credit list. Source cards `t_d3433b09` and `t_06dd401c`. `register_ingest_file` does not require `{uid}/ingest/{batch_id}/`. | Grok Bot writes the function change and a pull request. Do not apply it on the live project. Do not edit a screen. |
| FL-20 | finish | Ingest packet numbers | Chuck sent this on 2026-09-22 from the credit list. Source cards `t_05cf258a` and `t_b476d060`. `INGEST_PACKET_ORDINAL_PARK` in `src/lib/ingest/splitPackets.ts` can collide after a failed restore. | Grok Bot fixes the library and opens a pull request. Do not edit a screen. |
