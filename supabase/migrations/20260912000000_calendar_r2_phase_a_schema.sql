-- CAL-R2 Phase A schema (CEO send 2026-09-12).
-- Assignment calendar visibility + calendars layer table + calendar_events (sync-ready).
-- CoS / devops-release applies; do not apply from the build loop.
-- Walls: never teaches_class for family/hidden; class_teacher_of only for hidden dues.

-- ---------------------------------------------------------------------------
-- 1. Assignment projection columns
-- ---------------------------------------------------------------------------

alter table public.assignments
  add column if not exists calendar_visibility text;

alter table public.assignments
  add column if not exists calendar_published_at timestamptz;

alter table public.assignments
  add column if not exists calendar_published_by uuid references public.profiles (id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'assignments_calendar_visibility_check'
  ) then
    alter table public.assignments
      add constraint assignments_calendar_visibility_check
      check (
        calendar_visibility is null
        or calendar_visibility in ('hidden', 'published')
      );
  end if;
end $$;

-- Backfill: quiz/test/midterm/final → hidden when due; else published when due.
-- No due_at → leave null (not a calendar item). Assign-to-roster does not touch these cols.
update public.assignments
set calendar_visibility = case
  when lower(coalesce(category, '')) in ('quiz', 'test', 'midterm', 'final') then 'hidden'
  else 'published'
end
where due_at is not null
  and calendar_visibility is null;

create or replace function public.assignments_calendar_visibility_default()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only auto-default when due_at is present and visibility unset, or due_at newly set.
  -- Never flip on submissions seed (assign ≠ publish). Explicit visibility wins on INSERT.
  if new.due_at is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.calendar_visibility is null then
      if lower(coalesce(new.category, '')) in ('quiz', 'test', 'midterm', 'final') then
        new.calendar_visibility := 'hidden';
      else
        new.calendar_visibility := 'published';
      end if;
    end if;
    return new;
  end if;

  -- UPDATE: only when due_at goes null → set and visibility still null.
  if old.due_at is null and new.due_at is not null and new.calendar_visibility is null then
    if lower(coalesce(new.category, '')) in ('quiz', 'test', 'midterm', 'final') then
      new.calendar_visibility := 'hidden';
    else
      new.calendar_visibility := 'published';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists assignments_calendar_visibility_default on public.assignments;
create trigger assignments_calendar_visibility_default
  before insert or update of due_at, category, calendar_visibility
  on public.assignments
  for each row
  execute function public.assignments_calendar_visibility_default();

create index if not exists assignments_due_calendar_idx
  on public.assignments (class_id, due_at)
  where due_at is not null;

-- ---------------------------------------------------------------------------
-- 2. calendars layer table
-- ---------------------------------------------------------------------------

create table if not exists public.calendars (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  provider text not null default 'kelyra'
    check (provider in ('kelyra', 'ics', 'google', 'microsoft', 'apple', 'sis')),
  kind text not null
    check (kind in ('school', 'class', 'class_work', 'team', 'personal', 'absence', 'external')),
  class_id uuid references public.classes (id) on delete cascade,
  team_id uuid,
  owner_profile_id uuid references public.profiles (id) on delete cascade,
  student_id uuid references public.students (id) on delete set null,
  name text not null,
  role_tint text not null default 'academic'
    check (role_tint in ('academic', 'school', 'sport', 'personal')),
  is_read_only boolean not null default false,
  default_enabled boolean not null default true,
  external_id text,
  sync_cursor text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendars_binding_kind check (
    (kind = 'school' and class_id is null and team_id is null and owner_profile_id is null and student_id is null)
    or (kind in ('class', 'class_work') and class_id is not null and team_id is null and owner_profile_id is null and student_id is null)
    or (kind = 'team' and team_id is not null and class_id is null and owner_profile_id is null and student_id is null)
    or (kind = 'personal' and owner_profile_id is not null and class_id is null and team_id is null and student_id is null)
    or (kind = 'absence' and student_id is not null)
    or (kind = 'external')
  )
);

-- One school layer per school.
create unique index if not exists calendars_school_kind_uidx
  on public.calendars (school_id)
  where kind = 'school';

-- One class / class_work layer per class.
create unique index if not exists calendars_class_kind_uidx
  on public.calendars (class_id, kind)
  where kind in ('class', 'class_work') and class_id is not null;

-- One personal layer per profile.
create unique index if not exists calendars_personal_owner_uidx
  on public.calendars (owner_profile_id)
  where kind = 'personal' and owner_profile_id is not null;

-- Tenant-scoped external id (CAL-S2-09). Nulls allowed many times.
create unique index if not exists calendars_school_provider_external_uidx
  on public.calendars (school_id, provider, external_id)
  where external_id is not null;

create index if not exists calendars_school_kind_idx on public.calendars (school_id, kind);
create index if not exists calendars_class_idx on public.calendars (class_id) where class_id is not null;

create or replace function public.calendars_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists calendars_touch_updated_at on public.calendars;
create trigger calendars_touch_updated_at
  before update on public.calendars
  for each row execute function public.calendars_touch_updated_at();

