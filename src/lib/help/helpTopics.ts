import { HELP_AFFECT_WORDS } from '../grade/plainLabels.ts';

/**
 * HelpTopic store — FR-FORM-X05 / FR-HELP-*. Bundled fallback when DB empty.
 */
export type HelpAffect =
  | 'live_grade'
  | 'report_card'
  | 'progress_report'
  | 'transcript'
  | 'unweighted_gpa'
  | 'weighted_gpa'
  | 'credit'
  | 'eligibility'
  | 'letter';

export type HelpTopic = {
  key: string;
  title: string;
  body: string;
  meaning: string;
  affects: HelpAffect[];
  example: string;
  sru_ref: string | null;
};

type HelpRow = {
  key: string;
  title: string;
  body: string;
  sru_ref: string | null;
};

function topic(
  key: string,
  title: string,
  meaning: string,
  affects: HelpAffect[],
  example: string,
  sru_ref: string | null = null,
): HelpTopic {
  const body = [meaning, affects.length ? `Affects: ${affects.map((a) => HELP_AFFECT_WORDS[a] ?? a.replace(/_/g, ' ')).join(', ')}.` : '', example]
    .filter(Boolean)
    .join('\n\n');
  return { key, title, body, meaning, affects, example, sru_ref };
}

export const BUNDLED_HELP_TOPICS: HelpTopic[] = [
  topic('help.engine.points', 'Total points',
    'A 100-point test outweighs a 10-point quiz. No category percents.',
    ['live_grade', 'report_card', 'letter'],
    '80/100 on a test and 8/10 on a quiz → 88/110 ≈ 80%.', 'FR-HELP-02'),
  topic('help.engine.weighted_points', 'Weighted, points count',
    'Each category has a weight, like Tests 50%. Inside Tests, a 100-point test counts more than a 20-point quiz.',
    ['live_grade', 'report_card', 'letter'],
    'Tests are 50%: 80/100 and 20/20 add up to 100/120 (83%), and that counts for half the grade.', 'FR-HELP-02'),
  topic('help.engine.weighted_percent', 'Weighted, all equal',
    'Inside a category every assignment counts the same, no matter how many points it has.',
    ['live_grade', 'report_card', 'letter'],
    '80/100 and 8/10 both count as 80% inside the category.', 'FR-HELP-02'),
  topic('help.empty_category', 'Empty category',
    'Usually a category with no grades is skipped until it has one. Counting it as zero makes everyone look like they are failing early.',
    ['live_grade'],
    'If Homework (20%) has no grades yet, the other categories make up the whole grade for now.', 'FR-HELP-02'),
  topic('help.missing', 'Missing',
    'A 0 pulls the average down. “Doesn’t count yet” leaves it out until it is turned in. A lowest grade (like 50) is a school rule, not a score the student earned.',
    ['live_grade', 'report_card', 'letter'],
    'A missing 100-point test counted as 0 next to an 80 quiz gives a low average. Leaving it out keeps the 80.', 'FR-HELP-02'),
  topic('help.excused', 'Excused',
    'Takes the assignment out of the grade completely, both the points earned and the points possible. It is never a zero.',
    ['live_grade', 'report_card'],
    '98/120 with a 10-point test excused, vs 98/130 when that test still counts.', 'FR-HELP-02'),
  topic('help.late', 'Late penalty',
    'Lowers the score that counts. The points possible stay the same.',
    ['live_grade', 'report_card', 'letter'],
    '80/100 with a one-time 10% late penalty → counts as 72.', 'FR-HELP-02'),
  topic('help.extra_credit_b', 'Extra credit (add to earned)',
    'Students who skip it are not hurt. An extra credit category with its own weight does hurt them.',
    ['live_grade', 'report_card'],
    '80% plus 5 bonus points → 85%. Students who skip it stay at 80%.', 'FR-HELP-02'),
  topic('help.drop_lowest', 'Drop lowest',
    'Happens inside one grading period only. The next six weeks starts fresh. Finals can be set to never drop.',
    ['live_grade', 'report_card'],
    'Three quizzes of 60, 80, and 90, dropping the lowest one → average 85.', 'FR-HELP-02'),
  topic('help.exam_term', 'Semester exam',
    'Lives on the semester, not inside the Tests category. Putting it in both double-counts it.',
    ['report_card', 'transcript', 'credit'],
    'Three six-weeks at 2/7 each plus the exam at 1/7: the exam is part of the semester grade.', 'FR-HELP-02'),
  topic('help.rollup.2_7', 'Three six-weeks + exam',
    'Each of the three six-weeks counts 2/7 (about 28.5%) of the semester grade; the exam counts 1/7 (about 14.5%).',
    ['report_card', 'transcript', 'credit'],
    '80, 80, and 80, plus a 70 on the exam → about 78.6% for the semester.', 'FR-HELP-02'),
  topic('help.year_link', 'Year average for credit',
    'A 68 and a 72 can still award 1.0 credit. Both semester marks stay on the transcript for GPA.',
    ['credit', 'transcript', 'unweighted_gpa', 'weighted_gpa'],
    'Semester 1: 68 and Semester 2: 72 average to 70 → full credit. Both grades still count in GPA.', 'FR-HELP-02'),
  topic('help.exam_exemption', 'Exam exemption',
    'Off unless you turn it on. Students who qualify skip the semester exam, and the grading periods share its weight (40/40/20 becomes 50/50).',
    ['report_card', 'transcript', 'credit', 'live_grade'],
    'Quarter 1: 80 and Quarter 2: 90, exam skipped → 85.', 'FR-CR-06'),
  topic('help.retake_cap', 'Retakes and cap',
    'Off unless you turn it on. When a student retakes, you can use the newest score, keep the higher score, or average the tries. You can also set a highest retake grade (like 70 in Texas).',
    ['live_grade', 'report_card', 'letter'],
    '40, then 95 on the retake, keep the higher score, highest retake grade 70 → counts as 70.', 'FR-SYL-12'),
  topic('help.period_floor', 'Period floor and ceiling',
    'Applied to the grading period average after extra credit. A lowest grade raises a very low average; a highest grade caps a high one. Both are off unless you set them.',
    ['live_grade', 'report_card', 'letter'],
    '20% with a lowest grade of 50 → 50. 110% with extra credit and a highest grade of 100 → 100.', 'FR-SYL-11'),
  topic('help.group_score', 'Group score',
    'One score for a whole group. You can still give any student a different score, and that one counts instead.',
    ['live_grade', 'report_card'],
    'Group score 88 for three students, one changed to 95 → two get 88, one gets 95.', 'FR-ASG-03'),
  topic('help.scale.tx70', 'Texas 70 passing',
    '69 is F. There may be no D. Passing for credit is 70, not 60.',
    ['letter', 'credit', 'eligibility'],
    '69.4 rounds to 69, which is an F.', 'FR-HELP-02'),
  topic('help.gpa.unweighted', 'Unweighted GPA',
    'Every included course uses the same 4.0 table. AP A = 4.0.',
    ['unweighted_gpa', 'transcript'],
    'A + B on 1.0 credits → (4+3)/2 = 3.5.', 'FR-HELP-02'),
  topic('help.gpa.weighted', 'Weighted GPA',
    'AP/Honors add points. AP A = 5.0 on the default table. F is still 0.',
    ['weighted_gpa', 'transcript'],
    'AP A (5.0) + regular B (3.0) → 4.0 weighted.', 'FR-HELP-02'),
  topic('help.gpa.numeric_table', 'Percent-to-points',
    'A 91 and a 99 can both be an A but earn different GPA points. A percent-range chart lists the points for each range.',
    ['unweighted_gpa', 'weighted_gpa'],
    '91 → 3.8 and 99 → 4.0 on a percent-range chart.', 'FR-HELP-02'),
  topic('help.gpa.course_level', 'Course level',
    'The school office sets each course’s level (Regular, Honors, Pre-AP, AP, IB, Dual Credit, OnRamps, Modified, Local). Teachers can’t change it. Weighted GPA gives extra points for higher levels.',
    ['weighted_gpa', 'transcript', 'letter'],
    'An A in AP is 5.0 weighted (6.0 on a Texas chart). An F is still 0.', 'FR-LVL-01'),
  topic('help.gpa.profiles', 'Types of GPA',
    'Unweighted (4.0), weighted (5.0), and class rank (6.0) GPA each have their own points chart, their own rules for which courses count, and their own repeat rule. Class rank GPA is only used for ranking.',
    ['unweighted_gpa', 'weighted_gpa', 'transcript'],
    'Class rank leaves out PE, office aide, credit by exam, credit recovery, and courses taken before 9th grade.', 'FR-GPA-03'),
  topic('help.gpa.repeat', 'Repeat rule',
    'When a student retakes a course, both attempts stay on the transcript. GPA may keep both, replace with the better, average points, or forgive D/F after a passing retake.',
    ['unweighted_gpa', 'weighted_gpa', 'transcript'],
    'F then B with replace → only B counts in GPA.', 'FR-GPA-04'),
  topic('help.gpa.rank', 'Class rank GPA',
    'Optional. Uses a 6.0 points chart and counts fewer courses. Shown under School → Class Rank & GPA for high schools, not on the parent phone view.',
    ['weighted_gpa', 'transcript'],
    'A 98 in AP → 6.0 rank points. PE is left out.', 'FR-GPA-07'),
  topic('help.include_pe', 'What counts in GPA',
    'PE can be on the transcript but left out of class rank GPA. Pass/fail classes never count in GPA. Each GPA type can also leave out athletics, office aide, local credit, credit by exam, credit recovery, and courses before 9th grade.',
    ['unweighted_gpa', 'weighted_gpa', 'transcript'],
    'A P in PE is left out. An F in PE may count as 0 if that GPA type says so.', 'FR-HELP-02'),
  topic('help.reset_period', 'Fresh start each grading period',
    'Scores from the 1st six weeks don’t mix into the 2nd. The semester grade formula combines them later.',
    ['live_grade', 'report_card'],
    '1st Six Weeks: 70 and 2nd Six Weeks: 90 stay separate until the semester grade.', 'FR-HELP-02'),
  topic('help.glyphs.6w', 'Six-week circles',
    'Each six weeks is one slice (1/6) of the year circle, going clockwise from the top. Semester 1 is the right half; Semester 2 is the left half.',
    ['live_grade', 'report_card'],
    'The 1st–3rd six weeks fill the right half (Semester 1); the 4th–6th fill the left half (Semester 2).', 'FR-HELP-02'),
  topic('help.wizard.level', 'School level',
    'Sets the usual grading periods, letter scale, credit, and whether GPA is on.',
    ['credit', 'unweighted_gpa', 'weighted_gpa'],
    'High school → six-week grading periods, 70 passes, weighted GPA.', 'FR-FORM-S01'),
  topic('help.wizard.dates', 'School year dates',
    'From the first and last day of school, we split the year into equal grading periods. You can change any of them afterward.',
    ['report_card', 'progress_report'],
    'Aug 15 to May 28 with six weeks → six equal grading periods, three in each semester.', 'FR-FORM-S01'),
  topic('help.wizard.locks', 'What teachers can change',
    'Teachers can see settings you lock, but can’t change them. Your reason shows next to the setting.',
    ['live_grade', 'letter'],
    'Lock the letter scale → every teacher uses the Texas scale where 70 passes.', 'FR-SYL-18'),
  topic('help.lock.reason', 'Lock reason',
    'A short note from the office, shown next to a locked setting, so teachers know why they can’t change it.',
    ['live_grade', 'letter', 'report_card'],
    '“Campus late policy locked.” under Late penalty chips.', 'FR-FORM-T01'),
  topic('help.syllabus.copy', 'Copy syllabus',
    'Start from another of your classes or a school template. Settings your school controls always keep the school’s choice.',
    ['live_grade', 'report_card', 'letter'],
    'Copy “Spring ISD 50/50”, and you can still change any weight your school doesn’t control.', 'FR-TPL-01'),
  topic('help.syllabus.templates', 'School syllabus templates',
    'Ready-made setups from your school office (like Spring ISD 50/50, Homework ≤10%, Texas retake cap 70). Copying one fills in only the settings you’re allowed to change.',
    ['live_grade', 'report_card'],
    '“Texas 70-pass + retake cap 70” sets the lowest grade to 50 and the highest retake grade to 70.', 'FR-TPL-02'),
  topic('help.wizard.review', 'Review and publish',
    'Publishing saves a new version of the policy and its calendar, and every class starts using it.',
    ['report_card', 'transcript', 'credit'],
    'After you publish version 1, you can work on a new draft. Saved grades don’t change until you publish again.', 'FR-FORM-V04'),
  topic('help.book_mode', 'Fresh start or running average',
    '“Start fresh each grading period” (the usual choice) keeps each period’s average separate. “One running average all year” carries scores across.',
    ['live_grade', 'report_card'],
    'Starting fresh: work from the 1st six weeks never mixes into the 2nd six weeks.', 'FR-SYL-14'),
  topic('help.engine', 'How grades add up',
    'Choose total points, weighted categories (points count, or every assignment equal), a weight for each assignment, or no overall grade.',
    ['live_grade', 'report_card', 'letter'],
    'Pick a choice to see an example.', 'FR-SYL-01'),
  topic('help.chat.what_this_is', 'Answer a few questions',
    'A few questions that fill in the same form you’d fill in by hand or from a photo. Nothing is published from here.',
    ['live_grade', 'report_card'],
    'Say “six-weeks, 70 is passing” to answer two questions at once.', 'FR-CHAT-16'),
  topic('help.chat.im_not_sure', "I'm not sure",
    'Uses the usual choice for your school level and marks it so you can change it later.',
    ['live_grade', 'report_card'],
    'High school + “I’m not sure” about grading periods → six-week grading periods.', 'FR-CHAT-06'),
  topic('help.chat.switch_to_form', 'Open the form',
    'Opens the form with your answers filled in. You save and publish from the form.',
    ['live_grade', 'report_card'],
    'Your answers show up in the form, ready to check.', 'FR-CHAT-09'),
  topic('help.chat.skip_answered', 'Skip what you already answered',
    'If you already answered something in your own words, that question is skipped.',
    ['live_grade'],
    '“Six-weeks and 70 passing” skips calendar and scale questions.', 'FR-CHAT-05'),
  topic('help.chat.what_if', 'What if',
    'Ask “what if…” to see what a choice would change, with an example. Asking doesn’t save anything or move on.',
    ['live_grade', 'report_card', 'letter'],
    'Ask “what if I use total points?” and the same choices stay on screen.', 'FR-CHAT-22'),
  topic('help.transfer_map', 'Transfer letter map',
    'Incoming letter grades convert to a percent through this school map before the local scale and GPA tables apply.',
    ['transcript', 'unweighted_gpa', 'weighted_gpa', 'letter'],
    'Transfer B+ → 88% on the shipped map, then local letter.', 'FR-GPA-08'),
  topic('help.conduct_mark', 'Conduct mark',
    'Separate non-GPA citizenship / work-habits mark per period (E/S/N/U default). Copied to the report card on store.',
    ['report_card'],
    'Teacher enters E; report card shows E next to the period average. GPA unchanged.', 'FR-SYL-17'),
  topic('help.eligibility', 'Eligibility snapshot',
    'At period store, any credit-course grade below passing flags the student for staff. Not on the transcript; never AI-edited.',
    ['eligibility', 'report_card'],
    'English 65 with 70-pass → ineligible for that period.', 'FR-POST-06'),
  topic('help.transfer_in', 'Transfer-in grade',
    'Admin or counselor enters a posted period or semester grade without assignments. Stored with a transfer flag and audit.',
    ['transcript', 'report_card', 'credit'],
    'Enter B+ for S1 Algebra → 88% via transfer map, flag transfer.', 'FR-CR-07'),
];

