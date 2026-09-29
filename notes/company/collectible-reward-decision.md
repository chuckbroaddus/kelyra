# Student collectible rewards — scope choice

**Card:** t_c063a43a
**Date:** 2026-09-28
**Author:** product-manager
**Status:** Decided. OUT of the current vision. Not a design. Not a build.
**Evidence read:** `notes/company/collectible-reward-research.md` (t_73bb40d1). Not re-researched.
**Bounds read:** `docs/vision.md`, `docs/data-model.md`, `notes/company/CURRENT_OUTCOME.md`. Not edited.

## Choice

OUT.

Student-owned collectible rewards are outside the current MVP. This is not a recommendation that Chuck accept a new surface.

Non-goal sentence read in `docs/vision.md` (Explicitly Out of Scope for MVP):

"Weekly parent emails, SMS, points, streaks, or leaderboards."

Schema bound read in `docs/data-model.md` (Out of the MVP schema):

"No tables yet for: ... SMS, points/streaks, ..."

"Do not add per-student color, story rings, likes, or a public feed."

## Why this is the non-goal, not a side feature

The ask is a reward the student keeps: gifted by a teacher or an administrator, owned by the student, with rarity, a possible friend trade, and an AI-made look and sound.

That is the engagement family the MVP already refuses. It is not a narrow exception.

- A rarity ladder and a collection score are the leaderboard shape. The filed Blooket pages give rarity labels and a Blook Score. Kelyra's success line is capture, file, approve a gap, assign a short practice set, and a small grade book. Students use a class link. Parents get a one-screen progress view.
- Friend trade is a peer economy. The MVP has no public feed, no likes, and no per-student story chrome. Student access is a join-code session, not a wallet. Existing assets are capture and profile media.
- ClassDojo, the closest official "adult awards a reward" page in the note, is points an adult redeems. The note says that is not a portable collectible. A collectible does not escape the non-goal by using a different noun.
- Open Badges 3.0 is a signed credential the learner can export. It is not a trading-card economy. The MVP also refuses to be the school's official record. A credential export is a different product, and it is not this MVP.
- CURRENT_OUTCOME (CEO 2026-09-22) says this period finishes and proves features already in the class app. A new product surface stops and asks Chuck. OUT means this card does not ask him, and does not recommend that he accept one.

This note does not change `docs/vision.md` or `docs/data-model.md`. The research note already says a decider would have to change vision and schema on purpose. I am not doing that.

## Open questions

Each mark is one of: answered from the note, deferred to one named later seat, or blocked on Chuck. None are blocked on Chuck. This OUT choice does not need his tap.

### 1. Inside or outside the MVP non-goal on points, streaks, and leaderboards?

Answered from the note, confirmed against `docs/vision.md` this session.

OUT. Outside the current vision.

The sentence read is: "Weekly parent emails, SMS, points, streaks, or leaderboards."

The note repeats that line and says the brief does not override it. A student-owned collectible with rarity and optional trade sits in that non-goal. It is not capture, not a gap, not practice, and not a grade.

### 2. Does own mean an in-app inventory, an exportable credential (Open Badges shape), or something else?

Deferred to product-manager, only if Chuck later reopens this as a new surface.

Why: the note lists three meanings the official pages do not treat as the same — an account inventory, a signed credential the learner can export, or a crypto token. Only Open Badges has an education standard written for it. The note does not pick. Picking is a scope choice. It does not exist while the surface is out. Not staffed.

### 3. Is rarity a published tier the teacher assigns, or a random drop?

Deferred to product-manager, only if Chuck later reopens this as a new surface.

Why: the note separates teacher-gifted non-random awards from paid or token-paid random drops. The FTC January 2025 HoYoverse post is the random-paid-to-children pattern. The note says those are not the same fact pattern, and it does not pick a mechanic. A later seat must not collapse them. I am not specifying a tier ladder. Not staffed.

### 4. Is friend trade in the first cut, and if so only inside a roster with an adult gate?

Deferred to product-manager, only if Chuck later reopens this as a new surface.

Why: the current vision has no trade. The note found no official friend-trade article, and it flags Google Play Families (adult action before children exchange personal information; social features need adult management) and FERPA (a record directly related to a student and maintained by the school or its agent can be an education record). Those flags are for counsel only if a later proposal includes trade. They are not a reason to staff legal-compliance now. First cut of the current product: no trade.

### 5. May any generation prompt contain student personal information?

Deferred to legal-compliance, only if a later proposal includes generation. Do not staff that seat from this card.

Why: the note does not decide. It says a shared catalog prompted with no student data is a different data flow from a per-child generation, and that sending a name, photo, or schoolwork to a third-party image or voice API is a COPPA and Apple question if those rules apply. `docs/vision.md` also lists "Training models on student work" as out of scope. That line is about training, not an inference prompt, so it is not a legal answer to this question. Product rule while this choice stands: there is no collectible generation flow, so there is no prompt to put student personal information in. All TTS, if any later audio exists, still goes through grok-tts only. I am not approving a shared catalog.

## What this choice does not do

- Does not edit vision or schema.
- Does not design a screen, name a persona, or invent a Surface line.
- Does not stamp Intent Quality Gate. There is no design.
- Does not staff research-feedback, ui-ux-designer, legal-compliance, finance-analytics, security, or engineering.
- Does not create a child card.
- Does not price the idea. The note's cost bands stay evidence. Finance is not staffed.
- Does not forbid the idea forever. It is outside the current vision. Chuck can reopen it. A reopen is a new product surface. He must accept it before any UI pack or build. This card does not ask him to accept one, because the choice is OUT, not IN.

## Handoff

OBJECTIVE: Choose whether student-owned collectible rewards are in or out of the current MVP.

CONTEXT: Evidence note filed by research-feedback. One decider. No second seat.

REQUIREMENTS MET: IN or OUT stated. Non-goal sentence quoted. Five questions marked. No UI pack. No build card. No child cards.

CONSTRAINTS HELD: No app code, no SQL, no edits to vision or data-model, no secrets, no kelyra-qa-loop, no IQG stamp.

FILES/AREAS: This file only. Bounds were read, not edited.

WORK PERFORMED: Read the evidence note, the vision non-goal, the data-model out-of-schema lines, and CURRENT_OUTCOME. Wrote this choice. Did not browse the question again.

VERIFICATION: Non-goal sentence quoted from docs/vision.md line on Explicitly Out of Scope for MVP. Schema lines quoted from docs/data-model.md Out of the MVP schema. Five questions each have one mark.

RESULT: OUT of the current vision. Not a recommendation to Chuck. No UI pack. No build.

OPEN ISSUES: Questions 2, 3, and 4 stay with product-manager if the surface is reopened. Question 5 stays with legal-compliance if a later proposal includes generation. Neither seat is staffed now. Cost, storage, and platform rules in the research note are unused until a reopen.

ESCALATION NEEDED: None. Do not ask Chuck to accept a new surface. Do not staff a second decider.

RECOMMENDED NEXT ACTION: Chief of Staff closes this decision and staffs no one. Single flag to staff: none. If Chuck later asks to reopen, stop and treat it as a new product surface. He must accept it before any UI pack or build. Product-manager must answer questions 2, 3, and 4 before a designer is staffed. Do not staff legal-compliance unless that later proposal includes generation or trade.
