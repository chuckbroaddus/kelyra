# Gradebook setup copy audit (plain language)

Branch `cos/gb-plain-copy`. Scope: teacher-facing text in the class grading syllabus wizard (GB-08), the school grading-policy setup, both "Answer a few questions" chats, the document-ingest review card, and bundled help topics. Only display strings changed. Stored values, keys, enums, DB rows and grading logic did not change. Raw ids are now mapped to words at display time in `src/lib/grade/plainLabels.ts`.

**Logged rewrites:** 351 entries across 18 files. Some entries cover a group of related strings, such as all 10 lock reasons or all help-topic examples.

## What the old codes meant

| Code | Meaning | Now shown as |
|---|---|---|
| T1 | Engine (how the average is computed) | How grades add up |
| T2 | Categories | Categories |
| T3 | Within-category weighting | Inside a category |
| T4 | Drops | Drop lowest |
| T5 | Missing & late | Missing & late work |
| T6 | Extra credit | Extra credit & retakes |
| T7 | Book & rollup (gradebook reset + term rollup + rounding) | Grading periods & rounding |
| T8 | Review | Review & publish |

Other codes:
- **"Guided setup T1–T8"** in the syllabus header is now "Step through each choice below…".
- **S-Q1..S-Q10 / T-Q1..T-Q7** are internal question ids in the interview graph. They were never shown and did not change.
- **Period codes Y1, S1/S2, 6W1–6W6, E1/E2, Q1–Q4, T1–T3 (trimesters), R*, P*** are calendar period ids. The UI now shows the period names (e.g. "1st six weeks").
- **H10/S08/N03…** are ingest eval-corpus fixture ids. They are not in the UI.
- **Raw enums** like `high`, `tx_six_weeks`, `semester_0_5`, `texas_no_d`, `unweighted_and_weighted`, `2/7+1/7`, `25x4`, lock keys like `drop_lowest`/`book_mode`, slot paths like `calendar.template`, and ingest status/confidence values are now shown as words.

## Coordination

- The ask-setup coverage work (`cos/gb-ask-setup-coverage`) is likely to touch `src/lib/interview/*`, `InterviewScreen.tsx` and the interview routes. This branch changed only string literals there.
- The ingest fix (#335) touched `syllabus.tsx`, `grading-policy/index.tsx` and the normalizers. This branch changed only display copy in `IngestProposalReview.tsx` and `fieldLabels.ts`. Warning text written by the model still passes through unchanged. Canned warnings are rewritten by code in `plainIngestNotice`.
- Not changed: the `help_topics` migration rows (the UI uses bundled copies), `ingestPrompts.ts`, the edge function, `transfer-in.tsx` and the PolicyView screens.

## Old → new, by file

### `src/components/syllabus/wizardModel.ts`

| Old | New |
|---|---|
| Step chips 'T1 Engine', 'T2 Categories', 'T3 Within-category', 'T4 Drops', 'T5 Missing & late', 'T6 Extra credit', 'T7 Book & rollup', 'T8 Review' | 'How grades add up', 'Categories', 'Inside a category', 'Drop lowest', 'Missing & late work', 'Extra credit & retakes', 'Grading periods & rounding', 'Review & publish' |
| Lock reasons, e.g. 'School grading policy locks the calculation engine.' / 'Book reset mode is set by the school calendar policy.' / 'Term rollup / exam weight is set by the school calendar.' | 'Your school sets how the average is figured.' / 'Your school sets whether grades start fresh each grading period.' / 'Your school sets how grading periods and the exam make the semester grade.' (all 10 rewritten) |
| label: 'Weighted · points inside',     plain: 'Each category has a weight. Inside a category, bigger point values count more.', | label: 'Weighted, points count',     plain: 'Each category has a weight. Inside a category, assignments worth more points count more.', |
| label: 'Weighted · equal percent',     plain: 'Each category has a weight. Inside a category every assignment is the same percent, 20/20 = 50/50.', | label: 'Weighted, all equal',     plain: 'Each category has a weight. Inside a category every assignment counts the same, no matter its points.', |
| plain: 'Add up points earned ÷ points possible. A 100-pt test outweighs a 10-pt quiz. No category percents.', | plain: 'Add up all points earned and divide by points possible. A 100-point test counts more than a 10-point quiz. No category weights.', |
| label: 'Item weights',     plain: 'Each assignment carries its own weight percent. Categories are optional labels only.', | label: 'Each assignment weighted',     plain: 'You give each assignment its own weight. Categories are just labels.', |
| plain: 'Track scores without computing a single period average.', | plain: 'Keep scores without figuring an overall average for the grading period.', |
| Summary line '… · 3 cats · 100% · EC B · missing=omit · reset each period' | '… · 3 categories adding to 100% · extra credit adds bonus points · missing work doesn't count yet · fresh start each grading period' |
| message: 'Choose an engine.' | message: 'Choose how grades add up.' |
| message: `Active weights sum to ${Math.round(sum * 1000) / 1000}% (need 100%).` | message: `Your category weights add up to ${Math.round(sum * 1000) / 1000}%. They need to add up to 100%.` |
| message: 'Add at least one active category.' | message: 'Add at least one category.' |
| message: 'Late penalty needs a non-negative amount.' | message: 'Enter a late penalty of 0 or more.' |
| message: 'Missing-as-floor works best with a period floor percent set.' | message: 'You chose to give missing work the lowest grade allowed. Set that lowest grade on the Drop lowest step.' |
| message: 'No overall grade — period averages will show NG.' | message: 'No overall grade: averages will show NG (no grade).' |
| ? 'Missing work counts as zero.'       : draft.missing_rule === 'floor'         ? `Missing work uses the floor${draft.floor != null ? ` (${draft.floor}%)` : ''}.`         : 'Missing work is omitted until scored.'; | ? 'Missing work counts as zero.'       : draft.missing_rule === 'floor'         ? `Missing work gets the lowest grade allowed${draft.floor != null ? ` (${draft.floor}%)` : ''}.`         : "Missing work doesn't count until it is graded."; |
| Parent paragraph 'Late: per_day 10%.' | 'Late work loses 10% for each day late.' |
| lines.push('Extra credit may sit in its own category (method C).');   } else {     lines.push('Extra credit follows method A (replace / boost within existing work).'); | lines.push('Extra credit has its own category.');   } else {     lines.push('Extra credit can raise or replace a score on existing work.'); |
| Parent paragraph 'Term rollup: 2/7+1/7.' | 'Semester grade: Three six-weeks count 2/7 each, exam counts 1/7.' |

### `src/components/syllabus/WizardStepBody.tsx`

| Old | New |
|---|---|
| const why = draft.lock_reasons[field] ?? 'Locked by school policy.'; | const why = draft.lock_reasons[field] ?? 'Your school sets this.'; |
| 'Locked — …' | 'Set by your school — …' |
| Pick how assignment scores become a period percent. | Choose how assignment scores add up to a grade for each grading period. |
| label="SYLLABUS TITLE" | label="Syllabus name" |
| label="Label" | label="Category name" |
| label="Weight %" | label="Weight (%)" |
| label={row.active ? 'Active' : 'Hidden'} | label={row.active ? 'In use' : 'Not used'} |
| label={row.default_include_in_average ? 'Counts by default' : 'Opt-in only'} | label={row.default_include_in_average ? 'Counts in the average' : 'Counts only when you choose'} |
| Category card footer 'key: tests · locked' | (internal key hidden) 'Set by your school' only when locked |
| 'Sum 90% · 10% left' / ' · OK' | 'Total 90% · 10% left to assign' / ' · adds up to 100%' |
| Empty category default: renormalize (ignore weight until a score exists). | If a category has no grades yet: |
| label="Renormalize empty" | label="Skip it until it has grades" |
| label="Empty = zero" | label="Count it as 0" |
| Worked example: 20-pt quiz vs 100-pt test inside the same category. | Example: a 20-point quiz and a 100-point test in the same category. |
| label="Points inside" | label="Bigger assignments count more" |
| label="Equal percent" | label="Every assignment counts the same" |
| ? 'Points inside: 80/100 and 16/20 → category uses total points (96/120).'           : 'Equal percent: 80/100 and 16/20 both count as 80% then average equally.'} | ? 'Points count: 80/100 and 16/20 are added up, so the category is 96/120 (80%).'           : 'All equal: 80/100 and 16/20 are each 80%, and the two are averaged the same.'} |
| Drop lowest applies inside one marking period only. | Dropping low scores happens inside one grading period only. |
| label={`${row.label} · drop lowest N (0–3)`} | label={`${row.label}: how many lowest scores to drop (0–3)`} |
| label="Period floor % (optional)" | label="Lowest grade allowed for the period, % (optional)" |
| ['omit', 'Omit'], | ['omit', "Doesn't count yet"], |
| ['floor', 'Use floor'], | ['floor', 'Lowest grade allowed'], |
| Excused always omits earned and possible — never a zero. | Excused work is left out of the grade completely. It is never a zero. |
| ['none', 'None / manual'], | ['none', 'None (I adjust by hand)'], |
| ['flat', 'Flat'], | ['flat', 'One-time'], |
| Method B adds to earned without hurting students who skip EC. | Tip: “Adds bonus points” helps students who do extra credit without hurting students who skip it. |
| EC chips 'A · replace/boost', 'B · add earned', 'C · own category' | 'Raises or replaces a score', 'Adds bonus points', 'Its own category' |
| label="EC cap % (optional)" | label="Most extra credit allowed, % (optional)" |
| Retakes (default off) | Retakes (off unless you turn them on) |
| label={draft.retake ? 'Retakes ON' : 'Retakes OFF'} | label={draft.retake ? 'Retakes: on' : 'Retakes: off'} |
| ['replace', 'Replace'], | ['replace', 'Use the newest score'], |
| ['higher_of', 'Higher of'], | ['higher_of', 'Keep the higher score'], |
| ['average', 'Average'], | ['average', 'Average the tries'], |
| label="Max attempts" | label="Most tries allowed" |
| label="Cap % (e.g. Texas 70)" | label="Highest retake grade, % (e.g. 70 in Texas)" |
| label="Window days (optional)" | label="Days allowed to retake (optional)" |
| label="Period ceiling % (optional)" | label="Highest grade allowed for the period, % (optional)" |
| label={draft.publish_to_family ? 'Publish to family: Yes' : 'Publish to family: No'} | label={draft.publish_to_family ? 'Families can see this: Yes' : 'Families can see this: No'} |
| label="Reset each marking period" | label="Start fresh each grading period" |
| label="Rolling year" | label="One running average all year" |
| label="Rollup preset (e.g. 2/7+1/7)" | label="Semester grade formula (e.g. 2/7+1/7)" |
| Term structure (legacy) | How your year is split |
| Letter scale inherits the school grading policy when locked. | Rounding (the letter scale comes from your school when it is set there). |
| ['nearest_whole', 'Round nearest'], | ['nearest_whole', 'Round to nearest whole'], |
| ['half_up', 'Half up'], | ['half_up', 'Round .5 up'], |
| ['truncate', 'Truncate'], | ['truncate', 'Drop decimals'], |
| ['none', 'No round'], | ['none', "Don't round"], |
| Parent-facing syllabus paragraph (generated from structured fields). | What families will read about how this class is graded: |
| 'Engine: Weighted · equal percent · weights 100% · status none' | 'How grades add up: Weighted, all equal · weights total 100% · Not set up yet' |
| {canFinishReview(draft) ? 'Ready to publish.' : 'Fix errors above before publish.'} | {canFinishReview(draft) ? 'Ready to publish.' : 'Fix the problems listed below before you publish.'} |

