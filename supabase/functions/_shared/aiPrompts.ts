/**
 * Prompts shared by Edge functions and the local ai:dev server (scripts/ai-dev-server.mjs).
 * Edit prompts HERE only. Both runtimes import this file. Homework grading prompts (which
 * embed HOMEWORK_GRADING_RULES) live in homeworkPrompts.ts so light functions skip that bundle.
 */

export function practicePrompt(skillLabel: string): string {
  return `You write short paper practice items for one K-12 skill: ${skillLabel}.
Return JSON only, no markdown:
{"items":[{"id":"item-1","prompt":"one sentence the student can answer on paper","answerKey":"optional short key"}]}
Rules:
- 4 to 6 items.
- Age-appropriate. No student names. No images.
- Prompts are one or two sentences.`;
}

export const submissionReviewPrompt = `You are helping a K-12 teacher review one student's submitted work.
Return JSON only, no markdown:
{"summary":"one or two sentences","draftScore":null,"teacherNote":"short Glow/Grow or null","gaps":[{"label":"short skill name","sortOrder":1}],"items":[{"id":"item-1","prompt":"one sentence the student can answer on paper","answerKey":"short key"}]}
Rules:
- summary is what they turned in, not a biography.
- draftScore is 0-100 when you can grade the work, otherwise null.
- 0 to 3 gaps. Labels are short, like "two-digit regrouping". Empty if there is no skill gap worth follow-up.
- If there is at least one gap, items must be 4 to 6 short follow-up practice questions for the first gap.
- If there is no gap, items must be [].
- Keep any teacher-typed gap labels and practice questions listed below. You may add more, not delete theirs.
- Age-appropriate. No student names. No images.
- For lessons, skipped items, extra tries, answers that were wrong first then corrected, and hints can show a skill gap even when the last answer is right. Prefer a gap when those cluster. Do not invent a gap from clean first-try work.`;

/** extract-roster (class list / seating chart / attendance photo). */
export const rosterPrompt = `You extract students from a class list, seating chart, attendance sheet, or roster photo/scan.
Return JSON only, no markdown:
{"document_kind_guess":"class_roster","rejected":false,"names":[{"name":"First Last","student_id":null,"grade":null,"period":null,"parent_contact":null,"confident":true}]}
document_kind_guess is one of: class_roster, seating_chart, attendance, not_roster.
rejected=true and names=[] when the image is NOT a student list (syllabus, homework, flyer, answer key, random photo).
Rules:
- Only personal names of students. Skip headers, period labels ("Period 3"), Present/Absent, dates, room numbers, teacher names (Mr./Ms./Dr./Sra./Coach), page titles, "Student name", column letters, and totals.
- Keep the name as printed. If printed "LAST, FIRST" or "LAST FIRST" in all caps legal form, return "First Last" title case.
- Do not invent a student who is not on the page. Do not invent surnames when only a first name is shown.
- student_id / grade / period / parent_contact: copy only if clearly printed on that row. Otherwise null. Never invent IDs or contacts.
- A "#" / "No." column of row numbers (1, 2, 3 …) is a row index, NOT student_id. Leave student_id null unless a real ID column is printed.
- Photos may be rotated, crumpled, shadowed, glared, stained, or blurry. Only return names you can actually read on the paper. If part of the page is hidden or too blurry, return fewer names. Never fill missing rows with plausible-sounding names to match the row count.
- confident=false for any name you are not sure you read letter-for-letter.
- A name that is struck through / crossed out / scribbled over has been removed from the list: do NOT return it.
- If only part of a row's name is readable (e.g. just a surname, or a first name whose surname is blurred on a list that otherwise prints full names), skip that row instead of returning a fragment.
- parent_contact format when present: "Guardian Name <email-or-phone>".
- confident=false if the line is unclear, partial, first-name-only, or might not be a student name.
- 0 to 40 names. Prefer fewer high-quality names over junk.
- Read each name letter by letter from the image. Never substitute a more common name that looks similar.
- Smudged, crossed-out, masked with symbols (###, ???), or illegible lines: SKIP them entirely. Do not guess what they might say.
- A last line cut off by the page edge, or a surname given only as an initial ("Sam K"): include it only with confident=false.
- Count the rows you can actually read. names.length must never exceed that count. Never add names that are not printed (no names from a "page 2", footer, or your own guess).`;

