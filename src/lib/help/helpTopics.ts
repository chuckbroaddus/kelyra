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
  const body = [meaning, affects.length ? `Affects: ${affects.join(', ')}.` : '', example]
    .filter(Boolean)
    .join('\n\n');
  return { key, title, body, meaning, affects, example, sru_ref };
}

export const BUNDLED_HELP_TOPICS: HelpTopic[] = [
  topic('help.engine.points', 'Total points',
    'A 100-point test outweighs a 10-point quiz. No category percents.',
    ['live_grade', 'report_card', 'letter'],
    '80/100 on a test and 8/10 on a quiz → 88/110 ≈ 80%.', 'FR-HELP-02'),
  topic('help.engine.weighted_points', 'Weighted, points inside',
    'Tests 50% is the category. Inside Tests, a 100-point test beats a 20-point quiz.',
    ['live_grade', 'report_card', 'letter'],
    'Tests 50%: 80/100 + 20/20 → category then × 0.5.', 'FR-HELP-02'),
  topic('help.engine.weighted_percent', 'Weighted, equal percent',
    'Inside a category every assignment is worth the same, 20/20 = 50/50.',
    ['live_grade', 'report_card', 'letter'],
    '80/100 and 8/10 both count as 80% inside the category.', 'FR-HELP-02'),
  topic('help.empty_category', 'Empty category',
    'Default: ignore that weight until a score exists. Treating it as zero makes everyone look like they are failing early.',
    ['live_grade'],
    'Homework 20% empty → remaining weights renormalize to 100%.', 'FR-HELP-02'),
  topic('help.missing', 'Missing',
    '0 pulls the average down. Omit hides it. Floor (50) is a school policy, not a score the student earned.',
    ['live_grade', 'report_card', 'letter'],
    'Missing 100-pt test as 0 with only an 80 quiz → low average; omit keeps 80.', 'FR-HELP-02'),
  topic('help.excused', 'Excused',
    'Removed from earned and possible. Never a zero.',
    ['live_grade', 'report_card'],
    'Excused test: only remaining work averages.', 'FR-HELP-02'),
  topic('help.late', 'Late penalty',
    'Changes the counted score. Does not change max points unless the function says so.',
    ['live_grade', 'report_card', 'letter'],
    '80/100 with 10% late flat → counted 72.', 'FR-HELP-02'),
  topic('help.extra_credit_b', 'Extra credit (add to earned)',
    'Students who skip it are not penalized. A weighted EC category does penalize them.',
    ['live_grade', 'report_card'],
    'Base 80% + 5 EC points method B → 85% without hurting non-doers.', 'FR-HELP-02'),
  topic('help.drop_lowest', 'Drop lowest',
    'Applies inside this marking period only. Next six-weeks starts fresh. Finals can be never-drop.',
    ['live_grade', 'report_card'],
    'Three quizzes 60, 80, 90 with drop-1 → average 85.', 'FR-HELP-02'),
  topic('help.exam_term', 'Semester exam',
    'Lives on the semester, not inside the Tests category. Putting it in both double-counts it.',
    ['report_card', 'transcript', 'credit'],
    '2/7+2/7+2/7+exam 1/7: exam is a term component.', 'FR-HELP-02'),
  topic('help.rollup.2_7', '2/7 + 1/7',
    'Each of three six-weeks is ~28.5% of the semester; exam is ~14.5%.',
    ['report_card', 'transcript', 'credit'],
    '80, 80, 80 + exam 70 → (2/7)*3*80 + (1/7)*70 ≈ 78.6%.', 'FR-HELP-02'),
  topic('help.year_link', 'Year average for credit',
    'A 68 and a 72 can still award 1.0 credit. Both semester marks stay on the transcript for GPA.',
    ['credit', 'transcript', 'unweighted_gpa', 'weighted_gpa'],
    'S1 68 + S2 72 with year-link → full credit; both letters still GPA.', 'FR-HELP-02'),
  topic('help.exam_exemption', 'Exam exemption',
    'Default off. When on, eligible students drop the term exam weight; remaining period weights renormalize (40/40/20 → 50/50).',
    ['report_card', 'transcript', 'credit', 'live_grade'],
    'Q1 80 + Q2 90, exam exempt → 85 with equal 50/50 weights.', 'FR-CR-06'),
  topic('help.retake_cap', 'Retakes and cap',
    'Default off. Multiple attempts pick replace, higher_of, or average; optional cap (e.g. Texas 70) limits the counted percent.',
    ['live_grade', 'report_card', 'letter'],
    '40 then 95 with higher_of + cap 70 → counted 70.', 'FR-SYL-12'),
  topic('help.period_floor', 'Period floor and ceiling',
    'Applied to the period average after extra credit. Floor raises a low average; ceiling caps a high one. Default null = off.',
    ['live_grade', 'report_card', 'letter'],
    'Raw 20% with floor 50 → 50. EC 110% with ceiling 100 → 100.', 'FR-SYL-11'),
  topic('help.group_score', 'Group score',
    'One shared raw for a group of students; each student’s individual override wins. Stored per student so engine math is unchanged.',
    ['live_grade', 'report_card'],
    'Group 88 for three students; one override 95 → two at 88, one at 95.', 'FR-ASG-03'),
  topic('help.scale.tx70', 'Texas 70 passing',
    '69 is F. There may be no D. Passing for credit is 70, not 60.',
    ['letter', 'credit', 'eligibility'],
    '69.4 rounded nearest whole → 69 → F.', 'FR-HELP-02'),
  topic('help.gpa.unweighted', 'Unweighted GPA',
    'Every included course uses the same 4.0 table. AP A = 4.0.',
    ['unweighted_gpa', 'transcript'],
    'A + B on 1.0 credits → (4+3)/2 = 3.5.', 'FR-HELP-02'),
  topic('help.gpa.weighted', 'Weighted GPA',
    'AP/Honors add points. AP A = 5.0 on the default table. F is still 0.',
    ['weighted_gpa', 'transcript'],
    'AP A (5.0) + regular B (3.0) → 4.0 weighted.', 'FR-HELP-02'),
  topic('help.gpa.numeric_table', 'Percent-to-points',
    'A 91 and a 99 can both be A and still be different GPA points. Numeric-band tables keep full rows (4.0/5.0/6.0), not a flat +1.0 guess.',
    ['unweighted_gpa', 'weighted_gpa'],
    '91 → 3.8; 99 → 4.0 on a numeric band table.', 'FR-HELP-02'),
  topic('help.gpa.course_level', 'Course level',
    'Admin sets level on the course (Regular, Honors, Pre-AP, AP, IB HL/SL, Dual Credit, OnRamps, Modified, Local). Teachers cannot change it. Weighted GPA uses the level column or bonus.',
    ['weighted_gpa', 'transcript', 'letter'],
    'AP A = 5.0 weighted / 6.0 on a Texas numeric table; F stays 0.', 'FR-LVL-01'),
  topic('help.gpa.profiles', 'GPA profiles',
    'Unweighted 4.0, weighted 5.0, and optional rank 6.0 each have their own table, inclusion flags, and repeat rule. Rank is for class rank only — not the elementary parent phone.',
    ['unweighted_gpa', 'weighted_gpa', 'transcript'],
    'Rank excludes PE, aide, CBE, recovery, and pre-9 by default.', 'FR-GPA-03'),
  topic('help.gpa.repeat', 'Repeat rule',
    'When a student retakes a course, both attempts stay on the transcript. GPA may keep both, replace with the better, average points, or forgive D/F after a passing retake.',
    ['unweighted_gpa', 'weighted_gpa', 'transcript'],
    'F then B with replace → only B counts in GPA.', 'FR-GPA-04'),
  topic('help.gpa.rank', 'Class rank GPA',
    'Optional rank_6 profile uses a 6.0 numeric table and a narrower inclusion set. Shown on School → Class Rank & GPA for office/high school — not on the parent phone 6.0 grid.',
    ['weighted_gpa', 'transcript'],
    'AP 98 → 6.0 rank points; PE omitted.', 'FR-GPA-07'),
  topic('help.include_pe', 'What counts in GPA',
    'PE can be on the transcript and out of rank GPA. P/F pass never enters the denominator. Each profile also toggles athletics, aide, local credit, CBE, recovery, and pre-9.',
    ['unweighted_gpa', 'weighted_gpa', 'transcript'],
    'PE P omitted; PE F may count as 0 if profile says so.', 'FR-HELP-02'),
  topic('help.reset_period', 'Book resets each period',
    'Cycle-1 scores do not average into cycle 2. The semester formula is what combines them.',
    ['live_grade', 'report_card'],
    '6W1 70 and 6W2 90 stay separate until rollup.', 'FR-HELP-02'),
  topic('help.glyphs.6w', 'Six-week pies',
    'Each slice is 1/3 of a semester, not 1/4 of a year. Quarter pies are a different calendar.',
    ['live_grade', 'report_card'],
    '6W1–6W3 fill S1; 6W4–6W6 fill S2.', 'FR-HELP-02'),
  topic('help.wizard.level', 'School level',
    'Chooses default calendar, scale, credit, and whether GPA is on.',
    ['credit', 'unweighted_gpa', 'weighted_gpa'],
    'High → Texas 6-week + 70-pass + weighted GPA.', 'FR-FORM-S01'),
  topic('help.wizard.dates', 'Year dates',
    'Start and end dates generate equal period wedges. You can edit any period after generation.',
    ['report_card', 'progress_report'],
    'Aug 15–May 28 six-weeks → six equal ranges under S1/S2.', 'FR-FORM-S01'),
  topic('help.wizard.locks', 'Teacher locks',
    'Locked syllabus fields stay visible to teachers but cannot be changed. Optional lock reason shows on the syllabus wizard.',
    ['live_grade', 'letter'],
    'Lock scale → teacher inherits Texas 70-pass.', 'FR-SYL-18'),
  topic('help.lock.reason', 'Lock reason',
    'Admin-written reason shown next to a locked syllabus field so teachers know why they cannot edit it.',
    ['live_grade', 'letter', 'report_card'],
    '“Campus late policy locked.” under Late penalty chips.', 'FR-FORM-T01'),
  topic('help.syllabus.copy', 'Copy syllabus',
    'Start from another of your classes or a school template. Locked fields never carry teacher overrides — school locks win.',
    ['live_grade', 'report_card', 'letter'],
    'Copy Spring ISD 50/50 then unlock homework weight stays editable if not locked.', 'FR-TPL-01'),
  topic('help.syllabus.templates', 'School syllabus templates',
    'Named templates admin publishes (Spring ISD 50/50, Homework ≤10%, Texas retake cap 70). Teachers copy unlocked fields only.',
    ['live_grade', 'report_card'],
    'Texas 70-pass + retake cap 70 seeds floor 50 and retake cap 70.', 'FR-TPL-02'),
  topic('help.wizard.review', 'Review and publish',
    'Publishing writes a new grading_policies version, saves the calendar, and binds classes.',
    ['report_card', 'transcript', 'credit'],
    'Publish v1 then edit draft v2 without rewriting stored grades until audited change.', 'FR-FORM-V04'),
  topic('help.book_mode', 'Book mode',
    'reset_each_marking_period (default) keeps period averages independent. rolling_year carries scores across.',
    ['live_grade', 'report_card'],
    'Reset: 6W1 work never averages into 6W2 live book.', 'FR-SYL-14'),
  topic('help.engine', 'Grading engine',
    'Total points, weighted points-inside, weighted percent-inside, item weights, or no overall grade.',
    ['live_grade', 'report_card', 'letter'],
    'See help.engine.points / weighted_points / weighted_percent.', 'FR-SYL-01'),
  topic('help.chat.what_this_is', 'Setup interview',
    'Guided questions that fill the same draft as the wizard and photo ingest. Nothing publishes from chat.',
    ['live_grade', 'report_card'],
    'Say “six-weeks, 70 is passing” to fill two slots at once.', 'FR-CHAT-16'),
  topic('help.chat.im_not_sure', "I'm not sure",
    'Applies the recommended default for your school level and marks the field assumed so you can change it later.',
    ['live_grade', 'report_card'],
    'High + not sure on calendar → Texas six-weeks template.', 'FR-CHAT-06'),
  topic('help.chat.switch_to_form', 'Open the form',
    'Hands the same draft to the wizard. Publish / Save remain wizard buttons only.',
    ['live_grade', 'report_card'],
    'Interview read-back → Open form → fields match chips.', 'FR-CHAT-09'),
  topic('help.chat.skip_answered', 'Skip known slots',
    'If you already answered a slot in free text, that question is skipped.',
    ['live_grade'],
    '“Six-weeks and 70 passing” skips calendar and scale questions.', 'FR-CHAT-05'),
  topic('help.chat.what_if', 'What if',
    'Side questions explain repercussions with a worked example. They do not save a choice or advance the graph.',
    ['live_grade', 'report_card', 'letter'],
    'Pending engine Q + “what if total points?” keeps the same chips.', 'FR-CHAT-22'),
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