### `src/components/syllabus/SyllabusWizard.tsx`

| Old | New |
|---|---|
| Live preview · sample period | Preview with sample students |
| Three fake students. Changes on any step recompute instantly. | Three made-up students. Their grades update as you make choices. |
| {iss.severity === 'error' ? 'Error' : 'Note'}: {iss.message} | {iss.severity === 'error' ? 'Fix this' : 'Heads up'}: {iss.message} |

### `src/components/syllabus/livePreview.ts`

| Old | New |
|---|---|
| name: 'Alex (solid)', | name: 'Alex (strong student)', |
| note: 'All work in; one late quiz.', | note: 'All work turned in; one late quiz.', |
| note: 'Missing homework + low test.', | note: 'Missing homework and a low test.', |
| note: 'Excused test; skipped EC.', | note: 'Excused from a test; skipped extra credit.', |

### `src/app/class/[id]/syllabus.tsx`

| Old | New |
|---|---|
| setError('This syllabus is published. Use Publish to update live weights.'); | setError('This syllabus is already published. Tap Publish to save your changes.'); |
| setError('Fix category weights (must total 100%) before saving.'); | setError('Your category weights need to add up to 100% before you can save.'); |
| setStatus('Draft saved — not used in averages yet.'); | setStatus('Draft saved. It won’t change any grades until you publish.'); |
| 'Copied template “texas_retake_70” into unlocked fields.' (raw template key) | 'Copied “Texas 70-pass + retake cap 70”. Settings your school controls were left as they are.' |
| setStatus('Ask draft ready — review before publish.'); | setStatus('We read your photo. Check the settings below, then publish.'); |
| setStatus('Reading document into proposal…'); | setStatus('Reading your document…'); |
| setStatus('Proposal ready — review fields, then apply into the wizard.'); | setStatus('Done reading. Check each setting we found, then tap Use these settings.'); |
| setStatus('Proposal applied into wizard. Review before publish.'); | setStatus('Settings added. Look them over, then publish.'); |
| setError('This looks like a scoring rubric. Rubric levels are not category weights.'); | setError('This looks like a rubric for scoring one assignment, not a grading policy. Rubric levels can’t be used as category weights.'); |
| setStatus('Mixed document — category weights applied; rubric criteria ignored.'); | setStatus('This page has a grading policy and a rubric. We used the category weights and skipped the rubric.'); |
| setError('Could not read a grading policy from that photo. Enter weights manually.'); | setError('We couldn’t find a grading policy in that photo. Please enter the weights yourself.'); |
| 'Guided setup T1–T8. Live preview updates as you choose. Nothing is a grade until you publish.' | 'Step through each choice below. The sample grades update as you go. Nothing affects real grades until you publish.' |
| >From photo · Ask draft< | >Settings read from your photo< |
| Review every line. Nothing is live until you publish. | Check every line. Nothing changes until you publish. |
| This looks like a scoring rubric (or mixed). Rubric levels are not category weights. | This looks like a rubric (or part of one). Rubric levels can’t be used as category weights. |
| label="Apply checked into wizard" | label="Use these settings" |
| label="Discard draft" onPress={() => setConfirm({ kind: 'discard_ask' })} | label="Throw away" onPress={() => setConfirm({ kind: 'discard_ask' })} |
| sourceLabel="document" | sourceLabel="your document" |
| setStatus('Proposal discarded. Published syllabus unchanged.'); | setStatus('Thrown away. Your published syllabus did not change.'); |
| label="Import from photo" | label="Take a photo of a syllabus" |
| label="Choose photo" | label="Choose a syllabus photo" |
| Copies unlocked fields only. School locks stay locked with their reason. | Copies the settings you’re allowed to change. Settings your school controls stay as they are. |
| ? 'Draft'         : 'Not set'; | ? 'Draft (not used for grades yet)'         : 'Not set up yet'; |
| : confirm?.kind === 'discard_ask'                 ? 'Discard Ask draft?' | : confirm?.kind === 'discard_ask'                 ? 'Throw away the settings read from your photo?' |
| ? 'Averages stop using these weights. Family “how grades work” hides. Approved scores stay.' | ? 'Averages stop using these weights, and families no longer see how this class is graded. Approved scores stay.' |
| ? 'Clears the Ask draft only. A published syllabus stays intact.' | ? 'This only clears the settings read from your photo. Your published syllabus stays the same.' |
| confirm?.kind === 'discard_ask' ? 'Discard' : 'Publish' | confirm?.kind === 'discard_ask' ? 'Throw away' : 'Publish' |
| setError(err instanceof Error ? err.message : 'Could not discard draft'); | setError(err instanceof Error ? err.message : 'Could not throw away the photo settings'); |