/** interpret-speech (what the teacher said while capturing). */
export const speechPrompt = `You interpret what a K-12 teacher just said.
Return JSON only, no markdown:
{"intent":"add_student","captureIntent":null,"studentName":"First Last","parentName":null,"skillLabel":null,"skipGrade":false,"scoreMark":null,"numericScore":null,"gradeKind":null}
intent is add_student, note, capture, or unknown.
captureIntent is homework, syllabus, roster, portrait, parent_card, student_card, answer_key, vehicle, lesson_plan, lesson_materials, feed_photo, or null.
homework means a Grade (homework, participation, presentation, or behavior) — not only a worksheet.
studentName is a person's name the teacher said, or null.
parentName is a parent/guardian name if they said one, or null.
skillLabel is a short skill/gap if they mentioned one, or null.
skipGrade is true if they said not to grade / no grade / don't grade / forget grading.
scoreMark is numeric, pass, fail, or null.
numericScore is 0-100 if they spoke a number grade, else null.
gradeKind is homework, participation, presentation, behavior, or null.
Rules:
- Do not invent a student name, parent name, score, or skill that was not spoken.
- For add-a-student talk, ignore filler such as "I'd like to", "add another student named", "please".
- "This is a homework sheet for Mateo" → captureIntent homework, studentName Mateo, gradeKind homework.
- "Give Jamal an 88 for class participation today" → captureIntent homework, studentName Jamal, numericScore 88, scoreMark numeric, gradeKind participation.
- "No need to grade this" / "Don't grade" / "Forget trying to grade" → skipGrade true, scoreMark pass.
- "This is the class roster" → captureIntent roster.
- "This is a syllabus" / "grading policy" / "category weights" → captureIntent syllabus.
- "This is an answer key" / "key for the quiz" → captureIntent answer_key.
- "License plate" / "vehicle" / "front and back plate" → captureIntent vehicle.
- "Lesson plan" → captureIntent lesson_plan.
- "Lesson materials" / "class materials" → captureIntent lesson_materials.
- "Feed photo" / "photo for the feed" → captureIntent feed_photo.
- "Profile picture for Priya" → captureIntent portrait, studentName Priya.
- If they only named a student and no job, captureIntent is null.
- If no name is clear, studentName is null.`;

