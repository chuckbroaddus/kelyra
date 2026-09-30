-- GB-03: grading_policies + classes.course_level
-- Idempotent. Pure lib does not read SQL; Wave 2 wires it.
-- RLS: school members read published; office admin read/write own school.

create table if not exists public.grading_policies (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  version int not null,
  status text not null check (status in ('draft', 'published')),
  payload jsonb not null,
  published_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, version)
);

create unique index if not exists grading_policies_school_version_uidx
  on public.grading_policies (school_id, version);

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'classes'
      and column_name = 'course_level'
  ) then
    alter table public.classes add column course_level text;
  end if;
end $$;

alter table public.grading_policies enable row level security;

drop policy if exists grading_policies_read_published on public.grading_policies;
create policy grading_policies_read_published
  on public.grading_policies
  for select
  using (
    status = 'published'
    and public.my_school_id() is not null
    and school_id is not distinct from public.my_school_id()
  );

drop policy if exists grading_policies_office_all on public.grading_policies;
create policy grading_policies_office_all
  on public.grading_policies
  for all
  using (
    public.is_school_admin()
    and public.my_school_id() is not null
    and school_id is not distinct from public.my_school_id()
  )
  with check (
    public.is_school_admin()
    and public.my_school_id() is not null
    and school_id is not distinct from public.my_school_id()
  );

create or replace function public.gb_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_grading_policies_updated on public.grading_policies;
create trigger trg_grading_policies_updated
  before update on public.grading_policies
  for each row execute function public.gb_set_updated_at();

comment on table public.grading_policies is
  'GB-03 school grading policy versions (scales, qp, levels, gpa profiles).';
