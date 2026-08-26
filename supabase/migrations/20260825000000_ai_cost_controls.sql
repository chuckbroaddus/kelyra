-- AI cost controls: usage meter, queued drafts, school monthly cap.
-- Paste in the SQL editor. No CLI.

alter table public.schools
  add column if not exists ai_monthly_cap_usd numeric;

alter table public.captures
  add column if not exists ai_status text;

create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  teacher_id uuid references public.teachers (id) on delete set null,
  function text not null,
  model text not null,
  capture_id uuid references public.captures (id) on delete set null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  usd numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_school_month on public.ai_usage (school_id, created_at desc);

create table if not exists public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  teacher_id uuid references public.teachers (id) on delete set null,
  capture_id uuid not null references public.captures (id) on delete cascade,
  kind text not null default 'homework_draft',
  pass text not null default 'cheap',
  status text not null default 'pending',
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists ai_jobs_pending on public.ai_jobs (status, created_at)
  where status = 'pending';

alter table public.ai_usage enable row level security;
alter table public.ai_jobs enable row level security;

drop policy if exists ai_usage_read on public.ai_usage;
create policy ai_usage_read on public.ai_usage
  for select to authenticated
  using (school_id = public.my_school_id());

drop policy if exists ai_usage_insert on public.ai_usage;
create policy ai_usage_insert on public.ai_usage
  for insert to authenticated
  with check (
    school_id = public.my_school_id()
    and (teacher_id is null or teacher_id = auth.uid())
  );

drop policy if exists ai_jobs_read on public.ai_jobs;
create policy ai_jobs_read on public.ai_jobs
  for select to authenticated
  using (school_id = public.my_school_id());

drop policy if exists ai_jobs_write on public.ai_jobs;
create policy ai_jobs_write on public.ai_jobs
  for all to authenticated
  using (school_id = public.my_school_id())
  with check (school_id = public.my_school_id());

create or replace function public.schools_guard_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.name is distinct from old.name
     or new.logo_asset_id is distinct from old.logo_asset_id
     or new.ai_monthly_cap_usd is distinct from old.ai_monthly_cap_usd then
    if not exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'superintendent'
    ) then
      raise exception 'Only the superintendent can change the school name, logo, or AI budget';
    end if;
  end if;
  if length(trim(coalesce(new.name, ''))) < 1 then
    raise exception 'Need a school name';
  end if;
  if length(trim(new.name)) > 80 then
    raise exception 'School name is too long';
  end if;
  if new.ai_monthly_cap_usd is not null and new.ai_monthly_cap_usd < 0 then
    raise exception 'AI budget cannot be negative';
  end if;
  new.name := trim(new.name);
  return new;
end;
$$;

create or replace function public.set_school_ai_cap(p_usd numeric)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  school uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in';
  end if;
  school := public.my_school_id();
  if school is null then
    raise exception 'No school';
  end if;
  update public.schools set ai_monthly_cap_usd = p_usd where id = school;
  perform public.write_audit(
    'set_school_ai_cap',
    'school',
    school::text,
    null,
    null,
    null,
    jsonb_build_object('ai_monthly_cap_usd', p_usd)
  );
  return p_usd;
end;
$$;

revoke all on function public.set_school_ai_cap(numeric) from public;
grant execute on function public.set_school_ai_cap(numeric) to authenticated;

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