### `src/lib/school/gradingPolicy.ts`

| Old | New |
|---|---|
| School wizard default lock reasons (same 10 as syllabus) | Same 10 plain 'Your school sets …' reasons |
| School steps 'Calendar', 'Dates & periods', 'Credit policy', 'Term rollup', 'Grade scale', 'Quality points', 'GPA profiles', 'Teacher locks' | 'Grading periods', 'School year dates', 'Credit', 'Semester grade', 'Letter grades', 'GPA points', 'GPA', 'What teachers can change' |
| message: 'Mark scale needs at least one letter.' | message: 'Add at least one mark to the scale.' |
| message: 'Scale needs at least one band.' | message: 'Add at least one letter grade to the scale.' |
| message: `Scale must start at 0 (got min ${sorted[0]!.min_pct}).` | message: `The lowest letter grade must start at 0 (it starts at ${sorted[0]!.min_pct}).` |
| message: `Scale must reach 100 (got max ${last.max_pct}).` | message: `The highest letter grade must go up to 100 (it stops at ${last.max_pct}).` |
| message: `Band ${b.letter}: min ${b.min_pct} > max ${b.max_pct}.` | message: `${b.letter}: the low end (${b.min_pct}) is above the high end (${b.max_pct}).` |
| message: `Bands ${prev.letter} and ${b.letter} overlap.` | message: `The ${prev.letter} and ${b.letter} ranges overlap.` |
| message: `Gap between ${prev.letter} and ${b.letter} (${prev.max_pct} → ${b.min_pct}).` | message: `There is a gap between ${prev.letter} and ${b.letter} (${prev.max_pct} to ${b.min_pct}).` |
| message: 'At least one quality-point table is required when GPA is on.' | message: 'GPA is on, so add a chart of GPA points for each letter.' |
| 'Letter B on scale texas_no_d has no quality points in qp-letter.' | 'The letter B has no GPA points in the GPA chart.' |
| 'Rollup for S1 weights must sum to 1.' | 'The semester grade formula for Semester 1 must add up to 100%.' |
| message: 'At least one grade scale is required.' | message: 'Choose a letter grade scale.' |
| message: 'GPA is on but no profiles are defined.' | message: 'GPA is on, but no GPA type is chosen.' |
| message: 'GPA is on but course levels are empty.' | message: 'GPA is on, but no course levels (like Regular or AP) are set.' |
| message: 'Credit is none but GPA is enabled — typical for elementary only.' | message: 'Classes give no credit but GPA is on. That is unusual outside elementary school.' |
| 'high · tx_six_weeks · credit semester_0_5 · texas_no_d · pass 70 · GPA unweighted_and_weighted' | 'High school · Six-week grading periods (Texas) · ½ credit per semester · Texas scale, no D · 70 is passing · Unweighted and weighted GPA' |

### `src/app/school/grading-policy/index.tsx`

