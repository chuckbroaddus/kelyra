-- GB-02 grading calendar tree (CEO rapid prototype 2026-09-30).
-- Tables: grading_calendars, marking_periods.
-- Bindings: classes.grading_calendar_id, assignments.marking_period_id (keep assignments.term).
-- RLS: school members read; is_school_admin writes; teachers read calendars bound to own classes.
-- Idempotent. Do not apply from the build card — DevOps applies.

create table if not exists public.grading_calendars (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools (id) on delete cascade,
  name text not null,
  level text not null
    check (level in ('elementary', 'middle', 'high', 'college')),
  period_model text not null
    check (period_model in (
      'six_weeks', 'nine_weeks', 'trimester', 'semester', 'year', 'college', 'custom'
    )),
  rollups jsonb not null default '[]'::jsonb,
  show_interims_in_filter boolean not null default false,
  glyph_scope text not null default 'semester'
    check (glyph_scope in ('semester', 'year')),
  year_start date,
  year_end date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.grading_calendars is
  'GB-02 school/class grading calendar (period model + term rollups jsonb).';

create index if not exists grading_calendars_school_idx
  on public.grading_calendars (school_id);

create table if not exists public.marking_periods (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.grading_calendars (id) on delete cascade,
  code text not null,
  name text not null,
  kind text not null
    check (kind in ('marking_period', 'credit_term', 'year', 'progress', 'exam')),
  parent_id uuid references public.marking_periods (id) on delete cascade,
  start_date date,
  end_date date,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (calendar_id, code)
);

comment on table public.marking_periods is
  'GB-02 nested periods: marking_period → credit_term → year; progress is non-transcript.';

create index if not exists marking_periods_calendar_idx
  on public.marking_periods (calendar_id, sort_order);

create index if not exists marking_periods_parent_idx
  on public.marking_periods (parent_id);

alter table public.classes
  add column if not exists grading_calendar_id uuid
    references public.grading_calendars (id) on delete set null;

create index if not exists classes_grading_calendar_idx
  on public.classes (grading_calendar_id)
  where grading_calendar_id is not null;

alter table public.assignments
  add column if not exists marking_period_id uuid
    references public.marking_periods (id) on delete set null;

create index if not exists assignments_marking_period_idx
  on public.assignments (marking_period_id)
  where marking_period_id is not null;

create or replace function public.grading_calendars_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists grading_calendars_touch_updated_at on public.grading_calendars;
create trigger grading_calendars_touch_updated_at
  before update on public.grading_calendars
  for each row execute function public.grading_calendars_touch_updated_at();

alter table public.grading_calendars enable row level security;
alter table public.marking_periods enable row level security;

drop policy if exists grading_calendars_select on public.grading_calendars;
create policy grading_calendars_select on public.grading_calendars
  for select to authenticated
  using (
    (
      school_id is not null
      and school_id is not distinct from public.my_school_id()
    )
    or exists (
      select 1
      from public.classes c
      where c.grading_calendar_id = grading_calendars.id
        and public.class_teacher_of(c.id)
    )
  );

drop policy if exists grading_calendars_insert on public.grading_calendars;
create policy grading_calendars_insert on public.grading_calendars
  for insert to authenticated
  with check (
    public.is_school_admin()
    and school_id is not null
    and school_id is not distinct from public.my_school_id()
  );

drop policy if exists grading_calendars_update on public.grading_calendars;
create policy grading_calendars_update on public.grading_calendars
  for update to authenticated
  using (
    public.is_school_admin()
    and school_id is not null
    and school_id is not distinct from public.my_school_id()
  )
  with check (
    public.is_school_admin()
    and school_id is not null
    and school_id is not distinct from public.my_school_id()
  );

drop policy if exists grading_calendars_delete on public.grading_calendars;
create policy grading_calendars_delete on public.grading_calendars
  for delete to authenticated
  using (
    public.is_school_admin()
    and school_id is not null
    and school_id is not distinct from public.my_school_id()
  );

drop policy if exists marking_periods_select on public.marking_periods;
create policy marking_periods_select on public.marking_periods
  for select to authenticated
  using (
    exists (
      select 1
      from public.grading_calendars gc
      where gc.id = marking_periods.calendar_id
        and (
          (
            gc.school_id is not null
            and gc.school_id is not distinct from public.my_school_id()
          )
          or exists (
            select 1
            from public.classes c
            where c.grading_calendar_id = gc.id
              and public.class_teacher_of(c.id)
          )
        )
    )
  );

drop policy if exists marking_periods_insert on public.marking_periods;
create policy marking_periods_insert on public.marking_periods
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.grading_calendars gc
      where gc.id = marking_periods.calendar_id
        and public.is_school_admin()
        and gc.school_id is not null
        and gc.school_id is not distinct from public.my_school_id()
    )
  );

drop policy if exists marking_periods_update on public.marking_periods;
create policy marking_periods_update on public.marking_periods
  for update to authenticated
  using (
    exists (
      select 1
      from public.grading_calendars gc
      where gc.id = marking_periods.calendar_id
        and public.is_school_admin()
        and gc.school_id is not null
        and gc.school_id is not distinct from public.my_school_id()
    )
  )
  with check (
    exists (
      select 1
      from public.grading_calendars gc
      where gc.id = marking_periods.calendar_id
        and public.is_school_admin()
        and gc.school_id is not null
        and gc.school_id is not distinct from public.my_school_id()
    )
  );

drop policy if exists marking_periods_delete on public.marking_periods;
create policy marking_periods_delete on public.marking_periods
  for delete to authenticated
  using (
    exists (
      select 1
      from public.grading_calendars gc
      where gc.id = marking_periods.calendar_id
        and public.is_school_admin()
        and gc.school_id is not null
        and gc.school_id is not distinct from public.my_school_id()
    )
  );

revoke all on table public.grading_calendars from anon;
revoke all on table public.marking_periods from anon;
grant select, insert, update, delete on table public.grading_calendars to authenticated;
grant select, insert, update, delete on table public.marking_periods to authenticated;
