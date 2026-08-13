# Kelyra Vision

## Problem

A teacher already knows, in the moment, that Maya is still lining up place value and Jamal guessed on the exit ticket. That knowledge dies in the hallway. Writing it down means opening a form, picking a student, and finishing a complete record. Most tools will not even save a draft until the child is selected. Homework sits in a stack. Grading it later means retyping what the paper already shows. Lesson generators and AI graders produce materials and scores, but they do not file a half-finished observation onto the right student, name the gap, and hand that child a short set of practice problems for *this* week’s work. The teacher either does that join by hand or it does not happen.

## Solution

Kelyra is a hybrid phone-and-web tool for one teacher’s class. The teacher speaks a note or photographs a piece of work and says the student’s name. Kelyra puts that fragment on the correct record even if nothing else is known yet. If there is no match, it waits in an inbox instead of inventing a student. For photographed work, it drafts one to three skill gaps and an optional score; the teacher approves before anything is a grade. From an approved gap, Kelyra generates a short practice set (a handful of items) and assigns it to that student. The student opens a class link, does the set, and the result lands on a simple grade book. Phone is for capture. Web is for review, assign, and the grade book.

## Target User

One elementary or middle-school teacher with a single class of about 50–100 students across their sections, using their own phone and a browser. Students and parents get a one-screen progress view (focus skill, assigned / done). Not a district, not a multi-teacher team, and not a high-school departmental grade book.

## Core Principles

- **Capture has to be cheaper than skipping it.** Voice and camera only. No observation form. Incomplete is valid.
- **The system files the fragment.** Match the spoken name to this class list. Never invent a student. Unmatched work goes to an inbox.
- **Records grow over time.** A student exists as soon as they are on the roster. Notes and photos attach before contacts, accommodations, or a full profile exist.
- **Support is individual and short.** Name one gap. Assign a few problems that add to this week’s lesson. Do not replace the curriculum. Do not open a tutor chat.
- **The teacher is the last click.** AI drafts gaps and scores. Nothing is a grade, and the student sees nothing, until the teacher approves.
- **The grade book stays small.** Teacher-only. Captured work and assigned practice. Score or mark. No weights, no SIS, no official school of record.

## MVP Success Looks Like

A teacher starts a class by saying the name or photographing the printed roster and confirming the names. They photograph today’s exit tickets (one student at a time), say the name, and later that day on the web see each piece on the right student with a drafted gap. They approve, generate five practice items for the students who need them, and assign. Those students complete the set from a class link. The teacher has a one-screen grade book of that work and that practice. A parent with an invite link sees the focus skill and whether practice is done. The teacher did not open a spreadsheet, fill out a student form, or retype the papers.

## Explicitly Out of Scope for MVP

- Replacing the district SIS or becoming the school’s official grade book
- Photographing IEPs or 504s and extracting fields
- SIS / LMS sync, CSV export, weighted categories
- Weekly parent emails, SMS, points, streaks, or leaderboards
- Multi-student packet split, offline capture, or one recording split across many names
- Student chat tutors, full standards libraries, or 500-rubric grading
- Auto-publishing AI grades
- Training models on student work
- Multi-class / multi-teacher / district admin