/** analyze-answer-key (teacher key photo). */
export const analyzeKeyPrompt = `You read one K-12 worksheet photo that a teacher is attaching as an ANSWER KEY.
Return JSON only, no markdown:
{"pageState":"blank|filled|unsure","header":"<printed title or null>","items":[{"n":1,"stem":"<question text or item number>","answer":"<extracted or solved answer, or empty>","points":1,"type":"mc|numeric|short|work","needsTeacher":false,"unreadable":false,"confidence":0.0,"note":null,"choices":null}],"maxScore":null,"teacherNote":null,"reject":false}
Rules:
- FIRST classify the document. If it is NOT an answer key (student homework with a student name, syllabus/weights, roster, car rider list, random notes), set reject=true, items=[], pageState="unsure", teacherNote="Not an answer key", maxScore=null. Do NOT invent answers.
- pageState is blank (no answers written/printed/bubbled yet), filled (answers already on the page — handwritten, typed, bold, green, or bubbled), or unsure.
- pageState describes the PAPER as photographed, before you solve anything. Empty answer lines = blank, even though you then fill in proposed answers. Only use filled when answers are visibly written/printed/bubbled on the page.
- Read operators and exponents exactly: × vs +, − vs +, ÷, superscripts (2³ means 2 cubed), √. Read printed point values ("3 pts") per item.
- Answer keys often PRINT the correct answers in bold/color next to each item. That is pageState=filled. EXTRACT those printed answers. Do NOT re-solve and replace them.
- Bubble sheets with filled/blackened bubbles are pageState=filled. Read which letter is filled. For bubble/scan sheets that only print item numbers, stem MUST be the item number string (e.g. "1"), never invent a math equation as the stem.
- header is the printed title / first direction line, or null. Do not invent a student name as header.
- Only items that are actually on the page. Do not invent questions or answers for missing numbers. Do not invent items past a "continue on back" / cut-off edge.
- STEM HYGIENE: Never glue the printed item number into the math. Item "1. <math>" has stem "<math>" and n=1. Same for 2., 3., circled numbers, and photo skew.
- Multiple choice: when choices A/B/C/D (or T/F) are printed, answer MUST be the letter (or True/False), NOT the choice text. Set type "mc". Put choice letters in choices when visible.
- If the title says N questions but only fewer answers appear, extract only what is visible. teacherNote may say the key is partial. Never invent the rest.
- If pageState is blank: SOLVE each keyed item when objectively answerable (math fact, MC letter, word-bank, short factual fill-ins). Opinion/explain/draw/open writing → needsTeacher=true and answer="". Still EMIT the item row with stem even when needsTeacher.
- Partial pages ("continue on back"): still emit the visible blanks as items (needsTeacher if unanswerable). Never return items:[].
- If pageState is filled: EXTRACT the written/bubbled/printed answers exactly. Prefer the key's printed answer over your own solution. Never compute a replacement when the printed answer is hard to read — set unreadable=true, answer="", needsTeacher=true.
- STEM vs ANSWER: stem is the printed question only. Never copy the written/printed answer into stem.
- STUDENT WORK vs KEY: if the page shows a student name + filled blanks and says "student work" / draft score / "grade this child", set pageState "filled", teacherNote "student work — not a blank key", reject=true preferred, and still extract seen answers only if needed (do not re-solve as if blank).
- ANSWER KEY title / "KEY" / teacher-annotated red answers → pageState "filled" and extract those answers.
- points: use printed point values if present, else 1. maxScore is the sum of points.
- teacherNote is one short sentence or null (margin notes OK).
- Never invent a student. This is not grading a child as the primary task.
- Blurry/skewed/glared phone photos: if a row is washed out, covered, or unreadable, set unreadable=true, answer="", needsTeacher=true. NEVER guess a letter or number through glare. NEVER invent arithmetic example problems to fill the sheet.
- NEVER emit placeholder/example rows from this prompt. Do not use sample stems/answers like tutorial arithmetic demos. Only what is on the page.
- Rubric / open response: if the key says "see rubric", "teacher judgment", or similar, answer must be "" with needsTeacher=true; put the note text in note, not answer.
- confidence is 0–1 per item. Below ~0.45 prefer needsTeacher. Sticky notes and overlays are not answers — keep row alignment to printed item numbers.
- MC answers should be a single letter A–E (or T/F) when that is what the key shows.`;

/** Second pass on dense filled keys (glare guesses, sticky-note row shifts). */
export const analyzeKeyLookAgainPrompt = `${analyzeKeyPrompt}

LOOK-AGAIN pass for this filled key photo:
- Re-check every row against the printed item number. Do NOT shift answers up/down when a middle row is covered by a sticky note, finger, glare, or desk clutter.
- Covered/glared rows: answer="", needsTeacher=true, unreadable=true. Never guess a letter or word for those rows.
- Sticky-note text and margin scribbles are never answers.
- Keep the same item count and numbering as the page.`;

/** match-key vision tiebreak (student page vs shortlisted key photos). */
export const matchKeyPrompt = `You compare one student's worksheet photo to answer-key photos of printed worksheets.
Return JSON only, no markdown:
{"assignmentId":null,"confidence":0.0}
Rules:
- assignmentId must be one of the ids listed, or null if none is the same printed form.
- Same printed title, numbering, and blanks = a match even if the student wrote in the blanks.
- Different worksheets (HW 16 vs 17) are not a match.
- Do not invent an id. Prefer null when unsure.`;
