-- Pass / Fail marks and a grade kind. Pass/Fail must never enter a numeric average.
-- Run in the Supabase SQL editor. Safe to re-run.

alter table public.captures
  add column if not exists score_mark text not null default 'numeric';

alter table public.captures
  add column if not exists grade_kind text not null default 'homework';

alter table public.submissions
  add column if not exists score_mark text not null default 'numeric';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'captures_score_mark_check'
  ) then
    alter table public.captures
      add constraint captures_score_mark_check
      check (score_mark in ('numeric', 'pass', 'fail'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'submissions_score_mark_check'
  ) then
    alter table public.submissions
      add constraint submissions_score_mark_check
      check (score_mark in ('numeric', 'pass', 'fail'));
  end if;
end $$;
