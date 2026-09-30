-- GB-07 HelpTopic store (FR-FORM-X05 / FR-HELP-*).
-- Idempotent. Readable by any signed-in user. Seed from SRS wording.
-- Do not apply from the build card — DevOps applies.

create table if not exists public.help_topics (
  key text primary key,
  title text not null,
  body text not null,
  sru_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.help_topics is
  'GB-07 HelpTopic records for wizard/syllabus field help (FR-FORM-X05).';

alter table public.help_topics enable row level security;

drop policy if exists help_topics_select_authenticated on public.help_topics;
create policy help_topics_select_authenticated
  on public.help_topics
  for select
  to authenticated
  using (true);

drop policy if exists help_topics_office_write on public.help_topics;
create policy help_topics_office_write
  on public.help_topics
  for all
  using (public.is_school_admin())
  with check (public.is_school_admin());

-- Seed keys (upsert). Body is plain-language SRS FR-HELP / wizard copy.
insert into public.help_topics (key, title, body, sru_ref) values
  ('help.engine.points', 'Total points',
   'A 100-point test outweighs a 10-point quiz. No category percents.' || E'\n\n' ||
   'Affects: live_grade, report_card, letter.' || E'\n\n' ||
   '80/100 on a test and 8/10 on a quiz → 88/110 ≈ 80%.', 'FR-HELP-02'),
  ('help.engine.weighted_points', 'Weighted, points inside',
   'Tests 50% is the category. Inside Tests, a 100-point test beats a 20-point quiz.', 'FR-HELP-02'),
  ('help.engine.weighted_percent', 'Weighted, equal percent',
   'Inside a category every assignment is worth the same, 20/20 = 50/50.', 'FR-HELP-02'),
  ('help.empty_category', 'Empty category',
   'Default: ignore that weight until a score exists. Treating it as zero makes everyone look like they are failing early.', 'FR-HELP-02'),
  ('help.missing', 'Missing',
   '0 pulls the average down. Omit hides it. Floor (50) is a school policy, not a score the student earned.', 'FR-HELP-02'),
  ('help.excused', 'Excused',
   'Removed from earned and possible. Never a zero.', 'FR-HELP-02'),
  ('help.late', 'Late penalty',
   'Changes the counted score. Does not change max points unless the function says so.', 'FR-HELP-02'),
  ('help.extra_credit_b', 'Extra credit (add to earned)',
   'Students who skip it are not penalized. A weighted EC category does penalize them.', 'FR-HELP-02'),
  ('help.drop_lowest', 'Drop lowest',
   'Applies inside this marking period only. Next six-weeks starts fresh.', 'FR-HELP-02'),
  ('help.exam_term', 'Semester exam',
   'Lives on the semester, not inside the Tests category. Putting it in both double-counts it.', 'FR-HELP-02'),
  ('help.rollup.2_7', '2/7 + 1/7',
   'Each of three six-weeks is ~28.5% of the semester; exam is ~14.5%.', 'FR-HELP-02'),
  ('help.year_link', 'Year average for credit',
   'A 68 and a 72 can still award 1.0 credit. Both semester marks stay on the transcript for GPA.', 'FR-HELP-02'),
  ('help.scale.tx70', 'Texas 70 passing',
   '69 is F. There may be no D. Passing for credit is 70, not 60.', 'FR-HELP-02'),
  ('help.gpa.unweighted', 'Unweighted GPA',
   'Every included course uses the same 4.0 table. AP A = 4.0.', 'FR-HELP-02'),
  ('help.gpa.weighted', 'Weighted GPA',
   'AP/Honors add points. AP A = 5.0 on the default table. F is still 0.', 'FR-HELP-02'),
  ('help.gpa.numeric_table', 'Percent-to-points',
   'A 91 and a 99 can both be A and still be different GPA points.', 'FR-HELP-02'),
  ('help.include_pe', 'What counts in GPA',
   'PE can be on the transcript and out of rank GPA. P/F pass never enters the denominator.', 'FR-HELP-02'),
  ('help.reset_period', 'Book resets each period',
   'Cycle-1 scores do not average into cycle 2. The semester formula is what combines them.', 'FR-HELP-02'),
  ('help.glyphs.6w', 'Six-week pies',
   'Each slice is 1/3 of a semester, not 1/4 of a year. Quarter pies are a different calendar.', 'FR-HELP-02'),
  ('help.wizard.level', 'School level',
   'Chooses default calendar, scale, credit, and whether GPA is on.', 'FR-FORM-S01'),
  ('help.wizard.dates', 'Year dates',
   'Start and end dates generate equal period wedges. You can edit any period after generation.', 'FR-FORM-S01'),
  ('help.wizard.locks', 'Teacher locks',
   'Locked syllabus fields stay visible to teachers but cannot be changed.', 'FR-SYL-18'),
  ('help.wizard.review', 'Review and publish',
   'Publishing writes a new grading_policies version, saves the calendar, and binds classes.', 'FR-FORM-V04'),
  ('help.book_mode', 'Book mode',
   'reset_each_marking_period (default) keeps period averages independent.', 'FR-SYL-14'),
  ('help.engine', 'Grading engine',
   'Total points, weighted points-inside, weighted percent-inside, item weights, or no overall grade.', 'FR-SYL-01')
on conflict (key) do update set
  title = excluded.title,
  body = excluded.body,
  sru_ref = excluded.sru_ref,
  updated_at = now();