export function getBundledHelpTopic(key: string): HelpTopic | null {
  return BUNDLED_HELP_TOPICS.find((t) => t.key === key) ?? null;
}

export function listBundledHelpTopics(): HelpTopic[] {
  return [...BUNDLED_HELP_TOPICS];
}

function rowToTopic(row: HelpRow): HelpTopic {
  const bundled = getBundledHelpTopic(row.key);
  return {
    key: row.key,
    title: row.title,
    body: row.body,
    meaning: bundled?.meaning ?? row.body.split('\n\n')[0] ?? row.body,
    affects: bundled?.affects ?? [],
    example: bundled?.example ?? '',
    sru_ref: row.sru_ref,
  };
}

export async function loadHelpTopic(key: string): Promise<HelpTopic | null> {
  try {
    const { requireSupabase } = await import('../supabase/client.ts');
    const client = requireSupabase() as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          eq: (col: string, v: string) => {
            maybeSingle: () => Promise<{ data: HelpRow | null; error: { message: string } | null }>;
          };
        };
      };
    };
    const { data, error } = await client
      .from('help_topics')
      .select('key, title, body, sru_ref')
      .eq('key', key)
      .maybeSingle();
    if (!error && data) return rowToTopic(data);
  } catch {
    // offline / missing table
  }
  return getBundledHelpTopic(key);
}

export async function loadHelpTopics(keys?: string[]): Promise<HelpTopic[]> {
  if (!keys || keys.length === 0) return listBundledHelpTopics();
  const out: HelpTopic[] = [];
  for (const k of keys) {
    const t = await loadHelpTopic(k);
    if (t) out.push(t);
  }
  return out;
}
