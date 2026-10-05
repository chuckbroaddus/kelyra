-- AI usage metering for every seat (parent / student / office / teacher).
-- Live schema (project aohibokgilxhqwmupdfv) before this: ai_usage columns were
-- id, school_id, teacher_id→teachers(id), function, model, capture_id, tokens, usd, created_at.
-- Edge meterUsage wrote teacher_id = auth.uid(), so parent/student/office inserts failed the FK
-- and the usage row was silently lost. Do not edit 20260825000000_ai_cost_controls.sql in place.
-- NEVER apply from Eng — hand to devops-release.

-- Actor: auth.users id of whoever made the call (always set by meterUsage going forward).
alter table public.ai_usage
  add column if not exists user_id uuid references auth.users (id) on delete set null;

-- Seat chrome: teacher | parent | student | office (office = superintendent/administrator job).
alter table public.ai_usage
  add column if not exists seat text;

alter table public.ai_usage drop constraint if exists ai_usage_seat_check;
alter table public.ai_usage
  add constraint ai_usage_seat_check
  check (seat is null or seat in ('teacher', 'parent', 'student', 'office'));

comment on column public.ai_usage.user_id is
  'auth.users id of the caller. Always set for new meter rows; distinct from teacher_id.';
comment on column public.ai_usage.seat is
  'Caller seat: teacher, parent, student, or office. Null only on legacy rows.';
comment on column public.ai_usage.teacher_id is
  'Nullable FK to public.teachers(id). Set only when the caller has a teachers row; never put a non-teacher auth uid here.';

-- Historical inserts only succeeded for real teachers (FK). Backfill actor + seat from teacher_id.
update public.ai_usage
set user_id = teacher_id
where user_id is null
  and teacher_id is not null;

update public.ai_usage
set seat = 'teacher'
where seat is null
  and teacher_id is not null;

create index if not exists ai_usage_user_created on public.ai_usage (user_id, created_at desc);

-- teacher_id remains nullable FK to public.teachers(id) (already nullable from original migration).
-- No ALTER needed for the FK itself.

-- RLS: keep school-scoped SELECT (do not widen). Insert allows non-teachers with teacher_id null
-- and requires user_id to match the caller when present. Service role still bypasses RLS.
drop policy if exists ai_usage_read on public.ai_usage;
create policy ai_usage_read on public.ai_usage
  for select to authenticated
  using (school_id = public.my_school_id());

drop policy if exists ai_usage_insert on public.ai_usage;
create policy ai_usage_insert on public.ai_usage
  for insert to authenticated
  with check (
    school_id = public.my_school_id()
    and (user_id is null or user_id = auth.uid())
    and (teacher_id is null or teacher_id = auth.uid())
  );

-- ai_spend_this_month stays school-scoped (security definer). Re-pin body + grants so the
-- spend path remains correct after the column/RLS change; no widening of who can read others.
create or replace function public.ai_spend_this_month()
returns table (usd numeric, cap_usd numeric)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((
      select sum(u.usd)
      from public.ai_usage u
      where u.school_id = public.my_school_id()
        and u.created_at >= date_trunc('month', now())
    ), 0)::numeric as usd,
    (select s.ai_monthly_cap_usd from public.schools s where s.id = public.my_school_id()) as cap_usd;
$$;

revoke all on function public.ai_spend_this_month() from public;
grant execute on function public.ai_spend_this_month() to authenticated;
