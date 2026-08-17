-- First-class planned assignments. A column can exist before any capture.
-- Run in the Supabase SQL editor. Safe-ish to re-run.

alter type public.assignment_kind add value if not exists 'planned';

alter table public.assignments
  add column if not exists category text not null default 'homework';

alter table public.assignments
  add column if not exists weight_band text not null default 'none';

alter table public.assignments
  add column if not exists weight_percent numeric;

alter table public.assignments
  add column if not exists term text not null default 'none';

alter table public.assignments
  add column if not exists score_scheme text not null default 'numeric';

alter table public.assignments
  add column if not exists include_in_average boolean not null default true;

alter table public.captures
  add column if not exists assignment_id uuid references public.assignments (id) on delete set null;

create index if not exists captures_assignment_id_idx on public.captures (assignment_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'assignments_weight_band_check') then
    alter table public.assignments
      add constraint assignments_weight_band_check
      check (weight_band in ('none', 'daily', 'major', 'custom'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'assignments_term_check') then
    alter table public.assignments
      add constraint assignments_term_check
      check (term in ('none', 'q1', 'q2', 'q3', 'q4', 'semester', 'year'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'assignments_score_scheme_check') then
    alter table public.assignments
      add constraint assignments_score_scheme_check
      check (score_scheme in ('numeric', 'pass_fail', 'either'));
  end if;
end $$;
