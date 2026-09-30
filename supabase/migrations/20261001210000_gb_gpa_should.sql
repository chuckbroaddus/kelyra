-- GB-16 GPA/levels Should: include flags on term_grades + classes.course_level already exists.
-- Idempotent additive columns with defaults. RLS unchanged (term_grades already RLS'd).
-- Never edit old migrations. DevOps applies; do not db push from this card.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'term_grades' and column_name = 'include_unweighted'
  ) then
    alter table public.term_grades
      add column include_unweighted boolean not null default true;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'term_grades' and column_name = 'include_weighted'
  ) then
    alter table public.term_grades
      add column include_weighted boolean not null default true;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'term_grades' and column_name = 'include_rank'
  ) then
    alter table public.term_grades
      add column include_rank boolean not null default false;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'term_grades' and column_name = 'unweighted_points'
  ) then
    alter table public.term_grades
      add column unweighted_points numeric;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'term_grades' and column_name = 'weighted_points'
  ) then
    alter table public.term_grades
      add column weighted_points numeric;
  end if;
end $$;

comment on column public.term_grades.include_unweighted is
  'GB-16: whether row counts in unweighted GPA profile (SRS §6.7).';
comment on column public.term_grades.include_weighted is
  'GB-16: whether row counts in weighted GPA profile (SRS §6.7).';
comment on column public.term_grades.include_rank is
  'GB-16: whether row counts in rank_6 GPA profile (default false until computed).';