| Old | New |
|---|---|
| setStatus('Reading policy document…'); | setStatus('Reading your policy document…'); |
| setStatus('Proposal ready — review fields before continuing the wizard.'); | setStatus('Done reading. Check each setting we found, then tap Use these settings.'); |
| setStatus('Proposal applied. Review highlighted steps before publish.'); | setStatus('Settings added. Look over each step, then publish.'); |
| Office administrators only. Switch to an office seat to set grading policy. | Only school office staff can set the grading policy. Switch to your office account to continue. |
| >Loading defaults…< | >Loading…< |
| sourceLabel="policy document" | sourceLabel="your policy document" |
| setStatus('Proposal discarded. Published policy unchanged.'); | setStatus('Thrown away. Your published policy did not change.'); |
| 'Published v3. Bound 12 classes.' | 'Published (version 3). 12 classes now use this grading calendar.' |
| 'Publish failed' | 'Could not publish' |
| Level chips 'elementary', 'middle', 'high', 'college', 'mixed' | 'Elementary school', 'Middle school', 'High school', 'College', 'Several levels' |
| >Calendar template< | >How often grades are posted< |
| Calendar chips 'tx_six_weeks', 'nine_weeks', 'trimester', 'college_term', 'elementary_year_4', 'elementary_year_6', 'semester' | 'Six-week grading periods (Texas)', 'Nine-week grading periods (quarters)', 'Trimesters', 'College terms', 'Elementary, 4 report cards a year', 'Elementary, 6 report cards a year', 'Semesters' |
| label="I'm not sure — apply recommended" | label="I'm not sure — use the usual choice" |
| 'Periods: Y1, S1, S2, 6W1, 6W2, 6W3, E1, 6W4, …' | 'Grading periods: 1st Six Weeks, 2nd Six Weeks, …' |
| label="Year start (YYYY-MM-DD)" | label="First day of school (like 2026-08-15)" |
| label="Year end (YYYY-MM-DD)" | label="Last day of school (like 2027-05-28)" |
| Date rows '6W1 · 1st Six Weeks' / '2026-08-15 → 2026-09-25' | '1st Six Weeks' / '2026-08-15 to 2026-09-25' |
| Credit chips 'Semester 0.5', 'Year 1.0', 'None' | '½ credit per semester', '1 credit per year', 'No credit' |
| 'Year-link credit ON' | 'Average both semesters for credit: on' |
| 'Transfer letter → percent (FR-GPA-08). Edit values; empty letters keep the shipped default.' | 'Grades from other schools: the percent each letter counts as. Leave a box empty to use the usual value.' |
| label={`Transfer ${L}`} | label={`${L} from another school (%)`} |
| >Exam exemption (default off)< | >Let students skip the semester exam (off unless you turn it on)< |
| ? 'Exam exemption ON'               : 'Exam exemption OFF' | ? 'Exam skipping: on'               : 'Exam skipping: off' |
| label="Min pre-exam average %" | label="Lowest average needed to skip (%)" |
| label="Max absences" | label="Most absences allowed to skip" |
| 'Renormalize remaining weights' / 'Do not renormalize' | 'Spread the exam’s weight over the grading periods' / 'Don’t spread the exam’s weight' |
| Rollup chips '2/7+1/7', '40/40/20', '25x4', 'year_mean' … | 'Three six-weeks count 2/7 each, exam counts 1/7', 'Two grading periods 40% each, exam 20%', 'Four quarters, 25% each', 'Plain average of all grading periods' … |
| Scale chips 'Texas no-D', 'US 10-point', 'P/F', 'CR/NC' … | 'Texas scale, no D', '10-point scale (90 = A)', 'Pass / Fail', 'Credit / No credit' … |
| >Quality-point method< | >How GPA points are given< |
| ['letter_map', 'Letter map'],               ['numeric_band', 'Numeric band (6.0)'],               ['percent_map', 'Percent map'], | ['letter_map', 'By letter grade'],               ['numeric_band', 'By percent range (6.0 chart)'],               ['percent_map', 'By exact percent'], |
| GPA chart card title 'qp-letter · letter_map' | 'By letter grade' |
| '90–100=4/5/6' | '90–100%: regular 4, honors 5, AP 6' |
| Course level rows 'bonus 0.5 · key honors' | '+0.5 extra GPA points' |
| GPA chips 'GPA off', 'Unweighted + weighted', 'UW + W + rank 6.0' | 'No GPA', 'Unweighted and weighted', 'Unweighted, weighted, and class rank' |
| >Repeat rule< | >When a student repeats a course< |
| ['include_both', 'Keep both'],               ['replace', 'Replace'],               ['average', 'Average'],               ['forgive_d_f', 'Forgive D/F'], | ['include_both', 'Count both grades'],               ['replace', 'Count only the new grade'],               ['average', 'Average the two'],               ['forgive_d_f', 'Drop an old D or F'], |
| 'PE/athletics inclusion follows each profile (help.include_pe). Rank uses a narrower set.' | 'Whether PE and athletics count depends on the GPA type. Class rank leaves out more courses.' |
| Locked fields stay visible to teachers but cannot be changed. Optional reason shows on the syllabus wizard. | Teachers can see settings you lock, but can’t change them. Add a short reason so they know why. |
| Lock rows 'engine', 'categories', 'drop_lowest', 'assignment_max', 'book_mode', 'rollup' | 'How the average is figured', 'Categories and weights', 'Dropping lowest scores', 'Most points per assignment', 'Gradebook starts fresh each grading period', 'Semester grade formula and exam weight' |
| {on ? 'Locked' : 'Teacher may edit'} | {on ? 'Locked' : 'Teachers can change'} |
| label="LOCK REASON" | label="Why it is locked (teachers see this)" |
| 'Calendar tx_six_weeks calendar · 12 periods · 2 rollups' | 'Six-week grading periods (Texas) · 6 grading periods' |
| 'Scale texas_no_d · GPA off · credit semester_0_5' | 'Texas scale, no D · No GPA · ½ credit per semester' |
| Ready to publish. Classes will bind to the new calendar. | Ready to publish. All your school’s classes will use this grading calendar. |

### `src/lib/interview/graph.ts`

