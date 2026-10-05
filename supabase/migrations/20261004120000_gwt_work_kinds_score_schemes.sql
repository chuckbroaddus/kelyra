-- GWT: work_kind, expanded score schemes (complete/incomplete, ESNU, checklist),
-- capture type hint, syllabus category defaults. Do NOT apply from Eng — hand to devops-release.
-- Safe-ish to re-run.

-- assignments.work_kind (canonical picker key; category remains syllabus bucket)
alter table public.assignments
  add column if not exists work_kind text not null default 'homework';

alter table public.assignments
  add column if not exists checklist_skills jsonb not null default '[]'::jsonb;

comment on column public.assignments.work_kind is
  'Canonical work kind (homework, pop_quiz, memory_verse, …). category is the syllabus bucket.';
comment on column public.assignments.checklist_skills is
  'When score_scheme = checklist: [{id, label}] skill list for early-elementary marks.';

-- Expand score_scheme check
alter table public.assignments drop constraint if exists assignments_score_scheme_check;
alter table public.assignments
  add constraint assignments_score_scheme_check
  check (score_scheme in (
    'numeric', 'pass_fail', 'either',
    'complete_incomplete', 'esnu', 'checklist'
  ));

-- Backfill work_kind from category when still default
update public.assignments
set work_kind = lower(trim(category))
where work_kind = 'homework'
  and category is not null
  and lower(trim(category)) <> 'homework'
  and lower(trim(category)) ~ '^[a-z][a-z0-9_]{0,31}$';

-- syllabus category defaults for scheme + suggested kinds
alter table public.syllabus_categories
  add column if not exists default_score_scheme text not null default 'numeric';

alter table public.syllabus_categories
  add column if not exists suggested_work_kinds text[] not null default '{}'::text[];

alter table public.syllabus_categories drop constraint if exists syllabus_categories_default_score_scheme_check;
alter table public.syllabus_categories
  add constraint syllabus_categories_default_score_scheme_check
  check (default_score_scheme in (
    'numeric', 'pass_fail', 'either',
    'complete_incomplete', 'esnu', 'checklist'
  ));

-- Process categories: include-in-average stays teacher choice (default false already).
update public.syllabus_categories
set default_score_scheme = 'esnu',
    default_include_in_average = false
where key in ('behavior', 'effort', 'citizenship')
  and default_score_scheme = 'numeric';

update public.syllabus_categories
set default_score_scheme = 'complete_incomplete',
    default_include_in_average = false
where key in ('participation', 'preparedness')
  and default_score_scheme = 'numeric';

-- Capture type hint: reuse grade_kind as teacher-confirmed work kind; optional AI suggestion column
alter table public.captures
  add column if not exists work_kind_hint text;

comment on column public.captures.work_kind_hint is
  'Optional type hint at capture (homework, exit_ticket, …). AI may draft; teacher confirms. Not a grade.';

-- score_mark expanded for complete/incomplete + ESNU + checklist summary
alter table public.captures drop constraint if exists captures_score_mark_check;
alter table public.captures
  add constraint captures_score_mark_check
  check (score_mark in (
    'numeric', 'pass', 'fail',
    'complete', 'incomplete',
    'E', 'S', 'N', 'U',
    'checklist'
  ));

alter table public.submissions drop constraint if exists submissions_score_mark_check;
alter table public.submissions
  add constraint submissions_score_mark_check
  check (score_mark in (
    'numeric', 'pass', 'fail',
    'complete', 'incomplete',
    'E', 'S', 'N', 'U',
    'checklist'
  ));

alter table public.submissions
  add column if not exists checklist_marks jsonb not null default '{}'::jsonb;

comment on column public.submissions.checklist_marks is
  'When assignment score_scheme = checklist: { skill_id: mark }. Draft until Approve.';