-- v1 writes force provider=kelyra (CAL-S2-06).
create or replace function public.calendars_force_kelyra_provider()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.provider is distinct from 'kelyra' then
    raise exception 'v1 calendars provider must be kelyra';
  end if;
  return new;
end;
$$;

drop trigger if exists calendars_force_kelyra_provider on public.calendars;
create trigger calendars_force_kelyra_provider
  before insert or update of provider on public.calendars
  for each row execute function public.calendars_force_kelyra_provider();

alter table public.calendars enable row level security;

-- Client never PostgREST-selects/writes school/class/class_work layers (CAL-S2-03).
-- No SELECT/INSERT/UPDATE/DELETE policies for authenticated → deny.
-- SECURITY DEFINER RPCs read with search_path=public.

revoke all on table public.calendars from anon, authenticated;
grant select on table public.calendars to authenticated; -- RLS still denies without policy

-- ---------------------------------------------------------------------------
-- 3. calendar_events (Phase C CRUD UI later; table now so school layer can project)
-- ---------------------------------------------------------------------------

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  calendar_id uuid not null references public.calendars (id) on delete cascade,
  class_id uuid references public.classes (id) on delete cascade,
  team_id uuid,
  student_id uuid references public.students (id) on delete set null,
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  seat text not null check (seat in ('teacher', 'student', 'parent', 'office')),
  category text not null
    check (category in ('school', 'class', 'study', 'sport', 'personal', 'absence', 'lesson', 'assignment', 'quiz', 'test', 'project')),
  title text not null,
  body text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default true,
  visibility_scope text not null
    check (visibility_scope in ('self', 'class', 'school', 'student_teachers', 'team')),
  status text not null default 'published'
    check (status in ('draft', 'published')),
  source text not null default 'manual'
    check (source in ('manual', 'ai_nl')),
  timezone text,
  is_read_only boolean not null default false,
  provider_event_id text,
  ical_uid text,
  etag text,
  recurrence_rule text,
  recurrence_parent_id uuid references public.calendar_events (id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calendar_events_calendar_starts_idx
  on public.calendar_events (calendar_id, starts_at)
  where deleted_at is null;

create index if not exists calendar_events_school_starts_idx
  on public.calendar_events (school_id, starts_at)
  where deleted_at is null;

create index if not exists calendar_events_class_starts_idx
  on public.calendar_events (class_id, starts_at)
  where deleted_at is null and class_id is not null;

create index if not exists calendar_events_owner_starts_idx
  on public.calendar_events (owner_profile_id, starts_at)
  where deleted_at is null;

create or replace function public.calendar_events_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists calendar_events_touch_updated_at on public.calendar_events;
create trigger calendar_events_touch_updated_at
  before update on public.calendar_events
  for each row execute function public.calendar_events_touch_updated_at();

-- calendar_id cannot retarget visibility (CAL-S2-10): kind/class_id/school_id consistent.
create or replace function public.calendar_events_calendar_id_consistent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cal public.calendars;
begin
  select * into cal from public.calendars where id = new.calendar_id;
  if not found then
    raise exception 'calendar_id not found';
  end if;
  if cal.school_id is distinct from new.school_id then
    raise exception 'calendar_id school mismatch';
  end if;
  if cal.kind = 'class_work' then
    raise exception 'class_work layers have no calendar_events';
  end if;
  if cal.kind = 'school' and new.visibility_scope is distinct from 'school' then
    raise exception 'school calendar requires visibility_scope=school';
  end if;
  if cal.kind = 'class' then
    if new.class_id is distinct from cal.class_id then
      raise exception 'class calendar_id class mismatch';
    end if;
  end if;
  if cal.kind = 'personal' then
    if new.owner_profile_id is distinct from cal.owner_profile_id then
      raise exception 'personal calendar owner mismatch';
    end if;
    if new.visibility_scope is distinct from 'self' then
      raise exception 'personal calendar requires visibility_scope=self';
    end if;
  end if;
  if cal.kind = 'team' and new.team_id is distinct from cal.team_id then
    raise exception 'team calendar_id team mismatch';
  end if;
  return new;
end;
$$;

drop trigger if exists calendar_events_calendar_id_consistent on public.calendar_events;
create trigger calendar_events_calendar_id_consistent
  before insert or update of calendar_id, school_id, class_id, team_id, owner_profile_id, visibility_scope
  on public.calendar_events
  for each row execute function public.calendar_events_calendar_id_consistent();

alter table public.calendar_events enable row level security;

-- Deny wide client SELECT/write; reads go through list_calendar_items DEFINER.
-- Phase C will add seat-scoped write RPCs; Phase A is read via RPC only.
revoke all on table public.calendar_events from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Provision helpers (server-only; no client invent of school/class layers)
-- ---------------------------------------------------------------------------

create or replace function public.calendar_school_id_for_class(p_class_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.school_id
      from public.class_teachers ct
      join public.profiles p on p.id = ct.teacher_id
      where ct.class_id = p_class_id
      limit 1
    ),
    (
      select p.school_id
      from public.classes c
      join public.profiles p on p.id = c.teacher_id
      where c.id = p_class_id
        and c.teacher_id is not null
      limit 1
    ),
    (select s.id from public.schools s order by s.created_at asc limit 1)
  );