| Old | New |
|---|---|
| Chat progress 'Level · Calendar · Credit · Scale · GPA · Locks' / 'Engine · Categories · Status · Extras' | 'School level · Grading periods · Credit · Letter grades · GPA · Teacher limits' / 'How grades add up · Categories · Missing & late · Extras' |
| question: 'Who is this setup for?' | question: 'What kind of school is this?' |
| { id: 'mixed', label: 'Mixed', | { id: 'mixed', label: 'Several levels', |
| 'Report cards will post 6 times. Transcript still stores S1 and S2.' | 'Report cards will go home 6 times a year. Transcripts still show one grade for each semester.' |
| return 'Report cards will post 4 times a year (quarters).'; | return 'Report cards will go home 4 times a year (quarters).'; |
| return 'Three big report cards a year.'; | return 'Report cards will go home 3 times a year.'; |
| question: 'Do those periods award high-school credit?' | question: 'Do these classes earn high school credit?' |
| label: 'Yes, 0.5 per semester', | label: 'Yes, ½ credit per semester', |
| label: 'Yes, 1.0 per year', | label: 'Yes, 1 credit per year', |
| question: 'How do the periods become a semester grade?' | question: 'How do the grading periods add up to a semester grade?' |
| Chip '2/7 + exam 1/7 (Texas six-weeks)' | 'Three six-weeks + exam (Texas: 2/7 each, exam 1/7)' |
| label: '40 / 40 / 20' | label: 'Two periods 40% each + exam 20%' |
| label: '50 / 50 no exam' | label: 'Two periods 50% each, no exam' |
| label: 'Simple average' | label: 'Plain average of the periods' |
| label: 'Exempt if high average' | label: 'Yes, but high averages can skip it' |
| label: '10-point (90=A, 60 pass)', | label: '10-point (90 is an A, 60 passes)', |
| label: 'Texas 70 with D', | label: 'Texas: 70 passes, has a D', |
| label: 'Texas 70 no D', | label: 'Texas: 70 passes, no D', |
| label: 'Plus-minus', | label: 'Plus/minus letters (A-, B+)', |
| label: 'Default +0.5 / +1.0', | label: 'Usual: +0.5 Honors, +1.0 AP', |
| label: 'Numeric 5.0 chart (AP A=5.0)', | label: '5.0 chart (an A in AP is 5.0)', |
| label: 'Numeric 6.0 chart', | label: '6.0 chart', |
| label: 'PE out', | label: 'Leave out PE', |
| label: 'P/F out', | label: 'Leave out pass/fail classes', |
| Chip 'PE · P/F · aide · recovery' | 'Leave out PE, pass/fail, office aide, credit recovery' |
| question: 'Ready to open the form and publish when it looks right?' | question: 'Want to open the full form to check everything and publish?' |
| 'When you average the class, should a 100-point test outweigh a 10-point quiz, or should every assignment in a bucket count the same?' | 'When you average grades, should a 100-point test count more than a 10-point quiz, or should every assignment in a category count the same?' |
| Chip 'Weighted buckets (points inside)' | 'Weighted categories, points count' |
| label: 'Weighted buckets (equal %)', | label: 'Weighted categories, all equal', |
| question: 'Name the buckets and their percents.' | question: 'What are your grade categories, and how much does each one count?' |
| label: '50/50 major-daily', | label: 'Major 50%, Daily 50%', |
| label: '40/40/20', | label: 'Tests 40%, Quizzes 40%, Homework 20%', |
| label: 'Tests/Quiz/HW 50/20/30', | label: 'Tests 50%, Quizzes 20%, Homework 30%', |
| question: 'Inside a bucket, does a 100-point test beat a 20-point quiz?' | question: 'Inside a category, should a 100-point test count more than a 20-point quiz?' |
| question: 'Missing work?' | question: 'How should missing work count?' |
| question: 'Late work?' | question: 'How should late work be handled?' |
| label: 'Not accepted / no auto penalty', | label: 'No automatic penalty', |
| label: 'Flat penalty', | label: 'Take off the same amount once', |
| label: '% per day', | label: 'Take off a percent each day', |
| label: 'Drop + EC + retakes', | label: 'Drop lowest, extra credit, and retakes', |
| question: 'Open the syllabus form to check the sample student and publish?' | question: 'Want to open the full form to check the sample students and publish?' |

### `src/lib/interview/nextQuestion.ts`

| Old | New |
|---|---|
| return "Set up how this school posts grades. Answer a few questions — I'll fill the same draft as the form. You can say things like “six-weeks, 70 is passing.”"; | return "Let's set up how your school gives grades. Answer a few questions and I'll fill in the form for you. You can say things like “six-weeks, 70 is passing.”"; |
| 'Build this class syllabus by answering a few questions. Same draft as the wizard — nothing publishes until you open the form and tap Publish.' | 'Let's set up how this class is graded. Answer a few questions and I'll fill in the form for you. Nothing is published until you open the form and tap Publish.' |
| Chat read-back 'high, six report cards a year, credit semester_0_5, rollup 2/7+1/7, 70 is passing, GPA unweighted_and_weighted. Open the form…' / 'weighted percent inside, Tests 50/Quizzes 20/Homework 30, missing=zero, late=flat_percent' | 'Here's what I have: High school; six report cards a year; ½ credit per semester; semester grade: Three six-weeks count 2/7 each, exam counts 1/7; 70 is passing; Unweighted and weighted GPA. Open the form…' / 'Weighted categories, every assignment equal; Tests 50%, Quizzes 20%, Homework 30%; missing work: counts as 0; late work: one-time late penalty' |

### `src/lib/interview/turn.ts`

| Old | New |
|---|---|
| const msg = 'Opening the form with your draft. Publish stays on the form.'; | const msg = 'Opening the form with your answers filled in. You publish from the form.'; |
| const msg = 'Photo import uses the same draft. Come back to finish remaining questions after.'; | const msg = 'Your photo will fill in the same form. Come back afterward to answer any questions that are left.'; |
| 'I could not parse that twice. Opening that step on the form instead.' | 'Sorry, I still didn’t understand. Let’s open that part of the form instead.' |
| ? `I didn't catch a value. ${pending.question}` | ? `Sorry, I didn't understand that. ${pending.question}` |
| : 'I did not catch a value. Try a chip or a short answer.'; | : 'Sorry, I didn’t understand that. Tap a choice or type a short answer.'; |
| 'Got it: calendar.template, scale.passing_pct.' | 'Got it. Grading periods: Six-week grading periods (Texas). Passing grade: 70.' |

### `src/lib/interview/extract.ts`

| Old | New |
|---|---|
| restate: 'Applying recommended default.' }; | restate: 'No problem. I’ll use the usual choice, and you can change it later.' }; |
| restate: `Recorded: ${chip.label}`, | restate: `Got it: ${chip.label}.`, |
| 'I heard calendar.template="tx_six_weeks", scale.default_id="texas_no_d", scale.passing_pct=70.' | 'I heard: Grading periods: Six-week grading periods (Texas). Letter scale: Texas scale, no D. Passing grade: 70.' |

### `src/lib/interview/sideQuestion.ts`

| Old | New |
|---|---|
| 'Layers that change: live grade, report card, unweighted gpa.' | 'This changes: the grade students see now, report cards, unweighted GPA.' |
| body: 'That choice changes how live grades and report cards combine. It does not publish by itself.', | body: 'That choice changes how current grades and report cards are figured. Nothing is published until you publish.', |
| meaning: 'Setup choices change averages and report cards, not past stored grades until you publish.', | meaning: 'Setup choices change averages and report cards. Saved grades don’t change until you publish.', |
| example: 'Try the sample student on the form after you pick an option.', | example: 'Check the sample students on the form after you pick an option.', |
| 'This does not save a new choice until you tap a chip or confirm an answer.', | 'Nothing is saved until you tap a choice or answer the question.', |
| offer ? 'Want the full form help instead? Tap Open the form.' : null, | offer ? 'Want to see the full form instead? Tap Open the form.' : null, |
| "I can't do that from setup chat. I only fill the grading draft — no curves, no score edits, no publish."; | "I can't do that here. I can only help fill in your grading setup. I can't curve grades, change scores, or publish."; |

### `src/components/interview/InterviewScreen.tsx`

| Old | New |
|---|---|
| setError(err instanceof Error ? err.message : 'Turn failed'); | setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.'); |
| 'So far: level: "high" · calendar.template: "tx_six_weeks" · credit.policy: {"unit":"semester_0_5",…}' | 'So far: School level: High school · Grading periods: Six-week grading periods (Texas) · Credit: ½ credit per semester' |
| label="Something else" | label="Or type your own answer" |
| placeholder="Or type an answer" | placeholder="Type here" |

### `src/app/class/[id]/syllabus-interview.tsx`

| Old | New |
|---|---|
| usePushedTitle('Syllabus interview'); | usePushedTitle('Answer a few questions'); |

### `src/app/school/grading-policy/interview.tsx`

| Old | New |
|---|---|
| usePushedTitle('Policy interview'); | usePushedTitle('Answer a few questions'); |

### `src/components/ingest/IngestProposalReview.tsx`

| Old | New |
|---|---|
| Notices 'Dropped: syllabus.foo, gpa.rank' / 'Dropped syllabus.floor: no evidence quote on page.' / 'Retried school policy extract with stricter core-field prompt.' / 'Could not map missing rule; left empty.' | 'Some parts of the document did not match any setting here, so they were left out.' / (hidden) / (hidden) / 'We could not tell how missing work is graded. Please choose it yourself.' |
| 'Filled from <source_id uuid>. Review highlighted fields before saving.' | 'We read your document. Check each setting below before you use it.' |
| AI never publishes. Accept, edit, or reject each field, then continue in the wizard. | Nothing is saved or published yet. For each setting, tap Use, Change, or Skip. |
| ? `p. ${f.evidence.page}: ${f.evidence.quote}`             : f.evidence.quote \|\| 'No quote'; | ? `Page ${f.evidence.page}: “${f.evidence.quote}”`             : f.evidence.quote               ? `“${f.evidence.quote}”`               : 'We didn’t find this exact wording in the document.'; |
| Field badge '92% · proposed' / '40% · needs_review' | 'Clearly stated · Found' / 'Unclear · Please check' |
| label="Edited value (JSON or text)" | label="Your value" |
| label="Accept" | label="Use" |
| label="Edit" | label="Change" |
| label="Reject" | label="Skip" |
| 'Decision: accept' | 'Will use this' |
| label={debugOpen ? 'Hide field keys' : 'Show field keys'} | label={debugOpen ? 'Hide technical details' : 'Show technical details'} |
| label="Apply into wizard" | label="Use these settings" |
| <GhostButton label="Discard proposal" onPress={onDiscard} /> | <GhostButton label="Throw away" onPress={onDiscard} /> |

