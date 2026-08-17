-- Optional unit / section grouping for the grade-book tree.
-- Run in the Supabase SQL editor. Safe-ish to re-run.

alter table public.assignments
  add column if not exists unit text;

alter table public.assignments
  add column if not exists section text;

create index if not exists assignments_class_unit_idx
  on public.assignments (class_id, unit, section);