$$;

-- Server/provision only — not a client helper.
revoke all on function public.calendar_school_id_for_class(uuid) from public, anon, authenticated;

create or replace function public.provision_school_calendar(p_school_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid;
  sname text;
begin
  if p_school_id is null then
    return null;
  end if;
  select id into cid from public.calendars
  where school_id = p_school_id and kind = 'school'
  limit 1;
  if cid is not null then
    return cid;
  end if;
  select name into sname from public.schools where id = p_school_id;
  insert into public.calendars (school_id, provider, kind, name, role_tint, is_read_only, default_enabled)
  values (p_school_id, 'kelyra', 'school', coalesce(nullif(trim(sname), ''), 'School'), 'school', false, true)
  on conflict do nothing
  returning id into cid;
  if cid is null then
    select id into cid from public.calendars
    where school_id = p_school_id and kind = 'school'
    limit 1;
  end if;
  return cid;
end;
$$;

create or replace function public.provision_class_calendars(p_class_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  sid uuid;
  cname text;
begin
  if p_class_id is null then
    return;
  end if;
  sid := public.calendar_school_id_for_class(p_class_id);
  if sid is null then
    return;
  end if;
  perform public.provision_school_calendar(sid);
  select name into cname from public.classes where id = p_class_id;
  insert into public.calendars (school_id, provider, kind, class_id, name, role_tint, is_read_only, default_enabled)
  values (
    sid, 'kelyra', 'class', p_class_id,
    coalesce(nullif(trim(cname), ''), 'Class'),
    'academic', false, true
  )
  on conflict do nothing;
  insert into public.calendars (school_id, provider, kind, class_id, name, role_tint, is_read_only, default_enabled)
  values (
    sid, 'kelyra', 'class_work', p_class_id,
    coalesce(nullif(trim(cname), ''), 'Class') || ' work',
    'academic', true, true
  )
  on conflict do nothing;
end;
$$;

create or replace function public.provision_personal_calendar(p_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  sid uuid;
  cid uuid;
  pname text;
begin
  if p_profile_id is null then
    return null;
  end if;
  select school_id, coalesce(nullif(trim(display_name), ''), nullif(trim(username), ''), 'Personal')
    into sid, pname
  from public.profiles
  where id = p_profile_id;
  if sid is null then
    return null;
  end if;
  perform public.provision_school_calendar(sid);
  select id into cid from public.calendars
  where kind = 'personal' and owner_profile_id = p_profile_id
  limit 1;
  if cid is not null then
    return cid;
  end if;
  insert into public.calendars (school_id, provider, kind, owner_profile_id, name, role_tint, is_read_only, default_enabled)
  values (sid, 'kelyra', 'personal', p_profile_id, pname, 'personal', false, true)
  on conflict do nothing
  returning id into cid;
  if cid is null then
    select id into cid from public.calendars
    where kind = 'personal' and owner_profile_id = p_profile_id
    limit 1;
  end if;
  return cid;
end;
$$;

revoke all on function public.provision_school_calendar(uuid) from public, anon, authenticated;
revoke all on function public.provision_class_calendars(uuid) from public, anon, authenticated;
revoke all on function public.provision_personal_calendar(uuid) from public, anon, authenticated;

-- Backfill existing rows
do $$
declare
  r record;
begin
  for r in select id from public.schools loop
    perform public.provision_school_calendar(r.id);
  end loop;
  for r in select id from public.classes loop
    perform public.provision_class_calendars(r.id);
  end loop;
  for r in select id from public.profiles loop
    perform public.provision_personal_calendar(r.id);
  end loop;
end $$;

-- Auto-provision on create
create or replace function public.calendars_on_school_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.provision_school_calendar(new.id);
  return new;
end;
$$;

drop trigger if exists calendars_on_school_insert on public.schools;
create trigger calendars_on_school_insert
  after insert on public.schools
  for each row execute function public.calendars_on_school_insert();

create or replace function public.calendars_on_class_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.provision_class_calendars(new.id);
  return new;
end;
$$;

drop trigger if exists calendars_on_class_insert on public.classes;
create trigger calendars_on_class_insert
  after insert on public.classes
  for each row execute function public.calendars_on_class_insert();

create or replace function public.calendars_on_profile_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.provision_personal_calendar(new.id);
  return new;
end;
$$;

drop trigger if exists calendars_on_profile_insert on public.profiles;
create trigger calendars_on_profile_insert
  after insert on public.profiles
  for each row execute function public.calendars_on_profile_insert();

comment on table public.calendars is
  'CAL-R2 layer identity. Server-provisioned. Client filters are not security; list via list_calendars.';
comment on table public.calendar_events is
  'CAL-R2 non-grade dated items. Assignment dues stay on assignments; never copy dues here.';
comment on column public.assignments.calendar_visibility is
  'hidden|published. Independent of assign-to-roster. quiz/test/midterm/final default hidden.';