### `src/lib/ingest/fieldLabels.ts`

| Old | New |
|---|---|
| 'calendar.model': 'Calendar model',   'calendar.period_model': 'Marking period model', | 'calendar.model': 'Grading calendar details',   'calendar.period_model': 'Grading period length', |
| 'credit.attendance_gate': 'Attendance gate for credit', | 'credit.attendance_gate': 'Attendance needed for credit', |
| 'credit.passing_threshold': 'Passing threshold', | 'credit.passing_threshold': 'Passing grade', |
| 'rollup.preset': 'Semester / year rollup',   'rollup.custom_weights': 'Custom rollup weights',   'rollup.exam_enabled': 'Semester exam in rollup', | 'rollup.preset': 'Semester grade formula',   'rollup.custom_weights': 'Custom semester grade weights',   'rollup.exam_enabled': 'Semester exam counts in semester grade', |
| 'scale.bands': 'Letter bands', | 'scale.bands': 'Letter grade ranges', |
| 'qp.tables': 'Quality-point chart',   'qp.method': 'Quality-point method', | 'qp.tables': 'GPA points chart',   'qp.method': 'How GPA points are given', |
| 'gpa.mode': 'GPA mode',   'gpa.profiles': 'GPA profiles', | 'gpa.mode': 'GPA',   'gpa.profiles': 'GPA types', |
| 'locks.map': 'Teacher locks', | 'locks.map': 'What teachers can change', |
| 'syllabus.engine': 'Grading engine', | 'syllabus.engine': 'How grades add up', |
| 'syllabus.extra_credit_method': 'Extra credit method',   'syllabus.ec_cap': 'Extra credit cap',   'syllabus.floor': 'Period floor',   'syllabus.ceiling': 'Period ceiling',   'syllabus.book_mode': 'Gradebook mode', | 'syllabus.extra_credit_method': 'How extra credit works',   'syllabus.ec_cap': 'Most extra credit allowed',   'syllabus.floor': 'Lowest grade allowed',   'syllabus.ceiling': 'Highest grade allowed',   'syllabus.book_mode': 'Fresh start each grading period', |
| 'syllabus.rollup_preset': 'Class rollup preset', | 'syllabus.rollup_preset': 'Semester grade formula', |
| 'syllabus.empty_category': 'Empty category', | 'syllabus.empty_category': 'Category with no grades yet', |
| 'syllabus.term_structure': 'Term structure', | 'syllabus.term_structure': 'How the year is split', |
| Ingest field names 'Grading engine', 'Class rollup preset', 'Period floor', 'Quality-point chart', 'Teacher locks', 'Calendar model', 'Attendance gate for credit' … | 'How grades add up', 'Semester grade formula', 'Lowest grade allowed', 'GPA points chart', 'What teachers can change', 'Grading calendar details', 'Attendance needed for credit' … |
| tx_six_weeks: 'Texas six weeks',     nine_weeks: 'Nine weeks',     trimester: 'Trimester',     college_term: 'College term',     elementary_year_4: 'Elementary (4 periods)',     elementary_year_6: 'Elementary (6 periods)',     semester: 'Semester', | tx_six_weeks: 'Six-week grading periods (Texas)',     nine_weeks: 'Nine-week grading periods (quarters)',     trimester: 'Trimesters',     college_term: 'College terms',     elementary_year_4: 'Elementary, 4 report cards a year',     elementary_year_6: 'Elementary, 6 report cards a year',     semester: 'Semesters', |
| weighted_points_inside: 'Weighted, points inside',     weighted_percent_inside: 'Weighted, equal percent',     item_weights: 'Item weights', | weighted_points_inside: 'Weighted categories, points count',     weighted_percent_inside: 'Weighted categories, every assignment equal',     item_weights: 'Each assignment has its own weight', |
| points_inside: 'Add points inside the category',     percent_inside: 'Average percents inside the category', | points_inside: 'Bigger assignments count more',     percent_inside: 'Every assignment counts the same', |
| floor: 'Use a floor',     omit: 'Omit from average',   }, | floor: 'Counts as the lowest grade allowed',     omit: "Doesn't count until it's turned in",   }, |
| Extra credit values 'Method A' / 'Method B' / 'Method C' | 'Raises or replaces a score' / 'Adds bonus points' / 'Has its own category' |
| reset_each_marking_period: 'Reset each marking period',     rolling_year: 'Rolling year', | reset_each_marking_period: 'Start fresh each grading period',     rolling_year: 'Keep one running average all year', |
| letter_map: 'Letter map',     numeric_band: 'Numeric percent bands',     percent_map: 'Percent map', | letter_map: 'By letter grade',     numeric_band: 'By percent range',     percent_map: 'By exact percent', |
| off: 'Off',     unweighted: 'Unweighted only',     unweighted_and_weighted: 'Unweighted and weighted', | off: 'No GPA',     unweighted: 'Unweighted GPA only',     unweighted_and_weighted: 'Unweighted and weighted GPA', |
| '2/7+1/7': '2/7 + 1/7 (six-weeks + exam)',     '40/40/20': '40 / 40 / 20',     '45/45/10': '45 / 45 / 10',     '3/7+3/7+1/7': '3/7 + 3/7 + 1/7',     '85/15': '85 / 15',     '25x4': '25 × 4',     '50/50': '50 / 50',     year_mean: 'Simple year mean', | '2/7+1/7': 'Three six-weeks count 2/7 each, exam counts 1/7',     '40/40/20': 'Two grading periods 40% each, exam 20%',     '45/45/10': 'Two grading periods 45% each, exam 10%',     '3/7+3/7+1/7': 'Two grading periods 3/7 each, exam 1/7',     '85/15': 'Grading periods 85%, exam 15%',     '25x4': 'Four quarters, 25% each',     '50/50': 'Two grading periods, 50% each, no exam',     year_mean: 'Plain average of all grading periods', |
| if (o.type === 'floor') return o.floor != null ? `Floor of ${o.floor}` : 'Use a floor'; | if (o.type === 'floor') return o.floor != null ? `Counts as ${o.floor}` : 'Counts as the lowest grade allowed'; |
| if (o.type === 'omit') return 'Omit from average'; | if (o.type === 'omit') return "Doesn't count until it's turned in"; |
| if (o.type === 'none') return 'No late work / not accepted'; | if (o.type === 'none') return 'No automatic late penalty'; |
| return `${value.length} quality-point band${value.length === 1 ? '' : 's'}`; | return `GPA points for ${value.length} grade range${value.length === 1 ? '' : 's'}`; |

### `src/lib/help/helpTopics.ts`

| Old | New |
|---|---|
| topic('help.engine.weighted_points', 'Weighted, points inside', | topic('help.engine.weighted_points', 'Weighted, points count', |
| 'Tests 50% is the category. Inside Tests, a 100-point test beats a 20-point quiz.', | 'Each category has a weight, like Tests 50%. Inside Tests, a 100-point test counts more than a 20-point quiz.', |
| Help example 'Tests 50%: 80/100 + 20/20 → category then × 0.5.' | 'Tests are 50%: 80/100 and 20/20 add up to 100/120 (83%), and that counts for half the grade.' |
| topic('help.engine.weighted_percent', 'Weighted, equal percent', | topic('help.engine.weighted_percent', 'Weighted, all equal', |
| 'Inside a category every assignment is worth the same, 20/20 = 50/50.', | 'Inside a category every assignment counts the same, no matter how many points it has.', |
| Help 'Homework 20% empty → remaining weights renormalize to 100%.' | 'If Homework (20%) has no grades yet, the other categories make up the whole grade for now.' |
| 'Default: ignore that weight until a score exists. Treating it as zero makes everyone look like they are failing early.', | 'Usually a category with no grades is skipped until it has one. Counting it as zero makes everyone look like they are failing early.', |
| '0 pulls the average down. Omit hides it. Floor (50) is a school policy, not a score the student earned.', | 'A 0 pulls the average down. “Doesn’t count yet” leaves it out until it is turned in. A lowest grade (like 50) is a school rule, not a score the student earned.', |
| 'Missing 100-pt test as 0 with only an 80 quiz → low average; omit keeps 80.' | 'A missing 100-point test counted as 0 next to an 80 quiz gives a low average. Leaving it out keeps the 80.' |
| 'Removes earned and possible for that assignment. Never a zero. Same raw work can read 98/120 when a 10-pt item is excused vs 98/130 when it is still in the book.', | 'Takes the assignment out of the grade completely. It is never a zero.', |
| '98/120 with a 10-pt test excused vs 98/130 when that test still counts.' | '98/120 with a 10-point test excused, vs 98/130 when that test still counts.' |
| Help 'Changes the counted score. Does not change max points unless the function says so.' | 'Lowers the score that counts. The points possible stay the same.' |
| '80/100 with 10% late flat → counted 72.' | '80/100 with a one-time 10% late penalty → counts as 72.' |
| 'Students who skip it are not penalized. A weighted EC category does penalize them.', | 'Students who skip it are not hurt. An extra credit category with its own weight does hurt them.', |
| 'Base 80% + 5 EC points method B → 85% without hurting non-doers.' | '80% plus 5 bonus points → 85%. Students who skip it stay at 80%.' |
| 'Applies inside this marking period only. Next six-weeks starts fresh. Finals can be never-drop.', | 'Happens inside one grading period only. The next six weeks starts fresh. Finals can be set to never drop.', |
| 'Three quizzes 60, 80, 90 with drop-1 → average 85.' | 'Three quizzes of 60, 80, and 90, dropping the lowest one → average 85.' |
| '2/7+2/7+2/7+exam 1/7: exam is a term component.' | 'Three six-weeks at 2/7 each plus the exam at 1/7: the exam is part of the semester grade.' |
| topic('help.rollup.2_7', '2/7 + 1/7', | topic('help.rollup.2_7', 'Three six-weeks + exam', |
| 'Each of three six-weeks is ~28.5% of the semester; exam is ~14.5%.', | 'Each of the three six-weeks counts 2/7 (about 28.5%) of the semester grade; the exam counts 1/7 (about 14.5%).', |
| Help example '80, 80, 80 + exam 70 → (2/7)*3*80 + (1/7)*70 ≈ 78.6%.' | '80, 80, and 80, plus a 70 on the exam → about 78.6% for the semester.' |
| 'S1 68 + S2 72 with year-link → full credit; both letters still GPA.' | 'Semester 1: 68 and Semester 2: 72 average to 70 → full credit. Both grades still count in GPA.' |
| 'Default off. When on, eligible students drop the term exam weight; remaining period weights renormalize (40/40/20 → 50/50).', | 'Off unless you turn it on. Students who qualify skip the semester exam, and the grading periods share its weight (40/40/20 becomes 50/50).', |
| 'Q1 80 + Q2 90, exam exempt → 85 with equal 50/50 weights.' | 'Quarter 1: 80 and Quarter 2: 90, exam skipped → 85.' |
| Help 'Default off. Multiple attempts pick replace, higher_of, or average; optional cap (e.g. Texas 70) limits the counted percent.' | 'Off unless you turn it on. When a student retakes, you can use the newest score, keep the higher score, or average the tries…' |
| '40 then 95 with higher_of + cap 70 → counted 70.' | '40, then 95 on the retake, keep the higher score, highest retake grade 70 → counts as 70.' |
| Help '… Default null = off.' | '… Both are off unless you set them.' |
| 'Raw 20% with floor 50 → 50. EC 110% with ceiling 100 → 100.' | '20% with a lowest grade of 50 → 50. 110% with extra credit and a highest grade of 100 → 100.' |
| 'One shared raw for a group of students; each student’s individual override wins. Stored per student so engine math is unchanged.', | 'One score for a whole group. You can still give any student a different score, and that one counts instead.', |
| 'Group 88 for three students; one override 95 → two at 88, one at 95.' | 'Group score 88 for three students, one changed to 95 → two get 88, one gets 95.' |
| '69.4 rounded nearest whole → 69 → F.' | '69.4 rounds to 69, which is an F.' |
| 'A 91 and a 99 can both be A and still be different GPA points. Numeric-band tables keep full rows (4.0/5.0/6.0), not a flat +1.0 guess.', | 'A 91 and a 99 can both be an A but earn different GPA points. A percent-range chart lists the points for each range.', |
| '91 → 3.8; 99 → 4.0 on a numeric band table.' | '91 → 3.8 and 99 → 4.0 on a percent-range chart.' |
| 'Admin sets level on the course (Regular, Honors, Pre-AP, AP, IB HL/SL, Dual Credit, OnRamps, Modified, Local). Teachers cannot change it. Weighted GPA uses the level column or bonus.', | 'The school office sets each course’s level (Regular, Honors, Pre-AP, AP, IB, Dual Credit, OnRamps, Modified, Local). Teachers can’t change it. Weighted GPA gives extra points for higher levels.', |
| 'AP A = 5.0 weighted / 6.0 on a Texas numeric table; F stays 0.' | 'An A in AP is 5.0 weighted (6.0 on a Texas chart). An F is still 0.' |
| topic('help.gpa.profiles', 'GPA profiles', | topic('help.gpa.profiles', 'Types of GPA', |
| 'Unweighted 4.0, weighted 5.0, and optional rank 6.0 each have their own table, inclusion flags, and repeat rule. Rank is for class rank only — not the elementary parent phone.', | 'Unweighted (4.0), weighted (5.0), and class rank (6.0) GPA each have their own points chart, their own rules for which courses count, and their own repeat rule. Class rank GPA is only used for ranking.', |
| Help 'Rank excludes PE, aide, CBE, recovery, and pre-9 by default.' | 'Class rank leaves out PE, office aide, credit by exam, credit recovery, and courses taken before 9th grade.' |
| 'Optional rank_6 profile uses a 6.0 numeric table and a narrower inclusion set. Shown on School → Class Rank & GPA for office/high school — not on the parent phone 6.0 grid.', | 'Optional. Uses a 6.0 points chart and counts fewer courses. Shown under School → Class Rank & GPA for high schools, not on the parent phone view.', |
| 'AP 98 → 6.0 rank points; PE omitted.' | 'A 98 in AP → 6.0 rank points. PE is left out.' |
| Help 'PE can be on the transcript and out of rank GPA. P/F pass never enters the denominator…' | 'PE can be on the transcript but left out of class rank GPA. Pass/fail classes never count in GPA…' |
| 'PE P omitted; PE F may count as 0 if profile says so.' | 'A P in PE is left out. An F in PE may count as 0 if that GPA type says so.' |
| topic('help.reset_period', 'Book resets each period', | topic('help.reset_period', 'Fresh start each grading period', |
| 'Cycle-1 scores do not average into cycle 2. The semester formula is what combines them.', | 'Scores from the 1st six weeks don’t mix into the 2nd. The semester grade formula combines them later.', |
| Help example '6W1 70 and 6W2 90 stay separate until rollup.' | '1st Six Weeks: 70 and 2nd Six Weeks: 90 stay separate until the semester grade.' |
| topic('help.glyphs.6w', 'Six-week pies', | topic('help.glyphs.6w', 'Six-week circles', |
| 'Each six-weeks is a solid 1/6 of the year circle (60°), clockwise from 12 o’clock. S1 is the right half; S2 is the left. Quarter pies are a different calendar.', | 'Each six weeks is one slice (1/6) of the year circle, going clockwise from the top. Semester 1 is the right half; Semester 2 is the left half.', |
| Help '6W1–6W3 fill the right half (S1); 6W4–6W6 fill the left half (S2).' | 'The 1st–3rd six weeks fill the right half (Semester 1); the 4th–6th fill the left half (Semester 2).' |
| 'Chooses default calendar, scale, credit, and whether GPA is on.', | 'Sets the usual grading periods, letter scale, credit, and whether GPA is on.', |
| 'High → Texas 6-week + 70-pass + weighted GPA.' | 'High school → six-week grading periods, 70 passes, weighted GPA.' |
| topic('help.wizard.dates', 'Year dates', | topic('help.wizard.dates', 'School year dates', |
| 'Start and end dates generate equal period wedges. You can edit any period after generation.', | 'From the first and last day of school, we split the year into equal grading periods. You can change any of them afterward.', |
| 'Aug 15–May 28 six-weeks → six equal ranges under S1/S2.' | 'Aug 15 to May 28 with six weeks → six equal grading periods, three in each semester.' |
| topic('help.wizard.locks', 'Teacher locks', | topic('help.wizard.locks', 'What teachers can change', |
| 'Locked syllabus fields stay visible to teachers but cannot be changed. Optional lock reason shows on the syllabus wizard.', | 'Teachers can see settings you lock, but can’t change them. Your reason shows next to the setting.', |
| 'Lock scale → teacher inherits Texas 70-pass.' | 'Lock the letter scale → every teacher uses the Texas scale where 70 passes.' |
| 'Admin-written reason shown next to a locked syllabus field so teachers know why they cannot edit it.', | 'A short note from the office, shown next to a locked setting, so teachers know why they can’t change it.', |
| 'Start from another of your classes or a school template. Locked fields never carry teacher overrides — school locks win.', | 'Start from another of your classes or a school template. Settings your school controls always keep the school’s choice.', |
| 'Copy Spring ISD 50/50 then unlock homework weight stays editable if not locked.' | 'Copy “Spring ISD 50/50”, and you can still change any weight your school doesn’t control.' |
| 'Named templates admin publishes (Spring ISD 50/50, Homework ≤10%, Texas retake cap 70). Teachers copy unlocked fields only.', | 'Ready-made setups from your school office (like Spring ISD 50/50, Homework ≤10%, Texas retake cap 70). Copying one fills in only the settings you’re allowed to change.', |
| 'Texas 70-pass + retake cap 70 seeds floor 50 and retake cap 70.' | '“Texas 70-pass + retake cap 70” sets the lowest grade to 50 and the highest retake grade to 70.' |
| Help 'Publishing writes a new grading_policies version, saves the calendar, and binds classes.' | 'Publishing saves a new version of the policy and its calendar, and every class starts using it.' |
| 'Publish v1 then edit draft v2 without rewriting stored grades until audited change.' | 'After you publish version 1, you can work on a new draft. Saved grades don’t change until you publish again.' |
| topic('help.book_mode', 'Book mode', | topic('help.book_mode', 'Fresh start or running average', |
| Help 'reset_each_marking_period (default) keeps period averages independent. rolling_year carries scores across.' | '“Start fresh each grading period” (the usual choice) keeps each period’s average separate…' |
| 'Reset: 6W1 work never averages into 6W2 live book.' | 'Starting fresh: work from the 1st six weeks never mixes into the 2nd six weeks.' |
| topic('help.engine', 'Grading engine', | topic('help.engine', 'How grades add up', |
| 'Total points, weighted points-inside, weighted percent-inside, item weights, or no overall grade.', | 'Choose total points, weighted categories (points count, or every assignment equal), a weight for each assignment, or no overall grade.', |
| Help example 'See help.engine.points / weighted_points / weighted_percent.' | 'Pick a choice to see an example.' |
| topic('help.chat.what_this_is', 'Setup interview', | topic('help.chat.what_this_is', 'Answer a few questions', |
| 'Guided questions that fill the same draft as the wizard and photo ingest. Nothing publishes from chat.', | 'A few questions that fill in the same form you’d fill in by hand or from a photo. Nothing is published from here.', |
| 'Say “six-weeks, 70 is passing” to fill two slots at once.' | 'Say “six-weeks, 70 is passing” to answer two questions at once.' |
| 'Applies the recommended default for your school level and marks the field assumed so you can change it later.', | 'Uses the usual choice for your school level and marks it so you can change it later.', |
| 'High + not sure on calendar → Texas six-weeks template.' | 'High school + “I’m not sure” about grading periods → six-week grading periods.' |
| 'Hands the same draft to the wizard. Publish / Save remain wizard buttons only.', | 'Opens the form with your answers filled in. You save and publish from the form.', |
| 'Interview read-back → Open form → fields match chips.' | 'Your answers show up in the form, ready to check.' |
| topic('help.chat.skip_answered', 'Skip known slots', | topic('help.chat.skip_answered', 'Skip what you already answered', |
| 'If you already answered a slot in free text, that question is skipped.', | 'If you already answered something in your own words, that question is skipped.', |
| 'Side questions explain repercussions with a worked example. They do not save a choice or advance the graph.', | 'Ask “what if…” to see what a choice would change, with an example. Asking doesn’t save anything or move on.', |
| Help 'Pending engine Q + “what if total points?” keeps the same chips.' | 'Ask “what if I use total points?” and the same choices stay on screen.' |
| Help body 'Affects: live_grade, report_card, letter.' | 'Affects: the grade students see now, report cards, letter grades.' |
